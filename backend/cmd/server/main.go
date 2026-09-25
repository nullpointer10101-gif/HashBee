package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
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

	// Services
	settingsSvc := services.NewSettingsService(pool)
	userSvc := services.NewUserService(pool, settingsSvc)
	referralSvc := services.NewReferralService(pool, settingsSvc)
	missionSvc := services.NewMissionService(pool, settingsSvc, referralSvc)
	withdrawalSvc := services.NewWithdrawalService(pool, settingsSvc, referralSvc)
	campaignSvc := services.NewCampaignService(pool, settingsSvc)

	// Telegram Bot
	tgBot, err := bot.New(cfg, userSvc)
	if err != nil {
		log.Printf("⚠️  Bot initialization failed: %v (continuing without bot)", err)
		tgBot = nil
	} else if tgBot != nil {
		referralSvc.SetBot(tgBot)
		missionSvc.SetBot(tgBot)
	}

	// Deposit Watcher Service
	depositWallet := "UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR"
	depositSvc := services.NewDepositService(pool, tgBot, depositWallet)
	depositSvc.StartWatcher(ctx, 15*time.Second)

	// Handlers
	userHandler := handlers.NewUserHandler(cfg, userSvc, referralSvc, depositSvc, tgBot)
	missionHandler := handlers.NewMissionHandler(missionSvc, referralSvc)
	withdrawalHandler := handlers.NewWithdrawalHandler(withdrawalSvc)
	campaignHandler := handlers.NewCampaignHandler(campaignSvc)
	adminHandler := handlers.NewAdminHandler(cfg, pool, userSvc, settingsSvc, campaignSvc, withdrawalSvc, tgBot)

	// Gin router
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

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

	// Serve Admin Panel static frontend
	r.StaticFile("/admin", "./public/admin/index.html")
	r.StaticFile("/admin/", "./public/admin/index.html")
	r.Static("/admin/assets", "./public/admin/assets")

	// =====================================================
	// Telegram Webhook
	// =====================================================
	if tgBot != nil {
		if cfg.WebhookURL != "" {
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

			go tgBot.HandleUpdate(update)
			c.Status(http.StatusOK)
		})
	}

	// =====================================================
	// Public API routes
	// =====================================================
	api := r.Group("/api")

	// Auth — validates initData, creates user, returns JWT
	api.POST("/auth",
		middleware.TelegramAuth(cfg, userSvc),
		userHandler.Auth)

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
			adminProtected.PATCH("/users/:id/status", adminHandler.UpdateUserStatus)
			adminProtected.PATCH("/users/:id/balance", adminHandler.AdjustBalance)
			adminProtected.GET("/withdrawals", adminHandler.ListWithdrawals)
			adminProtected.PATCH("/withdrawals/:id", adminHandler.UpdateWithdrawal)
			adminProtected.GET("/settings", adminHandler.GetSettings)
			adminProtected.PUT("/settings", adminHandler.UpdateSettings)
			adminProtected.GET("/campaigns", adminHandler.ListCampaigns)
			adminProtected.POST("/campaigns", adminHandler.CreateCampaign)
			adminProtected.PATCH("/campaigns/:id", adminHandler.UpdateCampaign)
			adminProtected.DELETE("/campaigns/:id", adminHandler.DeleteCampaign)
			adminProtected.GET("/fraud", adminHandler.ListFraudFlags)
			adminProtected.POST("/broadcast", adminHandler.Broadcast)
			adminProtected.GET("/broadcast/status", adminHandler.GetBroadcastStatus)
		}
	}

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
