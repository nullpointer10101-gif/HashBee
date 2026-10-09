const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const userIds = ['adf17df8-8793-4c26-8266-428e10250409', '7ed442b8-4075-4bf7-b2d7-92a674409115', '93e277c9-6b91-42e3-bc7b-99c7bbde433a'];
    const txs = await pool.query(`SELECT * FROM transactions WHERE user_id = ANY($1) ORDER BY created_at DESC`, [userIds]);
    console.log(`Transactions count: ${txs.rows.length}`);
    for (const t of txs.rows) {
      console.log(`User: ${t.user_id} | Type: ${t.type} | Amount: ${t.amount} ${t.currency} | Desc: ${t.description} | At: ${t.created_at}`);
    }

    const withs = await pool.query(`SELECT * FROM withdrawals WHERE user_id = ANY($1)`, [userIds]);
    console.log('\nWithdrawals:');
    for (const w of withs.rows) {
      console.log(`ID: ${w.id} | User: ${w.user_id} | Amount: ${w.amount} | Status: ${w.status} | Reason: ${w.reason}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
