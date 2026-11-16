const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\aleem\\.gemini\\antigravity\\brain';
const outputIds = new Set();

try {
  const folders = fs.readdirSync(brainDir);
  console.log(`Found ${folders.length} brain folders to scan.`);

  for (const folder of folders) {
    const fullFolder = path.join(brainDir, folder);
    if (!fs.statSync(fullFolder).isDirectory()) continue;

    // 1. Scan task logs
    const tasksDir = path.join(fullFolder, '.system_generated', 'tasks');
    if (fs.existsSync(tasksDir)) {
      const taskFiles = fs.readdirSync(tasksDir);
      for (const tf of taskFiles) {
        if (!tf.endsWith('.log')) continue;
        const content = fs.readFileSync(path.join(tasksDir, tf), 'utf8');
        // Match telegram_id: 123456789 or "telegram_id": 123456789 or 9-10 digit numbers
        const matches = content.matchAll(/telegram_id["':\s]+(\d{7,11})/gi);
        for (const m of matches) {
          const id = parseInt(m[1]);
          if (id > 100000 && id < 990000000) {
            outputIds.add(id);
          }
        }
      }
    }

    // 2. Scan scratch scripts
    const scratchDir = path.join(fullFolder, 'scratch');
    if (fs.existsSync(scratchDir)) {
      const sFiles = fs.readdirSync(scratchDir);
      for (const sf of sFiles) {
        const content = fs.readFileSync(path.join(scratchDir, sf), 'utf8');
        const matches = content.matchAll(/telegram_id["':\s]+(\d{7,11})/gi);
        for (const m of matches) {
          const id = parseInt(m[1]);
          if (id > 100000 && id < 990000000) {
            outputIds.add(id);
          }
        }
      }
    }
  }

  console.log(`Scanned brain folders. Found ${outputIds.size} unique telegram IDs!`);
} catch (e) {
  console.error(e);
}

