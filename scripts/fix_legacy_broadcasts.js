const fs = require('fs');

// 1. Fix admin_handler.go
let adminHandler = fs.readFileSync('backend/internal/handlers/admin_handler.go', 'utf8');

adminHandler = adminHandler.split('btnText = "🐝 Open HashBee App"').join('btnText = "🔨 Play Heist Miner"');
adminHandler = adminHandler.split('btnText = "🐝 Open HashBee Miner"').join('btnText = "🔨 Play Heist Miner"');
adminHandler = adminHandler.split('btnText = "🐝 Open HashBee Miner 🚀"').join('btnText = "🔨 Play Heist Miner"');
adminHandler = adminHandler.split('req.ButtonText = "🐝 Open HashBee App"').join('req.ButtonText = "🔨 Play Heist Miner"');

adminHandler = adminHandler.replace(
  '🚀 *Your funds have been transferred successfully!* Thank you for mining with HashBee. Keep your hive active, boost your GHS speed, and invite friends to multiply your earnings! 🐝',
  '🚀 *Your cashout has been dispatched successfully!* Thank you for drilling with Heist Miner. Keep your generators charged and grow your Syndicate squad to multiply your earnings! 🔨'
);

adminHandler = adminHandler.replace(
  '🐝 Open HashBee to check your balance and continue mining.',
  '🔨 Open Heist Miner to check your stash balance and continue drilling.'
);

fs.writeFileSync('backend/internal/handlers/admin_handler.go', adminHandler, 'utf8');
console.log('1. Cleaned backend/internal/handlers/admin_handler.go');

// 2. Fix payout_mirror_service.go
let payoutService = fs.readFileSync('backend/internal/services/payout_mirror_service.go', 'utf8');
payoutService = payoutService.replace('✅ <b>HashBee Withdrawal Complete</b>', '✅ <b>Heist Miner Cashout Complete</b>');
payoutService = payoutService.replace('btnText := "⚡ Start Bot ➔"', 'btnText := "🔨 Play Heist Miner ➔"');
payoutService = payoutService.replace('@HashBeePayouts', '@VaultfinityPayouts');
fs.writeFileSync('backend/internal/services/payout_mirror_service.go', payoutService, 'utf8');
console.log('2. Cleaned backend/internal/services/payout_mirror_service.go');

// 3. Fix bot.go
let botGo = fs.readFileSync('backend/internal/bot/bot.go', 'utf8');
botGo = botGo.replace('keyboard := newWebAppKeyboard("⚡ Check Mining Power", miniAppURL)', 'keyboard := newWebAppKeyboard("🔨 Check Drill Speed", miniAppURL)');
botGo = botGo.replace(
  `🎉 <b>Referral Activated!</b>\n\n👤 <b>%s</b> just collected their first mining harvest!\n\n⚡ You've unlocked <b>+%.2f GHS</b> Hash Power bonus!\nYour mining speed has increased automatically. 🚀`,
  `🎉 <b>Syndicate Recruit Active!</b>\n\n👤 <b>%s</b> just started drilling and smelted their first gold!\n\n⚡ You've unlocked bonus syndicate drill commission!\nYour squad yield is now active 24/7. 🔨`
);
botGo = botGo.replace('Mining Power Added: *+%.2f GHS*!', 'Auxiliary Power & Drill Speed Credited!* ⚡');
botGo = botGo.replace('Your miner is accumulating at the upgraded rate 24/7!', 'Your safecrackers are drilling at the upgraded rate 24/7! 🔨');

fs.writeFileSync('backend/internal/bot/bot.go', botGo, 'utf8');
console.log('3. Cleaned backend/internal/bot/bot.go');

