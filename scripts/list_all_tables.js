const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function check() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('TABLES:');
  for (const t of tables.rows) {
    const cnt = await client.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
    console.log(`- ${t.table_name}: ${cnt.rows[0].count} rows`);
  }
  await client.end();
}

check().catch(console.error);

