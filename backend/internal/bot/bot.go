package bot

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"hashbee/internal/config"
	"hashbee/internal/services"
)

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
	api.Debug = cfg.Env == "development"
	log.Printf("🐝 HashBee Bot authorized as @%s", api.Self.UserName)
	return &Bot{api: api, cfg: cfg, userSvc: userSvc}, nil
}

// SetWebhook sets the bot webhook URL
func (b *Bot) SetWebhook(webhookURL string) error {
	wh, err := tgbotapi.NewWebhook(webhookURL + "/bot/webhook")
	if err != nil {
		return err
	}
	_, err = b.api.Request(wh)
	return err
}

// HandleUpdate processes a single update from Telegram
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
	args := msg.CommandArguments()
	var referrerTelegramID *int64
	if args != "" {
		_ = args
	}

	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}

	// Auto-set the chat menu button for this user to open the Mini App
	go func(chatID int64, appURL string) {
		reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/setChatMenuButton", b.cfg.BotToken)
		payload := fmt.Sprintf(`{"chat_id":%d,"menu_button":{"type":"web_app","text":"⛏️ Open Miner","web_app":{"url":"%s"}}}`, chatID, appURL)
		http.Post(reqURL, "application/json", strings.NewReader(payload))
	}(msg.Chat.ID, miniAppURL)

	webApp := tgbotapi.WebAppInfo{URL: miniAppURL}
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.InlineKeyboardButton{
				Text:   "🍯 Open HashBee Miner",
				WebApp: &webApp,
			},
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL("🌐 Open WebApp Directly", miniAppURL),
		),
	)

	welcomeText := `🐝 *Welcome to HashBee!*

Earn *Honey* passively using your *Bee Power*, invite friends to your *Swarm*, complete *Missions*, and *Cash Out* your rewards!

🍯 Your Hive fills up automatically — come back regularly to collect.

Tap the button below to start earning:`

	if referrerTelegramID != nil {
		welcomeText += "\n\n🤝 You were invited! You'll get a *+2 BP* welcome bonus."
	}

	reply := tgbotapi.NewMessage(msg.Chat.ID, welcomeText)
	reply.ParseMode = "Markdown"
	reply.ReplyMarkup = keyboard

	b.api.Send(reply)
}

func (b *Bot) handleHelp(msg *tgbotapi.Message) {
	text := `🐝 *HashBee Help*

*Bee Power (BP)* — Your earning rate. More BP = more Honey per hour.
*Honey* — The currency you collect and can cash out.
*Hive* — Pending honey that fills up (max 8 hours). Collect regularly!
*Swarm* — Your referral network. Invite friends for more BP.
*Missions* — Complete tasks to earn BP rewards.
*Cash Out* — Withdraw your Honey balance to crypto.`

	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	webApp := tgbotapi.WebAppInfo{URL: miniAppURL}
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.InlineKeyboardButton{
				Text:   "🍯 Open HashBee Miner",
				WebApp: &webApp,
			},
		),
	)

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
	webApp := tgbotapi.WebAppInfo{URL: miniAppURL}
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.InlineKeyboardButton{
				Text:   "🍯 Open HashBee Miner",
				WebApp: &webApp,
			},
		),
	)

	user, err := b.userSvc.GetByTelegramID(context.Background(), msg.From.ID)
	if err != nil {
		reply := tgbotapi.NewMessage(msg.Chat.ID, "You don't have an account yet. Open the app to get started!")
		reply.ReplyMarkup = keyboard
		b.api.Send(reply)
		return
	}

	text := fmt.Sprintf(`🐝 *Your HashBee Balance*

🍯 Honey: *%.4f*
⚡ Bee Power: *%.2f BP*
🔥 Streak: *%d days*

Open the miner to collect your pending Honey!`, user.HoneyBalance, user.BP, user.StreakCount)

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
	webApp := tgbotapi.WebAppInfo{URL: miniAppURL}
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.InlineKeyboardButton{
				Text:   "🍯 Collect Now",
				WebApp: &webApp,
			},
		),
	)

	text := "🍯 *Your Hive is full!*\n\nYour Hive has reached its capacity. Collect your Honey now before it stops growing!"
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
		text = "💸 Your Cash Out request is now *Processing*. We'll notify you when it's paid!"
	case "paid":
		text = "✅ Your Cash Out has been *Paid*! Check your wallet."
	case "rejected":
		text = fmt.Sprintf("❌ Your Cash Out was *Rejected*.\nReason: %s\n\nYour Honey has been refunded.", reason)
	default:
		return
	}

	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "Markdown"
	b.api.Send(msg)
}

// SendReferralActivatedNotification notifies referrer of new active referral
func (b *Bot) SendReferralActivatedNotification(telegramID int64, referredName string, rewardBP float64) {
	text := fmt.Sprintf("🐝 *New active Swarm member!*\n\n%s has joined your Swarm and is now active.\nYou earned *+%.2f BP*!", referredName, rewardBP)
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
