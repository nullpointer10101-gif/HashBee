package handlers

import (
	"context"
	"encoding/hex"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"hashbee/internal/bot"
	"hashbee/internal/config"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type BotBroadcaster interface {
	BroadcastRecipientsProgress(ctx context.Context, text string, buttonText, buttonURL string, recipients []bot.BroadcastRecipient, onProgress func(sent, failed, total int)) (int, int)
	BroadcastWithButton(ctx context.Context, text string, buttonText, buttonURL string, telegramIDs []int64) (int, int)
	BroadcastWithButtonProgress(ctx context.Context, text string, buttonText, buttonURL string, telegramIDs []int64, onProgress func(sent, failed, total int)) (int, int)
}

type AdminHandler struct {
	cfg         *config.Config
	db          *pgxpool.Pool
	userSvc     *services.UserService
	settings    *services.SettingsService
	campaignSvc *services.CampaignService
	withdrawSvc *services.WithdrawalService
	bot         BotBroadcaster
}

func NewAdminHandler(cfg *config.Config, db *pgxpool.Pool, userSvc *services.UserService, settings *services.SettingsService, campaignSvc *services.CampaignService, withdrawSvc *services.WithdrawalService, bot BotBroadcaster) *AdminHandler {
	return &AdminHandler{cfg: cfg, db: db, userSvc: userSvc, settings: settings, campaignSvc: campaignSvc, withdrawSvc: withdrawSvc, bot: bot}
}

// POST /api/admin/login
func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Email      string `json:"email"`
		Username   string `json:"username"`
		Identifier string `json:"identifier"`
		Password   string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Username)
	}
	if identifier == "" {
		identifier = strings.TrimSpace(req.Email)
	}
	if identifier == "" {
		identifier = "meela"
	}

	// Auto-seed meela admin if no admin users exist yet
	var count int
	_ = h.db.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM admin_users`).Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("meela"), bcrypt.DefaultCost)
		_, _ = h.db.Exec(c.Request.Context(),
			`INSERT INTO admin_users (id, email, password_hash, role, status, created_at, updated_at) VALUES ($1, 'meela', $2, 'super_admin', 'active', NOW(), NOW()) ON CONFLICT DO NOTHING`,
			uuid.New(), string(hash))
	}

	var admin models.AdminUser
	err := h.db.QueryRow(c.Request.Context(),
		`SELECT id, email, password_hash, role, status FROM admin_users WHERE (LOWER(email) = LOWER($1) OR (LOWER(email) = 'meela' AND LOWER($1) IN ('admin', 'meela', 'admin@hashbee.io'))) AND status = 'active' LIMIT 1`,
		identifier).Scan(&admin.ID, &admin.Email, &admin.PasswordHash, &admin.Role, &admin.Status)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	type AdminClaims struct {
		AdminID string `json:"admin_id"`
		Email   string `json:"email"`
		Role    string `json:"role"`
		jwt.RegisteredClaims
	}

	claims := AdminClaims{
		AdminID: admin.ID.String(),
		Email:   admin.Email,
		Role:    admin.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.cfg.AdminJWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": signed,
		"data": gin.H{
			"token": signed,
			"admin": gin.H{"id": admin.ID, "email": admin.Email, "role": admin.Role},
		},
		"admin": gin.H{"id": admin.ID, "email": admin.Email, "role": admin.Role},
	})
}

// GET /api/admin/dashboard
func (h *AdminHandler) Dashboard(c *gin.Context) {
	ctx := c.Request.Context()

	var stats struct {
		TotalUsers       int     `json:"total_users"`
		OnlineUsers      int     `json:"online_users"`
		DAU              int     `json:"dau"`
		MAU              int     `json:"mau"`
		NewUsersToday    int     `json:"new_users_today"`
		TotalBP          float64 `json:"total_bp"`
		TotalHoneyIssued float64 `json:"total_honey_issued"`
		PendingWithdrawals int   `json:"pending_withdrawals"`
		PendingWithdrawalValue float64 `json:"pending_withdrawal_value"`
		CampaignRevenue  float64 `json:"campaign_revenue"`
		TotalHoneyLiability float64 `json:"total_honey_liability"`
	}

	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE updated_at >= NOW() - INTERVAL '15 minutes'`).Scan(&stats.OnlineUsers)
	h.db.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '1 day'`).Scan(&stats.DAU)
	h.db.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days'`).Scan(&stats.MAU)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '1 day'`).Scan(&stats.NewUsersToday)
	h.db.QueryRow(ctx, `SELECT COALESCE(SUM(bp), 0) FROM users`).Scan(&stats.TotalBP)
	h.db.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'collect' AND currency = 'HONEY'`).Scan(&stats.TotalHoneyIssued)
	h.db.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'pending'`).Scan(&stats.PendingWithdrawals, &stats.PendingWithdrawalValue)
	h.db.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'campaign_payment' AND currency = 'HONEY' AND amount < 0`).Scan(&stats.CampaignRevenue)
	h.db.QueryRow(ctx, `SELECT COALESCE(SUM(honey_balance), 0) FROM users`).Scan(&stats.TotalHoneyLiability)

	c.JSON(http.StatusOK, stats)
}

// GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")
	sort := c.Query("sort")
	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, _ := strconv.Atoi(l); v > 0 && v <= 1000 {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, _ := strconv.Atoi(o); v >= 0 {
			offset = v
		}
	}

	users, total, err := h.userSvc.AdminGetUsers(c.Request.Context(), search, status, sort, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users, "total": total})
}

// PATCH /api/admin/users/:id/status
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	adminID := c.GetString("admin_id")
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := map[string]bool{"active": true, "banned": true, "flagged": true}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	_, err = h.db.Exec(c.Request.Context(),
		`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`, req.Status, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	// Audit log
	adminUUID, _ := uuid.Parse(adminID)
	targetType := "user"
	h.db.Exec(c.Request.Context(),
		`INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, ip_address, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		uuid.New(), adminUUID, "update_user_status_"+req.Status, targetType, userID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "User status updated"})
}

// PATCH /api/admin/users/:id/balance
func (h *AdminHandler) AdjustBalance(c *gin.Context) {
	adminID := c.GetString("admin_id")
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Type   string  `json:"type" binding:"required"` // honey, bp
		Amount float64 `json:"amount" binding:"required"`
		Reason string  `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	tx, _ := h.db.Begin(ctx)
	defer tx.Rollback(ctx)

	switch req.Type {
	case "honey":
		tx.Exec(ctx, `UPDATE users SET honey_balance = honey_balance + $1, updated_at = NOW() WHERE id = $2`, req.Amount, userID)
	case "bp":
		tx.Exec(ctx, `UPDATE users SET bp = bp + $1, updated_at = NOW() WHERE id = $2`, req.Amount, userID)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be honey or bp"})
		return
	}

	currency := "HONEY"
	if req.Type == "bp" {
		currency = "BP"
	}
	adminUUID, _ := uuid.Parse(adminID)
	desc := "Admin adjustment: " + req.Reason
	tx.Exec(ctx,
		`INSERT INTO transactions (id, user_id, type, amount, currency, description, created_at)
		 VALUES ($1, $2, 'adjustment', $3, $4, $5, NOW())`,
		uuid.New(), userID, req.Amount, currency, desc)

	// Audit log
	targetType := "user"
	tx.Exec(ctx,
		`INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, ip_address, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		uuid.New(), adminUUID, "adjust_balance", targetType, userID, c.ClientIP())

	tx.Commit(ctx)
	c.JSON(http.StatusOK, gin.H{"message": "Balance adjusted"})
}

// GET /api/admin/users/:id/details
func (h *AdminHandler) GetUserDetail(c *gin.Context) {
	param := strings.TrimSpace(c.Param("id"))
	if param == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user id required"})
		return
	}

	ctx := c.Request.Context()
	var u models.User
	var err error

	if uid, errParse := uuid.Parse(param); errParse == nil {
		err = h.db.QueryRow(ctx, `
			SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance, spin_balance,
			       last_collect_at, streak_count, last_checkin_at, status, has_collected, has_completed_mission,
			       last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
			FROM users WHERE id = $1 LIMIT 1`, uid).Scan(
			&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.SpinBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	} else if tgID, errTg := strconv.ParseInt(param, 10, 64); errTg == nil {
		err = h.db.QueryRow(ctx, `
			SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance, spin_balance,
			       last_collect_at, streak_count, last_checkin_at, status, has_collected, has_completed_mission,
			       last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
			FROM users WHERE telegram_id = $1 LIMIT 1`, tgID).Scan(
			&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.SpinBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	} else {
		err = h.db.QueryRow(ctx, `
			SELECT id, telegram_id, username, first_name, language, referrer_id, bp, honey_balance, spin_balance,
			       last_collect_at, streak_count, last_checkin_at, status, has_collected, has_completed_mission,
			       last_hive_full_notified_at, opted_out_notifications, created_at, updated_at
			FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`, param).Scan(
			&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.SpinBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// 1. Fetch referrer info
	type ReferrerInfo struct {
		ID         uuid.UUID `json:"id"`
		TelegramID int64     `json:"telegram_id"`
		Username   string    `json:"username"`
		FirstName  string    `json:"first_name"`
		CreatedAt  time.Time `json:"created_at"`
	}
	var referrer *ReferrerInfo
	if u.ReferrerID != nil {
		var ref ReferrerInfo
		err := h.db.QueryRow(ctx, `SELECT id, telegram_id, username, first_name, created_at FROM users WHERE id = $1`, *u.ReferrerID).
			Scan(&ref.ID, &ref.TelegramID, &ref.Username, &ref.FirstName, &ref.CreatedAt)
		if err == nil {
			referrer = &ref
		}
	}

	// 2. Fetch Direct Referrals
	type DirectReferral struct {
		ID                  uuid.UUID `json:"id"`
		TelegramID          int64     `json:"telegram_id"`
		Username            string    `json:"username"`
		FirstName           string    `json:"first_name"`
		BP                  float64   `json:"bp"`
		HoneyBalance        float64   `json:"honey_balance"`
		Status              string    `json:"status"`
		HasCollected        bool      `json:"has_collected"`
		HasCompletedMission bool      `json:"has_completed_mission"`
		CreatedAt           time.Time `json:"created_at"`
	}
	referrals := make([]DirectReferral, 0)
	var totalReferrals int
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE referrer_id = $1`, u.ID).Scan(&totalReferrals)

	refRows, err := h.db.Query(ctx, `
		SELECT id, telegram_id, username, first_name, bp, honey_balance, status, has_collected, has_completed_mission, created_at
		FROM users WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 50`, u.ID)
	if err == nil {
		defer refRows.Close()
		for refRows.Next() {
			var dr DirectReferral
			if err := refRows.Scan(&dr.ID, &dr.TelegramID, &dr.Username, &dr.FirstName, &dr.BP, &dr.HoneyBalance, &dr.Status, &dr.HasCollected, &dr.HasCompletedMission, &dr.CreatedAt); err == nil {
				referrals = append(referrals, dr)
			}
		}
	}
	u.ReferralCount = totalReferrals

	// 3. Fetch Deposits / Purchases breakdown
	type DepositItem struct {
		ID          uuid.UUID `json:"id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Currency    string    `json:"currency"`
		Description *string   `json:"description"`
		CreatedAt   time.Time `json:"created_at"`
	}
	deposits := make([]DepositItem, 0)
	var totalDepositedTON float64
	var totalDepositedStars float64
	var totalDepositedGRAM float64
	var totalDepositedUSD float64

	depRows, err := h.db.Query(ctx, `
		SELECT id, type, amount, currency, description, created_at
		FROM transactions
		WHERE user_id = $1 AND (type ILIKE '%deposit%' OR type ILIKE '%purchase%' OR type ILIKE '%ton%' OR type ILIKE '%star%' OR type = 'bp_purchase' OR type = 'reinvest')
		ORDER BY created_at DESC LIMIT 50`, u.ID)
	if err == nil {
		defer depRows.Close()
		for depRows.Next() {
			var d DepositItem
			if err := depRows.Scan(&d.ID, &d.Type, &d.Amount, &d.Currency, &d.Description, &d.CreatedAt); err == nil {
				deposits = append(deposits, d)
				// Only accumulate genuine deposits (not in-app crate purchases, crate rewards, or internal reinvestments)
				if (d.Type == "deposit" || d.Type == "campaign_payment" || d.Type == "deposit_balance") && strings.ToUpper(d.Currency) != "BP" {
					switch strings.ToUpper(d.Currency) {
					case "TON":
						totalDepositedTON += d.Amount
					case "STARS", "STAR":
						totalDepositedStars += d.Amount
					case "GRAM":
						totalDepositedGRAM += d.Amount
					case "USD", "USDT":
						totalDepositedUSD += d.Amount
					}
				}
			}
		}
	}

	// 4. Fetch Withdrawals
	withdrawals := make([]models.Withdrawal, 0)
	var totalWithdrawnHoney float64
	var totalWithdrawnUSD float64
	wRows, err := h.db.Query(ctx, `
		SELECT id, user_id, address, network, amount, honey_amount, fee, status, tx_hash, reason, processed_by, created_at, updated_at
		FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, u.ID)
	if err == nil {
		defer wRows.Close()
		for wRows.Next() {
			var w models.Withdrawal
			if err := wRows.Scan(&w.ID, &w.UserID, &w.Address, &w.Network, &w.Amount, &w.HoneyAmount, &w.Fee, &w.Status, &w.TxHash, &w.Reason, &w.ProcessedBy, &w.CreatedAt, &w.UpdatedAt); err == nil {
				withdrawals = append(withdrawals, w)
				if w.Status == "paid" || w.Status == "approved" {
					totalWithdrawnHoney += w.HoneyAmount
					totalWithdrawnUSD += w.Amount
				}
			}
		}
	}

	// 5. Fetch Recent Transactions
	txRows, err := h.db.Query(ctx, `
		SELECT id, type, amount, currency, description, created_at
		FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, u.ID)
	recentTransactions := make([]DepositItem, 0)
	if err == nil {
		defer txRows.Close()
		for txRows.Next() {
			var t DepositItem
			if err := txRows.Scan(&t.ID, &t.Type, &t.Amount, &t.Currency, &t.Description, &t.CreatedAt); err == nil {
				recentTransactions = append(recentTransactions, t)
			}
		}
	}

	// 6. Fetch Completed Missions
	type CompletedMission struct {
		ID         uuid.UUID  `json:"id"`
		Title      string     `json:"title"`
		Type       string     `json:"type"`
		RewardBP   float64    `json:"reward_bp"`
		Status     string     `json:"status"`
		VerifiedAt *time.Time `json:"verified_at"`
		CreatedAt  time.Time  `json:"created_at"`
	}
	completedMissions := make([]CompletedMission, 0)
	mRows, err := h.db.Query(ctx, `
		SELECT m.id, m.title, m.type, m.reward_bp, mc.status, mc.verified_at, mc.created_at
		FROM mission_completions mc
		JOIN missions m ON m.id = mc.mission_id
		WHERE mc.user_id = $1 ORDER BY mc.created_at DESC LIMIT 50`, u.ID)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var cm CompletedMission
			if err := mRows.Scan(&cm.ID, &cm.Title, &cm.Type, &cm.RewardBP, &cm.Status, &cm.VerifiedAt, &cm.CreatedAt); err == nil {
				completedMissions = append(completedMissions, cm)
			}
		}
	}

	// 7. Live Hive State
	hive := h.userSvc.ComputeHiveStatus(ctx, &u)

	c.JSON(http.StatusOK, gin.H{
		"user":                  u,
		"hive":                  hive,
		"referrer":              referrer,
		"referrals":             referrals,
		"total_referrals":       totalReferrals,
		"deposits":              deposits,
		"total_deposited_ton":   totalDepositedTON,
		"total_deposited_stars": totalDepositedStars,
		"total_deposited_gram":  totalDepositedGRAM,
		"total_deposited_usd":   totalDepositedUSD,
		"withdrawals":           withdrawals,
		"total_withdrawn_honey": totalWithdrawnHoney,
		"total_withdrawn_usd":   totalWithdrawnUSD,
		"transactions":          recentTransactions,
		"missions":              completedMissions,
	})
}

// POST /api/admin/users/:id/message
func (h *AdminHandler) SendDirectMessage(c *gin.Context) {
	adminID := c.GetString("admin_id")
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Message    string `json:"message" binding:"required"`
		ButtonText string `json:"button_text"`
		ButtonURL  string `json:"button_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var tgID int64
	var firstName string
	err = h.db.QueryRow(c.Request.Context(), `SELECT telegram_id, first_name FROM users WHERE id = $1`, userID).Scan(&tgID, &firstName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if tgID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user has no telegram id"})
		return
	}

	if h.bot == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "telegram bot is not configured"})
		return
	}

	btnText := strings.TrimSpace(req.ButtonText)
	if btnText == "" {
		btnText = "🐝 Open HashBee App"
	}
	btnURL := strings.TrimSpace(req.ButtonURL)
	if btnURL == "" {
		btnURL = h.cfg.MiniAppURL
		if btnURL == "" {
			btnURL = "https://miniapp-five-topaz.vercel.app"
		}
	}

	msgText := strings.ReplaceAll(req.Message, "{name}", firstName)
	sent, failed := h.bot.BroadcastWithButton(c.Request.Context(), msgText, btnText, btnURL, []int64{tgID})

	// Log audit
	adminUUID, _ := uuid.Parse(adminID)
	targetType := "user"
	h.db.Exec(c.Request.Context(),
		`INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, ip_address, created_at)
		 VALUES ($1, $2, 'direct_message', $3, $4, $5, NOW())`,
		uuid.New(), adminUUID, targetType, userID, c.ClientIP())

	if sent > 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Message sent directly to user Telegram!"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "Telegram attempt finished (user may have blocked bot)", "sent": sent, "failed": failed})
	}
}

// POST /api/admin/users/:id/reset-streak
func (h *AdminHandler) ResetStreak(c *gin.Context) {
	adminID := c.GetString("admin_id")
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		StreakCount int `json:"streak_count"`
	}
	_ = c.ShouldBindJSON(&req)

	_, err = h.db.Exec(c.Request.Context(), `UPDATE users SET streak_count = $1, last_checkin_at = NULL, updated_at = NOW() WHERE id = $2`, req.StreakCount, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset streak"})
		return
	}

	adminUUID, _ := uuid.Parse(adminID)
	targetType := "user"
	h.db.Exec(c.Request.Context(),
		`INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, ip_address, created_at)
		 VALUES ($1, $2, 'reset_streak', $3, $4, $5, NOW())`,
		uuid.New(), adminUUID, targetType, userID, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "User streak updated successfully"})
}

// GET /api/admin/withdrawals
func (h *AdminHandler) ListWithdrawals(c *gin.Context) {
	status := c.Query("status")
	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, _ := strconv.Atoi(l); v > 0 {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, _ := strconv.Atoi(o); v >= 0 {
			offset = v
		}
	}

	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1
	if status != "" {
		where += " AND w.status = $" + strconv.Itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	args = append(args, limit, offset)
	rows, err := h.db.Query(c.Request.Context(),
		`SELECT w.id, w.user_id, u.username, u.first_name, u.telegram_id,
		        w.address, w.network, w.amount, w.honey_amount, w.fee, w.status, w.tx_hash, w.reason, w.created_at, w.updated_at
		 FROM withdrawals w JOIN users u ON u.id = w.user_id
		 `+where+` ORDER BY w.created_at DESC LIMIT $`+strconv.Itoa(argIdx)+` OFFSET $`+strconv.Itoa(argIdx+1), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type WithdrawalRow struct {
		models.Withdrawal
		Username   string `json:"username"`
		FirstName  string `json:"first_name"`
		TelegramID int64  `json:"telegram_id"`
	}

	var withdrawals []WithdrawalRow
	for rows.Next() {
		var w WithdrawalRow
		rows.Scan(&w.ID, &w.UserID, &w.Username, &w.FirstName, &w.TelegramID,
			&w.Address, &w.Network, &w.Amount, &w.HoneyAmount, &w.Fee, &w.Status, &w.TxHash, &w.Reason, &w.CreatedAt, &w.UpdatedAt)
		withdrawals = append(withdrawals, w)
	}

	c.JSON(http.StatusOK, gin.H{"withdrawals": withdrawals})
}

// PATCH /api/admin/withdrawals/:id
func (h *AdminHandler) UpdateWithdrawal(c *gin.Context) {
	adminID := c.GetString("admin_id")
	wID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid withdrawal id"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
		TxHash string `json:"tx_hash"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := map[string]bool{"processing": true, "paid": true, "approved": true, "rejected": true}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	ctx := c.Request.Context()
	adminUUID, _ := uuid.Parse(adminID)

	// Fetch withdrawal and user details before updating
	var (
		targetUserID     uuid.UUID
		targetTelegramID int64
		targetFirstName  string
		targetAmount     float64
		targetNetwork    string
		targetAddress    string
		honeyAmount      float64
		currentStatus    string
	)

	err = h.db.QueryRow(ctx,
		`SELECT w.user_id, u.telegram_id, u.first_name, w.amount, w.network, w.address, w.honey_amount, w.status
		 FROM withdrawals w
		 JOIN users u ON u.id = w.user_id
		 WHERE w.id = $1`, wID).
		Scan(&targetUserID, &targetTelegramID, &targetFirstName, &targetAmount, &targetNetwork, &targetAddress, &honeyAmount, &currentStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "withdrawal not found"})
		return
	}

	// If rejecting, refund the honey
	if req.Status == "rejected" {
		tx, _ := h.db.Begin(ctx)
		defer tx.Rollback(ctx)

		if currentStatus != "pending" && currentStatus != "processing" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "withdrawal not in pending/processing state"})
			return
		}

		// Refund honey
		tx.Exec(ctx, `UPDATE users SET honey_balance = honey_balance + $1, updated_at = NOW() WHERE id = $2`, honeyAmount, targetUserID)
		tx.Exec(ctx,
			`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, description, created_at)
			 VALUES ($1, $2, 'adjustment', $3, 'HONEY', $4, 'Withdrawal rejected - refund', NOW())`,
			uuid.New(), targetUserID, honeyAmount, wID)
		tx.Exec(ctx,
			`UPDATE withdrawals SET status = $1, reason = $2, processed_by = $3, updated_at = NOW() WHERE id = $4`,
			req.Status, req.Reason, adminUUID, wID)
		tx.Commit(ctx)
	} else {
		h.db.Exec(ctx,
			`UPDATE withdrawals SET status = $1, tx_hash = $2, reason = $3, processed_by = $4, updated_at = NOW() WHERE id = $5`,
			req.Status, req.TxHash, req.Reason, adminUUID, wID)
	}

	// Send instant Telegram notification to the user
	if h.bot != nil && targetTelegramID != 0 {
		go func(tgID int64, name, status, network, address, txHash, reason string, amount float64) {
			appURL := h.cfg.MiniAppURL
			if appURL == "" {
				appURL = "https://miniapp-five-topaz.vercel.app"
			}

			var notifyText string
			var btnText string
			if status == "paid" || status == "approved" {
				txInfo := ""
				if txHash != "" {
					txInfo = fmt.Sprintf("\n🔗 *Tx Hash:* `%s`\n", txHash)
				}
				btnText = "🐝 Open HashBee Miner"
				notifyText = fmt.Sprintf(`🎉 *CONGRATULATIONS! WITHDRAWAL APPROVED & PAID!* 💸

💰 *Amount Sent:* *%.4f %s*
💼 *Destination Wallet:*
`+"`%s`"+`
%s
⚡ *Status:* *COMPLETED & PAID* ✅

🚀 *Your funds have been transferred successfully!* Thank you for mining with HashBee. Keep your hive active, boost your GHS speed, and invite friends to multiply your earnings! 🐝`,
					amount, network, address, txInfo)
			} else if status == "rejected" {
				btnText = "🐝 Open HashBee Miner"
				refReason := reason
				if refReason == "" {
					refReason = "Admin review declined"
				}
				notifyText = fmt.Sprintf(`⚠️ *Withdrawal Request Declined*

Your withdrawal request for *%.4f %s* was not approved and the honey has been *refunded back to your balance*.

📝 *Reason:* %s

🐝 Open HashBee to check your balance and continue mining.`,
					amount, network, refReason)
			}

			if notifyText != "" {
				h.bot.BroadcastWithButton(context.Background(), notifyText, btnText, appURL, []int64{tgID})
			}
		}(targetTelegramID, targetFirstName, req.Status, targetNetwork, targetAddress, req.TxHash, req.Reason, targetAmount)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal updated and user notified"})
}

// GET /api/admin/settings
func (h *AdminHandler) GetSettings(c *gin.Context) {
	settings, err := h.settings.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// PUT /api/admin/settings
func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	var req struct {
		Settings map[string]string `json:"settings" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	for k, v := range req.Settings {
		if err := h.settings.Set(ctx, k, v); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update " + k})
			return
		}
	}

	// Audit log
	adminID := c.GetString("admin_id")
	adminUUID, _ := uuid.Parse(adminID)
	h.db.Exec(ctx,
		`INSERT INTO audit_logs (id, admin_id, action, ip_address, created_at) VALUES ($1, $2, $3, $4, NOW())`,
		uuid.New(), adminUUID, "update_settings", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}

// GET /api/admin/campaigns
func (h *AdminHandler) ListCampaigns(c *gin.Context) {
	status := c.Query("status")
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, _ := strconv.Atoi(l); v > 0 {
			limit = v
		}
	}
	offset := 0
	if o := c.Query("offset"); o != "" {
		if v, _ := strconv.Atoi(o); v >= 0 {
			offset = v
		}
	}

	campaigns, total, err := h.campaignSvc.AdminListCampaigns(c.Request.Context(), status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns, "total": total})
}

// PATCH /api/admin/campaigns/:id
func (h *AdminHandler) UpdateCampaign(c *gin.Context) {
	cID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req struct {
		Status           string `json:"status"`
		AdminNotes       string `json:"admin_notes"`
		DoneCompletions  *int   `json:"done_completions"`
		TotalCompletions *int   `json:"total_completions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	if req.DoneCompletions != nil {
		h.db.Exec(ctx, `UPDATE campaigns SET done_completions = $1, updated_at = NOW() WHERE id = $2`, *req.DoneCompletions, cID)
	}
	if req.TotalCompletions != nil {
		h.db.Exec(ctx, `UPDATE campaigns SET total_completions = $1, updated_at = NOW() WHERE id = $2`, *req.TotalCompletions, cID)
	}

	if req.Status != "" {
		h.db.Exec(ctx,
			`UPDATE campaigns SET status = $1, admin_notes = COALESCE(NULLIF($2,''), admin_notes), updated_at = NOW() WHERE id = $3`,
			req.Status, req.AdminNotes, cID)

		if req.Status == "completed" || req.Status == "finished" || req.Status == "cancelled" {
			h.db.Exec(ctx, `UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1`, cID)
		} else if req.Status == "cancelled" {
			h.db.Exec(ctx, `UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1`, cID)
		} else if req.Status == "active" {
			res, _ := h.db.Exec(ctx, `UPDATE missions SET status = 'active', updated_at = NOW() WHERE campaign_id = $1`, cID)
			if res.RowsAffected() == 0 {
				var c2 models.Campaign
				if err := h.db.QueryRow(ctx,
					`SELECT id, type, target, title, reward_bp FROM campaigns WHERE id = $1`, cID).
					Scan(&c2.ID, &c2.Type, &c2.Target, &c2.Title, &c2.RewardBP); err == nil {
					h.db.Exec(ctx,
						`INSERT INTO missions (id, type, target, title, reward_bp, campaign_id, sort_order, status, created_at, updated_at)
						 VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', NOW(), NOW())
						 ON CONFLICT DO NOTHING`,
						uuid.New(), c2.Type, c2.Target, c2.Title, c2.RewardBP, c2.ID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign updated"})
}

// GET /api/admin/fraud
func (h *AdminHandler) ListFraudFlags(c *gin.Context) {
	resolved := c.Query("resolved") == "true"
	rows, err := h.db.Query(c.Request.Context(),
		`SELECT f.id, f.user_id, u.username, u.first_name, u.telegram_id, f.reason, f.resolved, f.created_at
		 FROM fraud_flags f JOIN users u ON u.id = f.user_id
		 WHERE f.resolved = $1 ORDER BY f.created_at DESC LIMIT 100`, resolved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type FlagRow struct {
		ID         uuid.UUID `json:"id"`
		UserID     uuid.UUID `json:"user_id"`
		Username   string    `json:"username"`
		FirstName  string    `json:"first_name"`
		TelegramID int64     `json:"telegram_id"`
		Reason     string    `json:"reason"`
		Resolved   bool      `json:"resolved"`
		CreatedAt  time.Time `json:"created_at"`
	}

	var flags []FlagRow
	for rows.Next() {
		var f FlagRow
		rows.Scan(&f.ID, &f.UserID, &f.Username, &f.FirstName, &f.TelegramID, &f.Reason, &f.Resolved, &f.CreatedAt)
		flags = append(flags, f)
	}

	c.JSON(http.StatusOK, gin.H{"flags": flags})
}

// POST /api/admin/campaigns - Create a campaign directly from Admin (active immediately)
func (h *AdminHandler) CreateCampaign(c *gin.Context) {
	var req struct {
		Type             string  `json:"type" binding:"required"`
		Target           string  `json:"target" binding:"required"`
		Title            string  `json:"title"`
		TotalCompletions int     `json:"total_completions"`
		RewardBP         float64 `json:"reward_bp"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TotalCompletions <= 0 {
		req.TotalCompletions = 100
	}
	if req.RewardBP <= 0 {
		req.RewardBP = 0.1
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = req.Target
	}

	ctx := c.Request.Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var ownerID uuid.UUID
	_ = tx.QueryRow(ctx, `SELECT id FROM users LIMIT 1`).Scan(&ownerID)
	if ownerID == uuid.Nil {
		ownerID = uuid.New()
	}

	campID := uuid.New()
	cost := float64(req.TotalCompletions) * 0.001
	memo := "ADMIN_" + hex.EncodeToString(campID[:4])

	_, err = tx.Exec(ctx,
		`INSERT INTO campaigns (id, owner_user_id, type, target, title, total_completions, done_completions, reward_bp, cost, status, verification_type, payment_memo, admin_notes, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'active', 'timer', $9, 'Created via Admin Panel', NOW(), NOW())`,
		campID, ownerID, req.Type, req.Target, title, req.TotalCompletions, req.RewardBP, cost, memo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create campaign: " + err.Error()})
		return
	}

	icon := "link"
	if req.Type == "channel" || req.Type == "group" {
		icon = "users"
	} else if req.Type == "bot" {
		icon = "bot"
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO missions (id, type, target, title, description, reward_bp, campaign_id, sort_order, status, is_official, icon_url, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, '+0.1 GHS', $5, $6, 20, 'active', true, $7, NOW(), NOW())`,
		uuid.New(), req.Type, req.Target, title, req.RewardBP, campID, icon)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create mission: " + err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign created and published to missions!", "id": campID})
}

// DELETE /api/admin/campaigns/:id - Delete a campaign and remove from missions
func (h *AdminHandler) DeleteCampaign(c *gin.Context) {
	cID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	_, _ = tx.Exec(ctx, `DELETE FROM mission_completions WHERE mission_id IN (SELECT id FROM missions WHERE campaign_id = $1)`, cID)
	_, _ = tx.Exec(ctx, `DELETE FROM missions WHERE campaign_id = $1`, cID)
	_, err = tx.Exec(ctx, `DELETE FROM campaigns WHERE id = $1`, cID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete: " + err.Error()})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign and mission deleted successfully"})
}

type BroadcastJobStatus struct {
	IsRunning   bool      `json:"is_running"`
	Total       int       `json:"total"`
	Sent        int       `json:"sent"`
	Failed      int       `json:"failed"`
	Done        int       `json:"done"`
	Percent     int       `json:"percent"`
	Message     string    `json:"message"`
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

var (
	broadcastMu     sync.RWMutex
	broadcastStatus = BroadcastJobStatus{}
)

// GET /api/admin/broadcast/status - Check real-time progress of running broadcast
func (h *AdminHandler) GetBroadcastStatus(c *gin.Context) {
	broadcastMu.RLock()
	defer broadcastMu.RUnlock()
	c.JSON(http.StatusOK, broadcastStatus)
}

// POST /api/admin/spin-reset — Permanently reset spin epoch: only referrals from NOW onwards grant spins
func (h *AdminHandler) SpinReset(c *gin.Context) {
	ctx := c.Request.Context()
	now := time.Now().UTC().Format(time.RFC3339)

	// Save epoch to settings table
	err := h.settings.Set(ctx, "spin_epoch", now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set spin_epoch: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "✅ Spin epoch reset! Only referrals from NOW onwards will grant spins.",
		"spin_epoch": now,
	})
}

// GET /api/spin-epoch — Returns the current spin epoch timestamp (public, used by miniapp)
func (h *AdminHandler) GetSpinEpoch(c *gin.Context) {
	ctx := c.Request.Context()
	epoch, err := h.settings.Get(ctx, "spin_epoch")
	if err != nil || epoch == "" {
		// Default epoch: app launch (very old, allow all)
		epoch = "2026-09-26T00:00:00Z"
	}
	c.JSON(http.StatusOK, gin.H{"spin_epoch": epoch})
}

// POST /api/admin/broadcast - Send rich template broadcast with inline WebApp button in background
func (h *AdminHandler) Broadcast(c *gin.Context) {
	broadcastMu.Lock()
	if broadcastStatus.IsRunning {
		broadcastMu.Unlock()
		c.JSON(http.StatusConflict, gin.H{"error": "A broadcast is already running. Please wait for it to complete."})
		return
	}
	broadcastMu.Unlock()

	var req struct {
		Message          string `json:"message" binding:"required"`
		ButtonText       string `json:"button_text"`
		ButtonURL        string `json:"button_url"`
		TargetTelegramID int64  `json:"target_telegram_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ButtonText == "" {
		req.ButtonText = "🐝 Open HashBee App"
	}
	if req.ButtonURL == "" {
		req.ButtonURL = "https://miniapp-five-topaz.vercel.app"
	}

	var recipients []bot.BroadcastRecipient
	if req.TargetTelegramID > 0 {
		var fn string
		_ = h.db.QueryRow(c.Request.Context(), `SELECT COALESCE(first_name, username, '') FROM users WHERE telegram_id = $1`, req.TargetTelegramID).Scan(&fn)
		recipients = append(recipients, bot.BroadcastRecipient{TelegramID: req.TargetTelegramID, FirstName: fn})
	} else {
		rows, err := h.db.Query(c.Request.Context(), `SELECT DISTINCT telegram_id, COALESCE(first_name, username, '') FROM users WHERE telegram_id > 0 AND (status IS NULL OR status != 'banned')`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users: " + err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int64
			var fn string
			if err := rows.Scan(&id, &fn); err == nil && id > 0 {
				recipients = append(recipients, bot.BroadcastRecipient{TelegramID: id, FirstName: fn})
			}
		}
	}

	total := len(recipients)
	if total == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active users found to broadcast"})
		return
	}

	broadcastMu.Lock()
	broadcastStatus = BroadcastJobStatus{
		IsRunning: true,
		Total:     total,
		Sent:      0,
		Failed:    0,
		Done:      0,
		Percent:   0,
		Message:   "Broadcast in progress...",
		StartedAt: time.Now(),
	}
	broadcastMu.Unlock()

	// Launch background broadcast
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
		defer cancel()

		if h.bot != nil {
			sent, failed := h.bot.BroadcastRecipientsProgress(ctx, req.Message, req.ButtonText, req.ButtonURL, recipients, func(s, f, t int) {
				broadcastMu.Lock()
				done := s + f
				pct := 0
				if t > 0 {
					pct = (done * 100) / t
				}
				broadcastStatus.Sent = s
				broadcastStatus.Failed = f
				broadcastStatus.Done = done
				broadcastStatus.Percent = pct
				broadcastMu.Unlock()
			})

			broadcastMu.Lock()
			broadcastStatus.IsRunning = false
			broadcastStatus.Sent = sent
			broadcastStatus.Failed = failed
			broadcastStatus.Done = sent + failed
			broadcastStatus.Percent = 100
			broadcastStatus.CompletedAt = time.Now()
			broadcastStatus.Message = fmt.Sprintf("Completed: %d sent, %d failed out of %d", sent, failed, total)
			broadcastMu.Unlock()
		} else {
			broadcastMu.Lock()
			broadcastStatus.IsRunning = false
			broadcastStatus.Message = "Bot is offline"
			broadcastMu.Unlock()
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("🚀 Broadcast started for %d users in background!", total),
		"total":   total,
		"status":  "running",
	})
}

type AutoBroadcastTemplate struct {
	Key        string `json:"key"`
	Message    string `json:"message"`
	ButtonText string `json:"button_text"`
	ButtonURL  string `json:"button_url"`
}

var RotatingBroadcastTemplates = []AutoBroadcastTemplate{
	{
		Key: "crate_god_jackpot",
		Message: `⚡ *CYBER GOD 25.0 GRAM JACKPOT UNLOCKED!* 👁️🔥

Miners are pulling 99 OVR Football Cards & +25.00 GRAM Supreme Drops!
💎 Pure GRAM Token Instant Drops
⚽ FIFA-Style Pack Walkouts
👑 Guaranteed Top Drop within 2-3 Opens!

Payment Verified ✅
Instant TON Blockchain Transfer Confirmed!

👇 Open your Cyber God Pack now:`,
		ButtonText: "👁️ Unlock Cyber God Pack 👑",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
	{
		Key: "crate_bronze_hash",
		Message: `📦 *0.5 GRAM MINER PACK: 1.00 GRAM TOP PRIZE!* ⚡

Supercharge your cloud mining for just 0.50 GRAM!
⚡ Win +25 GHS to +100 GHS Permanent Hashpower
💎 Top Prize: +1.00 GRAM Direct Payout!

Payment Verified ✅
Guaranteed Hashrate & GRAM Drops on Every Open!

👇 Tap below to unlock:`,
		ButtonText: "📦 Open 0.5 G Miner Pack 🚀",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
	{
		Key: "payouts_completed",
		Message: `💸 *DAILY WITHDRAWALS PROCESSED & CREDITED!* 💎🎉

Over 450+ Miner Payouts have been dispatched to TON Wallets!
Check your wallet or withdraw your mined GRAM right now!

Payment Verified ✅
Status: 100% On-Chain Confirmed

👇 Check your balance & withdraw:`,
		ButtonText: "💎 Check Balance & Payouts 💸",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
	{
		Key: "fever_2x_rush",
		Message: `🔥 *15-MIN LUCKY FEVER ACTIVE: 2X JACKPOT RUSH!* ⏱️⚡

Drop rates for 96+ OVR Football Cards & GRAM Jackpots are DOUBLED!
• 🥉 Bronze ➔ +1.00 G + 100 GHS
• 🥈 Silver ➔ +5.00 G Mega Drop
• 👑 Gold ➔ +10.00 G VIP Drop
• 👁️ Cyber God ➔ +25.00 G Supreme Drop

Payment Verified ✅
Instant Credit Direct to Account!

👇 Claim 2X Fever Luck:`,
		ButtonText: "🔥 Claim 2X Lucky Fever ⚡",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
	{
		Key: "spin_viral_referrals",
		Message: `👥 *UNLIMITED FREE SPINS & REWARDS!* 🚀💎

Every single friend you invite gives you:
🎁 +1 Free Spin on the Lucky Honey Wheel
⚡ +3 GHS Permanent Mining Speed

Payment Verified ✅
100% Real Instant Withdrawals!

👇 Invite friends & spin:`,
		ButtonText: "👥 Get Free Spins & Mine 🚀",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
	{
		Key: "personalized_buzz",
		Message: `🐝 *HEY {name}, YOUR HONEYCOMB IS AT FULL CAPACITY!* 🍯⚡

Your bees have mined maximum GRAM rewards!
Collect now before your honeycomb storage fills up.

Payment Verified ✅
Direct One-Tap Harvest!

👇 Collect your earnings:`,
		ButtonText: "🐝 Collect My GRAM Now 🚀",
		ButtonURL:  "https://miniapp-five-topaz.vercel.app",
	},
}

// GET /api/admin/auto-broadcast - Get automated broadcast configuration
func (h *AdminHandler) GetAutoBroadcast(c *gin.Context) {
	ctx := c.Request.Context()
	enabled := h.settings.GetBool(ctx, "auto_broadcast_enabled", false)
	interval := h.settings.GetInt(ctx, "auto_broadcast_interval_minutes", 60)
	mode, _ := h.settings.Get(ctx, "auto_broadcast_mode")
	if mode == "" {
		mode = "rotate"
	}
	msg, _ := h.settings.Get(ctx, "auto_broadcast_message")
	btnText, _ := h.settings.Get(ctx, "auto_broadcast_button_text")
	btnURL, _ := h.settings.Get(ctx, "auto_broadcast_button_url")
	templateKey, _ := h.settings.Get(ctx, "auto_broadcast_template_key")
	lastRun, _ := h.settings.Get(ctx, "auto_broadcast_last_run_at")

	if btnText == "" {
		btnText = "📦 Unlock Mystery Crates 🎁"
	}
	if btnURL == "" {
		btnURL = "https://miniapp-five-topaz.vercel.app"
	}

	c.JSON(http.StatusOK, gin.H{
		"enabled":          enabled,
		"interval_minutes": interval,
		"mode":             mode,
		"template_key":     templateKey,
		"message":          msg,
		"button_text":      btnText,
		"button_url":       btnURL,
		"last_run_at":      lastRun,
	})
}

// POST /api/admin/auto-broadcast - Update automated broadcast configuration
func (h *AdminHandler) SetAutoBroadcast(c *gin.Context) {
	ctx := c.Request.Context()
	var req struct {
		Enabled         bool   `json:"enabled"`
		IntervalMinutes int    `json:"interval_minutes"`
		Mode            string `json:"mode"`
		TemplateKey     string `json:"template_key"`
		Message         string `json:"message"`
		ButtonText      string `json:"button_text"`
		ButtonURL       string `json:"button_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.IntervalMinutes <= 0 {
		req.IntervalMinutes = 60
	}
	if req.Mode == "" {
		req.Mode = "rotate"
	}

	_ = h.settings.Set(ctx, "auto_broadcast_enabled", strconv.FormatBool(req.Enabled))
	_ = h.settings.Set(ctx, "auto_broadcast_interval_minutes", strconv.Itoa(req.IntervalMinutes))
	_ = h.settings.Set(ctx, "auto_broadcast_mode", req.Mode)
	_ = h.settings.Set(ctx, "auto_broadcast_template_key", req.TemplateKey)
	_ = h.settings.Set(ctx, "auto_broadcast_message", req.Message)
	_ = h.settings.Set(ctx, "auto_broadcast_button_text", req.ButtonText)
	_ = h.settings.Set(ctx, "auto_broadcast_button_url", req.ButtonURL)

	c.JSON(http.StatusOK, gin.H{
		"message": "✅ Automated broadcast settings saved!",
		"enabled": req.Enabled,
		"mode":    req.Mode,
	})
}

// StartAutoBroadcastWorker runs background loop to trigger scheduled broadcasts
func (h *AdminHandler) StartAutoBroadcastWorker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				func() {
					cctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
					defer cancel()

					enabled := h.settings.GetBool(cctx, "auto_broadcast_enabled", false)
					if !enabled || h.bot == nil {
						return
					}

					intervalMin := h.settings.GetInt(cctx, "auto_broadcast_interval_minutes", 60)
					if intervalMin <= 0 {
						intervalMin = 60
					}

					lastRunStr, _ := h.settings.Get(cctx, "auto_broadcast_last_run_at")
					if lastRunStr != "" {
						if lastRunTime, err := time.Parse(time.RFC3339, lastRunStr); err == nil {
							if time.Since(lastRunTime) < time.Duration(intervalMin)*time.Minute {
								return // Not due yet
							}
						}
					}

					// Check if a broadcast is already in flight
					broadcastMu.Lock()
					if broadcastStatus.IsRunning {
						broadcastMu.Unlock()
						return
					}
					broadcastMu.Unlock()

					mode, _ := h.settings.Get(cctx, "auto_broadcast_mode")
					if mode == "" {
						mode = "rotate"
					}

					var msg, btnText, btnURL string

					if mode == "rotate" || mode == "random" {
						// Pick random template from the curated pool
						randIdx := rand.Intn(len(RotatingBroadcastTemplates))
						tpl := RotatingBroadcastTemplates[randIdx]
						msg = tpl.Message
						btnText = tpl.ButtonText
						btnURL = tpl.ButtonURL
						_ = h.settings.Set(cctx, "auto_broadcast_last_template_key", tpl.Key)
					} else {
						msg, _ = h.settings.Get(cctx, "auto_broadcast_message")
						btnText, _ = h.settings.Get(cctx, "auto_broadcast_button_text")
						btnURL, _ = h.settings.Get(cctx, "auto_broadcast_button_url")
					}

					if msg == "" {
						return
					}
					if btnText == "" {
						btnText = "🐝 Open HashBee App"
					}
					if btnURL == "" {
						btnURL = "https://miniapp-five-topaz.vercel.app"
					}

					// Query recipients
					rows, err := h.db.Query(cctx, `SELECT DISTINCT telegram_id, COALESCE(first_name, username, '') FROM users WHERE telegram_id > 0 AND (status IS NULL OR status != 'banned')`)
					if err != nil {
						return
					}
					defer rows.Close()

					var recipients []bot.BroadcastRecipient
					for rows.Next() {
						var id int64
						var fn string
						if err := rows.Scan(&id, &fn); err == nil && id > 0 {
							recipients = append(recipients, bot.BroadcastRecipient{TelegramID: id, FirstName: fn})
						}
					}

					if len(recipients) == 0 {
						return
					}

					// Update last run timestamp immediately
					_ = h.settings.Set(cctx, "auto_broadcast_last_run_at", time.Now().UTC().Format(time.RFC3339))

					log.Printf("⏱️ [AutoBroadcast] Triggering scheduled broadcast (mode: %s) for %d users...", mode, len(recipients))
					go func(recs []bot.BroadcastRecipient, message, bt, bu string) {
						bctx, bcancel := context.WithTimeout(context.Background(), 20*time.Minute)
						defer bcancel()
						h.bot.BroadcastRecipientsProgress(bctx, message, bt, bu, recs, nil)
					}(recipients, msg, btnText, btnURL)
				}()
			}
		}
	}()
}

// GET /api/admin/deposits — List all past deposits made by users
func (h *AdminHandler) GetDeposits(c *gin.Context) {
	ctx := c.Request.Context()
	limit := 100
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 500 {
			limit = val
		}
	}
	offset := 0
	if o := c.Query("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}
	search := strings.TrimSpace(c.Query("search"))
	depositType := strings.TrimSpace(c.Query("type")) // 'all', 'miner', 'campaign'

	query := `
		SELECT 
			t.id, 
			t.user_id, 
			COALESCE(u.username, '') AS username, 
			COALESCE(u.first_name, '') AS first_name, 
			COALESCE(u.telegram_id, 0) AS telegram_id, 
			t.type, 
			t.amount, 
			t.currency, 
			COALESCE(t.idempotency_key, '') AS tx_hash, 
			COALESCE(t.description, '') AS description, 
			t.created_at
		FROM transactions t
		LEFT JOIN users u ON u.id = t.user_id
		WHERE ((t.type = 'deposit' AND t.currency = 'GRAM') OR (t.type = 'campaign_payment' AND t.currency = 'GRAM') OR (t.type = 'deposit_balance' AND t.currency IN ('GRAM', 'USDT')))
	`
	var args []interface{}
	argIdx := 1

	if depositType == "miner" {
		query += " AND t.type IN ('deposit', 'deposit_balance')"
	} else if depositType == "campaign" {
		query += " AND t.type = 'campaign_payment'"
	}

	if search != "" {
		query += fmt.Sprintf(" AND (u.username ILIKE $%d OR u.first_name ILIKE $%d OR CAST(u.telegram_id AS TEXT) ILIKE $%d OR t.idempotency_key ILIKE $%d OR t.description ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query deposits"})
		return
	}
	defer rows.Close()

	type DepositItem struct {
		ID          uuid.UUID `json:"id"`
		UserID      uuid.UUID `json:"user_id"`
		Username    string    `json:"username"`
		FirstName   string    `json:"first_name"`
		TelegramID  int64     `json:"telegram_id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Currency    string    `json:"currency"`
		TxHash      string    `json:"tx_hash"`
		Description string    `json:"description"`
		CreatedAt   time.Time `json:"created_at"`
	}

	deposits := []DepositItem{}
	for rows.Next() {
		var d DepositItem
		if err := rows.Scan(&d.ID, &d.UserID, &d.Username, &d.FirstName, &d.TelegramID, &d.Type, &d.Amount, &d.Currency, &d.TxHash, &d.Description, &d.CreatedAt); err == nil {
			deposits = append(deposits, d)
		}
	}

	// Calculate summary totals
	var totalDepositsCount int
	var totalGramDeposited float64
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE ((type = 'deposit' AND currency = 'GRAM') OR (type = 'campaign_payment' AND currency = 'GRAM') OR (type = 'deposit_balance' AND currency IN ('GRAM', 'USDT')))
	`).Scan(&totalDepositsCount, &totalGramDeposited)

	c.JSON(http.StatusOK, gin.H{
		"deposits":              deposits,
		"total_count":           totalDepositsCount,
		"total_gram_deposited":  totalGramDeposited,
		"total_usdt_equivalent": totalGramDeposited,
	})
}

