const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const stats = await pool.query('SELECT status, count(*) FROM withdrawals GROUP BY status');
    console.log('--- WITHDRAWALS BY STATUS ---');
    console.log(stats.rows);

    const latest = await pool.query('SELECT id, user_id, amount, status, address, network, created_at FROM withdrawals ORDER BY created_at DESC LIMIT 5');
    console.log('--- LATEST 5 WITHDRAWALS ---');
    console.log(latest.rows);

    const mirrorSetting = await pool.query("SELECT key, value FROM settings WHERE key LIKE '%mirror%' OR key LIKE '%payout%'");
    console.log('--- PAYOUT / MIRROR SETTINGS ---');
    console.log(mirrorSetting.rows);

    const res = await fetch('https://t.me/s/AiLabRobotPayouts');
    const html = await res.text();
    const regex = /data-post="AiLabRobotPayouts\/([0-9]+)"/g;
    let match;
    const ids = [];
    while ((match = regex.exec(html)) !== null) {
      ids.push(parseInt(match[1]));
    }
    console.log('--- LATEST POST IDS ON SOURCE TELEGRAM ---');
    console.log(ids.slice(-5));

    const users = await pool.query('SELECT count(*) as total, count(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') as new_24h FROM users');
    console.log('--- USERS ---');
    console.log(users.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
