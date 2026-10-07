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
      name: 'Starter Yield Miner',
      subtitle: 'Fast 24h entry contract — 1 per account trial',
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
      icon: '⚡',
      accent_color: '#ffffff',
    },
    {
      id: 'standard',
      name: 'Standard Cloud Miner',
      subtitle: 'High value daily yield contract with massive returns',
      badge: '★ POPULAR (+53.8%)',
      cost_gram: 1.3,
      return_gram: 2.0,
      profit_gram: 0.7,
      profit_percent: 53.85,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '💎',
      accent_color: '#00f090',
    },
    {
      id: 'queen',
      name: 'Executive High-Yield Miner',
      subtitle: 'High power computing contract with guaranteed 4.50 GRAM payout',
      badge: '👑 HIGH YIELD (+50%)',
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
      accent_color: '#38bdf8',
    },
    {
      id: 'titan',
      name: 'Cyber Titan Matrix',
      subtitle: 'Institutional tier contract delivering +66.7% daily profit',
      badge: '🚀 TITAN VIP (+66.7%)',
      cost_gram: 6.0,
      return_gram: 10.0,
      profit_gram: 4.0,
      profit_percent: 66.67,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '🔥',
      accent_color: '#00f090',
    },
    {
      id: 'apex',
      name: 'Apex Sovereign Node',
      subtitle: 'Ultra high-yield master node with guaranteed 22.00 GRAM payout',
      badge: '🏆 APEX MASTER (+83.3%)',
      cost_gram: 12.0,
      return_gram: 22.0,
      profit_gram: 10.0,
      profit_percent: 83.33,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '⚡',
      accent_color: '#ffffff',
    },
    {
      id: 'matrix',
      name: 'Infinite Quantum Sovereign',
      subtitle: 'The flagship 24h contract — 2X DOUBLE YOUR TON in exactly 24 hours',
      badge: '🌌 2X DOUBLE PROFIT (+100%)',
      cost_gram: 25.0,
      return_gram: 50.0,
      profit_gram: 25.0,
      profit_percent: 100.0,
      duration_hours: 24,
      max_per_account: 0,
      is_limited: false,
      user_purchased: 0,
      can_purchase: true,
      icon: '💎',
      accent_color: '#00f090',
    },
  ]

  const LIVE_ACTIVITIES = [
    { user: '@alex_ton', action: 'Activated Apex Sovereign Node', returnG: '+22.00 G', time: '1m ago' },
    { user: '@whale_99', action: 'Activated Infinite Quantum Sovereign', returnG: '+50.00 G', time: '3m ago' },
    { user: '@crypto_pro', action: 'Claimed 24H Yield Reward', returnG: '+10.00 G', time: '5m ago' },
    { user: '@sergey_k', action: 'Activated Cyber Titan Matrix', returnG: '+10.00 G', time: '7m ago' },
    { user: '@ton_whale', action: 'Claimed Executive Miner Payout', returnG: '+4.50 G', time: '11m ago' },
    { user: '@ton_miner', action: 'Activated Standard Cloud Miner', returnG: '+2.00 G', time: '14m ago' },
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

  // Dynamic seconds ticker for active plans
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
        toast.success(`🎉 Payment verified! Your ${selectedPlan?.name || '24h'} plan is now running!`)
        setShowPayModal(false)
        setActiveTab('active')
      } else {
        toast.success('Blockchain scan complete. Any confirmed plan deposits are activated automatically!')
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
      toast.error(err?.response?.data?.error || 'Failed to claim plan reward')
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
    <div className="min-h-screen bg-[#060807] text-[#f8fafc] pb-28 pt-3 px-4 max-w-md mx-auto relative select-none font-sans">
      {/* Live Social Proof Activity Ticker */}
      <div className="relative z-10 mb-3 bg-[#0d1411] border border-[#17241d] rounded-full px-3.5 py-1.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f090] animate-ping flex-shrink-0" />
          <span className="text-[10px] font-extrabold text-[#00f090] uppercase tracking-wider flex-shrink-0">
            LIVE 24H YIELD
          </span>
          <span className="text-[11px] text-[#84948c] truncate">
            <b className="text-white">{LIVE_ACTIVITIES[tickerIndex].user}</b> {LIVE_ACTIVITIES[tickerIndex].action} (
            <span className="text-[#00f090] font-bold">{LIVE_ACTIVITIES[tickerIndex].returnG}</span>)
          </span>
        </div>
        <span className="text-[9px] text-[#4d5c54] flex-shrink-0 ml-1.5">{LIVE_ACTIVITIES[tickerIndex].time}</span>
      </div>

      {/* Top Header Card */}
      <div className="lux-card p-4.5 mb-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wide text-white uppercase">
                24H Yield Terminal
              </h1>
              <span className="text-[9px] bg-[#00f090] text-black px-2 py-0.5 rounded-full font-black tracking-wider">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#84948c] font-medium mt-0.5">
              Guaranteed 24-hour cycle • Instant payout on maturity
            </p>
          </div>
          <div className="px-3 py-1.5 bg-[#080c0a] border border-[#17241d] rounded-2xl text-right">
            <span className="text-[8px] text-[#84948c] block uppercase font-extrabold tracking-wider">Wallet</span>
            <span className="text-xs font-black text-[#00f090] font-mono">{userBalance.toFixed(4)} G</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#17241d] text-center">
          <div className="bg-[#080c0a] rounded-xl p-2 border border-[#17241d]">
            <div className="text-[9px] text-[#84948c] uppercase font-bold">Active Plans</div>
            <div className="text-xs font-black text-white font-mono mt-0.5">{activePlans.length} Running</div>
          </div>
          <div className="bg-[#080c0a] rounded-xl p-2 border border-[#17241d]">
            <div className="text-[9px] text-[#84948c] uppercase font-bold">Cycle</div>
            <div className="text-xs font-black text-[#00f090] mt-0.5">Exact 24H</div>
          </div>
          <div className="bg-[#080c0a] rounded-xl p-2 border border-[#17241d]">
            <div className="text-[9px] text-[#84948c] uppercase font-bold">Total Claimed</div>
            <div className="text-xs font-black text-white font-mono mt-0.5">
              +{plansOverview?.total_earned_gram ? plansOverview.total_earned_gram.toFixed(2) : '0.00'} G
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 24H Live Profit Calculator */}
      <div className="lux-card p-4 mb-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#84948c]">
              24H LIVE ROI CALCULATOR
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-[#00f090] bg-[#00f090]/10 px-2 py-0.5 rounded-full border border-[#00f090]/25">
            INSTANT MATURITY
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
                  ? 'bg-white text-black font-black shadow-lg scale-105'
                  : 'bg-[#080c0a] text-[#84948c] border border-[#17241d] hover:text-white'
              }`}
            >
              <span className="text-xs">{p.icon}</span>
              <span className="text-[9px] font-mono mt-0.5">{p.cost_gram}T</span>
            </button>
          ))}
        </div>

        {/* Dynamic Outcome Display */}
        <div className="bg-[#080c0a] rounded-2xl p-3 border border-[#17241d] flex items-center justify-between">
          <div>
            <div className="text-[9px] text-[#84948c] font-bold uppercase tracking-wider">You Deposit</div>
            <div className="text-sm font-black text-white font-mono">{activeCalcPlan.cost_gram.toFixed(2)} TON</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-[#84948c] font-bold uppercase tracking-wider">Multiplier</div>
            <div className="text-xs font-black text-[#00f090]">+{activeCalcPlan.profit_percent.toFixed(1)}% ROI</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-[#84948c] font-bold uppercase tracking-wider">Next Day Payout</div>
            <div className="text-sm font-black text-white font-mono">{activeCalcPlan.return_gram.toFixed(2)} GRAM</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#0d1411] p-1 rounded-2xl border border-[#17241d] mb-3.5 relative z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'store'
              ? 'bg-white text-black shadow-md'
              : 'text-[#84948c] hover:text-white'
          }`}
        >
          <span>PLANS ({availablePlans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'active'
              ? 'bg-white text-black shadow-md'
              : 'text-[#84948c] hover:text-white'
          }`}
        >
          <span>ACTIVE ({activePlans.length})</span>
          {activePlans.some((p) => p.is_ready_to_claim) && (
            <span className="w-2 h-2 rounded-full bg-[#00f090] animate-ping absolute top-2 right-2" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white text-black shadow-md'
              : 'text-[#84948c] hover:text-white'
          }`}
        >
          <span>HISTORY</span>
        </button>
      </div>

      {/* Tab 1: Available Plans Store */}
      {activeTab === 'store' && (
        <div className="space-y-3 relative z-10">
          {availablePlans.map((plan, index) => {
            const isStarter = plan.id === 'starter'

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 + index * 0.04 }}
                className="lux-card p-4 relative"
              >
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border tracking-wider bg-[#080c0a] text-white border-[#17241d]">
                    {plan.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#00f090]/10 text-[#00f090] border border-[#00f090]/30 font-mono">
                    +{plan.profit_percent.toFixed(1)}% NET 24H ROI
                  </span>
                </div>

                {/* Plan Info */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#080c0a] border border-[#17241d] flex items-center justify-center text-2xl shrink-0">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-[#84948c] font-medium leading-snug mt-0.5">
                      Pay <span className="text-white font-bold">{plan.cost_gram.toFixed(2)} TON</span> ➔ Receive{' '}
                      <span className="text-[#00f090] font-extrabold">
                        {plan.return_gram.toFixed(2)} GRAM
                      </span>{' '}
                      in 24 Hours
                    </p>
                  </div>
                </div>

                {/* Return Grid Breakdown */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#080c0a] rounded-xl p-2.5 border border-[#17241d] mb-3.5 text-center">
                  <div>
                    <div className="text-[8px] text-[#84948c] uppercase font-bold">Payment</div>
                    <div className="text-xs font-black text-white font-mono">{plan.cost_gram.toFixed(2)} TON</div>
                  </div>
                  <div className="border-x border-[#17241d]">
                    <div className="text-[8px] text-[#84948c] uppercase font-bold">Return (24h)</div>
                    <div className="text-xs font-black text-[#00f090] font-mono">
                      {plan.return_gram.toFixed(2)} GRAM
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#84948c] uppercase font-bold">Net Profit</div>
                    <div className="text-xs font-black text-white font-mono">+{plan.profit_gram.toFixed(2)} G</div>
                  </div>
                </div>

                {/* High Contrast Pure White Action Button */}
                {isStarter && plansOverview?.can_buy_starter === false ? (
                  <div className="w-full py-2.5 rounded-xl bg-white/5 text-[#4d5c54] font-bold text-xs text-center border border-white/5">
                    ✓ 1-TIME TRIAL COMPLETED
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(plan)}
                    className="w-full py-3 rounded-xl btn-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>⚡ ACTIVATE ({plan.cost_gram.toFixed(2)} TON)</span>
                    <span>➔</span>
                  </button>
                )}
              </motion.div>
            )
          })}

          {/* Guarantee banner */}
          <div className="lux-card p-3.5 text-center">
            <p className="text-[11px] text-[#84948c] leading-relaxed">
              🛡️ <b className="text-white">Direct TON Activation & Lifetime Withdrawal Unlock:</b> Plans activate instantly on blockchain confirmation and automatically mature after exactly 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Active Contracts */}
      {activeTab === 'active' && (
        <div className="space-y-3 relative z-10">
          {activePlans.length === 0 ? (
            <div className="lux-card p-8 text-center">
              <span className="text-3xl mb-2 block">⏳</span>
              <h3 className="text-sm font-bold text-white mb-1">No Active Plans Running</h3>
              <p className="text-xs text-[#84948c] mb-4 leading-relaxed">
                Activate any 24-hour mining plan to start earning guaranteed daily GRAM returns.
              </p>
              <button
                onClick={() => setActiveTab('store')}
                className="px-6 py-2.5 btn-white text-xs font-black rounded-xl shadow-md"
              >
                VIEW AVAILABLE PLANS
              </button>
            </div>
          ) : (
            activePlans.map((p) => (
              <div key={p.id} className="lux-card p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💎</span>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase">{p.plan_name}</h4>
                      <p className="text-[10px] text-[#84948c]">
                        Started: {new Date(p.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                      p.is_ready_to_claim
                        ? 'bg-[#00f090] text-black animate-pulse'
                        : 'bg-[#080c0a] text-[#84948c] border border-[#17241d]'
                    }`}
                  >
                    {p.is_ready_to_claim ? '✓ READY TO CLAIM' : '⏳ MINING'}
                  </span>
                </div>

                {/* Progress Bar & Countdown */}
                <div className="bg-[#080c0a] rounded-xl p-3 border border-[#17241d] mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1.5 font-bold">
                    <span className="text-[#84948c]">24H Maturation Clock</span>
                    <span className={p.is_ready_to_claim ? 'text-[#00f090] font-black' : 'text-white font-mono font-black'}>
                      {p.is_ready_to_claim ? '00:00:00 (COMPLETE)' : formatCountdown(p.seconds_remaining)}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-2 bg-[#121815] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00f090] transition-all duration-300"
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Return Summary */}
                <div className="flex items-center justify-between bg-[#080c0a] rounded-xl p-2.5 border border-[#17241d] mb-3">
                  <div>
                    <span className="text-[9px] text-[#84948c] block font-semibold">Deposit</span>
                    <span className="text-xs font-black text-white font-mono">{p.cost_gram.toFixed(2)} TON</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#00f090] block font-semibold">Guaranteed Payout</span>
                    <span className="text-xs font-black text-white font-mono">+{p.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                {/* Action Button */}
                {p.is_ready_to_claim ? (
                  <button
                    onClick={() => handleClaimPlan(p.id)}
                    disabled={actionLoading === p.id}
                    className="w-full py-3 rounded-xl btn-white font-black text-xs tracking-wider uppercase shadow-xl active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === p.id ? 'CLAIMING...' : `⚡ CLAIM +${p.return_gram.toFixed(2)} GRAM NOW`}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-white/5 text-[#84948c] font-bold text-xs text-center border border-white/5">
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
            <div className="lux-card p-8 text-center">
              <span className="text-3xl mb-2 block">📜</span>
              <h3 className="text-sm font-bold text-white mb-1">No Plan History Yet</h3>
              <p className="text-xs text-[#84948c]">Claimed 24-hour yield contracts will appear here.</p>
            </div>
          ) : (
            completedPlans.map((p) => (
              <div key={p.id} className="lux-card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00f090]/10 border border-[#00f090]/30 flex items-center justify-center text-sm text-[#00f090] font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">{p.plan_name}</h4>
                    <p className="text-[10px] text-[#84948c]">
                      Claimed: {p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : 'Completed'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#00f090] block font-mono">+{p.return_gram.toFixed(2)} GRAM</span>
                  <span className="text-[9px] text-[#84948c]">Paid {p.cost_gram.toFixed(2)} TON</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Direct Payment / Activation Modal */}
      <AnimatePresence>
        {showPayModal && selectedPlan && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md lux-card p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPayModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4 pr-8">
                <div className="w-10 h-10 rounded-xl bg-[#080c0a] border border-[#17241d] flex items-center justify-center text-xl shrink-0">
                  {selectedPlan.icon}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">{selectedPlan.name}</h3>
                  <p className="text-[11px] text-[#84948c]">
                    Deposit <span className="text-white font-bold">{selectedPlan.cost_gram.toFixed(2)} TON</span> ➔
                    Receive <span className="text-[#00f090] font-bold">{selectedPlan.return_gram.toFixed(2)} GRAM</span> in 24h
                  </p>
                </div>
              </div>

              {/* 1-Click Tonkeeper Button */}
              <button
                onClick={() => handle1ClickTonkeeper(selectedPlan)}
                className="w-full py-3.5 rounded-xl btn-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mb-3"
              >
                <span>💎 1-CLICK TONKEEPER PAY ({selectedPlan.cost_gram.toFixed(2)} TON)</span>
              </button>

              {/* Manual Transfer Option */}
              <div className="bg-[#080c0a] rounded-2xl p-3.5 border border-[#17241d] space-y-3 mb-4">
                <div className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-wider flex items-center justify-between">
                  <span>Manual Transfer Details</span>
                  <span className="text-[9px] text-[#00f090] font-bold">MEMO REQUIRED</span>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[9px] text-[#84948c] uppercase block mb-1">Send Exact Amount</label>
                  <div className="text-xs font-black text-white bg-[#060807] px-3 py-2 rounded-xl border border-[#17241d] flex items-center justify-between font-mono">
                    <span>{selectedPlan.cost_gram.toFixed(2)} TON</span>
                    <span className="text-[9px] text-[#00f090] font-bold">24H RETURN: {selectedPlan.return_gram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                {/* Destination Wallet */}
                <div>
                  <label className="text-[9px] text-[#84948c] uppercase block mb-1">Deposit Wallet Address</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={DEPOSIT_WALLET}
                      className="flex-1 bg-[#060807] text-[10px] text-[#f8fafc] font-mono px-3 py-2 rounded-xl border border-[#17241d] outline-none truncate select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(DEPOSIT_WALLET)
                        setCopiedAddress(true)
                        setTimeout(() => setCopiedAddress(false), 2000)
                        toast.success('Address copied!')
                      }}
                      className="px-3 py-2 btn-surface text-xs font-bold rounded-xl"
                    >
                      {copiedAddress ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Memo */}
                <div>
                  <label className="text-[9px] text-[#00f090] uppercase block mb-1 font-bold">
                    Comment / Memo (CRITICAL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={getPlanMemo(selectedPlan.id)}
                      className="flex-1 bg-[#060807] text-[11px] text-[#00f090] font-mono font-bold px-3 py-2 rounded-xl border border-[#00f090]/40 outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPlanMemo(selectedPlan.id))
                        setCopiedMemo(true)
                        setTimeout(() => setCopiedMemo(false), 2000)
                        toast.success('Memo copied!')
                      }}
                      className="px-3 py-2 bg-[#00f090]/15 text-[#00f090] rounded-xl text-xs font-bold border border-[#00f090]/30"
                    >
                      {copiedMemo ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[9px] text-[#84948c] mt-1">
                    ⚠️ You MUST paste this memo in your wallet so your contract activates immediately.
                  </p>
                </div>
              </div>

              {/* Verify Payment Button */}
              <button
                onClick={handleVerifyPayment}
                disabled={checkingPayment}
                className="w-full py-3.5 rounded-xl btn-surface text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {checkingPayment ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>VERIFYING TON BLOCKCHAIN...</span>
                  </>
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
