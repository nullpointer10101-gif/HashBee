const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  const r = await client.query("SELECT * FROM settings WHERE key LIKE '%payout%'");
  console.log(r.rows);
  await client.end();
}
main().catch(console.error);

