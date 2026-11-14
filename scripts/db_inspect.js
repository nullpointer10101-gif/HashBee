const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const realUsersCount = await pool.query('SELECT count(*) as count FROM users WHERE telegram_id < 990000000');
  console.log('Real users count:', realUsersCount.rows[0].count);

  const realSample = await pool.query('SELECT id, telegram_id, username, first_name, honey_balance, bp, created_at FROM users WHERE telegram_id < 990000000 ORDER BY created_at DESC LIMIT 10');
  console.log('Real sample users:', realSample.rows);

  const kanzx = await pool.query('SELECT id, telegram_id, username, first_name, honey_balance, bp FROM users WHERE telegram_id = 6446145632 OR username ILIKE \'%kiopajje%\'');
  console.log('User Kanzx / Owner:', kanzx.rows);

  await pool.end();
}

run().catch(console.error);
