const fs = require('fs');
let code = fs.readFileSync('admin/src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  '{w.amount_honey} {w.payout_method || \'GRAM\'}',
  '${w.amount_usd || w.amount_honey} USD ({w.payout_method || \'GRAM\'})'
);

code = code.replace(
  'Live verified ledger of all user deposits (Miner Power, 2X Flash Offers, NFT Plans, and Campaign Payments).',
  'Live verified ledger of all operative deposits (Battery Power Packs, Safecrackers, and Campaign Missions).'
);

code = code.replace(
  'placeholder="@HashBeePayouts or -100..."',
  'placeholder="@VaultfinityPayouts or -100..."'
);

code = code.replace(
  '{selectedWithdrawalContext.amount_honey} {selectedWithdrawalContext.payout_method || \'GRAM\'}',
  '${selectedWithdrawalContext.amount_usd || selectedWithdrawalContext.amount_honey} USD ({selectedWithdrawalContext.payout_method || \'GRAM\'})'
);

code = code.replace(
  'reasons.push(`⛏️ Active Vault Miner (Extracted gold)`)',
  'reasons.push(`⛏️ Active Safecracker (Drilling Vault)`)'
);

code = code.replace(
  'Reward: <strong className="text-amber-300">{c.reward_per_user} 🍯</strong>',
  'Reward: <strong className="text-amber-300">+{c.reward_per_user} Gold / Energy</strong>'
);

code = code.replace(
  'Send spin announcements and manage the spin epoch permanently.',
  'Broadcast heist announcements, power drops, and syndicate incentives to all operatives.'
);

fs.writeFileSync('admin/src/pages/Dashboard.tsx', code, 'utf8');
console.log('Cleaned up remaining items!');

