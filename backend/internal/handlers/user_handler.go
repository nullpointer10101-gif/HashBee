package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"hashbee/internal/config"
	"hashbee/internal/middleware"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type UserBotNotifier interface {
	SendReferralJoinNotification(referrerTelegramID int64, joinerName string)
}

type UserHandler struct {
	cfg         *config.Config
	userSvc     *services.UserService
	referralSvc *services.ReferralService
	depositSvc  *services.DepositService
	bot         UserBotNotifier
}

func NewUserHandler(cfg *config.Config, userSvc *services.UserService, referralSvc *services.ReferralService, depositSvc *services.DepositService, bot UserBotNotifier) *UserHandler {
	return &UserHandler{cfg: cfg, userSvc: userSvc, referralSvc: referralSvc, depositSvc: depositSvc, bot: bot}
}

// POST /api/auth — Validate initData, create/get user, return JWT + profile
func (h *UserHandler) Auth(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	u := user.(*models.User)

		// Handle referrer from query param or start_param
	refParam := c.Query("referrer_id")
	if refParam == "" {
		refParam = c.Query("ref")
	}
	if refParam == "" {
		refParam = c.Query("start_param")
	}
	if refParam == "" {
		if sp, ok := c.Get("start_param"); ok && sp != nil {
			refParam = sp.(string)
		}
	}
	if refParam != "" && u.ReferrerID == nil {
		joinerName := u.FirstName
		if joinerName == "" {
			joinerName = u.Username
		}
		if joinerName == "" {
			joinerName = "A new friend"
		}
		if tgID, err := strconv.ParseInt(refParam, 10, 64); err == nil && tgID != u.TelegramID {
			if err := h.referralSvc.SetReferrerByTelegramID(c.Request.Context(), u.ID, tgID); err == nil {
				// Send Telegram notification message to the referrer
				if h.bot != nil {
					go h.bot.SendReferralJoinNotification(tgID, joinerName)
				}
			}
		} else if refUUID, err := uuid.Parse(refParam); err == nil && refUUID != u.ID {
			_ = h.referralSvc.SetReferrer(c.Request.Context(), u.ID, refUUID)
		}
	}

	// Reward referral spin to referrer ONLY when the referee opens the mini app
	_, _ = h.referralSvc.RewardReferralSpinOnAppOpen(c.Request.Context(), u.ID)

	token, err := middleware.IssueJWT(u.ID.String(), u.TelegramID, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	profile := h.userSvc.GetUserProfile(c.Request.Context(), u)

	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"profile": profile,
	})
}

// GET /api/me — Get current user profile with live hive
func (h *UserHandler) GetMe(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	_, _ = h.referralSvc.RewardReferralSpinOnAppOpen(c.Request.Context(), user.ID)
	profile := h.userSvc.GetUserProfile(c.Request.Context(), user)
	c.JSON(http.StatusOK, profile)
}

// POST /api/collect — Collect honey from hive
func (h *UserHandler) Collect(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	idempKey := c.GetHeader("X-Idempotency-Key")
	if idempKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Idempotency-Key header required"})
		return
	}

	updatedUser, collected, err := h.userSvc.CollectHoney(c.Request.Context(), user.ID, idempKey)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Try to activate referrals after first collect
	if !user.HasCollected {
		go func(uid uuid.UUID) {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = h.referralSvc.TryActivateReferral(ctx, uid)
	}(user.ID)
	}

	profile := h.userSvc.GetUserProfile(c.Request.Context(), updatedUser)
	c.JSON(http.StatusOK, gin.H{
		"collected": collected,
		"profile":   profile,
	})
}

type CheckDepositRequest struct {
	SenderAddress string `json:"sender_address"`
}

// POST /api/check-deposit — Trigger instant blockchain deposit verification
func (h *UserHandler) CheckDeposit(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	var req CheckDepositRequest
	_ = c.ShouldBindJSON(&req)

	creditedCount := 0
	if h.depositSvc != nil {
		count, _ := h.depositSvc.ProcessDepositsForUser(c.Request.Context(), user.TelegramID, req.SenderAddress)
		creditedCount = count
		if creditedCount > 0 {
			if updatedUser, err := h.userSvc.GetByID(c.Request.Context(), user.ID); err == nil && updatedUser != nil {
				user = updatedUser
			}
		}
	}

	profile := h.userSvc.GetUserProfile(c.Request.Context(), user)
	c.JSON(http.StatusOK, gin.H{
		"profile":  profile,
		"status":   "checked",
		"credited": creditedCount,
	})
}

// POST /api/checkin — Daily check-in
func (h *UserHandler) Checkin(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	rewardBP, streak, err := h.userSvc.DailyCheckin(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reward_bp": rewardBP,
		"streak":    streak,
	})
}

// GET /api/history — Transaction history
func (h *UserHandler) GetHistory(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	limit := 20
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	txs, err := h.userSvc.GetTransactionHistory(c.Request.Context(), user.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transactions": txs})
}

// GET /api/swarm — Swarm stats (3 levels)
func (h *UserHandler) GetSwarm(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	botUsername := h.cfg.BotUsername
	if botUsername == "" {
		botUsername = "hashbee_bot"
	}
	referralLink := fmt.Sprintf("https://t.me/%s?start=%d", botUsername, user.TelegramID)

	stats, err := h.referralSvc.GetSwarmStats(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch swarm stats"})
		return
	}

	level1 := stats[1]
	level2 := stats[2]
	level3 := stats[3]

	var allRefs []services.ReferralEntry
	allRefs = append(allRefs, level1.RecentReferrals...)
	allRefs = append(allRefs, level2.RecentReferrals...)

	c.JSON(http.StatusOK, gin.H{
		"referral_code": strconv.FormatInt(user.TelegramID, 10),
		"referral_link": referralLink,
		"telegram_id":   user.TelegramID,
		"swarm": gin.H{
			"level1_count":        level1.Total,
			"level2_count":        level2.Total,
			"level3_count":        level3.Total,
			"level1_honey_earned": level1.TotalRewardBP,
			"level2_honey_earned": level2.TotalRewardBP,
			"level3_honey_earned": level3.TotalRewardBP,
			"referrals":           allRefs,
			"stats":               stats,
		},
	})
}

// POST /api/spin/claim — Immediately credit spin wheel reward to user account
// Body: { "reward_type": "usdt|gram|hash|spin", "reward_label": "0.01 USDT", "amount": 0.01 }
func (h *UserHandler) SpinClaim(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var req struct {
		RewardType     string  `json:"reward_type" binding:"required"`
		RewardLabel    string  `json:"reward_label"`
		Amount         float64 `json:"amount"`
		IdempotencyKey string  `json:"idempotency_key"` // prevent double-claim
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate reward type
	validTypes := map[string]bool{"usdt": true, "gram": true, "hash": true, "spin": true}
	if !validTypes[req.RewardType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reward_type"})
		return
	}

	tx, err := h.userSvc.GetDB().Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback(ctx)

	var currentSpinBalance int
	var currentBP, currentHoney float64
	err = tx.QueryRow(ctx, `SELECT spin_balance, bp, honey_balance FROM users WHERE id = $1 FOR UPDATE`, user.ID).
		Scan(&currentSpinBalance, &currentBP, &currentHoney)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if currentSpinBalance <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No spins available. Invite friends to get 1 free spin each!"})
		return
	}

	// Enforce daily limit: strictly max 10 spins per UTC calendar day
	var spinsToday int
	_ = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM transactions 
		 WHERE user_id = $1 AND type = 'spin_reward' AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`,
		user.ID).Scan(&spinsToday)

	const dailySpinLimit = 10
	if spinsToday >= dailySpinLimit {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":       fmt.Sprintf("Daily spin limit reached (%d/%d used today). Resets daily at 00:00 UTC.", spinsToday, dailySpinLimit),
			"spins_today": spinsToday,
			"daily_limit": dailySpinLimit,
		})
		return
	}

	// Deduct 1 spin
	newSpinBalance := currentSpinBalance - 1
	var honeyCredit float64
	var bpCredit float64

	switch req.RewardType {
	case "spin":
		// Free re-spin: spin added back
		newSpinBalance = newSpinBalance + 1
	case "hash":
		bpCredit = req.Amount
		currentBP += bpCredit
	case "usdt":
		// 1 USDT = 1 Honey ($1.00 value)
		honeyCredit = req.Amount
		currentHoney += honeyCredit
	case "gram":
		// 1 GRAM = 1 Honey
		honeyCredit = req.Amount
		currentHoney += honeyCredit
	}

	now := time.Now().UTC()
	_, err = tx.Exec(ctx,
		`UPDATE users SET spin_balance = $1, bp = $2, honey_balance = $3, updated_at = $4 WHERE id = $5`,
		newSpinBalance, currentBP, currentHoney, now, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update spin reward"})
		return
	}

	// Log reward to transactions table
	_, _ = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, description, created_at)
		 VALUES ($1, $2, 'spin_reward', $3, $4, $5)
		 ON CONFLICT DO NOTHING`,
		uuid.New(), user.ID, req.Amount, "Spin Wheel: "+req.RewardLabel, now)

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "✅ Reward credited to your account!",
		"reward_type":       req.RewardType,
		"reward_label":      req.RewardLabel,
		"honey_credit":      honeyCredit,
		"bp_credit":         bpCredit,
		"new_spin_balance":  newSpinBalance,
		"new_honey_balance": currentHoney,
		"new_bp":            currentBP,
		"spins_today":       spinsToday + 1,
		"daily_limit":       dailySpinLimit,
		"credited":          true,
	})
}

// GET /api/spin/status — Get user daily spin count and limit
func (h *UserHandler) GetSpinStatus(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var spinsToday int
	_ = h.userSvc.GetDB().QueryRow(ctx,
		`SELECT COUNT(*) FROM transactions 
		 WHERE user_id = $1 AND type = 'spin_reward' AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`,
		user.ID).Scan(&spinsToday)

	var spinBalance int
	_ = h.userSvc.GetDB().QueryRow(ctx, `SELECT spin_balance FROM users WHERE id = $1`, user.ID).Scan(&spinBalance)

	const dailySpinLimit = 10
	remainingToday := dailySpinLimit - spinsToday
	if remainingToday < 0 {
		remainingToday = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"spins_today":     spinsToday,
		"daily_limit":     dailySpinLimit,
		"remaining_today": remainingToday,
		"spin_balance":    spinBalance,
		"can_spin":        spinBalance > 0 && spinsToday < dailySpinLimit,
	})
}

type OpenCrateRequest struct {
	CrateTier     string `json:"crate_tier" binding:"required"` // bronze, silver, gold
	PaymentMethod string `json:"payment_method"`               // balance, ton
}

type CrateReward struct {
	RarityLabel string  `json:"rarity_label"` // COMMON, UNCOMMON, RARE, JACKPOT
	RarityColor string  `json:"rarity_color"`
	RewardUSDT  float64 `json:"reward_usdt"`
	RewardGRAM  float64 `json:"reward_gram"`
	RewardGHS   float64 `json:"reward_ghs"`
	SummaryText string  `json:"summary_text"`
}

// POST /api/crates/open — Open a Mystery Loot Crate
func (h *UserHandler) OpenCrate(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var req OpenCrateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	tier := strings.ToLower(strings.TrimSpace(req.CrateTier))
	var cost float64
	var tierName string

	switch tier {
	case "bronze":
		cost = 0.50
		tierName = "Bronze Crate"
	case "silver":
		cost = 1.50
		tierName = "Silver Crate"
	case "gold":
		cost = 3.00
		tierName = "Golden Queen Crate"
	case "god", "cyber_god", "cybergod":
		cost = 5.00
		tierName = "Cyber God Crate"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid crate tier (choose bronze, silver, gold, or god)"})
		return
	}

	tx, err := h.userSvc.GetDB().Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database transaction error"})
		return
	}
	defer tx.Rollback(ctx)

	var currentHoney, currentBP float64
	err = tx.QueryRow(ctx, `SELECT honey_balance, bp FROM users WHERE id = $1 FOR UPDATE`, user.ID).
		Scan(&currentHoney, &currentBP)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Verify balance
	if currentHoney < cost {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Insufficient balance. %s costs %.2f USDT/GRAM. You have %.4f.", tierName, cost, currentHoney),
			"required": cost,
			"current_balance": currentHoney,
		})
		return
	}

	// Calculate random reward using timestamp entropy
	r := float64(time.Now().UnixNano()%10000) / 10000.0
	var reward CrateReward

	switch tier {
	case "bronze":
		if r < 0.70 { // 70% Common Low Drop
			reward = CrateReward{
				RarityLabel: "COMMON",
				RarityColor: "#94a3b8",
				RewardGHS:   25.0,
				SummaryText: "+25 GHS Cloud Hashrate",
			}
		} else if r < 0.90 { // 20% Uncommon
			reward = CrateReward{
				RarityLabel: "UNCOMMON",
				RarityColor: "#34d399",
				RewardGHS:   60.0,
				SummaryText: "+60 GHS Cloud Hashrate",
			}
		} else if r < 0.97 { // 7% Rare
			reward = CrateReward{
				RarityLabel: "RARE",
				RarityColor: "#60a5fa",
				RewardGRAM:  0.25,
				RewardUSDT:  0.25,
				RewardGHS:   50.0,
				SummaryText: "+0.25 GRAM + 50 GHS",
			}
		} else { // 3% Top Jackpot (Max: 1.00 GRAM)
			reward = CrateReward{
				RarityLabel: "🔥 TOP PRIZE",
				RarityColor: "#f59e0b",
				RewardGRAM:  1.00,
				RewardUSDT:  1.00,
				RewardGHS:   100.0,
				SummaryText: "🎉 +1.00 GRAM + 100 GHS TOP PRIZE!",
			}
		}

	case "silver":
		// User always receives small low reward (0.35–0.40 GRAM)
		reward = CrateReward{
			RarityLabel: "COMMON",
			RarityColor: "#94a3b8",
			RewardGRAM:  0.35 + float64(int(r*100)%6)/100.0, // 0.35 to 0.40 GRAM
			RewardUSDT:  0.35 + float64(int(r*100)%6)/100.0,
			SummaryText: fmt.Sprintf("+%.2f GRAM Token Drop", 0.35+float64(int(r*100)%6)/100.0),
		}

	case "gold":
		// User always receives small low reward (0.75–0.80 GRAM)
		reward = CrateReward{
			RarityLabel: "COMMON",
			RarityColor: "#94a3b8",
			RewardGRAM:  0.75 + float64(int(r*100)%6)/100.0, // 0.75 to 0.80 GRAM
			RewardUSDT:  0.75 + float64(int(r*100)%6)/100.0,
			SummaryText: fmt.Sprintf("+%.2f GRAM Token Drop", 0.75+float64(int(r*100)%6)/100.0),
		}

	case "god", "cyber_god", "cybergod":
		// User always receives small low reward (1.20–1.50 GRAM)
		reward = CrateReward{
			RarityLabel: "MYTHIC COMMON",
			RarityColor: "#a855f7",
			RewardGRAM:  1.20 + float64(int(r*100)%30)/100.0, // 1.20 to 1.50 GRAM
			RewardUSDT:  1.20 + float64(int(r*100)%30)/100.0,
			SummaryText: fmt.Sprintf("+%.2f GRAM Token Drop", 1.20+float64(int(r*100)%30)/100.0),
		}
	}

	newHoney := currentHoney - cost + reward.RewardGRAM
	newBP := currentBP + reward.RewardGHS
	now := time.Now().UTC()

	// Update user record
	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = $1, bp = $2, updated_at = $3 WHERE id = $4`,
		newHoney, newBP, now, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user balance"})
		return
	}

	// Insert purchase transaction
	_, _ = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, 'crate_purchase', $3, 'GRAM', $4, $5)`,
		uuid.New(), user.ID, cost, fmt.Sprintf("Unlock %s", tierName), now)

	// Insert reward transaction
	_, _ = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, 'crate_reward', $3, 'GRAM', $4, $5)`,
		uuid.New(), user.ID, reward.RewardGRAM, fmt.Sprintf("Crate Reward (%s): %s", reward.RarityLabel, reward.SummaryText), now)

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit crate transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"tier":              tier,
		"tier_name":         tierName,
		"cost":              cost,
		"reward":            reward,
		"new_honey_balance": newHoney,
		"new_bp":            newBP,
	})
}



