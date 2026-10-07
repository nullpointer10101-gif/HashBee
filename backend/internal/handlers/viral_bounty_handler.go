package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type ViralBountyHandler struct {
	bountySvc *services.ViralBountyService
}

func NewViralBountyHandler(bountySvc *services.ViralBountyService) *ViralBountyHandler {
	return &ViralBountyHandler{bountySvc: bountySvc}
}

// GET /api/viral-bounty
func (h *ViralBountyHandler) GetBountyInfo(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	info, err := h.bountySvc.GetUserBountyInfo(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, info)
}

// POST /api/viral-bounty/claim
func (h *ViralBountyHandler) CreateClaim(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	var req struct {
		WalletAddress string `json:"wallet_address" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Wallet address is required"})
		return
	}

	res, err := h.bountySvc.CreateCashoutRequest(c.Request.Context(), user.ID, req.WalletAddress)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cashout request initiated. Please complete the 1.20 GRAM network fee payment to verify your destination wallet.",
		"request": res,
	})
}
