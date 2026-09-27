import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { openCrate, OpenCrateResult, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import ReactConfetti from 'react-confetti'
import { useNavigate } from 'react-router-dom'

interface RewardTierItem {
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'JACKPOT'
  rarityLabel: string
  rarityBadgeColor: string
  title: string
  subtitle: string
  rewardValue: string
  icon: string
  textColor: string
  cardBg: string
  border: string
  isTopReward?: boolean
}

interface CrateTierInfo {
  id: 'bronze' | 'silver' | 'gold'
  name: string
  subtitle: string
  badge: string
  badgeBg: string
  priceGram: number
  priceUsdt: number
  icon: string
  accentColor: string
  glowColor: string
  borderColor: string
  cardBg: string
  chestImage: string
  jackpotBanner: string
  rewards: RewardTierItem[]
}

const CRATE_TIERS: CrateTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronze Worker Crate',
    subtitle: 'Great starter box with instant USDT & GHS drops',
    badge: '🥉 ENTRY TIER',
    badgeBg: 'bg-amber-800/40 text-amber-300 border-amber-600/50',
    priceGram: 0.5,
    priceUsdt: 0.5,
    icon: '📦',
    accentColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    borderColor: 'border-amber-600/40',
    cardBg: 'from-[#23170e] via-[#19110a] to-[#0f0b07]',
    chestImage: '📦',
    jackpotBanner: '🔥 JACKPOT: +1.00 USDT + 0.50 GRAM + 100 GHS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+40 GHS Hashrate',
        subtitle: 'Permanent Cloud Mining Power',
        rewardValue: '40 GHS',
        icon: '⚡',
        textColor: 'text-stone-200',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'UNCOMMON',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        title: '+0.25 USDT + 20 GHS',
        subtitle: 'Instant Cash + Mining Power',
        rewardValue: '$0.25 + 20 GHS',
        icon: '💵',
        textColor: 'text-emerald-400',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'RARE',
        rarityBadgeColor: 'bg-blue-950/80 text-blue-300 border-blue-400/40',
        title: '+0.35 GRAM + 30 GHS',
        subtitle: 'Direct GRAM Token Drop',
        rewardValue: '0.35 G + 30 GHS',
        icon: '💎',
        textColor: 'text-blue-400',
        cardBg: 'bg-blue-950/20',
        border: 'border-blue-500/20',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 TOP REWARD',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border-amber-300 font-black shadow-md shadow-amber-500/30',
        title: '+1.00 USDT + 0.50 GRAM + 100 GHS',
        subtitle: 'Triple Jackpot MEGA Drop!',
        rewardValue: '🔥 TOP PRIZE',
        icon: '👑',
        textColor: 'text-amber-300 font-black',
        cardBg: 'bg-gradient-to-r from-[#3a2608] via-[#2d1e06] to-[#1e1404]',
        border: 'border-2 border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
        isTopReward: true,
      },
    ],
  },
  {
    id: 'silver',
    name: 'Silver Soldier Crate',
    subtitle: 'High multiplier crate with massive GHS & USDT',
    badge: '🥈 MOST POPULAR',
    badgeBg: 'bg-slate-700/50 text-slate-200 border-slate-400/50',
    priceGram: 1.5,
    priceUsdt: 1.5,
    icon: '🥈',
    accentColor: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    borderColor: 'border-slate-400/40',
    cardBg: 'from-[#17232e] via-[#101922] to-[#0a0f15]',
    chestImage: '🥈',
    jackpotBanner: '🔥 JACKPOT: +3.50 USDT + 1.50 GRAM + 350 GHS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+120 GHS Hashrate',
        subtitle: 'Boost Daily Passive Mining',
        rewardValue: '120 GHS',
        icon: '⚡',
        textColor: 'text-stone-200',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'UNCOMMON',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        title: '+0.80 USDT + 60 GHS',
        subtitle: 'Instant Cash + Mining Power',
        rewardValue: '$0.80 + 60 GHS',
        icon: '💵',
        textColor: 'text-emerald-400',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'RARE',
        rarityBadgeColor: 'bg-blue-950/80 text-blue-300 border-blue-400/40',
        title: '+1.20 GRAM + 100 GHS',
        subtitle: 'Direct GRAM Token Drop',
        rewardValue: '1.20 G + 100 GHS',
        icon: '💎',
        textColor: 'text-blue-400',
        cardBg: 'bg-blue-950/20',
        border: 'border-blue-500/20',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 TOP REWARD',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border-amber-300 font-black shadow-md shadow-amber-500/30',
        title: '+3.50 USDT + 1.50 GRAM + 350 GHS',
        subtitle: 'Mega Cyber Jackpot Drop!',
        rewardValue: '🔥 TOP PRIZE',
        icon: '👑',
        textColor: 'text-amber-300 font-black',
        cardBg: 'bg-gradient-to-r from-[#3a2608] via-[#2d1e06] to-[#1e1404]',
        border: 'border-2 border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
        isTopReward: true,
      },
    ],
  },
  {
    id: 'gold',
    name: 'Golden Queen Crate',
    subtitle: 'VIP High Roller box with up to 1,000 GHS jackpot',
    badge: '👑 VIP HIGH ROLLER',
    badgeBg: 'bg-amber-400/30 text-amber-300 border-amber-400/60 shadow-amber-500/20',
    priceGram: 3.0,
    priceUsdt: 3.0,
    icon: '👑',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    borderColor: 'border-amber-400/60',
    cardBg: 'from-[#2e210a] via-[#1d1506] to-[#120d04]',
    chestImage: '👑',
    jackpotBanner: '🔥 VIP JACKPOT: +8.00 USDT + 3.00 GRAM + 1,000 GHS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+260 GHS Hashrate',
        subtitle: 'Massive Permanent Hashrate',
        rewardValue: '260 GHS',
        icon: '⚡',
        textColor: 'text-stone-200',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'UNCOMMON',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        title: '+2.00 USDT + 150 GHS',
        subtitle: 'Instant Cash + Mining Power',
        rewardValue: '$2.00 + 150 GHS',
        icon: '💵',
        textColor: 'text-emerald-400',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'RARE',
        rarityBadgeColor: 'bg-blue-950/80 text-blue-300 border-blue-400/40',
        title: '+2.80 GRAM + 250 GHS',
        subtitle: 'Direct GRAM Token Drop',
        rewardValue: '2.80 G + 250 GHS',
        icon: '💎',
        textColor: 'text-blue-400',
        cardBg: 'bg-blue-950/20',
        border: 'border-blue-500/20',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 VIP TOP REWARD',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 border-amber-300 font-black shadow-lg shadow-amber-500/40 animate-pulse',
        title: '+8.00 USDT + 3.00 GRAM + 1,000 GHS',
        subtitle: 'Golden Queen Ultimate Jackpot!',
        rewardValue: '👑 ULTIMATE PRIZE',
        icon: '👑',
        textColor: 'text-amber-300 font-black',
        cardBg: 'bg-gradient-to-r from-[#442c08] via-[#332105] to-[#201503]',
        border: 'border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
        isTopReward: true,
      },
    ],
  },
]

const LIVE_WINS = [
  '🔥 @Alex9... unboxed +8.00 USDT + 1,000 GHS VIP Jackpot from Gold Crate!',
  '⚡ @Dmitry... unlocked +260 GHS Hashrate from Gold Crate!',
  '💎 @Elena_K... won +1.20 GRAM + 100 GHS from Silver Crate!',
  '🚀 @CryptoBee... hit +3.50 USDT Mega Drop from Silver Crate!',
  '🎉 @Samir... won +1.00 USDT + 100 GHS from Bronze Crate!',
]

export const Crates: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'all' | 'bronze' | 'silver' | 'gold'>('all')
  const [openingTier, setOpeningTier] = useState<string | null>(null)
  const [openingState, setOpeningState] = useState<'idle' | 'shaking' | 'revealed'>('idle')
  const [wonResult, setWonResult] = useState<OpenCrateResult | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentWinIndex, setCurrentWinIndex] = useState(0)

  // TON Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [selectedDepositTier, setSelectedDepositTier] = useState<CrateTierInfo>(CRATE_TIERS[0])
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [verifyingDeposit, setVerifyingDeposit] = useState(false)

  const depositAddress = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  const userMemo = user ? `HB_${user.telegram_id}` : 'HB_MINER'

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWinIndex((prev) => (prev + 1) % LIVE_WINS.length)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
      }
    } catch {}
  }

  const triggerNotificationHaptic = (type: 'success' | 'warning' | 'error') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type)
      }
    } catch {}
  }

  const handleOpenCrate = async (tier: CrateTierInfo) => {
    const userBalance = user?.honey_balance || 0

    if (userBalance < tier.priceUsdt) {
      setSelectedDepositTier(tier)
      setShowDepositModal(true)
      return
    }

    triggerHaptic('heavy')
    setOpeningTier(tier.id)
    setOpeningState('shaking')
    setWonResult(null)

    try {
      const result = await openCrate(tier.id)

      setTimeout(() => {
        setWonResult(result)
        setOpeningState('revealed')
        setShowConfetti(true)
        triggerNotificationHaptic('success')
        refreshUser()

        setTimeout(() => setShowConfetti(false), 5000)
      }, 1600)
    } catch (err: any) {
      setOpeningState('idle')
      setOpeningTier(null)
      const errorMsg = err?.response?.data?.error || 'Failed to open crate'
      toast.error(errorMsg)
      if (errorMsg.toLowerCase().includes('insufficient')) {
        setSelectedDepositTier(tier)
        setShowDepositModal(true)
      }
    }
  }

  const handleVerifyDeposit = async () => {
    setVerifyingDeposit(true)
    toast.loading('Checking blockchain for deposit...', { id: 'crate-dep' })
    try {
      const res = await checkDeposit()
      toast.dismiss('crate-dep')
      await refreshUser()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Detected ${res.credited} deposit! Ready to unlock!`)
        setShowDepositModal(false)
      } else {
        toast.success('Blockchain scan complete! Transfers are automatically credited.')
      }
    } catch {
      toast.dismiss('crate-dep')
      toast.error('Could not detect transfer yet. TON transfers take ~5-15s.')
    } finally {
      setVerifyingDeposit(false)
    }
  }

  const filteredTiers = activeTab === 'all' ? CRATE_TIERS : CRATE_TIERS.filter((t) => t.id === activeTab)

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-[#e6f0ec] pb-32 pt-4 px-4 max-w-md mx-auto select-none">
      {showConfetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={180}
          recycle={false}
          gravity={0.3}
        />
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-3.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15201b] border border-[#23362e] text-xs font-extrabold text-stone-300 active:scale-95 transition-all shadow-sm"
        >
          <span>←</span>
          <span>Miner</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#14221c] border border-amber-500/30 flex items-center gap-1.5 text-xs font-black text-amber-300 shadow-sm shadow-amber-500/10">
            <span>🍯</span>
            <span>{(user?.honey_balance || 0).toFixed(4)} USDT</span>
          </div>
        </div>
      </div>

      {/* Hero Title & Showcase */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2 shadow-sm">
          <span>🎁</span>
          <span>100% GUARANTEED REWARD UNBOXING</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">
          Mystery Loot Crates
        </h1>
        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
          Unlock premium crates for instant <b>USDT Cash</b>, <b>GRAM</b>, and permanent <b>GHS Power</b>!
        </p>
      </div>

      {/* Live Winners Ticker */}
      <div className="mb-4 py-2 px-3 rounded-2xl bg-[#121b18] border border-[#21332c] flex items-center gap-2 overflow-hidden shadow-inner">
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          RECENT:
        </span>
        <p className="text-[11px] text-stone-300 font-semibold truncate transition-all duration-300">
          {LIVE_WINS[currentWinIndex]}
        </p>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#121c18] border border-[#22332c] rounded-2xl mb-4">
        {[
          { id: 'all', label: 'All Crates' },
          { id: 'bronze', label: '🥉 0.5 G' },
          { id: 'silver', label: '🥈 1.5 G' },
          { id: 'gold', label: '👑 3.0 G' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('light')
              setActiveTab(tab.id as any)
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Crates Cards List */}
      <div className="space-y-6">
        {filteredTiers.map((crate) => {
          const userBalance = user?.honey_balance || 0
          const userHasBalance = userBalance >= crate.priceUsdt

          return (
            <div
              key={crate.id}
              style={{ boxShadow: `0 10px 35px -5px ${crate.glowColor}` }}
              className={`rounded-3xl border-2 ${crate.borderColor} bg-gradient-to-b ${crate.cardBg} p-5 relative overflow-hidden transition-all duration-200`}
            >
              {/* Decorative background glow */}
              <div
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40"
                style={{ backgroundColor: crate.accentColor }}
              />

              {/* Top Row: Badge & Price */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${crate.badgeBg}`}>
                  {crate.badge}
                </span>

                <div className="flex items-baseline gap-1.5 bg-[#0e1613]/90 px-3 py-1 rounded-xl border border-white/10">
                  <span className="text-base font-black text-amber-300 font-mono">
                    {crate.priceGram} GRAM
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">
                    (≈ ${crate.priceUsdt.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* 3D Crate Display Showcase */}
              <div className="my-3 py-4 text-center relative z-10">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-b from-[#182620] to-[#0c1411] border-2 border-white/15 shadow-2xl relative group">
                  {/* Outer pulse aura */}
                  <div
                    className="absolute inset-0 rounded-3xl blur-md opacity-30 animate-pulse"
                    style={{ backgroundColor: crate.accentColor }}
                  />
                  <span className="text-6xl filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] transform transition-transform group-hover:scale-110">
                    {crate.chestImage}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide mt-3">
                  {crate.name}
                </h3>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto mt-0.5">
                  {crate.subtitle}
                </p>
              </div>

              {/* Jackpot Callout Banner */}
              <div className="mb-4 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-500/50 flex items-center justify-center text-center text-xs font-black text-amber-300 shadow-sm">
                <span>{crate.jackpotBanner}</span>
              </div>

              {/* REWARDS SHOWCASE SECTION (Top reward highlighted, no percentages) */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <span>🎁</span> REWARD POOL & CRATE ITEMS
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Guaranteed Drop
                  </span>
                </div>

                <div className="space-y-2">
                  {crate.rewards.map((rew, idx) => {
                    if (rew.isTopReward) {
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border-2 ${rew.border} ${rew.cardBg} relative overflow-hidden transition-all duration-300`}
                        >
                          {/* Ambient background glow inside top reward card */}
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner shrink-0">
                                <span>{rew.icon}</span>
                              </div>
                              <div>
                                <div className="text-xs font-black text-amber-300 tracking-tight">
                                  {rew.title}
                                </div>
                                <div className="text-[10px] text-amber-200/70 font-semibold">
                                  {rew.subtitle}
                                </div>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider shrink-0 ${rew.rarityBadgeColor}`}>
                              {rew.rarityLabel}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border ${rew.border} ${rew.cardBg} flex items-center justify-between transition-all`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{rew.icon}</span>
                          <div>
                            <div className={`text-xs font-bold ${rew.textColor}`}>
                              {rew.title}
                            </div>
                            <div className="text-[10px] text-stone-400 font-medium">
                              {rew.subtitle}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${rew.rarityBadgeColor}`}>
                          {rew.rarityLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* BIG OPEN CRATE BUTTON */}
              <button
                onClick={() => handleOpenCrate(crate)}
                className={`w-full py-4 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 shadow-xl transition-all active:scale-95 cursor-pointer ${
                  userHasBalance
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 hover:brightness-110 shadow-amber-500/30'
                    : 'bg-gradient-to-r from-[#1f2f28] to-[#283e35] text-stone-200 border border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{crate.icon}</span>
                  <span>
                    {userHasBalance
                      ? `OPEN CRATE • ${crate.priceGram} GRAM`
                      : `⚡ DEPOSIT & UNLOCK • ${crate.priceGram} GRAM`}
                  </span>
                  <span>➔</span>
                </div>
                <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">
                  {userHasBalance ? 'Instant Reveal • Direct Credit' : 'Click to send TON/GRAM via Wallet'}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Dramatic Unboxing / Reveal Modal */}
      {openingState !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#121c18] border-2 border-amber-500/50 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative overflow-hidden">
            {/* Spinning radiant rays background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-2xl bg-amber-500/20 pointer-events-none" />

            {openingState === 'shaking' && (
              <div className="py-8 relative z-10">
                <div className="text-8xl animate-bounce mb-6 filter drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                  🎁
                </div>
                <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                  UNLOCKING CRATE...
                </h3>
                <p className="text-xs text-amber-300/80 font-semibold animate-pulse">
                  Decrypting lucky prize from smart contract...
                </p>
              </div>
            )}

            {openingState === 'revealed' && wonResult && (
              <div className="py-2 relative z-10">
                <span
                  style={{
                    backgroundColor: `${wonResult.reward.rarity_color}30`,
                    borderColor: wonResult.reward.rarity_color,
                    color: wonResult.reward.rarity_color,
                  }}
                  className="inline-block px-4 py-1 rounded-full border text-xs font-black uppercase tracking-widest mb-3 shadow-lg"
                >
                  {wonResult.reward.rarity_label}
                </span>

                <div className="text-7xl my-2 filter drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                  🎉
                </div>

                <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-1">
                  CONGRATULATIONS!
                </h2>
                <div className="text-xs text-stone-400 font-bold mb-4 uppercase tracking-wider">
                  You unlocked from {wonResult.tier_name}
                </div>

                {/* Reward Highlight Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-amber-400/60 text-lg font-black text-amber-300 font-mono mb-4 shadow-inner">
                  {wonResult.reward.summary_text}
                </div>

                {/* Stat Breakdown */}
                <div className="bg-[#172520] border border-[#2b4238] rounded-2xl p-4 mb-5 space-y-2 text-left text-xs">
                  <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1">
                    Instantly Added to Account:
                  </div>
                  {wonResult.reward.reward_usdt > 0 && (
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>USDT/GRAM Reward:</span>
                      <span>+{wonResult.reward.reward_usdt.toFixed(4)} USDT</span>
                    </div>
                  )}
                  {wonResult.reward.reward_ghs > 0 && (
                    <div className="flex items-center justify-between text-amber-400 font-bold">
                      <span>Mining Hashrate:</span>
                      <span>+{wonResult.reward.reward_ghs.toFixed(1)} GHS</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-stone-300 font-semibold pt-2 border-t border-white/10">
                    <span>New Total Hashrate:</span>
                    <span className="font-mono font-bold text-white">{wonResult.new_bp.toFixed(1)} GHS</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      triggerHaptic('medium')
                      setOpeningState('idle')
                      setOpeningTier(null)
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                  >
                    COLLECT & CONTINUE ➔
                  </button>

                  <button
                    onClick={() => {
                      const currentTierObj = CRATE_TIERS.find((t) => t.id === openingTier)
                      setOpeningState('idle')
                      setOpeningTier(null)
                      if (currentTierObj) {
                        handleOpenCrate(currentTierObj)
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-[#1d2d26] border border-[#2d443b] text-stone-300 font-extrabold text-xs uppercase active:scale-95 cursor-pointer"
                  >
                    OPEN ANOTHER CRATE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TON Deposit Helper Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-[#121c18] border-2 border-[#2b4238] rounded-3xl w-full max-w-sm p-5 text-stone-100 shadow-2xl relative">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 text-base font-black cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <div className="text-4xl mb-1">{selectedDepositTier.icon}</div>
              <h3 className="text-base font-black uppercase tracking-wide">
                DEPOSIT FOR {selectedDepositTier.name}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Transfer <b>{selectedDepositTier.priceGram} GRAM</b> to your address to unlock.
              </p>
            </div>

            {/* Address Box */}
            <div className="bg-[#16231e] border border-[#283d34] rounded-2xl p-3.5 mb-3 text-left">
              <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1 flex justify-between">
                <span>OFFICIAL DEPOSIT ADDRESS</span>
                <span className="text-emerald-400 font-mono">TON/GRAM</span>
              </div>
              <div className="text-xs font-mono text-stone-200 break-all bg-[#0e1613] p-2 rounded-lg border border-white/5 select-all">
                {depositAddress}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(depositAddress)
                  setCopiedAddr(true)
                  toast.success('Address copied!')
                  setTimeout(() => setCopiedAddr(false), 2000)
                }}
                className="w-full mt-2 py-2 rounded-xl bg-[#1e2f28] hover:bg-[#283e35] text-xs font-extrabold text-stone-300 uppercase tracking-wider border border-[#345043] cursor-pointer"
              >
                {copiedAddr ? '✓ ADDRESS COPIED' : '📋 COPY ADDRESS'}
              </button>
            </div>

            {/* Memo Box */}
            <div className="bg-[#16231e] border border-amber-500/30 rounded-2xl p-3.5 mb-4 text-left">
              <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                REQUIRED TRANSFER COMMENT / MEMO
              </div>
              <div className="text-sm font-mono font-black text-amber-300 bg-[#0e1613] p-2 rounded-lg border border-amber-500/20 select-all">
                {userMemo}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userMemo)
                  setCopiedMemo(true)
                  toast.success('Memo copied! Paste this in your transfer comment.')
                  setTimeout(() => setCopiedMemo(false), 2000)
                }}
                className="w-full mt-2 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-extrabold text-amber-300 uppercase tracking-wider border border-amber-500/40 cursor-pointer"
              >
                {copiedMemo ? '✓ MEMO COPIED' : '📋 COPY MEMO'}
              </button>
            </div>

            {/* Direct Wallet Launcher */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => {
                  const nanoAmount = Math.round(selectedDepositTier.priceGram * 1e9)
                  const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${depositAddress}?amount=${nanoAmount}&text=${encodeURIComponent(userMemo)}`
                  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
                    window.Telegram.WebApp.openLink(tonkeeperUrl)
                  } else {
                    window.open(tonkeeperUrl, '_blank')
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-[#0088cc] hover:bg-[#0099e6] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                <span>⚡</span> OPEN TONKEEPER WALLET
              </button>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyDeposit}
              disabled={verifyingDeposit}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
            >
              {verifyingDeposit ? 'VERIFYING BLOCKCHAIN...' : '✅ I SENT PAYMENT / VERIFY'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Crates
