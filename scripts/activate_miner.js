const { Pool } = require('pg');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

/**
 * Activates a Standard Miner (1.30 TON / GRAM) for a user
 * based on transaction 89ef0735b2d5bf8cd8b9d28509c37fec2def4ab09a58e1e647def39de65bd8f2
 */
async function activateMinerForUser(telegramIdOrUsername, dryRun = true) {
  const client = await pool.connect();
  try {
    console.log(`\n=== ACTIVATING MINER FOR: ${telegramIdOrUsername} (dryRun: ${dryRun}) ===`);
    
    // 1. Find user
    let userRes;
    if (/^\d+$/.test(String(telegramIdOrUsername).trim())) {
      userRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegramIdOrUsername]);
    } else {
      const clean = String(telegramIdOrUsername).replace('@', '').trim();
      userRes = await client.query('SELECT * FROM users WHERE username ILIKE $1 OR first_name ILIKE $1', [clean]);
    }

    if (userRes.rows.length === 0) {
      console.error(`❌ User "${telegramIdOrUsername}" not found in database!`);
      return false;
    }

    const user = userRes.rows[0];
    console.log(`✅ Found user: ID=${user.id}, TG=${user.telegram_id}, @${user.username}, Name="${user.first_name}", Current BP=${user.bp}`);

    const eventId = "89ef0735b2d5bf8cd8b9d28509c37fec2def4ab09a58e1e647def39de65bd8f2";
    const planId = "standard";
    const planName = "Cyber Worker Miner";
    const costGram = 1.30;
    const returnGram = 2.00;
    const durationSeconds = 86400;
    const powerGained = costGram * 520.0; // 676.0 GHS

    // Check idempotency
    const existingTx = await client.query('SELECT * FROM transactions WHERE idempotency_key = $1', [eventId]);
    if (existingTx.rows.length > 0) {
      console.log(`⚠️ Transaction ${eventId} was ALREADY processed:`, existingTx.rows[0]);
      return false;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would perform:`);
      console.log(`1. Insert into user_plans: plan_id='${planId}', cost=${costGram}, return=${returnGram}, duration=${durationSeconds}s, status='active'`);
      console.log(`2. Insert transaction 'plan_purchase': amount=${costGram} GRAM, event_id='${eventId}'`);
      console.log(`3. Update users: bp = bp + ${powerGained} GHS (from ${user.bp} to ${Number(user.bp) + powerGained}), one_time_withdrawal_granted = true`);
      console.log(`4. Insert transaction 'bp_grant': amount=${powerGained} BP, event_id='bp_plan_${eventId}'`);
      return true;
    }

    await client.query('BEGIN');

    const now = new Date();
    const maturesAt = new Date(now.getTime() + durationSeconds * 1000);
    const planUuid = uuidv4();
    const txUuid1 = uuidv4();
    const txUuid2 = uuidv4();

    // 1. Insert user_plans
    await client.query(`
      INSERT INTO user_plans (id, user_id, plan_id, plan_name, cost_gram, return_gram, duration_seconds, status, started_at, matures_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $8)
    `, [planUuid, user.id, planId, planName, costGram, returnGram, durationSeconds, now, maturesAt]);

    // 2. Insert transaction plan_purchase
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
      VALUES ($1, $2, 'plan_purchase', $3, 'GRAM', $4, $5, NOW())
    `, [txUuid1, user.id, costGram, eventId, `Blockchain Plan Activation: ${planName} (24h Yield Contract)`]);

    // 3. Update user hashrate & unlock withdrawal
    await client.query(`
      UPDATE users 
      SET bp = bp + $1, one_time_withdrawal_granted = true, updated_at = NOW() 
      WHERE id = $2
    `, [powerGained, user.id]);

    // 4. Insert bp_grant transaction
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, currency, idempotency_key, description, created_at)
      VALUES ($1, $2, 'bp_grant', $3, 'BP', $4, $5, NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
    `, [txUuid2, user.id, powerGained, `bp_plan_${eventId}`, `${planName} Upgrade (+${powerGained} GHS)`]);

    await client.query('COMMIT');
    console.log(`🎉 SUCCESS! Miner successfully activated for ${user.first_name} (@${user.username}, TG: ${user.telegram_id})!`);
    return true;

  } catch(err) {
    await client.query('ROLLBACK');
    console.error('Error activating miner:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const target = process.argv[2] || '7363782460'; // Default to Md Raju (raju_ahamed5)
  const execute = process.argv.includes('--execute');
  await activateMinerForUser(target, !execute);
  await pool.end();
}

main();
