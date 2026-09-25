package models

import (
	"time"

	"github.com/google/uuid"
)

// User statuses
const (
	UserStatusActive  = "active"
	UserStatusBanned  = "banned"
	UserStatusFlagged = "flagged"
)

type User struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	TelegramID            int64      `json:"telegram_id" db:"telegram_id"`
	Username              string     `json:"username" db:"username"`
	FirstName             string     `json:"first_name" db:"first_name"`
	Language              string     `json:"language" db:"language"`
	ReferrerID            *uuid.UUID `json:"referrer_id,omitempty" db:"referrer_id"`
	ReferralCount         int        `json:"referral_count"`
	BP                    float64    `json:"bp" db:"bp"`
	HoneyBalance          float64    `json:"honey_balance" db:"honey_balance"`
	LastCollectAt         time.Time  `json:"last_collect_at" db:"last_collect_at"`
	StreakCount           int        `json:"streak_count" db:"streak_count"`
	LastCheckinAt         *time.Time `json:"last_checkin_at,omitempty" db:"last_checkin_at"`
	Status                string     `json:"status" db:"status"`
	HasCollected          bool       `json:"has_collected" db:"has_collected"`
	HasCompletedMission   bool       `json:"has_completed_mission" db:"has_completed_mission"`
	LastHiveFullNotifiedAt *time.Time `json:"last_hive_full_notified_at,omitempty" db:"last_hive_full_notified_at"`
	OptedOutNotifications bool       `json:"opted_out_notifications" db:"opted_out_notifications"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// HiveStatus represents the current pending honey and earning state
type HiveStatus struct {
	PendingHoney    float64   `json:"pending_honey"`
	EarningRate     float64   `json:"earning_rate_per_second"` // Honey/sec
	CapReachedAt    *time.Time `json:"cap_reached_at,omitempty"`
	IsFull          bool      `json:"is_full"`
	CapHours        float64   `json:"cap_hours"`
	SecondsSinceCollect float64 `json:"seconds_since_collect"`
}

// UserProfile is the public user view for the mini app
type UserProfile struct {
	ID           uuid.UUID  `json:"id"`
	TelegramID   int64      `json:"telegram_id"`
	Username     string     `json:"username"`
	FirstName    string     `json:"first_name"`
	BP           float64    `json:"bp"`
	HoneyBalance float64    `json:"honey_balance"`
	Hive         HiveStatus `json:"hive"`
	StreakCount   int        `json:"streak_count"`
	Status       string     `json:"status"`
	LastCollectAt time.Time  `json:"last_collect_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// Referral statuses
const (
	ReferralStatusPending = "pending"
	ReferralStatusActive  = "active"
)

type Referral struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	ReferrerID  uuid.UUID  `json:"referrer_id" db:"referrer_id"`
	ReferredID  uuid.UUID  `json:"referred_id" db:"referred_id"`
	Level       int        `json:"level" db:"level"`
	Status      string     `json:"status" db:"status"`
	RewardPaid  bool       `json:"reward_paid" db:"reward_paid"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	ActivatedAt *time.Time `json:"activated_at,omitempty" db:"activated_at"`

	// Joined fields for API responses
	ReferredUsername  string `json:"referred_username,omitempty"`
	ReferredFirstName string `json:"referred_first_name,omitempty"`
}

// Mission types
const (
	MissionTypeChannel   = "channel"
	MissionTypeGroup     = "group"
	MissionTypeBot       = "bot"
	MissionTypeLink      = "link"
	MissionTypeMilestone = "milestone"
	MissionTypeCheckin   = "checkin"
)

// Mission statuses
const (
	MissionStatusActive  = "active"
	MissionStatusPaused  = "paused"
	MissionStatusDeleted = "deleted"
)

type Mission struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	Type           string     `json:"type" db:"type"`
	Target         *string    `json:"target,omitempty" db:"target"`
	Title          string     `json:"title" db:"title"`
	Description    *string    `json:"description,omitempty" db:"description"`
	RewardBP       float64    `json:"reward_bp" db:"reward_bp"`
	CampaignID     *uuid.UUID `json:"campaign_id,omitempty" db:"campaign_id"`
	MilestoneCount *int       `json:"milestone_count,omitempty" db:"milestone_count"`
	SortOrder      int        `json:"sort_order" db:"sort_order"`
	Status         string     `json:"status" db:"status"`
	IsOfficial     bool       `json:"is_official" db:"is_official"`
	IconURL        *string    `json:"icon_url,omitempty" db:"icon_url"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`

	// Joined completion status (for user-specific responses)
	UserStatus *string `json:"user_status,omitempty"` // pending, verified, done
	Progress   *int    `json:"progress,omitempty"`    // for milestone missions
}

// MissionCompletion statuses
const (
	CompletionStatusPending    = "pending"
	CompletionStatusVerified   = "verified"
	CompletionStatusFailed     = "failed"
	CompletionStatusRewardPaid = "reward_paid"
)

type MissionCompletion struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	MissionID     uuid.UUID  `json:"mission_id" db:"mission_id"`
	Status        string     `json:"status" db:"status"`
	ClickToken    *string    `json:"click_token,omitempty" db:"click_token"`
	VerifiedAt    *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	RewardPaidAt  *time.Time `json:"reward_paid_at,omitempty" db:"reward_paid_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

// Campaign statuses
const (
	CampaignStatusPending   = "pending"
	CampaignStatusActive    = "active"
	CampaignStatusPaused    = "paused"
	CampaignStatusCompleted = "completed"
	CampaignStatusCancelled = "cancelled"
	CampaignStatusRejected  = "rejected"
)

// Campaign types
const (
	CampaignTypeLink    = "link"
	CampaignTypeChannel = "channel"
	CampaignTypeGroup   = "group"
	CampaignTypeBot     = "bot"
)

type Campaign struct {
	ID               uuid.UUID `json:"id" db:"id"`
	OwnerUserID      uuid.UUID `json:"owner_user_id" db:"owner_user_id"`
	Type             string    `json:"type" db:"type"`
	Target           string    `json:"target" db:"target"`
	Title            string    `json:"title" db:"title"`
	TotalCompletions int       `json:"total_completions" db:"total_completions"`
	DoneCompletions  int       `json:"done_completions" db:"done_completions"`
	RewardBP         float64   `json:"reward_bp" db:"reward_bp"`
	Cost             float64   `json:"cost" db:"cost"`
	Status           string    `json:"status" db:"status"`
	VerificationType string    `json:"verification_type" db:"verification_type"` // api, timer
	AdminNotes       *string   `json:"admin_notes,omitempty" db:"admin_notes"`
	PaymentMemo      *string   `json:"payment_memo,omitempty" db:"payment_memo"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

// Transaction types
const (
	TxTypeCollect          = "collect"
	TxTypeReferralReward   = "referral_reward"
	TxTypeMissionReward    = "mission_reward"
	TxTypeCheckinReward    = "checkin_reward"
	TxTypeWithdrawal       = "withdrawal"
	TxTypeCampaignPayment  = "campaign_payment"
	TxTypeReinvest         = "reinvest"
	TxTypeBPPurchase       = "bp_purchase"
	TxTypeAdjustment       = "adjustment"
)

type Transaction struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	Type           string     `json:"type" db:"type"`
	Amount         float64    `json:"amount" db:"amount"`
	Currency       string     `json:"currency" db:"currency"`
	RefID          *uuid.UUID `json:"ref_id,omitempty" db:"ref_id"`
	RefType        *string    `json:"ref_type,omitempty" db:"ref_type"`
	IdempotencyKey *string    `json:"idempotency_key,omitempty" db:"idempotency_key"`
	Description    *string    `json:"description,omitempty" db:"description"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

// Withdrawal statuses
const (
	WithdrawalStatusPending    = "pending"
	WithdrawalStatusProcessing = "processing"
	WithdrawalStatusPaid       = "paid"
	WithdrawalStatusRejected   = "rejected"
)

type Withdrawal struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	Address     string     `json:"address" db:"address"`
	Network     string     `json:"network" db:"network"`
	Amount      float64    `json:"amount" db:"amount"`
	HoneyAmount float64    `json:"honey_amount" db:"honey_amount"`
	Fee         float64    `json:"fee" db:"fee"`
	Status      string     `json:"status" db:"status"`
	TxHash      *string    `json:"tx_hash,omitempty" db:"tx_hash"`
	Reason      *string    `json:"reason,omitempty" db:"reason"`
	ProcessedBy *uuid.UUID `json:"processed_by,omitempty" db:"processed_by"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// AdminUser roles
const (
	AdminRoleSuperAdmin = "super_admin"
	AdminRoleSupport    = "support"
	AdminRoleFinance    = "finance"
)

type AdminUser struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	Status       string    `json:"status" db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type AuditLog struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	AdminID    *uuid.UUID `json:"admin_id,omitempty" db:"admin_id"`
	Action     string     `json:"action" db:"action"`
	TargetType *string    `json:"target_type,omitempty" db:"target_type"`
	TargetID   *uuid.UUID `json:"target_id,omitempty" db:"target_id"`
	BeforeData interface{} `json:"before_data,omitempty" db:"before_data"`
	AfterData  interface{} `json:"after_data,omitempty" db:"after_data"`
	IPAddress  *string    `json:"ip_address,omitempty" db:"ip_address"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}

type FraudFlag struct {
	ID        uuid.UUID   `json:"id" db:"id"`
	UserID    uuid.UUID   `json:"user_id" db:"user_id"`
	Reason    string      `json:"reason" db:"reason"`
	Metadata  interface{} `json:"metadata,omitempty" db:"metadata"`
	Resolved  bool        `json:"resolved" db:"resolved"`
	CreatedAt time.Time   `json:"created_at" db:"created_at"`
}

type Setting struct {
	Key         string    `json:"key" db:"key"`
	Value       string    `json:"value" db:"value"`
	Description *string   `json:"description,omitempty" db:"description"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
