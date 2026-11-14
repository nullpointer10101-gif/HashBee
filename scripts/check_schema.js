const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions'");
    console.log('Columns in transactions:');
    cols.rows.forEach(r => console.log(' - ' + r.column_name + ' (' + r.data_type + ')'));

    const indexes = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'transactions'");
    console.log('Indexes in transactions:');
    indexes.rows.forEach(r => console.log(' - ' + r.indexname + ': ' + r.indexdef));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkSchema();

