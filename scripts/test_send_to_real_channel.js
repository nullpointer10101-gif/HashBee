const https = require('https');

const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
const channelId = '-1003750950966';

function sendChannelPost() {
  const shortHash = '7f952 ... 46412';
  const txUrl = 'https://tonviewer.com/transaction/7f952c4b8e21976a58fba2b4425e4d09265b6f3b0662d55122f3216896246412';
  const amount = 24.50; // Between 1.00 and 55.00!
  const currency = 'GRAM';

  const text = `✅ <b>Heist Miner Cashout Complete</b>

🔹 Amount: ${amount.toFixed(2)} ${currency}
🔹 In USD: $${amount.toFixed(2)}
🌐 TxId: <a href="${txUrl}">${shortHash}</a>`;

  const payload = {
    chat_id: channelId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔨 Play Heist Miner ➔',
            url: 'https://t.me/hashbe_bot?start=start',
          },
        ],
      ],
    },
  };

  const postData = JSON.stringify(payload);
  const req = https.request(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('RESPONSE:', data);
      });
    }
  );

  req.on('error', console.error);
  req.write(postData);
  req.end();
}

sendChannelPost();

