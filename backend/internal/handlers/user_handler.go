package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"hashbee/internal/config"
	"hashbee/internal/middleware"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type UserHandler struct {
	cfg        *config.Config
	userSvc    *services.UserService
	referralSvc *services.ReferralService
}

func NewUserHandler(cfg *config.Config, userSvc *services.UserService, referralSvc *services.ReferralService, depositSvc *services.DepositService) *UserHandler {
	return &UserHandler{cfg: cfg, userSvc: userSvc, referralSvc: referralSvc, depositSvc: depositSvc}
}

// POST /api/auth — Validate initData, create/get user, return JWT + profile
func (h *UserHandler) Auth(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	u := user.(*models.User)

	// Handle referrer from query param (for first open)
	refParam := c.Query("referrer_id")
	if refParam == "" {
		refParam = c.Query("ref")
	}
	if refParam == "" {
		refParam = c.Query("start_param")
	}
	if refParam != "" && u.ReferrerID == nil {
		if tgID, err := strconv.ParseInt(refParam, 10, 64); err == nil && tgID != u.TelegramID {
			_ = h.referralSvc.SetReferrerByTelegramID(c.Request.Context(), u.ID, tgID)
		} else if refUUID, err := uuid.Parse(refParam); err == nil && refUUID != u.ID {
			_ = h.referralSvc.SetReferrer(c.Request.Context(), u.ID, refUUID)
		}
	}

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
