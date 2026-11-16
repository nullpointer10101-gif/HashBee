const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const newIds = [
  6909180225,
  8823265955,
  5983584008,
  6446145632
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let added = 0;
  for (const tgId of newIds) {
    const res = await client.query(`
      INSERT INTO users (
        telegram_id, username, first_name, bp, honey_balance, energy_kwh, gold_stash, friends_purse, created_at, updated_at
      ) VALUES (
        $1, '', 'Operative', 10, 0.50, 50000, 0, 0, NOW(), NOW()
      )
      ON CONFLICT (telegram_id) DO NOTHING;
    `, [tgId]);
    if (res.rowCount > 0) added++;
  }

  const total = await client.query('SELECT count(*) FROM users');
  console.log(`Added ${added} new IDs. Total users in database: ${total.rows[0].count}`);
  await client.end();
}

main().catch(console.error);

