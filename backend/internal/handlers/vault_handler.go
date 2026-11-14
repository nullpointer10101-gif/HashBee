package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type VaultHandler struct {
	vaultSvc    *services.VaultService
	botUsername string
}

func NewVaultHandler(vaultSvc *services.VaultService, botUsername string) *VaultHandler {
	return &VaultHandler{
		vaultSvc:    vaultSvc,
		botUsername: botUsername,
	}
}

// GET /api/vault/status
func (h *VaultHandler) GetStatus(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	status, err := h.vaultSvc.GetVaultStatus(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

// POST /api/gold/smelt
func (h *VaultHandler) SmeltGold(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	goldSmelted, usdCredited, newBalance, err := h.vaultSvc.SmeltGold(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"gold_smelted":   goldSmelted,
		"usd_credited":   usdCredited,
		"new_balance":    newBalance,
		"message":        "Gold successfully smelted into cash balance",
	})
}

type BuyCrewRequest struct {
	CrewType string `json:"crew_type" binding:"required"`
}

// POST /api/crew/buy
func (h *VaultHandler) BuyCrew(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	var req BuyCrewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid crew_type payload"})
		return
	}

	crew, newBalance, err := h.vaultSvc.BuyCrew(c.Request.Context(), user.ID, req.CrewType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"crew":        crew,
		"new_balance": newBalance,
		"message":     "Safecracker hired successfully",
	})
}

type BuyEnergyRequest struct {
	PackID string `json:"pack_id" binding:"required"`
}

// POST /api/energy/buy
func (h *VaultHandler) BuyEnergy(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	var req BuyEnergyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pack_id payload"})
		return
	}

	newEnergy, newBalance, err := h.vaultSvc.BuyEnergy(c.Request.Context(), user.ID, req.PackID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"energy_kwh":  newEnergy,
		"new_balance": newBalance,
		"message":     "Power battery pack charged successfully",
	})
}

// GET /api/syndicate
func (h *VaultHandler) GetSyndicate(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	syndicate, err := h.vaultSvc.GetSyndicate(c.Request.Context(), user.ID, h.botUsername)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, syndicate)
}

// POST /api/syndicate/claim
func (h *VaultHandler) ClaimSyndicate(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	collectedUSD, newBalance, err := h.vaultSvc.ClaimSyndicatePurse(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"collected_usd": collectedUSD,
		"new_balance":   newBalance,
		"message":       "Syndicate purse loot collected into cash balance",
	})
}

// POST /api/daily-supply
func (h *VaultHandler) ClaimDailySupply(c *gin.Context) {
	uVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user := uVal.(*models.User)

	rewardKWh, streakDay, err := h.vaultSvc.ClaimDailySupply(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"reward_kwh":    rewardKWh,
		"streak_day":    streakDay,
		"message":       "Daily generator battery drop claimed",
	})
}

