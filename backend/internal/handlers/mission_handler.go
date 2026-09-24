package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"hashbee/internal/models"
	"hashbee/internal/services"
)

type MissionHandler struct {
	missionSvc *services.MissionService
	referralSvc *services.ReferralService
}

func NewMissionHandler(missionSvc *services.MissionService, referralSvc *services.ReferralService) *MissionHandler {
	return &MissionHandler{missionSvc: missionSvc, referralSvc: referralSvc}
}

// GET /api/missions — List all missions for user
func (h *MissionHandler) ListMissions(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	missions, err := h.missionSvc.ListMissionsForUser(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch missions"})
		return
	}

	// Separate sponsored vs milestone
	var sponsored, milestone []models.Mission
	for _, m := range missions {
		if m.Type == models.MissionTypeMilestone {
			milestone = append(milestone, m)
		} else {
			sponsored = append(sponsored, m)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"sponsored": sponsored,
		"milestone": milestone,
	})
}

// POST /api/missions/:id/start — Start a mission
func (h *MissionHandler) StartMission(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	missionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mission id"})
		return
	}

	completion, err := h.missionSvc.StartMission(c.Request.Context(), user.ID, missionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"completion": completion})
}

// POST /api/missions/:id/verify — Verify a mission
func (h *MissionHandler) VerifyMission(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	missionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mission id"})
		return
	}

	rewardBP, err := h.missionSvc.VerifyMission(c.Request.Context(), user.ID, missionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if referral can now be activated
	if !user.HasCompletedMission {
		go h.referralSvc.TryActivateReferral(c.Request.Context(), user.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"reward_bp": rewardBP,
		"message":   "Mission verified! Bee Power added.",
	})
}

// POST /api/missions/:id/claim — Claim a milestone mission
func (h *MissionHandler) ClaimMilestone(c *gin.Context) {
	user := c.MustGet("user").(*models.User)

	missionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mission id"})
		return
	}

	rewardBP, err := h.missionSvc.ClaimMilestoneMission(c.Request.Context(), user.ID, missionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reward_bp": rewardBP,
		"message":   "Milestone claimed! Bee Power added.",
	})
}
