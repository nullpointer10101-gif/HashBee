const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🚀 [Vaultfinity DB Migration & Clean Reset Starting]...');

  try {
    // 1. Delete test/synthetic users (IDs >= 990000000)
    console.log('🗑️ Step 1: Purging 20,000+ synthetic test users...');
    const testUsers = await pool.query('SELECT id FROM users WHERE telegram_id >= 990000000');
    const testIds = testUsers.rows.map(r => r.id);
    if (testIds.length > 0) {
      await pool.query('UPDATE users SET referrer_id = NULL WHERE referrer_id = ANY($1)', [testIds]);
      await pool.query('UPDATE users SET referrer_id = NULL WHERE telegram_id >= 990000000');
      await pool.query('DELETE FROM referrals WHERE referrer_id = ANY($1) OR referred_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM transactions WHERE user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM mission_completions WHERE user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM user_plans WHERE user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM withdrawals WHERE user_id = ANY($1)', [testIds]);
      await pool.query('UPDATE missions SET campaign_id = NULL WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_user_id = ANY($1))', [testIds]);
      await pool.query('DELETE FROM campaigns WHERE owner_user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM fraud_flags WHERE user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM analytics_events WHERE user_id = ANY($1)', [testIds]);
      await pool.query('DELETE FROM audit_logs WHERE target_id = ANY($1)', [testIds]);
      const delRes = await pool.query('DELETE FROM users WHERE telegram_id >= 990000000');
      console.log(`✅ Purged ${delRes.rowCount} synthetic test users!`);
    } else {
      console.log('ℹ️ No synthetic test users found.');
    }

    // 2. Add Vaultfinity Schema columns to users
    console.log('🏛️ Step 2: Ensuring Vaultfinity columns on users table...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS energy_kwh DOUBLE PRECISION DEFAULT 50000;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gold_stash DOUBLE PRECISION DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS friends_purse DOUBLE PRECISION DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_energy_calc_at TIMESTAMPTZ DEFAULT NOW();`);

    // 3. Create user_crew table
    console.log('🥷 Step 3: Creating user_crew table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_crew (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        crew_type VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        count INT NOT NULL DEFAULT 1,
        daily_gold_rate DOUBLE PRECISION NOT NULL,
        cost_usd DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_crew_unique_type UNIQUE(user_id, crew_type)
      );
    `);

    // 4. Create syndicate_earnings table
    console.log('👥 Step 4: Creating syndicate_earnings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS syndicate_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_type VARCHAR(32) NOT NULL,
        source_item VARCHAR(64) NOT NULL,
        amount_usd DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_syndicate_referrer ON syndicate_earnings(referrer_id, created_at DESC);
    `);

    // 5. Reset all existing real users cleanly
    console.log('🧹 Step 5: Resetting all user accounts to clean initial state...');
    const resetUsers = await pool.query(`
      UPDATE users
      SET honey_balance = 0.0,
          gold_stash = 0.0,
          energy_kwh = 50000.0,
          friends_purse = 0.0,
          streak_count = 0,
          last_checkin_at = NULL,
          last_collect_at = NOW(),
          last_energy_calc_at = NOW(),
          updated_at = NOW();
    `);
    console.log(`✅ Reset ${resetUsers.rowCount} user balances and power to clean baseline!`);

    // 6. Seed each real user with 1 free Starter Safecracker (Lockpick Rookie)
    console.log('🎁 Step 6: Equipping each user with 1 free Lockpick Rookie...');
    await pool.query(`DELETE FROM user_crew;`);
    const seedCrew = await pool.query(`
      INSERT INTO user_crew (id, user_id, crew_type, name, count, daily_gold_rate, cost_usd, created_at, updated_at)
      SELECT gen_random_uuid(), id, 'lockpick_rookie', 'Lockpick Rookie', 1, 5000.0, 0.50, NOW(), NOW()
      FROM users
      ON CONFLICT (user_id, crew_type) DO NOTHING;
    `);
    console.log(`✅ Equipped ${seedCrew.rowCount} users with free starter Lockpick Rookie!`);

    // 7. Clean up transactions and old pending withdrawals
    console.log('🧹 Step 7: Cleaning legacy transactions...');
    await pool.query(`DELETE FROM transactions;`);
    await pool.query(`DELETE FROM syndicate_earnings;`);
    await pool.query(`DELETE FROM user_plans;`);

    // 8. Update settings table branding to Vaultfinity
    console.log('⚙️ Step 8: Updating platform settings to Vaultfinity...');
    await pool.query(`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES 
        ('app_name', 'Vaultfinity', 'Application Name', NOW()),
        ('gold_to_usd_rate', '0.00001', '100,000 Gold = $1 USD', NOW()),
        ('min_smelt_gold', '1000', 'Minimum gold required to smelt', NOW()),
        ('starter_energy_kwh', '50000', 'Default starter battery power', NOW()),
        ('affiliate_worker_cut', '0.10', '10% cut on character purchases', NOW()),
        ('affiliate_energy_cut', '0.10', '10% cut on battery pack purchases', NOW()),
        ('affiliate_first_hire_bounty', '0.02', '$0.02 cash bounty on first worker hire', NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `);

    // Verification
    const finalUserCount = await pool.query('SELECT count(*) as count FROM users');
    const finalCrewCount = await pool.query('SELECT count(*) as count FROM user_crew');
    console.log(`\n🎉 [MIGRATION & CLEAN RESET COMPLETE]`);
    console.log(`👥 Total Clean Users in Database: ${finalUserCount.rows[0].count}`);
    console.log(`🥷 Total Active Safecrackers Equiped: ${finalCrewCount.rows[0].count}`);

  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    await pool.end();
  }
}

main();
