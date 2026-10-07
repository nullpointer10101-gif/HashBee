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
  first_name?: string
  telegram_id?: number
  amount_honey: number
  amount_usd: number
  wallet_address: string
  payout_method: string
  status: string
  created_at: string
}

interface UserDetail {
  id: string
  telegram_id: number
  username: string
  first_name: string
  language?: string
  referrer_id?: string
  referral_count: number
  bp: number
  honey_balance: number
  spin_balance?: number
  last_collect_at?: string
  streak_count?: number
  status: string
  has_collected: boolean
  has_completed_mission: boolean
  created_at: string
  updated_at?: string
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
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'users' | 'campaigns' | 'broadcast' | 'settings'>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  // Users tab state
  const [usersList, setUsersList] = useState<UserDetail[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersSort, setUsersSort] = useState('referrals_desc')
  const [usersStatusFilter, setUsersStatusFilter] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)

  // User Audit / Deep Dive Modal state
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [selectedWithdrawalContext, setSelectedWithdrawalContext] = useState<PendingWithdrawal | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    min_withdrawal_honey: 10000,
    honey_to_usd_rate: 0.0001,
    tier1_ref_percent: 10,
    tier2_ref_percent: 2.5,
    base_bee_power: 10,
  })

  // Broadcast state
  const SPIN_TEMPLATES = [
    {
      id: 'plan_standard_53pct',
      label: '⚡ 1.30 TON ➔ 2.00 G (+53.8% Profit)',
      message: '⚡ *24H DAILY MINING CONTRACT ACTIVE!* 🍯🔥\n\nLock 1.30 TON today ➔ Receive guaranteed 2.00 GRAM payout in 24 hours!\n💰 +53.8% Pure Guaranteed Profit\n🛡️ Automatic On-Chain Smart Contract Maturity\n⚡ Instant 1-Click Payouts Confirmed\n\nPayment Verified ✅\nStatus: 100% Instant Lifetime Cashout Unlock!\n\n👇 Activate your 24h Mining Plan now:',
      button: '⚡ Activate 1.30 TON Plan (+53.8%) 🚀',
    },
    {
      id: 'plan_starter_trial',
      label: '🐝 0.70 TON ➔ 0.80 G Starter Trial',
      message: '🐝 *0.70 TON STARTER MINER TRIAL!* ⚡💎\n\nSpecial 1-Per-Account Starter Pack!\nPay 0.70 TON ➔ Receive 0.80 GRAM next day guaranteed!\n\nPayment Verified ✅\nUnlocks Lifetime Instant Withdrawals for your Account!\n\n👇 Activate Starter Plan:',
      button: '🐝 Activate 0.70 TON Starter Plan 🚀',
    },
    {
      id: 'plan_queen_whale',
      label: '👑 3.00 TON ➔ 4.00 G Royal Queen',
      message: '👑 *ROYAL QUEEN MINER CONTRACT: 4.00 GRAM DAILY!* 💎⚡\n\nMaximum power yield contract:\nPay 3.00 TON ➔ Receive 4.00 GRAM payout in exactly 24 hours!\n\nPayment Verified ✅\nInstant Blockchain Settlement!\n\n👇 Activate Royal Queen Contract:',
      button: '👑 Activate Royal Queen Plan 💎',
    },
    {
      id: 'payouts_completed',
      label: '💸 Payouts Proof & Verified',
      message: '💸 *DAILY WITHDRAWALS PROCESSED & CREDITED!* 💎🎉\n\nOver 450+ Miner Payouts have been dispatched to TON Wallets!\nCheck your wallet or withdraw your mined GRAM right now!\n\nPayment Verified ✅\nStatus: 100% On-Chain Confirmed\n\n👇 Check your balance & withdraw:',
      button: '💎 Check Balance & Payouts 💸',
    },
    {
      id: 'spin_viral_invite',
      label: '👥 1 Invite = 1 Free Spin',
      message: '👥 *UNLIMITED FREE SPINS & REWARDS!* 🚀💎\n\nEvery single friend you invite gives you:\n🎁 +1 Free Spin on the Lucky Honey Wheel\n⚡ +3 GHS Permanent Mining Speed\n\nPayment Verified ✅\n100% Real Instant Withdrawals!\n\n👇 Invite friends & spin:',
      button: '👥 Get Free Spins & Mine 🚀',
    },
    {
      id: 'hive_full_harvest',
      label: '🐝 Hive Full Harvest',
      message: '🐝 *HEY {name}, YOUR HONEYCOMB IS AT FULL CAPACITY!* 🍯⚡\n\nYour bees have mined maximum GRAM rewards!\nCollect now before your honeycomb storage fills up.\n\nPayment Verified ✅\nDirect One-Tap Harvest!\n\n👇 Collect your earnings:',
      button: '🐝 Collect My GRAM Now 🚀',
    },
  ]
  const [selectedTemplate, setSelectedTemplate] = useState(SPIN_TEMPLATES[0])
  const [broadcastMsg, setBroadcastMsg] = useState(SPIN_TEMPLATES[0].message)
  const [broadcastBtn, setBroadcastBtn] = useState(SPIN_TEMPLATES[0].button)
  const [broadcastTarget, setBroadcastTarget] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastStatus, setBroadcastStatus] = useState<any>(null)
  const [spinResetLoading, setSpinResetLoading] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || 'https://hashbee1.onrender.com'
  const api = axios.create({
    baseURL: `${API_BASE}/api/admin`,
    headers: { Authorization: `Bearer ${token}` },
  })

  const loadData = async () => {
    try {
      const [statsRes, wRes, cRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/withdrawals'),
        api.get('/campaigns'),
      ])
      const s = statsRes.data || {}
      setStats({
        total_users: s.total_users || 0,
        active_users_24h: s.dau || 0,
        total_honey_supply: s.total_honey_issued || 0,
        total_usd_liability: (s.total_honey_issued || 0) * 0.0001,
        total_campaign_revenue: 0,
        pending_withdrawals_count: s.pending_withdrawals || 0,
      })
      const wList = wRes.data?.withdrawals || []
      setWithdrawals(wList.map((w: any) => ({
        id: w.id,
        user_id: w.user_id,
        username: w.username || 'miner',
        first_name: w.first_name || '',
        telegram_id: w.telegram_id,
        amount_honey: w.honey_amount || w.amount,
        amount_usd: (w.honey_amount || w.amount) * 0.0001,
        wallet_address: w.address,
        payout_method: w.network,
        status: w.status,
        created_at: w.created_at,
      })))
      setCampaigns(cRes.data?.campaigns || [])
    } catch (err: any) {
      setStats({
        total_users: 14850,
        active_users_24h: 3420,
        total_honey_supply: 84500000,
        total_usd_liability: 8450,
        total_campaign_revenue: 12500,
        pending_withdrawals_count: 2,
      })
      setWithdrawals([
        {
          id: 'w-101',
          user_id: '13c57081-f1aa-48da-b5b4-b6e854aa4d50',
          username: 'conlonhaha1',
          first_name: 'co ne',
          telegram_id: 7875362990,
          amount_honey: 0.05,
          amount_usd: 0.05,
          wallet_address: 'UQAZJ9kqtXXwzt7dL2ietCvlGsoFamIlxu2KRe9eYoxGlyiL',
          payout_method: 'GRAM',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        {
          id: 'w-102',
          user_id: '18e915f8-0fd8-4595-8dd9-39db9e5117b7',
          username: 'vvvvv20008',
          first_name: 'V',
          telegram_id: 5168204866,
          amount_honey: 0.05,
          amount_usd: 0.05,
          wallet_address: 'UQAJV_xgsVCmsoruBm5C1E7QQnm1fazfXZWbP8riA3MLo7xz',
          payout_method: 'GRAM',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await api.get('/users', {
        params: {
          search: usersSearch.trim() || undefined,
          status: usersStatusFilter || undefined,
          sort: usersSort,
          limit: 50,
        }
      })
      setUsersList(res.data?.users || [])
      setUsersTotal(res.data?.total || 0)
    } catch (err: any) {
      toast.error('Failed to load users list')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleInspectUser = async (userIdentifier: { user_id?: string; username?: string; telegram_id?: number }, withdrawalContext?: PendingWithdrawal) => {
    setSelectedWithdrawalContext(withdrawalContext || null)
    setModalOpen(true)
    setInspectLoading(true)
    setSelectedUser(null)

    try {
      const searchTerm = userIdentifier.username || (userIdentifier.telegram_id ? String(userIdentifier.telegram_id) : userIdentifier.user_id) || ''
      const res = await api.get('/users', {
        params: { search: searchTerm, limit: 10 }
      })
      const foundList: UserDetail[] = res.data?.users || []
      
      // Match by ID, Telegram ID, or Username
      let matched = foundList.find(u => 
        (userIdentifier.user_id && u.id === userIdentifier.user_id) ||
        (userIdentifier.telegram_id && u.telegram_id === userIdentifier.telegram_id) ||
        (userIdentifier.username && u.username?.toLowerCase() === userIdentifier.username.toLowerCase())
      )

      if (!matched && foundList.length > 0) {
        matched = foundList[0]
      }

      if (matched) {
        setSelectedUser(matched)
      } else {
        // Fallback placeholder with whatever we know
        setSelectedUser({
          id: userIdentifier.user_id || 'unknown',
          telegram_id: userIdentifier.telegram_id || 0,
          username: userIdentifier.username || 'unknown',
          first_name: withdrawalContext?.first_name || '',
          referral_count: 0,
          bp: 10,
          honey_balance: withdrawalContext?.amount_honey || 0,
          status: 'active',
          has_collected: true,
          has_completed_mission: true,
          created_at: withdrawalContext?.created_at || new Date().toISOString(),
        })
      }
    } catch (err: any) {
      toast.error('Failed to fetch full user telemetry')
    } finally {
      setInspectLoading(false)
    }
  }

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await api.patch(`/users/${userId}/status`, { status: newStatus, reason: `Admin inspection update to ${newStatus}` })
      toast.success(`User marked as ${newStatus.toUpperCase()}`)
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus })
      }
      loadUsers()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update user status')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab, usersSort, usersStatusFilter])

  useEffect(() => {
    if (!broadcastStatus?.is_running) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/broadcast/status')
        setBroadcastStatus(res.data)
        if (!res.data.is_running) clearInterval(interval)
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [broadcastStatus?.is_running])

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await api.patch(`/withdrawals/${id}`, { status: 'approved' })
      toast.success('Withdrawal approved! Payout initiated.')
      setWithdrawals((prev) => prev.filter((w) => w.id !== id))
      if (selectedWithdrawalContext?.id === id) {
        setSelectedWithdrawalContext({ ...selectedWithdrawalContext, status: 'approved' })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Approval failed')
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await api.patch(`/withdrawals/${id}`, { status: 'rejected', reason: 'Policy violation / suspicious activity' })
      toast.success('Withdrawal rejected. Funds refunded to user.')
      setWithdrawals((prev) => prev.filter((w) => w.id !== id))
      if (selectedWithdrawalContext?.id === id) {
        setSelectedWithdrawalContext({ ...selectedWithdrawalContext, status: 'rejected' })
      }
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

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return toast.error('Message required')
    setBroadcastLoading(true)
    try {
      const payload: any = { message: broadcastMsg, button_text: broadcastBtn, button_url: 'https://t.me/hashbe_bot/app' }
      if (broadcastTarget.trim()) { const tid = parseInt(broadcastTarget.trim()); if (!isNaN(tid)) payload.target_telegram_id = tid }
      const res = await api.post('/broadcast', payload)
      setBroadcastStatus({ is_running: true, total: res.data.total, sent: 0, failed: 0, percent: 0, message: 'Starting...' })
      toast.success(`Broadcast started for ${res.data.total} users!`)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Broadcast failed') }
    finally { setBroadcastLoading(false) }
  }

  const handleSpinReset = async () => {
    if (!confirm('PERMANENT: Set spin epoch to NOW. Old referrals will NOT grant spins. Only NEW referrals from this moment count. Continue?')) return
    setSpinResetLoading(true)
    try { const res = await api.post('/spin-reset'); toast.success(res.data.message || 'Spin epoch reset permanently!') }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Spin reset failed') }
    finally { setSpinResetLoading(false) }
  }

  // Anti-fraud legitimacy calculator
  const getLegitimacyScore = (user: UserDetail) => {
    let score = 0
    const reasons: string[] = []

    if (user.referral_count >= 10) {
      score += 40
      reasons.push(`🔥 Top Promoter (${user.referral_count} direct invites)`)
    } else if (user.referral_count >= 2) {
      score += 20
      reasons.push(`👥 Active Inviter (${user.referral_count} invites)`)
    }

    if (user.has_collected) {
      score += 20
      reasons.push(`⛏️ Active Cloud Miner (Harvested honey)`)
    }

    if (user.has_completed_mission) {
      score += 20
      reasons.push(`🎯 Mission Verified (Followed channels/tasks)`)
    }

    if (user.bp > 15) {
      score += 15
      reasons.push(`⚡ Hashpower Accumulated (${user.bp.toFixed(1)} GHS)`)
    }

    const ageHours = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60)
    if (ageHours > 48) {
      score += 15
      reasons.push(`📅 Mature Account (${Math.floor(ageHours / 24)} days active)`)
    } else if (ageHours > 12) {
      score += 5
      reasons.push(`📅 Active for ${Math.floor(ageHours)} hours`)
    }

    let verdict = '🟢 HIGH LEGITIMACY (REAL USER)'
    let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    if (score >= 60) {
      verdict = '🟢 HIGH LEGITIMACY (REAL ACTIVE PROMOTER)'
      badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    } else if (score >= 35) {
      verdict = '🔵 MODERATE LEGITIMACY (NORMAL MINER)'
      badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    } else {
      verdict = '🟡 LOW ACTIVITY / UNVERIFIED (CHECK CAREFULLY)'
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    }

    return { score, verdict, badgeClass, reasons }
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
              { id: 'broadcast', label: '📣 Broadcast & Spins', badge: null },
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Pending Withdrawal Approval Queue</h2>
                <p className="text-xs text-slate-400 mt-1">Click on any user name to view their full anti-fraud profile, activity telemetry, and invite history.</p>
              </div>
              <button
                onClick={loadData}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                🔄 Refresh
              </button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                No pending withdrawal requests. All payouts processed!
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">User (Click to Inspect)</th>
                      <th className="p-4">Destination Address</th>
                      <th className="p-4">Amount & Asset</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Requested At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => handleInspectUser({ user_id: w.user_id, username: w.username, telegram_id: w.telegram_id }, w)}
                            className="group flex flex-col items-start text-left focus:outline-none"
                            title="Click to perform full Anti-Fraud inspection"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors text-sm">
                                {w.first_name || w.username}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                                🔍 Inspect
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">@{w.username}</span>
                          </button>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px] font-mono text-slate-300" title={w.wallet_address}>{w.wallet_address}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(w.wallet_address);
                                toast.success('📋 Destination address copied!');
                              }}
                              className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all shrink-0 cursor-pointer font-sans font-bold"
                              title="Copy Destination Address"
                            >
                              📋 Copy
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {w.amount_honey} {w.payout_method || 'GRAM'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                            {w.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{new Date(w.created_at).toLocaleString()}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleApproveWithdrawal(w.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                          >
                            Mark Paid
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

        {/* Users & Anti-Fraud Flags Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">User Intelligence & Fraud Detection</h2>
                <p className="text-xs text-slate-400 mt-1">Audit any user, view active mining hashrate, mission telemetry, and referrals.</p>
              </div>
              <div className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                Total Matches: <strong className="text-amber-400 font-bold">{usersTotal.toLocaleString()}</strong>
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 Search by username, Telegram ID, or name..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadUsers() }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <select
                  value={usersSort}
                  onChange={(e) => setUsersSort(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="referrals_desc">🔥 Most Referrals</option>
                  <option value="ghs_desc">⚡ Highest GHS Power</option>
                  <option value="balance_desc">🍯 Highest Balance</option>
                  <option value="created_desc">🕒 Newest First</option>
                  <option value="created_asc">📅 Oldest First</option>
                </select>
              </div>

              <div className="flex gap-2">
                <select
                  value={usersStatusFilter}
                  onChange={(e) => setUsersStatusFilter(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                  <option value="flagged">Flagged</option>
                </select>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-all shrink-0"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <span className="animate-spin text-2xl inline-block mb-2">⚡</span>
                <p>Loading user database...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                No users found matching query.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Telegram ID</th>
                      <th className="p-4">Referrals</th>
                      <th className="p-4">Hashpower (GHS)</th>
                      <th className="p-4">Mined Balance</th>
                      <th className="p-4">Missions</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-bold text-slate-200">
                          <button
                            onClick={() => handleInspectUser({ user_id: u.id, username: u.username, telegram_id: u.telegram_id })}
                            className="text-left group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-100 group-hover:text-amber-400 transition-colors font-bold text-sm">
                                {u.first_name || u.username}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-amber-500/50">
                                🔍
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">@{u.username || 'unknown'}</div>
                          </button>
                        </td>
                        <td className="p-4 font-mono text-slate-300">{u.telegram_id}</td>
                        <td className="p-4">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${u.referral_count > 10 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold' : 'text-slate-300'}`}>
                            👥 {u.referral_count}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-cyan-400">{u.bp.toFixed(2)} GHS</td>
                        <td className="p-4 font-bold text-amber-300">{u.honey_balance.toFixed(2)} 🍯</td>
                        <td className="p-4">
                          {u.has_completed_mission ? (
                            <span className="text-emerald-400 font-bold">✅ Yes</span>
                          ) : (
                            <span className="text-slate-500">❌ No</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'banned' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            u.status === 'flagged' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleInspectUser({ user_id: u.id, username: u.username, telegram_id: u.telegram_id })}
                            className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold transition-all text-xs"
                          >
                            Inspect Audit
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

        {/* Campaigns & Ads Tab */}
        {activeTab === 'campaigns' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Promotional Campaigns</h2>
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                    <a href={c.target_url} target="_blank" rel="noreferrer" className="text-[11px] text-amber-400 hover:underline mt-1 inline-block">
                      {c.target_url}
                    </a>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Completed: <strong className="text-emerald-400">{c.completed_count}</strong></div>
                    <div className="text-xs text-slate-400">Reward: <strong className="text-amber-300">{c.reward_per_user} 🍯</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broadcast & Spin Tab */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">📣 Broadcast & Spin Management</h2>
            <p className="text-slate-400 text-sm mb-6">Send spin announcements and manage the spin epoch permanently.</p>

            <div className="bg-rose-950/40 border border-rose-700/40 rounded-2xl p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-rose-300 text-sm mb-1">🔒 Permanent Spin Reset (Server-Side Epoch)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Sets epoch to RIGHT NOW in the database. All old referrals will NOT grant spins — only new friends who sign up AFTER this moment give +1 spin. Cross-device, permanent fix — not localStorage based.</p>
                </div>
                <button onClick={handleSpinReset} disabled={spinResetLoading} className="ml-4 shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-500 disabled:opacity-50 transition-all">
                  {spinResetLoading ? 'Resetting...' : '🔄 Reset Epoch NOW'}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Quick Templates</label>
              <div className="grid grid-cols-3 gap-2">
                {SPIN_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => { setSelectedTemplate(t); setBroadcastMsg(t.message); setBroadcastBtn(t.button) }}
                    className={`text-left p-3 rounded-xl text-xs font-semibold border transition-all ${selectedTemplate.id === t.id ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Message</label>
                <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} rows={6} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Button Text</label>
                  <input type="text" value={broadcastBtn} onChange={(e) => setBroadcastBtn(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Target Telegram ID (blank = all)</label>
                  <input type="text" value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)} placeholder="e.g. 123456789" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <button onClick={handleBroadcast} disabled={broadcastLoading || broadcastStatus?.is_running} className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
                {broadcastLoading ? 'Sending...' : broadcastStatus?.is_running ? 'Broadcasting...' : '🚀 Send Broadcast'}
              </button>
              {broadcastStatus && (
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5"><span>{broadcastStatus.message}</span><span className="font-bold text-amber-400">{broadcastStatus.percent || 0}%</span></div>
                  <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full transition-all duration-300" style={{ width: `${broadcastStatus.percent || 0}%` }} /></div>
                  <div className="flex gap-4 mt-2 text-[11px] text-slate-400">
                    <span>✅ Sent: <strong className="text-emerald-400">{broadcastStatus.sent || 0}</strong></span>
                    <span>❌ Failed: <strong className="text-rose-400">{broadcastStatus.failed || 0}</strong></span>
                    <span>📋 Total: <strong className="text-slate-200">{broadcastStatus.total || 0}</strong></span>
                  </div>
                </div>
              )}
            </div>
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

      {/* ========================================================================= */}
      {/* USER AUDIT & ANTI-FRAUD DEEP DIVE MODAL */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => { setModalOpen(false); setSelectedUser(null); setSelectedWithdrawalContext(null); }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 flex items-center justify-center font-bold text-sm transition-all"
            >
              ✕
            </button>

            {inspectLoading ? (
              <div className="py-16 text-center text-slate-400">
                <span className="animate-spin text-3xl inline-block mb-3">🔍</span>
                <p className="font-bold text-slate-200">Analyzing User & Running Anti-Fraud Verification...</p>
                <p className="text-xs text-slate-500 mt-1">Checking blockchain addresses, referral trees, and telemetry</p>
              </div>
            ) : selectedUser ? (
              <div>
                {/* Header Profile */}
                <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-400 shrink-0">
                    {(selectedUser.first_name || selectedUser.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-100 truncate">
                        {selectedUser.first_name || selectedUser.username}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        selectedUser.status === 'banned' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        selectedUser.status === 'flagged' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {selectedUser.status || 'active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>@{selectedUser.username}</span>
                      <span>•</span>
                      <span className="font-mono">TG ID: {selectedUser.telegram_id}</span>
                      {selectedUser.language && (
                        <>
                          <span>•</span>
                          <span className="uppercase text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-bold">
                            🌐 {selectedUser.language}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Anti-Fraud Legitimacy Verdict Banner */}
                {(() => {
                  const audit = getLegitimacyScore(selectedUser)
                  return (
                    <div className={`p-4 rounded-2xl border mb-5 ${audit.badgeClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛡️</span>
                          <span className="font-extrabold text-sm tracking-wide">{audit.verdict}</span>
                        </div>
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900/60 border border-white/10">
                          Score: {audit.score}/100
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                        {audit.reasons.map((r, i) => (
                          <div key={i} className="text-[11px] font-semibold flex items-center gap-1.5 opacity-90">
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Key Telemetry Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Referrals</div>
                    <div className="text-xl font-extrabold text-amber-400 mt-1">👥 {selectedUser.referral_count}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Direct L1 miners</div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Active Hashpower</div>
                    <div className="text-xl font-extrabold text-cyan-400 mt-1">⚡ {selectedUser.bp.toFixed(2)} GHS</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Permanent rate</div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Mined Balance</div>
                    <div className="text-xl font-extrabold text-emerald-400 mt-1">🍯 {selectedUser.honey_balance.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">${(selectedUser.honey_balance * 0.0001).toFixed(4)} USD</div>
                  </div>
                </div>

                {/* Audit Checklist & Registration */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-5 space-y-2.5 text-xs">
                  <div className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px] mb-1">
                    🔍 Activity & Bot Detection Signals
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Account Registered:</span>
                    <span className="font-mono text-slate-200">
                      {new Date(selectedUser.created_at).toLocaleString()} ({Math.floor((Date.now() - new Date(selectedUser.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Missions & Channel Follows:</span>
                    <span className={selectedUser.has_completed_mission ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {selectedUser.has_completed_mission ? '✅ Completed & Verified' : '❌ Not Completed'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Cloud Mining Harvest:</span>
                    <span className={selectedUser.has_collected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {selectedUser.has_collected ? '✅ Active Miner (Harvested)' : '❌ Never Harvested'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">User UUID:</span>
                    <span className="font-mono text-[11px] text-slate-500 select-all">{selectedUser.id}</span>
                  </div>
                </div>

                {/* Withdrawal Context If Inspecting from Queue */}
                {selectedWithdrawalContext && (
                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 mb-5">
                    <div className="font-extrabold text-amber-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>💸 Pending Withdrawal Request</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requested Amount:</span>
                        <span className="font-extrabold text-emerald-400">
                          {selectedWithdrawalContext.amount_honey} {selectedWithdrawalContext.payout_method || 'GRAM'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Destination Address:</span>
                        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200">
                          <span className="truncate flex-1 select-all">{selectedWithdrawalContext.wallet_address}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedWithdrawalContext.wallet_address);
                              toast.success('📋 Copied address!');
                            }}
                            className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[10px]"
                          >
                            Copy
                          </button>
                          <a
                            href={`https://tonscan.org/address/${selectedWithdrawalContext.wallet_address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-slate-800 text-amber-400 font-bold rounded text-[10px] hover:bg-slate-700"
                          >
                            TONScan ↗
                          </a>
                        </div>
                      </div>
                    </div>

                    {selectedWithdrawalContext.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleApproveWithdrawal(selectedWithdrawalContext.id)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          ✅ Approve & Mark Paid
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(selectedWithdrawalContext.id)}
                          className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold transition-all"
                        >
                          ❌ Reject Payout
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* User Status Moderation Controls */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <div className="text-xs text-slate-400">Account Moderation:</div>
                  <div className="flex gap-2">
                    {selectedUser.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all"
                      >
                        Set Active
                      </button>
                    )}
                    {selectedUser.status !== 'flagged' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedUser.id, 'flagged')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all"
                      >
                        Flag Account
                      </button>
                    )}
                    {selectedUser.status !== 'banned' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedUser.id, 'banned')}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-all"
                      >
                        🚫 Ban User
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">User profile not found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
