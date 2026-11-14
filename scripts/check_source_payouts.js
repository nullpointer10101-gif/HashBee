const https = require('https');

https.get('https://t.me/s/AiLabRobotPayouts', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    const postIds = [];
    const regex = /data-post="AiLabRobotPayouts\/(\d+)"/g;
    let match;
    while ((match = regex.exec(data)) !== null) {
      postIds.push(parseInt(match[1]));
    }
    console.log('Found post IDs:', postIds);
    console.log('Latest 5 post IDs:', postIds.slice(-5));
  });
});

