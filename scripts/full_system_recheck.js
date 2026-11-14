const https = require('https');
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const BOT_TOKEN = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function fullAudit() {
  console.log('================ FULL SYSTEM AUDIT ================');

  // 1. Backend Health
  const backend = await fetchUrl('https://hashbee1.onrender.com/health');
  console.log('1. Render Backend (/health):', backend.status, backend.body);

  // 2. Mini App Health
  const miniapp = await fetchUrl('https://miniapp-five-topaz.vercel.app');
  console.log('2. Vercel MiniApp:', miniapp.status === 200 ? '✅ 200 OK (LIVE)' : '❌ ' + miniapp.status);

  // 3. Webhook Info
  const webhook = await fetchUrl(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  console.log('3. Telegram Webhook:', JSON.parse(webhook.body).result);

  // 4. Bot Metadata
  const me = await fetchUrl(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  console.log('4. Bot Name & Username:', JSON.parse(me.body).result.first_name, '@' + JSON.parse(me.body).result.username);

  // 5. Database Status
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const userCount = await client.query('SELECT COUNT(*) FROM users');
  const checkinPending = await client.query('SELECT COUNT(*) FROM users WHERE last_checkin_at IS NOT NULL');
  const depositAddresses = await client.query("SELECT key, value FROM settings WHERE key LIKE '%deposit%'");
  console.log('5. Database Users Count:', userCount.rows[0].count);
  console.log('   Users with pending checkin:', checkinPending.rows[0].count, '(0 expected after reset)');
  console.log('   Deposit Settings:', depositAddresses.rows);

  // 6. Payout Mirror Channel
  const payoutSettings = await client.query("SELECT key, value FROM settings WHERE key LIKE 'payout_mirror%'");
  console.log('6. Payout Mirror Settings:', payoutSettings.rows);

  await client.end();
  console.log('================ AUDIT COMPLETE ================');
}

fullAudit().catch(console.error);

