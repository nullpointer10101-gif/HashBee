import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchPlans,
  fetchMyPlans,
  claimPlan,
  checkDeposit,
  PlanTier,
  UserPlanItem,
  PlansOverview,
} from '../services/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export const Plans: React.FC = () => {
  const { user, refreshUser } = useAuth()

  const [activeTab, setActiveTab] = useState<'store' | 'active' | 'history'>('store')
  const [plansOverview, setPlansOverview] = useState<PlansOverview | null>(null)
  const [myPlans, setMyPlans] = useState<UserPlanItem[]>([])
  const [, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Interactive Live Yield Simulator
  const [calcSelectedId, setCalcSelectedId] = useState<string>('apex')

  // Live Activity Ticker state
  const [tickerIndex, setTickerIndex] = useState(0)

  // Plan Deposit / Payment Modal
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)

  const DEPOSIT_WALLET = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  const userTelegramId =
    user?.telegram_id ||
    (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
      : '')

  const ALL_PLAN_TIERS: PlanTier[] = [
    {
      id: 'starter',
      name: 'Starter Bee Miner',
      subtitle: 'Fast 24h trial pack — entry-level miner contract',
      badge: '⚡ 1 PER ACCOUNT',
      cost_gram: 0.7,
      return_gram: 0.8,
      profit_gram: 0.1,
      profit_percent: 14.28,
      duration_hours: 24,
      max_per_account: 1,
      is_limited: true,
      user_purchased: 0,
      can_purchase: true,
      icon: '🐝',
      accent_color: '#f59e0b',
    },
    {
      id: 'standard',
      name: 'Standard Worker Miner',
      subtitle: 'High value daily yield contract with massive returns',
      badge: '🔥 BEST VALUE',
      cost_gram: 1.3,
      return_gram: 2.0,
      profit_gram: 0.7,
      profit_percent: 53.85,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '⚡',
      accent_color: '#10b981',
    },
    {
      id: 'queen',
      name: 'Royal Queen Miner',
      subtitle: 'High power mining contract with guaranteed 4.50 GRAM next day',
      badge: '👑 HIGH YIELD',
      cost_gram: 3.0,
      return_gram: 4.5,
      profit_gram: 1.5,
      profit_percent: 50.0,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '👑',
      accent_color: '#a855f7',
    },
    {
      id: 'titan',
      name: 'Cyber Titan Hive',
      subtitle: 'Whale tier contract delivering +66.7% massive daily returns',
      badge: '💎 VIP TITAN (+66.7%)',
      cost_gram: 6.0,
      return_gram: 10.0,
      profit_gram: 4.0,
      profit_percent: 66.67,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '💎',
      accent_color: '#06b6d4',
    },
    {
      id: 'apex',
      name: 'Apex Sovereign God Hive',
      subtitle: 'Ultra high yield master miner with guaranteed 22.00 GRAM payout',
      badge: '🚀 GOD TIER (+83.3%)',
      cost_gram: 12.0,
      return_gram: 22.0,
      profit_gram: 10.0,
      profit_percent: 83.33,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '🔥',
      accent_color: '#ec4899',
    },
    {
      id: 'matrix',
      name: 'Infinite Mega Whale Matrix',
      subtitle: 'The ultimate 24h plan — 2X DOUBLE YOUR TON in exactly 24 hours',
      badge: '🌌 2X DOUBLE PROFIT (100%)',
      cost_gram: 25.0,
      return_gram: 50.0,
      profit_gram: 25.0,
      profit_percent: 100.0,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '🌌',
      accent_color: '#eab308',
    },
  ]

  const LIVE_ACTIVITIES = [
    { user: '@alex_ton', action: 'Activated 🚀 Apex Sovereign God Hive', returnG: '+22.00 G', time: '1m ago' },
    { user: '@whale_99', action: 'Activated 🌌 Infinite Mega Matrix', returnG: '+50.00 G', time: '3m ago' },
    { user: '@crypto_bee', action: 'Claimed 24H Yield Reward', returnG: '+10.00 G', time: '5m ago' },
    { user: '@sergey_k', action: 'Activated 💎 Cyber Titan Hive', returnG: '+10.00 G', time: '7m ago' },
    { user: '@queen_hive', action: 'Claimed Royal Queen Payout', returnG: '+4.50 G', time: '11m ago' },
    { user: '@ton_miner', action: 'Activated ⚡ Standard Worker Miner', returnG: '+2.00 G', time: '14m ago' },
  ]

  const loadData = async () => {
    try {
      const [overviewData, userPlansData] = await Promise.all([fetchPlans(), fetchMyPlans()])
      setPlansOverview(overviewData)
      setMyPlans(userPlansData)
    } catch (err: any) {
      console.error('Failed to load plans data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Rotate social proof ticker every 3.5 seconds
  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % LIVE_ACTIVITIES.length)
    }, 3500)
    return () => clearInterval(tInterval)
  }, [])

  // Real-time ticking countdown for active plans
  useEffect(() => {
    const timer = setInterval(() => {
      setMyPlans((prev) =>
        prev.map((plan) => {
          if (plan.status !== 'active') return plan
          const matures = new Date(plan.matures_at).getTime()
          const now = Date.now()
          const diffSec = Math.max(0, Math.floor((matures - now) / 1000))

          const totalSec = plan.duration_seconds || 86400
          const elapsed = totalSec - diffSec
          const prog = Math.min(100, Math.max(0, (elapsed / totalSec) * 100))

          return {
            ...plan,
            seconds_remaining: diffSec,
            progress_percent: prog,
            is_ready_to_claim: diffSec === 0,
          }
        })
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00'
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`
  }

  // Open direct payment modal with Tonkeeper deep link & copyable MEMO
  const handleOpenPayment = (plan: PlanTier) => {
    if (!plan.can_purchase) {
      toast.error('This starter plan is limited to 1 purchase per account.')
      return
    }
    setSelectedPlan(plan)
    setShowPayModal(true)
  }

  // Generate memo and Tonkeeper links
  const getPlanMemo = (planId: string) => {
    return `PLAN_${planId.toUpperCase()}_HB_${userTelegramId}`
  }

  const getTonkeeperUniversalLink = (plan: PlanTier) => {
    const nanoAmount = Math.round(plan.cost_gram * 1e9)
    const memo = getPlanMemo(plan.id)
    return `https://app.tonkeeper.com/transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${encodeURIComponent(memo)}`
  }

  const handle1ClickTonkeeper = (plan: PlanTier) => {
    const universalLink = getTonkeeperUniversalLink(plan)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(universalLink, { try_instant_view: false })
      } else {
        window.open(universalLink, '_blank')
      }
    } catch (e) {
      window.open(universalLink, '_blank')
    }
  }

  const handleVerifyPayment = async () => {
    setCheckingPayment(true)
    try {
      const prevActiveCount = myPlans.filter((p) => p.status === 'active').length
      const res = await checkDeposit()
      const [newOverview, updatedPlans] = await Promise.all([fetchPlans(), fetchMyPlans(), refreshUser()])
      setPlansOverview(newOverview)
      setMyPlans(updatedPlans)

      const newActiveCount = updatedPlans.filter((p) => p.status === 'active').length

      if (newActiveCount > prevActiveCount || res?.credited > 0) {
        toast.success('🎉 Blockchain deposit confirmed! Your 24-hour Mining Plan is now active!', {
          duration: 5000,
          icon: '⚡',
        })
        setShowPayModal(false)
        setActiveTab('active')
      } else {
        toast('No new TON payment detected yet. Please ensure you sent the exact amount with MEMO.', {
          icon: '⏳',
          duration: 4000,
        })
      }
    } catch (err: any) {
      toast.error('Deposit check failed. Please wait a few seconds after sending and try again.')
    } finally {
      setCheckingPayment(false)
    }
  }

  const handleClaimPlan = async (userPlanId: string) => {
    setActionLoading(userPlanId)
    try {
      const res = await claimPlan(userPlanId)
      toast.success(res.message || `💰 Claimed +${res.claimed_gram} GRAM!`, { duration: 4500, icon: '🎉' })
      await Promise.all([loadData(), refreshUser()])
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to claim plan'
      toast.error(errMsg)
    } finally {
      setActionLoading(null)
    }
  }

  const availablePlans = plansOverview?.plans?.length ? plansOverview.plans : ALL_PLAN_TIERS
  const activePlans = myPlans.filter((p) => p.status === 'active')
  const completedPlans = myPlans.filter((p) => p.status === 'claimed')
  const userBalance = Number(user?.honey_balance || 0)

  // Current calculator plan
  const activeCalcPlan = availablePlans.find((p) => p.id === calcSelectedId) || availablePlans[4] || availablePlans[0]

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#e6f0ec] pb-28 pt-3 px-4 max-w-md mx-auto relative select-none font-sans">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-amber-500/15 rounded-full blur-[110px]" />
        <div className="absolute top-[25%] right-[-15%] w-[320px] h-[320px] bg-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[-10%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[280px] h-[280px] bg-emerald-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Live Social Proof Activity Ticker */}
      <div className="relative z-10 mb-3 bg-[#111916]/90 border border-emerald-500/30 rounded-full px-3 py-1.5 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex-shrink-0">
            LIVE 24H YIELD
          </span>
          <span className="text-[11px] text-stone-300 truncate">
            <b className="text-white">{LIVE_ACTIVITIES[tickerIndex].user}</b> {LIVE_ACTIVITIES[tickerIndex].action} (
            <span className="text-emerald-400 font-bold">{LIVE_ACTIVITIES[tickerIndex].returnG}</span>)
          </span>
        </div>
        <span className="text-[9px] text-stone-400 flex-shrink-0 ml-1.5">{LIVE_ACTIVITIES[tickerIndex].time}</span>
      </div>

      {/* Top God-Tier Header Card */}
      <div className="relative z-10 bg-gradient-to-b from-[#192520] via-[#121c18] to-[#0c1411] border-2 border-emerald-500/40 rounded-3xl p-4 mb-4 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center text-xl">
              🍯
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                24H Yield Matrix
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-emerald-400 text-black px-2 py-0.5 rounded-full font-black tracking-wider animate-pulse">
                  GOD PLANS
                </span>
              </h1>
              <p className="text-[11px] text-stone-300">Guaranteed 24-hour return • Instant payout on maturity</p>
            </div>
          </div>
          <div className="px-2.5 py-1.5 bg-black/40 border border-emerald-500/40 rounded-2xl text-right">
            <span className="text-[9px] text-stone-400 block uppercase font-bold tracking-wider">Balance</span>
            <span className="text-xs font-black text-emerald-400">{userBalance.toFixed(4)} G</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/10 text-center">
          <div className="bg-[#0b1310]/80 rounded-2xl p-2 border border-white/5">
            <div className="text-[9px] text-stone-400 uppercase font-bold">Active Plans</div>
            <div className="text-xs font-black text-amber-400">{activePlans.length} Running</div>
          </div>
          <div className="bg-[#0b1310]/80 rounded-2xl p-2 border border-white/5">
            <div className="text-[9px] text-stone-400 uppercase font-bold">Contract Cycle</div>
            <div className="text-xs font-black text-emerald-400">Exact 24 Hours</div>
          </div>
          <div className="bg-[#0b1310]/80 rounded-2xl p-2 border border-white/5">
            <div className="text-[9px] text-stone-400 uppercase font-bold">Total Claimed</div>
            <div className="text-xs font-black text-cyan-400">
              +{plansOverview?.total_earned_gram ? plansOverview.total_earned_gram.toFixed(2) : '0.00'} G
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 24H Live Profit Calculator Simulator */}
      <div className="relative z-10 bg-gradient-to-br from-[#1b1424] via-[#14121d] to-[#0d0f17] border border-purple-500/40 rounded-3xl p-4 mb-4 shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">💎</span>
            <span className="text-xs font-black text-white uppercase tracking-wider">24H Live Profit Calculator</span>
          </div>
          <span className="text-[10px] font-black text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/30">
            AUTO-COMPOUNDING
          </span>
        </div>

        {/* Quick selector pills */}
        <div className="grid grid-cols-6 gap-1 mb-3">
          {availablePlans.map((p) => (
            <button
              key={p.id}
              onClick={() => setCalcSelectedId(p.id)}
              className={`py-1.5 rounded-xl text-[10px] font-black transition-all flex flex-col items-center justify-center ${
                calcSelectedId === p.id
                  ? 'bg-gradient-to-b from-purple-500 to-pink-600 text-white shadow-md shadow-purple-900/50 scale-105 border border-purple-300'
                  : 'bg-black/40 text-stone-400 border border-white/5 hover:text-white'
              }`}
            >
              <span>{p.icon}</span>
              <span className="text-[9px]">{p.cost_gram}T</span>
            </button>
          ))}
        </div>

        {/* Dynamic Calculator Outcome Display */}
        <div className="bg-black/60 rounded-2xl p-3 border border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-stone-400 font-bold uppercase">You Deposit</div>
            <div className="text-sm font-black text-white">{activeCalcPlan.cost_gram.toFixed(2)} TON</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-purple-400 font-bold uppercase">24H Multiplier</div>
            <div className="text-xs font-black text-pink-400">+{activeCalcPlan.profit_percent.toFixed(1)}% ROI</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Next Day Payout</div>
            <div className="text-sm font-black text-emerald-300">{activeCalcPlan.return_gram.toFixed(2)} GRAM</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#121c18] p-1.5 rounded-2xl border border-white/5 mb-4 relative z-10 shadow-lg">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'store'
              ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 text-black shadow-lg shadow-emerald-950/50'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>🛒</span>
          <span>PLANS STORE ({availablePlans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>⚡</span>
          <span>ACTIVE ({activePlans.length})</span>
          {activePlans.some((p) => p.is_ready_to_claim) && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-2" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-stone-700 to-stone-600 text-white shadow-lg'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>📜</span>
          <span>HISTORY</span>
        </button>
      </div>

      {/* Content Tab 1: Available Plans Store */}
      {activeTab === 'store' && (
        <div className="space-y-4 relative z-10">
          {/* Loop over ALL Plans in hierarchical god-tier styling */}
          {availablePlans.map((plan, index) => {
            const isGodTier = plan.id === 'apex' || plan.id === 'matrix'
            const isWhaleTier = plan.id === 'titan' || plan.id === 'queen'
            const isStarter = plan.id === 'starter'

            let cardBg = 'bg-gradient-to-b from-[#15231e] via-[#0f1915] to-[#09110e] border-emerald-500/40'
            let badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            let btnGradient = 'from-emerald-500 via-teal-400 to-emerald-500 text-black'

            if (plan.id === 'matrix') {
              cardBg =
                'bg-gradient-to-b from-[#2e2008] via-[#1f1604] to-[#120d02] border-2 border-yellow-400/70 shadow-2xl shadow-yellow-950/60'
              badgeBg = 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50'
              btnGradient = 'from-yellow-400 via-amber-300 to-yellow-500 text-black font-black'
            } else if (plan.id === 'apex') {
              cardBg =
                'bg-gradient-to-b from-[#2d1124] via-[#1d0917] to-[#10040c] border-2 border-pink-500/70 shadow-2xl shadow-pink-950/60'
              badgeBg = 'bg-pink-500/20 text-pink-300 border-pink-400/50'
              btnGradient = 'from-pink-500 via-rose-400 to-purple-600 text-white font-black'
            } else if (plan.id === 'titan') {
              cardBg =
                'bg-gradient-to-b from-[#0e2530] via-[#081720] to-[#040d12] border-2 border-cyan-500/60 shadow-xl shadow-cyan-950/50'
              badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
              btnGradient = 'from-cyan-500 via-sky-400 to-teal-500 text-black font-black'
            } else if (plan.id === 'queen') {
              cardBg =
                'bg-gradient-to-b from-[#24132e] via-[#180b1f] to-[#0f0614] border-2 border-purple-500/50 shadow-xl shadow-purple-950/40'
              badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-400/40'
              btnGradient = 'from-purple-500 via-pink-500 to-purple-600 text-white font-black'
            } else if (isStarter) {
              cardBg =
                plansOverview?.can_buy_starter !== false
                  ? 'bg-gradient-to-b from-[#261b0f] via-[#1b1208] to-[#100a04] border border-amber-500/40 shadow-lg shadow-amber-950/30'
                  : 'bg-[#151a17]/60 border-stone-800 opacity-75'
              badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              btnGradient = 'from-amber-500 to-amber-600 text-black font-black'
            }

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 + index * 0.05 }}
                className={`relative rounded-3xl p-4 border transition-all ${cardBg} ${
                  isGodTier ? 'ring-1 ring-white/10' : ''
                }`}
              >
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border tracking-wider flex items-center gap-1 ${badgeBg} ${
                      isGodTier ? 'animate-pulse' : ''
                    }`}
                  >
                    {plan.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-400/40">
                    +{plan.profit_percent.toFixed(1)}% NET 24H ROI
                  </span>
                </div>

                {/* Plan Info */}
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-inner border ${
                      isGodTier
                        ? 'bg-white/10 border-white/20'
                        : isWhaleTier
                        ? 'bg-purple-500/20 border-purple-400/30'
                        : 'bg-emerald-500/20 border-emerald-400/30'
                    }`}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      {plan.name}
                      {!isStarter && (
                        <span className="text-[9px] bg-black/50 text-stone-300 px-1.5 py-0.2 rounded border border-white/10">
                          UNLIMITED
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      Pay <span className="text-white font-bold">{plan.cost_gram.toFixed(2)} TON</span> ➔ Receive{' '}
                      <span className="text-emerald-400 font-extrabold text-xs">
                        {plan.return_gram.toFixed(2)} GRAM
                      </span>{' '}
                      in 24 Hours
                    </p>
                  </div>
                </div>

                {/* Return Grid Breakdown */}
                <div className="grid grid-cols-3 gap-1.5 bg-black/60 rounded-2xl p-2.5 border border-white/10 mb-3.5 text-center">
                  <div>
                    <div className="text-[9px] text-stone-400 uppercase font-semibold">Payment</div>
                    <div className="text-xs font-black text-white">{plan.cost_gram.toFixed(2)} TON</div>
                  </div>
                  <div className="border-x border-white/10">
                    <div className="text-[9px] text-stone-400 uppercase font-semibold">Return (24h)</div>
                    <div className="text-xs font-black text-emerald-400 text-sm">
                      {plan.return_gram.toFixed(2)} GRAM
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-stone-400 uppercase font-semibold">Net Profit</div>
                    <div className="text-xs font-black text-emerald-300">+{plan.profit_gram.toFixed(2)} G</div>
                  </div>
                </div>

                {/* Activation Button */}
                {isStarter && plansOverview?.can_buy_starter === false ? (
                  <div className="w-full py-2.5 rounded-2xl bg-stone-800/80 text-stone-400 font-bold text-xs text-center border border-white/5">
                    ✓ 1-TIME TRIAL COMPLETED
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(plan)}
                    className={`w-full py-3 rounded-2xl bg-gradient-to-r ${btnGradient} hover:brightness-110 active:scale-98 transition-all shadow-xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2`}
                  >
                    <span>⚡ ACTIVATE ({plan.cost_gram.toFixed(2)} TON)</span>
                    <span>➔</span>
                  </button>
                )}
              </motion.div>
            )
          })}

          {/* Guarantee & Withdrawal info banner */}
          <div className="bg-gradient-to-r from-[#12231b] to-[#0c1813] border border-emerald-500/30 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="text-[11px] text-stone-300 leading-relaxed">
              🛡️ <b className="text-white">Direct TON Activation & Lifetime Withdrawal Unlock:</b> Plans require TON
              blockchain deposits and automatically unlock full yield returns after exactly 24 hours. Activating any
              plan also permanently qualifies your account for instant withdrawals!
            </p>
          </div>
        </div>
      )}

      {/* Content Tab 2: Active Contracts */}
      {activeTab === 'active' && (
        <div className="space-y-3.5 relative z-10">
          {activePlans.length === 0 ? (
            <div className="bg-[#121c18] border border-white/10 rounded-3xl p-8 text-center shadow-xl">
              <span className="text-4xl mb-3 block animate-bounce">⏳</span>
              <h3 className="text-sm font-bold text-white mb-1">No Active Plans Running</h3>
              <p className="text-xs text-stone-400 mb-4 leading-relaxed">
                Activate any 24-hour mining plan to start earning guaranteed daily GRAM returns.
              </p>
              <button
                onClick={() => setActiveTab('store')}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 text-black font-black text-xs rounded-2xl shadow-lg shadow-emerald-950 active:scale-98 transition-all"
              >
                VIEW AVAILABLE PLANS STORE
              </button>
            </div>
          ) : (
            activePlans.map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-4 border transition-all ${
                  p.is_ready_to_claim
                    ? 'bg-gradient-to-b from-[#143320] to-[#0d2215] border-2 border-emerald-400 shadow-2xl shadow-emerald-950/60'
                    : 'bg-[#141e1a] border-white/10 shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {p.plan_id === 'matrix'
                        ? '🌌'
                        : p.plan_id === 'apex'
                        ? '🔥'
                        : p.plan_id === 'titan'
                        ? '💎'
                        : p.plan_id === 'queen'
                        ? '👑'
                        : p.plan_id === 'starter'
                        ? '🐝'
                        : '⚡'}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-white">{p.plan_name}</h4>
                      <p className="text-[10px] text-stone-400">
                        Started: {new Date(p.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      p.is_ready_to_claim
                        ? 'bg-emerald-400 text-black animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {p.is_ready_to_claim ? '✓ READY TO CLAIM' : '⏳ MINING IN PROGRESS'}
                  </span>
                </div>

                {/* Progress Bar & Countdown */}
                <div className="bg-black/50 rounded-2xl p-3 border border-white/5 mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                    <span className="text-stone-400">24H Maturation Clock</span>
                    <span className={p.is_ready_to_claim ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                      {p.is_ready_to_claim ? '00:00:00 (COMPLETE)' : formatCountdown(p.seconds_remaining)}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        p.is_ready_to_claim
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                          : 'bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400'
                      }`}
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Return Summary */}
                <div className="flex items-center justify-between bg-black/40 rounded-2xl p-2.5 border border-white/5 mb-3">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-semibold">Deposit</span>
                    <span className="text-xs font-black text-white">{p.cost_gram.toFixed(2)} TON</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Guaranteed Payout</span>
                    <span className="text-sm font-black text-emerald-300">+{p.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                {/* Action Button */}
                {p.is_ready_to_claim ? (
                  <button
                    onClick={() => handleClaimPlan(p.id)}
                    disabled={actionLoading === p.id}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-black font-black text-xs tracking-wider uppercase shadow-xl shadow-emerald-950/60 active:scale-98 transition-all flex items-center justify-center gap-1.5 animate-bounce"
                  >
                    {actionLoading === p.id ? 'CLAIMING...' : `💰 CLAIM +${p.return_gram.toFixed(2)} GRAM NOW`}
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-2xl bg-stone-800/40 text-stone-400 font-bold text-xs text-center border border-white/5">
                    ⏳ Returns unlock automatically at 24h timer end
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Tab 3: Contract History */}
      {activeTab === 'history' && (
        <div className="space-y-3 relative z-10">
          {completedPlans.length === 0 ? (
            <div className="bg-[#121c18] border border-white/10 rounded-3xl p-8 text-center">
              <span className="text-3xl mb-2 block">📜</span>
              <h3 className="text-sm font-bold text-white mb-1">No Plan History Yet</h3>
              <p className="text-xs text-stone-400">Claimed 24-hour yield contracts will appear here.</p>
            </div>
          ) : (
            completedPlans.map((p) => (
              <div key={p.id} className="bg-[#131d19] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-lg">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">{p.plan_name}</h4>
                    <p className="text-[10px] text-stone-400">
                      Claimed: {p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : 'Completed'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 block">+{p.return_gram.toFixed(2)} GRAM</span>
                  <span className="text-[9px] text-stone-500">Paid {p.cost_gram.toFixed(2)} TON</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Direct Payment / Activation Modal */}
      <AnimatePresence>
        {showPayModal && selectedPlan && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-lg p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-gradient-to-b from-[#1c2924] via-[#141f1b] to-[#0c1411] border-2 border-emerald-500/50 rounded-3xl p-4 shadow-2xl relative max-h-[82vh] overflow-y-auto my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPayModal(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/50 text-stone-400 hover:text-white flex items-center justify-center border border-white/10 z-10"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-3 pr-8">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                  {selectedPlan.icon}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedPlan.name}</h3>
                  <p className="text-[11px] text-stone-300">
                    Deposit <span className="text-white font-bold">{selectedPlan.cost_gram.toFixed(2)} TON</span> ➔
                    Receive <span className="text-emerald-400 font-bold">{selectedPlan.return_gram.toFixed(2)} GRAM</span> in 24h
                  </p>
                </div>
              </div>

              {/* 1-Click Tonkeeper Button */}
              <button
                onClick={() => handle1ClickTonkeeper(selectedPlan)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 hover:from-blue-400 hover:to-sky-300 text-white font-black text-xs tracking-wider uppercase shadow-xl shadow-blue-950 active:scale-98 transition-all flex items-center justify-center gap-2 mb-3"
              >
                <span>💎 1-CLICK TONKEEPER PAY ({selectedPlan.cost_gram.toFixed(2)} TON)</span>
              </button>

              {/* Manual Transfer Option */}
              <div className="bg-black/60 rounded-2xl p-3 border border-white/10 space-y-2.5 mb-3.5">
                <div className="text-[10px] font-bold text-stone-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Manual Transfer Details</span>
                  <span className="text-[9px] text-amber-400 font-bold">MEMO REQUIRED</span>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[9px] text-stone-400 uppercase block mb-0.5">Send Exact Amount</label>
                  <div className="text-xs font-black text-white bg-[#0a100e] px-2.5 py-1.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <span>{selectedPlan.cost_gram.toFixed(2)} TON</span>
                    <span className="text-[9px] text-emerald-400 font-bold">24H RETURN: {selectedPlan.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                {/* Destination Wallet */}
                <div>
                  <label className="text-[9px] text-stone-400 uppercase block mb-0.5">Deposit Wallet Address</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={DEPOSIT_WALLET}
                      className="flex-1 bg-[#0a100e] text-[10px] text-stone-300 font-mono px-2.5 py-1.5 rounded-xl border border-white/5 outline-none truncate select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(DEPOSIT_WALLET)
                        setCopiedAddress(true)
                        setTimeout(() => setCopiedAddress(false), 2000)
                        toast.success('Address copied!')
                      }}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold border border-white/10"
                    >
                      {copiedAddress ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Memo */}
                <div>
                  <label className="text-[9px] text-amber-400 uppercase block mb-0.5 font-bold">
                    Comment / Memo (CRITICAL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={getPlanMemo(selectedPlan.id)}
                      className="flex-1 bg-[#0a100e] text-[11px] text-amber-300 font-mono font-bold px-2.5 py-1.5 rounded-xl border border-amber-500/30 outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPlanMemo(selectedPlan.id))
                        setCopiedMemo(true)
                        setTimeout(() => setCopiedMemo(false), 2000)
                        toast.success('Memo copied!')
                      }}
                      className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-bold border border-amber-500/40"
                    >
                      {copiedMemo ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[8.5px] text-stone-400 mt-1">
                    ⚠️ You MUST paste this exact memo in Tonkeeper/wallet so your plan is activated instantly.
                  </p>
                </div>
              </div>

              {/* Verify Payment Button */}
              <button
                onClick={handleVerifyPayment}
                disabled={checkingPayment}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs tracking-wider uppercase shadow-xl shadow-emerald-950 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                {checkingPayment ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>VERIFYING TON BLOCKCHAIN...</span>
                  </>
                ) : (
                  <span>✓ I HAVE SENT THE PAYMENT — VERIFY NOW</span>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Plans
