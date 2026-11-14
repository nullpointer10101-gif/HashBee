const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const TON_DEPOSIT_ADDRESS = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';
const TRX_DEPOSIT_ADDRESS = 'TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe';

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('⚡ Starting Complete Database Reset & Fresh Launch Configuration...');

    await client.query('BEGIN');

    // 1. Ensure Vaultfinity schema & wallet columns on users table
    console.log('🛠️ Ensuring table schemas and columns...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS energy_kwh NUMERIC DEFAULT 50000;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gold_stash NUMERIC DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS friends_purse NUMERIC DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_energy_calc_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_network VARCHAR(32);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_crew (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        crew_type VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        count INT NOT NULL DEFAULT 1,
        daily_gold_rate NUMERIC NOT NULL,
        cost_usd NUMERIC NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, crew_type)
      );
      CREATE INDEX IF NOT EXISTS idx_user_crew_user_id ON user_crew(user_id);

      CREATE TABLE IF NOT EXISTS syndicate_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_type VARCHAR(32) NOT NULL,
        source_item VARCHAR(64) NOT NULL,
        amount_usd NUMERIC NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_syndicate_referrer ON syndicate_earnings(referrer_id, created_at DESC);
    `);

    // 2. Wipe all existing transactional and user data for fresh launch
    console.log('🧹 Purging all transactional histories, mining records, earnings and user accounts...');
    
    // First clear dependencies referencing users or campaigns
    await client.query(`DELETE FROM mission_completions;`);
    await client.query(`DELETE FROM transactions;`);
    await client.query(`DELETE FROM withdrawals;`);
    await client.query(`DELETE FROM referrals;`);
    await client.query(`DELETE FROM user_plans;`);
    await client.query(`DELETE FROM user_crew;`);
    await client.query(`DELETE FROM syndicate_earnings;`);
    await client.query(`DELETE FROM viral_bounties;`);
    await client.query(`DELETE FROM campaigns;`);
    await client.query(`DELETE FROM fraud_flags;`);
    await client.query(`DELETE FROM analytics_events;`);
    await client.query(`DELETE FROM audit_logs;`);

    // Clear all users (set referrer_id to null first to prevent self-referencing foreign key blocks)
    await client.query(`UPDATE users SET referrer_id = NULL;`);
    await client.query(`DELETE FROM users;`);

    console.log('✅ All old users and transactional data wiped cleanly.');

    // 3. Configure Permanent Immutable System Deposit Addresses & Platform Settings
    console.log('🔒 Configuring Permanent Immutable Deposit Addresses & Settings...');
    const settingsUpdates = [
      ['deposit_wallet_ton', TON_DEPOSIT_ADDRESS],
      ['deposit_wallet_trx', TRX_DEPOSIT_ADDRESS],
      ['deposit_wallet', TON_DEPOSIT_ADDRESS],
      ['app_name', 'Vaultfinity'],
      ['gold_to_usd_rate', '0.00001'],
      ['min_smelt_gold', '1000'],
      ['starter_energy_kwh', '50000'],
      ['affiliate_worker_cut', '0.10'],
      ['affiliate_energy_cut', '0.10'],
      ['affiliate_first_hire_bounty', '0.02'],
      ['min_withdrawal_usdt', '0.10'],
      ['withdrawal_cooldown_hours', '0'],
      ['withdrawal_min_referrals', '0']
    ];

    for (const [key, value] of settingsUpdates) {
      await client.query(`
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `, [key, value]);
    }

    await client.query('COMMIT');
    console.log('🎉 Fresh launch database reset completed successfully!');

    // 4. Verify post-reset status
    const usersCount = await client.query('SELECT count(*) FROM users');
    const txCount = await client.query('SELECT count(*) FROM transactions');
    const wdCount = await client.query('SELECT count(*) FROM withdrawals');
    const crewCount = await client.query('SELECT count(*) FROM user_crew');
    const adminCount = await client.query('SELECT count(*) FROM admin_users');
    const missionsCount = await client.query('SELECT count(*) FROM missions');

    console.log('\n📊 POST-RESET AUDIT METRICS:');
    console.log(`- Users: ${usersCount.rows[0].count}`);
    console.log(`- Transactions: ${txCount.rows[0].count}`);
    console.log(`- Withdrawals: ${wdCount.rows[0].count}`);
    console.log(`- User Crew: ${crewCount.rows[0].count}`);
    console.log(`- Preserved Admin Accounts: ${adminCount.rows[0].count}`);
    console.log(`- Preserved Mission Templates: ${missionsCount.rows[0].count}`);
    console.log(`- Immutable TON Deposit Address: ${TON_DEPOSIT_ADDRESS}`);
    console.log(`- Immutable TRX Deposit Address: ${TRX_DEPOSIT_ADDRESS}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
