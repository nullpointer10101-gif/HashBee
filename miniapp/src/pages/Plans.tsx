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
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getTonkeeperDeepLink = (plan: PlanTier) => {
    const nanoAmount = Math.round(plan.cost_gram * 1e9)
    const memo = getPlanMemo(plan.id)
    return `ton://transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${encodeURIComponent(memo)}`
  }

  const getTonkeeperUniversalLink = (plan: PlanTier) => {
    const nanoAmount = Math.round(plan.cost_gram * 1e9)
    const memo = getPlanMemo(plan.id)
    return `https://app.tonkeeper.com/transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${encodeURIComponent(memo)}`
  }

  const handle1ClickTonkeeper = (plan: PlanTier) => {
    const deepLink = getTonkeeperDeepLink(plan)
    const universalLink = getTonkeeperUniversalLink(plan)

    // Attempt native app deep link first, with fallback to universal link
    try {
      window.location.href = deepLink
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(universalLink)
        } else {
          window.open(universalLink, '_blank')
        }
      }, 500)
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

  const activePlans = myPlans.filter((p) => p.status === 'active')
  const completedPlans = myPlans.filter((p) => p.status === 'claimed')
  const userBalance = Number(user?.honey_balance || 0)

  return (
    <div className="min-h-screen bg-[#0c1311] text-[#e6f0ec] pb-28 pt-3 px-4 max-w-md mx-auto relative select-none">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[-10%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Top Header Card */}
      <div className="relative z-10 bg-gradient-to-b from-[#18231f] to-[#121a17] border border-emerald-500/20 rounded-2xl p-4 mb-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🍯</span>
            <div>
              <h1 className="text-base font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                Daily Yield Plans
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-bold">
                  24H CYCLES
                </span>
              </h1>
              <p className="text-[11px] text-stone-400">Direct TON activation • Guaranteed next-day returns</p>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-right">
            <span className="text-[9px] text-stone-400 block uppercase font-bold">Balance</span>
            <span className="text-xs font-black text-emerald-400">{userBalance.toFixed(4)} G</span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
          <div className="bg-[#0e1614]/80 rounded-xl p-2 border border-white/5">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Active Plans</div>
            <div className="text-xs font-black text-amber-400">{activePlans.length} Running</div>
          </div>
          <div className="bg-[#0e1614]/80 rounded-xl p-2 border border-white/5">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Duration</div>
            <div className="text-xs font-black text-emerald-400">24 Hours</div>
          </div>
          <div className="bg-[#0e1614]/80 rounded-xl p-2 border border-white/5">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Total Claimed</div>
            <div className="text-xs font-black text-purple-400">
              +{plansOverview?.total_earned_gram ? plansOverview.total_earned_gram.toFixed(2) : '0.00'} G
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#141d1a] p-1 rounded-xl border border-white/5 mb-4 relative z-10">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'store'
              ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>🛒</span>
          <span>PLANS STORE</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>⚡</span>
          <span>ACTIVE ({activePlans.length})</span>
          {activePlans.some((p) => p.is_ready_to_claim) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-2" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-stone-700 to-stone-600 text-white shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>📜</span>
          <span>HISTORY</span>
        </button>
      </div>

      {/* Content Tab 1: Available Plans Store */}
      {activeTab === 'store' && (
        <div className="space-y-3.5 relative z-10">
          {/* Plan 1: Starter Bee Miner (0.70 G -> 0.80 G) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative rounded-2xl p-4 border transition-all ${
              plansOverview?.can_buy_starter !== false
                ? 'bg-gradient-to-b from-[#251a10] via-[#1a130c] to-[#120e09] border-amber-500/40 shadow-lg shadow-amber-950/30'
                : 'bg-[#151a17]/60 border-stone-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                ⚡ 1 PER ACCOUNT TRIAL
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                +14.3% NET PROFIT
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                🐝
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Starter Bee Miner
                </h3>
                <p className="text-[11px] text-stone-400">
                  Pay <span className="text-amber-300 font-bold">0.70 TON</span> ➔ Receive{' '}
                  <span className="text-emerald-400 font-bold">0.80 GRAM</span> next day
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#0e0a06]/80 rounded-xl p-2.5 border border-white/5 mb-3 text-center">
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Payment</div>
                <div className="text-xs font-black text-amber-300">0.70 TON</div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Return (24h)</div>
                <div className="text-xs font-black text-emerald-400">0.80 GRAM</div>
              </div>
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Net Profit</div>
                <div className="text-xs font-black text-emerald-300">+0.10 G</div>
              </div>
            </div>

            {plansOverview?.can_buy_starter !== false ? (
              <button
                onClick={() =>
                  handleOpenPayment({
                    id: 'starter',
                    name: 'Starter Bee Miner',
                    subtitle: 'Fast 24h trial pack — high conversion entry miner',
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
                  })
                }
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-950 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡ ACTIVATE (0.70 TON)</span>
                <span>➔</span>
              </button>
            ) : (
              <div className="w-full py-2 rounded-xl bg-stone-800/80 text-stone-400 font-bold text-xs text-center border border-white/5">
                ✓ 1-TIME TRIAL COMPLETED
              </div>
            )}
          </motion.div>

          {/* Plan 2: Standard Worker Miner (1.30 G -> 2.00 G) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-2xl p-4 bg-gradient-to-b from-[#0f271f] via-[#0d1d18] to-[#091511] border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider animate-pulse">
                🔥 BEST VALUE & POPULAR
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-900/80 text-emerald-300 border border-emerald-400/40">
                +53.8% HUGE NET PROFIT
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Standard Worker Miner
                  <span className="text-[9px] bg-teal-950 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/30">
                    UNLIMITED
                  </span>
                </h3>
                <p className="text-[11px] text-stone-300">
                  Pay <span className="text-emerald-300 font-bold">1.30 TON</span> ➔ Receive{' '}
                  <span className="text-emerald-400 font-bold text-xs">2.00 GRAM</span> next day
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#08120e]/90 rounded-xl p-2.5 border border-emerald-500/20 mb-3 text-center">
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Payment</div>
                <div className="text-xs font-black text-white">1.30 TON</div>
              </div>
              <div className="border-x border-emerald-500/20">
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Return (24h)</div>
                <div className="text-xs font-black text-emerald-400 text-sm">2.00 GRAM</div>
              </div>
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Net Profit</div>
                <div className="text-xs font-black text-emerald-300">+0.70 G</div>
              </div>
            </div>

            <button
              onClick={() =>
                handleOpenPayment({
                  id: 'standard',
                  name: 'Standard Worker Miner',
                  subtitle: 'Best value daily yield contract with massive returns',
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
                })
              }
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs tracking-wider uppercase shadow-lg shadow-emerald-950 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚡ ACTIVATE (1.30 TON)</span>
              <span>➔</span>
            </button>
          </motion.div>

          {/* Plan 3: Royal Queen Miner (3.00 G -> 4.00 G) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl p-4 bg-gradient-to-b from-[#23122c] via-[#1a0c21] to-[#110716] border border-purple-500/40 shadow-lg shadow-purple-950/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 tracking-wider">
                👑 ROYAL WHALE MINER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                +33.3% NET PROFIT
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner">
                👑
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Royal Queen Miner
                  <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">
                    UNLIMITED
                  </span>
                </h3>
                <p className="text-[11px] text-stone-300">
                  Pay <span className="text-purple-300 font-bold">3.00 TON</span> ➔ Receive{' '}
                  <span className="text-emerald-400 font-bold text-xs">4.00 GRAM</span> next day
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#0f0714]/80 rounded-xl p-2.5 border border-purple-500/20 mb-3 text-center">
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Payment</div>
                <div className="text-xs font-black text-purple-200">3.00 TON</div>
              </div>
              <div className="border-x border-purple-500/20">
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Return (24h)</div>
                <div className="text-xs font-black text-emerald-400 text-sm">4.00 GRAM</div>
              </div>
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-semibold">Net Profit</div>
                <div className="text-xs font-black text-emerald-300">+1.00 G</div>
              </div>
            </div>

            <button
              onClick={() =>
                handleOpenPayment({
                  id: 'queen',
                  name: 'Royal Queen Miner',
                  subtitle: 'Maximum power mining contract with guaranteed 4.00 GRAM payout',
                  badge: '👑 HIGH YIELD',
                  cost_gram: 3.0,
                  return_gram: 4.0,
                  profit_gram: 1.0,
                  profit_percent: 33.33,
                  duration_hours: 24,
                  max_per_account: 0,
                  is_limited: false,
                  user_purchased: 0,
                  can_purchase: true,
                  icon: '👑',
                  accent_color: '#a855f7',
                })
              }
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-500 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-purple-950 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚡ ACTIVATE (3.00 TON)</span>
              <span>➔</span>
            </button>
          </motion.div>

          {/* Guarantee info banner */}
          <div className="bg-[#121c19] border border-white/10 rounded-xl p-3 text-center">
            <p className="text-[11px] text-stone-300 leading-relaxed">
              🛡️ <span className="font-bold text-white">Direct TON Activation:</span> Plans require external TON
              blockchain payments and automatically unlock guaranteed returns after 24 hours. Activating any plan also
              qualifies your account for lifetime withdrawals!
            </p>
          </div>
        </div>
      )}

      {/* Content Tab 2: Active Contracts */}
      {activeTab === 'active' && (
        <div className="space-y-3 relative z-10">
          {activePlans.length === 0 ? (
            <div className="bg-[#131b18] border border-white/5 rounded-2xl p-8 text-center">
              <span className="text-4xl mb-2 block">⏳</span>
              <h3 className="text-sm font-bold text-white mb-1">No Active Plans Running</h3>
              <p className="text-xs text-stone-400 mb-4">
                Activate a plan to start earning guaranteed 24-hour daily GRAM returns.
              </p>
              <button
                onClick={() => setActiveTab('store')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs rounded-xl"
              >
                VIEW AVAILABLE PLANS
              </button>
            </div>
          ) : (
            activePlans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-4 border transition-all ${
                  p.is_ready_to_claim
                    ? 'bg-gradient-to-b from-[#132c1c] to-[#0d1f14] border-emerald-400 shadow-xl shadow-emerald-950/50'
                    : 'bg-[#151e1b] border-white/10 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {p.plan_id === 'starter' ? '🐝' : p.plan_id === 'queen' ? '👑' : '⚡'}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-white">{p.plan_name}</h4>
                      <p className="text-[10px] text-stone-400">
                        Invested: {p.cost_gram.toFixed(2)} G • Payout:{' '}
                        <span className="text-emerald-400 font-bold">{p.return_gram.toFixed(2)} G</span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      p.is_ready_to_claim
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 animate-pulse'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {p.is_ready_to_claim ? 'READY TO CLAIM' : 'MATURING'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#0a100e] rounded-full h-2.5 mb-2 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      p.is_ready_to_claim
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                    }`}
                    style={{ width: `${p.progress_percent}%` }}
                  />
                </div>

                {/* Timer & Claim Trigger */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] font-mono text-stone-300 flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>{p.is_ready_to_claim ? 'Completed (24h)' : formatCountdown(p.seconds_remaining)}</span>
                  </div>

                  {p.is_ready_to_claim ? (
                    <button
                      onClick={() => handleClaimPlan(p.id)}
                      disabled={actionLoading === p.id}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-950 animate-bounce"
                    >
                      {actionLoading === p.id ? 'CLAIMING...' : `💰 CLAIM +${p.return_gram.toFixed(2)} G`}
                    </button>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-semibold">Yield unlocks in 24h</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Tab 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-2.5 relative z-10">
          {completedPlans.length === 0 ? (
            <div className="bg-[#131b18] border border-white/5 rounded-2xl p-8 text-center text-stone-400 text-xs">
              No completed plans yet. Activated plans will appear here once claimed.
            </div>
          ) : (
            completedPlans.map((p) => (
              <div
                key={p.id}
                className="bg-[#131b18] border border-white/5 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                    ✓
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{p.plan_name}</h5>
                    <p className="text-[10px] text-stone-400">
                      {p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : 'Claimed'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-400">+{p.return_gram.toFixed(2)} GRAM</div>
                  <div className="text-[9px] text-stone-500">
                    Net: +{(p.return_gram - p.cost_gram).toFixed(2)} G
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Plan Payment & 1-Click Tonkeeper Modal */}
      <AnimatePresence>
        {showPayModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151f1c] border border-emerald-500/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedPlan.icon}</span>
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedPlan.name}</h3>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      Pay {selectedPlan.cost_gram.toFixed(2)} TON ➔ Get {selectedPlan.return_gram.toFixed(2)} GRAM in
                      24h
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPayModal(false)} className="text-stone-400 text-sm font-bold p-1">
                  ✕
                </button>
              </div>

              {/* 1-Click Tonkeeper Button */}
              <button
                onClick={() => handle1ClickTonkeeper(selectedPlan)}
                className="w-full py-3 mb-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 hover:from-blue-400 hover:to-sky-300 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-950 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>💎</span>
                <span>1-CLICK TONKEEPER PAY ({selectedPlan.cost_gram.toFixed(2)} TON)</span>
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-bold text-stone-400 uppercase">OR PAY MANUALLY</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* Deposit Address */}
              <div className="bg-[#0e1614] rounded-xl p-2.5 border border-white/5 mb-2.5">
                <div className="text-[9px] text-stone-400 uppercase font-semibold mb-1">
                  Destination Wallet Address (TON)
                </div>
                <div className="text-[11px] font-mono text-emerald-400 break-all select-all font-semibold">
                  {DEPOSIT_WALLET}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(DEPOSIT_WALLET)
                    setCopiedAddress(true)
                    toast.success('Wallet address copied!')
                    setTimeout(() => setCopiedAddress(false), 2000)
                  }}
                  className="mt-1.5 w-full py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-bold text-stone-200 transition-all"
                >
                  {copiedAddress ? '✓ COPIED ADDRESS' : '📋 COPY ADDRESS'}
                </button>
              </div>

              {/* MEMO (CRITICAL) */}
              <div className="bg-amber-950/40 rounded-xl p-2.5 border border-amber-500/50 mb-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] text-amber-300 uppercase font-black">Mandatory Plan Comment / MEMO</div>
                  <span className="text-[9px] bg-red-500/20 text-red-300 px-1 py-0.2 rounded font-bold">REQUIRED</span>
                </div>
                <div className="text-xs font-mono font-black text-amber-300 my-1">{getPlanMemo(selectedPlan.id)}</div>
                <button
                  onClick={() => {
                    const memo = getPlanMemo(selectedPlan.id)
                    navigator.clipboard.writeText(memo)
                    setCopiedMemo(true)
                    toast.success('MEMO copied!')
                    setTimeout(() => setCopiedMemo(false), 2000)
                  }}
                  className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-[10px] font-black text-black transition-all"
                >
                  {copiedMemo ? '✓ COPIED MEMO' : '📋 COPY MEMO'}
                </button>
              </div>

              {/* Verify Payment Button */}
              <button
                onClick={handleVerifyPayment}
                disabled={checkingPayment}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs shadow-lg shadow-emerald-950 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                {checkingPayment ? 'VERIFYING BLOCKCHAIN...' : '⚡ I HAVE SENT PAYMENT / ACTIVATE PLAN'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
