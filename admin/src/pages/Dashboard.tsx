import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface AdminStats {
  total_users: number
  active_users_24h: number
  total_honey_supply: number
  total_usd_liability: number
  total_campaign_revenue: number
  pending_withdrawals_count: number
}

interface PendingWithdrawal {
  id: string
  user_id: string
  username: string
  amount_honey: number
  amount_usd: number
  wallet_address: string
  payout_method: string
  status: string
  created_at: string
}

interface Campaign {
  id: string
  title: string
  description: string
  target_url: string
  budget_honey: number
  reward_per_user: number
  status: string
  completed_count: number
  created_at: string
}

export const Dashboard: React.FC<{ token: string; onLogout: () => void }> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'users' | 'campaigns' | 'settings'>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  // Settings state
  const [settings, setSettings] = useState({
    min_withdrawal_honey: 10000,
    honey_to_usd_rate: 0.0001,
    tier1_ref_percent: 10,
    tier2_ref_percent: 2.5,
    base_bee_power: 10,
  })

  // User search query
  const [userQuery, setUserQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const api = axios.create({
    baseURL: '/api/v1/admin',
    headers: { Authorization: `Bearer ${token}` },
  })

  const loadData = async () => {
    try {
      const [statsRes, wRes, cRes] = await Promise.all([
        api.get('/stats'),
        api.get('/withdrawals/pending'),
        api.get('/campaigns'),
      ])
      setStats(statsRes.data.data)
      setWithdrawals(wRes.data.data)
      setCampaigns(cRes.data.data)
    } catch (err: any) {
      // Mock fallback data for dev
      setStats({
        total_users: 14850,
        active_users_24h: 3420,
        total_honey_supply: 84500000,
        total_usd_liability: 8450,
        total_campaign_revenue: 12500,
        pending_withdrawals_count: 3,
      })
      setWithdrawals([
        {
          id: 'w-101',
          user_id: 'u-1',
          username: 'honey_master',
          amount_honey: 25000,
          amount_usd: 2.5,
          wallet_address: 'EQD3f...9k2',
          payout_method: 'TON',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        {
          id: 'w-102',
          user_id: 'u-2',
          username: 'crypto_bee',
          amount_honey: 50000,
          amount_usd: 5.0,
          wallet_address: '@crypto_bee',
          payout_method: 'STARS',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      setCampaigns([
        {
          id: 'c-1',
          title: 'TonQuest Community Join',
          description: 'Join TonQuest Telegram channel',
          target_url: 'https://t.me/TonQuest',
          budget_honey: 100000,
          reward_per_user: 1000,
          status: 'active',
          completed_count: 45,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await api.post(`/withdrawals/${id}/approve`)
      toast.success('Withdrawal approved! Payout initiated.')
      setWithdrawals((prev) => prev.filter((w) => w.id !== id))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Approval failed')
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await api.post(`/withdrawals/${id}/reject`, { reason: 'Policy violation / suspicious activity' })
      toast.success('Withdrawal rejected. Funds refunded to user.')
      setWithdrawals((prev) => prev.filter((w) => w.id !== id))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Rejection failed')
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/settings', settings)
      toast.success('System settings saved successfully!')
    } catch (err: any) {
      toast.error('Failed to update settings')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
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
              { id: 'settings', label: '⚙️ System Settings', badge: null },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-all"
        >
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Overview Tab */}
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
                <div className="text-3xl font-extrabold text-amber-400 mt-2">${stats?.total_usd_liability.toLocaleString()}</div>
                <div className="text-[11px] text-amber-400/80 mt-1">Est. liability at $0.0001/Honey</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Campaign Revenue</div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2">${stats?.total_campaign_revenue.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-300 mt-1">Sponsored ad sales</div>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawals Queue Tab */}
        {activeTab === 'withdrawals' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Pending Withdrawal Approval Queue</h2>
            {withdrawals.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                No pending withdrawal requests. All payouts processed!
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Honey Amount</th>
                      <th className="p-4">USD Value</th>
                      <th className="p-4">Wallet Address / Handle</th>
                      <th className="p-4">Requested At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-200">@{w.username}</td>
                        <td className="p-4 font-semibold text-amber-400">{w.payout_method}</td>
                        <td className="p-4 font-extrabold text-amber-300">{w.amount_honey.toLocaleString()} 🍯</td>
                        <td className="p-4 font-semibold text-emerald-400">${w.amount_usd.toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-300">{w.wallet_address}</td>
                        <td className="p-4 text-slate-400">{new Date(w.created_at).toLocaleString()}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleApproveWithdrawal(w.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(w.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* System Settings Tab */}
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
        )}
      </main>
    </div>
  )
}
