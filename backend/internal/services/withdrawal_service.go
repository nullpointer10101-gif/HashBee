package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

type WithdrawalService struct {
	db       *pgxpool.Pool
	settings *SettingsService
	referral *ReferralService
}

func NewWithdrawalService(db *pgxpool.Pool, settings *SettingsService, referral *ReferralService) *WithdrawalService {
	return &WithdrawalService{db: db, settings: settings, referral: referral}
}

type WithdrawalRequest struct {
	Address string `json:"address" binding:"required"`
	Network string `json:"network" binding:"required"`
	Amount  float64 `json:"amount" binding:"required,gt=0"`
}

// CreateWithdrawal validates gates and creates a withdrawal request
func (s *WithdrawalService) CreateWithdrawal(ctx context.Context, userID uuid.UUID, req WithdrawalRequest) (*models.Withdrawal, error) {
	// Load user
	var u models.User
	err := s.db.QueryRow(ctx,
		`SELECT id, honey_balance, status FROM users WHERE id = $1 FOR UPDATE`,
		userID).Scan(&u.ID, &u.HoneyBalance, &u.Status)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if u.Status == models.UserStatusBanned {
		return nil, fmt.Errorf("account is banned")
	}

	// Validate network
	validNetworks := map[string]bool{"USDT_BSC": true, "USDT_BEP20": true, "GRAM": true, "USDT": true}
	if !validNetworks[req.Network] {
		return nil, fmt.Errorf("invalid network: %s", req.Network)
	}

	// Load settings
	honeyToUSDT := s.settings.GetFloat(ctx, "honey_to_usdt_rate", 1000)
	minUSDT := s.settings.GetFloat(ctx, "min_withdrawal_usdt", 0.05)
	maxPerDay := s.settings.GetFloat(ctx, "max_withdrawal_per_day_usdt", 100)
	cooldownHours := s.settings.GetFloat(ctx, "withdrawal_cooldown_hours", 24)
	minReferrals := s.settings.GetInt(ctx, "withdrawal_min_referrals", 3)
	minMissions := s.settings.GetInt(ctx, "withdrawal_min_missions", 5)

	// Convert honey amount to USDT
	usdtAmount := req.Amount / honeyToUSDT

	// Check minimum
	if usdtAmount < minUSDT {
		return nil, fmt.Errorf("minimum withdrawal is %.4f USDT (%.0f Honey)", minUSDT, minUSDT*honeyToUSDT)
	}

	// Check balance
	if req.Amount > u.HoneyBalance {
		return nil, fmt.Errorf("insufficient Honey balance: have %.8f, need %.8f", u.HoneyBalance, req.Amount)
	}

	// Check referral gate
	activeRefs, _ := s.referral.CountActiveReferrals(ctx, userID)
	if activeRefs < minReferrals {
		return nil, fmt.Errorf("you need at least %d active referrals to withdraw (you have %d)", minReferrals, activeRefs)
	}

	// Check mission gate
	var completedMissions int
	_ = s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM mission_completions WHERE user_id = $1 AND status = 'reward_paid'`,
		userID).Scan(&completedMissions)
	if completedMissions < minMissions {
		return nil, fmt.Errorf("you need at least %d completed missions to withdraw (you have %d)", minMissions, completedMissions)
	}

	// Check cooldown
	var lastWithdrawal time.Time
	err = s.db.QueryRow(ctx,
		`SELECT created_at FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID).Scan(&lastWithdrawal)
	if err == nil {
		sinceHours := time.Since(lastWithdrawal).Hours()
		if sinceHours < cooldownHours {
			return nil, fmt.Errorf("withdrawal cooldown: please wait %.0f more hours", cooldownHours-sinceHours)
		}
	}

	// Check daily max
	var todayTotal float64
	_ = s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM withdrawals
		 WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours' AND status != 'rejected'`,
		userID).Scan(&todayTotal)
	todayTotalUSDT := todayTotal / honeyToUSDT
	if todayTotalUSDT+usdtAmount > maxPerDay {
		return nil, fmt.Errorf("daily withdrawal limit exceeded (max %.2f USDT/day)", maxPerDay)
	}

	// Validate address format (basic)
	if err := validateWalletAddress(req.Network, req.Address); err != nil {
		return nil, err
	}

	// Create withdrawal in a transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Re-check balance with lock
	var currentBalance float64
	err = tx.QueryRow(ctx, `SELECT honey_balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&currentBalance)
	if err != nil || currentBalance < req.Amount {
		return nil, fmt.Errorf("insufficient balance")
	}

	// Deduct from balance
	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = honey_balance - $1, updated_at = NOW() WHERE id = $2`,
		req.Amount, userID)
	if err != nil {
		return nil, err
	}

	w := &models.Withdrawal{
		ID:          uuid.New(),
		UserID:      userID,
		Address:     req.Address,
		Network:     req.Network,
		Amount:      usdtAmount,
		HoneyAmount: req.Amount,
		Fee:         0,
		Status:      models.WithdrawalStatusPending,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO withdrawals (id, user_id, address, network, amount, honey_amount, fee, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
		w.ID, w.UserID, w.Address, w.Network, w.Amount, w.HoneyAmount, w.Fee, w.Status)
	if err != nil {
		return nil, err
	}

	// Record ledger transaction
	idempKey := fmt.Sprintf("withdrawal_%s", w.ID)
	refType := "withdrawal"
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'withdrawal', $3, 'HONEY', $4, $5, $6, 'Cash Out request', NOW())
		 ON CONFLICT (idempotency_key) DO NOTHING`,
		uuid.New(), userID, -req.Amount, w.ID, refType, idempKey)
	if err != nil {
		return nil, err
	}

	return w, tx.Commit(ctx)
}

// Reinvest converts Honey to BP at configured rate
func (s *WithdrawalService) Reinvest(ctx context.Context, userID uuid.UUID, honeyAmount float64) (float64, error) {

	bpGained := honeyAmount * 50.0 // 20 USDT = 1000 GHS
	if bpGained <= 0 {
		return 0, fmt.Errorf("insufficient honey amount")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var balance float64
	err = tx.QueryRow(ctx, `SELECT honey_balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&balance)
	if err != nil || balance < honeyAmount {
		return 0, fmt.Errorf("insufficient honey balance")
	}

	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = honey_balance - $1, bp = bp + $2, updated_at = NOW() WHERE id = $3`,
		honeyAmount, bpGained, userID)
	if err != nil {
		return 0, err
	}

	idempKey := fmt.Sprintf("reinvest_%s_%d", userID, time.Now().UnixNano())
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'reinvest', $3, 'HONEY', $4, 'Reinvest Honey to BP', NOW())
		 ON CONFLICT (idempotency_key) DO NOTHING`,
		uuid.New(), userID, -honeyAmount, idempKey)
	if err != nil {
		return 0, err
	}

	return bpGained, tx.Commit(ctx)
}

// GetUserWithdrawals returns paginated withdrawals for a user
func (s *WithdrawalService) GetUserWithdrawals(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Withdrawal, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, user_id, address, network, amount, honey_amount, fee, status, tx_hash, reason, created_at, updated_at
		 FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var withdrawals []models.Withdrawal
	for rows.Next() {
		var w models.Withdrawal
		if err := rows.Scan(&w.ID, &w.UserID, &w.Address, &w.Network, &w.Amount, &w.HoneyAmount, &w.Fee, &w.Status, &w.TxHash, &w.Reason, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		withdrawals = append(withdrawals, w)
	}
	return withdrawals, nil
}

func validateWalletAddress(network, address string) error {
	address = strings.TrimSpace(address)
	if len(address) < 10 {
		return fmt.Errorf("invalid wallet address")
	}
	switch network {
	case "USDT_TRC20":
		if !strings.HasPrefix(address, "T") || len(address) != 34 {
			return fmt.Errorf("invalid TRC20 address (must start with T and be 34 characters)")
		}
	case "USDT_ERC20":
		if !strings.HasPrefix(address, "0x") || len(address) != 42 {
			return fmt.Errorf("invalid ERC20 address (must start with 0x and be 42 characters)")
		}
	case "TON":
		if len(address) < 48 {
			return fmt.Errorf("invalid TON address")
		}
	}
	return nil
}
