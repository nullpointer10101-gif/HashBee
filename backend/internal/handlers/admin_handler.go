package handlers

import (
	"encoding/hex"
	"strings"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"hashbee/internal/config"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type BotBroadcaster interface {
	BroadcastWithButton(ctx context.Context, text string, buttonText, buttonURL string, telegramIDs []int64) (int, int)
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
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	identifier := req.Email
	if identifier == "" {
		identifier = req.Username
	}
	if identifier == "" {
		identifier = "admin@hashbee.io"
	}

	// Auto-seed default admin if no admin users exist yet
	var count int
	_ = h.db.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM admin_users`).Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		_, _ = h.db.Exec(c.Request.Context(),
			`INSERT INTO admin_users (email, password_hash, role, status) VALUES ('admin@hashbee.io', $1, 'super_admin', 'active') ON CONFLICT DO NOTHING`,
			string(hash))
	}

	var admin models.AdminUser
	err := h.db.QueryRow(c.Request.Context(),
		`SELECT id, email, password_hash, role, status FROM admin_users WHERE (email = $1 OR (email = 'admin@hashbee.io' AND ($1 = 'admin' OR $1 = 'admin@hashbee.io'))) AND status = 'active' LIMIT 1`,
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
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
	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, _ := strconv.Atoi(l); v > 0 && v <= 200 {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, _ := strconv.Atoi(o); v >= 0 {
			offset = v
		}
	}

	users, total, err := h.userSvc.AdminGetUsers(c.Request.Context(), search, status, limit, offset)
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

	// If rejecting, refund the honey
	if req.Status == "rejected" {
		tx, _ := h.db.Begin(ctx)
		defer tx.Rollback(ctx)

		var w models.Withdrawal
		err = tx.QueryRow(ctx,
			`SELECT user_id, honey_amount, status FROM withdrawals WHERE id = $1 FOR UPDATE`, wID).
			Scan(&w.UserID, &w.HoneyAmount, &w.Status)
		if err != nil || w.Status != "pending" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "withdrawal not in pending state"})
			return
		}

		// Refund honey
		tx.Exec(ctx, `UPDATE users SET honey_balance = honey_balance + $1, updated_at = NOW() WHERE id = $2`, w.HoneyAmount, w.UserID)
		tx.Exec(ctx,
			`INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, description, created_at)
			 VALUES ($1, $2, 'adjustment', $3, 'HONEY', $4, 'Withdrawal rejected - refund', NOW())`,
			uuid.New(), w.UserID, w.HoneyAmount, wID)
		tx.Exec(ctx,
			`UPDATE withdrawals SET status = $1, reason = $2, processed_by = $3, updated_at = NOW() WHERE id = $4`,
			req.Status, req.Reason, adminUUID, wID)
		tx.Commit(ctx)
	} else {
		h.db.Exec(ctx,
			`UPDATE withdrawals SET status = $1, tx_hash = $2, reason = $3, processed_by = $4, updated_at = NOW() WHERE id = $5`,
			req.Status, req.TxHash, req.Reason, adminUUID, wID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal updated"})
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
		Status     string `json:"status"`
		AdminNotes string `json:"admin_notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	h.db.Exec(ctx,
		`UPDATE campaigns SET status = COALESCE(NULLIF($1,''), status), admin_notes = $2, updated_at = NOW() WHERE id = $3`,
		req.Status, req.AdminNotes, cID)

	// If approved, create mission
	if req.Status == "active" {
		var c2 models.Campaign
		h.db.QueryRow(ctx,
			`SELECT id, type, target, title, reward_bp FROM campaigns WHERE id = $1`, cID).
			Scan(&c2.ID, &c2.Type, &c2.Target, &c2.Title, &c2.RewardBP)

		h.db.Exec(ctx,
			`INSERT INTO missions (id, type, target, title, reward_bp, campaign_id, sort_order, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', NOW(), NOW())
			 ON CONFLICT DO NOTHING`,
			uuid.New(), c2.Type, c2.Target, c2.Title, c2.RewardBP, c2.ID)
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

// POST /api/admin/broadcast - Send rich template broadcast with inline WebApp button
func (h *AdminHandler) Broadcast(c *gin.Context) {
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

	var tgIDs []int64
	if req.TargetTelegramID > 0 {
		tgIDs = append(tgIDs, req.TargetTelegramID)
	} else {
		rows, err := h.db.Query(c.Request.Context(), `SELECT telegram_id FROM users WHERE status = 'active'`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users: " + err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int64
			if err := rows.Scan(&id); err == nil && id > 0 {
				tgIDs = append(tgIDs, id)
			}
		}
	}

	if len(tgIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active users found to broadcast"})
		return
	}

	if h.bot != nil {
		sent, failed := h.bot.BroadcastWithButton(c.Request.Context(), req.Message, req.ButtonText, req.ButtonURL, tgIDs)
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Broadcast sent to %d users (%d failed)", sent, failed),
			"sent":    sent,
			"failed":  failed,
			"total":   len(tgIDs),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Target users found: %d (Bot offline)", len(tgIDs)),
		"total":   len(tgIDs),
		"sent":    0,
		"failed":  0,
	})
}
