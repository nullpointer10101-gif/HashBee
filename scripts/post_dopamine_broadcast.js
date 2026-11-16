const https = require('https');

const botToken = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
const chatId = '@HashBeePayouts';

const dopamineText = `⚡ <b>HEIST MINER IS LIVE — THE VAULT IS OPEN!</b> 🪙🔨

The cyber drills are spinning, and real cashouts are flowing 24/7! 💸🔥

💎 <b>HOW OPERATIVES MAKE CASH DAILY:</b>
• ⛏️ <b>Automated Drills:</b> Your operatives mine gold bullion while you sleep.
• 🔥 <b>Instant Smelting:</b> 100k Gold = $1.00 Real USD cash.
• ⚡ <b>Instant Cashouts:</b> Withdraw directly in TON, USD₮, and TRX!
• 👥 <b>10% Syndicate Cut:</b> Earn passive crypto from your friends forever.

🎁 <b>AIRDROP CLAIMABLE FOR EVERY RETURNING PLAYER:</b>
💰 <b>+$0.50 Instant Cashout Balance</b>
🔋 <b>+50,000 kWh Free Battery Power</b>
🔨 <b>+1 Free Vault Safecracker Operative</b>

👇 <b>Tap below to claim your airdrop and start drilling right now:</b>`;

const replyMarkup = {
  inline_keyboard: [
    [
      { text: '🔨 Play Heist Miner & Claim $0.50 ➔', url: 'https://t.me/hashbe_bot?start=vault' }
    ]
  ]
};

const payload = JSON.stringify({
  chat_id: chatId,
  text: dopamineText,
  parse_mode: 'HTML',
  reply_markup: replyMarkup
});

const req = https.request({
  hostname: 'api.telegram.org',
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('SendMessage Response:', data);

      if (data.ok && data.result && data.result.message_id) {
        const msgId = data.result.message_id;
        console.log(`Message successfully posted to @HashBeePayouts! ID: ${msgId}`);

        // Pin the message with sound alert
        const pinPayload = JSON.stringify({
          chat_id: chatId,
          message_id: msgId,
          disable_notification: false
        });

        const pinReq = https.request({
          hostname: 'api.telegram.org',
          path: `/bot${botToken}/pinChatMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(pinPayload)
          }
        }, (pinRes) => {
          let pinBody = '';
          pinRes.on('data', chunk => pinBody += chunk);
          pinRes.on('end', () => {
            console.log('PinChatMessage Response:', pinBody);
          });
        });
        pinReq.write(pinPayload);
        pinReq.end();
      }
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
});

req.on('error', console.error);
req.write(payload);
req.end();

