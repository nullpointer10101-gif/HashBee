const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- PG_STAT_STATEMENTS ---');
  try {
    const res = await client.query(`
      SELECT query, calls 
      FROM pg_stat_statements 
      WHERE query ILIKE '%users%' OR query ILIKE '%telegram_id%' 
      LIMIT 20;
    `);
    for (const r of res.rows) {
      console.log(`[calls: ${r.calls}] ${r.query.substring(0, 150)}`);
    }
  } catch (e) {
    console.log('pg_stat_statements error:', e.message);
  }

  console.log('--- CHECKING PG_LOGICAL / REPLICATION / TOAST ---');
  try {
    const repl = await client.query('SELECT * FROM pg_replication_slots');
    console.log('Replication slots:', repl.rows);
  } catch (e) {
    console.log('Repl error:', e.message);
  }

  await client.end();
}

main().catch(console.error);

