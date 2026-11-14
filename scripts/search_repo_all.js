const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    const full = path.join(dir, f);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        searchDir(full);
      } else {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('MINE & EARN') || content.includes('New Friend Joined') || content.includes('Saeed') || content.includes('0.10 GRAM') || content.includes('Tesla Mining Bot') || content.includes('Open Miner')) {
          console.log('FOUND MATCH IN FILE:', full);
        }
      }
    } catch (e) {}
  }
}

searchDir('.');
console.log('Search complete.');
