const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'admin', 'src', 'pages', 'Dashboard.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Update UserDetail interface
code = code.replace(
  `  bp: number\n  honey_balance: number`,
  `  bp: number\n  honey_balance: number\n  gold_stash?: number\n  energy_kwh?: number`
);

// 2. Update settings initial state labels & terminology
code = code.replace(
  `min_withdrawal_honey: 10000,\n    honey_to_usd_rate: 0.0001,`,
  `min_withdrawal_honey: 10000,\n    honey_to_usd_rate: 0.00001,`
);

// 3. Update Payout mirror defaults
code = code.replace(
  `target_channel: '@HashBeePayouts',`,
  `target_channel: '@VaultfinityPayouts',`
);

// 4. Update Anti-fraud legitimacy calculator
code = code.replace(
  `reasons.push(\`🔥 Top Promoter (\${user.referral_count} direct invites)\`)`,
  `reasons.push(\`🔥 Master Syndicate Leader (\${user.referral_count} operatives recruited)\`)`
);
code = code.replace(
  `reasons.push(\`👥 Active Inviter (\${user.referral_count} invites)\`)`,
  `reasons.push(\`👥 Active Syndicate Recruiter (\${user.referral_count} recruits)\`)`
);
code = code.replace(
  `reasons.push(\`⛏️ Active Cloud Miner (Harvested honey)\`)`,
  `reasons.push(\`⛏️ Active Vault Miner (Extracted gold)\`)`
);
code = code.replace(
  `reasons.push(\`🎯 Mission Verified (Followed channels/tasks)\`)`,
  `reasons.push(\`🎯 Mission Infiltration Verified (Followed channels/tasks)\`)`
);
code = code.replace(
  `reasons.push(\`⚡ Hashpower Accumulated (\${user.bp.toFixed(1)} GHS)\`)`,
  `reasons.push(\`⚡ Drill Hashrate (\${user.bp.toFixed(1)} GHS)\`)`
);
code = code.replace(
  `verdict = '🟢 HIGH LEGITIMACY (REAL ACTIVE PROMOTER)'`,
  `verdict = '🟢 HIGH LEGITIMACY (ELITE HEIST OPERATIVE)'`
);
code = code.replace(
  `verdict = '🔵 MODERATE LEGITIMACY (NORMAL MINER)'`,
  `verdict = '🔵 MODERATE LEGITIMACY (ACTIVE VAULT CRACKER)'`
);
code = code.replace(
  `verdict = '🟡 LOW ACTIVITY / UNVERIFIED (CHECK CAREFULLY)'`,
  `verdict = '🟡 LOW ACTIVITY / UNVERIFIED OPERATIVE'`
);

// 5. Update Sidebar branding & navigation items
const oldSidebar = `<div className="flex items-center gap-3 px-2 py-3 mb-6">
            <span className="text-3xl">🐝</span>
            <div>
              <h1 className="font-extrabold text-amber-400 text-lg tracking-wide">HashBee</h1>
              <span className="text-[11px] text-slate-400 font-mono">Admin Console v1.0</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: '📊 Overview & Stats', badge: null },
              { id: 'withdrawals', label: '💸 Pending Payouts', badge: withdrawals.length },
              { id: 'users', label: '👥 Users & Fraud Flags', badge: null },
              { id: 'campaigns', label: '📢 Campaigns & Ads', badge: null },
              { id: 'broadcast', label: '📣 Broadcast & Spins', badge: null },
              { id: 'settings', label: '⚙️ System Settings', badge: null },
            ]`;

const newSidebar = `<div className="flex items-center gap-3 px-2 py-3 mb-6">
            <span className="text-3xl">🏛️</span>
            <div>
              <h1 className="font-black text-amber-400 text-lg tracking-wide">Vaultfinity</h1>
              <span className="text-[11px] text-amber-400/70 font-mono uppercase font-semibold">Cyber Heist HQ</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: '📊 Heist Overview', badge: null },
              { id: 'withdrawals', label: '💸 Pending Payouts', badge: withdrawals.length },
              { id: 'deposits', label: '💰 Deposits Ledger', badge: null },
              { id: 'users', label: '🥷 Operatives & Telemetry', badge: null },
              { id: 'campaigns', label: '📢 Missions & Ads', badge: null },
              { id: 'broadcast', label: '📣 Heist Broadcasts', badge: null },
              { id: 'settings', label: '⚙️ Security & Settings', badge: null },
            ]`;

code = code.replace(oldSidebar, newSidebar);

// 6. Update Overview Tab with the god-tier 8-card grid and permanent deposit address display
const oldOverview = `{/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Executive Dashboard</h2>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Registered Users</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">{stats?.total_users.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Active 24h: {stats?.active_users_24h.toLocaleString()}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Honey Supply</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">{(stats?.total_honey_supply || 0) / 1000000}M 🍯</div>
                <div className="text-[11px] text-slate-400 mt-1">In user hives & balances</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs text-slate-400 uppercase font-semibold">USD Reserve Requirement</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">\${stats?.total_usd_liability.toLocaleString()}</div>
                <div className="text-[11px] text-amber-400/80 mt-1">Est. liability at $0.0001/Honey</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Campaign Revenue</div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2">\${stats?.total_campaign_revenue.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-300 mt-1">Sponsored ad sales</div>
              </div>
            </div>
          </div>
        )}`;

const newOverview = `{/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
                  <span>🏛️</span> Vaultfinity Cyber Heist Command
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time telemetric command for vault cracking operations, operative payrolls, and blockchain reserves.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  🔄 Refresh Telemetry
                </button>
                <button
                  onClick={() => setActiveTab('broadcast')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  📣 Quick Broadcast
                </button>
              </div>
            </div>

            {/* 8-Card High-Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Operatives */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>🥷 Total Operatives</span>
                  <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE</span>
                </div>
                <div className="text-3xl font-black text-slate-100 mt-2 font-mono">
                  {stats?.total_users.toLocaleString() || '0'}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active 24h: {stats?.active_users_24h.toLocaleString() || '0'}
                </div>
              </div>

              {/* Card 2: Vault Gold Stash */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>🪙 Vault Gold Stash</span>
                  <span className="text-amber-400 text-xs">ORE</span>
                </div>
                <div className="text-3xl font-black text-amber-400 mt-2 font-mono">
                  {((stats?.total_gold_stash || 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Mined vault bullion across squad
                </div>
              </div>

              {/* Card 3: Power Grid Reserve */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>🔋 Auxiliary Power Grid</span>
                  <span className="text-cyan-400 text-xs">ENERGY</span>
                </div>
                <div className="text-3xl font-black text-cyan-400 mt-2 font-mono">
                  {((stats?.total_energy_kwh || 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k <span className="text-sm font-sans font-normal text-slate-400">kWh</span>
                </div>
                <div className="text-[11px] text-cyan-300/80 mt-1">
                  Continuous generator capacity
                </div>
              </div>

              {/* Card 4: Safecrackers in Field */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>🦾 Active Safecrackers</span>
                  <span className="text-purple-400 text-xs">CREW</span>
                </div>
                <div className="text-3xl font-black text-purple-300 mt-2 font-mono">
                  {stats?.total_safecrackers?.toLocaleString() || '0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Hired cyber agents drilling vaults
                </div>
              </div>

              {/* Card 5: Verified Deposits */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>💎 Verified Deposits</span>
                  <span className="text-emerald-400 text-xs">USD</span>
                </div>
                <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">
                  \${(stats?.total_deposited_all || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {stats?.total_deposits_count || 0} on-chain payments received
                </div>
              </div>

              {/* Card 6: Pending Cashouts */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-rose-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>💸 Pending Cashouts</span>
                  <span className="text-rose-400 text-xs">QUEUE</span>
                </div>
                <div className="text-3xl font-black text-rose-300 mt-2 font-mono">
                  \${(stats?.pending_withdrawal_value || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-rose-400/80 mt-1 font-semibold">
                  {withdrawals.length} cashout requests waiting
                </div>
              </div>

              {/* Card 7: Syndicate Commissions */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>👥 Syndicate Commissions</span>
                  <span className="text-amber-400 text-xs">AFFILIATE</span>
                </div>
                <div className="text-3xl font-black text-amber-300 mt-2 font-mono">
                  \${(stats?.total_syndicate_earned || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  10% cut earned by recruiters
                </div>
              </div>

              {/* Card 8: Campaign Ad Revenue */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>📢 Mission Sponsorships</span>
                  <span className="text-emerald-400 text-xs">ADS</span>
                </div>
                <div className="text-3xl font-black text-emerald-300 mt-2 font-mono">
                  \${(stats?.total_campaign_revenue || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Sponsored task promotions
                </div>
              </div>
            </div>

            {/* Permanent Escrow Deposit Wallets Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl">
                    🛡️
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 text-sm tracking-wide">
                      Permanent Deposit Escrow Infrastructure
                    </h3>
                    <p className="text-xs text-slate-400">
                      Immutable hardcoded system receiving addresses for all user deposits (Power, Safecrackers, Missions).
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  🔒 IMMUTABLE SYSTEM CORE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TON Address */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>💎</span> TON Network (GRAM & USD₮-TON)
                    </span>
                    <a
                      href="https://tonscan.org/address/UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline font-mono"
                    >
                      TONScan ↗
                    </a>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 select-all break-all flex items-center justify-between gap-2">
                    <span>UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR');
                        toast.success('📋 TON address copied!');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-sans font-bold text-[10px] shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* TRON Address */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <span>🔴</span> TRON Network (TRX)
                    </span>
                    <a
                      href="https://tronscan.org/#/address/TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-rose-400 hover:underline font-mono"
                    >
                      TRONScan ↗
                    </a>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 select-all break-all flex items-center justify-between gap-2">
                    <span>TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe');
                        toast.success('📋 TRON address copied!');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-sans font-bold text-[10px] shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}`;

code = code.replace(oldOverview, newOverview);

// 7. Update Deposits Ledger Tab filters
code = code.replace(
  `{ id: 'miner', label: '⚡ Miner Power' },\n                  { id: 'plan', label: '👑 NFT Plans' },`,
  `{ id: 'battery', label: '🔋 Battery Packs' },\n                  { id: 'safecracker', label: '🥷 Safecrackers' },`
);

// 8. Update Users Tab
code = code.replace(
  `<h2 className="text-2xl font-bold text-slate-100">User Intelligence & Fraud Detection</h2>\n                <p className="text-xs text-slate-400 mt-1">Audit any user, view active mining hashrate, mission telemetry, and referrals.</p>`,
  `<h2 className="text-2xl font-black text-slate-100 flex items-center gap-2"><span>🥷</span> Operative Telemetry & Fraud Detection</h2>\n                <p className="text-xs text-slate-400 mt-1">Audit heist operatives, inspect cyber drill speeds, syndicate referral networks, and cashout requests.</p>`
);

code = code.replace(
  `<option value="referrals_desc">🔥 Most Referrals</option>\n                  <option value="ghs_desc">⚡ Highest GHS Power</option>\n                  <option value="balance_desc">🍯 Highest Balance</option>`,
  `<option value="referrals_desc">👥 Largest Syndicate Crew</option>\n                  <option value="ghs_desc">⚡ Highest Drill Speed (GHS)</option>\n                  <option value="balance_desc">🪙 Highest Gold / Cash</option>`
);

code = code.replace(
  `<th className="p-4">User</th>\n                      <th className="p-4">Telegram ID</th>\n                      <th className="p-4">Referrals</th>\n                      <th className="p-4">Hashpower (GHS)</th>\n                      <th className="p-4">Mined Balance</th>\n                      <th className="p-4">Missions</th>`,
  `<th className="p-4">Operative</th>\n                      <th className="p-4">Telegram ID</th>\n                      <th className="p-4">Syndicate Crew</th>\n                      <th className="p-4">Drill Rate</th>\n                      <th className="p-4">Balance / Gold</th>\n                      <th className="p-4">Missions</th>`
);

code = code.replace(
  `<td className="p-4 font-bold text-amber-300">{u.honey_balance.toFixed(2)} 🍯</td>`,
  `<td className="p-4 font-bold text-amber-300 font-mono">\${u.honey_balance.toFixed(2)}</td>`
);

// 9. Update Payout Mirror card in Broadcast tab
code = code.replace(
  `Scrapes live payout hashes from external source channels and posts branded 24H HashBee payout proofs to your channel.`,
  `Scrapes live payout hashes from external source channels and posts branded Vaultfinity heist cashout proofs to your channel.`
);
code = code.replace(
  `<label className="text-xs font-bold text-emerald-400 uppercase block mb-1.5">Target HashBee Channel</label>`,
  `<label className="text-xs font-bold text-emerald-400 uppercase block mb-1.5">Target Vaultfinity Channel</label>`
);

// 10. Update Settings Tab
const oldSettings = `{/* System Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Global Economy & System Settings</h2>
            <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Min Withdrawal Threshold (Honey)</label>
                <input
                  type="number"
                  value={settings.min_withdrawal_honey}
                  onChange={(e) => setSettings({ ...settings, min_withdrawal_honey: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Honey Exchange Rate ($ per Honey)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={settings.honey_to_usd_rate}
                  onChange={(e) => setSettings({ ...settings, honey_to_usd_rate: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Tier 1 Referral (%)</label>
                  <input
                    type="number"
                    value={settings.tier1_ref_percent}
                    onChange={(e) => setSettings({ ...settings, tier1_ref_percent: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Tier 2 Referral (%)</label>
                  <input
                    type="number"
                    value={settings.tier2_ref_percent}
                    onChange={(e) => setSettings({ ...settings, tier2_ref_percent: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                Save System Configuration
              </button>
            </form>
          </div>
        )}`;

const newSettings = `{/* System Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                <span>⚙️</span> Vaultfinity Economy & Security Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure payout thresholds, syndicate referral commission cuts, and view permanent vault parameters.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Minimum Cashout Threshold (USD)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.min_withdrawal_honey}
                    onChange={(e) => setSettings({ ...settings, min_withdrawal_honey: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400 font-mono shrink-0">$1.00 USD Min</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Gold Ore Smelting Rate (USD per Gold)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.000001"
                    value={settings.honey_to_usd_rate}
                    onChange={(e) => setSettings({ ...settings, honey_to_usd_rate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400 font-mono shrink-0">100k Gold = $1.00</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                    Tier 1 Syndicate Cut (%)
                  </label>
                  <input
                    type="number"
                    value={settings.tier1_ref_percent}
                    onChange={(e) => setSettings({ ...settings, tier1_ref_percent: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Direct recruit purchases (10%)</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                    Tier 2 Syndicate Cut (%)
                  </label>
                  <input
                    type="number"
                    value={settings.tier2_ref_percent}
                    onChange={(e) => setSettings({ ...settings, tier2_ref_percent: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Second-level squad (2.5%)</p>
                </div>
              </div>

              {/* Permanent Escrow Notice in Settings */}
              <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <span>🔒</span> Immutable Escrow Wallets (System Level)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deposit receiving addresses are locked in core backend configuration and cannot be altered or overwritten from this dashboard, preventing any admin or unauthorized address manipulation.
                </p>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                  <div>TON: <span className="text-cyan-400 select-all">UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR</span></div>
                  <div>TRON: <span className="text-rose-400 select-all">TKuKMQpQVbAfdwzbQm6zxGrfTRdC2ZixVe</span></div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                Save System Configuration
              </button>
            </form>
          </div>
        )}`;

code = code.replace(oldSettings, newSettings);

// 11. Update Audit Modal
code = code.replace(
  `<div className="text-[10px] uppercase font-bold text-slate-400">Total Referrals</div>\n                    <div className="text-xl font-extrabold text-amber-400 mt-1">👥 {selectedUser.referral_count}</div>\n                    <div className="text-[10px] text-slate-500 mt-0.5">Direct L1 miners</div>`,
  `<div className="text-[10px] uppercase font-bold text-slate-400">Syndicate Recruits</div>\n                    <div className="text-xl font-extrabold text-amber-400 mt-1">👥 {selectedUser.referral_count}</div>\n                    <div className="text-[10px] text-slate-500 mt-0.5">Direct squad operatives</div>`
);

code = code.replace(
  `<div className="text-[10px] uppercase font-bold text-slate-400">Active Hashpower</div>\n                    <div className="text-xl font-extrabold text-cyan-400 mt-1">⚡ {selectedUser.bp.toFixed(2)} GHS</div>`,
  `<div className="text-[10px] uppercase font-bold text-slate-400">Drill Hashrate</div>\n                    <div className="text-xl font-extrabold text-cyan-400 mt-1">⚡ {selectedUser.bp.toFixed(2)} GHS</div>`
);

code = code.replace(
  `<div className="text-[10px] uppercase font-bold text-slate-400">Mined Balance</div>\n                    <div className="text-xl font-extrabold text-emerald-400 mt-1">🍯 {selectedUser.honey_balance.toFixed(2)}</div>\n                    <div className="text-[10px] text-slate-500 mt-0.5">\${(selectedUser.honey_balance * 0.0001).toFixed(4)} USD</div>`,
  `<div className="text-[10px] uppercase font-bold text-slate-400">Vault Balance</div>\n                    <div className="text-xl font-extrabold text-emerald-400 mt-1">\${selectedUser.honey_balance.toFixed(2)}</div>\n                    <div className="text-[10px] text-slate-500 mt-0.5">Available for cashout</div>`
);

code = code.replace(
  `<span className="text-slate-400">Cloud Mining Harvest:</span>\n                    <span className={selectedUser.has_collected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>\n                      {selectedUser.has_collected ? '✅ Active Miner (Harvested)' : '❌ Never Harvested'}\n                    </span>`,
  `<span className="text-slate-400">Vault Extraction Activity:</span>\n                    <span className={selectedUser.has_collected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>\n                      {selectedUser.has_collected ? '✅ Active Operative (Drilling)' : '❌ Never Drilled'}\n                    </span>`
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated Dashboard.tsx!');
