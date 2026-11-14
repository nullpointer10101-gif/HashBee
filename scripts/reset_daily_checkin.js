const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function resetCheckins() {
  await client.connect();
  console.log('Connected to DB');

  // Check how many users have last_checkin_at or streak_count > 0
  const before = await client.query('SELECT COUNT(*) FROM users WHERE last_checkin_at IS NOT NULL OR streak_count > 0');
  console.log('Users with check-ins before reset:', before.rows[0].count);

  // Reset for all users
  const res = await client.query('UPDATE users SET last_checkin_at = NULL, streak_count = 0');
  console.log('Reset completed. Rows updated:', res.rowCount);

  // Verify
  const after = await client.query('SELECT COUNT(*) FROM users WHERE last_checkin_at IS NOT NULL');
  console.log('Users with check-ins after reset:', after.rows[0].count);

  await client.end();
}

resetCheckins().catch(console.error);
