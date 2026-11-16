const fs = require('fs');
const readline = require('readline');

async function searchAllUserCounts() {
  const filePath = 'C:\\Users\\aleem\\.gemini\\antigravity\\brain\\fe5329f2-54ea-45ad-a91a-a60ececa3770\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('SELECT count(*) FROM users') || line.includes('SELECT COUNT(*) FROM users')) {
      const idx = line.indexOf('count');
      console.log('Query found:', line.substring(Math.max(0, idx - 50), Math.min(line.length, idx + 200)));
    }
    if (line.includes('Database Users Count:') || line.includes('Purged') || line.includes('synthetic test users')) {
      console.log('Log found:', line.substring(0, 150));
    }
  }
}

searchAllUserCounts();

