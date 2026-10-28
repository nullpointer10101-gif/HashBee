const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';

function sendTelegramMessage(chatId, text) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });

    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function verify() {
  const tgId = 7363782460;
  console.log('--- VERIFYING USER STATE IN DATABASE ---');
  const u = await pool.query('SELECT id, telegram_id, username, first_name, bp, honey_balance, one_time_withdrawal_granted, updated_at FROM users WHERE telegram_id = $1', [tgId]);
  console.log('User:', u.rows[0]);

  const p = await pool.query('SELECT * FROM user_plans WHERE user_id = $1', [u.rows[0].id]);
  console.log('Active Plans:', p.rows);

  const t = await pool.query('SELECT type, amount, currency, description, idempotency_key FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3', [u.rows[0].id]);
  console.log('Recent Transactions:', t.rows);

  // Send notification to user on Telegram
  const notifyText = `🎉 <b>Payment Verified & Miner Activated!</b>\n\n` +
    `Hello <b>Md Raju</b>,\n` +
    `Your payment of <b>1.30 TON / GRAM</b> has been successfully verified on-chain!\n\n` +
    `⚡ <b>Activated Miner:</b> Cyber Worker Miner (24H Daily Yield)\n` +
    `💰 <b>Expected Yield:</b> +2.00 GRAM\n` +
    `🚀 <b>Hashrate Added:</b> +676.00 GHS Power\n` +
    `🔓 <b>Status:</b> Lifetime Cashouts Unlocked!\n\n` +
    `Your miner is now running and mining automatically in HashBee! 🐝`;

  const tgRes = await sendTelegramMessage(tgId, notifyText);
  console.log('Telegram Notification Result:', tgRes);

  await pool.end();
}

verify();
