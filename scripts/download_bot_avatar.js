const fs = require('fs');
const https = require('https');
const path = require('path');

async function downloadBotPhoto() {
  const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
  const fileUrl = 'https://api.telegram.org/file/bot' + token + '/photos/file_0.jpg';

  const dests = [
    path.join(__dirname, '..', 'miniapp', 'public', 'bot_avatar.jpg'),
    path.join(__dirname, '..', 'miniapp', 'public', 'assets', 'bot_avatar.jpg'),
    path.join(__dirname, '..', 'backend', 'public', 'app', 'bot_avatar.jpg'),
  ];

  dests.forEach(d => {
    const dir = path.dirname(d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const fileStream = fs.createWriteStream(dests[0]);
  https.get(fileUrl, response => {
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      // copy to other destinations
      for (let i = 1; i < dests.length; i++) {
        fs.copyFileSync(dests[0], dests[i]);
      }
      console.log('Successfully downloaded bot avatar to:', dests);
      console.log('File size:', fs.statSync(dests[0]).size, 'bytes');
    });
  });
}

downloadBotPhoto();

