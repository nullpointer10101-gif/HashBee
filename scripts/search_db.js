const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function search() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
  `);
  console.log('Columns to check:', res.rows.length);
  for (const row of res.rows) {
    try {
      const q = await client.query(`SELECT "${row.column_name}" FROM "${row.table_name}" WHERE "${row.column_name}" ILIKE '%Tesla%' OR "${row.column_name}" ILIKE '%MINE & EARN%' OR "${row.column_name}" ILIKE '%New Friend Joined%' OR "${row.column_name}" ILIKE '%Withdrawal Complete%' LIMIT 5`);
      if (q.rows.length > 0) {
        console.log('FOUND IN', row.table_name, row.column_name, JSON.stringify(q.rows));
      }
    } catch (e) {
      // ignore
    }
  }
  await client.end();
}

search().catch(console.error);
