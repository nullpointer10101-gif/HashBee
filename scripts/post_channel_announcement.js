const https = require('https');

const botToken = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
const chatId = '@HashBeePayouts';

const text = `🚨 <b>VAULT ACCESS RESTORED — CLAIM YOUR RE-OPENING BONUS!</b> 🎁💰

Attention all miners and operatives! The <b>Heist Miner</b> cyber vault is running at 100% capacity and payouts are live!

All returning operatives receive an exclusive <b>Starter & Recovery Pack</b> upon login:
💰 <b>+$0.50 Instant Cashout Balance</b>
🔋 <b>+50,000 kWh Free Battery Power</b>
🔨 <b>+1 Free Vault Rookie Operative</b>
⚡ <b>Instant Cashouts in TON & USDT</b>

Tap the button below right now to claim your starter pack, activate your drills, and start smelting gold bullion into real cash! 👇`;

const replyMarkup = {
  inline_keyboard: [
    [
      { text: '🔨 Claim Bonus & Launch Heist Miner ➔', url: 'https://t.me/hashbe_bot?start=payouts' }
    ]
  ]
};

const payload = JSON.stringify({
  chat_id: chatId,
  text: text,
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
        console.log(`Message successfully posted! Message ID: ${msgId}`);

        // Pin the message with notification
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

