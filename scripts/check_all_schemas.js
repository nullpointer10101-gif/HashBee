const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function checkSchemas() {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  `);
  console.log('ALL TABLES IN ALL SCHEMAS:');
  for (const r of res.rows) {
    try {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${r.table_schema}"."${r.table_name}"`);
      console.log(`${r.table_schema}.${r.table_name}: ${cnt.rows[0].count}`);
    } catch (e) {
      console.log(`${r.table_schema}.${r.table_name}: error ${e.message}`);
    }
  }
  await client.end();
}

checkSchemas().catch(console.error);

