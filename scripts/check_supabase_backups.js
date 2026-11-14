const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- SCHEMAS ---');
  const schemas = await client.query('SELECT schema_name FROM information_schema.schemata');
  console.log(schemas.rows.map(r => r.schema_name));

  console.log('--- TABLES IN ALL NON-SYSTEM SCHEMAS ---');
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);
  console.log(tables.rows);

  console.log('--- SUPABASE STORAGE BUCKETS ---');
  try {
    const buckets = await client.query('SELECT * FROM storage.buckets');
    console.log(buckets.rows);
  } catch (e) {
    console.log('No storage.buckets:', e.message);
  }

  console.log('--- SUPABASE AUTH USERS (IF ANY) ---');
  try {
    const authUsers = await client.query('SELECT count(*) FROM auth.users');
    console.log('auth.users count:', authUsers.rows[0].count);
  } catch (e) {
    console.log('No auth.users:', e.message);
  }

  await client.end();
}

main().catch(console.error);

