const fs = require('fs');

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /<select id="broadcastAudience" class="form-input" onchange="toggleSpecificTgId\(this\.value\)">[\s\S]*?<\/select>/,
    `<select id="broadcastAudience" class="form-input" onchange="toggleSpecificTgId(this.value)">\n              <option value="both" selected>🚀 Direct DMs + Payouts Channel (Full 11,000+ Reach)</option>\n              <option value="channel">📢 Official Payouts Channel (@HashBeePayouts - 10,787 Members)</option>\n              <option value="all">🌍 All Active Registered Users (Direct DMs Only)</option>\n              <option value="single">🎯 Test Single Telegram ID</option>\n            </select>`
  );

  content = content.replace(
    /body: JSON\.stringify\(\{[\s\S]*?target_telegram_id: audience === 'single' \? targetTgId : 0\s*\}\)/,
    `body: JSON.stringify({\n        message: msg,\n        button_text: btnText,\n        button_url: btnUrl,\n        audience: audience,\n        target_telegram_id: audience === 'single' ? targetTgId : 0\n      })`
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated:', path);
}

updateFile('miniapp/public/admin/index.html');
updateFile('backend/public/admin/index.html');

