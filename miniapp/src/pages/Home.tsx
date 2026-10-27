import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageModal } from '../components/LanguageModal'
import { claimHoney, fetchMyPlans, UserPlanItem } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DepositModal } from '../components/DepositModal'
import { NftMinerAvatar } from '../components/NftMinerAvatar'
import { TeslaMiningBanner } from '../components/TeslaMiningBanner'
import inviteBannerImg from '../assets/images/invite_banner.jpg'

export const Home: React.FC = () => {
  const { user, refreshUser, loading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [showLangModal, setShowLangModal] = useState(false)
  const navigate = useNavigate()

  const [claiming, setClaiming] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingBalance, setPendingBalance] = useState<number>(0)
  const [myPlans, setMyPlans] = useState<UserPlanItem[]>([])

  useEffect(() => {
    fetchMyPlans().then(setMyPlans).catch(() => {})
  }, [user])

  // 24H Flash Miner Countdown Timer & 500 Dynamic Slots (Round 2: 10 TON -> 25 GRAM)
  const TOTAL_FLASH_SLOTS = 500
  const [selectedFlashRound, setSelectedFlashRound] = useState<1 | 2>(2)
  const [flashTimeLeft, setFlashTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isEnded: boolean }>({
    hours: 23,
    minutes: 48,
    seconds: 15,
    isEnded: false,
  })
  const [flashSlots, setFlashSlots] = useState<{ filled: number; left: number }>({
    filled: 318,
    left: 182,
  })

  useEffect(() => {
    let liveRandomBonus = 0

    // Consistent session deadline for Round 2: stored in localStorage so it ticks naturally for 24 hours
    const getDeadline = () => {
      try {
        const stored = localStorage.getItem('hb_flash_round2_end')
        if (stored) {
          const val = parseInt(stored, 10)
          if (val > Date.now()) return val
        }
      } catch (_) {}
      const dl = Date.now() + (23 * 3600 + 48 * 60 + 30) * 1000
      try {
        localStorage.setItem('hb_flash_round2_end', String(dl))
      } catch (_) {}
      return dl
    }

    const targetDeadline = getDeadline()
    const totalDuration = 24 * 3600 * 1000
    const startTime = targetDeadline - totalDuration

    const calcTimerAndSlots = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((targetDeadline - now) / 1000))

      if (diff <= 0) {
        setFlashTimeLeft({ hours: 0, minutes: 0, seconds: 0, isEnded: true })
        setFlashSlots({ filled: TOTAL_FLASH_SLOTS, left: 0 })
        return
      }

      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60
      setFlashTimeLeft({ hours, minutes, seconds, isEnded: false })

      // Calculate smooth progression across 24 hours (0 at start, 1 at end)
      const elapsed = Math.max(0, Math.min(totalDuration, now - startTime))
      const progress = elapsed / totalDuration

      // Base slots filled starts around ~290 (58%) and curves up naturally to ~488 (97.6%) out of 500
      const baseFilled = Math.floor(290 + 196 * Math.pow(progress, 0.75))
      const wave = Math.floor(((Math.sin(now / 30000) + 1) / 2) * 4)
      const finalFilled = Math.min(TOTAL_FLASH_SLOTS - 2, baseFilled + wave + liveRandomBonus)
      const finalLeft = Math.max(2, TOTAL_FLASH_SLOTS - finalFilled)

      setFlashSlots({ filled: finalFilled, left: finalLeft })
    }

    calcTimerAndSlots()
    const timer = setInterval(calcTimerAndSlots, 1000)

    // Random slot fill-up live ticker: every 11 seconds someone claims a slot
    const randomInterval = setInterval(() => {
      if (Math.random() > 0.25) {
        liveRandomBonus += 1
      }
    }, 11000)

    return () => {
      clearInterval(timer)
      clearInterval(randomInterval)
    }
  }, [])

  const isGauravSoni =
    user?.telegram_id === 8842934236 ||
    String(user?.telegram_id).trim() === '8842934236' ||
    (user?.first_name?.toLowerCase().includes('gaurav') && (user?.last_name?.toLowerCase().includes('soni') || user?.telegram_id === 8842934236))

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

  const claimingRef = React.useRef(false)

  const handleClaim = async () => {
    if (claimingRef.current || claiming) return
    if (pendingBalance < 0.0099) {
      toast.error('Minimum claim amount is 0.01 USDT')
      return
    }

    claimingRef.current = true
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
      setTimeout(() => {
        claimingRef.current = false
      }, 500)
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
          Loading HashBee...
        </p>
      </div>
    )
  }

  const LIVE_DEPOSIT_EVENTS = [
    { user: '@ton_whale99', action: 'Deposited 5.0 TON', benefit: '+2,600 GHS Power', time: '2m ago', icon: '💎' },
    { user: '@crypto_alex', action: 'Upgraded Titan Vanguard', benefit: '+10,400 GHS', time: '4m ago', icon: '🤖' },
    { user: '@sergey_ton', action: 'Deposited 1.0 TON', benefit: '+520 GHS Power', time: '7m ago', icon: '⚡' },
    { user: '@tonkeeper_pro', action: 'Activated Quantum Drone', benefit: '+1,560 GHS', time: '9m ago', icon: '🚀' },
    { user: '@mikhail_v', action: 'Claimed 24H Yield', benefit: '+15.60 USDT', time: '12m ago', icon: '💸' },
    { user: '@ton_miner01', action: 'Deposited 3.0 TON', benefit: '+1,560 GHS Power', time: '15m ago', icon: '🔥' },
  ]
  const [liveEventIndex, setLiveEventIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveEventIndex((prev) => (prev + 1) % LIVE_DEPOSIT_EVENTS.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [LIVE_DEPOSIT_EVENTS.length])

  const activeEvent = LIVE_DEPOSIT_EVENTS[liveEventIndex]
  const userBalance = user?.honey_balance || 0

  return (
    <div className="pb-28 pt-3 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a] font-sans">
      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Robust 3D Robot Avatar */}
          <NftMinerAvatar planId="standard" size="sm" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-[#0f172a] tracking-tight">
                Hash<span className="text-[#0088ff]">Bee</span> 🐝
              </h1>
              {/* Verified Blue Checkmark Badge */}
              <div className="w-4 h-4 rounded-full bg-[#0088ff] flex items-center justify-center text-white text-[9px] font-black shadow-sm">
                ✓
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Cloud Miner Network
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

      {/* ── LIVE RECENT DEPOSIT TICKER (DOPAMINE / FOMO PROOF STREAM) ── */}
      <div className="mb-3.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white border border-slate-800 shadow-sm flex items-center justify-between text-xs overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping shrink-0" />
          <span className="text-base shrink-0">{activeEvent.icon}</span>
          <div className="truncate">
            <span className="font-bold text-slate-300">{activeEvent.user}</span>{' '}
            <span className="text-slate-400">{activeEvent.action}</span>{' '}
            <span className="font-black text-[#00f090] font-mono">({activeEvent.benefit})</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-mono">{activeEvent.time}</span>
      </div>

      {/* ── CARD 1: TOTAL BALANCE (LUXURY OBSIDIAN & EMERALD/GOLD CYBER VAULT) ── */}
      <div className="p-5 mb-3.5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0f1d] via-[#111c38] to-[#071329] text-white border border-cyan-500/25 shadow-xl">
        {/* Dynamic Multi-Color Glowing Mesh */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-sm shadow-sm">
              💳
            </div>
            <span className="text-[11px] font-black tracking-widest text-slate-300 uppercase">
              TOTAL BALANCE
            </span>
          </div>

          {/* NFT Balance Badge */}
          <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md text-right border border-white/15">
            <span className="text-[8px] font-bold text-slate-300 uppercase block leading-none">MINING POWER</span>
            <span className="text-xs font-black text-[#00f090] font-mono mt-0.5 block">{ghs.toFixed(0)} <span className="text-[9px] text-white/70 font-sans">GHS</span></span>
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="my-3 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow">
            {userBalance.toFixed(4)}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-white/15 border border-white/20 text-white font-black text-xs font-mono">
            USDT
          </span>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 relative z-10">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs text-white">
            <span className="text-[#00f090] font-black">↑</span>
            <span className="text-slate-300 font-semibold text-[11px]">Yield:</span>
            <span className="text-[#00f090] font-black font-mono text-[11px]">+{earningsPerDay.toFixed(4)} USDT/d</span>
          </div>

          <button
            onClick={() => navigate('/withdraw')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0088ff] to-[#00c6ff] text-white hover:brightness-110 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <span>Withdraw</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 🚗 TESLA MINING: 1-TIME FREE 1 USDT CLAIM BANNER (TOP PROMINENT) ── */}
      <TeslaMiningBanner className="mb-3.5 shadow-2xl border-2 border-red-500/40" />

      {/* ── 🔥 MEGA HYPE 24H FLASH SALE NFT CARD (ALL USERS VISIBLE) ── */}
      <div
        onClick={() => {
          if (selectedFlashRound === 2 && !flashTimeLeft.isEnded) {
            navigate('/plans')
          }
        }}
        className={`p-4 mb-3.5 relative overflow-hidden rounded-3xl transition-all ${
          selectedFlashRound === 1 || flashTimeLeft.isEnded
            ? 'bg-gradient-to-r from-slate-900 via-stone-900 to-slate-950 text-slate-300 border-2 border-slate-700 shadow-md opacity-90'
            : 'bg-gradient-to-br from-amber-600 via-rose-600 to-red-600 text-white shadow-2xl shadow-red-500/30 border-2 border-amber-300 cursor-pointer active:scale-98'
        }`}
      >
        {/* Animated Background Rays */}
        {selectedFlashRound === 2 && !flashTimeLeft.isEnded && (
          <>
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-red-950/50 rounded-full blur-xl pointer-events-none" />
          </>
        )}

        {/* ── Round Switcher / History Selector ── */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 mb-2.5 relative z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedFlashRound(2)
            }}
            className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              selectedFlashRound === 2
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-rose-950 shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>🔥 {isGauravSoni ? 'VIP Offer (30 TON)' : 'Round 2 (10 TON)'} • ACTIVE</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedFlashRound(1)
            }}
            className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              selectedFlashRound === 1
                ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-md font-black scale-[1.02]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>⏳ Round 1 (4 TON) • ENDED</span>
          </button>
        </div>

        {/* Top Badges Row */}
        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-1.5">
            {selectedFlashRound === 2 && !flashTimeLeft.isEnded && (
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm ${
              selectedFlashRound === 1 || flashTimeLeft.isEnded
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : isGauravSoni
                ? 'bg-gradient-to-r from-amber-300 to-yellow-400 text-rose-950 font-black'
                : 'bg-white text-red-700'
            }`}>
              {selectedFlashRound === 1
                ? '⏳ ROUND 1 CONCLUDED'
                : flashTimeLeft.isEnded
                ? '⏳ 24H FLASH CONCLUDED'
                : isGauravSoni
                ? '🔥 EXCLUSIVE 24H VIP FLASH'
                : '🔥 24H FLASH DROP • ROUND 2'}
            </span>
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border font-mono ${
            selectedFlashRound === 1 || flashTimeLeft.isEnded
              ? 'text-slate-400 bg-black/40 border-slate-700'
              : 'text-amber-200 bg-black/35 border-white/15'
          }`}>
            {isGauravSoni && selectedFlashRound === 2 ? '+150.0% NET ROI (2.5X)' : '150% NET ROI'}
          </span>
        </div>

        {/* Offer Headline & Interactive NFT Avatar */}
        <div className="flex items-center gap-3 relative z-10 my-2">
          <div className="shrink-0">
            <NftMinerAvatar
              planId={selectedFlashRound === 2 ? 'flash10' : 'flash2x'}
              size="md"
              badgeText={isGauravSoni && selectedFlashRound === 2 ? 'VIP' : '2.5X'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black tracking-tight leading-snug uppercase text-white drop-shadow">
              {selectedFlashRound === 1
                ? 'Flash 2.5X Mega Hive (Round 1)'
                : isGauravSoni
                ? 'Flash 2.5X VIP Sovereign Hive'
                : 'Flash 2.5X Hyper Hive'}
            </h3>
            <p className={`text-[11px] font-bold leading-tight mt-0.5 ${selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'text-slate-400' : 'text-amber-100'}`}>
              Pay{' '}
              <span className={selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'text-slate-300 font-black' : 'text-yellow-300 font-black'}>
                {selectedFlashRound === 1 ? '4.00 TON' : isGauravSoni ? '30.00 TON' : '10.00 TON'}
              </span>{' '}
              ➔ Receive{' '}
              <span className={selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'text-slate-300 font-black' : 'text-white font-black underline decoration-yellow-400'}>
                {selectedFlashRound === 1 ? '10.00 GRAM' : isGauravSoni ? '75.00 GRAM' : '25.00 GRAM'}
              </span>{' '}
              in 24h!
            </p>
            <div className="text-[9px] text-amber-200/80 font-semibold mt-1">
              {selectedFlashRound === 1 ? 'Round 1 Completed (100% Payout Disbursed)' : '500 Pieces Limited Supply • Instant 24h Settlement'}
            </div>
          </div>
        </div>

        {/* 24-Hour Live Countdown Timer Bar */}
        <div className="my-2 bg-black/40 backdrop-blur-md rounded-2xl p-2.5 border border-white/15 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{selectedFlashRound === 1 || flashTimeLeft.isEnded ? '⏳' : '⏱️'}</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-200">
              {selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'Offer Expired:' : '24H Timer Ending in:'}
            </span>
          </div>
          <div className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-lg border ${
            selectedFlashRound === 1 || flashTimeLeft.isEnded
              ? 'bg-rose-950/70 text-rose-300 border-rose-500/30'
              : 'bg-black/60 text-yellow-300 border-yellow-400/40'
          }`}>
            {selectedFlashRound === 1 || flashTimeLeft.isEnded
              ? '00:00:00 (ENDED)'
              : `${String(flashTimeLeft.hours).padStart(2, '0')}h : ${String(flashTimeLeft.minutes).padStart(2, '0')}m : ${String(flashTimeLeft.seconds).padStart(2, '0')}s`}
          </div>
        </div>

        {/* Scarcity Bar & CTA Button */}
        <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between gap-3 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[9px] font-bold text-amber-100 mb-1">
              <span>{selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'Flash Status:' : isGauravSoni ? 'VIP Allocation:' : 'Limited Slots:'}</span>
              <span className={`font-mono font-black ${selectedFlashRound === 1 || flashTimeLeft.isEnded ? 'text-rose-400' : 'text-yellow-300'}`}>
                {selectedFlashRound === 1 || flashTimeLeft.isEnded
                  ? 'OFFER CLOSED'
                  : isGauravSoni
                  ? '1 / 1 EXCLUSIVE SLOT ACTIVE'
                  : `${flashSlots.filled} / 500 Taken (${flashSlots.left} Left)`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/20">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  selectedFlashRound === 1 || flashTimeLeft.isEnded
                    ? 'w-full bg-slate-600'
                    : 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400'
                }`}
                style={{
                  width: selectedFlashRound === 1 || flashTimeLeft.isEnded ? '100%' : isGauravSoni ? '100%' : `${((flashSlots.filled / 500) * 100).toFixed(1)}%`,
                }}
              />
            </div>
          </div>

          <button
            disabled={selectedFlashRound === 1 || flashTimeLeft.isEnded}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shrink-0 flex items-center gap-1 ${
              selectedFlashRound === 1 || flashTimeLeft.isEnded
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-white text-red-600 active:scale-95 shadow-red-500/40'
            }`}
          >
            <span>
              {selectedFlashRound === 1 || flashTimeLeft.isEnded
                ? 'ENDED ⏳'
                : isGauravSoni
                ? 'GET VIP (30 TON)'
                : 'GET 2.5X (10 TON)'}
            </span>
            {selectedFlashRound === 2 && !flashTimeLeft.isEnded && <span>➔</span>}
          </button>
        </div>
      </div>

      {/* ── CARD 2: YOUR ACTIVE NFT MINER (LARGE PROPER 3D SHOWCASE) ── */}
      <div className="mine-card p-4.5 mb-3.5 relative overflow-hidden">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
              ⬡
            </div>
            <h2 className="text-xs sm:text-sm font-black text-[#0f172a] uppercase tracking-wide">
              Your Active NFT Miner
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE NOW
          </span>
        </div>

        {/* Large NFT Showcase Box */}
        {(() => {
          const activeMiner = myPlans.find(p => p.status === 'active')
          const minerPlanId = activeMiner?.plan_id || 'standard'
          const minerName = activeMiner?.plan_name || 'Cyber Worker Miner'
          const minerBadge = activeMiner?.plan_id === 'matrix' ? '2X DOUBLE' :
                             activeMiner?.plan_id === 'apex' ? 'MYTHIC' :
                             activeMiner?.plan_id === 'titan' ? 'LEGENDARY' :
                             activeMiner?.plan_id === 'queen' ? 'EPIC' :
                             activeMiner?.plan_id === 'flash10' ? '2.5X FLASH' : 'LVL 1'
          const minerTag = activeMiner ? 'UPGRADED NFT' : 'BASE NFT'

          return (
            <div
              onClick={() => navigate('/plans')}
              className="flex items-center gap-3.5 bg-gradient-to-r from-slate-50 via-purple-50/40 to-blue-50/40 p-3 rounded-2xl border border-slate-200/90 mb-3.5 cursor-pointer hover:border-blue-400 transition-all shadow-sm"
            >
              {/* Robust 3D NFT Frame */}
              <NftMinerAvatar planId={minerPlanId} size="lg" badgeText={minerBadge} />

              {/* Details Column */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-950 truncate">
                    {minerName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    activeMiner ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-[#0066ff] border border-blue-200'
                  }`}>
                    {minerTag}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Auto-Mining:</span>
                  <span className="font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[#0066ff] text-xs font-black">
                    {ghs} GHS
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                  <span>Contract: <b className="text-slate-800">{activeMiner ? 'Active 24H Yield' : '24H Guaranteed Cycle'}</b></span>
                  <span className="text-[#0088ff] font-bold text-[9px] underline">Manage ➔</span>
                </div>
              </div>
            </div>
          )
        })()}

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

      {/* ── CARD 5: CLAIM MINING (VIBRANT MINT GRADIENT BAR) ── */}
      <button
        type="button"
        disabled={claiming || pendingBalance < 0.0099}
        onClick={handleClaim}
        className={`w-full claim-bar-btn p-3.5 sm:p-4 mb-3.5 flex items-center justify-between shadow-lg transition-all text-left ${
          claiming || pendingBalance < 0.0099
            ? 'opacity-65 cursor-not-allowed'
            : 'cursor-pointer active:scale-98'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center text-xl shrink-0">
            {claiming ? '⏳' : '⚔️'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-[#042f20] leading-tight">
              {claiming ? 'Claiming Mining...' : 'Claim Mining'}
            </div>
            <div className="text-[11px] font-black text-[#042f20]/90 font-mono mt-0.5 truncate">
              +{pendingBalance.toFixed(6)} USDT Mining
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-[#042f20] font-black text-sm shrink-0 ml-2">
          {claiming ? (
            <div className="w-4 h-4 border-2 border-[#042f20] border-t-transparent rounded-full animate-spin" />
          ) : (
            '➔'
          )}
        </div>
      </button>

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
              Add TON / GHS
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
          onClick={() => navigate('/watch')}
          className="card-tint-blue p-3 relative overflow-hidden cursor-pointer hover:border-blue-400 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0088ff] to-[#00c6ff] text-white flex items-center justify-center text-sm shadow-sm">
              📺
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-200/90 text-blue-950 text-[8px] font-black uppercase">
              20 / DAY
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-blue-950">Daily Ad Station</h4>
          <p className="text-[10px] text-blue-900 font-semibold mt-0.5">Watch & earn +500 Power</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-[#0088ff]">
            <span>WATCH NOW</span>
            <span>➔</span>
          </div>
        </div>
      </div>

      {/* ── 🚗 TESLA MINING: 1-TIME FREE 1 USDT CLAIM BANNER ── */}
      <TeslaMiningBanner className="mb-3.5" />

      {/* ── BANNER: INVITE FRIEND / EARN MORE ─────────────────── */}
      <div
        onClick={() => navigate('/earn')}
        className="mine-card p-0 relative overflow-hidden text-white rounded-3xl shadow-lg cursor-pointer active:scale-98 transition-all border border-purple-200/50 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899]"
      >
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={inviteBannerImg}
            alt="Invite Friends"
            loading="eager"
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
