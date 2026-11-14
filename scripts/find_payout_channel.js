const https = require('https');
const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';

function checkChat(chatId) {
  return new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ id: chatId, status: res.statusCode, body: JSON.parse(data) }));
    });
  });
}

async function testChats() {
  const candidates = [
    '@VaultfinityPayouts',
    '@HashBeePayouts',
    '@HeistMinerPayouts',
    '@HeistMiner_Payouts',
    '@HeistPayouts',
    '-1002345678901'
  ];
  for (const c of candidates) {
    const res = await checkChat(c);
    console.log(c, res.status, res.body.ok ? res.body.result.title : res.body.description);
  }
}
testChats();
