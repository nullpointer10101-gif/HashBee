package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
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
	Title            string  `json:"title"`
	TotalCompletions int     `json:"total_completions"`
	RewardBP         float64 `json:"reward_bp"`
	PayWithBalance   bool    `json:"pay_with_balance"`
}

func generateMemo() string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return strings.ToUpper("CMP" + hex.EncodeToString(b))
}

// CreateCampaign creates a new Boost Campaign
func (s *CampaignService) CreateCampaign(ctx context.Context, ownerID uuid.UUID, req CreateCampaignRequest) (*models.Campaign, error) {
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

	// Clean title
	title := strings.TrimSpace(req.Title)
	if title == "" {
		targetClean := strings.TrimSpace(req.Target)
		if strings.HasPrefix(targetClean, "@") {
			title = strings.TrimPrefix(targetClean, "@")
		} else if strings.Contains(targetClean, "/") {
			parts := strings.Split(strings.TrimRight(targetClean, "/"), "/")
			title = parts[len(parts)-1]
		} else {
			title = "Promoted Link"
		}
	}

	// 0.001 GRAM per completion -> 50 completions = 0.0500 GRAM
	totalCostGRAM := float64(req.TotalCompletions) * 0.001
	memo := generateMemo()

	verificationType := "timer"
	if req.Type == models.CampaignTypeChannel || req.Type == models.CampaignTypeGroup {
		verificationType = "api"
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	status := "waiting_for_payment"

	// If user explicitly chose to pay with in-app balance
	if req.PayWithBalance {
		var balance float64
		err = tx.QueryRow(ctx, "SELECT honey_balance FROM users WHERE id = $1 FOR UPDATE", ownerID).Scan(&balance)
		if err != nil {
			return nil, fmt.Errorf("user not found")
		}
		if balance < totalCostGRAM {
			return nil, fmt.Errorf("insufficient balance: need %.4f GRAM, have %.4f", totalCostGRAM, balance)
		}

		_, err = tx.Exec(ctx,
			"UPDATE users SET honey_balance = honey_balance - $1, updated_at = NOW() WHERE id = $2",
			totalCostGRAM, ownerID)
		if err != nil {
			return nil, err
		}
		status = models.CampaignStatusActive
	}

	campaign := &models.Campaign{
		ID:               uuid.New(),
		OwnerUserID:      ownerID,
		Type:             req.Type,
		Target:           req.Target,
		Title:            title,
		TotalCompletions: req.TotalCompletions,
		DoneCompletions:  0,
		RewardBP:         req.RewardBP,
		Cost:             totalCostGRAM,
		Status:           status,
		VerificationType: verificationType,
		PaymentMemo:      &memo,
		CreatedAt:        time.Now(),
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO campaigns (id, owner_user_id, type, target, title, total_completions, done_completions, reward_bp, cost, status, verification_type, payment_memo, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
		campaign.ID, campaign.OwnerUserID, campaign.Type, campaign.Target, campaign.Title,
		campaign.TotalCompletions, campaign.DoneCompletions, campaign.RewardBP, campaign.Cost,
		campaign.Status, campaign.VerificationType, campaign.PaymentMemo)
	if err != nil {
		return nil, err
	}

	if status == models.CampaignStatusActive {
		if err := s.createMissionForCampaign(ctx, tx, campaign); err != nil {
			return nil, err
		}
	}

	return campaign, tx.Commit(ctx)
}

func (s *CampaignService) createMissionForCampaign(ctx context.Context, tx pgx.Tx, campaign *models.Campaign) error {
	icon := "link"
	if campaign.Type == "channel" || campaign.Type == "group" {
		icon = "users"
	} else if campaign.Type == "bot" {
		icon = "bot"
	}
	_, err := tx.Exec(ctx,
		`INSERT INTO missions (id, type, target, title, description, reward_bp, campaign_id, sort_order, status, is_official, icon_url, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, '+0.1 GHS', $5, $6, 25, 'active', false, $7, NOW(), NOW())`,
		uuid.New(), campaign.Type, campaign.Target, campaign.Title, campaign.RewardBP, campaign.ID, icon)
	return err
}

// GetUserCampaigns returns campaigns owned by a user
func (s *CampaignService) GetUserCampaigns(ctx context.Context, ownerID uuid.UUID) ([]models.Campaign, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, owner_user_id, type, target, title, total_completions, done_completions,
		        reward_bp, cost, status, verification_type, admin_notes, payment_memo, created_at, updated_at
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
			&c.PaymentMemo, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

// CancelCampaign cancels a campaign
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

	_, err = tx.Exec(ctx,
		"UPDATE campaigns SET status = 'cancelled', updated_at = NOW() WHERE id = $1", campaignID)
	if err != nil {
		return err
	}

	_, _ = tx.Exec(ctx,
		"UPDATE missions SET status = 'paused', updated_at = NOW() WHERE campaign_id = $1", campaignID)

	return tx.Commit(ctx)
}

// AdminListCampaigns returns all campaigns with optional status filter, paginated
func (s *CampaignService) AdminListCampaigns(ctx context.Context, status string, limit, offset int) ([]models.Campaign, int, error) {
	if limit <= 0 {
		limit = 50
	}
	var total int
	if status != "" {
		_ = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM campaigns WHERE status = $1", status).Scan(&total)
	} else {
		_ = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM campaigns").Scan(&total)
	}

	var pgxRows pgx.Rows
	var err error
	if status != "" {
		pgxRows, err = s.db.Query(ctx,
			`SELECT id, owner_user_id, type, target, title, total_completions, done_completions,
			        reward_bp, cost, status, verification_type, admin_notes, payment_memo, created_at, updated_at
			 FROM campaigns WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
			status, limit, offset)
	} else {
		pgxRows, err = s.db.Query(ctx,
			`SELECT id, owner_user_id, type, target, title, total_completions, done_completions,
			        reward_bp, cost, status, verification_type, admin_notes, payment_memo, created_at, updated_at
			 FROM campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
			limit, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer pgxRows.Close()

	var campaigns []models.Campaign
	for pgxRows.Next() {
		var c models.Campaign
		if err := pgxRows.Scan(&c.ID, &c.OwnerUserID, &c.Type, &c.Target, &c.Title, &c.TotalCompletions,
			&c.DoneCompletions, &c.RewardBP, &c.Cost, &c.Status, &c.VerificationType, &c.AdminNotes,
			&c.PaymentMemo, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, total, nil
}
