const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres' });

async function search() {
  await client.connect();
  const res = await client.query(`SELECT id, telegram_id, username, first_name, referrer_id, created_at FROM users WHERE first_name ILIKE '%Habeeb%' OR first_name ILIKE '%AGE%'`);
  console.log('MATCHED USERS:', res.rows);

  const refUser = await client.query(`SELECT id, telegram_id, username, first_name FROM users WHERE telegram_id = '8823265955'`);
  console.log('USER 8823265955:', refUser.rows);

  if (refUser.rows.length > 0) {
    const refs = await client.query(`SELECT id, telegram_id, username, first_name, created_at FROM users WHERE referrer_id = $1`, [refUser.rows[0].id]);
    console.log('REFERRALS OF 8823265955:', refs.rows);
  }
  await client.end();
}

search().catch(console.error);

