const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('=== CHECKING REMAINING PENDING WITHDRAWALS ===');

    const { rows: pendingList } = await pool.query(`
      SELECT w.id, w.user_id, COALESCE(w.honey_amount, w.amount) as amount, w.network, w.address, 
             u.username, u.telegram_id, u.honey_balance, w.created_at
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'pending'
      ORDER BY w.created_at DESC
    `);

    console.log(`Found ${pendingList.length} pending withdrawal(s) remaining.`);

    for (const w of pendingList) {
      const uname = w.username || `TG:${w.telegram_id}`;
      console.log(`Reverting ${w.id} (@${uname}, ${w.amount} HONEY)...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(`
          UPDATE withdrawals 
          SET status = 'rejected', 
              reason = 'Account condition verification required (Balance refunded)', 
              updated_at = NOW() 
          WHERE id = $1
        `, [w.id]);

        const { rows: updatedUser } = await client.query(`
          UPDATE users 
          SET honey_balance = honey_balance + $1, 
              updated_at = NOW() 
          WHERE id = $2
          RETURNING id, username, telegram_id, honey_balance
        `, [w.amount, w.user_id]);

        const idempKey = `silent_refund_${w.id}_${Date.now()}`;
        await client.query(`
          INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
          VALUES (gen_random_uuid(), $1, 'adjustment', $2, 'HONEY', $3, 'withdrawal', $4, 'Withdrawal balance refunded', NOW())
          ON CONFLICT (idempotency_key) DO NOTHING
        `, [w.user_id, w.amount, w.id, idempKey]);

        await client.query('COMMIT');
        console.log(`  ✓ Successfully reverted & refunded to @${uname}. New balance: ${updatedUser[0]?.honey_balance}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`  ✕ Error reverting ${w.id}:`, e.message);
      } finally {
        client.release();
      }
    }

    // Double check count
    const { rows: verifyRows } = await pool.query(`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'`);
    console.log(`\nRemaining pending withdrawals in DB: ${verifyRows[0].count}`);
    console.log('=== ALL REVERTS FINISHED ===');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await pool.end();
  }
}

main();
