package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"hashbee/internal/config"
	"hashbee/internal/services"
)

type TelegramUser struct {
	ID           int64  `json:"id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Username     string `json:"username"`
	LanguageCode string `json:"language_code"`
	StartParam   string `json:"-"`
}

type Claims struct {
	UserID     string `json:"user_id"`
	TelegramID int64  `json:"telegram_id"`
	jwt.RegisteredClaims
}

// TelegramAuth validates initData and upserts the user, then issues a JWT
func TelegramAuth(cfg *config.Config, userSvc *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		initData := c.GetHeader("X-Telegram-Init-Data")
		if initData == "" {
			initData = c.Query("initData")
		}

		if initData == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing initData"})
			c.Abort()
			return
		}

		// Validate the initData signature
		tgUser, err := validateInitData(initData, cfg.BotToken)
		if err != nil {
			// In development mode, allow test data
			if cfg.Env != "development" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid initData: " + err.Error()})
				c.Abort()
				return
			}
			// Dev fallback: parse without validation
			tgUser, err = parseInitDataUnsafe(initData)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "cannot parse initData"})
				c.Abort()
				return
			}
		}

		// Upsert user
		user, _, err := userSvc.GetOrCreate(c.Request.Context(), tgUser.ID, tgUser.Username, tgUser.FirstName, tgUser.LanguageCode, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			c.Abort()
			return
		}

		c.Set("user_id", user.ID.String())
		c.Set("telegram_id", tgUser.ID)
		c.Set("start_param", tgUser.StartParam)
		c.Set("user", user)
		c.Next()
	}
}

// JWTAuth validates a JWT token issued by the server
func JWTAuth(cfg *config.Config, userSvc *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		userTelegramID := claims.TelegramID

		// If X-Telegram-Init-Data is present, verify that the JWT belongs to the same Telegram user
		initData := c.GetHeader("X-Telegram-Init-Data")
		if initData != "" {
			if tgUser, err := parseInitDataUnsafe(initData); err == nil && tgUser.ID != 0 && tgUser.ID != 123456789 {
				if tgUser.ID != userTelegramID {
					// Account switched! Use the active Telegram account from initData
					actualUser, _, err := userSvc.GetOrCreate(c.Request.Context(), tgUser.ID, tgUser.Username, tgUser.FirstName, tgUser.LanguageCode, nil)
					if err == nil {
						c.Set("user_id", actualUser.ID.String())
						c.Set("telegram_id", tgUser.ID)
						c.Set("user", actualUser)
						c.Next()
						return
					}
				}
			}
		}

		user, err := userSvc.GetByTelegramID(c.Request.Context(), userTelegramID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			c.Abort()
			return
		}

		if user.Status == "banned" {
			c.JSON(http.StatusForbidden, gin.H{"error": "account banned"})
			c.Abort()
			return
		}

		c.Set("user_id", user.ID.String())
		c.Set("telegram_id", claims.TelegramID)
		c.Set("user", user)
		c.Next()
	}
}

// AdminJWTAuth validates an admin JWT
func AdminJWTAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing admin token"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		type AdminClaims struct {
			AdminID string `json:"admin_id"`
			Email   string `json:"email"`
			Role    string `json:"role"`
			jwt.RegisteredClaims
		}

		claims := &AdminClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.AdminJWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid admin token"})
			c.Abort()
			return
		}

		c.Set("admin_id", claims.AdminID)
		c.Set("admin_email", claims.Email)
		c.Set("admin_role", claims.Role)
		c.Next()
	}
}

// IssueJWT creates a signed JWT for the user
func IssueJWT(userID string, telegramID int64, secret string) (string, error) {
	claims := Claims{
		UserID:     userID,
		TelegramID: telegramID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// validateInitData validates Telegram WebApp initData
func validateInitData(initData, botToken string) (*TelegramUser, error) {
	params, err := url.ParseQuery(initData)
	if err != nil {
		return nil, fmt.Errorf("invalid initData format")
	}

	hash := params.Get("hash")
	if hash == "" {
		return nil, fmt.Errorf("missing hash")
	}

	// Check auth_date freshness (max 1 hour)
	authDateStr := params.Get("auth_date")
	authDate, err := strconv.ParseInt(authDateStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid auth_date")
	}
	if time.Now().Unix()-authDate > 3600 {
		return nil, fmt.Errorf("initData expired")
	}

	// Build the data check string
	var keys []string
	for k := range params {
		if k != "hash" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	var sb strings.Builder
	for i, k := range keys {
		if i > 0 {
			sb.WriteString("\n")
		}
		sb.WriteString(k)
		sb.WriteString("=")
		sb.WriteString(params.Get(k))
	}
	dataCheckString := sb.String()

	// Compute secret key
	secretKey := hmac.New(sha256.New, []byte("WebAppData"))
	secretKey.Write([]byte(botToken))
	sk := secretKey.Sum(nil)

	// Compute expected hash
	mac := hmac.New(sha256.New, sk)
	mac.Write([]byte(dataCheckString))
	expectedHash := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(hash), []byte(expectedHash)) {
		return nil, fmt.Errorf("hash mismatch")
	}

	// Parse user JSON
	userStr := params.Get("user")
	if userStr == "" {
		return nil, fmt.Errorf("missing user data")
	}

	var tgUser TelegramUser
	if err := json.Unmarshal([]byte(userStr), &tgUser); err != nil {
		return nil, fmt.Errorf("invalid user JSON")
	}

	tgUser.StartParam = params.Get("start_param")
	return &tgUser, nil
}

func parseInitDataUnsafe(initData string) (*TelegramUser, error) {
	params, err := url.ParseQuery(initData)
	if err != nil {
		return nil, err
	}
	userStr := params.Get("user")
	if userStr == "" {
		// Try to parse as test user
		return &TelegramUser{
			ID:        123456789,
			FirstName: "Test",
			Username:  "testuser",
			LanguageCode: "en",
		}, nil
	}
	var u TelegramUser
	if err := json.Unmarshal([]byte(userStr), &u); err != nil {
		return nil, err
	}
	u.StartParam = params.Get("start_param")
	return &u, nil
}

// RateLimit returns a simple rate limiting middleware
func RateLimit(rps int) gin.HandlerFunc {
	// Simple IP-based rate limiting (production: use Redis)
	type entry struct {
		count    int
		resetAt  time.Time
	}
	counts := make(map[string]*entry)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		e, ok := counts[ip]
		if !ok || now.After(e.resetAt) {
			counts[ip] = &entry{count: 1, resetAt: now.Add(time.Second)}
			c.Next()
			return
		}

		e.count++
		if e.count > rps {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}
