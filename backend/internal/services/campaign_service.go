package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"hashbee/internal/models"
)

type CampaignService struct {
	db       *pgxpool.Pool
	settings *SettingsService
}

func NewCampaignService(db *pgxpool.Pool, settings *SettingsService) *CampaignService {
	return &CampaignService{db: db, settings: settings}
}

type CreateCampaignRequest struct {
	Type             string  `json:"type" binding:"required"`
	Target           string  `json:"target" binding:"required"`
	Title            string  `json:"title" binding:"required"`
	TotalCompletions int     `json:"total_completions"`
	RewardBP         float64 `json:"reward_bp"`
}

// CreateCampaign creates a new Boost Campaign, deducting cost from user's honey
func (s *CampaignService) CreateCampaign(ctx context.Context, ownerID uuid.UUID, req CreateCampaignRequest) (*models.Campaign, error) {
	// Validate type
	validTypes := map[string]bool{
		models.CampaignTypeLink:    true,
		models.CampaignTypeChannel: true,
		models.CampaignTypeGroup:   true,
		models.CampaignTypeBot:     true,
	}
	if !validTypes[req.Type] {
		return nil, fmt.Errorf("invalid campaign type")
	}

	if req.TotalCompletions < 50 {
		req.TotalCompletions = 50
	}

	if req.RewardBP <= 0 {
		req.RewardBP = 0.1
	}

	pricePerCompletion := s.settings.GetFloat(ctx, "campaign_price_per_completion", 0.001)
	honeyToUSDT := s.settings.GetFloat(ctx, "honey_to_usdt_rate", 1000)
	totalCostUSDT := float64(req.TotalCompletions) * pricePerCompletion
	totalCostHoney := totalCostUSDT * honeyToUSDT

	// Determine verification type
	verificationType := "timer"
	if req.Type == models.CampaignTypeChannel || req.Type == models.CampaignTypeGroup {
		verificationType = "api"
	}

	// Determine initial status
	requireApproval := s.settings.GetBool(ctx, "feature_admin_campaign_approval", false)
	status := models.CampaignStatusActive
	if requireApproval {
		status = models.CampaignStatusPending
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Deduct honey from user balance
	var balance float64
	err = tx.QueryRow(ctx, `SELECT honey_balance FROM users WHERE id = $1 FOR UPDATE`, ownerID).Scan(&balance)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if balance < totalCostHoney {
		return nil, fmt.Errorf("insufficient Honey balance: need %.2f Honey (%.4f USDT), have %.2f", totalCostHoney, totalCostUSDT, balance)
	}

	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = honey_balance - $1, updated_at = NOW() WHERE id = $2`,
		totalCostHoney, ownerID)
	if err != nil {
		return nil, err
	}

	campaign := &models.Campaign{
		ID:               uuid.New(),
		OwnerUserID:      ownerID,
		Type:             req.Type,
		Target:           req.Target,
		Title:            req.Title,
		TotalCompletions: req.TotalCompletions,
		DoneCompletions:  0,
		RewardBP:         req.RewardBP,
		Cost:             totalCostUSDT,
		Status:           status,
		VerificationType: verificationType,
		CreatedAt:        time.Now(),
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO campaigns (id, owner_user_id, type, target, title, total_completions, done_completions, reward_bp, cost, status, verification_type, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
		campaign.ID, campaign.OwnerUserID, campaign.Type, campaign.Target, campaign.Title,
		campaign.TotalCompletions, campaign.DoneCompletions, campaign.RewardBP, campaign.Cost,
		campaign.Status, campaign.VerificationType)
	if err != nil {
		return nil, err
	}

	// Create corresponding mission if approved
	if status == models.CampaignStatusActive {
		if err := s.createMissionForCampaign(ctx, tx, campaign); err != nil {
			return nil, err
		}
	}

	// Record payment transaction
	idempKey := fmt.Sprintf("campaign_payment_%s", campaign.ID)
	refType := "campaign"
	_, err = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
		 VALUES ($1, $2, 'campaign_payment', $3, 'HONEY', $4, $5, $6, 'Boost Campaign payment', NOW())
		 ON CONFLICT (idempotency_key) DO NOTHING`,
		uuid.New(), ownerID, -totalCostHoney, campaign.ID, refType, idempKey)
	if err != nil {
		return nil, err
	}

	return campaign, tx.Commit(ctx)
}

func (s *CampaignService) createMissionForCampaign(ctx context.Context, tx pgx.Tx, campaign *models.Campaign) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO missions (id, type, target, title, description, reward_bp, campaign_id, sort_order, status, is_official, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, 'Sponsored mission', $5, $6, 10, 'active', false, NOW(), NOW())`,
		uuid.New(), campaign.Type, campaign.Target, campaign.Title, campaign.RewardBP, campaign.ID)
	return err
}

// GetUserCampaigns returns campaigns owned by a user
func (s *CampaignService) GetUserCampaigns(ctx context.Context, ownerID uuid.UUID) ([]models.Campaign, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, owner_user_id, type, target, title, total_completions, done_completions,
		        reward_bp, cost, status, verification_type, admin_notes, created_at, updated_at
		 FROM campaigns WHERE owner_user_id = $1 ORDER BY created_at DESC`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []models.Campaign
	for rows.Next() {
		var c models.Campaign
		if err := rows.Scan(&c.ID, &c.OwnerUserID, &c.Type, &c.Target, &c.Title, &c.TotalCompletions,
			&c.DoneCompletions, &c.RewardBP, &c.Cost, &c.Status, &c.VerificationType, &c.AdminNotes,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

// CancelCampaign cancels and refunds remaining completions
func (s *CampaignService) CancelCampaign(ctx context.Context, campaignID, ownerID uuid.UUID) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var c models.Campaign
	err = tx.QueryRow(ctx,
		`SELECT id, owner_user_id, total_completions, done_completions, cost, status
		 FROM campaigns WHERE id = $1 FOR UPDATE`, campaignID).
		Scan(&c.ID, &c.OwnerUserID, &c.TotalCompletions, &c.DoneCompletions, &c.Cost, &c.Status)
	if err != nil {
		return fmt.Errorf("campaign not found")
	}
	if c.OwnerUserID != ownerID {
		return fmt.Errorf("not authorized")
	}
	if c.Status == models.CampaignStatusCompleted || c.Status == models.CampaignStatusCancelled {
		return fmt.Errorf("campaign already %s", c.Status)
	}

	// Calculate refund
	pricePerCompletion := s.settings.GetFloat(ctx, "campaign_price_per_completion", 0.001)
	honeyToUSDT := s.settings.GetFloat(ctx, "honey_to_usdt_rate", 1000)
	remaining := c.TotalCompletions - c.DoneCompletions
	refundUSDT := float64(remaining) * pricePerCompletion
	refundHoney := refundUSDT * honeyToUSDT

	_, err = tx.Exec(ctx,
		`UPDATE campaigns SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, campaignID)
	if err != nil {
		return err
	}

	// Pause associated mission
	_, _ = tx.Exec(ctx,
		`UPDATE missions SET status = 'paused', updated_at = NOW() WHERE campaign_id = $1`, campaignID)

	if refundHoney > 0 {
		_, err = tx.Exec(ctx,
			`UPDATE users SET honey_balance = honey_balance + $1, updated_at = NOW() WHERE id = $2`,
			refundHoney, ownerID)
		if err != nil {
			return err
		}

		idempKey := fmt.Sprintf("campaign_refund_%s", campaignID)
		refType := "campaign"
		_, _ = tx.Exec(ctx,
			`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
			 VALUES ($1, $2, 'adjustment', $3, 'HONEY', $4, $5, $6, 'Campaign cancellation refund', NOW())
			 ON CONFLICT (idempotency_key) DO NOTHING`,
			uuid.New(), ownerID, refundHoney, campaignID, refType, idempKey)
	}

	return tx.Commit(ctx)
}

// AdminListCampaigns for admin panel
func (s *CampaignService) AdminListCampaigns(ctx context.Context, status string, limit, offset int) ([]models.Campaign, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1
	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int
	_ = s.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM campaigns %s", where), args...).Scan(&total)

	args = append(args, limit, offset)
	rows, err := s.db.Query(ctx,
		fmt.Sprintf(`SELECT id, owner_user_id, type, target, title, total_completions, done_completions,
		        reward_bp, cost, status, verification_type, admin_notes, created_at, updated_at
		 FROM campaigns %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var campaigns []models.Campaign
	for rows.Next() {
		var c models.Campaign
		if err := rows.Scan(&c.ID, &c.OwnerUserID, &c.Type, &c.Target, &c.Title, &c.TotalCompletions,
			&c.DoneCompletions, &c.RewardBP, &c.Cost, &c.Status, &c.VerificationType, &c.AdminNotes,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, total, nil
}
