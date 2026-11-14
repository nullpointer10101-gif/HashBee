const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  const settingsRes = await client.query('SELECT * FROM settings');
  console.log('SETTINGS:');
  console.log(JSON.stringify(settingsRes.rows, null, 2));

  const tables = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
  `);
  for (const row of tables.rows) {
    try {
      const q = `SELECT "${row.column_name}" FROM "${row.table_name}" WHERE "${row.column_name}" ILIKE '%Tesla%' OR "${row.column_name}" ILIKE '%MINE & EARN%' OR "${row.column_name}" ILIKE '%HashBee%' LIMIT 5`;
      const r = await client.query(q);
      if (r.rows.length > 0) {
        console.log(`MATCH IN ${row.table_name}.${row.column_name}:`, r.rows);
      }
    } catch(e) {}
  }

  await client.end();
}
main().catch(console.error);

