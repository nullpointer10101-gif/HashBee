package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"hashbee/internal/bot"
	"hashbee/internal/config"
	"hashbee/internal/db"
	"hashbee/internal/handlers"
	"hashbee/internal/middleware"
	"hashbee/internal/services"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Database
	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("✅ Database connected")
	// Seed exclusive admin credentials (username: meela / password: meela)
	meelaHash, _ := bcrypt.GenerateFromPassword([]byte("meela"), bcrypt.DefaultCost)
	_, _ = pool.Exec(ctx, "DELETE FROM admin_users WHERE email != 'meela'")
	_, _ = pool.Exec(ctx, `
		INSERT INTO admin_users (id, email, password_hash, role, status, created_at, updated_at)
		VALUES ($1, 'meela', $2, 'super_admin', 'active', NOW(), NOW())
		ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'active', updated_at = NOW()
	`, uuid.New(), string(meelaHash))

	// Ensure spin_balance column exists on users table
	_, _ = pool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS spin_balance INT NOT NULL DEFAULT 1;`)

	// Ensure user_plans table exists for 24h Daily Yield Plans
	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS user_plans (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			plan_id VARCHAR(50) NOT NULL,
			plan_name VARCHAR(100) NOT NULL,
			cost_gram NUMERIC(18, 4) NOT NULL,
			return_gram NUMERIC(18, 4) NOT NULL,
			duration_seconds INT NOT NULL DEFAULT 86400,
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			matures_at TIMESTAMPTZ NOT NULL,
			claimed_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
		CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
		CREATE INDEX IF NOT EXISTS idx_user_plans_matures_at ON user_plans(matures_at);
	`)

	// Production settings
	nowEpoch := time.Now().UTC().Format(time.RFC3339)
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('spin_epoch', $1, 'Spin reset epoch timestamp', NOW())
		ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW();
	`, nowEpoch)

	// Set withdrawal_min_referrals to 0 so users can withdraw without referral restrictions
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('withdrawal_min_referrals', '0', 'Minimum referrals required to withdraw', NOW())
		ON CONFLICT (key) DO UPDATE SET value = '0', updated_at = NOW();
	`)

	// Ensure min_withdrawal_usdt is set to 0.10
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('min_withdrawal_usdt', '0.10', 'Minimum withdrawal amount in USDT', NOW())
		ON CONFLICT (key) DO UPDATE SET value = '0.10', updated_at = NOW();
	`)

	// Set standard referral rate and welcome bonus
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('referral_l1_bp', '3', 'GHS reward for each Level 1 referral', NOW())
		ON CONFLICT (key) DO UPDATE SET value = '3', updated_at = NOW();
	`)
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('welcome_bonus_bp', '2', 'GHS welcome bonus for users who join via referral', NOW())
		ON CONFLICT (key) DO UPDATE SET value = '2', updated_at = NOW();
	`)
	_, _ = pool.Exec(ctx, `
		INSERT INTO settings (key, value, description, updated_at)
		VALUES ('payout_mirror_enabled', 'false', 'Auto-mirror payout proofs to Telegram channel', NOW())
		ON CONFLICT (key) DO NOTHING;
	`)


	// Startup campaign completions boost for the 2 tasks to approx 200
	_, _ = pool.Exec(ctx, `
		UPDATE campaigns 
		SET done_completions = 208, updated_at = NOW() 
		WHERE (payment_memo = 'CMPA081BE29E9' OR target ILIKE '%onlinee1994%') AND done_completions < 208
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE campaigns 
		SET done_completions = 194, updated_at = NOW() 
		WHERE (payment_memo = 'CMP38C60EC604' OR target ILIKE '%referral199%') AND done_completions < 194
	`)

	// Mark linkkiemtienmoney campaign as completed
	_, _ = pool.Exec(ctx, `
		UPDATE campaigns 
		SET status = 'completed', updated_at = NOW() 
		WHERE payment_memo = 'CMP59C71940F2' OR target ILIKE '%linkkiemtienmoney%'
	`)
	_, _ = pool.Exec(ctx, `
		UPDATE missions 
		SET status = 'completed', updated_at = NOW() 
		WHERE campaign_id IN (SELECT id FROM campaigns WHERE payment_memo = 'CMP59C71940F2' OR target ILIKE '%linkkiemtienmoney%')
	`)

	// Ensure rejection_reason column exists
	_, _ = pool.Exec(ctx, `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`)

	// Normalize historical crate opening transactions to 'crate_unlock' so in-game honey crate opens don't trigger plan qualification
	_, _ = pool.Exec(ctx, `
		UPDATE transactions
		SET type = 'crate_unlock'
		WHERE type = 'crate_purchase';
	`)

	// Silently refund and clear any pending withdrawals from users who have not purchased an NFT miner plan
	_, _ = pool.Exec(ctx, `
		DO $$
		DECLARE
			r RECORD;
		BEGIN
			FOR r IN
				SELECT w.id, w.user_id, w.honey_amount
				FROM withdrawals w
				WHERE w.status = 'pending'
				  AND w.user_id NOT IN (
					  SELECT user_id FROM user_plans
					  UNION
					  SELECT user_id FROM transactions WHERE type = 'plan_purchase'
					  UNION
					  SELECT id FROM users WHERE COALESCE(one_time_withdrawal_granted, false) = true
				  )
			LOOP
				UPDATE withdrawals
				SET status = 'rejected', reason = 'Requirement: Activate 1 NFT Miner Plan (Balance refunded)', updated_at = NOW()
				WHERE id = r.id;

				UPDATE users
				SET honey_balance = honey_balance + r.honey_amount, updated_at = NOW()
				WHERE id = r.user_id;

				INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
				VALUES (gen_random_uuid(), r.user_id, 'adjustment', r.honey_amount, 'HONEY', r.id, 'withdrawal', 'refund_' || r.id::text, 'Withdrawal balance returned (NFT plan qualification requirement)', NOW())
				ON CONFLICT (idempotency_key) DO NOTHING;
			END LOOP;
		END $$;
	`)

	// Clean up any historical miscategorized BP power transactions so they do not inflate crypto deposit sums
	_, _ = pool.Exec(ctx, `UPDATE transactions SET type = 'bp_grant' WHERE type = 'deposit' AND currency = 'BP'`)
	_, _ = pool.Exec(ctx, `UPDATE transactions SET type = 'admin_adjustment' WHERE type = 'adjustment' AND currency = 'BP'`)

	// Services
	settingsSvc := services.NewSettingsService(pool)
	userSvc := services.NewUserService(pool, settingsSvc)
	referralSvc := services.NewReferralService(pool, settingsSvc)
	missionSvc := services.NewMissionService(pool, settingsSvc, referralSvc)
	withdrawalSvc := services.NewWithdrawalService(pool, settingsSvc, referralSvc)
	campaignSvc := services.NewCampaignService(pool, settingsSvc)
	viralBountySvc := services.NewViralBountyService(pool, settingsSvc)
	_ = viralBountySvc.EnsureTable(ctx)

	// Vault Heist Service & Schema
	vaultSvc := services.NewVaultService(pool, settingsSvc)
	if err := vaultSvc.EnsureSchema(ctx); err != nil {
		log.Printf("⚠️  [Startup] Vault schema error: %v", err)
	} else {
		log.Printf("🏛️  [Startup] Vaultfinity schema & safecracker tables initialized")
	}

	// Clean up and refund any unqualified pending withdrawals
	if refundedCount, err := withdrawalSvc.AutoRefundUnqualifiedPendingWithdrawals(ctx); err == nil && refundedCount > 0 {
		log.Printf("🛡️ [Startup] Auto-refunded and removed %d unqualified pending withdrawals from admin queue", refundedCount)
	}

	// Telegram Bot
	tgBot, err := bot.New(cfg, userSvc)
	if err != nil {
		log.Printf("⚠️  Bot initialization failed: %v (continuing without bot)", err)
		tgBot = nil
	} else if tgBot != nil {
		referralSvc.SetBot(tgBot)
		missionSvc.SetBot(tgBot)
	}

	// Deposit Watcher Service (15m interval to keep background Render bandwidth near-zero; manual verify endpoint handles instant user deposits)
	depositWallet := "UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR"
	depositSvc := services.NewDepositService(pool, tgBot, depositWallet)
	depositSvc.StartWatcher(ctx, 15*time.Minute)

	// Payout Mirror Service (30m interval; only active if admin explicitly enables it)
	payoutMirrorSvc := services.NewPayoutMirrorService(pool, settingsSvc, tgBot)
	payoutMirrorSvc.StartWatcher(ctx, 30*time.Minute)

	// Handlers
	userHandler := handlers.NewUserHandler(cfg, userSvc, referralSvc, depositSvc, tgBot)
	missionHandler := handlers.NewMissionHandler(missionSvc, referralSvc)
	withdrawalHandler := handlers.NewWithdrawalHandler(withdrawalSvc)
	campaignHandler := handlers.NewCampaignHandler(campaignSvc)
	viralBountyHandler := handlers.NewViralBountyHandler(viralBountySvc)
	vaultHandler := handlers.NewVaultHandler(vaultSvc, cfg.BotUsername)
	adminHandler := handlers.NewAdminHandler(cfg, pool, userSvc, settingsSvc, campaignSvc, withdrawalSvc, payoutMirrorSvc, tgBot)

	// Gin router
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(gzip.Gzip(gzip.DefaultCompression, gzip.WithExcludedPaths([]string{"/bot/webhook"})))

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Telegram-Init-Data", "X-Idempotency-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// Rate limiting
	r.Use(middleware.RateLimit(cfg.RateLimitRPS))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "hashbee", "timestamp": time.Now()})
	})

	// NOTE: Static frontend assets are NOT served from here.
	// The MiniApp is deployed on Vercel (free 100 GB CDN) and the Admin panel
	// is served separately. Serving them from Render wastes the 5 GB/month free
	// bandwidth limit. Render is API-only.

	// Serve Admin Panel only (lightweight, internal use)
	r.StaticFile("/admin", "./public/admin/index.html")
	r.StaticFile("/admin/", "./public/admin/index.html")
	r.Static("/admin/assets", "./public/admin/assets")

	// Catch-all: API 404 for unknown /api routes, otherwise redirect to Vercel app
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "api endpoint not found"})
			return
		}
		if strings.HasPrefix(path, "/admin") {
			c.File("./public/admin/index.html")
			return
		}
		// For any other path, redirect to Vercel-hosted frontend
		c.JSON(http.StatusOK, gin.H{"service": "hashbee-api", "docs": "https://hashbee3.onrender.com/health"})
	})

	// =====================================================
	// Telegram Webhook & Diagnostic Status
	// =====================================================
	r.GET("/bot/status", func(c *gin.Context) {
		tok := strings.Trim(strings.TrimSpace(cfg.BotToken), "\"' \r\n\t")
		preview := "empty"
		if len(tok) > 8 {
			preview = tok[:4] + "..." + tok[len(tok)-4:]
		}
		var botUsername string
		if tgBot != nil && tgBot.GetSelf() != nil {
			botUsername = tgBot.GetSelf().UserName
		}
		c.JSON(http.StatusOK, gin.H{
			"bot_initialized":   tgBot != nil,
			"bot_username":      botUsername,
			"bot_token_length":  len(tok),
			"bot_token_preview": preview,
			"webhook_url":       cfg.WebhookURL,
		})
	})

	if tgBot != nil && cfg.WebhookURL != "" {
		if err := tgBot.SetWebhook(cfg.WebhookURL); err != nil {
			log.Printf("⚠️  Failed to set webhook: %v", err)
		} else {
			log.Printf("✅ Webhook set to %s", cfg.WebhookURL)
		}
	}

	r.POST("/bot/webhook", func(c *gin.Context) {
		// Validate secret token
		if cfg.WebhookSecret != "" {
			secret := c.GetHeader("X-Telegram-Bot-Api-Secret-Token")
			if secret != cfg.WebhookSecret {
				c.Status(http.StatusForbidden)
				return
			}
		}

		var update tgbotapi.Update
		if err := json.NewDecoder(c.Request.Body).Decode(&update); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		if tgBot != nil {
			go tgBot.HandleUpdate(update)
		} else {
			// Lazy initialize if token was provided/corrected
			if lazyBot, err := bot.New(cfg, userSvc); err == nil && lazyBot != nil {
				tgBot = lazyBot
				referralSvc.SetBot(lazyBot)
				missionSvc.SetBot(lazyBot)
				go tgBot.HandleUpdate(update)
			} else {
				log.Printf("⚠️ [Webhook] Received update but bot is not initialized: %v", err)
			}
		}
		c.Status(http.StatusOK)
	})

	// =====================================================
	// Public API routes
	// =====================================================
	api := r.Group("/api")

	// Auth — validates initData, creates user, returns JWT
	api.POST("/auth",
		middleware.TelegramAuth(cfg, userSvc),
		userHandler.Auth)

	// Public: spin epoch (no auth required, used by miniapp to filter which referrals grant spins)
	api.GET("/spin-epoch", adminHandler.GetSpinEpoch)

	// =====================================================
	// Protected user routes (JWT required)
	// =====================================================
	protected := api.Group("")
	protected.Use(middleware.JWTAuth(cfg, userSvc))
	{
		protected.GET("/me", userHandler.GetMe)
		protected.POST("/collect", userHandler.Collect)
		protected.POST("/check-deposit", userHandler.CheckDeposit)
		protected.POST("/checkin", userHandler.Checkin)
		protected.GET("/history", userHandler.GetHistory)
		protected.GET("/swarm", userHandler.GetSwarm)
		protected.GET("/spin/status", userHandler.GetSpinStatus)
		protected.POST("/spin/claim", userHandler.SpinClaim)
		protected.POST("/crates/open", userHandler.OpenCrate)
		protected.POST("/check-channels", userHandler.CheckChannels)

		// 24h Daily Yield Plans (Mining Contracts)
		protected.GET("/plans", userHandler.GetPlans)
		protected.GET("/plans/my", userHandler.GetMyPlans)
		protected.POST("/plans/buy", userHandler.BuyPlan)
		protected.POST("/plans/claim", userHandler.ClaimPlan)

		protected.GET("/missions", missionHandler.ListMissions)
		protected.POST("/missions/:id/start", missionHandler.StartMission)
		protected.POST("/missions/:id/verify", missionHandler.VerifyMission)
		protected.POST("/missions/:id/claim", missionHandler.ClaimMilestone)

		protected.POST("/withdraw", withdrawalHandler.CreateWithdrawal)
		protected.GET("/withdrawals", withdrawalHandler.GetWithdrawals)
		protected.POST("/reinvest", withdrawalHandler.Reinvest)

		protected.POST("/campaigns", campaignHandler.CreateCampaign)
		protected.GET("/campaigns", campaignHandler.GetMyCampaigns)
		protected.DELETE("/campaigns/:id", campaignHandler.CancelCampaign)

		// Viral 10 GRAM 7-Day Referral Bounty Event
		protected.GET("/viral-bounty", viralBountyHandler.GetBountyInfo)
		protected.POST("/viral-bounty/claim", viralBountyHandler.CreateClaim)

		// Rewarded Ads (GigaPub, Adsgram, AdExium)
		protected.POST("/ads/reward", userHandler.RewardAd)

		// Vault Heist (Vaultfinity) API Routes
		protected.GET("/vault/status", vaultHandler.GetStatus)
		protected.POST("/gold/smelt", vaultHandler.SmeltGold)
		protected.POST("/crew/buy", vaultHandler.BuyCrew)
		protected.POST("/energy/buy", vaultHandler.BuyEnergy)
		protected.GET("/syndicate", vaultHandler.GetSyndicate)
		protected.POST("/syndicate/claim", vaultHandler.ClaimSyndicate)
		protected.POST("/daily-supply", vaultHandler.ClaimDailySupply)
	}

	// =====================================================
	// Admin routes
	// =====================================================
	admin := api.Group("/admin")
	{
		admin.POST("/login", adminHandler.Login)

		adminProtected := admin.Group("")
		adminProtected.Use(middleware.AdminJWTAuth(cfg))
		{
			adminProtected.GET("/dashboard", adminHandler.Dashboard)
			adminProtected.GET("/users", adminHandler.ListUsers)
			adminProtected.GET("/users/:id/details", adminHandler.GetUserDetail)
			adminProtected.PATCH("/users/:id/status", adminHandler.UpdateUserStatus)
			adminProtected.PATCH("/users/:id/balance", adminHandler.AdjustBalance)
			adminProtected.POST("/users/:id/message", adminHandler.SendDirectMessage)
			adminProtected.POST("/users/:id/reset-streak", adminHandler.ResetStreak)
			adminProtected.GET("/withdrawals", adminHandler.ListWithdrawals)
			adminProtected.POST("/withdrawals/auto-refund", adminHandler.AutoRefundWithdrawals)
			adminProtected.PATCH("/withdrawals/:id", adminHandler.UpdateWithdrawal)
			adminProtected.GET("/deposits", adminHandler.GetDeposits)
			adminProtected.GET("/settings", adminHandler.GetSettings)
			adminProtected.PUT("/settings", adminHandler.UpdateSettings)
			adminProtected.GET("/campaigns", adminHandler.ListCampaigns)
			adminProtected.POST("/campaigns", adminHandler.CreateCampaign)
			adminProtected.PATCH("/campaigns/:id", adminHandler.UpdateCampaign)
			adminProtected.DELETE("/campaigns/:id", adminHandler.DeleteCampaign)
			adminProtected.GET("/fraud", adminHandler.ListFraudFlags)
			adminProtected.POST("/broadcast", adminHandler.Broadcast)
			adminProtected.GET("/broadcast/status", adminHandler.GetBroadcastStatus)
			adminProtected.GET("/auto-broadcast", adminHandler.GetAutoBroadcast)
			adminProtected.POST("/auto-broadcast", adminHandler.SetAutoBroadcast)
			adminProtected.POST("/spin-reset", adminHandler.SpinReset)
			adminProtected.GET("/payout-mirror/status", adminHandler.GetPayoutMirrorStatus)
			adminProtected.POST("/payout-mirror/config", adminHandler.UpdatePayoutMirrorConfig)
			adminProtected.POST("/payout-mirror/sync", adminHandler.SyncPayoutMirror)
			adminProtected.POST("/payout-mirror/test", adminHandler.TestPayoutMirror)
		}
	}

	// Start Automated Broadcast Worker
	adminHandler.StartAutoBroadcastWorker(ctx)

	// =====================================================
	// Start server
	// =====================================================
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🚀 HashBee server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	log.Println("Server stopped")
}
