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
		botUsername = "hashbe_bot"
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

// GET /api/plans — List available 24h daily yield plans and user eligibility
func (h *UserHandler) GetPlans(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var starterCount int
	_ = h.userSvc.GetDB().QueryRow(ctx,
		`SELECT COUNT(*) FROM user_plans WHERE user_id = $1 AND plan_id = 'starter'`,
		user.ID).Scan(&starterCount)

	var activeCount int
	var totalLocked float64
	_ = h.userSvc.GetDB().QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(cost_gram), 0) FROM user_plans WHERE user_id = $1 AND status = 'active'`,
		user.ID).Scan(&activeCount, &totalLocked)

	var claimedCount int
	var totalEarned float64
	_ = h.userSvc.GetDB().QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(return_gram), 0) FROM user_plans WHERE user_id = $1 AND status = 'claimed'`,
		user.ID).Scan(&claimedCount, &totalEarned)

	plans := []models.PlanTier{
		{
			ID:            "starter",
			Name:          "Starter Bee Miner",
			Subtitle:      "Fast 24h trial pack — entry-level miner contract",
			Badge:         "⚡ 1 PER ACCOUNT",
			CostGRAM:      0.70,
			ReturnGRAM:    0.80,
			ProfitGRAM:    0.10,
			ProfitPercent: 14.28,
			DurationHours: 24,
			MaxPerAccount: 1,
			IsLimited:     true,
			UserPurchased: starterCount,
			CanPurchase:   starterCount < 1,
			Icon:          "🐝",
			AccentColor:   "#f59e0b",
		},
		{
			ID:            "standard",
			Name:          "Standard Worker Miner",
			Subtitle:      "High value daily yield contract with massive returns",
			Badge:         "🔥 BEST VALUE",
			CostGRAM:      1.30,
			ReturnGRAM:    2.00,
			ProfitGRAM:    0.70,
			ProfitPercent: 53.85,
			DurationHours: 24,
			MaxPerAccount: 0,
			IsLimited:     false,
			UserPurchased: 0,
			CanPurchase:   true,
			Icon:          "⚡",
			AccentColor:   "#10b981",
		},
		{
			ID:            "queen",
			Name:          "Royal Queen Miner",
			Subtitle:      "High power mining contract with guaranteed 4.50 GRAM next day",
			Badge:         "👑 HIGH YIELD",
			CostGRAM:      3.00,
			ReturnGRAM:    4.50,
			ProfitGRAM:    1.50,
			ProfitPercent: 50.00,
			DurationHours: 24,
			MaxPerAccount: 0,
			IsLimited:     false,
			UserPurchased: 0,
			CanPurchase:   true,
			Icon:          "👑",
			AccentColor:   "#a855f7",
		},
		{
			ID:            "titan",
			Name:          "Cyber Titan Hive",
			Subtitle:      "Whale tier contract delivering +66.7% massive daily returns",
			Badge:         "💎 VIP TITAN (+66.7%)",
			CostGRAM:      6.00,
			ReturnGRAM:    10.00,
			ProfitGRAM:    4.00,
			ProfitPercent: 66.67,
			DurationHours: 24,
			MaxPerAccount: 0,
			IsLimited:     false,
			UserPurchased: 0,
			CanPurchase:   true,
			Icon:          "💎",
			AccentColor:   "#06b6d4",
		},
		{
			ID:            "apex",
			Name:          "Apex Sovereign God Hive",
			Subtitle:      "Ultra high yield master miner with guaranteed 22.00 GRAM payout",
			Badge:         "🚀 GOD TIER (+83.3%)",
			CostGRAM:      12.00,
			ReturnGRAM:    22.00,
			ProfitGRAM:    10.00,
			ProfitPercent: 83.33,
			DurationHours: 24,
			MaxPerAccount: 0,
			IsLimited:     false,
			UserPurchased: 0,
			CanPurchase:   true,
			Icon:          "🔥",
			AccentColor:   "#ec4899",
		},
		{
			ID:            "matrix",
			Name:          "Infinite Mega Whale Matrix",
			Subtitle:      "The ultimate 24h plan — 2X DOUBLE YOUR TON in exactly 24 hours",
			Badge:         "🌌 2X DOUBLE PROFIT (100%)",
			CostGRAM:      25.00,
			ReturnGRAM:    50.00,
			ProfitGRAM:    25.00,
			ProfitPercent: 100.00,
			DurationHours: 24,
			MaxPerAccount: 0,
			IsLimited:     false,
			UserPurchased: 0,
			CanPurchase:   true,
			Icon:          "🌌",
			AccentColor:   "#eab308",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"plans":                 plans,
		"active_plans_count":    activeCount,
		"completed_plans_count": claimedCount,
		"total_locked_gram":     totalLocked,
		"total_earned_gram":     totalEarned,
		"can_buy_starter":       starterCount < 1,
	})
}

// GET /api/plans/my — Get all active & completed user plans with real-time timers
func (h *UserHandler) GetMyPlans(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	rows, err := h.userSvc.GetDB().Query(ctx,
		`SELECT id, user_id, plan_id, plan_name, cost_gram, return_gram, duration_seconds, status, started_at, matures_at, claimed_at, created_at
		 FROM user_plans 
		 WHERE user_id = $1 
		 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC 
		 LIMIT 50`,
		user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user plans"})
		return
	}
	defer rows.Close()

	now := time.Now().UTC()
	var userPlans []models.UserPlan

	for rows.Next() {
		var p models.UserPlan
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.PlanID, &p.PlanName, &p.CostGRAM, &p.ReturnGRAM,
			&p.DurationSeconds, &p.Status, &p.StartedAt, &p.MaturesAt, &p.ClaimedAt, &p.CreatedAt,
		); err != nil {
			continue
		}

		remSeconds := int(p.MaturesAt.Sub(now).Seconds())
		p.ProfitGRAM = p.ReturnGRAM - p.CostGRAM

		if p.Status == "claimed" {
			p.SecondsRemaining = 0
			p.ProgressPercent = 100.0
			p.IsReadyToClaim = false
		} else if remSeconds <= 0 {
			p.SecondsRemaining = 0
			p.ProgressPercent = 100.0
			p.IsReadyToClaim = true
		} else {
			p.SecondsRemaining = remSeconds
			elapsed := now.Sub(p.StartedAt).Seconds()
			totalSec := float64(p.DurationSeconds)
			if totalSec <= 0 {
				totalSec = 86400
			}
			prog := (elapsed / totalSec) * 100.0
			if prog < 0 {
				prog = 0
			}
			if prog > 99.9 {
				prog = 99.9
			}
			p.ProgressPercent = prog
			p.IsReadyToClaim = false
		}

		userPlans = append(userPlans, p)
	}

	if userPlans == nil {
		userPlans = []models.UserPlan{}
	}

	c.JSON(http.StatusOK, gin.H{"user_plans": userPlans})
}

type BuyPlanRequest struct {
	PlanID string `json:"plan_id" binding:"required"` // starter, standard, queen
}

// POST /api/plans/buy — Purchase a 24h Daily Yield Plan
func (h *UserHandler) BuyPlan(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var req BuyPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request, plan_id is required"})
		return
	}

	planID := strings.ToLower(strings.TrimSpace(req.PlanID))
	var planName string
	var costGRAM, returnGRAM float64
	var maxPerAccount int

	switch planID {
	case "starter":
		planName = "Starter Bee Miner"
		costGRAM = 0.70
		returnGRAM = 0.80
		maxPerAccount = 1
	case "standard":
		planName = "Standard Worker Miner"
		costGRAM = 1.30
		returnGRAM = 2.00
		maxPerAccount = 0
	case "queen":
		planName = "Royal Queen Miner"
		costGRAM = 3.00
		returnGRAM = 4.00
		maxPerAccount = 0
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plan_id. Available: starter, standard, queen"})
		return
	}

	tx, err := h.userSvc.GetDB().Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback(ctx)

	// Check 1-per-account limit for Starter plan
	if maxPerAccount > 0 {
		var pastPurchases int
		_ = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM user_plans WHERE user_id = $1 AND plan_id = $2`,
			user.ID, planID).Scan(&pastPurchases)

		if pastPurchases >= maxPerAccount {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("The %s is a special starter trial limited to %d purchase per account.", planName, maxPerAccount),
			})
			return
		}
	}

	var currentHoney float64
	err = tx.QueryRow(ctx, `SELECT honey_balance FROM users WHERE id = $1 FOR UPDATE`, user.ID).Scan(&currentHoney)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if currentHoney < costGRAM {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           fmt.Sprintf("Insufficient balance. %s requires %.2f GRAM. Your balance: %.4f GRAM.", planName, costGRAM, currentHoney),
			"required":        costGRAM,
			"current_balance": currentHoney,
			"needs_deposit":   true,
		})
		return
	}

	newHoney := currentHoney - costGRAM
	now := time.Now().UTC()
	durationSec := 86400 // 24 Hours
	maturesAt := now.Add(time.Duration(durationSec) * time.Second)
	newPlanID := uuid.New()

	// 1. Deduct user balance
	_, err = tx.Exec(ctx,
		`UPDATE users SET honey_balance = $1, updated_at = $2 WHERE id = $3`,
		newHoney, now, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user balance"})
		return
	}

	// 2. Insert into user_plans
	_, err = tx.Exec(ctx,
		`INSERT INTO user_plans (id, user_id, plan_id, plan_name, cost_gram, return_gram, duration_seconds, status, started_at, matures_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $8)`,
		newPlanID, user.ID, planID, planName, costGRAM, returnGRAM, durationSec, now, maturesAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user plan record"})
		return
	}

	// 3. Record transaction
	_, _ = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, 'plan_purchase', $3, 'GRAM', $4, $5)`,
		uuid.New(), user.ID, costGRAM, fmt.Sprintf("Activate %s (24h Yield Contract)", planName), now)

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit purchase transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"message":           fmt.Sprintf("🎉 Successfully activated %s! Your %.2f GRAM return unlocks in 24 hours.", planName, returnGRAM),
		"new_honey_balance": newHoney,
		"plan": models.UserPlan{
			ID:               newPlanID,
			UserID:           user.ID,
			PlanID:           planID,
			PlanName:         planName,
			CostGRAM:         costGRAM,
			ReturnGRAM:       returnGRAM,
			DurationSeconds:  durationSec,
			Status:           "active",
			StartedAt:        now,
			MaturesAt:        maturesAt,
			CreatedAt:        now,
			SecondsRemaining: durationSec,
			ProgressPercent:  0,
			IsReadyToClaim:   false,
			ProfitGRAM:       returnGRAM - costGRAM,
		},
	})
}

type ClaimPlanRequest struct {
	UserPlanID string `json:"user_plan_id" binding:"required"`
}

// POST /api/plans/claim — Claim earnings once 24h daily plan matures
func (h *UserHandler) ClaimPlan(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	ctx := c.Request.Context()

	var req ClaimPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request, user_plan_id is required"})
		return
	}

	planUUID, err := uuid.Parse(req.UserPlanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_plan_id format"})
		return
	}

	tx, err := h.userSvc.GetDB().Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback(ctx)

	var p models.UserPlan
	err = tx.QueryRow(ctx,
		`SELECT id, user_id, plan_id, plan_name, cost_gram, return_gram, status, matures_at
		 FROM user_plans 
		 WHERE id = $1 AND user_id = $2 
		 FOR UPDATE`,
		planUUID, user.ID).Scan(
		&p.ID, &p.UserID, &p.PlanID, &p.PlanName, &p.CostGRAM, &p.ReturnGRAM, &p.Status, &p.MaturesAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "plan contract not found"})
		return
	}

	if p.Status == "claimed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This plan has already been claimed."})
		return
	}

	now := time.Now().UTC()
	if now.Before(p.MaturesAt) {
		remSec := int(p.MaturesAt.Sub(now).Seconds())
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             fmt.Sprintf("Contract is still maturing. Please wait %d seconds.", remSec),
			"seconds_remaining": remSec,
		})
		return
	}

	// 1. Mark plan as claimed
	_, err = tx.Exec(ctx,
		`UPDATE user_plans SET status = 'claimed', claimed_at = $1 WHERE id = $2`,
		now, p.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update plan status"})
		return
	}

	// 2. Credit user honey_balance
	var newBalance float64
	err = tx.QueryRow(ctx,
		`UPDATE users 
		 SET honey_balance = honey_balance + $1, updated_at = $2 
		 WHERE id = $3 
		 RETURNING honey_balance`,
		p.ReturnGRAM, now, user.ID).Scan(&newBalance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to credit reward"})
		return
	}

	// 3. Record transaction
	_, _ = tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, 'plan_reward', $3, 'GRAM', $4, $5)`,
		uuid.New(), user.ID, p.ReturnGRAM, fmt.Sprintf("Claim Yield Contract (+%.2f GRAM %s)", p.ReturnGRAM, p.PlanName), now)

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit claim transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"message":           fmt.Sprintf("💰 Successfully claimed +%.2f GRAM from %s!", p.ReturnGRAM, p.PlanName),
		"claimed_gram":      p.ReturnGRAM,
		"new_honey_balance": newBalance,
		"user_plan_id":      p.ID,
	})
}




