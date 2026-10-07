import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageModal } from '../components/LanguageModal'
import { claimHoney, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DepositModal } from '../components/DepositModal'

export const Home: React.FC = () => {
  const { user, refreshUser, loading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [showLangModal, setShowLangModal] = useState(false)
  const navigate = useNavigate()

  const [claiming, setClaiming] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingBalance, setPendingBalance] = useState<number>(0)

  const ghs = user?.bee_power || 50
  // 100 GHS = 0.05 GRAM/USDT per day
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
  const cyclePercent = Math.min(100, Math.max(5, (elapsedSec / 86400) * 100))

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Cute Robot Icon */}
          <div className="w-11 h-11 rounded-2xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-2xl shadow-sm">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-[#0f172a] tracking-tight">
                Crypto <span className="text-[#0088ff]">Mine</span>
              </h1>
              {/* Verified Blue Checkmark Badge */}
              <div className="w-4 h-4 rounded-full bg-[#0088ff] flex items-center justify-center text-white text-[9px] font-black">
                ✓
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.2">
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
            className="w-9 h-9 rounded-full bg-[#0088ff] text-white flex items-center justify-center shadow-sm active:scale-95"
            title="Channel"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── CARD 1: TOTAL BALANCE (VIVID OCEAN BLUE GRADIENT) ── */}
      <div className="mine-hero-card p-5 mb-3.5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs">
              💳
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-white/90 uppercase">
              TOTAL BALANCE
            </span>
          </div>

          {/* NFT Balance */}
          <div className="px-2.5 py-1 rounded-xl bg-black/25 backdrop-blur-md text-right">
            <span className="text-[8px] font-bold text-white/70 uppercase block leading-none">NFT BALANCE</span>
            <span className="text-xs font-extrabold text-white font-mono mt-0.5 block">0.00 <span className="text-[9px] text-[#00f090]">USDT</span></span>
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {userBalance.toFixed(4)}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white font-extrabold text-xs">
            USDT
          </span>
        </div>

        {/* Bottom Row */}
        <div className="mt-4 flex items-center justify-between pt-1">
          <div className="px-3 py-1.5 rounded-xl bg-black/25 backdrop-blur-md flex items-center gap-1.5 text-xs text-white">
            <span className="text-[#00f090] font-black">↑</span>
            <span className="text-white/80 font-medium text-[11px]">Mining</span>
            <span className="text-[#00f090] font-extrabold font-mono text-[11px]">+{earningsPerDay.toFixed(4)} USDT/d</span>
          </div>

          <button
            onClick={() => navigate('/withdraw')}
            className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold flex items-center gap-1 border border-white/30 backdrop-blur-md transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* ── CARD 2: YOUR NFT MINER ─────────────────────────────── */}
      <div className="mine-card p-4.5 mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs">
              ⬡
            </div>
            <h2 className="text-sm font-extrabold text-[#0f172a]">
              Your NFT Miner
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#d1fae5] text-[#059669] text-[10px] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
            Active
          </span>
        </div>

        {/* Miner Profile */}
        <div className="flex items-center gap-3 mb-3.5">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] p-0.5 shadow-md flex-shrink-0 flex items-center justify-center text-3xl">
            🤖
            <div className="absolute -bottom-1.5 px-2 py-0.2 bg-[#7c3aed] text-white text-[8px] font-black rounded-full uppercase tracking-wider shadow">
              Level 1
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-extrabold text-[#0f172a]">
                Free Starter Miner
              </h3>
              <span className="px-2 py-0.2 rounded-full bg-[#f3e8ff] text-[#7c3aed] text-[9px] font-black uppercase">
                COMMON
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[#0088ff] flex items-center gap-1 mt-0.5">
              <span>⚡</span> Auto-Mining Hashrate Active ({ghs} GHS)
            </p>
          </div>
        </div>

        {/* 3 Stats Row */}
        <div className="grid grid-cols-3 gap-2 bg-[#f8fafc] border border-slate-100 rounded-2xl p-2.5 text-center mb-3">
          <div>
            <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              Daily Reward
            </div>
            <div className="text-xs font-black text-[#0f172a] font-mono mt-0.5">
              {earningsPerDay.toFixed(4)} USDT
            </div>
          </div>

          <div className="border-x border-slate-200">
            <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0088ff]"></span>
              Total Claim
            </div>
            <div className="text-xs font-black text-[#0f172a] font-mono mt-0.5">
              {userBalance.toFixed(4)} USDT
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></span>
              Mining Cycle
            </div>
            <div className="text-xs font-black text-[#0f172a] mt-0.5">
              24 Hours
            </div>
          </div>
        </div>

        {/* Mining Duration Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1.5">
            <span>Mining Duration</span>
            <span className="font-extrabold text-[#0f172a]">{cycleHours}h {cycleMins}m / 24 Hours</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d68f] to-[#0088ff] rounded-full transition-all duration-300"
              style={{ width: `${cyclePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CARD 3: CLAIM MINING (VIBRANT MINT GRADIENT BAR) ── */}
      <div
        onClick={handleClaim}
        className="claim-bar-btn p-4 mb-3.5 flex items-center justify-between cursor-pointer shadow-lg active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center text-xl shrink-0">
            ⚔️
          </div>
          <div>
            <div className="text-sm font-black text-[#042f20] leading-tight">
              Claim Mining
            </div>
            <div className="text-xs font-extrabold text-[#042f20]/80 font-mono mt-0.5">
              +{pendingBalance.toFixed(6)} USDT Mining
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-[#042f20] font-black text-sm">
          ➔
        </div>
      </div>

      {/* ── 3 ACTION GRID CARDS: DEPOSIT / WITHDRAW / REFERRAL ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {/* Deposit Card */}
        <div
          onClick={() => setShowDepositModal(true)}
          className="mine-card p-3 flex flex-col justify-between cursor-pointer hover:border-emerald-200 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0f172a]">Deposit</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black shadow-sm">
              +
            </div>
          </div>
          <div className="mt-4">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-extrabold">
              Add USDT
            </span>
          </div>
        </div>

        {/* Withdraw Card */}
        <div
          onClick={() => navigate('/withdraw')}
          className="mine-card p-3 flex flex-col justify-between cursor-pointer hover:border-blue-200 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0f172a]">Withdraw</span>
            <div className="w-7 h-7 rounded-full bg-[#0088ff] text-white flex items-center justify-center text-sm font-black shadow-sm">
              ↓
            </div>
          </div>
          <div className="mt-4">
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#0088ff] text-[10px] font-extrabold">
              Get Profit
            </span>
          </div>
        </div>

        {/* Referral Card */}
        <div
          onClick={() => navigate('/earn')}
          className="mine-card p-3 flex flex-col justify-between cursor-pointer hover:border-purple-200 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0f172a]">Referral</span>
            <div className="w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-xs font-black shadow-sm">
              👥
            </div>
          </div>
          <div className="mt-4">
            <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] text-[10px] font-extrabold">
              Invite & Earn
            </span>
          </div>
        </div>
      </div>

      {/* ── BANNER: INVITE FRIEND / EARN MORE ─────────────────── */}
      <div
        onClick={() => navigate('/earn')}
        className="mine-card p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-3xl shadow-lg flex items-center justify-between cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
            🤖
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-purple-200">
              VIRAL REWARDS
            </div>
            <div className="text-sm font-black leading-tight">
              Invite Friends & Earn +3 GHS
            </div>
            <div className="text-[10px] text-white/80 mt-0.5">
              Up to +500 GHS Power bonus on team milestones!
            </div>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-white text-[#7c3aed] text-xs font-black shadow-sm">
          ➔
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
