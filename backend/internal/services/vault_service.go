package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

// VaultService handles all operations for the Vault Heist, Safecrackers, Energy and Syndicate.
type VaultService struct {
	db       *pgxpool.Pool
	settings *SettingsService
}

func NewVaultService(db *pgxpool.Pool, settings *SettingsService) *VaultService {
	return &VaultService{
		db:       db,
		settings: settings,
	}
}

// Crew catalog definitions matching Henfinity mechanics
var StandardCrewCatalog = []models.CrewCatalogItem{
	{
		ID:            "lockpick_rookie",
		Name:          "Lockpick Rookie",
		DailyGoldRate: 5000,
		DailyUSD:      0.05,
		CostUSD:       0.50,
		RoiDailyPct:   "10%/day",
		Badge:         "10%/day",
		Icon:          "🥷",
	},
	{
		ID:            "drill_specialist",
		Name:          "Drill Specialist",
		DailyGoldRate: 10000,
		DailyUSD:      0.10,
		CostUSD:       1.00,
		RoiDailyPct:   "10%/day",
		Badge:         "10%/day",
		Icon:          "🤖",
	},
	{
		ID:            "cyber_infiltrator",
		Name:          "Cyber Infiltrator",
		DailyGoldRate: 27500,
		DailyUSD:      0.275,
		CostUSD:       2.50,
		RoiDailyPct:   "11%/day",
		Badge:         "11%/day",
		Icon:          "⚡",
	},
	{
		ID:            "master_vault_boss",
		Name:          "Master Vault Boss",
		DailyGoldRate: 60000,
		DailyUSD:      0.60,
		CostUSD:       5.00,
		RoiDailyPct:   "12%/day",
		Badge:         "🔥 12%/day",
		Icon:          "👑",
	},
}

// Battery packs catalog definitions matching Henfinity mechanics
var StandardEnergyPacks = []models.EnergyPack{
	{
		ID:            "battery_pack",
		Name:          "Battery Pack",
		EnergyKWh:     50000,
		CostUSD:       0.10,
		DurationLabel: "Feeds crew for 3d 8h",
		Badge:         "",
	},
	{
		ID:            "plasma_cell",
		Name:          "Plasma Cell",
		EnergyKWh:     300000,
		CostUSD:       0.50,
		DurationLabel: "Feeds crew for 20d 0h",
		Badge:         "",
	},
	{
		ID:            "nuclear_reactor",
		Name:          "Nuclear Micro-Reactor",
		EnergyKWh:     2000000,
		CostUSD:       3.00,
		DurationLabel: "Feeds crew for 133d 8h",
		Badge:         "BEST VALUE",
	},
}

// 7-day streak battery supply rewards
var DailyBatteryRewards = []float64{2000, 3000, 4000, 5000, 6000, 8000, 12000}

// EnsureSchema initializes all tables and columns needed for Vault Heist
func (s *VaultService) EnsureSchema(ctx context.Context) error {
	queries := []string{
		// 1. Add vault-specific columns to users
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS energy_kwh DOUBLE PRECISION DEFAULT 50000;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS gold_stash DOUBLE PRECISION DEFAULT 0;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS friends_purse DOUBLE PRECISION DEFAULT 0;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_energy_calc_at TIMESTAMPTZ DEFAULT NOW();`,

		// 2. User crews table (owned workers)
		`CREATE TABLE IF NOT EXISTS user_crew (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			crew_type VARCHAR(64) NOT NULL,
			name VARCHAR(128) NOT NULL,
			count INT NOT NULL DEFAULT 1,
			daily_gold_rate DOUBLE PRECISION NOT NULL,
			cost_usd DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT user_crew_unique_type UNIQUE(user_id, crew_type)
		);`,

		// 3. Syndicate affiliate earnings table
		`CREATE TABLE IF NOT EXISTS syndicate_earnings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			source_type VARCHAR(32) NOT NULL,
			source_item VARCHAR(64) NOT NULL,
			amount_usd DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_syndicate_referrer ON syndicate_earnings(referrer_id, created_at DESC);`,
	}

	for _, q := range queries {
		if _, err := s.db.Exec(ctx, q); err != nil {
			return fmt.Errorf("failed executing vault schema query: %w", err)
		}
	}
	return nil
}

// EnsureDefaultCrew ensures the user has at least 1 free starter worker (Lockpick Rookie)
func (s *VaultService) EnsureDefaultCrew(ctx context.Context, userID uuid.UUID) error {
	var count int
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM user_crew WHERE user_id = $1`, userID).Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		_, err = s.db.Exec(ctx, `
			INSERT INTO user_crew (id, user_id, crew_type, name, count, daily_gold_rate, cost_usd, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, 'lockpick_rookie', 'Lockpick Rookie', 1, 5000, 0.50, NOW(), NOW())
			ON CONFLICT (user_id, crew_type) DO NOTHING
		`, userID)
		if err != nil {
			return err
		}
	}
	return nil
}

// GetVaultStatus calculates accrued gold, decrements energy, and returns live heist metrics
func (s *VaultService) GetVaultStatus(ctx context.Context, userID uuid.UUID) (*models.VaultStatus, error) {
	_ = s.EnsureDefaultCrew(ctx, userID)

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var energyKWh, goldStash float64
	var lastEnergyCalcAt *time.Time
	var streakCount int
	var lastCheckinAt *time.Time

	err = tx.QueryRow(ctx, `
		SELECT COALESCE(energy_kwh, 50000), COALESCE(gold_stash, 0), last_energy_calc_at,
		       streak_count, last_checkin_at
		FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&energyKWh, &goldStash, &lastEnergyCalcAt, &streakCount, &lastCheckinAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	now := time.Now()
	if lastEnergyCalcAt == nil {
		t := now
		lastEnergyCalcAt = &t
	}

	// Fetch all owned crew
	rows, err := tx.Query(ctx, `
		SELECT id, user_id, crew_type, name, count, daily_gold_rate, cost_usd, created_at, updated_at
		FROM user_crew WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var crews []models.UserCrew
	var totalDailyGoldRate float64
	totalActiveWorkers := 0

	for rows.Next() {
		var c models.UserCrew
		if err := rows.Scan(&c.ID, &c.UserID, &c.CrewType, &c.Name, &c.Count, &c.DailyGoldRate, &c.CostUSD, &c.CreatedAt, &c.UpdatedAt); err == nil {
			crews = append(crews, c)
			totalDailyGoldRate += c.DailyGoldRate * float64(c.Count)
			totalActiveWorkers += c.Count
		}
	}

	// 50,000 kWh lasts 80h (3d 8h) = 625 kWh/hr = ~0.173611 kWh/sec
	const energyBurnRatePerSec = 50000.0 / (80.0 * 3600.0) // 0.173611 kWh/s
	elapsedSeconds := now.Sub(*lastEnergyCalcAt).Seconds()
	if elapsedSeconds < 0 {
		elapsedSeconds = 0
	}

	// Calculate energy consumed & gold mined
	var goldPerSec float64 = 0
	if totalDailyGoldRate > 0 {
		goldPerSec = totalDailyGoldRate / 86400.0
	}

	var goldEarned float64 = 0
	isDepleted := energyKWh <= 0

	if !isDepleted && elapsedSeconds > 0 && totalActiveWorkers > 0 {
		energyNeeded := elapsedSeconds * energyBurnRatePerSec
		if energyKWh >= energyNeeded {
			energyKWh -= energyNeeded
			goldEarned = elapsedSeconds * goldPerSec
		} else {
			// Energy ran out during this window
			activeSeconds := energyKWh / energyBurnRatePerSec
			goldEarned = activeSeconds * goldPerSec
			energyKWh = 0
			isDepleted = true
		}
	}

	goldStash += goldEarned

	// Update user record with updated energy and gold
	_, err = tx.Exec(ctx, `
		UPDATE users
		SET energy_kwh = $1, gold_stash = $2, last_energy_calc_at = $3, updated_at = NOW()
		WHERE id = $4
	`, energyKWh, goldStash, now, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Calculate remaining energy duration
	var remainingHours float64 = 0
	if energyBurnRatePerSec > 0 && energyKWh > 0 {
		remainingHours = (energyKWh / energyBurnRatePerSec) / 3600.0
	}

	// Check streak status
	today := now.Truncate(24 * time.Hour)
	streakClaimedToday := false
	if lastCheckinAt != nil && lastCheckinAt.Truncate(24*time.Hour).Equal(today) {
		streakClaimedToday = true
	}

	// Build catalog with user owned counts
	catalog := make([]models.CrewCatalogItem, len(StandardCrewCatalog))
	copy(catalog, StandardCrewCatalog)
	for i := range catalog {
		for _, c := range crews {
			if c.CrewType == catalog[i].ID {
				catalog[i].OwnedCount = c.Count
				break
			}
		}
	}

	status := &models.VaultStatus{
		GoldStash:           math.Round(goldStash),
		GoldUSD:             math.Round((goldStash*0.00001)*10000) / 10000, // 100,000 Gold = $1 USD
		GoldPerSecond:       math.Round(goldPerSec*100) / 100,
		DailyGoldTotal:      totalDailyGoldRate,
		DailyUSDTotal:       totalDailyGoldRate * 0.00001,
		EnergyKWh:           math.Round(energyKWh),
		EnergyDurationHours: math.Round(remainingHours*10) / 10,
		IsEnergyDepleted:    isDepleted,
		ActiveCrewCount:     totalActiveWorkers,
		Crew:                crews,
		CrewCatalog:         catalog,
		EnergyPacks:         StandardEnergyPacks,
		StreakDay:           streakCount,
		StreakClaimedToday:  streakClaimedToday,
		StreakRewards:       DailyBatteryRewards,
	}

	return status, nil
}

// SmeltGold converts all accumulated gold into USD balance (100,000 Gold = $1.00 USD)
func (s *VaultService) SmeltGold(ctx context.Context, userID uuid.UUID) (float64, float64, float64, error) {
	// 1. Refresh live status so any seconds since last call are accrued
	_, err := s.GetVaultStatus(ctx, userID)
	if err != nil {
		return 0, 0, 0, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, 0, err
	}
	defer tx.Rollback(ctx)

	var goldStash, honeyBalance float64
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(gold_stash, 0), honey_balance
		FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&goldStash, &honeyBalance)
	if err != nil {
		return 0, 0, 0, err
	}

	if goldStash < 1 {
		return 0, 0, honeyBalance, fmt.Errorf("no gold available to smelt")
	}

	// 100,000 Gold = $1.00 USD
	usdCredited := goldStash * 0.00001
	newBalance := honeyBalance + usdCredited

	// Reset gold stash to 0 and credit honey_balance
	_, err = tx.Exec(ctx, `
		UPDATE users
		SET gold_stash = 0, honey_balance = $1, last_collect_at = NOW(), has_collected = true, updated_at = NOW()
		WHERE id = $2
	`, newBalance, userID)
	if err != nil {
		return 0, 0, 0, err
	}

	// Log transaction
	idempKey := fmt.Sprintf("smelt_%s_%d", userID, time.Now().UnixNano())
	desc := fmt.Sprintf("Smelted %d Gold Bars into +$%.4f USD", int(goldStash), usdCredited)
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, 'USD', $4, $5, NOW())
	`, userID, models.TxTypeCollect, usdCredited, idempKey, desc)
	if err != nil {
		return 0, 0, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, 0, err
	}

	return goldStash, usdCredited, newBalance, nil
}

// BuyCrew purchases a Safecracker worker and pays 10% cut + $0.02 first-hire bounty to referrer
func (s *VaultService) BuyCrew(ctx context.Context, userID uuid.UUID, crewType string) (*models.UserCrew, float64, error) {
	// Find item in catalog
	var selected *models.CrewCatalogItem
	for _, item := range StandardCrewCatalog {
		if item.ID == crewType {
			selected = &item
			break
		}
	}
	if selected == nil {
		return nil, 0, fmt.Errorf("invalid crew type: %s", crewType)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)

	var honeyBalance float64
	var referrerID *uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT honey_balance, referrer_id FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&honeyBalance, &referrerID)
	if err != nil {
		return nil, 0, fmt.Errorf("user not found: %w", err)
	}

	if honeyBalance < selected.CostUSD {
		return nil, honeyBalance, fmt.Errorf("insufficient balance: requires $%.2f, current balance $%.4f", selected.CostUSD, honeyBalance)
	}

	newBalance := honeyBalance - selected.CostUSD

	// Deduct balance
	_, err = tx.Exec(ctx, `
		UPDATE users SET honey_balance = $1, updated_at = NOW() WHERE id = $2
	`, newBalance, userID)
	if err != nil {
		return nil, 0, err
	}

	// Insert or increment crew
	var crew models.UserCrew
	err = tx.QueryRow(ctx, `
		INSERT INTO user_crew (id, user_id, crew_type, name, count, daily_gold_rate, cost_usd, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, 1, $4, $5, NOW(), NOW())
		ON CONFLICT (user_id, crew_type) DO UPDATE
		SET count = user_crew.count + 1, updated_at = NOW()
		RETURNING id, user_id, crew_type, name, count, daily_gold_rate, cost_usd, created_at, updated_at
	`, userID, selected.ID, selected.Name, selected.DailyGoldRate, selected.CostUSD).
		Scan(&crew.ID, &crew.UserID, &crew.CrewType, &crew.Name, &crew.Count, &crew.DailyGoldRate, &crew.CostUSD, &crew.CreatedAt, &crew.UpdatedAt)
	if err != nil {
		return nil, 0, err
	}

	// Record transaction
	idempKey := fmt.Sprintf("crew_buy_%s_%d", userID, time.Now().UnixNano())
	desc := fmt.Sprintf("Hired %s ($%.2f)", selected.Name, selected.CostUSD)
	_, _ = tx.Exec(ctx, `
		INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		VALUES (gen_random_uuid(), $1, 'crew_purchase', $2, 'USD', $3, $4, NOW())
	`, userID, selected.CostUSD, idempKey, desc)

	// Check if this was the user's first crew purchase
	var totalCrewPurchases int
	_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'crew_purchase'`, userID).Scan(&totalCrewPurchases)

	// Process Referrer Cuts (10% of crew purchase + $0.02 first hire bounty)
	if referrerID != nil {
		refCutUSD := selected.CostUSD * 0.10 // 10%
		isFirstHire := (totalCrewPurchases <= 1)
		bountyUSD := 0.0
		if isFirstHire {
			bountyUSD = 0.02 // $0.02 when they buy their first worker
		}
		totalBonus := refCutUSD + bountyUSD

		// Credit to referrer's friends_purse
		_, _ = tx.Exec(ctx, `
			UPDATE users SET friends_purse = COALESCE(friends_purse, 0) + $1, updated_at = NOW() WHERE id = $2
		`, totalBonus, *referrerID)

		// Record in syndicate_earnings
		_, _ = tx.Exec(ctx, `
			INSERT INTO syndicate_earnings (id, referrer_id, buyer_id, source_type, source_item, amount_usd, created_at)
			VALUES (gen_random_uuid(), $1, $2, 'crew', $3, $4, NOW())
		`, *referrerID, userID, selected.Name, refCutUSD)

		if bountyUSD > 0 {
			_, _ = tx.Exec(ctx, `
				INSERT INTO syndicate_earnings (id, referrer_id, buyer_id, source_type, source_item, amount_usd, created_at)
				VALUES (gen_random_uuid(), $1, $2, 'bounty', 'First Hire Bounty', $3, NOW())
			`, *referrerID, userID, bountyUSD)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, 0, err
	}

	return &crew, newBalance, nil
}

// BuyEnergy purchases a battery power pack and pays 10% cut to referrer
func (s *VaultService) BuyEnergy(ctx context.Context, userID uuid.UUID, packID string) (float64, float64, error) {
	var selected *models.EnergyPack
	for _, item := range StandardEnergyPacks {
		if item.ID == packID {
			selected = &item
			break
		}
	}
	if selected == nil {
		return 0, 0, fmt.Errorf("invalid battery pack: %s", packID)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var honeyBalance, energyKWh float64
	var referrerID *uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT honey_balance, COALESCE(energy_kwh, 0), referrer_id FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&honeyBalance, &energyKWh, &referrerID)
	if err != nil {
		return 0, 0, fmt.Errorf("user not found: %w", err)
	}

	if honeyBalance < selected.CostUSD {
		return 0, honeyBalance, fmt.Errorf("insufficient balance: requires $%.2f, current balance $%.4f", selected.CostUSD, honeyBalance)
	}

	newBalance := honeyBalance - selected.CostUSD
	newEnergy := energyKWh + selected.EnergyKWh

	// Deduct balance and add energy
	_, err = tx.Exec(ctx, `
		UPDATE users SET honey_balance = $1, energy_kwh = $2, updated_at = NOW() WHERE id = $3
	`, newBalance, newEnergy, userID)
	if err != nil {
		return 0, 0, err
	}

	// Record transaction
	idempKey := fmt.Sprintf("energy_buy_%s_%d", userID, time.Now().UnixNano())
	desc := fmt.Sprintf("Purchased %s (+%d kWh)", selected.Name, int(selected.EnergyKWh))
	_, _ = tx.Exec(ctx, `
		INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		VALUES (gen_random_uuid(), $1, 'energy_purchase', $2, 'USD', $3, $4, NOW())
	`, userID, selected.CostUSD, idempKey, desc)

	// Process 10% cut to referrer
	if referrerID != nil {
		refCutUSD := selected.CostUSD * 0.10 // 10%
		_, _ = tx.Exec(ctx, `
			UPDATE users SET friends_purse = COALESCE(friends_purse, 0) + $1, updated_at = NOW() WHERE id = $2
		`, refCutUSD, *referrerID)

		_, _ = tx.Exec(ctx, `
			INSERT INTO syndicate_earnings (id, referrer_id, buyer_id, source_type, source_item, amount_usd, created_at)
			VALUES (gen_random_uuid(), $1, $2, 'energy', $3, $4, NOW())
		`, *referrerID, userID, selected.Name, refCutUSD)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}

	return newEnergy, newBalance, nil
}

// GetSyndicate returns the user's referral link, total friends, purse, and earnings breakdown
func (s *VaultService) GetSyndicate(ctx context.Context, userID uuid.UUID, botUsername string) (*models.SyndicateResponse, error) {
	var telegramID int64
	var friendsPurse float64

	err := s.db.QueryRow(ctx, `
		SELECT telegram_id, COALESCE(friends_purse, 0) FROM users WHERE id = $1
	`, userID).Scan(&telegramID, &friendsPurse)
	if err != nil {
		return nil, err
	}

	var friendsCount int
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM users WHERE referrer_id = $1
	`, userID).Scan(&friendsCount)

	var totalEarnedUSD float64
	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_usd), 0) FROM syndicate_earnings WHERE referrer_id = $1
	`, userID).Scan(&totalEarnedUSD)

	rows, err := s.db.Query(ctx, `
		SELECT se.id, se.referrer_id, se.buyer_id, se.source_type, se.source_item, se.amount_usd, se.created_at,
		       COALESCE(u.username, u.first_name, 'Crew Member') AS buyer_username
		FROM syndicate_earnings se
		JOIN users u ON u.id = se.buyer_id
		WHERE se.referrer_id = $1
		ORDER BY se.created_at DESC
		LIMIT 20
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []models.SyndicateEarning
	for rows.Next() {
		var a models.SyndicateEarning
		if err := rows.Scan(&a.ID, &a.ReferrerID, &a.BuyerID, &a.SourceType, &a.SourceItem, &a.AmountUSD, &a.CreatedAt, &a.BuyerUsername); err == nil {
			activities = append(activities, a)
		}
	}

	inviteLink := fmt.Sprintf("https://t.me/%s?start=%d", botUsername, telegramID)

	return &models.SyndicateResponse{
		InviteLink:       inviteLink,
		FriendsCount:     friendsCount,
		FriendsPurseUSD:  friendsPurse,
		TotalEarnedUSD:   totalEarnedUSD,
		RecentActivities: activities,
	}, nil
}

// ClaimSyndicatePurse transfers friends_purse to the main withdrawable balance
func (s *VaultService) ClaimSyndicatePurse(ctx context.Context, userID uuid.UUID) (float64, float64, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var friendsPurse, honeyBalance float64
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(friends_purse, 0), honey_balance FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&friendsPurse, &honeyBalance)
	if err != nil {
		return 0, 0, err
	}

	if friendsPurse <= 0 {
		return 0, honeyBalance, fmt.Errorf("no affiliate loot in purse to collect")
	}

	newBalance := honeyBalance + friendsPurse

	// Reset friends_purse and credit main balance
	_, err = tx.Exec(ctx, `
		UPDATE users SET friends_purse = 0, honey_balance = $1, updated_at = NOW() WHERE id = $2
	`, newBalance, userID)
	if err != nil {
		return 0, 0, err
	}

	// Record transaction
	idempKey := fmt.Sprintf("syndicate_claim_%s_%d", userID, time.Now().UnixNano())
	desc := fmt.Sprintf("Collected $%.4f from Syndicate Friends Purse", friendsPurse)
	_, _ = tx.Exec(ctx, `
		INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		VALUES (gen_random_uuid(), $1, 'referral_reward', $2, 'USD', $3, $4, NOW())
	`, userID, friendsPurse, idempKey, desc)

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}

	return friendsPurse, newBalance, nil
}

// ClaimDailySupply processes the 7-day battery recharge supply drop
func (s *VaultService) ClaimDailySupply(ctx context.Context, userID uuid.UUID) (float64, int, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var streakCount int
	var lastCheckinAt *time.Time
	var energyKWh float64

	err = tx.QueryRow(ctx, `
		SELECT streak_count, last_checkin_at, COALESCE(energy_kwh, 50000)
		FROM users WHERE id = $1 FOR UPDATE
	`, userID).Scan(&streakCount, &lastCheckinAt, &energyKWh)
	if err != nil {
		return 0, 0, err
	}

	now := time.Now()
	today := now.Truncate(24 * time.Hour)

	if lastCheckinAt != nil && lastCheckinAt.Truncate(24*time.Hour).Equal(today) {
		return 0, streakCount, fmt.Errorf("already claimed today's battery supply drop")
	}

	newStreak := 1
	if lastCheckinAt != nil {
		yesterday := today.Add(-24 * time.Hour)
		if lastCheckinAt.Truncate(24 * time.Hour).Equal(yesterday) {
			newStreak = streakCount + 1
			if newStreak > 7 {
				newStreak = 1
			}
		}
	}

	rewardIdx := newStreak - 1
	if rewardIdx >= len(DailyBatteryRewards) {
		rewardIdx = len(DailyBatteryRewards) - 1
	}
	rewardKWh := DailyBatteryRewards[rewardIdx]
	newEnergy := energyKWh + rewardKWh

	_, err = tx.Exec(ctx, `
		UPDATE users SET streak_count = $1, last_checkin_at = $2, energy_kwh = $3, updated_at = NOW() WHERE id = $4
	`, newStreak, now, newEnergy, userID)
	if err != nil {
		return 0, 0, err
	}

	// Record transaction
	idempKey := fmt.Sprintf("daily_supply_%s_%d", userID, time.Now().UnixNano())
	desc := fmt.Sprintf("Day %d Battery Supply Drop (+%d kWh)", newStreak, int(rewardKWh))
	_, _ = tx.Exec(ctx, `
		INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
		VALUES (gen_random_uuid(), $1, 'checkin_reward', $2, 'KWH', $3, $4, NOW())
	`, userID, rewardKWh, idempKey, desc)

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}

	return rewardKWh, newStreak, nil
}

