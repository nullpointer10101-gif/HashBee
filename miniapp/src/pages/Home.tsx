import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageModal } from '../components/LanguageModal'
import { claimHoney } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DepositModal } from '../components/DepositModal'
import robotMinerImg from '../assets/images/robot_miner.jpg'
import inviteBannerImg from '../assets/images/invite_banner.jpg'

export const Home: React.FC = () => {
  const { user, refreshUser, loading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [showLangModal, setShowLangModal] = useState(false)
  const navigate = useNavigate()

  const [claiming, setClaiming] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingBalance, setPendingBalance] = useState<number>(0)

  const ghs = user?.bee_power || 50
  // 100 GHS = 0.05 GRAM/USDT per day (0.0005 per GHS)
  const earningsPerDay = ghs * 0.0005
  const earningsPerSecond = earningsPerDay / 86400

  // Calculate live pending balance dynamically from last collection time
  useEffect(() => {
    if (!user) return

    const calculateCurrent = () => {
      const lastCollectTime = user.last_claimed_at ? new Date(user.last_claimed_at).getTime() : Date.now()
      const elapsedSeconds = Math.max(0, (Date.now() - lastCollectTime) / 1000)
      const earned = elapsedSeconds * earningsPerSecond
      return Math.max(user.current_unclaimed_honey || 0, earned)
    }

    setPendingBalance(calculateCurrent())

    const interval = setInterval(() => {
      setPendingBalance(calculateCurrent())
    }, 100)

    return () => clearInterval(interval)
  }, [user?.last_claimed_at, user?.current_unclaimed_honey, earningsPerSecond])

  const handleClaim = async () => {
    if (pendingBalance < 0.001 || claiming) {
      toast.error('Minimum claim is 0.001 USDT')
      return
    }

    setClaiming(true)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      const res = await claimHoney()
      toast.success(`🎉 Claimed +${res.claimed.toFixed(6)} USDT to balance!`)
      setPendingBalance(0)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to claim mining yield')
    } finally {
      setClaiming(false)
    }
  }

  // Calculate mining cycle progress (24 hour loop)
  const lastTime = user?.last_claimed_at ? new Date(user.last_claimed_at).getTime() : Date.now()
  const elapsedSec = Math.floor(Math.max(0, (Date.now() - lastTime) / 1000)) % 86400
  const cycleHours = Math.floor(elapsedSec / 3600)
  const cycleMins = Math.floor((elapsedSec % 3600) / 60)
  const cyclePercent = Math.min(100, Math.max(8, (elapsedSec / 86400) * 100))

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div className="w-8 h-8 border-3 border-[#0066ff] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Crypto Mine...
        </p>
      </div>
    )
  }

  const userBalance = user?.honey_balance || 0

  return (
    <div className="pb-28 pt-3 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a] font-sans">
      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          {/* Cute Robot Icon */}
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-[#bae6fd] shadow-sm flex-shrink-0 bg-blue-100 flex items-center justify-center text-xl">
            <img
              src={robotMinerImg}
              alt="Crypto Mine"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-[#0f172a] tracking-tight">
                Crypto <span className="text-[#0088ff]">Mine</span>
              </h1>
              {/* Verified Blue Checkmark Badge */}
              <div className="w-4 h-4 rounded-full bg-[#0088ff] flex items-center justify-center text-white text-[9px] font-black shadow-sm">
                ✓
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Mine • Earn • Grow
            </div>
          </div>
        </div>

        {/* Right Circle Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLangModal(true)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm active:scale-95"
            title="Language"
          >
            {currentLanguage.flag}
          </button>
          <a
            href="https://t.me/Bonkcs99"
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:text-[#0088ff] active:scale-95"
            title="Support"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </a>
          <a
            href="https://t.me/+L4xApdSQJkA3N2Rl"
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-[#0088ff] text-white flex items-center justify-center shadow-md active:scale-95"
            title="Channel"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── CARD 1: TOTAL BALANCE (LUXURY OCEAN BLUE HERO WITH DYNAMIC CRYSTAL LIGHT) ── */}
      <div className="mine-hero-card p-5 mb-3.5 relative overflow-hidden">
        {/* Dynamic Glowing Mesh in Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.3)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-sm shadow-sm">
              💳
            </div>
            <span className="text-[11px] font-black tracking-widest text-white/90 uppercase">
              TOTAL BALANCE
            </span>
          </div>

          {/* NFT Balance Badge */}
          <div className="px-3 py-1 rounded-xl bg-black/35 backdrop-blur-md text-right border border-white/15">
            <span className="text-[8px] font-bold text-white/70 uppercase block leading-none">NFT POWER</span>
            <span className="text-xs font-black text-[#00f090] font-mono mt-0.5 block">{ghs.toFixed(0)} <span className="text-[9px] text-white/80 font-sans">GHS</span></span>
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="mt-3.5 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-sm">
            {userBalance.toFixed(4)}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/20 text-white font-black text-xs font-mono">
            USDT
          </span>
        </div>

        {/* Bottom Row */}
        <div className="mt-4 flex items-center justify-between pt-1 relative z-10">
          <div className="px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-xs text-white">
            <span className="text-[#00f090] font-black">↑</span>
            <span className="text-white/80 font-semibold text-[11px]">Yield:</span>
            <span className="text-[#00f090] font-black font-mono text-[11px]">+{earningsPerDay.toFixed(4)} USDT/d</span>
          </div>

          <button
            onClick={() => navigate('/withdraw')}
            className="px-4 py-1.5 rounded-xl bg-white text-[#0052d4] hover:bg-slate-100 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <span>Withdraw</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── CARD 2: YOUR ACTIVE NFT MINER (LARGE PROPER 3D SHOWCASE) ── */}
      <div className="mine-card p-4.5 mb-3.5 relative overflow-hidden">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs">
              ⬡
            </div>
            <h2 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wide">
              Your Active NFT Miner
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE NOW
          </span>
        </div>

        {/* Large NFT Showcase Box */}
        <div className="flex items-center gap-3.5 bg-gradient-to-r from-slate-50 via-purple-50/40 to-blue-50/40 p-3 rounded-2xl border border-slate-200/90 mb-3.5">
          {/* Large Proper Preview Frame */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-[#7c3aed]/40 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 flex items-center justify-center group">
            <img
              src={robotMinerImg}
              alt="Free Starter Miner"
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
            {/* Holographic corner badge */}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[8px] font-black text-amber-300 border border-amber-400/30">
              LVL 1
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-950 truncate">
                Starter Bee Miner
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#7c3aed] border border-purple-200 text-[9px] font-black uppercase tracking-wider">
                COMMON NFT
              </span>
            </div>
            
            <p className="text-[11px] font-extrabold text-[#0088ff] flex items-center gap-1.5 mt-1">
              <span className="inline-block animate-bounce">⚡</span> 
              <span>Auto-Mining:</span>
              <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[#0066ff]">
                {ghs} GHS
              </span>
            </p>

            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              Contract: <b className="text-slate-800">24H Guaranteed Auto-Cycle</b>
            </div>
          </div>
        </div>

        {/* 3 Stats Row */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#f8fafc] border border-slate-200 rounded-2xl p-2.5 text-center mb-3">
          <div className="px-1">
            <div className="text-[9px] text-slate-400 font-black uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0"></span>
              <span className="truncate">Daily Yield</span>
            </div>
            <div className="text-xs font-black text-[#0f172a] font-mono mt-0.5 truncate">
              {earningsPerDay.toFixed(4)}
            </div>
          </div>

          <div className="border-x border-slate-200 px-1">
            <div className="text-[9px] text-slate-400 font-black uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0088ff] shrink-0"></span>
              <span className="truncate">Total Claimed</span>
            </div>
            <div className="text-xs font-black text-[#0f172a] font-mono mt-0.5 truncate">
              {userBalance.toFixed(4)}
            </div>
          </div>

          <div className="px-1">
            <div className="text-[9px] text-slate-400 font-black uppercase flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shrink-0"></span>
              <span className="truncate">Cycle</span>
            </div>
            <div className="text-xs font-black text-[#0f172a] mt-0.5 truncate font-mono">
              24 Hours
            </div>
          </div>
        </div>

        {/* Mining Duration Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1.5">
            <span>Mining Progress</span>
            <span className="font-extrabold text-[#0f172a] font-mono">{cycleHours}h {cycleMins}m / 24h</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full bg-gradient-to-r from-[#00d68f] via-[#00c6ff] to-[#0088ff] rounded-full transition-all duration-300"
              style={{ width: `${cyclePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CARD 3: CLAIM MINING (VIBRANT MINT GRADIENT BAR) ── */}
      <div
        onClick={handleClaim}
        className="claim-bar-btn p-3.5 sm:p-4 mb-3.5 flex items-center justify-between cursor-pointer shadow-lg active:scale-98 transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center text-xl shrink-0">
            ⚔️
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-[#042f20] leading-tight">
              Claim Mining
            </div>
            <div className="text-[11px] font-black text-[#042f20]/90 font-mono mt-0.5 truncate">
              +{pendingBalance.toFixed(6)} USDT Mining
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-[#042f20] font-black text-sm shrink-0 ml-2">
          ➔
        </div>
      </div>

      {/* ── 3 VIBRANT ACTION GRID CARDS: DEPOSIT / WITHDRAW / REFERRAL ── */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        {/* Deposit Card (Emerald Green) */}
        <div
          onClick={() => setShowDepositModal(true)}
          className="card-tint-emerald p-2.5 sm:p-3 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-emerald-400 active:scale-95 transition-all min-h-[96px]"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-black text-emerald-950">Deposit</span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-xs font-black shadow-md">
              +
            </div>
          </div>
          <div className="mt-2 relative z-10">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-[9px] sm:text-[10px] font-extrabold inline-block shadow-sm truncate max-w-full">
              Add USDT
            </span>
          </div>
        </div>

        {/* Withdraw Card (Ruby Red / Rose) */}
        <div
          onClick={() => navigate('/withdraw')}
          className="card-tint-red p-2.5 sm:p-3 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-rose-400 active:scale-95 transition-all min-h-[96px]"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-black text-rose-950">Withdraw</span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center text-xs font-black shadow-md">
              ↓
            </div>
          </div>
          <div className="mt-2 relative z-10">
            <span className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[9px] sm:text-[10px] font-extrabold inline-block shadow-sm truncate max-w-full">
              Get Profit
            </span>
          </div>
        </div>

        {/* Referral Card (Royal Purple) */}
        <div
          onClick={() => navigate('/earn')}
          className="card-tint-purple p-2.5 sm:p-3 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-purple-400 active:scale-95 transition-all min-h-[96px]"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-black text-purple-950">Referral</span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white flex items-center justify-center text-xs font-black shadow-md">
              👥
            </div>
          </div>
          <div className="mt-2 relative z-10">
            <span className="px-2 py-0.5 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 text-[9px] sm:text-[10px] font-extrabold inline-block shadow-sm truncate max-w-full">
              Invite & Earn
            </span>
          </div>
        </div>
      </div>

      {/* ── 2 QUICK PLAY & EARN CARDS: LUCKY SPIN & MISSIONS ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        {/* Lucky Spin (Amber / Gold) */}
        <div
          onClick={() => navigate('/spin')}
          className="card-tint-amber p-3 relative overflow-hidden cursor-pointer hover:border-amber-400 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-sm shadow-sm">
              🎰
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 text-[8px] font-black uppercase">
              HOT JACKPOT
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-amber-950">Lucky Wheel Spin</h4>
          <p className="text-[10px] text-amber-900 font-semibold mt-0.5">Win up to 25 GRAM</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-amber-800">
            <span>SPIN NOW</span>
            <span>➔</span>
          </div>
        </div>

        {/* Missions & Tasks (Electric Blue / Cyan) */}
        <div
          onClick={() => navigate('/missions')}
          className="card-tint-blue p-3 relative overflow-hidden cursor-pointer hover:border-blue-400 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0088ff] to-[#00c6ff] text-white flex items-center justify-center text-sm shadow-sm">
              🎯
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-200/90 text-blue-950 text-[8px] font-black uppercase">
              FREE GHS
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-blue-950">Daily Missions</h4>
          <p className="text-[10px] text-blue-900 font-semibold mt-0.5">Watch ads & earn power</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-[#0066ff]">
            <span>COMPLETE</span>
            <span>➔</span>
          </div>
        </div>
      </div>

      {/* ── BANNER: INVITE FRIEND / EARN MORE ─────────────────── */}
      <div
        onClick={() => navigate('/earn')}
        className="mine-card p-0 relative overflow-hidden text-white rounded-3xl shadow-lg cursor-pointer active:scale-98 transition-all border border-purple-200/50 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899]"
      >
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={inviteBannerImg}
            alt="Invite Friends"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent flex items-center justify-between p-4">
            <div className="max-w-[72%] pr-2">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">
                VIRAL HASHRATE BOOST
              </span>
              <h4 className="text-sm sm:text-base font-black text-white leading-tight mt-1 drop-shadow-sm">
                Invite Friends & Earn
              </h4>
              <p className="text-[10px] text-indigo-100 font-semibold mt-0.5 line-clamp-1">
                Instant +3 GHS per friend + milestone rewards!
              </p>
            </div>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#7c3aed] flex items-center justify-center font-black text-sm shadow-md shrink-0">
              ➔
            </div>
          </div>
        </div>
      </div>

      {/* Language Modal */}
      <LanguageModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />

      {/* Deposit Modal */}
      <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
    </div>
  )
}

export default Home
