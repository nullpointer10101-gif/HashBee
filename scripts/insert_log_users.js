const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const idsToInsert = [
  8922740449,
  5983584008,
  2147454792,
  6446145632,
  5961784001,
  8058162990,
  8905346337,
  6323791546,
  8195626535,
  8889575662
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let inserted = 0;
  for (const tgId of idsToInsert) {
    const res = await client.query(`
      INSERT INTO users (
        telegram_id, username, first_name, bp, honey_balance, energy_kwh, gold_stash, friends_purse, created_at, updated_at
      ) VALUES (
        $1, '', 'Operative', 10, 0.50, 50000, 0, 0, NOW(), NOW()
      )
      ON CONFLICT (telegram_id) DO NOTHING;
    `, [tgId]);
    if (res.rowCount > 0) inserted++;
  }

  const total = await client.query('SELECT count(*) FROM users');
  console.log(`Inserted ${inserted} new users from logs. Total registered users: ${total.rows[0].count}`);
  await client.end();
}

main().catch(console.error);

