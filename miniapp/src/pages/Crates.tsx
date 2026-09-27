import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { openCrate, OpenCrateResult, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { crateAudio } from '../utils/crateAudio'
import { CrateAnimatedBox } from '../components/CrateAnimatedBox'
import { CrateUnboxModal } from '../components/CrateUnboxModal'

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
  id: 'bronze' | 'silver' | 'gold' | 'god'
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
  guaranteedTag: string
  rewards: RewardTierItem[]
}

const CRATE_TIERS: CrateTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronze Miner Crate',
    subtitle: 'Great starter pack with GHS Hashpower & 1.00 GRAM top prize',
    badge: '🥉 ENTRY PACK',
    badgeBg: 'bg-amber-800/40 text-amber-300 border-amber-600/50',
    priceGram: 0.5,
    priceUsdt: 0.5,
    icon: '📦',
    accentColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    borderColor: 'border-amber-600/40',
    cardBg: 'from-[#23170e] via-[#19110a] to-[#0f0b07]',
    chestImage: '📦',
    jackpotBanner: '🔥 HIGHEST PRIZE: +1.00 GRAM + 100 GHS',
    guaranteedTag: '⚡ GUARANTEED HASHPOWER & GRAM IN 2-3 OPENS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON (70%)',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+25 GHS Hashrate',
        subtitle: 'Permanent Cloud Mining Power',
        rewardValue: '25 GHS',
        icon: '⚡',
        textColor: 'text-stone-200',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'UNCOMMON (20%)',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        title: '+60 GHS Hashrate',
        subtitle: 'Mining Hashrate Surge',
        rewardValue: '60 GHS',
        icon: '⚡',
        textColor: 'text-emerald-400',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'RARE (7%)',
        rarityBadgeColor: 'bg-blue-950/80 text-blue-300 border-blue-400/40 font-black',
        title: '+0.25 GRAM + 50 GHS',
        subtitle: 'Crypto Token & Hash Power',
        rewardValue: '0.25 G + 50 GHS',
        icon: '💎',
        textColor: 'text-blue-400',
        cardBg: 'bg-blue-950/30',
        border: 'border-blue-500/40',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 TOP PRIZE (3%)',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border-amber-300 font-black shadow-md shadow-amber-500/30',
        title: '+1.00 GRAM + 100 GHS',
        subtitle: 'Bronze Ultimate 1.00 GRAM Prize!',
        rewardValue: '🔥 1.00 G',
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
    name: 'Silver Soldier Vault',
    subtitle: 'High multiplier pack with up to +10.00 GRAM jackpot',
    badge: '🥈 MOST POPULAR',
    badgeBg: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/50',
    priceGram: 1.5,
    priceUsdt: 1.5,
    icon: '🥈',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    borderColor: 'border-cyan-500/40',
    cardBg: 'from-[#102434] via-[#0b1722] to-[#060e15]',
    chestImage: '🥈',
    jackpotBanner: '🔥 MULTIPLIER VAULT: UP TO +10.00 GRAM!',
    guaranteedTag: '👑 GUARANTEED GRAM WIN WITHIN 2-3 OPENS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON (BASE)',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+0.35 GRAM Drop',
        subtitle: 'Base Return',
        rewardValue: '0.35 G',
        icon: '💎',
        textColor: 'text-stone-300',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'UNCOMMON (HIGH)',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-black',
        title: '+3.50 GRAM Surge Drop',
        subtitle: '91 OVR Surge Return',
        rewardValue: '3.50 G',
        icon: '💎',
        textColor: 'text-emerald-400 font-bold',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'RARE (MEGA)',
        rarityBadgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-400/40 font-black',
        title: '+5.00 GRAM Mega Jackpot',
        subtitle: '95 OVR Direct Profit Drop',
        rewardValue: '🔥 5.00 G',
        icon: '👑',
        textColor: 'text-cyan-300 font-black',
        cardBg: 'bg-cyan-950/30',
        border: 'border-cyan-500/40',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 10.00 G GOD DROP',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 border-amber-300 font-black shadow-md shadow-amber-500/30 animate-pulse',
        title: '+10.00 GRAM ULTRA MULTIPLIER',
        subtitle: '98 OVR Supreme Vault Prize!',
        rewardValue: '👑 10.00 G',
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
    name: 'Golden Queen Treasury',
    subtitle: 'VIP High Roller pack with up to +20.00 GRAM jackpot',
    badge: '👑 VIP 3.0 GRAM',
    badgeBg: 'bg-amber-400/30 text-amber-300 border-amber-400/60 shadow-amber-500/20',
    priceGram: 3.0,
    priceUsdt: 3.0,
    icon: '👑',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    borderColor: 'border-amber-400/60',
    cardBg: 'from-[#2e210a] via-[#1d1506] to-[#120d04]',
    chestImage: '👑',
    jackpotBanner: '🔥 VIP JACKPOT: UP TO +20.00 GRAM!',
    guaranteedTag: '👑 GUARANTEED GRAM WIN WITHIN 2-3 OPENS',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'COMMON (BASE)',
        rarityBadgeColor: 'bg-stone-800/90 text-stone-300 border-stone-700',
        title: '+0.75 GRAM Drop',
        subtitle: 'Base Return',
        rewardValue: '0.75 G',
        icon: '💎',
        textColor: 'text-stone-300',
        cardBg: 'bg-[#151c19]/80',
        border: 'border-white/5',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'ROYAL (HIGH)',
        rarityBadgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-black',
        title: '+6.00 GRAM Royal Surge',
        subtitle: '93 OVR Royal Drop',
        rewardValue: '6.00 G',
        icon: '💎',
        textColor: 'text-emerald-400 font-bold',
        cardBg: 'bg-emerald-950/20',
        border: 'border-emerald-500/20',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'VIP (MEGA)',
        rarityBadgeColor: 'bg-blue-950/80 text-blue-300 border-blue-400/40 font-black',
        title: '+10.00 GRAM Golden Jackpot',
        subtitle: '97 OVR High Roller Return',
        rewardValue: '👑 10.00 G',
        icon: '👑',
        textColor: 'text-blue-300 font-black',
        cardBg: 'bg-blue-950/30',
        border: 'border-blue-500/40',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 20.00 G SOVEREIGN VAULT',
        rarityBadgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 border-amber-300 font-black shadow-lg shadow-amber-500/40 animate-pulse',
        title: '+20.00 GRAM SOVEREIGN DROP',
        subtitle: '99 OVR Golden Queen Mega Jackpot!',
        rewardValue: '🔥 20.00 G',
        icon: '👑',
        textColor: 'text-amber-300 font-black',
        cardBg: 'bg-gradient-to-r from-[#442c08] via-[#332105] to-[#201503]',
        border: 'border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
        isTopReward: true,
      },
    ],
  },
  {
    id: 'god',
    name: 'Cyber God Deity Vault',
    subtitle: 'Supreme Mythic pack with up to +50.00 GRAM supreme jackpot',
    badge: '👁️ 5.0 GRAM SUPREME TOP',
    badgeBg: 'bg-fuchsia-500/30 text-fuchsia-300 border-fuchsia-400/70 shadow-fuchsia-500/30',
    priceGram: 5.0,
    priceUsdt: 5.0,
    icon: '👁️',
    accentColor: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.55)',
    borderColor: 'border-fuchsia-400/80',
    cardBg: 'from-[#3b0764] via-[#24063d] to-[#12021f]',
    chestImage: '👁️',
    jackpotBanner: '⚡ SUPREME 10X JACKPOT: UP TO +50.00 GRAM!',
    guaranteedTag: '👑 100% 99 OVR CYBER GOD CARD PACK',
    rewards: [
      {
        rarity: 'COMMON',
        rarityLabel: 'MORTAL (BASE)',
        rarityBadgeColor: 'bg-purple-950 text-purple-300 border-purple-500/50 font-black',
        title: '+1.20 GRAM Drop',
        subtitle: 'Mortal Return',
        rewardValue: '1.20 G',
        icon: '💎',
        textColor: 'text-purple-300',
        cardBg: 'bg-purple-950/40',
        border: 'border-purple-500/30',
      },
      {
        rarity: 'UNCOMMON',
        rarityLabel: 'DEITY (HIGH)',
        rarityBadgeColor: 'bg-pink-950 text-pink-300 border-pink-500/50 font-black',
        title: '+12.00 GRAM Deity Surge',
        subtitle: '95 OVR Divine Drop',
        rewardValue: '12.00 G',
        icon: '💎',
        textColor: 'text-pink-300 font-bold',
        cardBg: 'bg-pink-950/40',
        border: 'border-pink-500/30',
      },
      {
        rarity: 'RARE',
        rarityLabel: 'SUPREME (MEGA)',
        rarityBadgeColor: 'bg-sky-950 text-sky-300 border-sky-400/60 font-black',
        title: '+25.00 GRAM Cyber God Jackpot',
        subtitle: '99 OVR Supreme God Drop',
        rewardValue: '👁️ 25.00 G',
        icon: '👁️',
        textColor: 'text-sky-300 font-black',
        cardBg: 'bg-sky-950/40',
        border: 'border-sky-400/40',
      },
      {
        rarity: 'JACKPOT',
        rarityLabel: '👑 50.00 G CELESTIAL TOP',
        rarityBadgeColor: 'bg-gradient-to-r from-fuchsia-500 via-pink-400 to-amber-300 text-stone-950 border-fuchsia-300 font-black shadow-xl shadow-fuchsia-500/50 animate-pulse',
        title: '+50.00 GRAM CELESTIAL GOD',
        subtitle: '1000% Supreme Celestial Jackpot!',
        rewardValue: '⚡ 50.00 G',
        icon: '⚡',
        textColor: 'text-fuchsia-300 font-black',
        cardBg: 'bg-gradient-to-r from-[#581c87] via-[#3b0764] to-[#1e0533]',
        border: 'border-2 border-fuchsia-400 shadow-[0_0_35px_rgba(217,70,239,0.5)]',
        isTopReward: true,
      },
    ],
  },
]

const LIVE_WINS = [
  '👁️ @Alex9... unboxed 99 OVR Cyber God (+25.00 GRAM Supreme Drop)!',
  '👑 @TonWhale... triggered +10.00 GRAM Golden Queen 96 OVR Card!',
  '⚡ @Dmitry... unlocked +100 GHS & +1.00 GRAM from Bronze Miner Pack!',
  '💎 @Elena_K... won +5.00 GRAM Silver Mega Jackpot Card!',
  '🚀 @CryptoBee... hit +6.50 GRAM Rare Cyber God Card!',
  '🎉 @Samir... hit +1.00 GRAM Highest Prize from 0.5 G Crate!',
  '💎 @Ivan_T... hit Guaranteed Pity Reward (+6.50 GRAM)!',
]

export const Crates: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'god'>('all')
  const [openingCrate, setOpeningCrate] = useState<CrateTierInfo | null>(null)
  const [wonResult, setWonResult] = useState<OpenCrateResult | null>(null)
  const [showUnboxModal, setShowUnboxModal] = useState(false)
  const [currentWinIndex, setCurrentWinIndex] = useState(0)

  // Sunk-cost Dopamine Pity System (Persisted in localStorage)
  const [pityCount, setPityCount] = useState<number>(() => {
    const saved = localStorage.getItem('hashbee_crate_pity_count')
    return saved ? parseInt(saved, 10) : 1
  })

  // 15-Minute Lucky Fever Countdown Timer
  const [feverSeconds, setFeverSeconds] = useState(742)

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
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setFeverSeconds((prev) => (prev > 0 ? prev - 1 : 900))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
      }
    } catch {}
  }

  const handleOpenCrate = async (tier: CrateTierInfo) => {
    const userBalance = user?.honey_balance || 0

    if (userBalance < tier.priceGram) {
      crateAudio.playClick()
      setSelectedDepositTier(tier)
      setShowDepositModal(true)
      return
    }

    triggerHaptic('heavy')
    setOpeningCrate(tier)
    setShowUnboxModal(true)
    setWonResult(null)

    try {
      const result = await openCrate(tier.id)
      setWonResult(result)

      const nextPity = pityCount + 1
      setPityCount(nextPity)
      localStorage.setItem('hashbee_crate_pity_count', String(nextPity))

      await refreshUser()
    } catch (err: any) {
      setShowUnboxModal(false)
      setOpeningCrate(null)
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

  const pityStage = (pityCount % 3) === 0 ? 3 : (pityCount % 3)
  const filteredTiers = activeTab === 'all' ? CRATE_TIERS : CRATE_TIERS.filter((t) => t.id === activeTab)

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#e6f0ec] pb-32 pt-3 px-4 max-w-md mx-auto select-none">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            crateAudio.playClick()
            navigate('/')
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131d19] border border-[#22332c] text-xs font-extrabold text-stone-300 active:scale-95 transition-all shadow-sm"
        >
          <span>←</span>
          <span>Miner</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#12221b] border border-amber-500/40 flex items-center gap-1.5 text-xs font-black text-amber-300 shadow-sm shadow-amber-500/10">
            <span>💎</span>
            <span>{(user?.honey_balance || 0).toFixed(4)} GRAM</span>
          </div>
        </div>
      </div>

      {/* ⚡ 5.0 GRAM SUPREME CYBER GOD TOP BANNER (Dopamine Trigger) */}
      <motion.div
        animate={{ scale: [1, 1.01, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mb-3.5 p-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600/30 via-amber-600/20 to-fuchsia-600/30 border border-fuchsia-500/50 flex items-center justify-between shadow-lg shadow-fuchsia-500/10"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl animate-bounce">👁️</span>
          <div>
            <div className="text-[11px] font-black text-fuchsia-300 uppercase tracking-wide">
              TOP JACKPOT: 5.0 G CYBER GOD (+25.00 G)
            </div>
            <div className="text-[9px] text-fuchsia-200/80 font-bold">
              Supreme 99 OVR Walkout • Instant Credit
            </div>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-black/60 border border-amber-400/40 text-xs font-mono font-black text-amber-400 tracking-wider">
          ⏱️ {formatTime(feverSeconds)}
        </div>
      </motion.div>

      {/* 👑 GUARANTEED PITY PROGRESS METER */}
      <div className="mb-4 p-3.5 rounded-2xl bg-[#111a17] border-2 border-[#20362c] shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-200 uppercase tracking-wide">
            <span>⚽</span>
            <span>GUARANTEED CARD PITY METER</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${
              pityStage === 3
                ? 'bg-amber-400 text-stone-950 border-amber-300 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {pityStage === 3 ? '👑 100% GUARANTEED NOW!' : `PACK ${pityStage} OF 3`}
          </span>
        </div>

        {/* 3-Step Visual Track */}
        <div className="grid grid-cols-3 gap-2 my-2">
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              pityStage >= 1
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-stone-900/60 border-white/5 text-stone-500'
            }`}
          >
            <div className="text-sm">📦 1st Box</div>
            <div className="text-[9px] font-bold mt-0.5">Base Drop</div>
          </div>

          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              pityStage >= 2
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-stone-900/60 border-white/5 text-stone-500'
            }`}
          >
            <div className="text-sm">⚡ 2nd Box</div>
            <div className="text-[9px] font-bold mt-0.5">+50% Luck Surge</div>
          </div>

          <div
            className={`p-2 rounded-xl border-2 text-center transition-all ${
              pityStage === 3
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 border-amber-300 font-black shadow-lg shadow-amber-500/40 animate-pulse'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="text-sm font-black">👑 3rd Box</div>
            <div className="text-[9px] font-extrabold mt-0.5">100% TOP WIN</div>
          </div>
        </div>

        <p className="text-[10px] text-center text-amber-300/90 font-bold mt-2">
          {pityStage === 3
            ? '🔥 UNLOCK NOW: Next pack is GUARANTEED to drop a rare 92+ OVR Card!'
            : `Open ${3 - pityStage} more box to trigger guaranteed top card drop!`}
        </p>
      </div>

      {/* Live Winners Ticker */}
      <div className="mb-4 py-2 px-3 rounded-2xl bg-[#0f1714] border border-[#1b2a24] flex items-center gap-2 overflow-hidden shadow-inner">
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          FUT WALKOUT:
        </span>
        <p className="text-[11px] text-stone-300 font-semibold truncate transition-all duration-300">
          {LIVE_WINS[currentWinIndex]}
        </p>
      </div>

      {/* ======================================================== */}
      {/* 📦 4-BOX MATRIX (ALL BOXES ON SAME SCREEN IN 2x2 GRID)   */}
      {/* ======================================================== */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <span>🎁</span> SELECT LOOT CRATE (4 TIERS)
          </span>
          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            1-TAP TO UNBOX
          </span>
        </div>

        {/* 2x2 Grid of all 4 boxes on the same screen */}
        <div className="grid grid-cols-2 gap-2.5">
          {CRATE_TIERS.map((crate) => {
            const isSelected = activeTab === crate.id
            const isGod = crate.id === 'god'
            const userBalance = user?.honey_balance || 0
            const hasBalance = userBalance >= crate.priceGram

            return (
              <div
                key={crate.id}
                onClick={() => {
                  crateAudio.playClick()
                  triggerHaptic('light')
                  setActiveTab(crate.id)
                }}
                style={{
                  boxShadow: isSelected
                    ? `0 0 25px 2px ${crate.glowColor}`
                    : `0 4px 15px -2px ${crate.glowColor}`,
                }}
                className={`relative rounded-2xl border-2 transition-all duration-200 p-2.5 flex flex-col items-center justify-between cursor-pointer active:scale-98 ${
                  isSelected
                    ? `${crate.borderColor} bg-gradient-to-b ${crate.cardBg} ring-2 ring-amber-400/50`
                    : 'border-[#1f3028] bg-[#101915]/90 hover:border-stone-500'
                }`}
              >
                {/* Top Badge & God Hot Ribbon */}
                <div className="w-full flex items-center justify-between mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight border ${crate.badgeBg}`}>
                    {crate.badge.split(' ')[0]} {crate.badge.split(' ')[1] || ''}
                  </span>
                  <span className="text-[11px] font-black text-amber-300 font-mono">
                    {crate.priceGram} G
                  </span>
                </div>

                {/* 3D Animated Crate Box (Compact size) */}
                <div className="my-1 flex items-center justify-center">
                  <CrateAnimatedBox
                    tierId={crate.id}
                    tierName={crate.name}
                    accentColor={crate.accentColor}
                    glowColor={crate.glowColor}
                    icon={crate.icon}
                    size="sm"
                  />
                </div>

                {/* Box Name & Top Prize Callout */}
                <div className="text-center w-full my-1">
                  <div className="text-xs font-black text-white truncate">
                    {crate.name.split(' ')[0]} {crate.name.split(' ')[1]}
                  </div>
                  <div className="text-[9px] font-extrabold text-amber-300 bg-black/40 border border-amber-500/30 rounded-lg px-1.5 py-0.5 mt-1 truncate">
                    {crate.id === 'bronze'
                      ? '⚡ +1.00 G / 100 GHS'
                      : crate.id === 'silver'
                        ? '🔥 +10.00 G DROP'
                        : crate.id === 'gold'
                          ? '👑 +20.00 G VAULT'
                          : '👁️ +50.00 G GOD'}
                  </div>
                </div>

                {/* Quick Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenCrate(crate)
                  }}
                  className={`w-full mt-1.5 py-2 px-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 ${
                    hasBalance
                      ? isGod
                        ? 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-stone-950 hover:brightness-110 shadow-fuchsia-500/30'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 hover:brightness-110 shadow-amber-500/20'
                      : 'bg-[#1b2b24] text-emerald-300 border border-emerald-500/40 hover:bg-[#23382f]'
                  }`}
                >
                  <span>{hasBalance ? 'OPEN' : 'UNLOCK'}</span>
                  <span>➔</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🔍 ACTIVE SELECTED CRATE INSPECTOR & REWARDS WALKOUT     */}
      {/* ======================================================== */}
      {(() => {
        const activeCrate = CRATE_TIERS.find((c) => c.id === activeTab) || CRATE_TIERS[3]
        const userBalance = user?.honey_balance || 0
        const userHasBalance = userBalance >= activeCrate.priceGram

        return (
          <div
            style={{ boxShadow: `0 10px 35px -5px ${activeCrate.glowColor}` }}
            className={`rounded-3xl border-2 ${activeCrate.borderColor} bg-gradient-to-b ${activeCrate.cardBg} p-4 mb-4 relative overflow-hidden transition-all duration-300`}
          >
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ backgroundColor: activeCrate.accentColor }}
            />

            {/* Header with Title & Guaranteed Tag */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeCrate.icon}</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    {activeCrate.name}
                  </h3>
                  <div className="text-[10px] text-amber-300 font-extrabold">
                    {activeCrate.jackpotBanner}
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${activeCrate.badgeBg}`}>
                {activeCrate.priceGram} GRAM
              </span>
            </div>

            {/* Guaranteed Tag Callout */}
            <div className="mb-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 uppercase tracking-wide shadow-sm">
              <span>⚽</span>
              <span>{activeCrate.guaranteedTag}</span>
            </div>

            {/* REWARDS SHOWCASE SECTION */}
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <span>⚽</span> 4 REWARD WALKOUT CARDS
                </span>
                <span className="text-[9.5px] font-bold text-amber-400">Instant TON/GRAM</span>
              </div>

              {activeCrate.rewards.map((rew, idx) => {
                if (rew.isTopReward) {
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border-2 ${rew.border} ${rew.cardBg} relative overflow-hidden transition-all`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg shadow-inner shrink-0">
                            <span>{rew.icon}</span>
                          </div>
                          <div>
                            <div className="text-xs font-black text-amber-300 tracking-tight">
                              {rew.title}
                            </div>
                            <div className="text-[9px] text-amber-200/70 font-semibold">
                              {rew.subtitle}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md border text-[8.5px] font-black uppercase tracking-wider shrink-0 ${rew.rarityBadgeColor}`}>
                          {rew.rarityLabel}
                        </span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border ${rew.border} ${rew.cardBg} flex items-center justify-between transition-all`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{rew.icon}</span>
                      <div>
                        <div className={`text-[11px] font-bold ${rew.textColor}`}>
                          {rew.title}
                        </div>
                        <div className="text-[9px] text-stone-400 font-medium">
                          {rew.subtitle}
                        </div>
                      </div>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded border text-[8.5px] font-extrabold uppercase tracking-wider shrink-0 ${rew.rarityBadgeColor}`}>
                      {rew.rarityLabel}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ACTION BUTTON */}
            <button
              onClick={() => handleOpenCrate(activeCrate)}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer ${
                userHasBalance
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 hover:brightness-110 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-[#1f2f28] to-[#283e35] text-stone-200 border border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/10'
              }`}
            >
              <span>{activeCrate.icon}</span>
              <span>
                {userHasBalance
                  ? `OPEN ${activeCrate.name.toUpperCase()} • ${activeCrate.priceGram} GRAM`
                  : `⚡ DEPOSIT & UNLOCK • ${activeCrate.priceGram} GRAM`}
              </span>
              <span>➔</span>
            </button>
          </div>
        )
      })()}

      {/* CS:GO / Football Pack Walkout Suspense Unboxing Modal */}
      {openingCrate && (
        <CrateUnboxModal
          isOpen={showUnboxModal}
          tierId={openingCrate.id}
          tierName={openingCrate.name}
          accentColor={openingCrate.accentColor}
          glowColor={openingCrate.glowColor}
          icon={openingCrate.icon}
          priceGram={openingCrate.priceGram}
          priceUsdt={openingCrate.priceUsdt}
          result={wonResult}
          pityCount={pityCount}
          onClose={() => {
            setShowUnboxModal(false)
            setOpeningCrate(null)
          }}
          onOpenAgain={() => {
            if (openingCrate) {
              handleOpenCrate(openingCrate)
            }
          }}
        />
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
