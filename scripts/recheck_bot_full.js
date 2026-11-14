const https = require('https');

const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';

function apiCall(method, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = https.request(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: body ? 'POST' : 'GET',
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log('=== TELEGRAM BOT AUDIT ===');
  const me = await apiCall('getMe');
  console.log('1. getMe:', me);

  const myName = await apiCall('getMyName');
  console.log('2. getMyName:', myName);

  const desc = await apiCall('getMyDescription');
  console.log('3. getMyDescription:', desc);

  const shortDesc = await apiCall('getMyShortDescription');
  console.log('4. getMyShortDescription:', shortDesc);

  const cmds = await apiCall('getMyCommands');
  console.log('5. getMyCommands:', cmds);

  const menu = await apiCall('getChatMenuButton');
  console.log('6. getChatMenuButton:', menu);

  const webhook = await apiCall('getWebhookInfo');
  console.log('7. getWebhookInfo:', webhook);
}

runAudit().catch(console.error);
