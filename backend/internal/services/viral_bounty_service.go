package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ViralBountyService struct {
	db       *pgxpool.Pool
	settings *SettingsService
}

func NewViralBountyService(db *pgxpool.Pool, settings *SettingsService) *ViralBountyService {
	return &ViralBountyService{db: db, settings: settings}
}

type ViralBountyInfo struct {
	CampaignStart      time.Time `json:"campaign_start"`
	UserCreatedAt      time.Time `json:"user_created_at"`
	Deadline           time.Time `json:"deadline"`
	SecondsRemaining   int64     `json:"seconds_remaining"`
	IsExpired          bool      `json:"is_expired"`
	ReferralsCount     int       `json:"referrals_count"`
	MinReferralsTarget int       `json:"min_referrals_target"`
	RewardPerReferral  float64   `json:"reward_per_referral"`
	CurrentGram        float64   `json:"current_gram"`
	TargetGram         float64   `json:"target_gram"`
	CanClaim           bool      `json:"can_claim"`
	FeeGram            float64   `json:"fee_gram"`
	DepositWallet      string    `json:"deposit_wallet"`
	ExistingRequest    *ViralBountyRequest `json:"existing_request,omitempty"`
}

type ViralBountyRequest struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	WalletAddress string    `json:"wallet_address"`
	PaymentMemo   string    `json:"payment_memo"`
	FeeGram       float64   `json:"fee_gram"`
	PayoutGram    float64   `json:"payout_gram"`
	FeePaid       bool      `json:"fee_paid"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// Global campaign launch epoch: 2026-10-08T00:00:00Z
var CampaignLaunchEpoch = time.Date(2026, 10, 8, 0, 0, 0, 0, time.UTC)

func (s *ViralBountyService) EnsureTable(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS viral_bounties (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			wallet_address TEXT NOT NULL,
			payment_memo TEXT NOT NULL UNIQUE,
			fee_gram DOUBLE PRECISION NOT NULL DEFAULT 1.2,
			payout_gram DOUBLE PRECISION NOT NULL DEFAULT 10.0,
			fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
			status TEXT NOT NULL DEFAULT 'waiting_fee',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_viral_bounties_user ON viral_bounties(user_id);
		CREATE INDEX IF NOT EXISTS idx_viral_bounties_memo ON viral_bounties(payment_memo);
	`)
	return err
}

func (s *ViralBountyService) GetUserBountyInfo(ctx context.Context, userID uuid.UUID) (*ViralBountyInfo, error) {
	var userCreatedAt time.Time
	var userTelegramID int64
	err := s.db.QueryRow(ctx, `SELECT created_at, telegram_id FROM users WHERE id = $1`, userID).Scan(&userCreatedAt, &userTelegramID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Calculate personal 7-day timer
	// For users registered before campaign launch, their 7 days start from CampaignLaunchEpoch.
	// For users registering after campaign launch, their 7 days start from userCreatedAt.
	var userCampaignStart time.Time
	if userCreatedAt.Before(CampaignLaunchEpoch) {
		userCampaignStart = CampaignLaunchEpoch
	} else {
		userCampaignStart = userCreatedAt
	}

	deadline := userCampaignStart.Add(7 * 24 * time.Hour)
	now := time.Now().UTC()
	var secondsRemaining int64 = int64(deadline.Sub(now).Seconds())
	isExpired := false
	if secondsRemaining <= 0 {
		secondsRemaining = 0
		isExpired = true
	}

	// Count new valid referrals created on or after userCampaignStart and before deadline
	var refCount int
	_ = s.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM referrals 
		WHERE referrer_id = $1 
		  AND level = 1 
		  AND created_at >= $2 
		  AND created_at <= $3
	`, userID, userCampaignStart, deadline).Scan(&refCount)

	rewardPerRef := 0.50
	targetGram := 10.00
	minRefTarget := 20
	feeGram := 1.20

	currentGram := float64(refCount) * rewardPerRef
	if currentGram > targetGram {
		currentGram = targetGram
	}

	canClaim := !isExpired && refCount >= minRefTarget

	// Fetch existing request if any
	var req ViralBountyRequest
	err = s.db.QueryRow(ctx, `
		SELECT id, user_id, wallet_address, payment_memo, fee_gram, payout_gram, fee_paid, status, created_at 
		FROM viral_bounties 
		WHERE user_id = $1 
		ORDER BY created_at DESC LIMIT 1
	`, userID).Scan(&req.ID, &req.UserID, &req.WalletAddress, &req.PaymentMemo, &req.FeeGram, &req.PayoutGram, &req.FeePaid, &req.Status, &req.CreatedAt)

	var existingReqPtr *ViralBountyRequest
	if err == nil {
		existingReqPtr = &req
	}

	depositWallet := "UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR"

	return &ViralBountyInfo{
		CampaignStart:      userCampaignStart,
		UserCreatedAt:      userCreatedAt,
		Deadline:           deadline,
		SecondsRemaining:   secondsRemaining,
		IsExpired:          isExpired,
		ReferralsCount:     refCount,
		MinReferralsTarget: minRefTarget,
		RewardPerReferral:  rewardPerRef,
		CurrentGram:        currentGram,
		TargetGram:         targetGram,
		CanClaim:           canClaim,
		FeeGram:            feeGram,
		DepositWallet:      depositWallet,
		ExistingRequest:    existingReqPtr,
	}, nil
}

func (s *ViralBountyService) CreateCashoutRequest(ctx context.Context, userID uuid.UUID, walletAddress string) (*ViralBountyRequest, error) {
	walletAddress = strings.TrimSpace(walletAddress)
	if len(walletAddress) < 20 {
		return nil, fmt.Errorf("invalid TON/GRAM wallet address")
	}

	info, err := s.GetUserBountyInfo(ctx, userID)
	if err != nil {
		return nil, err
	}

	if info.IsExpired {
		return nil, fmt.Errorf("the 7-day viral bounty campaign time has expired")
	}

	if info.ReferralsCount < info.MinReferralsTarget {
		return nil, fmt.Errorf("you have %d/20 referrals. You need %d more referrals to unlock the 10 GRAM cashout", info.ReferralsCount, info.MinReferralsTarget-info.ReferralsCount)
	}

	var userTelegramID int64
	_ = s.db.QueryRow(ctx, `SELECT telegram_id FROM users WHERE id = $1`, userID).Scan(&userTelegramID)

	memo := fmt.Sprintf("VIRAL-%d", userTelegramID)
	if userTelegramID <= 0 {
		memo = fmt.Sprintf("VIRAL-%s", strings.ToUpper(uuid.New().String()[:8]))
	}

	var req ViralBountyRequest
	req.ID = uuid.New()
	req.UserID = userID
	req.WalletAddress = walletAddress
	req.PaymentMemo = memo
	req.FeeGram = 1.20
	req.PayoutGram = 10.00
	req.FeePaid = false
	req.Status = "waiting_fee"
	req.CreatedAt = time.Now().UTC()

	_, err = s.db.Exec(ctx, `
		INSERT INTO viral_bounties (id, user_id, wallet_address, payment_memo, fee_gram, payout_gram, fee_paid, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, false, 'waiting_fee', NOW(), NOW())
		ON CONFLICT (payment_memo) DO UPDATE SET wallet_address = $3, updated_at = NOW()
	`, req.ID, req.UserID, req.WalletAddress, req.PaymentMemo, req.FeeGram, req.PayoutGram)
	if err != nil {
		return nil, fmt.Errorf("failed to create cashout request: %w", err)
	}

	log.Printf("🎁 [ViralBounty] Created 10 GRAM cashout request for user %s (memo: %s, wallet: %s)", userID, memo, walletAddress)
	return &req, nil
}
