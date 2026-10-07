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
import robotMinerImg from '../assets/images/robot_miner.jpg'
import cyberWorkerImg from '../assets/images/cyber_worker_miner.jpg'

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
      name: 'Starter NFT Miner',
      subtitle: 'Fast 24h entry miner contract — 1 per account trial',
      badge: 'COMMON',
      cost_gram: 0.7,
      return_gram: 0.8,
      profit_gram: 0.1,
      profit_percent: 14.28,
      duration_hours: 24,
      max_per_account: 1,
      is_limited: true,
      user_purchased: 0,
      can_purchase: true,
      icon: '🤖',
      image: robotMinerImg,
      accent_color: '#8b5cf6',
    },
    {
      id: 'standard',
      name: 'Cyber Worker Miner',
      subtitle: 'High value daily yield contract with massive returns',
      badge: 'RARE (+53.8%)',
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
      image: cyberWorkerImg,
      accent_color: '#0088ff',
    },
    {
      id: 'queen',
      name: 'Royal Node Miner',
      subtitle: 'High power computing contract with guaranteed 4.50 GRAM payout',
      badge: 'EPIC (+50%)',
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
      subtitle: 'Whale tier contract delivering +66.7% daily profit',
      badge: 'LEGENDARY (+66.7%)',
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
      accent_color: '#00d68f',
    },
    {
      id: 'apex',
      name: 'Apex Sovereign Node',
      subtitle: 'Ultra high-yield master node with guaranteed 22.00 GRAM payout',
      badge: 'MYTHIC (+83.3%)',
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
      accent_color: '#f59e0b',
    },
    {
      id: 'matrix',
      name: 'Quantum Sovereign 2X',
      subtitle: 'The flagship 24h contract — 2X DOUBLE YOUR TON in exactly 24 hours',
      badge: '2X DOUBLE (+100%)',
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
      accent_color: '#ec4899',
    },
  ]

  const LIVE_ACTIVITIES = [
    { user: '@alex_ton', action: 'Activated Apex Sovereign Node', returnG: '+22.00 G', time: '1m ago' },
    { user: '@whale_99', action: 'Activated Quantum Sovereign 2X', returnG: '+50.00 G', time: '3m ago' },
    { user: '@crypto_pro', action: 'Claimed 24H Yield Reward', returnG: '+10.00 G', time: '5m ago' },
    { user: '@sergey_k', action: 'Activated Cyber Titan Hive', returnG: '+10.00 G', time: '7m ago' },
    { user: '@ton_whale', action: 'Claimed Royal Node Payout', returnG: '+4.50 G', time: '11m ago' },
    { user: '@ton_miner', action: 'Activated Cyber Worker Miner', returnG: '+2.00 G', time: '14m ago' },
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

  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % LIVE_ACTIVITIES.length)
    }, 3500)
    return () => clearInterval(tInterval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setMyPlans((prev) =>
        prev.map((item) => {
          if (item.status === 'active' && item.seconds_remaining > 0) {
            const nextSec = item.seconds_remaining - 1
            const isReady = nextSec <= 0
            const totalDur = item.duration_seconds || 86400
            const elapsed = totalDur - nextSec
            const progress = Math.min(100, Math.max(0, (elapsed / totalDur) * 100))
            return {
              ...item,
              seconds_remaining: Math.max(0, nextSec),
              is_ready_to_claim: isReady,
              progress_percent: progress,
            }
          }
          return item
        })
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const getPlanMemo = (planId: string) => {
    const tgId = userTelegramId || '0'
    return `PLAN_${planId.toUpperCase()}_${tgId}`
  }

  const handleOpenPayment = (plan: PlanTier) => {
    setSelectedPlan(plan)
    setShowPayModal(true)
  }

  const handle1ClickTonkeeper = (plan: PlanTier) => {
    const nanoAmount = Math.round(plan.cost_gram * 1e9)
    const memo = getPlanMemo(plan.id)
    const comment = encodeURIComponent(memo)
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${comment}`
    const directUrl = `ton://transfer/${DEPOSIT_WALLET}?amount=${nanoAmount}&text=${comment}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonkeeperUrl)
    } else {
      window.location.href = directUrl
      setTimeout(() => {
        window.open(tonkeeperUrl, '_blank')
      }, 500)
    }
  }

  const handleVerifyPayment = async () => {
    setCheckingPayment(true)
    toast.loading('Scanning TON blockchain for transfer...', { id: 'verify-plan' })
    try {
      const res = await checkDeposit()
      toast.dismiss('verify-plan')
      await refreshUser()
      await loadData()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Payment verified! Your ${selectedPlan?.name || '24h'} miner is running!`)
        setShowPayModal(false)
        setActiveTab('active')
      } else {
        toast.success('Scan complete. Confirmed plan deposits are activated automatically!')
        setShowPayModal(false)
        setActiveTab('active')
      }
    } catch (err: any) {
      toast.dismiss('verify-plan')
      toast.error('TON transactions take 5–15 seconds to confirm. Please check in a moment!')
    } finally {
      setCheckingPayment(false)
    }
  }

  const handleClaimPlan = async (userPlanId: string) => {
    setActionLoading(userPlanId)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      const res = await claimPlan(userPlanId)
      toast.success(`🎉 ${res.message || 'Claimed 24H Yield Reward!'}`, { duration: 4000 })
      await refreshUser()
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to claim miner reward')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return 'READY'
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const activePlans = myPlans.filter((p) => p.status === 'active')
  const completedPlans = myPlans.filter((p) => p.status === 'claimed')

  const availablePlans = ALL_PLAN_TIERS.map((tier) => {
    const serverPlan = plansOverview?.plans?.find((p: PlanTier) => p.id === tier.id)
    if (serverPlan) {
      return {
        ...tier,
        ...serverPlan,
      }
    }
    return tier
  })

  const userBalance = user?.honey_balance || 0
  const activeCalcPlan = availablePlans.find((p) => p.id === calcSelectedId) || availablePlans[4] || availablePlans[0]

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#0f172a] pb-28 pt-3 px-4 max-w-md mx-auto relative select-none font-sans">
      {/* ── TOP HERO HEADER: LUXURY DARK COSMIC CYBER SHOWCASE ── */}
      <div className="p-5 mb-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b0f19] via-[#1a1438] to-[#0f172a] text-white border border-indigo-500/30 shadow-xl">
        {/* Glowing Nebula Highlights */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Title & Wallet Row */}
        <div className="flex items-start justify-between gap-2 relative z-10 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase drop-shadow-sm">
                NFT Miners Market
              </h1>
              <span className="text-[9px] bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-2 py-0.5 rounded-full font-black tracking-wider shadow">
                24H CYCLE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-1">
              Guaranteed daily returns • Instant payout on maturity
            </p>
          </div>

          <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-right shrink-0">
            <span className="text-[8px] text-slate-300 block uppercase font-extrabold tracking-wider leading-none">Wallet</span>
            <span className="text-xs sm:text-sm font-black text-[#00f090] font-mono mt-0.5 block">{userBalance.toFixed(4)} G</span>
          </div>
        </div>

        {/* 3 Metrics Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center relative z-10">
          <div className="bg-white/5 rounded-2xl p-2 backdrop-blur-md border border-white/10">
            <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Active Miners</div>
            <div className="text-xs font-black text-white font-mono mt-0.5">{activePlans.length} Running</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-2 backdrop-blur-md border border-white/10">
            <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Contract Cycle</div>
            <div className="text-xs font-black text-[#00f090] mt-0.5">Exact 24H</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-2 backdrop-blur-md border border-white/10">
            <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Total Claimed</div>
            <div className="text-xs font-black text-white font-mono mt-0.5">
              +{plansOverview?.total_earned_gram ? plansOverview.total_earned_gram.toFixed(2) : '0.00'} G
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 24H Live Profit Calculator */}
      <div className="mine-card p-4 mb-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            PROFIT ESTIMATOR
          </span>
          <span className="text-[9px] font-extrabold text-[#7c3aed] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            AUTO-COMPOUNDING
          </span>
        </div>

        {/* Quick selector pills */}
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {availablePlans.map((p) => (
            <button
              key={p.id}
              onClick={() => setCalcSelectedId(p.id)}
              className={`py-2 rounded-xl text-[10px] font-extrabold transition-all flex flex-col items-center justify-center ${
                calcSelectedId === p.id
                  ? 'bg-gradient-to-r from-[#0052d4] to-[#00c6ff] text-white font-black shadow-md scale-105'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-900'
              }`}
            >
              <span className="text-xs">{p.icon}</span>
              <span className="text-[9px] font-mono mt-0.5">{p.cost_gram}T</span>
            </button>
          ))}
        </div>

        {/* Dynamic Outcome Display */}
        <div className="bg-[#f8fafc] rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[9px] text-slate-400 font-bold uppercase">You Deposit</div>
            <div className="text-sm font-black text-slate-900 font-mono">{activeCalcPlan.cost_gram.toFixed(2)} TON</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Multiplier</div>
            <div className="text-xs font-black text-[#059669]">+{activeCalcPlan.profit_percent.toFixed(1)}% ROI</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Next Day Payout</div>
            <div className="text-sm font-black text-[#0088ff] font-mono">{activeCalcPlan.return_gram.toFixed(2)} GRAM</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 mb-3.5 shadow-sm">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'store'
              ? 'bg-[#0088ff] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>MINERS STORE ({availablePlans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'active'
              ? 'bg-[#0088ff] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>ACTIVE ({activePlans.length})</span>
          {activePlans.some((p) => p.is_ready_to_claim) && (
            <span className="w-2 h-2 rounded-full bg-[#00d68f] animate-ping absolute top-2 right-2" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#0088ff] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>HISTORY</span>
        </button>
      </div>

      {/* Tab 1: Available Plans Store */}
      {activeTab === 'store' && (
        <div className="space-y-4 relative z-10">
          {availablePlans.map((plan, index) => {
            const isStarter = plan.id === 'starter'
            const isDouble = plan.id === 'matrix'
            const isMythic = plan.id === 'apex'
            const isLegendary = plan.id === 'titan'
            const isEpic = plan.id === 'queen'

            // Dynamic card tint & glow
            const cardTintClass = isDouble
              ? 'card-tint-red border-pink-300'
              : isMythic
              ? 'card-tint-amber border-amber-300'
              : isLegendary
              ? 'card-tint-emerald border-emerald-300'
              : isEpic
              ? 'card-tint-purple border-purple-300'
              : 'card-tint-blue border-blue-300'

            const buttonClass = isDouble
              ? 'btn-primary-red'
              : isMythic
              ? 'btn-primary-amber'
              : isLegendary
              ? 'btn-primary-emerald'
              : isEpic
              ? 'btn-primary-purple'
              : 'btn-primary-blue'

            const glowClass = isDouble
              ? 'glow-ring-pink'
              : isMythic
              ? 'glow-ring-gold'
              : isLegendary
              ? 'glow-ring-emerald'
              : isEpic
              ? 'glow-ring-purple'
              : isStarter
              ? 'glow-ring-violet'
              : 'glow-ring-blue'

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 + index * 0.04 }}
                className={`${cardTintClass} p-4.5 relative shadow-lg rounded-3xl overflow-hidden`}
              >
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase shadow-sm ${
                      isDouble
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : isMythic
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : isLegendary
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : isEpic
                        ? 'bg-purple-100 text-purple-950 border border-purple-300'
                        : 'bg-blue-100 text-blue-950 border border-blue-300'
                    }`}
                  >
                    {plan.badge}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-mono shadow-sm">
                    +{plan.profit_percent.toFixed(1)}% NET 24H ROI
                  </span>
                </div>

                {/* Plan Info with Large 3D Preview Frame */}
                <div className="flex items-center gap-3.5 mb-3.5 bg-white/80 p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                  {/* Large 3D NFT Frame */}
                  <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shrink-0 shadow-md ${glowClass} bg-slate-900 flex items-center justify-center relative group`}>
                    {(plan as any).image ? (
                      <img
                        src={(plan as any).image}
                        alt={plan.name}
                        className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-3xl">
                        <span>{plan.icon}</span>
                        <span className="text-[8px] font-black text-white/80 uppercase font-mono mt-0.5">3D NFT</span>
                      </div>
                    )}
                    
                    {/* Corner Tag */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-black text-white font-mono">
                      {plan.cost_gram}T
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight truncate">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 font-semibold leading-tight mt-1">
                      Pay <span className="text-slate-950 font-black">{plan.cost_gram.toFixed(2)} TON</span> ➔ Receive{' '}
                      <span className="text-[#0088ff] font-black underline decoration-blue-300">
                        {plan.return_gram.toFixed(2)} GRAM
                      </span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                        Exact 24H Maturity
                      </span>
                    </div>
                  </div>
                </div>

                {/* Return Grid Breakdown */}
                <div className="grid grid-cols-3 gap-1.5 bg-white/95 rounded-2xl p-2.5 border border-slate-200/90 mb-3.5 text-center shadow-sm">
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-black">You Pay</div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-0.5">{plan.cost_gram.toFixed(2)} TON</div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-[8px] text-slate-400 uppercase font-black">24H Return</div>
                    <div className="text-xs sm:text-sm font-black text-[#0088ff] font-mono mt-0.5">
                      {plan.return_gram.toFixed(2)} G
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-black">Net Profit</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-600 font-mono mt-0.5">+{plan.profit_gram.toFixed(2)} G</div>
                  </div>
                </div>

                {/* Action Button */}
                {isStarter && plansOverview?.can_buy_starter === false ? (
                  <div className="w-full py-3 rounded-2xl bg-slate-200 text-slate-600 font-black text-xs text-center uppercase tracking-wider">
                    ✓ 1-TIME TRIAL COMPLETED
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(plan)}
                    className={`w-full py-3.5 rounded-2xl ${buttonClass} text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}
                  >
                    <span>⚡ ACTIVATE MINER ({plan.cost_gram.toFixed(2)} TON)</span>
                    <span>➔</span>
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Tab 2: Active Contracts */}
      {activeTab === 'active' && (
        <div className="space-y-3 relative z-10">
          {activePlans.length === 0 ? (
            <div className="mine-card p-8 text-center">
              <span className="text-3xl mb-2 block">⏳</span>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Active Miners Running</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Activate any 24-hour mining contract to start earning guaranteed daily returns.
              </p>
              <button
                onClick={() => setActiveTab('store')}
                className="px-6 py-2.5 btn-primary-blue text-xs font-black rounded-xl shadow-md"
              >
                VIEW AVAILABLE MINERS
              </button>
            </div>
          ) : (
            activePlans.map((p) => (
              <div key={p.id} className="mine-card p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h4 className="text-xs font-black text-[#0f172a] uppercase">{p.plan_name}</h4>
                      <p className="text-[10px] text-slate-400">
                        Started: {new Date(p.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                      p.is_ready_to_claim
                        ? 'bg-[#d1fae5] text-[#059669] animate-pulse'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.is_ready_to_claim ? '✓ READY TO CLAIM' : '⏳ MINING'}
                  </span>
                </div>

                {/* Progress Bar & Countdown */}
                <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-200 mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1.5 font-bold">
                    <span className="text-slate-500">24H Maturation Clock</span>
                    <span className={p.is_ready_to_claim ? 'text-[#059669] font-black' : 'text-[#0088ff] font-mono font-black'}>
                      {p.is_ready_to_claim ? '00:00:00 (COMPLETE)' : formatCountdown(p.seconds_remaining)}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00d68f] to-[#0088ff] transition-all duration-300"
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Return Summary */}
                <div className="flex items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 border border-slate-200 mb-3">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold">Deposit</span>
                    <span className="text-xs font-black text-slate-900 font-mono">{p.cost_gram.toFixed(2)} TON</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#059669] block font-semibold">Guaranteed Payout</span>
                    <span className="text-xs font-black text-[#0088ff] font-mono">+{p.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                {p.is_ready_to_claim ? (
                  <button
                    onClick={() => handleClaimPlan(p.id)}
                    disabled={actionLoading === p.id}
                    className="w-full py-3 rounded-xl claim-bar-btn font-black text-xs tracking-wider uppercase shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === p.id ? 'CLAIMING...' : `⚡ CLAIM +${p.return_gram.toFixed(2)} GRAM NOW`}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs text-center">
                    ⏳ Returns unlock automatically at 24h timer end
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Contract History */}
      {activeTab === 'history' && (
        <div className="space-y-3 relative z-10">
          {completedPlans.length === 0 ? (
            <div className="mine-card p-8 text-center">
              <span className="text-3xl mb-2 block">📜</span>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No History Yet</h3>
              <p className="text-xs text-slate-500">Claimed 24-hour yield contracts will appear here.</p>
            </div>
          ) : (
            completedPlans.map((p) => (
              <div key={p.id} className="mine-card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#0f172a] uppercase">{p.plan_name}</h4>
                    <p className="text-[10px] text-slate-400">
                      Claimed: {p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : 'Completed'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#059669] block font-mono">+{p.return_gram.toFixed(2)} GRAM</span>
                  <span className="text-[9px] text-slate-400">Paid {p.cost_gram.toFixed(2)} TON</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Direct Payment / Activation Modal */}
      <AnimatePresence>
        {showPayModal && selectedPlan && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md mine-card p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto bg-white"
            >
              <button
                onClick={() => setShowPayModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4 pr-8">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl shrink-0">
                  {selectedPlan.icon}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{selectedPlan.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    Deposit <span className="text-slate-900 font-bold">{selectedPlan.cost_gram.toFixed(2)} TON</span> ➔
                    Receive <span className="text-[#0088ff] font-bold">{selectedPlan.return_gram.toFixed(2)} GRAM</span> in 24h
                  </p>
                </div>
              </div>

              {/* 1-Click Tonkeeper Button */}
              <button
                onClick={() => handle1ClickTonkeeper(selectedPlan)}
                className="w-full py-3.5 rounded-xl btn-primary-blue text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 mb-3"
              >
                <span>💎 1-CLICK TONKEEPER PAY ({selectedPlan.cost_gram.toFixed(2)} TON)</span>
              </button>

              {/* Manual Transfer Option */}
              <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-slate-200 space-y-3 mb-4">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Manual Transfer Details</span>
                  <span className="text-[9px] text-[#0088ff] font-bold">MEMO REQUIRED</span>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">Send Exact Amount</label>
                  <div className="text-xs font-black text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                    <span>{selectedPlan.cost_gram.toFixed(2)} TON</span>
                    <span className="text-[9px] text-[#059669] font-bold">24H RETURN: {selectedPlan.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-1">Deposit Wallet Address</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={DEPOSIT_WALLET}
                      className="flex-1 bg-white text-[10px] text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 outline-none truncate select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(DEPOSIT_WALLET)
                        setCopiedAddress(true)
                        setTimeout(() => setCopiedAddress(false), 2000)
                        toast.success('Address copied!')
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl border border-slate-200"
                    >
                      {copiedAddress ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#7c3aed] uppercase block mb-1 font-bold">
                    Comment / Memo (CRITICAL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={getPlanMemo(selectedPlan.id)}
                      className="flex-1 bg-white text-[11px] text-[#7c3aed] font-mono font-bold px-3 py-2 rounded-xl border border-purple-200 outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPlanMemo(selectedPlan.id))
                        setCopiedMemo(true)
                        setTimeout(() => setCopiedMemo(false), 2000)
                        toast.success('Memo copied!')
                      }}
                      className="px-3 py-2 bg-purple-100 text-[#7c3aed] text-xs font-bold rounded-xl"
                    >
                      {copiedMemo ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">
                    ⚠️ You MUST paste this memo in your wallet so your miner activates immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifyPayment}
                disabled={checkingPayment}
                className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {checkingPayment ? (
                  <span>VERIFYING TON BLOCKCHAIN...</span>
                ) : (
                  <span>✓ I HAVE SENT PAYMENT — VERIFY NOW</span>
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
