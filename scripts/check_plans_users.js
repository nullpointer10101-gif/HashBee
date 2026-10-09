const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const plansCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_plans'
    `);
    console.log('user_plans columns:', plansCols.rows.map(r => r.column_name));

    const { rows: allPlans } = await pool.query(`
      SELECT up.*, u.username, u.telegram_id 
      FROM user_plans up
      LEFT JOIN users u ON up.user_id = u.id
    `);
    console.log('All user_plans count:', allPlans.length);
    console.log('User plans records:', allPlans);

    const usersWithGranted = await pool.query(`
      SELECT id, username, telegram_id, one_time_withdrawal_granted 
      FROM users 
      WHERE one_time_withdrawal_granted = true
    `);
    console.log('Users with one_time_withdrawal_granted count:', usersWithGranted.rows.length);
    if (usersWithGranted.rows.length > 0) {
      console.log('Users with one_time_withdrawal_granted:', usersWithGranted.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
