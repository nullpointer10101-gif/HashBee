const https = require('https');
const { Client } = require('pg');

const WALLET = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR';
const DATABASE_URL = 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

function fetchTransactions(beforeLt) {
  return new Promise((resolve, reject) => {
    let url = `https://tonapi.io/v2/blockchain/accounts/${WALLET}/transactions?limit=100`;
    if (beforeLt) {
      url += `&before_lt=${beforeLt}`;
    }
    https.get(url, { headers: { 'User-Agent': 'HashBee-Recover/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.transactions || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to Supabase DB');

  let beforeLt = null;
  let totalTxs = 0;
  const userIdsFound = new Set();

  console.log(`Scanning TON Blockchain transactions for wallet ${WALLET}...`);

  while (true) {
    try {
      const txs = await fetchTransactions(beforeLt);
      if (!txs || txs.length === 0) {
        console.log('No more transactions returned.');
        break;
      }
      totalTxs += txs.length;
      console.log(`Fetched ${txs.length} transactions (Total scanned: ${totalTxs})...`);

      for (const tx of txs) {
        let text = '';
        if (tx.in_msg && tx.in_msg.decoded_body && tx.in_msg.decoded_body.text) {
          text = tx.in_msg.decoded_body.text;
        } else if (tx.in_msg && tx.in_msg.message) {
          text = tx.in_msg.message;
        }

        if (text) {
          // Look for 7 to 11 digit numbers
          const matches = text.match(/\b\d{7,11}\b/g);
          if (matches) {
            for (const m of matches) {
              const id = parseInt(m, 10);
              // Avoid timestamps like 1731... or random numbers
              if (id > 10000000 && id < 9999999999) {
                userIdsFound.add(id);
              }
            }
          }
        }
      }

      // Check the last tx lt for pagination
      const lastTx = txs[txs.length - 1];
      if (!lastTx || !lastTx.lt || txs.length < 100) {
        break;
      }
      beforeLt = lastTx.lt;
      // Small pause to be gentle with rate limits
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error('Error fetching batch:', err.message);
      break;
    }
  }

  console.log(`\nScan Complete! Found ${userIdsFound.size} unique Telegram User IDs from blockchain transactions.`);
  console.log('Inserting into database...');

  let inserted = 0;
  for (const tid of userIdsFound) {
    const res = await client.query(`
      INSERT INTO users (
        telegram_id, username, first_name, bp, honey_balance, energy_kwh, gold_stash, friends_purse, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 10, 0.50, 50000, 0, 0, NOW(), NOW()
      )
      ON CONFLICT (telegram_id) DO NOTHING
      RETURNING id;
    `, [tid, 'user_' + tid, 'Operative ' + String(tid).slice(-4)]);
    if (res.rowCount > 0) inserted++;
  }

  const countRes = await client.query('SELECT count(*) FROM users;');
  console.log(`Inserted ${inserted} new users into Supabase.`);
  console.log(`Total Database Users is now: ${countRes.rows[0].count}`);

  await client.end();
}

main().catch(console.error);

