const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectReferrals() {
  try {
    const userStats = await pool.query(`
      SELECT COUNT(*) as total_users,
             COALESCE(SUM(referral_count), 0) as total_referral_counts,
             COUNT(*) FILTER (WHERE referrer_id IS NOT NULL) as users_with_referrer
      FROM users;
    `);
    console.log('User Stats:', userStats.rows[0]);

    const referralsTable = await pool.query(`SELECT COUNT(*) as count FROM referrals;`).catch(() => ({ rows: [{ count: 'table missing' }] }));
    console.log('Referrals Table Count:', referralsTable.rows[0].count);

    const syndicateEarnings = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount_usd), 0) as total_usd FROM syndicate_earnings;`).catch(() => ({ rows: [{ count: 'table missing' }] }));
    console.log('Syndicate Earnings:', syndicateEarnings.rows[0]);

    // Check individual users with highest referral_count
    const topUsers = await pool.query(`
      SELECT id, telegram_id, username, referral_count, honey_balance, created_at
      FROM users
      ORDER BY referral_count DESC
      LIMIT 10;
    `);
    console.log('Top Users by referral_count:', topUsers.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

inspectReferrals();

