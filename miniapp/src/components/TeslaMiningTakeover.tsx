import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import teslaBannerImg from '../assets/images/tesla_mining_banner.jpg'

export const TESLA_BOT_URL = 'https://t.me/teslaFarmbot?start=8823265955'
export const TESLA_TAKEOVER_VIEWS_KEY = 'hb_tesla_takeover_v3_'
const MAX_AUTO_SHOW_COUNT = 2

interface TeslaMiningTakeoverProps {
  forceOpen?: boolean
  onClose?: () => void
}

export const getTeslaTakeoverSeenCount = (telegramId?: number | string): number => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    const val = localStorage.getItem(`${TESLA_TAKEOVER_VIEWS_KEY}${tgId}`)
    return val ? parseInt(val, 10) || 0 : 0
  } catch {
    return 0
  }
}

export const incrementTeslaTakeoverSeenCount = (telegramId?: number | string): number => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    const current = getTeslaTakeoverSeenCount(tgId)
    const next = current + 1
    localStorage.setItem(`${TESLA_TAKEOVER_VIEWS_KEY}${tgId}`, String(next))
    return next
  } catch {
    return 1
  }
}

export const openTeslaMiningBot = (telegramId?: number | string) => {
  incrementTeslaTakeoverSeenCount(telegramId)
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    if (window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
    }
    if (window.Telegram.WebApp.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(TESLA_BOT_URL)
      return
    }
  }
  window.open(TESLA_BOT_URL, '_blank')
}

export const triggerTeslaMiningTakeover = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-tesla-takeover'))
  }
}

export const TeslaMiningTakeover: React.FC<TeslaMiningTakeoverProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { user } = useAuth()
  const activeTgId = user?.telegram_id || (typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : '') || ''

  const [isOpen, setIsOpen] = useState(false)
  const [currentViewNumber, setCurrentViewNumber] = useState(1)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('open-tesla-takeover', handleOpen)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-tesla-takeover', handleOpen)
      }
    }
  }, [])

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
      return
    }

    // Check count for this user
    const seen = getTeslaTakeoverSeenCount(activeTgId)
    if (seen < MAX_AUTO_SHOW_COUNT) {
      setCurrentViewNumber(seen + 1)
      setIsOpen(true)
    }
  }, [forceOpen, activeTgId])

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
    }
    // Only count when auto-opened, not forced
    if (!forceOpen) {
      incrementTeslaTakeoverSeenCount(activeTgId)
    }
    setIsOpen(false)
    if (onClose) onClose()
  }

  const handleClaim = () => {
    openTeslaMiningBot(activeTgId)
    setIsOpen(false)
    if (onClose) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999999] bg-[#050811] text-white flex flex-col justify-between overflow-y-auto font-sans select-none"
        >
          {/* Ambient Cyber Neon Lighting */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* ── TOP BAR ────────────────────────────────────── */}
          <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 font-mono">
                ⚡ HASHBEE x TESLA FARM
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm border border-white/15 backdrop-blur-md transition-all shadow-md"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* ── MAIN CONTENT (HERO + DETAILS) ──────────────── */}
          <div className="relative z-10 px-4 py-2 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
            
            {/* Visual Hero Banner Card */}
            <div className="w-full relative rounded-3xl overflow-hidden border border-red-500/40 shadow-2xl shadow-red-500/25 mb-4 group bg-black/50">
              <div className="relative h-52 sm:h-60 w-full overflow-hidden">
                <img
                  src={teslaBannerImg}
                  alt="Tesla Cloud Mining"
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                {/* Floating Top Badge */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg border border-white/25 flex items-center gap-1.5">
                    <span className="animate-pulse">⚡</span> ONE-TIME EXCLUSIVE
                  </span>
                </div>

                {/* Big Bottom Highlight */}
                <div className="absolute bottom-3 left-4 right-4 z-10">
                  <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest block mb-0.5 font-mono drop-shadow">
                    SPECIAL WELCOME GIFT
                  </span>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Free 1.00 USDT
                    </h2>
                    <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black px-2.5 py-1 rounded-xl shadow-md">
                      100% FREE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Headline and Intro Copy */}
            <div className="text-center w-full mb-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5 uppercase">
                Tesla Cloud Mining Gift
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
                All <b className="text-white font-bold">HashBee</b> miners receive an official <b className="text-amber-400 font-bold">1 USDT free starter reward</b> directly credited inside the Tesla Mining bot!
              </p>
            </div>

            {/* 3 Dopamine Feature Cards */}
            <div className="w-full space-y-2 mb-4">
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-lg font-black shrink-0 border border-red-500/30">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white">
                    Free 1.00 USDT Credit
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Instant balance activated upon opening the bot
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  +$1.00
                </span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-black shrink-0 border border-amber-500/30">
                  ⚡
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white">
                    High-Yield Tesla Hashrate
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Earn passive crypto yield 24/7 on autopilot
                  </div>
                </div>
                <span className="text-xs font-black text-amber-400 font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-black shrink-0 border border-blue-500/30">
                  💸
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white">
                    Zero Restrictions Cashout
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Fast direct cashouts to your crypto wallet
                  </div>
                </div>
                <span className="text-xs font-black text-blue-400 font-mono">
                  INSTANT
                </span>
              </div>
            </div>
          </div>

          {/* ── BOTTOM ACTIONS ──────────────────────────────── */}
          <div className="relative z-20 px-4 pb-6 pt-2 max-w-md mx-auto w-full space-y-2.5">
            {/* Primary Giant CTA Button */}
            <button
              onClick={handleClaim}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl shadow-red-500/40 flex items-center justify-center gap-2.5 transition-all active:scale-98 animate-pulse border border-white/20"
            >
              <span>⚡ CLAIM FREE 1 USDT NOW</span>
              <span className="text-xl leading-none">➔</span>
            </button>

            {/* Secondary Skip Button */}
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Continue to HashBee App</span>
              <span>➔</span>
            </button>

            {/* Appearance Notice */}
            <div className="text-center text-[10px] text-slate-500 font-mono pt-1">
              Notice: Promotional screen {currentViewNumber}/2 • Tap Claim to open Tesla Bot
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TeslaMiningTakeover
