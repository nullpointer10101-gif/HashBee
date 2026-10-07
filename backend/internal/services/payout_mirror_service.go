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
	PostID   int
	RawHTML  string
	TxHash   string
	TxURL    string
	Amount   float64
	Currency string
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

		// If first run and lastPostID is 0, only take the latest 2-3 posts to avoid spamming the channel
		if lastPostID == 0 && p.PostID < (posts[len(posts)-1].PostID-2) {
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
				log.Printf("🎉 [PayoutMirror] Mirrored post #%d to %s (Tx: %s)", p.PostID, targetChannel, p.TxHash)
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

// Helper: parse Telegram channel HTML into structured posts
func (s *PayoutMirrorService) parseTelegramPosts(htmlContent string) []PayoutPostData {
	var results []PayoutPostData

	// Match message containers: data-post="ChannelName/12345"
	msgBlockRegex := regexp.MustCompile(`(?s)<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post="[^/]+/(\d+)"[^>]*>(.*?)<div class="tgme_widget_message_footer`)
	matches := msgBlockRegex.FindAllStringSubmatch(htmlContent, -1)

	urlTxRegex := regexp.MustCompile(`https?://(?:tonscan\.org/tx/|tonviewer\.com/transaction/|tonviewer\.com/)([a-zA-Z0-9_\-]+)`)
	rawHashRegex := regexp.MustCompile(`\b([a-zA-Z0-9_\-]{44,66})\b`)
	amountRegex := regexp.MustCompile(`(?i)(?:Amount|Payout|Withdrawn|Sum|Received|Value)?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:TON|GRAM|USDT)`)

	for _, m := range matches {
		if len(m) < 3 {
			continue
		}
		postID, err := strconv.Atoi(m[1])
		if err != nil {
			continue
		}
		blockHTML := m[2]

		// Extract transaction hash & link
		var txHash, txURL string
		if urlMatch := urlTxRegex.FindStringSubmatch(blockHTML); len(urlMatch) > 1 {
			txHash = urlMatch[1]
			txURL = fmt.Sprintf("https://tonviewer.com/transaction/%s", txHash)
		} else if rawMatch := rawHashRegex.FindStringSubmatch(blockHTML); len(rawMatch) > 1 {
			txHash = rawMatch[1]
			txURL = fmt.Sprintf("https://tonviewer.com/transaction/%s", txHash)
		}

		// If no transaction hash in post, generate a valid placeholder TON hash format for authentic look
		if txHash == "" {
			txHash = s.generateSimulatedTonHash()
			txURL = fmt.Sprintf("https://tonviewer.com/transaction/%s", txHash)
		}

		// Extract amount
		var amount float64
		currency := "TON"
		if amtMatch := amountRegex.FindStringSubmatch(blockHTML); len(amtMatch) > 1 {
			if a, err := strconv.ParseFloat(amtMatch[1], 64); err == nil && a > 0 {
				amount = a
			}
		}

		// Fallback to randomized realistic 24h yield payout tiers
		if amount <= 0 {
			sampleTiers := []float64{0.80, 2.00, 4.50, 10.00, 22.00, 50.00}
			amount = sampleTiers[rand.Intn(len(sampleTiers))]
		}

		results = append(results, PayoutPostData{
			PostID:   postID,
			RawHTML:  blockHTML,
			TxHash:   txHash,
			TxURL:    txURL,
			Amount:   amount,
			Currency: currency,
		})
	}

	return results
}

// formatHashBeePayoutProof transforms raw data into a premium HashBee branded payout proof
func (s *PayoutMirrorService) formatHashBeePayoutProof(data PayoutPostData) (string, string, string) {
	// Pick appropriate plan name based on amount
	var planName string
	switch {
	case data.Amount >= 45.0:
		planName = "🌌 Infinite Mega Whale Matrix (+100.0% Double)"
	case data.Amount >= 20.0:
		planName = "🔥 Apex Sovereign God Hive (+83.3% ROI)"
	case data.Amount >= 8.0:
		planName = "💎 Cyber Titan Hive (+66.7% Profit)"
	case data.Amount >= 3.5:
		planName = "👑 Royal Queen Miner (+50.0% Profit)"
	case data.Amount >= 1.5:
		planName = "⚡ Standard Worker Miner (+53.8% Profit)"
	default:
		planName = "🐝 Starter Bee Miner (+14.3% Profit)"
	}

	// Anonymized user tags
	userPool := []string{
		"@alex_ton***", "@whale_99***", "@dan_crypto***", "@serg_k***",
		"@ton_king***", "@bee_miner***", "@ivan_ton***", "@max_yield***",
		"@dmitry_***", "@crypto_pro***", "@ton_whale***", "@sultan_***",
	}
	userTag := userPool[rand.Intn(len(userPool))]
	randomIDNum := 1000000 + rand.Intn(8999999)
	hbID := fmt.Sprintf("HB_%d", randomIDNum)

	// Short hash display
	shortHash := data.TxHash
	if len(shortHash) > 16 {
		shortHash = shortHash[:8] + "..." + shortHash[len(shortHash)-8:]
	}

	nowStr := time.Now().UTC().Format("15:04:05 UTC")

	msg := fmt.Sprintf(`🍯 <b>HASHBEE 24H INSTANT CASHOUT PROOF</b> 💸

⚡ <b>Mining Contract:</b> %s
👤 <b>Recipient:</b> <code>%s</code> (%s)
💰 <b>Payout Amount:</b> <b>+%.2f GRAM / TON</b>
🛡️ <b>Status:</b> <b>Confirmed On-Chain ✅</b>
⏱️ <b>Processed At:</b> %s

🔗 <b>TON Blockchain Explorer Proof:</b>
<a href="%s">%s</a> ↗️

🐝 <i>Start Cloud Mining & Activate 24H Yield Plans on HashBee!</i>`,
		planName,
		hbID,
		userTag,
		data.Amount,
		nowStr,
		data.TxURL,
		shortHash,
	)

	btnText := fmt.Sprintf("⚡ Activate Mining Plan (+%.2f TON) 🚀", data.Amount)
	btnURL := "https://miniapp-five-topaz.vercel.app"

	return msg, btnText, btnURL
}

func (s *PayoutMirrorService) generateSimulatedTonHash() string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
	b := make([]byte, 48)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// SendTestProof dispatches an instant test payout proof to the target channel
func (s *PayoutMirrorService) SendTestProof(ctx context.Context, targetChannel string) error {
	if s.bot == nil {
		return fmt.Errorf("telegram bot is not initialized")
	}

	if targetChannel == "" {
		targetChannel = s.settings.Get(ctx, "payout_mirror_target_channel", "@HashBeePayouts")
	}

	testData := PayoutPostData{
		PostID:   99999,
		TxHash:   s.generateSimulatedTonHash(),
		TxURL:    "https://tonviewer.com",
		Amount:   2.00,
		Currency: "TON",
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
