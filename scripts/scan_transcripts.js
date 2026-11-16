const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\aleem\\.gemini\\antigravity\\brain';
const outputIds = new Set();

async function scanTranscripts() {
  const folders = fs.readdirSync(brainDir);
  for (const folder of folders) {
    const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(transcriptPath)) continue;

    try {
      const fileStream = fs.createReadStream(transcriptPath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.includes('telegram_id') && !line.includes('users')) continue;
        const matches = line.matchAll(/["']?telegram_id["']?[:=\s]+([0-9]{7,11})/gi);
        for (const m of matches) {
          const id = parseInt(m[1]);
          if (id > 100000 && id < 990000000) {
            outputIds.add(id);
          }
        }
      }
    } catch (e) {}
  }

  console.log(`Finished scanning transcripts. Found ${outputIds.size} unique telegram IDs.`);
  if (outputIds.size > 0) {
    fs.writeFileSync('scripts/recovered_ids.json', JSON.stringify([...outputIds], null, 2));
  }
}

scanTranscripts();

