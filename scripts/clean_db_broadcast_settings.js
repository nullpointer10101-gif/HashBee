const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function cleanSettings() {
  try {
    // 1. Reset auto_broadcast_message and auto_broadcast_button_text if they are 'test'
    await pool.query(`
      DELETE FROM settings WHERE key IN ('auto_broadcast_message', 'auto_broadcast_button_text') AND value = 'test';
    `);

    // 2. Set auto_broadcast_mode to rotate so it always uses the 8 fresh Vaultfinity templates
    await pool.query(`
      INSERT INTO settings (key, value) VALUES ('auto_broadcast_mode', 'rotate')
      ON CONFLICT (key) DO UPDATE SET value = 'rotate';
    `);

    // 3. Set auto_broadcast_template_key to vault_gold_smelt
    await pool.query(`
      INSERT INTO settings (key, value) VALUES ('auto_broadcast_template_key', 'vault_gold_smelt')
      ON CONFLICT (key) DO UPDATE SET value = 'vault_gold_smelt';
    `);

    // 4. Set payout_mirror_target_channel to @VaultfinityPayouts
    await pool.query(`
      INSERT INTO settings (key, value) VALUES ('payout_mirror_target_channel', '@VaultfinityPayouts')
      ON CONFLICT (key) DO UPDATE SET value = '@VaultfinityPayouts';
    `);

    // 5. Update app_name to Heist Miner
    await pool.query(`
      INSERT INTO settings (key, value) VALUES ('app_name', 'Heist Miner')
      ON CONFLICT (key) DO UPDATE SET value = 'Heist Miner';
    `);

    console.log('✅ Successfully cleaned database settings table!');
    const res = await pool.query(`SELECT key, value FROM settings WHERE key LIKE 'auto_broadcast%' OR key LIKE 'payout%' OR key = 'app_name'`);
    console.log('Updated relevant settings:', res.rows);
  } catch (err) {
    console.error('Error cleaning settings:', err);
  } finally {
    await pool.end();
  }
}

cleanSettings();

