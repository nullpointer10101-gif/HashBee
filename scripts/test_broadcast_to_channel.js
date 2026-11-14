const https = require('https');

const BOT_TOKEN = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
const CHANNEL_ID = -1003750950966; // @HashBeePayouts

async function sendToChannel() {
  const text = `🔨 *HEIST MINER — VAULT DRILLS ARE RUNNING 24/7!* 🪙⚡

🚨 *ATTENTION ALL DRILL OPERATIVES:*
The cyber vault is fully unlocked with millions in bullion waiting to be extracted!

🥷 *Deploy Your Safecrackers:*
• Drill Bullion Gold from the cyber vault 24/7
• Smelt Vault Gold into Real Cash Balance ($1.00 = 100k Gold)
• Claim free auxiliary battery power streaks every 24 hours
• 100% Verified instant on-chain cashouts in TON, USD₮, and TRX!

🎁 *Your Starter Package:*
⚡ +1 Free Drill Rookie
🔋 +50,000 kWh Battery Pack
💰 +$0.50 Starter Cashout Yield

👇 *Tap below to launch Heist Miner & start drilling:*`;

  const payload = JSON.stringify({
    chat_id: CHANNEL_ID,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔨 Play Heist Miner ➔',
            url: 'https://t.me/hashbe_bot?start=channel'
          }
        ]
      ]
    }
  });

  const req = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Result:', JSON.parse(data));
    });
  });

  req.on('error', console.error);
  req.write(payload);
  req.end();
}

sendToChannel();
