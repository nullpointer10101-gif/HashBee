package services

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BotNotifier interface for sending notifications
type BotNotifier interface {
	SendDepositNotification(telegramID int64, amountGram, ghsPower float64)
}

type DepositService struct {
	db        *pgxpool.Pool
	bot       BotNotifier
	wallet    string
	rawWallet string
	client    *http.Client
}

func NewDepositService(db *pgxpool.Pool, bot BotNotifier, wallet string) *DepositService {
	return &DepositService{
		db:        db,
		bot:       bot,
		wallet:    wallet,
		rawWallet: "0:1e84166ab32e9c0464a6567daaaae3b96f8e1c9264e78664fd2b42ca71fb3280",
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

// TonAPI Event response types
type tonEventResponse struct {
	Events []tonEvent `json:"events"`
}

type tonEvent struct {
	EventID   string      `json:"event_id"`
	Timestamp int64       `json:"timestamp"`
	Actions   []tonAction `json:"actions"`
}

type tonAction struct {
	Type           string              `json:"type"`
	TonTransfer    *tonTransferData    `json:"TonTransfer,omitempty"`
	JettonTransfer *jettonTransferData `json:"JettonTransfer,omitempty"`
}

type tonTransferData struct {
	Sender    tonAccount `json:"sender"`
	Recipient tonAccount `json:"recipient"`
	Amount    int64      `json:"amount"` // in nanotons (1e9 = 1 GRAM)
	Comment   string     `json:"comment"`
}

type jettonTransferData struct {
	Sender           tonAccount  `json:"sender"`
	Recipient        *tonAccount `json:"recipient,omitempty"`
	SendersWallet    string      `json:"senders_wallet"`
	RecipientsWallet string      `json:"recipients_wallet"`
	Amount           string      `json:"amount"` // in nano units
	Comment          string      `json:"comment"`
}

type tonAccount struct {
	Address string `json:"address"`
}

// normalizeTonAddress converts any Ton address (base64 bounceable/non-bounceable or raw) to lowercase hex 0:...
func normalizeTonAddress(addr string) string {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return ""
	}
	if strings.HasPrefix(addr, "0:") || strings.HasPrefix(addr, "-1:") {
		return strings.ToLower(addr)
	}

	clean := strings.ReplaceAll(strings.ReplaceAll(addr, "-", "+"), "_", "/")
	for len(clean)%4 != 0 {
		clean += "="
	}

	raw, err := base64.StdEncoding.DecodeString(clean)
	if err == nil && len(raw) >= 34 {
		workchain := int8(raw[1])
		hexStr := hex.EncodeToString(raw[2:34])
		return strings.ToLower(fmt.Sprintf("%d:%s", workchain, hexStr))
	}

	return strings.ToLower(addr)
}

// ProcessDeposits scans TonAPI and credits uncredited transfers
func (s *DepositService) ProcessDeposits(ctx context.Context) (int, error) {
	return s.ProcessDepositsForUser(ctx, 0, "")
}

// ProcessDepositsForUser scans TonAPI and credits transfers, optionally matching a specific user by sender address if comment was omitted
func (s *DepositService) ProcessDepositsForUser(ctx context.Context, telegramID int64, senderAddress string) (int, error) {
	url := fmt.Sprintf("https://tonapi.io/v2/accounts/%s/events?limit=50", s.wallet)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("tonapi request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("tonapi returned status %d", resp.StatusCode)
	}

	var data tonEventResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, fmt.Errorf("failed to decode tonapi response: %w", err)
	}

	creditedCount := 0
	memoRegex := regexp.MustCompile(`(?i)(?:HB_)?(\d{6,15})`)
	normalizedUserSender := normalizeTonAddress(senderAddress)

	for _, ev := range data.Events {
		eventId := ev.EventID
		if eventId == "" {
			continue
		}

		for _, action := range ev.Actions {
			var amountGram float64
			var recipientAddr string
			var senderAddr string
			var comment string

			if action.Type == "TonTransfer" && action.TonTransfer != nil {
				transfer := action.TonTransfer
				amountGram = float64(transfer.Amount) / 1e9
				recipientAddr = strings.ToLower(transfer.Recipient.Address)
				senderAddr = strings.ToLower(transfer.Sender.Address)
				comment = strings.TrimSpace(transfer.Comment)
			} else if action.Type == "JettonTransfer" && action.JettonTransfer != nil {
				jt := action.JettonTransfer
				amt, _ := strconv.ParseFloat(jt.Amount, 64)
				amountGram = amt / 1e9
				if jt.Recipient != nil {
					recipientAddr = strings.ToLower(jt.Recipient.Address)
				} else {
					recipientAddr = strings.ToLower(jt.RecipientsWallet)
				}
				senderAddr = strings.ToLower(jt.Sender.Address)
				comment = strings.TrimSpace(jt.Comment)
			} else {
				continue
			}

			// Check recipient matches our wallet
			if recipientAddr != strings.ToLower(s.wallet) && recipientAddr != strings.ToLower(s.rawWallet) {
				continue
			}

			// Minimum deposit: 0.10 GRAM
			if amountGram < 0.10 {
				continue
			}

						// Check if this transfer is a payment for a Campaign
			if comment != "" {
				var campID uuid.UUID
				var campOwnerID uuid.UUID
				var campType, campTarget, campTitle string
				var campRewardBP float64
				err := s.db.QueryRow(ctx,
					"SELECT id, owner_user_id, type, target, title, reward_bp FROM campaigns WHERE payment_memo = $1 AND status = 'waiting_for_payment'",
					comment).Scan(&campID, &campOwnerID, &campType, &campTarget, &campTitle, &campRewardBP)
				if err == nil && campID != uuid.Nil {
					tx, err := s.db.Begin(ctx)
					if err == nil {
						_, _ = tx.Exec(ctx, "UPDATE campaigns SET status = 'active', updated_at = NOW() WHERE id = $1", campID)
						icon := "link"
						if campType == "channel" || campType == "group" {
							icon = "users"
						} else if campType == "bot" {
							icon = "bot"
						}
						_, _ = tx.Exec(ctx,
							"INSERT INTO missions (id, type, target, title, description, reward_bp, campaign_id, sort_order, status, is_official, icon_url, created_at, updated_at) VALUES ($1, $2, $3, $4, '+0.1 GHS', $5, $6, 30, 'active', false, $7, NOW(), NOW())",
							uuid.New(), campType, campTarget, campTitle, campRewardBP, campID, icon)

						idemp := fmt.Sprintf("campaign_dep_%s", eventId)
						_, _ = tx.Exec(ctx,
							"INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at) VALUES ($1, $2, 'campaign_payment', $3, 'GRAM', $4, 'campaign', $5, $6, NOW()) ON CONFLICT DO NOTHING",
							uuid.New(), campOwnerID, amountGram, campID, idemp, fmt.Sprintf("Promote campaign: %s", campTitle))

						if err := tx.Commit(ctx); err == nil {
							log.Printf("📢 [DepositService] Activated campaign %s (%s) via deposit tx %s!", campID, campTitle, eventId)
							creditedCount++
							continue
						}
					}
				}
			}

			// Determine target user
			var targetTelegramID int64
			match := memoRegex.FindStringSubmatch(comment)
			if len(match) >= 2 {
				targetTelegramID, _ = strconv.ParseInt(match[1], 10, 64)
			}

			// Fallback: If memo was omitted, check if sender matches current user's provided address
			if targetTelegramID <= 0 && telegramID > 0 && normalizedUserSender != "" {
				if senderAddr == normalizedUserSender {
					targetTelegramID = telegramID
				}
			}

			if targetTelegramID <= 0 {
				continue
			}

			// Credit atomically
			credited, err := s.creditUserDeposit(ctx, targetTelegramID, amountGram, eventId)
			if err != nil {
				log.Printf("⚠️  [DepositService] Error crediting deposit %s for user %d: %v", eventId, targetTelegramID, err)
				continue
			}

			if credited {
				creditedCount++
			}
		}
	}

	return creditedCount, nil
}

func (s *DepositService) creditUserDeposit(ctx context.Context, telegramID int64, amountGram float64, eventID string) (bool, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	// 1. Idempotency check: verify this transaction was not already credited
	var existingTx string
	err = tx.QueryRow(ctx, "SELECT id FROM transactions WHERE idempotency_key = $1", eventID).Scan(&existingTx)
	if err == nil {
		// Already processed
		return false, nil
	}

	// 2. Lock user row
	var userID uuid.UUID
	var currentBP float64
	err = tx.QueryRow(ctx, "SELECT id, bp FROM users WHERE telegram_id = $1 FOR UPDATE", telegramID).Scan(&userID, &currentBP)
	if err != nil {
		// User does not exist yet
		return false, fmt.Errorf("user %d not found in database", telegramID)
	}

	// Rate: 1 GRAM = 50 GHS, +5% bonus = 52.5 GHS per 1 GRAM
	powerGained := amountGram * 50.0 * 1.05

	// 3. Update user BP
	newBP := currentBP + powerGained
	_, err = tx.Exec(ctx, "UPDATE users SET bp = $1, updated_at = NOW() WHERE id = $2", newBP, userID)
	if err != nil {
		return false, fmt.Errorf("failed to update user bp: %w", err)
	}

	// 4. Record ledger transaction
	desc := fmt.Sprintf("Blockchain deposit: +%.3f GRAM (+%.2f GHS)", amountGram, powerGained)
	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at) VALUES ($1, $2, 'deposit', $3, 'GRAM', $4, $5, NOW())",
		uuid.New(), userID, amountGram, eventID, desc)
	if err != nil {
		return false, fmt.Errorf("failed to insert transaction: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	log.Printf("💎 [DepositService] Successfully credited +%.3f GRAM (+%.2f GHS) to user %d (tx: %s)", amountGram, powerGained, telegramID, eventID)

	// Send instant notification via Bot
	if s.bot != nil {
		s.bot.SendDepositNotification(telegramID, amountGram, powerGained)
	}

	return true, nil
}

// StartWatcher starts background polling every interval
func (s *DepositService) StartWatcher(ctx context.Context, interval time.Duration) {
	log.Printf("💎 [DepositService] Starting TON deposit watcher on %s (interval: %v)", s.wallet, interval)

	// Initial scan
	go func() {
		time.Sleep(3 * time.Second)
		if count, err := s.ProcessDeposits(context.Background()); err == nil && count > 0 {
			log.Printf("💎 [DepositService] Initial scan credited %d deposit(s)", count)
		}
	}()

	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				if count, err := s.ProcessDeposits(context.Background()); err == nil && count > 0 {
					log.Printf("💎 [DepositService] Credited %d incoming deposit(s)", count)
				}
			}
		}
	}()
}
