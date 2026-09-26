import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { openCrate, OpenCrateResult, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import ReactConfetti from 'react-confetti'
import { useNavigate } from 'react-router-dom'

interface CrateTierInfo {
  id: 'bronze' | 'silver' | 'gold'
  name: string
  badge: string
  badgeColor: string
  priceGram: number
  priceUsdt: number
  icon: string
  glowColor: string
  borderColor: string
  bgGradient: string
  rewardsPreview: { label: string; text: string; color: string }[]
  jackpotText: string
}

const CRATE_TIERS: CrateTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronze Worker Crate',
    badge: 'ENTRY LEVEL',
    badgeColor: 'bg-amber-700/30 text-amber-300 border-amber-600/40',
    priceGram: 0.5,
    priceUsdt: 0.5,
    icon: '📦',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    borderColor: 'border-amber-600/50',
    bgGradient: 'from-[#24180e] via-[#1a130c] to-[#120d09]',
    rewardsPreview: [
      { label: 'COMMON (50%)', text: '+40 GHS Mining Hashrate', color: 'text-stone-300' },
      { label: 'UNCOMMON (25%)', text: '+0.25 USDT + 20 GHS', color: 'text-emerald-400' },
      { label: 'RARE (18%)', text: '+0.35 GRAM + 30 GHS', color: 'text-blue-400' },
      { label: '🔥 JACKPOT (7%)', text: '+1.00 USDT + 0.50 GRAM + 100 GHS', color: 'text-amber-400 font-bold' },
    ],
    jackpotText: 'Up to +1.00 USDT & +100 GHS',
  },
  {
    id: 'silver',
    name: 'Silver Soldier Crate',
    badge: 'POPULAR CHOICE',
    badgeColor: 'bg-slate-500/30 text-slate-200 border-slate-400/40',
    priceGram: 1.5,
    priceUsdt: 1.5,
    icon: '🥈',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    borderColor: 'border-slate-400/50',
    bgGradient: 'from-[#1a232e] via-[#121922] to-[#0c1117]',
    rewardsPreview: [
      { label: 'COMMON (45%)', text: '+120 GHS Mining Hashrate', color: 'text-stone-300' },
      { label: 'UNCOMMON (30%)', text: '+0.80 USDT + 60 GHS', color: 'text-emerald-400' },
      { label: 'RARE (18%)', text: '+1.20 GRAM + 100 GHS', color: 'text-blue-400' },
      { label: '🔥 JACKPOT (7%)', text: '+3.50 USDT + 1.50 GRAM + 350 GHS', color: 'text-amber-400 font-bold' },
    ],
    jackpotText: 'Up to +3.50 USDT & +350 GHS',
  },
  {
    id: 'gold',
    name: 'Golden Queen Crate',
    badge: 'VIP HIGH ROLLER',
    badgeColor: 'bg-amber-400/30 text-amber-300 border-amber-400/50',
    priceGram: 3.0,
    priceUsdt: 3.0,
    icon: '👑',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    borderColor: 'border-amber-400/60',
    bgGradient: 'from-[#2b200b] via-[#1d1607] to-[#140f05]',
    rewardsPreview: [
      { label: 'COMMON (40%)', text: '+260 GHS Mining Hashrate', color: 'text-stone-300' },
      { label: 'UNCOMMON (32%)', text: '+2.00 USDT + 150 GHS', color: 'text-emerald-400' },
      { label: 'RARE (20%)', text: '+2.80 GRAM + 250 GHS', color: 'text-blue-400' },
      { label: '🔥 JACKPOT (8%)', text: '+8.00 USDT + 3.00 GRAM + 1,000 GHS', color: 'text-amber-400 font-bold' },
    ],
    jackpotText: 'Up to +8.00 USDT & +1,000 GHS',
  },
]

// Mock live winning feed ticker for high dopamine & social proof
const LIVE_WINS = [
  '🔥 @Ramiz... won +1.00 USDT + 100 GHS from Bronze Crate!',
  '⚡ @Dmitry... unlocked +260 GHS from Golden Crate!',
  '💎 @Elena... won +1.20 GRAM + 100 GHS from Silver Crate!',
  '🚀 @CryptoBee... hit +3.50 USDT JACKPOT from Silver Crate!',
  '👑 @AlexTon... won +8.00 USDT + 1,000 GHS VIP JACKPOT!',
]

export const Crates: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [openingTier, setOpeningTier] = useState<string | null>(null)
  const [openingState, setOpeningState] = useState<'idle' | 'shaking' | 'revealed'>('idle')
  const [wonResult, setWonResult] = useState<OpenCrateResult | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentWinIndex, setCurrentWinIndex] = useState(0)

  // TON Deposit Modal State for Crates
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [selectedDepositTier, setSelectedDepositTier] = useState<CrateTierInfo>(CRATE_TIERS[0])
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [verifyingDeposit, setVerifyingDeposit] = useState(false)

  const depositAddress = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  const userMemo = user ? `HB_${user.telegram_id}` : 'HB_MINER'

  // Cycle live win feed
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWinIndex((prev) => (prev + 1) % LIVE_WINS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
      }
    } catch {
      // ignore
    }
  }

  const triggerNotificationHaptic = (type: 'success' | 'warning' | 'error') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type)
      }
    } catch {
      // ignore
    }
  }

  const handleOpenCrate = async (tier: CrateTierInfo) => {
    const userBalance = user?.honey_balance || 0

    // If balance is too low, open deposit helper
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
      // Call backend to open crate
      const result = await openCrate(tier.id)

      // Dramatic suspense delay
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
    toast.loading('Checking blockchain for your transfer...', { id: 'crate-dep' })
    try {
      const res = await checkDeposit()
      toast.dismiss('crate-dep')
      await refreshUser()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Detected ${res.credited} deposit! Balance & Hashrate upgraded!`)
        setShowDepositModal(false)
      } else {
        toast.success('Blockchain scan complete! Any transfers are automatically credited.')
      }
    } catch {
      toast.dismiss('crate-dep')
      toast.error('Could not detect transfer yet. Please wait a few seconds and try again.')
    } finally {
      setVerifyingDeposit(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1311] text-[#e6f0ec] pb-28 pt-5 px-4 max-w-md mx-auto select-none">
      {showConfetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={160}
          recycle={false}
          gravity={0.3}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182621] border border-[#273d34] text-xs font-bold text-stone-300 active:scale-95 transition-all"
        >
          <span>←</span>
          <span>Miner</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#162520] border border-[#263e34] flex items-center gap-1.5 text-xs font-extrabold text-stone-100 shadow-sm">
            <span className="text-amber-400">💰</span>
            <span>{(user?.honey_balance || 0).toFixed(4)} USDT</span>
          </div>
        </div>
      </div>

      {/* Title & Banner */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2 shadow-sm">
          <span>🎁</span>
          <span>INSTANT WIN CRATES</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">
          Mystery Loot Crates
        </h1>
        <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
          Unlock crates for guaranteed <b>USDT</b>, <b>GRAM</b>, and massive <b>Hashrate (GHS)</b> upgrades!
        </p>
      </div>

      {/* Live Win Ticker (Dopamine Trigger) */}
      <div className="mb-5 py-2 px-3 rounded-2xl bg-[#141e1b] border border-[#243630] flex items-center gap-2 overflow-hidden shadow-inner">
        <span className="text-xs font-black text-amber-400 animate-pulse uppercase tracking-wider shrink-0">
          LIVE WINS:
        </span>
        <p className="text-[11px] text-stone-300 font-semibold truncate transition-all duration-300">
          {LIVE_WINS[currentWinIndex]}
        </p>
      </div>

      {/* Crates List */}
      <div className="space-y-4">
        {CRATE_TIERS.map((crate) => {
          const userHasBalance = (user?.honey_balance || 0) >= crate.priceUsdt

          return (
            <div
              key={crate.id}
              style={{ boxShadow: `0 8px 30px ${crate.glowColor}` }}
              className={`rounded-3xl border ${crate.borderColor} bg-gradient-to-b ${crate.bgGradient} p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.01]`}
            >
              {/* Background ambient lighting */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none"
                style={{ backgroundColor: crate.glowColor }}
              />

              {/* Top Tier Header */}
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#0e1714]/80 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                    {crate.icon}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${crate.badgeColor} mb-1`}>
                      {crate.badge}
                    </span>
                    <h3 className="text-base font-black text-white">{crate.name}</h3>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-amber-300 font-mono">
                    {crate.priceGram} GRAM
                  </div>
                  <div className="text-[10px] font-bold text-stone-400">
                    ≈ ${crate.priceUsdt.toFixed(2)} USDT
                  </div>
                </div>
              </div>

              {/* Jackpot Highlight */}
              <div className="mb-3 py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span>🔥 Max Jackpot:</span>
                <span className="font-extrabold">{crate.jackpotText}</span>
              </div>

              {/* Rewards Breakdown Accordion/List */}
              <div className="bg-[#0b1210]/60 rounded-xl p-3 border border-white/5 space-y-1.5 mb-4 text-[11px]">
                {crate.rewardsPreview.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-stone-400 font-semibold">{item.label}:</span>
                    <span className={item.color}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Open Crate Action Button */}
              <button
                onClick={() => handleOpenCrate(crate)}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                  userHasBalance
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 hover:brightness-110 shadow-amber-500/20'
                    : 'bg-[#1e2d27] text-stone-200 border border-[#324a3f] hover:bg-[#253931]'
                }`}
              >
                <span>{crate.icon}</span>
                <span>
                  {userHasBalance
                    ? `OPEN FOR ${crate.priceGram} GRAM`
                    : `DEPOSIT ${crate.priceGram} GRAM & UNLOCK`}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Opening & Reveal Modal */}
      {openingState !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-[#121c19] border border-[#293d35] rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient burst */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

            {openingState === 'shaking' && (
              <div className="py-8">
                <div className="text-7xl animate-bounce mb-6">🎁</div>
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1">
                  UNLOCKING CRATE...
                </h3>
                <p className="text-xs text-stone-400">Decrypting rewards from smart hive...</p>
              </div>
            )}

            {openingState === 'revealed' && wonResult && (
              <div className="py-3 relative z-10 animate-fade-in">
                <span
                  style={{ backgroundColor: `${wonResult.reward.rarity_color}25`, borderColor: wonResult.reward.rarity_color, color: wonResult.reward.rarity_color }}
                  className="inline-block px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest mb-3 shadow-md"
                >
                  {wonResult.reward.rarity_label}
                </span>

                <div className="text-6xl my-2">🎉</div>

                <h2 className="text-xl font-black text-white uppercase tracking-wide mb-1">
                  YOU UNLOCKED
                </h2>

                <div className="text-lg font-extrabold text-amber-300 mb-4 font-mono">
                  {wonResult.reward.summary_text}
                </div>

                <div className="bg-[#172420] border border-[#2a4238] rounded-2xl p-4 mb-5 space-y-2 text-left text-xs">
                  <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1">
                    Credited to Your Miner
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
                  <div className="flex items-center justify-between text-stone-300 font-semibold pt-1 border-t border-white/5">
                    <span>New Total Hashrate:</span>
                    <span>{wonResult.new_bp.toFixed(1)} GHS</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      setOpeningState('idle')
                      setOpeningTier(null)
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95"
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
                    className="w-full py-3 rounded-2xl bg-[#1c2a25] border border-[#2a3e36] text-stone-300 font-bold text-xs uppercase active:scale-95"
                  >
                    OPEN ANOTHER CRATE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deposit Helper Modal if balance is low */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-[#121c19] border border-[#273a33] rounded-3xl w-full max-w-sm p-5 text-stone-100 shadow-2xl relative">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <div className="text-3xl mb-1">{selectedDepositTier.icon}</div>
              <h3 className="text-base font-black uppercase tracking-wide">
                DEPOSIT FOR {selectedDepositTier.name}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Send <b>{selectedDepositTier.priceGram} GRAM</b> to your address to unlock.
              </p>
            </div>

            {/* Deposit Address Box */}
            <div className="bg-[#16231f] border border-[#273b33] rounded-2xl p-3.5 mb-3 text-left">
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
                className="w-full mt-2 py-2 rounded-xl bg-[#1e2d27] hover:bg-[#283d34] text-xs font-extrabold text-stone-300 uppercase tracking-wider border border-[#334c40]"
              >
                {copiedAddr ? '✓ ADDRESS COPIED' : '📋 COPY ADDRESS'}
              </button>
            </div>

            {/* Memo Comment Box */}
            <div className="bg-[#16231f] border border-amber-500/30 rounded-2xl p-3.5 mb-4 text-left">
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
                className="w-full mt-2 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-extrabold text-amber-300 uppercase tracking-wider border border-amber-500/40"
              >
                {copiedMemo ? '✓ MEMO COPIED' : '📋 COPY MEMO'}
              </button>
            </div>

            {/* Direct Wallet Launcher Buttons */}
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
                className="w-full py-3 rounded-xl bg-[#0088cc] hover:bg-[#0099e6] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>⚡</span> OPEN TONKEEPER WALLET
              </button>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyDeposit}
              disabled={verifyingDeposit}
              className="w-full py-3.5 rounded-2xl bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95"
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
