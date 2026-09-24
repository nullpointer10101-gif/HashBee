package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

type MissionService struct {
	db       *pgxpool.Pool
	settings *SettingsService
	referral *ReferralService
}

func NewMissionService(db *pgxpool.Pool, settings *SettingsService, referral *ReferralService) *MissionService {
	return &MissionService{db: db, settings: settings, referral: referral}
}

// ListMissionsForUser returns all active missions with user completion status
func (s *MissionService) ListMissionsForUser(ctx context.Context, userID uuid.UUID) ([]models.Mission, error) {
	rows, err := s.db.Query(ctx,
		`SELECT m.id, m.type, m.target, m.title, m.description, m.reward_bp, m.campaign_id,
		        m.milestone_count, m.sort_order, m.status, m.is_official, m.icon_url, m.created_at, m.updated_at,
		        mc.status as completion_status
		 FROM missions m
		 LEFT JOIN mission_completions mc ON mc.mission_id = m.id AND mc.user_id = $1
		 WHERE m.status = 'active'
		 ORDER BY m.is_official DESC, m.sort_order ASC, m.created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var missions []models.Mission
	for rows.Next() {
		var m models.Mission
		var completionStatus *string
		if err := rows.Scan(
			&m.ID, &m.Type, &m.Target, &m.Title, &m.Description, &m.RewardBP,
			&m.CampaignID, &m.MilestoneCount, &m.SortOrder, &m.Status, &m.IsOfficial,
			&m.IconURL, &m.CreatedAt, &m.UpdatedAt, &completionStatus,
		); err != nil {
			return nil, err
		}
		m.UserStatus = completionStatus

		// For milestone missions, compute progress
		if m.Type == models.MissionTypeMilestone && m.MilestoneCount != nil {
			count, _ := s.referral.CountActiveReferrals(ctx, userID)
			progress := count
			if progress > *m.MilestoneCount {
				progress = *m.MilestoneCount
			}
			m.Progress = &progress
		}

		missions = append(missions, m)
	}
	return missions, nil
}

// StartMission begins a mission for a user (creates pending completion)
func (s *MissionService) StartMission(ctx context.Context, userID, missionID uuid.UUID) (*models.MissionCompletion, error) {
	// Check if mission exists and is active
	var m models.Mission
	err := s.db.QueryRow(ctx,
		`SELECT id, type, target, reward_bp, campaign_id, status FROM missions WHERE id = $1`,
		missionID).Scan(&m.ID, &m.Type, &m.Target, &m.RewardBP, &m.CampaignID, &m.Status)
	if err != nil {
		return nil, fmt.Errorf("mission not found")
	}
	if m.Status != models.MissionStatusActive {
		return nil, fmt.Errorf("mission is not active")
	}

	// Check if already completed/pending
	var existingStatus string
	err = s.db.QueryRow(ctx,
		`SELECT status FROM mission_completions WHERE user_id = $1 AND mission_id = $2`,
		userID, missionID).Scan(&existingStatus)
	if err == nil {
		return nil, fmt.Errorf("mission already started or completed")
	}

	// Generate click token for link/bot missions
	token := ""
	if m.Type == models.MissionTypeLink || m.Type == models.MissionTypeBot {
		b := make([]byte, 16)
		rand.Read(b)
		token = hex.EncodeToString(b)
	}

	completion := &models.MissionCompletion{
		ID:        uuid.New(),
		UserID:    userID,
		MissionID: missionID,
		Status:    models.CompletionStatusPending,
		CreatedAt: time.Now(),
	}
	if token != "" {
		completion.ClickToken = &token
	}

	_, err = s.db.Exec(ctx,
		`INSERT INTO mission_completions (id, user_id, mission_id, status, click_token, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		completion.ID, completion.UserID, completion.MissionID, completion.Status, completion.ClickToken)
	if err != nil {
		return nil, err
	}

	return completion, nil
}

// VerifyMission verifies a mission completion and pays reward
func (s *MissionService) VerifyMission(ctx context.Context, userID, missionID uuid.UUID) (float64, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	// Get mission + completion with lock
	var m models.Mission
	var mc models.MissionCompletion
	err = tx.QueryRow(ctx,
		`SELECT m.id, m.type, m.reward_bp, m.campaign_id, m.status,
		        mc.id, mc.status, mc.created_at
		 FROM missions m
		 JOIN mission_completions mc ON mc.mission_id = m.id
		 WHERE mc.user_id = $1 AND mc.mission_id = $2
		 FOR UPDATE OF mc`,
		userID, missionID).Scan(
		&m.ID, &m.Type, &m.RewardBP, &m.CampaignID, &m.Status,
		&mc.ID, &mc.Status, &mc.CreatedAt)
	if err != nil {
		return 0, fmt.Errorf("completion not found")
	}

	if mc.Status == models.CompletionStatusRewardPaid {
		return 0, fmt.Errorf("already rewarded")
	}
	if mc.Status == models.CompletionStatusFailed {
		return 0, fmt.Errorf("mission verification failed")
	}

	// Timer-based: ensure minimum time has passed
	timerSeconds := s.settings.GetInt(ctx, "mission_timer_seconds", 15)
	if m.Type == models.MissionTypeLink || m.Type == models.MissionTypeBot {
		elapsed := time.Since(mc.CreatedAt).Seconds()
		if elapsed < float64(timerSeconds) {
			return 0, fmt.Errorf("please wait %d seconds before verifying", timerSeconds)
		}
	}

	now := time.Now()

	// Mark as verified and reward paid
	_, err = tx.Exec(ctx,
		`UPDATE mission_completions SET status = 'reward_paid', verified_at = $1, reward_paid_at = $1
		 WHERE id = $2`, now, mc.ID)
	if err != nil {
		return 0, err
	}

	// Award BP to user
	_, err = tx.Exec(ctx,
		`UPDATE users SET bp = bp + $1, has_completed_mission = true, updated_at = NOW() WHERE id = $2`,
		m.RewardBP, userID)
	if err != nil {
		return 0, err
	}

	// Record transaction
	idempKey := fmt.Sprintf("mission_reward_%s_%s", userID, missionID)
	refType := "mission"
	desc := "Mission reward"
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'mission_reward', $3, 'BP', $4, $5, $6, $7, NOW())
		 ON CONFLICT (idempotency_key) DO NOTHING`,
		uuid.New(), userID, m.RewardBP, m.ID, refType, idempKey, desc)
	if err != nil {
		return 0, err
	}

	// Increment campaign done_completions if campaign mission
	if m.CampaignID != nil {
		_, err = tx.Exec(ctx,
			`UPDATE campaigns SET done_completions = done_completions + 1, updated_at = NOW()
			 WHERE id = $1`,
			*m.CampaignID)
		if err != nil {
			return 0, err
		}

		// Auto-complete campaign if target reached
		_, _ = tx.Exec(ctx,
			`UPDATE campaigns SET status = 'completed', updated_at = NOW()
			 WHERE id = $1 AND done_completions >= total_completions AND status = 'active'`,
			*m.CampaignID)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return m.RewardBP, nil
}

// ClaimMilestoneMission claims a milestone if user meets the threshold
func (s *MissionService) ClaimMilestoneMission(ctx context.Context, userID, missionID uuid.UUID) (float64, error) {
	var m models.Mission
	err := s.db.QueryRow(ctx,
		`SELECT id, type, reward_bp, milestone_count, status FROM missions WHERE id = $1 AND type = 'milestone'`,
		missionID).Scan(&m.ID, &m.Type, &m.RewardBP, &m.MilestoneCount, &m.Status)
	if err != nil {
		return 0, fmt.Errorf("milestone mission not found")
	}

	activeCount, err := s.referral.CountActiveReferrals(ctx, userID)
	if err != nil {
		return 0, err
	}

	if m.MilestoneCount != nil && activeCount < *m.MilestoneCount {
		return 0, fmt.Errorf("not enough active referrals: have %d, need %d", activeCount, *m.MilestoneCount)
	}

	// Check not already claimed
	var existing string
	err = s.db.QueryRow(ctx,
		`SELECT status FROM mission_completions WHERE user_id = $1 AND mission_id = $2`,
		userID, missionID).Scan(&existing)
	if err == nil {
		return 0, fmt.Errorf("already claimed")
	}

	// Insert completion and reward
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	_, err = tx.Exec(ctx,
		`INSERT INTO mission_completions (id, user_id, mission_id, status, verified_at, reward_paid_at, created_at)
		 VALUES ($1, $2, $3, 'reward_paid', $4, $4, $4)`,
		uuid.New(), userID, missionID, now)
	if err != nil {
		return 0, err
	}

	_, err = tx.Exec(ctx,
		`UPDATE users SET bp = bp + $1, has_completed_mission = true, updated_at = NOW() WHERE id = $2`,
		m.RewardBP, userID)
	if err != nil {
		return 0, err
	}

	idempKey := fmt.Sprintf("milestone_reward_%s_%s", userID, missionID)
	refType := "mission"
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'mission_reward', $3, 'BP', $4, $5, $6, 'Milestone mission reward', NOW())
		 ON CONFLICT (idempotency_key) DO NOTHING`,
		uuid.New(), userID, m.RewardBP, m.ID, refType, idempKey)
	if err != nil {
		return 0, err
	}

	return m.RewardBP, tx.Commit(ctx)
}
