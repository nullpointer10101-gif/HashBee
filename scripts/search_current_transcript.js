const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const filePath = 'C:\\Users\\aleem\\.gemini\\antigravity\\brain\\fe5329f2-54ea-45ad-a91a-a60ececa3770\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let found = 0;
  for await (const line of rl) {
    if (line.includes('USERS COUNT:')) {
      const idx = line.indexOf('USERS COUNT:');
      console.log(line.substring(idx, idx + 200));
      found++;
    }
  }
  console.log(`Found ${found} occurrences.`);
}

searchTranscript();

