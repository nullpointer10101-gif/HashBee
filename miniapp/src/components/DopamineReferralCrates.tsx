import React, { useState, useEffect, useMemo } from 'react'
import ReactConfetti from 'react-confetti'
import { useAuth } from '../context/AuthContext'
import { claimSpinReward } from '../services/api'
import { crateAudio } from '../utils/crateAudio'

export interface CrateTierConfig {
  tierId: number
  tierName: string
  requiredReferrals: number
  badge: string
  icon: string
  headlineDrop: string
  teaser: string
  color: string
}

export interface WonPrize {
  type: 'hash' | 'usdt' | 'gram'
  amount: number
  label: string
  icon: string
  rarity: string
  color: string
}

// 6 Progressive Crate Tiers with Front-Loaded Dopamine (Early Invites = High Rewards!)
const CRATE_TIERS: CrateTierConfig[] = [
  {
    tierId: 1,
    tierName: 'Starter Core Crate',
    requiredReferrals: 1,
    badge: '1 NEW INVITE',
    icon: '📦',
    headlineDrop: '1k - 5k Power',
    teaser: '🔥 Early Hook Reward!',
    color: '#06b6d4',
  },
  {
    tierId: 2,
    tierName: 'Cyber Matrix Crate',
    requiredReferrals: 6,
    badge: '6 NEW INVITES',
    icon: '⚡',
    headlineDrop: '500 - 1,000 Power',
    teaser: 'Chance of 0.01 USDT',
    color: '#8b5cf6',
  },
  {
    tierId: 3,
    tierName: 'Golden Reactor Crate',
    requiredReferrals: 15,
    badge: '15 NEW INVITES',
    icon: '🥇',
    headlineDrop: '250 - 500 Power',
    teaser: 'Chance of 1.00 USDT',
    color: '#f59e0b',
  },
  {
    tierId: 4,
    tierName: 'Titan Overclock Crate',
    requiredReferrals: 35,
    badge: '35 NEW INVITES',
    icon: '💎',
    headlineDrop: '100 - 250 Power',
    teaser: 'Diminishing reward loop',
    color: '#3b82f6',
  },
  {
    tierId: 5,
    tierName: 'Sovereign Vault Crate',
    requiredReferrals: 75,
    badge: '75 NEW INVITES',
    icon: '👑',
    headlineDrop: '100 - 250 Power',
    teaser: '1% chance of 5 USDT',
    color: '#ec4899',
  },
  {
    tierId: 6,
    tierName: '150 Apex God Crate',
    requiredReferrals: 150,
    badge: '150 NEW INVITES',
    icon: '🔥',
    headlineDrop: '500 - 1,000 Power',
    teaser: '👑 Apex Milestone',
    color: '#ef4444',
  },
]

// Campaign Launch Epoch (Oct 27, 2026 00:00:00 UTC) — Only new invites joined after this timestamp count!
const CAMPAIGN_LAUNCH_EPOCH = new Date('2026-10-27T00:00:00Z').getTime()

interface Props {
  referralLink: string
  referralsList?: any[]
  totalReferrals?: number
}

export const DopamineReferralCrates: React.FC<Props> = ({
  referralLink,
  referralsList = [],
}) => {
  const { user, refreshUser } = useAuth()
  const userTgId = user?.telegram_id || 'guest'

  // Fresh Referrals: Only count referrals signed up after campaign launch
  const freshReferrals = useMemo(() => {
    if (!referralsList || referralsList.length === 0) return 0
    return referralsList.filter((r: any) => {
      const joinTime = new Date(r.joined_at || r.created_at || 0).getTime()
      return joinTime >= CAMPAIGN_LAUNCH_EPOCH
    }).length
  }, [referralsList])

  // Track claimed tiers in localStorage
  const storageKey = 'hb_ref_claimed_tiers_' + userTgId
  const [claimedTierIds, setClaimedTierIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Modal / Roulette state
  const [isOpeningModal, setIsOpeningModal] = useState(false)
  const [activeTier, setActiveTier] = useState<CrateTierConfig | null>(null)
  const [unboxPhase, setUnboxPhase] = useState<'charging' | 'spinning' | 'revealed'>('charging')
  const [wonPrize, setWonPrize] = useState<WonPrize | null>(null)
  const [reelItems, setReelItems] = useState<any[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [claiming, setClaiming] = useState(false)

  // Live recent drops ticker (Social Proof)
  const recentWins = [
    { name: '@ton_miner', box: 'Box 1', won: '⚡ 1,000 Power', ago: 'Just now' },
    { name: '@crypto_bee', box: 'Box 1', won: '🔥 5,000 Power (HOOK!)', ago: '1m ago' },
    { name: '@alex99', box: 'Box 2', won: '⚡ 1,000 Power', ago: '3m ago' },
    { name: '@whale_ton', box: 'Box 3', won: '💵 1.00 USDT', ago: '7m ago' },
    { name: '@fast_miner', box: 'Box 1', won: '⚡ 1,000 Power', ago: '11m ago' },
  ]

  // Roll drop table: GUARANTEED EXACTLY ONE PRIZE (Power OR USDT OR GRAM)
  // Early referrals get HIGH rewards (1k - 5k Power hook), more referrals get smaller rewards
  const rollDropPrize = (tierId: number): WonPrize => {
    const r = Math.random() * 100 // 0 to 100%

    if (tierId === 1) {
      // Box 1 (1 Referral): EARLY HOOK! Big Power or Crypto (ONE PRIZE)
      if (r < 15.0) {
        return { type: 'hash', amount: 5000, label: '5,000 Power', icon: '⚡', rarity: '🔥 HUGE HOOK', color: '#ef4444' }
      } else if (r < 90.0) {
        return { type: 'hash', amount: 1000, label: '1,000 Power', icon: '⚡', rarity: 'GREAT HOOK', color: '#06b6d4' }
      } else if (r < 98.0) {
        return { type: 'gram', amount: 0.001, label: '0.001 GRAM', icon: '💎', rarity: 'CRYPTO DROP', color: '#8b5cf6' }
      } else {
        return { type: 'usdt', amount: 0.01, label: '0.01 USDT', icon: '💵', rarity: 'CASH DROP', color: '#10b981' }
      }
    } else if (tierId === 2) {
      // Box 2 (6 Referrals)
      if (r < 60.0) {
        return { type: 'hash', amount: 1000, label: '1,000 Power', icon: '⚡', rarity: 'CYBER POWER', color: '#8b5cf6' }
      } else if (r < 90.0) {
        return { type: 'hash', amount: 500, label: '500 Power', icon: '⚡', rarity: 'BOOST POWER', color: '#3b82f6' }
      } else if (r < 98.0) {
        return { type: 'gram', amount: 0.01, label: '0.01 GRAM', icon: '💎', rarity: 'CRYPTO', color: '#f59e0b' }
      } else {
        return { type: 'usdt', amount: 0.01, label: '0.01 USDT', icon: '💵', rarity: 'CASH', color: '#10b981' }
      }
    } else if (tierId === 3) {
      // Box 3 (15 Referrals)
      if (r < 70.0) {
        return { type: 'hash', amount: 500, label: '500 Power', icon: '⚡', rarity: 'REACTOR POWER', color: '#f59e0b' }
      } else if (r < 90.0) {
        return { type: 'hash', amount: 250, label: '250 Power', icon: '⚡', rarity: 'BASE POWER', color: '#06b6d4' }
      } else if (r < 98.0) {
        return { type: 'gram', amount: 0.01, label: '0.01 GRAM', icon: '💎', rarity: 'CRYPTO', color: '#8b5cf6' }
      } else {
        return { type: 'usdt', amount: 1.00, label: '1.00 USDT', icon: '💰', rarity: '🔥 JACKPOT CASH', color: '#10b981' }
      }
    } else if (tierId === 4) {
      // Box 4 (35 Referrals - Diminishing Returns)
      if (r < 75.0) {
        return { type: 'hash', amount: 250, label: '250 Power', icon: '⚡', rarity: 'POWER', color: '#3b82f6' }
      } else if (r < 95.0) {
        return { type: 'hash', amount: 100, label: '100 Power', icon: '⚡', rarity: 'POWER', color: '#94a3b8' }
      } else if (r < 99.0) {
        return { type: 'usdt', amount: 0.01, label: '0.01 USDT', icon: '💵', rarity: 'CASH', color: '#10b981' }
      } else {
        return { type: 'usdt', amount: 1.00, label: '1.00 USDT', icon: '💰', rarity: 'JACKPOT', color: '#ec4899' }
      }
    } else if (tierId === 5) {
      // Box 5 (75 Referrals)
      if (r < 80.0) {
        return { type: 'hash', amount: 250, label: '250 Power', icon: '⚡', rarity: 'POWER', color: '#ec4899' }
      } else if (r < 95.0) {
        return { type: 'hash', amount: 100, label: '100 Power', icon: '⚡', rarity: 'POWER', color: '#94a3b8' }
      } else if (r < 99.0) {
        return { type: 'gram', amount: 0.01, label: '0.01 GRAM', icon: '💎', rarity: 'CRYPTO', color: '#f59e0b' }
      } else {
        return { type: 'usdt', amount: 5.00, label: '5.00 USDT', icon: '👑', rarity: '👑 ROYAL JACKPOT', color: '#ef4444' }
      }
    } else {
      // Box 6 (150 Referrals - Apex Milestone)
      if (r < 70.0) {
        return { type: 'hash', amount: 1000, label: '1,000 Power', icon: '⚡', rarity: 'APEX POWER', color: '#ef4444' }
      } else if (r < 95.0) {
        return { type: 'hash', amount: 500, label: '500 Power', icon: '⚡', rarity: 'POWER', color: '#f59e0b' }
      } else {
        return { type: 'usdt', amount: 5.00, label: '5.00 USDT', icon: '👑', rarity: '🔥 APEX CASH', color: '#10b981' }
      }
    }
  }

  // Open Crate Handler
  const handleOpenCrate = async (tier: CrateTierConfig) => {
    const isUnlocked = freshReferrals >= tier.requiredReferrals
    const isClaimed = claimedTierIds.includes(tier.tierId)

    if (!isUnlocked || isClaimed || claiming) return

    setActiveTier(tier)
    setIsOpeningModal(true)
    setUnboxPhase('charging')
    setClaiming(true)
    setShowConfetti(false)

    try {
      crateAudio.playSuspenseCharge()
    } catch (_) {}

    const rolled = rollDropPrize(tier.tierId)
    setWonPrize(rolled)

    // Build rolling roulette strip (35 cards)
    const candidates = [
      { label: '5,000 Power', icon: '⚡' },
      { label: '1,000 Power', icon: '⚡' },
      { label: '500 Power', icon: '⚡' },
      { label: '250 Power', icon: '⚡' },
      { label: '100 Power', icon: '⚡' },
      { label: '0.001 GRAM', icon: '💎' },
      { label: '0.01 USDT', icon: '💵' },
      { label: '1.00 USDT', icon: '💰' },
      { label: '5.00 USDT', icon: '👑' },
    ]

    const strip: any[] = []
    for (let i = 0; i < 35; i++) {
      const rand = candidates[Math.floor(Math.random() * candidates.length)]
      strip.push({ ...rand, id: 'card-' + i })
    }
    strip[28] = {
      label: rolled.label,
      icon: rolled.icon,
    }
    setReelItems(strip)

    setTimeout(() => {
      setUnboxPhase('spinning')
      try {
        crateAudio.playRouletteTick()
      } catch (_) {}

      setTimeout(async () => {
        setUnboxPhase('revealed')
        setShowConfetti(true)

        try {
          crateAudio.playBoxBurst()
          crateAudio.playWinFanfare(true)
          crateAudio.playCoins()
        } catch (_) {}

        // Credit single prize to user account via backend API
        try {
          await claimSpinReward(rolled.type, rolled.label, rolled.amount, 'crate_' + tier.tierId + '_' + Date.now())
          await refreshUser()
        } catch (err) {
          console.warn('Failed to auto-credit prize to backend:', err)
        }

        const updatedClaimed = [...claimedTierIds, tier.tierId]
        setClaimedTierIds(updatedClaimed)
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedClaimed))
        } catch (_) {}

        setClaiming(false)
      }, 3000)
    }, 600)
  }

  const handleShare = () => {
    const text = '🎁 Open your Mystery Loot Crate on HashBee! Get 1,000 to 5,000 Cloud Mining Power free: '
    const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(referralLink) + '&text=' + encodeURIComponent(text)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const nextTier = CRATE_TIERS.find((t) => freshReferrals < t.requiredReferrals)
  const remainingForNext = nextTier ? nextTier.requiredReferrals - freshReferrals : 0

  return (
    <div className="mb-4 select-none">
      {/* ── 1. LIVE RECENT WINS TICKER (Social Proof) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 mb-3 overflow-hidden shadow-inner flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          LIVE DROPS
        </span>
        <div className="flex-1 overflow-x-auto no-scrollbar whitespace-nowrap text-[10px] font-mono text-slate-300">
          <div className="inline-flex gap-4">
            {recentWins.map((w, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">{w.name}</span>
                <span className="text-slate-500">unboxed</span>
                <span className="text-amber-300 font-black">{w.won}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. HERO CAMPAIGN CARD ── */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/50 shadow-xl text-white relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-2 relative z-10">
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold flex items-center gap-1 shadow-sm">
            <span>🔥</span>
            <span>1 INVITE = 1 CRATE (FRESH CAMPAIGN)</span>
          </span>

          <div className="bg-slate-800/80 border border-amber-400/40 px-2 py-0.5 rounded-xl text-[10px] font-mono font-bold text-amber-300">
            ⚡ {freshReferrals} Fresh Invites
          </div>
        </div>

        {/* Headline & Rules Description */}
        <h2 className="text-sm font-black text-white tracking-wide uppercase mb-1 relative z-10">
          Referral Crate Roulette
        </h2>
        <p className="text-[11px] text-slate-300 leading-relaxed mb-3 relative z-10">
          Early invites give <strong className="text-amber-300">BIG 1k-5k Power rewards</strong>! Each crate gives <strong className="text-white underline">ONE</strong> prize (Power, USDT, or GRAM). More referrals scale down smoothly for an infinite loop!
        </p>

        {/* Dynamic Urgency Box */}
        {nextTier && (
          <div className="relative z-10 bg-black/40 border border-amber-500/30 rounded-2xl p-2.5 mb-3 flex items-center justify-between gap-2 shadow-inner">
            <div className="text-left">
              <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider block">
                ⚡ Next Unlock: Only {remainingForNext} more invite{remainingForNext > 1 ? 's' : ''}!
              </span>
              <span className="text-[11px] font-bold text-white">
                {nextTier.tierName} ({nextTier.headlineDrop})
              </span>
            </div>

            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-md active:scale-95"
            >
              INVITE NOW
            </button>
          </div>
        )}

        {/* ── 3. MILESTONE CARDS GRID (Roadmap 1 -> 150) ── */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          {CRATE_TIERS.map((tier) => {
            const isUnlocked = freshReferrals >= tier.requiredReferrals
            const isClaimed = claimedTierIds.includes(tier.tierId)
            const canClaim = isUnlocked && !isClaimed

            return (
              <div
                key={tier.tierId}
                className={'rounded-2xl p-2.5 flex flex-col justify-between transition-all border ' +
                  (canClaim
                    ? 'bg-gradient-to-b from-indigo-900 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse'
                    : isClaimed
                    ? 'bg-slate-900/60 border-slate-800 opacity-75'
                    : 'bg-slate-900/90 border-slate-800')}
              >
                {/* Badge & Status */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {tier.badge}
                  </span>
                  {isClaimed ? (
                    <span className="text-[9px] font-bold text-emerald-400">Claimed ✓</span>
                  ) : canClaim ? (
                    <span className="text-[9px] font-black text-cyan-300 animate-bounce">READY!</span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500">🔒 {freshReferrals}/{tier.requiredReferrals}</span>
                  )}
                </div>

                {/* Crate Visual & Reward */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border ' +
                    (canClaim ? 'bg-cyan-500/20 border-cyan-400' : 'bg-slate-800 border-slate-700')}>
                    {tier.icon}
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-[10px] font-black text-white truncate leading-tight">
                      {tier.tierName}
                    </span>
                    <span className="text-[9px] font-bold text-amber-300 truncate font-mono">
                      {tier.headlineDrop}
                    </span>
                  </div>
                </div>

                {/* Button / Progress */}
                {canClaim ? (
                  <button
                    onClick={() => handleOpenCrate(tier)}
                    disabled={claiming}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>💥 OPEN NOW</span>
                  </button>
                ) : isClaimed ? (
                  <div className="w-full py-1 rounded-xl bg-slate-800 text-emerald-400 text-center font-bold text-[9px] uppercase">
                    Opened ✓
                  </div>
                ) : (
                  <div className="w-full bg-slate-950 rounded-xl p-1 border border-slate-800">
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: Math.min(100, (freshReferrals / tier.requiredReferrals) * 100) + '%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 4. INFINITE LOOP FOOTNOTE ── */}
        <div className="mt-3 relative z-10 p-2 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between text-left gap-2">
          <div>
            <span className="block text-[9px] font-black text-white uppercase tracking-wider">
              ♾️ Continuous Loop Active
            </span>
            <span className="block text-[8px] text-slate-400">
              Early referrals give huge 1k-5k power; high volume scales down to sustainable rewards.
            </span>
          </div>
          <span className="text-[8px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0">
            Loop
          </span>
        </div>
      </div>

      {/* ── 5. CASINO ROULETTE REEL UNBOXING MODAL ── */}
      {isOpeningModal && activeTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
          {showConfetti && <ReactConfetti numberOfPieces={120} recycle={false} />}
          <div className="relative w-full max-w-sm rounded-3xl bg-[#0f172a] border-2 border-cyan-400 p-5 text-white shadow-2xl overflow-hidden text-center">
            {/* Header */}
            <div className="mb-3">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono">
                {activeTier.badge} • UNBOXING
              </span>
              <h3 className="text-base font-black text-white mt-1 uppercase tracking-wide">
                {activeTier.tierName}
              </h3>
            </div>

            {unboxPhase !== 'revealed' ? (
              <div className="py-4">
                {/* 3D Animated Crate */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-900 to-slate-900 border-2 border-cyan-400 flex items-center justify-center text-4xl shadow-2xl animate-bounce">
                  {activeTier.icon}
                </div>

                <span className="text-xs font-black text-cyan-300 uppercase tracking-widest block mb-3 animate-pulse">
                  {unboxPhase === 'charging' ? '⚡ CHARGING REEL...' : '🎰 SPINNING FOR 1 PRIZE...'}
                </span>

                {/* Roulette Reel Strip */}
                <div className="relative w-full h-14 bg-black border-y-2 border-cyan-500/60 overflow-hidden flex items-center justify-center rounded-xl shadow-inner">
                  {/* Golden Payline Indicator */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-amber-400 z-20 shadow-[0_0_8px_#f59e0b]" />

                  {/* Scrolling Strip */}
                  <div
                    className="flex items-center gap-2 px-3 transition-transform duration-[3000ms] ease-out"
                    style={{
                      transform: unboxPhase === 'spinning' ? 'translateX(-1800px)' : 'translateX(0px)',
                    }}
                  >
                    {reelItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="w-24 h-10 rounded-lg bg-slate-900 border border-cyan-500/40 shrink-0 flex items-center justify-center gap-1.5 px-2"
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-[9px] font-black text-white truncate max-w-[60px]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* REVEALED PRIZE CARD (EXACTLY ONE REWARD WON) */
              <div className="py-2 animate-scaleUp">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2px] shadow-2xl mb-2">
                  <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-3xl">
                    {wonPrize?.icon || '👑'}
                  </div>
                </div>

                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono inline-block mb-1"
                  style={{ background: wonPrize?.color || '#06b6d4', color: '#fff' }}
                >
                  {wonPrize?.rarity || 'REWARD'}
                </span>

                <h2 className="text-lg font-black text-white uppercase tracking-wide mb-1">
                  YOU UNBOXED:
                </h2>
                <div className="text-2xl font-black text-amber-300 font-mono mb-4">
                  {wonPrize?.label}
                </div>

                <p className="text-[11px] text-slate-300 mb-4">
                  ✅ Credited directly to your account balance!
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsOpeningModal(false)
                      handleShare()
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                  >
                    🚀 SHARE & UNLOCK NEXT CRATE ➔
                  </button>

                  <button
                    onClick={() => setIsOpeningModal(false)}
                    className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs uppercase cursor-pointer hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
