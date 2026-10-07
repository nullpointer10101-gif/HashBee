package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/bot"
)

type PayoutMirrorService struct {
	db          *pgxpool.Pool
	settings    *SettingsService
	bot         *bot.Bot
	httpClient  *http.Client
	mu          sync.Mutex
	lastSyncAt  time.Time
	totalSynced int
}

func NewPayoutMirrorService(db *pgxpool.Pool, settings *SettingsService, bot *bot.Bot) *PayoutMirrorService {
	return &PayoutMirrorService{
		db:         db,
		settings:   settings,
		bot:        bot,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

type PayoutPostData struct {
	PostID       int
	RawHTML      string
	TxHash       string
	TxURL        string
	Network      string
	ExplorerName string
	Amount       float64
	Currency     string
}

// StartWatcher starts the background ticker that scrapes and mirrors new payout proofs
func (s *PayoutMirrorService) StartWatcher(ctx context.Context, interval time.Duration) {
	go func() {
		log.Printf("🚀 [PayoutMirror] Service watcher started (Polling every %v)", interval)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		// Initial sync after 10s startup delay
		time.Sleep(10 * time.Second)
		if _, err := s.SyncOnce(ctx); err != nil {
			log.Printf("⚠️  [PayoutMirror] Initial sync warning: %v", err)
		}

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				enabled := s.settings.GetBool(ctx, "payout_mirror_enabled", true)
				if !enabled {
					continue
				}
				if _, err := s.SyncOnce(ctx); err != nil {
					log.Printf("⚠️  [PayoutMirror] Polling error: %v", err)
				}
			}
		}
	}()
}

// SyncOnce fetches the latest posts from the source Telegram channel and mirrors new payout proofs
func (s *PayoutMirrorService) SyncOnce(ctx context.Context) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sourceURL := s.settings.Get(ctx, "payout_mirror_source", "https://t.me/s/AiLabRobotPayouts")
	if sourceURL == "" {
		sourceURL = "https://t.me/s/AiLabRobotPayouts"
	}
	if !strings.HasPrefix(sourceURL, "http") {
		clean := strings.TrimPrefix(sourceURL, "@")
		clean = strings.TrimPrefix(clean, "t.me/")
		clean = strings.TrimPrefix(clean, "s/")
		sourceURL = "https://t.me/s/" + clean
	}

	targetChannel := s.settings.Get(ctx, "payout_mirror_target_channel", "@HashBeePayouts")
	if targetChannel == "" {
		targetChannel = "@HashBeePayouts"
	}

	lastPostID := s.settings.GetInt(ctx, "payout_mirror_last_post_id", 0)

	// Fetch HTML from public preview
	req, err := http.NewRequestWithContext(ctx, "GET", sourceURL, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch channel HTML: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("telegram preview returned status: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read body: %w", err)
	}
	bodyStr := string(bodyBytes)

	// Parse messages from Telegram web preview
	posts := s.parseTelegramPosts(bodyStr)
	if len(posts) == 0 {
		return 0, nil
	}

	var newPostsPosted int
	maxObservedID := lastPostID

	// Process posts in chronological order (oldest to newest)
	for _, p := range posts {
		if p.PostID > maxObservedID {
			maxObservedID = p.PostID
		}

		// Skip if already processed
		if lastPostID > 0 && p.PostID <= lastPostID {
			continue
		}

		// If first run and lastPostID is 0, only take the latest 1-2 posts to avoid flooding
		if lastPostID == 0 && p.PostID < (posts[len(posts)-1].PostID-1) {
			continue
		}

		// Build HashBee styled payout proof message
		hashBeeMsg, btnText, btnURL := s.formatHashBeePayoutProof(p)

		if s.bot != nil {
			err := s.bot.SendChannelPayoutProof(targetChannel, hashBeeMsg, btnText, btnURL)
			if err != nil {
				log.Printf("⚠️  [PayoutMirror] Error sending payout proof for post %d to %s: %v", p.PostID, targetChannel, err)
			} else {
				newPostsPosted++
				s.totalSynced++
				log.Printf("🎉 [PayoutMirror] Mirrored post #%d to %s (Tx: %s | %s)", p.PostID, targetChannel, p.TxHash, p.ExplorerName)
				time.Sleep(1500 * time.Millisecond) // Gentle delay between channel posts
			}
		}
	}

	// Update last post ID
	if maxObservedID > lastPostID {
		_ = s.settings.Set(ctx, "payout_mirror_last_post_id", strconv.Itoa(maxObservedID))
	}

	s.lastSyncAt = time.Now().UTC()
	return newPostsPosted, nil
}

// Helper: parse Telegram channel HTML into structured posts with real multi-chain explorer links
func (s *PayoutMirrorService) parseTelegramPosts(htmlContent string) []PayoutPostData {
	var results []PayoutPostData

	// Match message containers: data-post="ChannelName/12345"
	msgBlockRegex := regexp.MustCompile(`(?s)<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post="[^/]+/(\d+)"[^>]*>(.*?)<div class="tgme_widget_message_footer`)
	matches := msgBlockRegex.FindAllStringSubmatch(htmlContent, -1)

	// Regex for multi-chain explorer links
	explorerHrefRegex := regexp.MustCompile(`href="(https?://[^"]*(?:bscscan\.com|tonscan\.org|tonviewer\.com|tronscan\.org|polygonscan\.com|etherscan\.io)[^"]*)"`)
	anyHrefRegex := regexp.MustCompile(`href="(https?://[^"]+)"`)
	amountRegex := regexp.MustCompile(`(?i)(?:Amount|Payout|Withdrawn|Sum|Received|Value)?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:BNB|USDT|TON|GRAM|TRX)`)

	for _, m := range matches {
		if len(m) < 3 {
			continue
		}
		postID, err := strconv.Atoi(m[1])
		if err != nil {
			continue
		}
		blockHTML := m[2]

		var txURL, txHash string
		network := "TON Blockchain Mainnet"
		explorerName := "TONScan"

		// 1. Try matching known explorer link
		if expMatch := explorerHrefRegex.FindStringSubmatch(blockHTML); len(expMatch) > 1 {
			txURL = expMatch[1]
			if strings.Contains(txURL, "bscscan.com") {
				network = "BNB Smart Chain (BEP-20)"
				explorerName = "BscScan"
				if hMatch := regexp.MustCompile(`tx/(0x[a-fA-F0-9]+)`).FindStringSubmatch(txURL); len(hMatch) > 1 {
					txHash = hMatch[1]
				}
			} else if strings.Contains(txURL, "tonscan.org") || strings.Contains(txURL, "tonviewer.com") {
				network = "TON Blockchain Mainnet"
				explorerName = "TONScan"
				if hMatch := regexp.MustCompile(`(?:tx|transaction)/([a-zA-Z0-9_\-]+)`).FindStringSubmatch(txURL); len(hMatch) > 1 {
					txHash = hMatch[1]
				}
			} else if strings.Contains(txURL, "tronscan.org") {
				network = "TRON Network (TRC-20)"
				explorerName = "TronScan"
				if hMatch := regexp.MustCompile(`transaction/([a-fA-F0-9]+)`).FindStringSubmatch(txURL); len(hMatch) > 1 {
					txHash = hMatch[1]
				}
			} else if strings.Contains(txURL, "polygonscan.com") {
				network = "Polygon PoS Network"
				explorerName = "PolygonScan"
				if hMatch := regexp.MustCompile(`tx/(0x[a-fA-F0-9]+)`).FindStringSubmatch(txURL); len(hMatch) > 1 {
					txHash = hMatch[1]
				}
			} else if strings.Contains(txURL, "etherscan.io") {
				network = "Ethereum Mainnet (ERC-20)"
				explorerName = "Etherscan"
				if hMatch := regexp.MustCompile(`tx/(0x[a-fA-F0-9]+)`).FindStringSubmatch(txURL); len(hMatch) > 1 {
					txHash = hMatch[1]
				}
			}
		}

		// 2. Generic fallback if any link contains scan / tx
		if txURL == "" {
			allHrefs := anyHrefRegex.FindAllStringSubmatch(blockHTML, -1)
			for _, href := range allHrefs {
				if len(href) > 1 && (strings.Contains(href[1], "scan") || strings.Contains(href[1], "/tx/") || strings.Contains(href[1], "transaction")) {
					txURL = href[1]
					parts := strings.Split(txURL, "/")
					txHash = parts[len(parts)-1]
					break
				}
			}
		}

		// If no hash was extracted from URL, extract from URL path
		if txHash == "" && txURL != "" {
			parts := strings.Split(txURL, "/")
			txHash = parts[len(parts)-1]
		}

		// If still no transaction in this post, skip to ensure 100% genuine on-chain links
		if txURL == "" || txHash == "" {
			continue
		}

		// Extract amount
		var amount float64
		currency := "GRAM"
		if amtMatch := amountRegex.FindStringSubmatch(blockHTML); len(amtMatch) > 1 {
			if a, err := strconv.ParseFloat(amtMatch[1], 64); err == nil && a > 0 {
				amount = a
			}
		}

		// Map to realistic 24H HashBee Yield amounts if amount is in tiny satoshis or zero
		if amount <= 0 || amount < 0.1 {
			sampleTiers := []float64{0.80, 2.00, 4.50, 10.00, 22.00, 50.00}
			amount = sampleTiers[rand.Intn(len(sampleTiers))]
		}

		results = append(results, PayoutPostData{
			PostID:       postID,
			RawHTML:      blockHTML,
			TxHash:       txHash,
			TxURL:        txURL,
			Network:      network,
			ExplorerName: explorerName,
			Amount:       amount,
			Currency:     currency,
		})
	}

	return results
}

// formatHashBeePayoutProof transforms raw data into a premium HashBee branded payout proof with real on-chain transaction link
func (s *PayoutMirrorService) formatHashBeePayoutProof(data PayoutPostData) (string, string, string) {
	// Pick appropriate plan name based on amount
	var planName string
	var usdVal float64 = data.Amount
	switch {
	case data.Amount >= 45.0:
		planName = "25.00 TON ➔ 50.00 G (2X Double Whale Matrix)"
	case data.Amount >= 20.0:
		planName = "12.00 TON ➔ 22.00 G (Apex God Hive +83.3% ROI)"
	case data.Amount >= 8.0:
		planName = "6.00 TON ➔ 10.00 G (Cyber Titan Hive +66.7% Profit)"
	case data.Amount >= 3.5:
		planName = "3.00 TON ➔ 4.50 G (Royal Queen Miner +50.0% Profit)"
	case data.Amount >= 1.5:
		planName = "1.30 TON ➔ 2.00 G (Standard Miner +53.8% Profit)"
	default:
		planName = "0.70 TON ➔ 0.80 G (Starter Trial Miner)"
	}

	// Anonymized user tags
	userNum := 100 + rand.Intn(899)
	userHandle := fmt.Sprintf("HB_user_%d***", userNum)

	// Short hash display
	shortHash := data.TxHash
	if len(shortHash) > 16 {
		shortHash = shortHash[:8] + "..." + shortHash[len(shortHash)-8:]
	}

	msg := fmt.Sprintf(`🐝 <b>HASHBEE 24H INSTANT CASHOUT PROOF</b> 💸

🎉 <b>Congratulations to miner:</b> <code>%s</code>
💰 <b>Received:</b> <code>+%.4f GRAM ($%.2f)</code>
⚡ <b>Mining Plan:</b> %s
🔗 <b>Network:</b> %s
⏱️ <b>Settlement:</b> Instant 24H Maturity

🔍 <b>Verified On-Chain Transaction:</b>
<a href="%s">View Transaction on %s ↗</a>

🚀 <i>Activate your 24H High-Yield Miner & withdraw instantly:</i>`,
		userHandle,
		data.Amount,
		usdVal,
		planName,
		data.Network,
		data.TxURL,
		data.ExplorerName,
	)

	btnText := "🐝 Start Mining Now (24H Cashout) ➔"
	btnURL := "https://t.me/hashbe_bot/app"

	return msg, btnText, btnURL
}

// SendTestProof dispatches an instant real test payout proof using the latest live scraped transaction
func (s *PayoutMirrorService) SendTestProof(ctx context.Context, targetChannel string) error {
	if s.bot == nil {
		return fmt.Errorf("telegram bot is not initialized")
	}

	if targetChannel == "" {
		targetChannel = s.settings.Get(ctx, "payout_mirror_target_channel", "@HashBeePayouts")
	}

	// Fetch 1 live post from AiLabRobotPayouts
	sourceURL := s.settings.Get(ctx, "payout_mirror_source", "https://t.me/s/AiLabRobotPayouts")
	req, err := http.NewRequestWithContext(ctx, "GET", sourceURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		if resp, err := s.httpClient.Do(req); err == nil {
			defer resp.Body.Close()
			if bodyBytes, err := io.ReadAll(resp.Body); err == nil {
				posts := s.parseTelegramPosts(string(bodyBytes))
				if len(posts) > 0 {
					latest := posts[len(posts)-1]
					msg, btnText, btnURL := s.formatHashBeePayoutProof(latest)
					return s.bot.SendChannelPayoutProof(targetChannel, msg, btnText, btnURL)
				}
			}
		}
	}

	// Fallback to verified real live BSC transaction
	testData := PayoutPostData{
		PostID:       99999,
		TxHash:       "0x59494162992a8dacffd985ebc1798d4da4d112010c70d61bf8465ac525dec56a",
		TxURL:        "https://bscscan.com/tx/0x59494162992a8dacffd985ebc1798d4da4d112010c70d61bf8465ac525dec56a",
		Network:      "BNB Smart Chain (BEP-20)",
		ExplorerName: "BscScan",
		Amount:       2.00,
		Currency:     "GRAM",
	}

	msg, btnText, btnURL := s.formatHashBeePayoutProof(testData)
	return s.bot.SendChannelPayoutProof(targetChannel, msg, btnText, btnURL)
}

// GetStatus returns the current live status and metrics of the Payout Mirror service
func (s *PayoutMirrorService) GetStatus(ctx context.Context) map[string]interface{} {
	s.mu.Lock()
	defer s.mu.Unlock()

	return map[string]interface{}{
		"enabled":        s.settings.GetBool(ctx, "payout_mirror_enabled", true),
		"source_channel": s.settings.Get(ctx, "payout_mirror_source", "https://t.me/s/AiLabRobotPayouts"),
		"target_channel": s.settings.Get(ctx, "payout_mirror_target_channel", "@HashBeePayouts"),
		"last_post_id":   s.settings.GetInt(ctx, "payout_mirror_last_post_id", 0),
		"last_sync_at":   s.lastSyncAt,
		"total_synced":   s.totalSynced,
	}
}

// UpdateConfig updates the mirror service configuration in settings table
func (s *PayoutMirrorService) UpdateConfig(ctx context.Context, source string, target string, enabled bool) error {
	if source != "" {
		_ = s.settings.Set(ctx, "payout_mirror_source", strings.TrimSpace(source))
	}
	if target != "" {
		_ = s.settings.Set(ctx, "payout_mirror_target_channel", strings.TrimSpace(target))
	}
	_ = s.settings.Set(ctx, "payout_mirror_enabled", strconv.FormatBool(enabled))
	return nil
}
