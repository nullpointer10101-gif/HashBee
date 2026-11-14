const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log('users columns:', cols.rows.map(r => r.column_name).join(', '));

  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('tables:', tables.rows.map(r => r.table_name).join(', '));

  const uCount = await pool.query("SELECT COUNT(*) FROM users");
  console.log('users count:', uCount.rows[0].count);

  const refCount = await pool.query("SELECT COUNT(*) FROM referrals");
  console.log('referrals count:', refCount.rows[0].count);

  const syndCount = await pool.query("SELECT COUNT(*) FROM syndicate_earnings");
  console.log('syndicate_earnings count:', syndCount.rows[0].count);

  await pool.end();
}
check();

