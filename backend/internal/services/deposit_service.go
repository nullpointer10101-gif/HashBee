package services

import (
	"context"
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
	Type        string           `json:"type"`
	TonTransfer *tonTransferData `json:"TonTransfer,omitempty"`
}

type tonTransferData struct {
	Sender    tonAccount `json:"sender"`
	Recipient tonAccount `json:"recipient"`
	Amount    int64      `json:"amount"` // in nanotons (1e9 = 1 GRAM)
	Comment   string     `json:"comment"`
}

type tonAccount struct {
	Address string `json:"address"`
}

// ProcessDeposits scans TonAPI and credits uncredited transfers
func (s *DepositService) ProcessDeposits(ctx context.Context) (int, error) {
	url := fmt.Sprintf("https://tonapi.io/v2/accounts/%s/events?limit=30", s.wallet)
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

	for _, ev := range data.Events {
		eventId := ev.EventID
		if eventId == "" {
			continue
		}

		for _, action := range ev.Actions {
			if action.Type != "TonTransfer" || action.TonTransfer == nil {
				continue
			}

			transfer := action.TonTransfer
			recipientAddr := strings.ToLower(transfer.Recipient.Address)

			// Check recipient matches our wallet
			if recipientAddr != strings.ToLower(s.wallet) && recipientAddr != strings.ToLower(s.rawWallet) {
				continue
			}

			// Minimum deposit: 0.1 GRAM (100,000,000 nano)
			amountNano := transfer.Amount
			if amountNano < 100000000 { // 0.1 GRAM
				continue
			}

			amountGram := float64(amountNano) / 1e9
			comment := strings.TrimSpace(transfer.Comment)

			// Extract Telegram ID from memo / comment
			match := memoRegex.FindStringSubmatch(comment)
			if len(match) < 2 {
				continue
			}

			telegramID, err := strconv.ParseInt(match[1], 10, 64)
			if err != nil || telegramID <= 0 {
				continue
			}

			// Credit atomically
			credited, err := s.creditUserDeposit(ctx, telegramID, amountGram, eventId)
			if err != nil {
				log.Printf("⚠️  [DepositService] Error crediting deposit %s for user %d: %v", eventId, telegramID, err)
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
	err = tx.QueryRow(ctx, `SELECT id FROM transactions WHERE idempotency_key = $1`, eventID).Scan(&existingTx)
	if err == nil {
		// Already processed
		return false, nil
	}

	// 2. Lock user row
	var userID uuid.UUID
	var currentBP float64
	err = tx.QueryRow(ctx, `SELECT id, bp FROM users WHERE telegram_id = $1 FOR UPDATE`, telegramID).Scan(&userID, &currentBP)
	if err != nil {
		// User does not exist yet
		return false, fmt.Errorf("user %d not found in database", telegramID)
	}

	// Rate: 1 GRAM = 50 GHS, +5% bonus = 52.5 GHS per 1 GRAM
	powerGained := amountGram * 50.0 * 1.05

	// 3. Update user BP
	newBP := currentBP + powerGained
	_, err = tx.Exec(ctx, `UPDATE users SET bp = $1, updated_at = NOW() WHERE id = $2`, newBP, userID)
	if err != nil {
		return false, fmt.Errorf("failed to update user bp: %w", err)
	}

	// 4. Record ledger transaction
	desc := fmt.Sprintf("Blockchain deposit: +%.3f GRAM (+%.2f GHS)", amountGram, powerGained)
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'deposit', $3, 'GRAM', $4, $5, NOW())`,
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
