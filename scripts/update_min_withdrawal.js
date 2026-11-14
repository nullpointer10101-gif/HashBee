const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query("UPDATE settings SET value = '1.00' WHERE key = 'min_withdrawal_usdt'");
  console.log('Updated min_withdrawal_usdt:', res.rowCount);
  const verify = await client.query("SELECT * FROM settings WHERE key = 'min_withdrawal_usdt'");
  console.log('Current value:', verify.rows);
  await client.end();
}
main().catch(console.error);

