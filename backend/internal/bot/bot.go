package bot

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"hashbee/internal/config"
	"hashbee/internal/services"
)

// WebApp structures for Telegram Bot API compatible with all tgbotapi versions
type WebAppInfo struct {
	URL string `json:"url"`
}

type InlineKeyboardButtonWithWebApp struct {
	Text   string      `json:"text"`
	URL    string      `json:"url,omitempty"`
	WebApp *WebAppInfo `json:"web_app,omitempty"`
}

type InlineKeyboardMarkupCustom struct {
	InlineKeyboard [][]InlineKeyboardButtonWithWebApp `json:"inline_keyboard"`
}

func newWebAppKeyboard(text, url string) InlineKeyboardMarkupCustom {
	return InlineKeyboardMarkupCustom{
		InlineKeyboard: [][]InlineKeyboardButtonWithWebApp{
			{
				{
					Text:   text,
					WebApp: &WebAppInfo{URL: url},
				},
			},
			{
				{
					Text: "🌐 Open WebApp Directly",
					URL:  url,
				},
			},
		},
	}
}

type Bot struct {
	api     *tgbotapi.BotAPI
	cfg     *config.Config
	userSvc *services.UserService
}

func New(cfg *config.Config, userSvc *services.UserService) (*Bot, error) {
	api, err := tgbotapi.NewBotAPI(cfg.BotToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create bot: %w", err)
	}

	log.Printf("🐝 HashBee Bot authorized as @%s", api.Self.UserName)
	return &Bot{api: api, cfg: cfg, userSvc: userSvc}, nil
}

// SetWebhook sets the bot webhook URL
func (b *Bot) SetWebhook(webhookURL string) error {
	wh, err := tgbotapi.NewWebhook(webhookURL + "/bot/webhook")
	if err != nil {
		return err
	}
	if b.cfg.WebhookSecret != "" {
		wh.SecretToken = b.cfg.WebhookSecret
	}
	_, err = b.api.Request(wh)
	return err
}

func (b *Bot) HandleUpdate(update tgbotapi.Update) {
	if update.Message == nil {
		return
	}

	msg := update.Message
	if !msg.IsCommand() {
		return
	}

	switch msg.Command() {
	case "start":
		b.handleStart(msg)
	case "help":
		b.handleHelp(msg)
	case "balance":
		b.handleBalance(msg)
	}
}

func (b *Bot) handleStart(msg *tgbotapi.Message) {
	args := strings.TrimSpace(msg.CommandArguments())
	var referrerTelegramID *int64
	if args != "" {
		if refID, err := strconv.ParseInt(args, 10, 64); err == nil && refID != msg.From.ID {
			referrerTelegramID = &refID
		}
	}

	if b.userSvc != nil {
		_, _, _ = b.userSvc.GetOrCreate(context.Background(), msg.From.ID, msg.From.UserName, msg.From.FirstName, msg.From.LanguageCode, referrerTelegramID)
	}

	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}

	appURLWithRef := miniAppURL
	if args != "" {
		if strings.Contains(miniAppURL, "?") {
			appURLWithRef = fmt.Sprintf("%s&ref=%s", miniAppURL, args)
		} else {
			appURLWithRef = fmt.Sprintf("%s?ref=%s", miniAppURL, args)
		}
	}

	// Auto-set the chat menu button for this user to open the Mini App
	go func(chatID int64, appURL string) {
		reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/setChatMenuButton", b.cfg.BotToken)
		payload := fmt.Sprintf(`{"chat_id":%d,"menu_button":{"type":"web_app","text":"⛏️ Open Miner","web_app":{"url":"%s"}}}`, chatID, appURL)
		http.Post(reqURL, "application/json", strings.NewReader(payload))
	}(msg.Chat.ID, appURLWithRef)

	keyboard := newWebAppKeyboard("🍯 Open Miner", appURLWithRef)

	welcomeText := `🐝 *Welcome to HashBee!*

Earn *USDT* passively using your *GHS Mining Power*, invite friends to earn bonuses, complete missions, and cash out!

⛏️ Your miner works 24/7 — come back regularly to claim your USDT.

Tap the button below to start earning:`

	if referrerTelegramID != nil {
		welcomeText += fmt.Sprintf("\n\n🤝 You were invited by `%d`! You get a *+2.5 GHS* welcome bonus.", *referrerTelegramID)
	}

	reply := tgbotapi.NewMessage(msg.Chat.ID, welcomeText)
	reply.ParseMode = "Markdown"
	reply.ReplyMarkup = keyboard

	b.api.Send(reply)
}

func (b *Bot) handleHelp(msg *tgbotapi.Message) {
	text := `🐝 *HashBee Help*

*Bee Power (BP / GHS)* — Your earning rate. More GHS = more USDT per day.
*USDT* — The currency you collect and cash out directly via BSC (BEP-20) or GRAM.
*Mining* — Generates USDT continuously 24/7. Collect regularly!
*Referrals* — Invite friends using your Telegram ID link for bonus GHS.
*Missions* — Complete tasks to earn free GHS.
*Cash Out* — Fast withdrawal to USDT (BSC) or GRAM.`

	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	keyboard := newWebAppKeyboard("🍯 Open Miner", miniAppURL)

	reply := tgbotapi.NewMessage(msg.Chat.ID, text)
	reply.ParseMode = "Markdown"
	reply.ReplyMarkup = keyboard
	b.api.Send(reply)
}

func (b *Bot) handleBalance(msg *tgbotapi.Message) {
	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	keyboard := newWebAppKeyboard("🍯 Open Miner", miniAppURL)

	user, err := b.userSvc.GetByTelegramID(context.Background(), msg.From.ID)
	if err != nil {
		reply := tgbotapi.NewMessage(msg.Chat.ID, "You don't have an account yet. Open the app to get started!")
		reply.ReplyMarkup = keyboard
		b.api.Send(reply)
		return
	}

	text := fmt.Sprintf(`🐝 *Your HashBee Balance*

🍯 Balance: *%.7f USDT*
⚡ Mining Power: *%.1f GHS*
🔥 Streak: *%d days*

Open the miner to collect your pending USDT!`, user.HoneyBalance, user.BP, user.StreakCount)

	reply := tgbotapi.NewMessage(msg.Chat.ID, text)
	reply.ParseMode = "Markdown"
	reply.ReplyMarkup = keyboard
	b.api.Send(reply)
}

// SendHiveFullNotification sends a "your hive is full" notification
func (b *Bot) SendHiveFullNotification(telegramID int64) {
	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	keyboard := newWebAppKeyboard("🍯 Collect Now", miniAppURL)

	text := "🍯 *Your Miner is full!*\n\nYour accumulated balance has reached maximum capacity. Claim your USDT now so your mining continues at full speed!"
	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "Markdown"
	msg.ReplyMarkup = keyboard
	b.api.Send(msg)
}

// SendWithdrawalNotification notifies user of withdrawal status change
func (b *Bot) SendWithdrawalNotification(telegramID int64, status, reason string) {
	var text string
	switch status {
	case "processing":
		text = "💸 Your Withdrawal request is now *Processing*. We'll notify you when it's paid!"
	case "paid":
		text = "✅ Your Withdrawal has been *Paid*! Check your wallet."
	case "rejected":
		text = fmt.Sprintf("❌ Your Withdrawal was *Rejected*.\nReason: %s\n\nYour balance has been refunded.", reason)
	default:
		return
	}

	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "Markdown"
	b.api.Send(msg)
}

// SendReferralActivatedNotification notifies referrer of new active referral
func (b *Bot) SendReferralActivatedNotification(telegramID int64, referredName string, rewardBP float64) {
	text := fmt.Sprintf("🐝 *New active Swarm member!*\n\n%s has joined your Swarm and is now active.\nYou earned *+%.2f GHS*!", referredName, rewardBP)
	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "Markdown"
	b.api.Send(msg)
}

// Broadcast sends a message to all opted-in users
func (b *Bot) Broadcast(text string, telegramIDs []int64) {
	for _, id := range telegramIDs {
		msg := tgbotapi.NewMessage(id, text)
		msg.ParseMode = "Markdown"
		if _, err := b.api.Send(msg); err != nil {
			if strings.Contains(err.Error(), "blocked") || strings.Contains(err.Error(), "deactivated") {
				log.Printf("User %d blocked bot or is deactivated", id)
			}
		}
	}
}

// GetAPI returns the underlying bot API
func (b *Bot) GetAPI() *tgbotapi.BotAPI {
	return b.api
}
