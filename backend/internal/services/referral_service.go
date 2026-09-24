package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

type ReferralService struct {
	db       *pgxpool.Pool
	settings *SettingsService
}

func NewReferralService(db *pgxpool.Pool, settings *SettingsService) *ReferralService {
	return &ReferralService{db: db, settings: settings}
}

// GetSwarmStats returns referral stats for all 3 levels
func (s *ReferralService) GetSwarmStats(ctx context.Context, userID uuid.UUID) (map[int]SwarmLevelStats, error) {
	rows, err := s.db.Query(ctx,
		`SELECT r.level, r.status, r.reward_paid,
		        u.username, u.first_name, r.created_at, r.activated_at
		 FROM referrals r
		 JOIN users u ON u.id = r.referred_id
		 WHERE r.referrer_id = $1
		 ORDER BY r.level, r.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := map[int]SwarmLevelStats{
		1: {Level: 1, RecentReferrals: []ReferralEntry{}},
		2: {Level: 2, RecentReferrals: []ReferralEntry{}},
		3: {Level: 3, RecentReferrals: []ReferralEntry{}},
	}

	for rows.Next() {
		var level int
		var status string
		var rewardPaid bool
		var username, firstName string
		var createdAt time.Time
		var activatedAt *time.Time

		if err := rows.Scan(&level, &status, &rewardPaid, &username, &firstName, &createdAt, &activatedAt); err != nil {
			return nil, err
		}

		ls := stats[level]
		ls.Total++
		if status == models.ReferralStatusActive {
			ls.Active++
		}

		if len(ls.RecentReferrals) < 10 {
			ls.RecentReferrals = append(ls.RecentReferrals, ReferralEntry{
				Username:    username,
				FirstName:   firstName,
				Status:      status,
				JoinedAt:    createdAt,
				ActivatedAt: activatedAt,
			})
		}
		stats[level] = ls
	}

	// Get rewards earned per level from transactions
	for lvl := 1; lvl <= 3; lvl++ {
		var totalReward float64
		_ = s.db.QueryRow(ctx,
			`SELECT COALESCE(SUM(amount), 0) FROM transactions
			 WHERE user_id = $1 AND type = 'referral_reward' AND ref_type = $2`,
			userID, fmt.Sprintf("referral_l%d", lvl)).Scan(&totalReward)
		ls := stats[lvl]
		ls.TotalRewardBP = totalReward
		ls.RewardPerReferral = s.settings.GetFloat(ctx, fmt.Sprintf("referral_l%d_bp", lvl), float64(6-lvl*2+2))
		stats[lvl] = ls
	}

	return stats, nil
}

type SwarmLevelStats struct {
	Level             int             `json:"level"`
	Total             int             `json:"total"`
	Active            int             `json:"active"`
	TotalRewardBP     float64         `json:"total_reward_bp"`
	RewardPerReferral float64         `json:"reward_per_referral"`
	RecentReferrals   []ReferralEntry `json:"recent_referrals"`
}

type ReferralEntry struct {
	Username    string     `json:"username"`
	FirstName   string     `json:"first_name"`
	Status      string     `json:"status"`
	JoinedAt    time.Time  `json:"joined_at"`
	ActivatedAt *time.Time `json:"activated_at,omitempty"`
}

// TryActivateReferral checks if a referral should be activated and pays rewards
func (s *ReferralService) TryActivateReferral(ctx context.Context, userID uuid.UUID) error {
	requireCollect := s.settings.GetBool(ctx, "referral_qualifying_collect", true)
	requireMission := s.settings.GetBool(ctx, "referral_qualifying_mission", true)

	// Get user's qualification status
	var hasCollected, hasCompletedMission bool
	err := s.db.QueryRow(ctx,
		`SELECT has_collected, has_completed_mission FROM users WHERE id = $1`, userID).
		Scan(&hasCollected, &hasCompletedMission)
	if err != nil {
		return err
	}

	qualified := true
	if requireCollect && !hasCollected {
		qualified = false
	}
	if requireMission && !hasCompletedMission {
		qualified = false
	}

	if !qualified {
		return nil
	}

	// Find pending referrals for this user (across all levels)
	rows, err := s.db.Query(ctx,
		`SELECT id, referrer_id, level FROM referrals
		 WHERE referred_id = $1 AND status = 'pending'`, userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type pendingRef struct {
		ID         uuid.UUID
		ReferrerID uuid.UUID
		Level      int
	}
	var pending []pendingRef
	for rows.Next() {
		var p pendingRef
		if err := rows.Scan(&p.ID, &p.ReferrerID, &p.Level); err != nil {
			return err
		}
		pending = append(pending, p)
	}
	rows.Close()

	for _, ref := range pending {
		rewardKey := fmt.Sprintf("referral_l%d_bp", ref.Level)
		rewardBP := s.settings.GetFloat(ctx, rewardKey, 1.0)

		tx, err := s.db.Begin(ctx)
		if err != nil {
			continue
		}

		now := time.Now()
		// Activate referral
		_, err = tx.Exec(ctx,
			`UPDATE referrals SET status = 'active', activated_at = $1, reward_paid = true
			 WHERE id = $2 AND status = 'pending'`,
			now, ref.ID)
		if err != nil {
			tx.Rollback(ctx)
			continue
		}

		// Award BP to referrer
		_, err = tx.Exec(ctx,
			`UPDATE users SET bp = bp + $1, updated_at = NOW() WHERE id = $2`,
			rewardBP, ref.ReferrerID)
		if err != nil {
			tx.Rollback(ctx)
			continue
		}

		// Record transaction
		idempKey := fmt.Sprintf("referral_reward_%s", ref.ID)
		refType := fmt.Sprintf("referral_l%d", ref.Level)
		_, err = tx.Exec(ctx,
			`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
			 VALUES ($1, $2, 'referral_reward', $3, 'BP', $4, $5, $6, $7, NOW())
			 ON CONFLICT (idempotency_key) DO NOTHING`,
			uuid.New(), ref.ReferrerID, rewardBP, ref.ID, refType, idempKey,
			fmt.Sprintf("Referral Level %d reward", ref.Level))
		if err != nil {
			tx.Rollback(ctx)
			continue
		}

		tx.Commit(ctx)
	}

	return nil
}

// CountActiveReferrals returns the count of active L1 referrals for a user
func (s *ReferralService) CountActiveReferrals(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND level = 1 AND status = 'active'`,
		userID).Scan(&count)
	return count, err
}
