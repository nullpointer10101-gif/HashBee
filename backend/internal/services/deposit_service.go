package services

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BotNotifier interface for sending notifications
type BotNotifier interface {
	SendDepositNotification(telegramID int64, amountGram, ghsPower float64)
	SendCampaignDepositNotification(ownerID uuid.UUID, title string, amountGram float64)
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
		rawWallet: "0:c0a8d40eeb9234eae253e28c677d03c0428137aa7318612797b5ab7f7c5f898a",
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

	for _, ev := range data.Events {
		eventId := ev.EventID
		if eventId == "" {
			continue
		}

		for _, action := range ev.Actions {
			var amountGram float64
			var recipientAddr string
			var comment string

			if action.Type == "TonTransfer" && action.TonTransfer != nil {
				transfer := action.TonTransfer
				amountGram = float64(transfer.Amount) / 1e9
				recipientAddr = strings.ToLower(transfer.Recipient.Address)
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
				comment = strings.TrimSpace(jt.Comment)
			} else {
				continue
			}

			// Check recipient matches our wallet
			if recipientAddr != strings.ToLower(s.wallet) && recipientAddr != strings.ToLower(s.rawWallet) {
				continue
			}

			// 1. Check if this transfer is a payment for a Campaign (identified by CMP memo or comment)
			upperComment := strings.ToUpper(strings.TrimSpace(comment))
			if strings.Contains(upperComment, "CMP") {
				if amountGram >= 0.05 {
					var campID uuid.UUID
					var campOwnerID uuid.UUID
					var campType, campTarget, campTitle string
					var campRewardBP float64
					err := s.db.QueryRow(ctx,
						"SELECT id, owner_user_id, type, target, title, reward_bp FROM campaigns WHERE (UPPER(TRIM(payment_memo)) = UPPER(TRIM($1)) OR UPPER(TRIM($1)) LIKE '%' || UPPER(TRIM(payment_memo)) || '%') AND status = 'waiting_for_payment' LIMIT 1",
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
								if s.bot != nil {
									s.bot.SendCampaignDepositNotification(campOwnerID, campTitle, amountGram)
								}
								continue
							}
						}
					}
				}
				// CRITICAL: A campaign payment must NEVER fall through to miner power deposit!
				continue
			}

			// 1.1 Check if this transfer is for a Viral Bounty Fee (identified by VIRAL memo)
			if strings.Contains(upperComment, "VIRAL") {
				if amountGram >= 1.0 {
					var bountyID uuid.UUID
					var bountyUserID uuid.UUID
					var bountyWallet string
					var bountyPayout float64
					err := s.db.QueryRow(ctx,
						"SELECT id, user_id, wallet_address, payout_gram FROM viral_bounties WHERE (UPPER(TRIM(payment_memo)) = UPPER(TRIM($1)) OR UPPER(TRIM($1)) LIKE '%' || UPPER(TRIM(payment_memo)) || '%') AND fee_paid = false LIMIT 1",
						comment).Scan(&bountyID, &bountyUserID, &bountyWallet, &bountyPayout)
					if err == nil && bountyID != uuid.Nil {
						tx, err := s.db.Begin(ctx)
						if err == nil {
							_, _ = tx.Exec(ctx, "UPDATE viral_bounties SET fee_paid = true, status = 'paid', updated_at = NOW() WHERE id = $1", bountyID)

							// Create withdrawal request in withdrawals table
							wID := uuid.New()
							_, _ = tx.Exec(ctx,
								`INSERT INTO withdrawals (id, user_id, address, network, amount, honey_amount, fee, status, created_at, updated_at)
								 VALUES ($1, $2, $3, 'GRAM', $4, $4, 0, 'pending', NOW(), NOW())`,
								wID, bountyUserID, bountyWallet, bountyPayout)

							idemp := fmt.Sprintf("viral_bounty_%s", eventId)
							_, _ = tx.Exec(ctx,
								"INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at) VALUES ($1, $2, 'adjustment', $3, 'GRAM', $4, 'viral_bounty', $5, 'Viral Bounty 1.20 GRAM Fee Paid & 10 GRAM Payout Queued', NOW()) ON CONFLICT DO NOTHING",
								uuid.New(), bountyUserID, amountGram, bountyID, idemp)

							if err := tx.Commit(ctx); err == nil {
								log.Printf("🎁 [DepositService] Viral Bounty 10 GRAM Cashout activated for user %s via fee deposit tx %s!", bountyUserID, eventId)
								creditedCount++
								continue
							}
						}
					}
				}
				continue
			}

			// 2. Minimum regular deposit: 0.50 GRAM
			if amountGram < 0.50 {
				continue
			}

			// Determine target user strictly from Telegram ID in memo
			var targetTelegramID int64
			cleanComment := strings.TrimSpace(comment)
			for _, pfx := range []string{
				"PLAN_MATRIX_HB_", "PLAN_MATRIX_HB", "PLAN_MATRIX_", "PLAN_MATRIX",
				"PLAN_APEX_HB_", "PLAN_APEX_HB", "PLAN_APEX_", "PLAN_APEX",
				"PLAN_TITAN_HB_", "PLAN_TITAN_HB", "PLAN_TITAN_", "PLAN_TITAN",
				"PLAN_STARTER_HB_", "PLAN_STARTER_HB", "PLAN_STARTER_", "PLAN_STARTER",
				"PLAN_STANDARD_HB_", "PLAN_STANDARD_HB", "PLAN_STANDARD_", "PLAN_STANDARD",
				"PLAN_QUEEN_HB_", "PLAN_QUEEN_HB", "PLAN_QUEEN_", "PLAN_QUEEN",
				"PLAN_HB_", "PLAN_HB", "PLAN_", "PLAN",
				"HB_", "HB", "CRATE_", "CRATE", "CR_", "GHS_", "GHS", "USER_",
			} {
				if strings.HasPrefix(strings.ToUpper(cleanComment), pfx) {
					cleanComment = strings.TrimSpace(cleanComment[len(pfx):])
					break
				}
			}
			cleanComment = strings.Trim(cleanComment, "_ :-#")
			if tid, err := strconv.ParseInt(cleanComment, 10, 64); err == nil && tid > 10000 {
				targetTelegramID = tid
			}

			if targetTelegramID <= 0 {
				continue
			}

			// Check if this deposit is for a Yield Plan
			var isPlanDeposit bool
			var planID string
			if strings.HasPrefix(upperComment, "PLAN_MATRIX") {
				isPlanDeposit = true
				planID = "matrix"
			} else if strings.HasPrefix(upperComment, "PLAN_APEX") {
				isPlanDeposit = true
				planID = "apex"
			} else if strings.HasPrefix(upperComment, "PLAN_TITAN") {
				isPlanDeposit = true
				planID = "titan"
			} else if strings.HasPrefix(upperComment, "PLAN_STARTER") {
				isPlanDeposit = true
				planID = "starter"
			} else if strings.HasPrefix(upperComment, "PLAN_STANDARD") {
				isPlanDeposit = true
				planID = "standard"
			} else if strings.HasPrefix(upperComment, "PLAN_QUEEN") {
				isPlanDeposit = true
				planID = "queen"
			} else if strings.HasPrefix(upperComment, "PLAN_") {
				isPlanDeposit = true
				if amountGram >= 22.0 {
					planID = "matrix"
				} else if amountGram >= 9.0 {
					planID = "apex"
				} else if amountGram >= 6.0 {
					planID = "titan"
				} else if amountGram >= 3.0 {
					planID = "queen"
				} else if amountGram >= 1.3 {
					planID = "standard"
				} else {
					planID = "starter"
				}
			}

			if isPlanDeposit {
				activated, err := s.activatePlanViaDeposit(ctx, targetTelegramID, planID, amountGram, eventId)
				if err != nil {
					log.Printf("⚠️  [DepositService] Error activating plan %s for user %d: %v", planID, targetTelegramID, err)
					continue
				}
				if activated {
					creditedCount++
					continue
				}
			}

			// Credit regular miner deposit atomically
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

func (s *DepositService) activatePlanViaDeposit(ctx context.Context, telegramID int64, planID string, amountGram float64, eventID string) (bool, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	// Idempotency check
	var existingTx string
	err = tx.QueryRow(ctx, "SELECT id FROM transactions WHERE idempotency_key = $1", eventID).Scan(&existingTx)
	if err == nil {
		return false, nil // already processed
	}

	var userID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE", telegramID).Scan(&userID)
	if err != nil {
		return false, fmt.Errorf("user %d not found in database", telegramID)
	}

	var planName string
	var costGRAM, returnGRAM float64
	var maxPerAccount int

	switch planID {
	case "matrix":
		planName = "Infinite Mega Whale Matrix"
		costGRAM = 22.00
		returnGRAM = 50.00
		maxPerAccount = 0
	case "apex":
		planName = "Apex Sovereign God Hive"
		costGRAM = 9.00
		returnGRAM = 22.00
		maxPerAccount = 0
	case "titan":
		planName = "Cyber Titan Hive"
		costGRAM = 6.00
		returnGRAM = 10.00
		maxPerAccount = 0
	case "queen":
		planName = "Royal Queen Miner"
		costGRAM = 3.00
		returnGRAM = 4.50
		maxPerAccount = 0
	case "starter":
		planName = "Starter Bee Miner"
		costGRAM = 0.70
		returnGRAM = 0.80
		maxPerAccount = 1
	default:
		planID = "standard"
		planName = "Standard Worker Miner"
		costGRAM = 1.30
		returnGRAM = 2.00
		maxPerAccount = 0
	}

	if maxPerAccount > 0 {
		var pastPurchases int
		_ = tx.QueryRow(ctx, "SELECT COUNT(*) FROM user_plans WHERE user_id = $1 AND plan_id = $2", userID, planID).Scan(&pastPurchases)
		if pastPurchases >= maxPerAccount {
			// fallback to standard plan
			planID = "standard"
			planName = "Standard Worker Miner"
			costGRAM = 1.30
			returnGRAM = 2.00
		}
	}

	now := time.Now().UTC()
	durationSec := 86400
	maturesAt := now.Add(time.Duration(durationSec) * time.Second)
	newPlanID := uuid.New()

	// Insert into user_plans
	_, err = tx.Exec(ctx,
		`INSERT INTO user_plans (id, user_id, plan_id, plan_name, cost_gram, return_gram, duration_seconds, status, started_at, matures_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $8)`,
		newPlanID, userID, planID, planName, costGRAM, returnGRAM, durationSec, now, maturesAt)
	if err != nil {
		return false, fmt.Errorf("failed to insert plan record: %w", err)
	}

	// Insert transaction
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'plan_purchase', $3, 'GRAM', $4, $5, NOW())`,
		uuid.New(), userID, costGRAM, eventID, fmt.Sprintf("Blockchain Plan Activation: %s (24h Yield Contract)", planName))
	if err != nil {
		return false, fmt.Errorf("failed to insert transaction: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	log.Printf("🎉 [DepositService] Activated %s for user %d via blockchain tx %s!", planName, telegramID, eventID)
	return true, nil
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
	var currentHoney, currentBP float64
	err = tx.QueryRow(ctx, "SELECT id, honey_balance, bp FROM users WHERE telegram_id = $1 FOR UPDATE", telegramID).Scan(&userID, &currentHoney, &currentBP)
	if err != nil {
		// User does not exist yet
		return false, fmt.Errorf("user %d not found in database", telegramID)
	}

	// Rate: 1 TON = 520 GHS
	powerGained := amountGram * 520.0

	// 3. Update user both spendable balance (for crates / miner) and hashrate (for cloud mining)
	newHoney := currentHoney + amountGram
	newBP := currentBP + powerGained
	_, err = tx.Exec(ctx, "UPDATE users SET honey_balance = $1, bp = $2, updated_at = NOW() WHERE id = $3", newHoney, newBP, userID)
	if err != nil {
		return false, fmt.Errorf("failed to update user balance: %w", err)
	}

	// 4. Record ledger transaction
	desc := fmt.Sprintf("Blockchain deposit: +%.3f GRAM (+%.4f USDT Balance & +%.2f GHS)", amountGram, amountGram, powerGained)
	_, err = tx.Exec(ctx,
		"INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at) VALUES ($1, $2, 'deposit', $3, 'GRAM', $4, $5, NOW())",
		uuid.New(), userID, amountGram, eventID, desc)
	if err != nil {
		return false, fmt.Errorf("failed to insert transaction: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	log.Printf("💎 [DepositService] Successfully credited +%.3f GRAM (+%.4f USDT & +%.2f GHS) to user %d (tx: %s)", amountGram, amountGram, powerGained, telegramID, eventID)

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
