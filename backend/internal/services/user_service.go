package services

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

type SettingsService struct {
	db *pgxpool.Pool
}

func NewSettingsService(db *pgxpool.Pool) *SettingsService {
	return &SettingsService{db: db}
}

func (s *SettingsService) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := s.db.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&value)
	if err != nil {
		return "", err
	}
	return value, nil
}

func (s *SettingsService) GetFloat(ctx context.Context, key string, defaultVal float64) float64 {
	v, err := s.Get(ctx, key)
	if err != nil {
		return defaultVal
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return defaultVal
	}
	return f
}

func (s *SettingsService) GetInt(ctx context.Context, key string, defaultVal int) int {
	v, err := s.Get(ctx, key)
	if err != nil {
		return defaultVal
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return i
}

func (s *SettingsService) GetBool(ctx context.Context, key string, defaultVal bool) bool {
	v, err := s.Get(ctx, key)
	if err != nil {
		return defaultVal
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return defaultVal
	}
	return b
}

func (s *SettingsService) Set(ctx context.Context, key, value string) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
		 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
		key, value)
	return err
}

func (s *SettingsService) GetAll(ctx context.Context) ([]models.Setting, error) {
	rows, err := s.db.Query(ctx, `SELECT key, value, description, updated_at FROM settings ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []models.Setting
	for rows.Next() {
		var s models.Setting
		if err := rows.Scan(&s.Key, &s.Value, &s.Description, &s.UpdatedAt); err != nil {
			return nil, err
		}
		settings = append(settings, s)
	}
	return settings, nil
}

// ============================================================
// USER SERVICE
// ============================================================

type UserService struct {
	db       *pgxpool.Pool
	settings *SettingsService
}

func NewUserService(db *pgxpool.Pool, settings *SettingsService) *UserService {
	return &UserService{db: db, settings: settings}
}

// GetOrCreate finds or creates a user from Telegram auth data
func (s *UserService) GetOrCreate(ctx context.Context, telegramID int64, username, firstName, language string, referrerTelegramID *int64) (*models.User, bool, error) {
	// Try to find existing user
	user, err := s.GetByTelegramID(ctx, telegramID)
	if err == nil {
		return user, false, nil
	}
	if err != pgx.ErrNoRows {
		return nil, false, fmt.Errorf("error looking up user: %w", err)
	}

	// Create new user
	baseBP := s.settings.GetFloat(ctx, "base_bp", 1.0)
	welcomeBonus := s.settings.GetFloat(ctx, "welcome_bonus_bp", 2.0)

	bp := baseBP
	var referrerID *uuid.UUID

	// Resolve referrer
	if referrerTelegramID != nil && *referrerTelegramID != telegramID {
		referrer, err := s.GetByTelegramID(ctx, *referrerTelegramID)
		if err == nil {
			referrerID = &referrer.ID
			bp += welcomeBonus
		}
	}

	newUser := &models.User{
		ID:            uuid.New(),
		TelegramID:    telegramID,
		Username:      username,
		FirstName:     firstName,
		Language:      language,
		ReferrerID:    referrerID,
		BP:            bp,
		HoneyBalance:  0,
		LastCollectAt: time.Now(),
		Status:        models.UserStatusActive,
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`INSERT INTO users (id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance, last_collect_at, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
		newUser.ID, newUser.TelegramID, newUser.Username, newUser.FirstName,
		newUser.Language, newUser.ReferrerID, newUser.BP, newUser.HoneyBalance,
		newUser.LastCollectAt, newUser.Status)
	if err != nil {
		return nil, false, fmt.Errorf("failed to create user: %w", err)
	}

	// Create referral chain (up to 3 levels)
	if referrerID != nil {
		if err := s.createReferralChain(ctx, tx, newUser.ID, *referrerID); err != nil {
			return nil, false, fmt.Errorf("failed to create referral chain: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}

	return newUser, true, nil
}

func (s *UserService) createReferralChain(ctx context.Context, tx pgx.Tx, newUserID, directReferrerID uuid.UUID) error {
	// Level 1: direct referrer
	_, err := tx.Exec(ctx,
		`INSERT INTO referrals (id, referrer_id, referred_id, level, status, created_at)
		 VALUES ($1, $2, $3, 1, 'pending', NOW())
		 ON CONFLICT (referred_id) DO NOTHING`,
		uuid.New(), directReferrerID, newUserID)
	if err != nil {
		return err
	}

	// Level 2: referrer's referrer
	var l2ReferrerID *uuid.UUID
	err = tx.QueryRow(ctx, `SELECT referrer_id FROM users WHERE id = $1`, directReferrerID).Scan(&l2ReferrerID)
	if err != nil || l2ReferrerID == nil {
		return nil
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO referrals (id, referrer_id, referred_id, level, status, created_at)
		 VALUES ($1, $2, $3, 2, 'pending', NOW())
		 ON CONFLICT DO NOTHING`,
		uuid.New(), *l2ReferrerID, newUserID)
	if err != nil {
		return err
	}

	// Level 3: level 2 referrer's referrer
	var l3ReferrerID *uuid.UUID
	err = tx.QueryRow(ctx, `SELECT referrer_id FROM users WHERE id = $1`, *l2ReferrerID).Scan(&l3ReferrerID)
	if err != nil || l3ReferrerID == nil {
		return nil
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO referrals (id, referrer_id, referred_id, level, status, created_at)
		 VALUES ($1, $2, $3, 3, 'pending', NOW())
		 ON CONFLICT DO NOTHING`,
		uuid.New(), *l3ReferrerID, newUserID)
	return err
}

func (s *UserService) GetByTelegramID(ctx context.Context, telegramID int64) (*models.User, error) {
	var u models.User
	err := s.db.QueryRow(ctx,
		`SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance,
		        last_collect_at, streak_count, last_checkin_at, status, has_collected,
		        has_completed_mission, last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
		 FROM users WHERE telegram_id = $1`, telegramID).
		Scan(&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	err := s.db.QueryRow(ctx,
		`SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance,
		        last_collect_at, streak_count, last_checkin_at, status, has_collected,
		        has_completed_mission, last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
		 FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ComputeHiveStatus calculates current pending honey (server-side only)
func (s *UserService) ComputeHiveStatus(ctx context.Context, user *models.User) models.HiveStatus {
	capHours := s.settings.GetFloat(ctx, "hive_cap_hours", 8.0)
	honeyPerBPPerHour := s.settings.GetFloat(ctx, "honey_per_bp_per_hour", 0.001)

	now := time.Now()
	elapsed := now.Sub(user.LastCollectAt).Seconds()
	capSeconds := capHours * 3600

	isFull := elapsed >= capSeconds
	if isFull {
		elapsed = capSeconds
	}

	// Zentorno rate: 0.9000 USDT per day per 1,000 GHS => 0.0009 / 86400 per GHS per second
	earningPerSecond := (user.BP * 0.0009) / 86400.0
	pendingHoney := earningPerSecond * elapsed

	var capReachedAt *time.Time
	if isFull {
		t := user.LastCollectAt.Add(time.Duration(capSeconds) * time.Second)
		capReachedAt = &t
	}

	return models.HiveStatus{
		PendingHoney:        math.Round(pendingHoney*1e8) / 1e8,
		EarningRate:         earningPerSecond,
		CapReachedAt:        capReachedAt,
		IsFull:              isFull,
		CapHours:            capHours,
		SecondsSinceCollect: elapsed,
	}
}

// CollectHoney moves pending hive into honey balance
func (s *UserService) CollectHoney(ctx context.Context, userID uuid.UUID, idempotencyKey string) (*models.User, float64, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)

	// Check idempotency
	var existingTx string
	err = tx.QueryRow(ctx, `SELECT id FROM transactions WHERE idempotency_key = $1`, idempotencyKey).Scan(&existingTx)
	if err == nil {
		// Already processed
		tx.Rollback(ctx)
		user, err := s.GetByID(ctx, userID)
		return user, 0, err
	}

	// Lock user row
	var u models.User
	err = tx.QueryRow(ctx,
		`SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance,
		        last_collect_at, streak_count, last_checkin_at, status, has_collected,
		        has_completed_mission, last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
		 FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, 0, fmt.Errorf("user not found: %w", err)
	}

	if u.Status == models.UserStatusBanned {
		return nil, 0, fmt.Errorf("account is banned")
	}

	// Compute pending honey
	capHours := s.settings.GetFloat(ctx, "hive_cap_hours", 8.0)
	honeyPerBPPerHour := s.settings.GetFloat(ctx, "honey_per_bp_per_hour", 0.001)

	now := time.Now()
	elapsed := now.Sub(u.LastCollectAt).Seconds()
	capSeconds := capHours * 3600
	if elapsed > capSeconds {
		elapsed = capSeconds
	}

	earningPerSecond := (u.BP * honeyPerBPPerHour) / 3600.0
	pendingHoney := math.Round(earningPerSecond*elapsed*1e8) / 1e8

	if pendingHoney <= 0 {
		tx.Rollback(ctx)
		user, _ := s.GetByID(ctx, userID)
		return user, 0, nil
	}

	newBalance := u.HoneyBalance + pendingHoney

	// Update user
	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = $1, last_collect_at = $2, has_collected = true, updated_at = NOW()
		 WHERE id = $3`,
		newBalance, now, userID)
	if err != nil {
		return nil, 0, err
	}

	// Record transaction
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		 VALUES ($1, $2, $3, $4, 'HONEY', $5, 'Collect Honey from Hive', NOW())`,
		uuid.New(), userID, models.TxTypeCollect, pendingHoney, idempotencyKey)
	if err != nil {
		return nil, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, 0, err
	}

	// Check if referral should be activated
	u.HoneyBalance = newBalance
	u.LastCollectAt = now
	u.HasCollected = true

	return &u, pendingHoney, nil
}

// DailyCheckin handles the daily check-in streak
func (s *UserService) DailyCheckin(ctx context.Context, userID uuid.UUID) (float64, int, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var u models.User
	err = tx.QueryRow(ctx,
		`SELECT id, streak_count, last_checkin_at, bp, status FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&u.ID, &u.StreakCount, &u.LastCheckinAt, &u.BP, &u.Status)
	if err != nil {
		return 0, 0, err
	}

	now := time.Now()
	today := now.Truncate(24 * time.Hour)

	// Already checked in today
	if u.LastCheckinAt != nil && u.LastCheckinAt.Truncate(24*time.Hour).Equal(today) {
		return 0, u.StreakCount, fmt.Errorf("already checked in today")
	}

	// Check if streak is maintained (last checkin was yesterday)
	newStreak := 1
	if u.LastCheckinAt != nil {
		yesterday := today.Add(-24 * time.Hour)
		if u.LastCheckinAt.Truncate(24 * time.Hour).Equal(yesterday) {
			newStreak = u.StreakCount + 1
			if newStreak > 7 {
				newStreak = 1 // Reset after day 7
			}
		}
	}

	// Get reward for this streak day
	rewardsStr := s.settings.GetBoolStr(ctx, "checkin_streak_rewards", "1,2,3,5,7,10,15")
	rewards := parseCheckinRewards(rewardsStr)
	rewardIdx := newStreak - 1
	if rewardIdx >= len(rewards) {
		rewardIdx = len(rewards) - 1
	}
	rewardBP := rewards[rewardIdx]

	// Update user
	_, err = tx.Exec(ctx,
		`UPDATE users SET streak_count = $1, last_checkin_at = $2, bp = bp + $3, updated_at = NOW()
		 WHERE id = $4`,
		newStreak, now, rewardBP, userID)
	if err != nil {
		return 0, 0, err
	}

	// Record transaction
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, $3, $4, 'BP', 'Daily check-in streak bonus', NOW())`,
		uuid.New(), userID, models.TxTypeCheckinReward, rewardBP)
	if err != nil {
		return 0, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}

	return rewardBP, newStreak, nil
}

func (s *SettingsService) GetBoolStr(ctx context.Context, key, defaultVal string) string {
	v, err := s.Get(ctx, key)
	if err != nil {
		return defaultVal
	}
	return v
}

func parseCheckinRewards(s string) []float64 {
	parts := strings.Split(s, ",")
	rewards := make([]float64, 0, len(parts))
	for _, p := range parts {
		f, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err == nil {
			rewards = append(rewards, f)
		}
	}
	if len(rewards) == 0 {
		return []float64{1, 2, 3, 5, 7, 10, 15}
	}
	return rewards
}

// GetUserProfile builds a full profile with live hive status
func (s *UserService) GetUserProfile(ctx context.Context, user *models.User) *models.UserProfile {
	hive := s.ComputeHiveStatus(ctx, user)
	return &models.UserProfile{
		ID:           user.ID,
		TelegramID:   user.TelegramID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		BP:           user.BP,
		HoneyBalance: user.HoneyBalance,
		Hive:         hive,
		StreakCount:  user.StreakCount,
		CreatedAt:    user.CreatedAt,
	}
}

// GetTransactionHistory returns paginated transaction history for a user
func (s *UserService) GetTransactionHistory(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Transaction, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at
		 FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Currency, &t.RefID, &t.RefType, &t.IdempotencyKey, &t.Description, &t.CreatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, t)
	}
	return txs, nil
}

// AdminGetUsers returns paginated users for admin panel
func (s *UserService) AdminGetUsers(ctx context.Context, search string, status string, limit, offset int) ([]models.User, int, error) {
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		whereClause += fmt.Sprintf(" AND (username ILIKE $%d OR first_name ILIKE $%d OR CAST(telegram_id AS TEXT) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int
	err := s.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause), args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := s.db.Query(ctx,
		fmt.Sprintf(`SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance,
		        last_collect_at, streak_count, last_checkin_at, status, has_collected,
		        has_completed_mission, last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
		 FROM users %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}
