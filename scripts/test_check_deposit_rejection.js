const https = require('https');

async function testRejection() {
  const postData = JSON.stringify({
    coin: 'TON',
    expected_usd: 10.0,
    sender_address: 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  });

  const options = {
    hostname: 'hashbee1.onrender.com',
    port: 443,
    path: '/api/check-deposit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RESPONSE:', data);
    });
  });

  req.on('error', (e) => console.error(e));
  req.write(postData);
  req.end();
}

testRejection();

