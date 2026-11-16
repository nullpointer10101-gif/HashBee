const https = require('https');

https.get('https://t.me/s/HashBeePayouts', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const textMatches = data.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g) || [];
    console.log('Found messages on web:', textMatches.length);
    for (let i = 0; i < Math.min(6, textMatches.length); i++) {
      console.log('--- Message', i, '---');
      console.log(textMatches[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
    }
  });
}).on('error', console.error);

