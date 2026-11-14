const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log('USERS COLUMNS:', cols.rows.map(r => r.column_name).join(', '));

  const u = await client.query('SELECT * FROM users');
  console.log('\nUSERS COUNT:', u.rows.length);
  for (const row of u.rows) {
    console.log(`User: tg=${row.telegram_id} | @${row.username || 'none'} | Name: ${row.first_name} | Balance: ${row.honey_balance} | BP: ${row.bp} | RefBy: ${row.referred_by}`);
  }

  const refs = await client.query('SELECT * FROM referrals');
  console.log('\nREFERRALS COUNT:', refs.rows.length);
  for (const r of refs.rows) {
    console.log(r);
  }

  const txs = await client.query('SELECT type, count(*) FROM transactions GROUP BY type');
  console.log('\nTRANSACTIONS BY TYPE:', txs.rows);

  await client.end();
}
run().catch(console.error);
