const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function find() {
  await client.connect();
  const res = await client.query(`SELECT id, telegram_id, username, first_name, referrer_id, created_at FROM users ORDER BY created_at DESC LIMIT 10`);
  console.log('10 MOST RECENT USERS IN DB:', JSON.stringify(res.rows, null, 2));
  await client.end();
}

find().catch(console.error);

