const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ url, status: res.statusCode, data: d.slice(0, 200) }));
      })
      .on('error', (e) => resolve({ url, error: e.message }));
  });
}

async function verifyAll() {
  console.log('=== VERIFYING DEPLOYMENTS ===');
  const miniApp = await checkUrl('https://miniapp-five-topaz.vercel.app');
  console.log('1. Vercel MiniApp:', miniApp.status, miniApp.status === 200 ? '✅ LIVE' : '❌ FAILED');

  const backend = await checkUrl('https://hashbee1.onrender.com/health');
  console.log('2. Render Backend:', backend.status, backend.data);

  const webhook = await checkUrl('https://api.telegram.org/bot8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU/getWebhookInfo');
  console.log('3. Telegram Webhook:', webhook.status, webhook.data);
}

verifyAll();

