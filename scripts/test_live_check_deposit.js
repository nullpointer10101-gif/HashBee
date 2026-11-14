const https = require('https');
const crypto = require('crypto');

function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

const secret = 'hashbee_super_secret_jwt_key_32_chars_long';
const now = Math.floor(Date.now() / 1000);
// Use one of the real users: tg=5983584008
const token = createJWT(
  {
    telegram_id: 5983584008,
    exp: now + 3600,
    iat: now
  },
  secret
);

const postData = JSON.stringify({
  coin: 'TON',
  expected_usd: 10.0,
  sender_address: 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
});

const req = https.request(
  {
    hostname: 'hashbee1.onrender.com',
    port: 443,
    path: '/api/check-deposit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  },
  (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RESPONSE:', data);
    });
  }
);

req.on('error', console.error);
req.write(postData);
req.end();

