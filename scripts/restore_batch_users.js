const { Client } = require('pg');

const rawLogs = `
2026-11-12T16:13:12.973073864Z 2026/11/12 16:13:12 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5723938706: Bad Request: chat not found
2026-11-12T18:54:23.710251636Z 2026/11/12 18:54:23 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 161481563: Bad Request: chat not found
2026-11-12T19:19:07.255635245Z 2026/11/12 19:19:07 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 217392947: Bad Request: chat not found
2026-11-12T19:43:03.042168866Z 2026/11/12 19:43:03 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7768218194: Bad Request: chat not found
2026-11-12T19:50:12.497576275Z 2026/11/12 19:50:12 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8195626535: Bad Request: chat not found
2026-11-12T21:24:53.216196934Z 2026/11/12 21:24:53 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8114909235: Bad Request: chat not found
2026-11-12T22:00:46.460546456Z 2026/11/12 22:00:46 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5467587868: Bad Request: chat not found
2026-11-12T22:24:20.890451129Z 2026/11/12 22:24:20 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 135121329: Bad Request: chat not found
2026-11-12T22:47:21.906656505Z 2026/11/12 22:47:21 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5913243605: Bad Request: chat not found
2026-11-12T23:23:44.745352244Z 2026/11/12 23:23:44 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5797268196: Bad Request: chat not found
2026-11-12T23:54:04.061713186Z 2026/11/12 23:54:04 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6339470406: Bad Request: chat not found
2026-11-13T01:15:13.901990315Z 2026/11/13 01:15:13 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7749604474: Bad Request: chat not found
2026-11-13T01:29:59.967891494Z 2026/11/13 01:29:59 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 9020154910: Bad Request: chat not found
2026-11-13T02:38:08.120188398Z 2026/11/13 02:38:08 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 681378340: Bad Request: chat not found
2026-11-13T04:00:18.306024499Z 2026/11/13 04:00:18 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5466038746: Bad Request: chat not found
2026-11-13T05:05:11.41642995Z 2026/11/13 05:05:11 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6808914554: Bad Request: chat not found
2026-11-13T05:18:15.97265232Z 2026/11/13 05:18:15 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 252761069: Bad Request: chat not found
2026-11-13T05:30:49.13056732Z 2026/11/13 05:30:49 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8523165094: Bad Request: chat not found
2026-11-13T06:43:26.848972342Z 2026/11/13 06:43:26 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7139316558: Bad Request: chat not found
2026-11-13T09:58:22.125124864Z 2026/11/13 09:58:22 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8975919170: Bad Request: chat not found
2026-11-13T10:10:27.812184199Z 2026/11/13 10:10:27 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 1789600765: Bad Request: chat not found
2026-11-13T10:19:34.190436572Z 2026/11/13 10:19:34 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 681378340: Bad Request: chat not found
2026-11-13T10:28:40.762407311Z 2026/11/13 10:28:40 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8881414870: Bad Request: chat not found
2026-11-13T11:45:19.802245469Z 2026/11/13 11:45:19 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8953787394: Bad Request: chat not found
2026-11-13T12:12:25.012782807Z 2026/11/13 12:12:25 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8257017768: Bad Request: chat not found
2026-11-13T14:23:19.74945177Z 2026/11/13 14:23:19 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8894885742: Bad Request: chat not found
2026-11-13T15:32:01.463055206Z 2026/11/13 15:32:01 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8729807830: Bad Request: chat not found
2026-11-13T15:42:01.690612567Z 2026/11/13 15:42:01 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8811352806: Bad Request: chat not found
2026-11-13T16:16:03.065557543Z 2026/11/13 16:16:03 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7087767147: Bad Request: chat not found
2026-11-13T16:46:22.12702988Z 2026/11/13 16:46:22 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8938482472: Bad Request: chat not found
2026-11-13T17:19:24.53524297Z 2026/11/13 17:19:24 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5524206403: Bad Request: chat not found
2026-11-13T18:29:25.058558683Z 2026/11/13 18:29:25 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 733457822: Bad Request: chat not found
2026-11-13T19:21:41.537051233Z 2026/11/13 19:21:41 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8706821943: Bad Request: chat not found
2026-11-13T20:13:28.829173576Z 2026/11/13 20:13:28 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 5883470404: Bad Request: chat not found
2026-11-13T20:16:40.536704472Z 2026/11/13 20:16:40 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8600049684: Bad Request: chat not found
2026-11-13T20:55:12.39365712Z 2026/11/13 20:55:12 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8313521283: Bad Request: chat not found
2026-11-13T21:01:05.907705628Z 2026/11/13 21:01:05 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7365040310: Bad Request: chat not found
2026-11-13T22:01:19.931698742Z 2026/11/13 22:01:19 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6980147158: Bad Request: chat not found
2026-11-13T23:26:35.448650871Z 2026/11/13 23:26:35 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8436931908: Bad Request: chat not found
2026-11-13T23:36:48.842203501Z 2026/11/13 23:36:48 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6104800643: Bad Request: chat not found
2026-11-14T00:42:24.382664113Z 2026/11/14 00:42:24 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8067491915: Bad Request: chat not found
2026-11-14T01:37:59.187069249Z 2026/11/14 01:37:59 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7830332132: Bad Request: chat not found
2026-11-14T01:47:40.686475826Z 2026/11/14 01:47:40 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7242722316: Bad Request: chat not found
2026-11-14T03:30:03.315095136Z 2026/11/14 03:30:03 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7592579744: Bad Request: chat not found
2026-11-14T05:22:22.917711098Z 2026/11/14 05:22:22 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 8795479662: Bad Request: chat not found
2026-11-14T05:57:26.958312992Z 2026/11/14 05:57:26 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6670508657: Bad Request: chat not found
2026-11-14T07:28:15.281251517Z 2026/11/14 07:28:15 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6674108007: Bad Request: chat not found
2026-11-14T07:40:01.172145068Z 2026/11/14 07:40:01 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7231304878: Bad Request: chat not found
2026-11-14T08:10:30.214374488Z 2026/11/14 08:10:30 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 7655598861: Bad Request: chat not found
2026-11-14T08:45:51.845284011Z 2026/11/14 08:45:51 ⚠️ [Bot] GetChatMember for https://t.me/HashBeePayouts user 6485910775: Bad Request: chat not found
`;

const matches = rawLogs.match(/user\s+(\d+)/g) || [];
const userIds = [...new Set(matches.map(m => parseInt(m.replace(/user\s+/, ''), 10)))];

console.log('Parsed unique user IDs in this batch:', userIds.length);

const client = new Client({ 
  connectionString: 'postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  let inserted = 0;
  for (const tid of userIds) {
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
  console.log(`Successfully inserted new users: ${inserted}`);
  console.log(`New Total Database Users: ${countRes.rows[0].count}`);
  await client.end();
}

run().catch(console.error);
