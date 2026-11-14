const fs = require('fs');

function update(file) {
  let text = fs.readFileSync(file, 'utf8');

  // Replace audience dropdown
  const oldAudience = `<select id="broadcastAudience" class="form-input" onchange="toggleSpecificTgId(this.value)">
              <option value="all">🌍 All Active Telegram Users</option>
              <option value="single">🎯 Test Single Telegram ID</option>
            </select>`;

  const newAudience = `<select id="broadcastAudience" class="form-input" onchange="toggleSpecificTgId(this.value)">
              <option value="both" selected>🚀 Direct DMs + Payouts Channel (Full 11,000+ Reach)</option>
              <option value="channel">📢 Official Payouts Channel (@HashBeePayouts - 10,787 Members)</option>
              <option value="all">🌍 All Active Registered Users (Direct DMs Only)</option>
              <option value="single">🎯 Test Single Telegram ID</option>
            </select>`;

  if (text.includes(oldAudience)) {
    text = text.replace(oldAudience, newAudience);
  } else {
    // CRLF version
    const oldCRLF = oldAudience.replace(/\n/g, '\r\n');
    const newCRLF = newAudience.replace(/\n/g, '\r\n');
    text = text.replace(oldCRLF, newCRLF);
  }

  // Replace fetch body
  const oldBody = `body: JSON.stringify({
        message: msg,
        button_text: btnText,
        button_url: btnUrl,
        target_telegram_id: audience === 'single' ? targetTgId : 0
      })`;

  const newBody = `body: JSON.stringify({
        message: msg,
        button_text: btnText,
        button_url: btnUrl,
        audience: audience,
        target_telegram_id: audience === 'single' ? targetTgId : 0
      })`;

  if (text.includes(oldBody)) {
    text = text.replace(oldBody, newBody);
  } else {
    const oldBodyCRLF = oldBody.replace(/\n/g, '\r\n');
    const newBodyCRLF = newBody.replace(/\n/g, '\r\n');
    text = text.replace(oldBodyCRLF, newBodyCRLF);
  }

  fs.writeFileSync(file, text, 'utf8');
  console.log('Cleanly updated:', file);
}

update('miniapp/public/admin/index.html');
update('backend/public/admin/index.html');
update('backend/public/app/admin/index.html');
