package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port string
	Env  string

	// Telegram
	BotToken      string
	BotUsername   string
	MiniAppURL    string
	WebhookURL    string
	WebhookSecret string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret      string
	AdminJWTSecret string

	// Admin
	AdminEmail        string
	AdminPasswordHash string

	// Feature Flags
	FeaturePaidPacks               bool
	FeatureCampaigns               bool
	FeatureAdminCampaignApproval   bool
	FeatureAntiCheatLeavePenalty   bool
	FeatureManualWithdrawalReview  bool

	// Economy defaults
	DefaultHiveCapHours               float64
	DefaultBaseBP                     float64
	DefaultWelcomeBonusBP             float64
	DefaultReferralL1BP               float64
	DefaultReferralL2BP               float64
	DefaultReferralL3BP               float64
	DefaultMinWithdrawalUSDT          float64
	DefaultCampaignPricePerCompletion float64
	DefaultHoneyPerBPPerHour          float64
	DefaultReinvestRate               float64

	// Payment wallets
	PaymentWalletUSDTTRC20 string
	PaymentWalletTON       string

	// Rate limiting
	RateLimitRPS int

	// Notifications
	NotifyHiveFull             bool
	NotifyHiveFullCooldownHours int
}

func Load() (*Config, error) {
	// Load .env file if it exists (dev mode)
	_ = godotenv.Load()

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		Env:           getEnv("ENV", "development"),
		BotToken:      getEnv("BOT_TOKEN", getEnv("TELEGRAM_BOT_TOKEN", "")),
		BotUsername:   getEnv("BOT_USERNAME", "hashbe_bot"),
		MiniAppURL:    getEnv("MINIAPP_URL", "https://miniapp-five-topaz.vercel.app"),
		WebhookURL:    getEnv("WEBHOOK_URL", ""),
		WebhookSecret: getEnv("WEBHOOK_SECRET", ""),
		DatabaseURL:   mustGetEnv("DATABASE_URL"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:     mustGetEnv("JWT_SECRET"),
		AdminJWTSecret: mustGetEnv("ADMIN_JWT_SECRET"),

		AdminEmail:        getEnv("ADMIN_EMAIL", ""),
		AdminPasswordHash: getEnv("ADMIN_PASSWORD_HASH", ""),

		FeaturePaidPacks:              getBoolEnv("FEATURE_PAID_PACKS", false),
		FeatureCampaigns:              getBoolEnv("FEATURE_CAMPAIGNS", true),
		FeatureAdminCampaignApproval:  getBoolEnv("FEATURE_ADMIN_CAMPAIGN_APPROVAL", false),
		FeatureAntiCheatLeavePenalty:  getBoolEnv("FEATURE_ANTI_CHEAT_LEAVE_PENALTY", false),
		FeatureManualWithdrawalReview: getBoolEnv("FEATURE_MANUAL_WITHDRAWAL_REVIEW", true),

		DefaultHiveCapHours:               getFloat64Env("DEFAULT_HIVE_CAP_HOURS", 8),
		DefaultBaseBP:                     getFloat64Env("DEFAULT_BASE_BP", 1),
		DefaultWelcomeBonusBP:             getFloat64Env("DEFAULT_WELCOME_BONUS_BP", 2),
		DefaultReferralL1BP:               getFloat64Env("DEFAULT_REFERRAL_L1_BP", 5),
		DefaultReferralL2BP:               getFloat64Env("DEFAULT_REFERRAL_L2_BP", 1.0),
		DefaultReferralL3BP:               getFloat64Env("DEFAULT_REFERRAL_L3_BP", 0.5),
		DefaultMinWithdrawalUSDT:          getFloat64Env("DEFAULT_MIN_WITHDRAWAL_USDT", 0.05),
		DefaultCampaignPricePerCompletion: getFloat64Env("DEFAULT_CAMPAIGN_PRICE_PER_COMPLETION", 0.001),
		DefaultHoneyPerBPPerHour:          getFloat64Env("DEFAULT_HONEY_PER_BP_PER_HOUR", 0.001),
		DefaultReinvestRate:               getFloat64Env("DEFAULT_REINVEST_RATE", 100),

		PaymentWalletUSDTTRC20: getEnv("PAYMENT_WALLET_USDT_TRC20", ""),
		PaymentWalletTON:       getEnv("PAYMENT_WALLET_TON", ""),

		RateLimitRPS: getIntEnv("RATE_LIMIT_RPS", 20),

		NotifyHiveFull:              getBoolEnv("NOTIFY_HIVE_FULL", true),
		NotifyHiveFullCooldownHours: getIntEnv("NOTIFY_HIVE_FULL_COOLDOWN_HOURS", 12),
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return v
}

func getBoolEnv(key string, defaultVal bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return defaultVal
	}
	return b
}

func getFloat64Env(key string, defaultVal float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return defaultVal
	}
	return f
}

func getIntEnv(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return i
}
