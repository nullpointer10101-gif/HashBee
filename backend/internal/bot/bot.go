package bot

import (
	"sync"
	"sync/atomic"
	"html"
	"time"
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
	text = strings.TrimSpace(text)
	if text == "" {
		text = "🐝 Open HashBee App"
	}
	url = strings.TrimSpace(url)
	if url == "" {
		url = "https://miniapp-five-topaz.vercel.app"
	}

	btn := InlineKeyboardButtonWithWebApp{
		Text: text,
	}

	if strings.HasPrefix(url, "https://t.me/") || strings.HasPrefix(url, "http://t.me/") {
		btn.URL = url
	} else {
		btn.WebApp = &WebAppInfo{URL: url}
	}

	return InlineKeyboardMarkupCustom{
		InlineKeyboard: [][]InlineKeyboardButtonWithWebApp{
			{btn},
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
	fullURL := webhookURL + "/bot/webhook"
	reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/setWebhook", b.cfg.BotToken)
	var payload string
	if b.cfg.WebhookSecret != "" {
		payload = fmt.Sprintf(`{"url":"%s","secret_token":"%s"}`, fullURL, b.cfg.WebhookSecret)
	} else {
		payload = fmt.Sprintf(`{"url":"%s"}`, fullURL)
	}
	resp, err := http.Post(reqURL, "application/json", strings.NewReader(payload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
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

	// Run user creation asynchronously so Telegram /start responds instantly without DB latency
	if b.userSvc != nil {
		go func(from tgbotapi.User, refID *int64) {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			newUser, isNew, _ := b.userSvc.GetOrCreate(ctx, from.ID, from.UserName, from.FirstName, from.LanguageCode, refID)
			// Notify the referrer when a new user joins via their link
			if isNew && refID != nil && newUser != nil {
				joinerName := from.FirstName
				if joinerName == "" {
					joinerName = from.UserName
				}
				if joinerName == "" {
					joinerName = "A new user"
				}
				b.SendReferralJoinNotification(*refID, joinerName)
			}
		}(*msg.From, referrerTelegramID)
	}

	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}

	// Append version query param to force Telegram to clear cached bundle
	versionQuery := "v=6.0"
	if strings.Contains(miniAppURL, "?") {
		miniAppURL = miniAppURL + "&" + versionQuery
	} else {
		miniAppURL = miniAppURL + "?" + versionQuery
	}

	appURLWithRef := miniAppURL
	if args != "" {
		appURLWithRef = fmt.Sprintf("%s&ref=%s", miniAppURL, args)
	}

	// Auto-set the chat menu button for this user to open the Mini App
	go func(chatID int64, appURL string) {
		reqURL := fmt.Sprintf("https://api.telegram.org/bot%s/setChatMenuButton", b.cfg.BotToken)
		payload := fmt.Sprintf(`{"chat_id":%d,"menu_button":{"type":"web_app","text":"⛏️ Open Miner","web_app":{"url":"%s"}}}`, chatID, appURL)
		http.Post(reqURL, "application/json", strings.NewReader(payload))
	}(msg.Chat.ID, appURLWithRef)

	keyboard := newWebAppKeyboard("⛏️ Open Miner", appURLWithRef)

	welcomeText := `⛏️ *MINE & EARN*

🎁 *Join And Get 50 GHS POWER*

✅ *Minimum Withdrawal 0.05 GRAM*

✍️ *Earn And Withdraw Without Restrictions.*

Tap the button below to start earning:`

	if referrerTelegramID != nil {
		welcomeText += fmt.Sprintf("\n\n🤝 You were invited by `%d`! You get a *+5 GHS* welcome bonus.", *referrerTelegramID)
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

// SendReferralJoinNotification notifies the referrer immediately when a new friend joins via their link
func (b *Bot) SendReferralJoinNotification(referrerTelegramID int64, joinerName string) {
	if b == nil || b.api == nil || referrerTelegramID == 0 {
		return
	}
	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	keyboard := newWebAppKeyboard("👥 View My Swarm", miniAppURL)

	botName := b.cfg.BotUsername
	if botName == "" {
		botName = "hashbe_bot"
	}

	safeName := html.EscapeString(joinerName)
	text := fmt.Sprintf(`🎉 <b>New Friend Joined!</b>

👤 <b>%s</b> just joined HashBee using your invite link!

⏳ <b>Status:</b> Pending
⚡ <b>Reward:</b> You will receive <b>+3 GHS</b> Hash Power bonus as soon as they collect their first mining harvest!

🤝 Keep sharing your link to grow your Swarm and earn more bonuses!

Your invite link: https://t.me/%s?start=%d`, safeName, botName, referrerTelegramID)

	msg := tgbotapi.NewMessage(referrerTelegramID, text)
	msg.ParseMode = "HTML"
	msg.ReplyMarkup = keyboard
	b.api.Send(msg)
}

// SendReferralActivatedNotification notifies referrer of new active referral
func (b *Bot) SendReferralActivatedNotification(telegramID int64, referredName string, rewardBP float64) {
	if b == nil || b.api == nil || telegramID == 0 {
		return
	}
	miniAppURL := b.cfg.MiniAppURL
	if miniAppURL == "" {
		miniAppURL = "https://miniapp-five-topaz.vercel.app"
	}
	keyboard := newWebAppKeyboard("⚡ Check Mining Power", miniAppURL)

	safeName := html.EscapeString(referredName)
	text := fmt.Sprintf(`🎉 <b>Referral Activated!</b>

👤 <b>%s</b> just collected their first mining harvest!

⚡ You've unlocked <b>+%.2f GHS</b> Hash Power bonus!
Your mining speed has increased automatically. 🚀`, safeName, rewardBP)

	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "HTML"
	msg.ReplyMarkup = keyboard
	b.api.Send(msg)
}

// SendDepositNotification notifies user of credited blockchain deposit
func (b *Bot) SendDepositNotification(telegramID int64, amountGram, ghsPower float64) {
	text := fmt.Sprintf("🎉 *Deposit Received & Verified!*\n\n💎 Deposited: *+%.3f GRAM*\n⚡ Mining Power Added: *+%.2f GHS*!\n\nYour miner is accumulating at the upgraded rate 24/7!", amountGram, ghsPower)
	msg := tgbotapi.NewMessage(telegramID, text)
	msg.ParseMode = "Markdown"
	if b.api != nil {
		b.api.Send(msg)
	}
}

// BroadcastWithButtonProgress sends messages concurrently with rate limiting and progress callback
func (b *Bot) BroadcastWithButtonProgress(ctx context.Context, text string, buttonText, buttonURL string, telegramIDs []int64, onProgress func(sent, failed, total int)) (int, int) {
	if b == nil || b.api == nil || len(telegramIDs) == 0 {
		return 0, 0
	}

	keyboard := newWebAppKeyboard(buttonText, buttonURL)
	total := len(telegramIDs)
	var sentCount int64
	var failedCount int64

	jobs := make(chan int64, total)
	for _, id := range telegramIDs {
		jobs <- id
	}
	close(jobs)

	limiter := time.NewTicker(33 * time.Millisecond)
	defer limiter.Stop()

	var wg sync.WaitGroup
	workers := 5
	if total < workers {
		workers = total
	}

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for id := range jobs {
				select {
				case <-ctx.Done():
					return
				case <-limiter.C:
				}

				msg := tgbotapi.NewMessage(id, text)
				msg.ParseMode = "Markdown"
				msg.ReplyMarkup = keyboard

				if _, err := b.api.Send(msg); err != nil {
					atomic.AddInt64(&failedCount, 1)
				} else {
					atomic.AddInt64(&sentCount, 1)
				}

				if onProgress != nil {
					s := int(atomic.LoadInt64(&sentCount))
					f := int(atomic.LoadInt64(&failedCount))
					onProgress(s, f, total)
				}
			}
		}()
	}

	wg.Wait()
	return int(sentCount), int(failedCount)
}

// BroadcastWithButton sends a message with an inline WebApp button to a list of telegram IDs
func (b *Bot) BroadcastWithButton(ctx context.Context, text string, buttonText, buttonURL string, telegramIDs []int64) (int, int) {
	return b.BroadcastWithButtonProgress(ctx, text, buttonText, buttonURL, telegramIDs, nil)
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
