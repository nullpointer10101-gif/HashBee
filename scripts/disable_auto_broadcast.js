const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query("UPDATE settings SET value = 'false' WHERE key = 'auto_broadcast_enabled'");
  console.log('Updated auto_broadcast_enabled to false, affected rows:', res.rowCount);
  const verify = await client.query("SELECT key, value FROM settings WHERE key = 'auto_broadcast_enabled'");
  console.log('Current value:', verify.rows);
  await client.end();
}
main().catch(console.error);

