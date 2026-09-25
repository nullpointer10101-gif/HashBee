package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type WithdrawalHandler struct {
	withdrawalSvc *services.WithdrawalService
}

func NewWithdrawalHandler(withdrawalSvc *services.WithdrawalService) *WithdrawalHandler {
	return &WithdrawalHandler{withdrawalSvc: withdrawalSvc}
}

// POST /api/withdraw — Create withdrawal request
func (h *WithdrawalHandler) CreateWithdrawal(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	var req services.WithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	w, err := h.withdrawalSvc.CreateWithdrawal(c.Request.Context(), user.ID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"withdrawal": w,
		"message":    "Cash Out request submitted. You will be notified when it is processed.",
	})
}

// GET /api/withdrawals — Get user withdrawal history
func (h *WithdrawalHandler) GetWithdrawals(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	withdrawals, err := h.withdrawalSvc.GetUserWithdrawals(c.Request.Context(), user.ID, 20, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch withdrawals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"withdrawals": withdrawals})
}

// POST /api/reinvest — Reinvest honey into BP
func (h *WithdrawalHandler) Reinvest(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	var req struct {
		HoneyAmount float64 `json:"honey_amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.HoneyAmount < 1.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimum reinvest amount is 1 USDT"})
		return
	}

	bpGained, err := h.withdrawalSvc.Reinvest(c.Request.Context(), user.ID, req.HoneyAmount)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bp_gained": bpGained,
		"message":   "Honey reinvested into Bee Power!",
	})
}

// ================================================
// CAMPAIGN HANDLER
// ================================================

type CampaignHandler struct {
	campaignSvc *services.CampaignService
}

func NewCampaignHandler(campaignSvc *services.CampaignService) *CampaignHandler {
	return &CampaignHandler{campaignSvc: campaignSvc}
}

// POST /api/campaigns — Create boost campaign
func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	var req services.CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	campaign, err := h.campaignSvc.CreateCampaign(c.Request.Context(), user.ID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

// GET /api/campaigns — List user's campaigns
func (h *CampaignHandler) GetMyCampaigns(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	campaigns, err := h.campaignSvc.GetUserCampaigns(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch campaigns"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns})
}

// DELETE /api/campaigns/:id — Cancel campaign
func (h *CampaignHandler) CancelCampaign(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	campaignID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	if err := h.campaignSvc.CancelCampaign(c.Request.Context(), campaignID, user.ID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign cancelled. Unused completions will be refunded."})
}
