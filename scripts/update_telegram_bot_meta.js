async function updateTelegramBotMeta() {
  const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
  const apiBase = 'https://api.telegram.org/bot' + token;

  // 1. setMyName
  console.log('1. Setting bot name to "Heist Miner 🔨"...');
  const nameRes = await fetch(apiBase + '/setMyName', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Heist Miner 🔨' })
  });
  console.log('setMyName result:', await nameRes.json());

  // 2. setMyDescription
  console.log('2. Setting bot description...');
  const descText = '🔨 Welcome to Heist Miner — Cyber Heist Tycoon!\n\n' +
    '🥷 Hire Safecrackers to drill bullion from the cyber vault 24/7\n' +
    '🔋 Charge auxiliary batteries & maintain power streaks\n' +
    '🔥 Smelt Gold directly into Real USD / TON / USDT / TRX\n' +
    '👥 Build your Syndicate & earn 10% lifetime cuts on all hires & batteries\n\n' +
    '👇 Tap "🔨 Play Heist Miner" below to start drilling!';

  const descRes = await fetch(apiBase + '/setMyDescription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: descText })
  });
  console.log('setMyDescription result:', await descRes.json());

  // 3. setMyShortDescription
  console.log('3. Setting short description...');
  const shortDescText = '🔨 Crack the cyber vault & earn crypto 24/7! Smelt gold into real cashouts.';
  const shortDescRes = await fetch(apiBase + '/setMyShortDescription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ short_description: shortDescText })
  });
  console.log('setMyShortDescription result:', await shortDescRes.json());

  // 4. setChatMenuButton (global default)
  console.log('4. Setting default chat menu button...');
  const menuRes = await fetch(apiBase + '/setChatMenuButton', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: '🔨 Play Heist Miner',
        web_app: { url: 'https://miniapp-five-topaz.vercel.app' }
      }
    })
  });
  console.log('setChatMenuButton result:', await menuRes.json());

  // 5. setMyCommands
  console.log('5. Setting bot commands...');
  const cmdRes = await fetch(apiBase + '/setMyCommands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: '🔨 Launch Heist Miner Mini App' },
        { command: 'balance', description: '💰 View your Gold & Cash Balance' },
        { command: 'help', description: '📖 Heist Guide & Safecracker Manual' }
      ]
    })
  });
  console.log('setMyCommands result:', await cmdRes.json());

  // Verify getMe
  const meRes = await fetch(apiBase + '/getMe');
  console.log('Updated getMe:', await meRes.json());
}

updateTelegramBotMeta();

