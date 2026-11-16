const fs = require('fs');
const path = require('path');

const files = [
  'miniapp/public/admin/index.html',
  'backend/public/admin/index.html',
  'backend/public/app/admin/index.html'
];

const newTemplatesObj = `const HYPE_TEMPLATES = {
  vault_gold_smelt: {
    msg: \`🔥 *GOLD VEIN STRIKE: SMELT YOUR VAULT BULLION!* 🪙⚡

Your cyber drills have extracted bullion from the central vault:
• 🪙 *Gold Stash Ready*: Smelt raw gold directly into withdrawable USD
• 💵 *Fixed Exchange Rate*: 100,000 Gold = $1.00 USD
• ⚡ Fast cashout settlements in TON, USD₮ & TRX
• 🛡️ Zero platform withdrawal fees

👇 Tap below to smelt your gold into real cash:\`,
    btn: '🔥 Smelt Gold Into Cash ➔'
  },
  safecracker_hire: {
    msg: \`🥷 *EXPAND YOUR DRILL CREW: BLACK MARKET RESTOCKED!* 🛒🔨

Hire elite safecrackers to drill gold from the cyber vault 24/7:
• 🥷 *Lockpick Rookie*: $0.50 (5,000 Gold/day • 10% daily yield)
• 🤖 *Cyber Specialist*: $1.00 (10,000 Gold/day • 10% daily yield)
• ⚡ *Neural Hacker*: $2.50 (27,500 Gold/day • 11% daily yield)
• 👑 *Master Infiltrator*: $5.00 (55,000 Gold/day • 11% daily yield)

👇 Hire operatives to multiply your 24/7 income:\`,
    btn: '🥷 Hire Drill Operatives ➔'
  },
  battery_power_drop: {
    msg: \`🔋 *GENERATOR POWER DROP: RECHARGE DRILLS NOW!* ⚡

Don't let your drills stop — hackers only drill while power is live:
• ⚡ *Auxiliary Battery Grid*: Keep generators humming 24/7
• 🛑 *No Power = No Gold*: Check your remaining battery runtime
• 🎁 *7-Day Drops*: Claim free daily energy packs every 24 hours!

👇 Check battery level & keep drills online:\`,
    btn: '⚡ Check Generator & Drill ➔'
  },
  daily_power_streak: {
    msg: \`🎁 *DAILY GENERATOR DROP READY: CLAIM FREE BATTERY!* ⚡

Hey {name}, your 24-hour generator supply drop is ready to collect:
• 📅 *Daily Energy Drop*: Claim up to +12,000 kWh free power
• 🎁 *7-Day Streak Bonus*: Unlock free Drill Drone companion!
• ⚡ Powers your crew to extract gold bars non-stop

👇 Claim today's power drop in 1-click:\`,
    btn: '🎁 Claim 24H Power Drop ➔'
  },
  withdraw_proof_alert: {
    msg: \`💸 *HEIST MINER CASHOUTS COMPLETE: ALL PROOFS POSTED!* 💎⚡

All pending operative withdrawals have been verified on-chain:
• 🚀 Withdraw in *TON*, *USD₮ (TON)*, or *TRX (TRON)*
• 🔎 Live multi-chain transaction proofs in @HashBeePayouts
• 💰 Minimum withdrawal: *$1.00 USD* with zero fees!

👇 Open wallet & request cashout:\`,
    btn: '💸 Withdraw To Wallet ➔'
  },
  syndicate_commissions: {
    msg: \`👥 *BUILD YOUR SYNDICATE: EARN 10% CUT FOR LIFE!* 🚀

Recruit friends into your heist squad and stack permanent passive cuts:
• 💰 *10% Cash Cut* on every safecracker operative they hire
• 🔋 *10% Cash Cut* on every battery pack they purchase
• 🎁 *$0.02 Instant Cash Bounty* on their first recruit hire
• 👛 Directly claimable into your main cash balance!

👇 Copy invite link & grow your Syndicate:\`,
    btn: '👥 Recruit Syndicate Crew ➔'
  },
  fusion_reactor_pack: {
    msg: \`⚡ *BEST VALUE: FUSION POWER REACTOR (+2M kWh)!* 🔋

Never worry about empty generator batteries again:
• 🔋 *+2,000,000 kWh Fusion Power Pack*
• ⏳ Keeps your drill crew running for over *133 Days non-stop!*
• 💰 Massive bulk discount: Only *$3.00 USD*

👇 Equip Fusion Reactor in the Black Market:\`,
    btn: '⚡ Get Fusion Reactor ($3.00) ➔'
  },
  heist_leaderboard: {
    msg: \`🏆 *VAULT HEIST LEADERBOARD: BULLETS & BULLION!* 🏛️💎

Operatives worldwide are cracking the cyber vaults non-stop:
• 🥇 Over 100M+ Gold bullion smelted this week
• 💵 Thousands in verified on-chain payouts delivered
• 🥷 Stack multiple safecrackers to maximize your daily extraction

👇 Launch Heist Miner & claim your share:\`,
    btn: '🔨 Enter The Vault Now ➔'
  },
  custom: {
    msg: '',
    btn: '🔨 Play Heist Miner'
  }
};

// Aliases for compatibility
HYPE_TEMPLATES.mining_boost = HYPE_TEMPLATES.vault_gold_smelt;
HYPE_TEMPLATES.watch_ads_boost = HYPE_TEMPLATES.vault_gold_smelt;
HYPE_TEMPLATES.spin_free_waiting = HYPE_TEMPLATES.daily_power_streak;
HYPE_TEMPLATES.spin_dopamine_jackpot = HYPE_TEMPLATES.daily_power_streak;
HYPE_TEMPLATES.mystery_crate_drop = HYPE_TEMPLATES.battery_power_drop;
HYPE_TEMPLATES.viral_referrals_rush = HYPE_TEMPLATES.syndicate_commissions;
HYPE_TEMPLATES.hive_full_alert = HYPE_TEMPLATES.vault_gold_smelt;
HYPE_TEMPLATES.missions_bounty = HYPE_TEMPLATES.daily_power_streak;`;

for (const f of files) {
  const filePath = path.resolve(f);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping missing:', f);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Find start of HYPE_TEMPLATES
  const startIdx = content.indexOf('const HYPE_TEMPLATES = {');
  if (startIdx === -1) {
    console.error('Could not find HYPE_TEMPLATES in', f);
    continue;
  }

  // Find end of aliases (before showToast)
  const endIdx = content.indexOf('function showToast', startIdx);
  if (endIdx === -1) {
    console.error('Could not find function showToast in', f);
    continue;
  }

  // Replace that whole block
  content = content.slice(0, startIdx) + newTemplatesObj + '\n\n' + content.slice(endIdx);

  // Update initial load from applyTemplate('mining_boost') to applyTemplate('vault_gold_smelt')
  content = content.replace(
    /applyTemplate\(['"](?:mining_boost|flash_2x_double)['"]\);/g,
    "applyTemplate('vault_gold_smelt');"
  );

  // Make sure applyTemplate handles custom or empty cleanly
  content = content.replace(
    /function applyTemplate\(key\) \{[\s\S]*?updatePreview\(\);[\s\S]*?\}/,
    `function applyTemplate(key) {
  if (HYPE_TEMPLATES[key]) {
    document.getElementById('broadcastMsg').value = HYPE_TEMPLATES[key].msg;
    document.getElementById('broadcastBtnText').value = HYPE_TEMPLATES[key].btn;
  } else if (key === 'custom') {
    document.getElementById('broadcastMsg').value = '';
    document.getElementById('broadcastBtnText').value = '🔨 Play Heist Miner';
  }
  updatePreview();
}`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully updated templates in', f);
}
