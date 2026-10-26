import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import teslaBannerImg from '../assets/images/tesla_mining_banner.jpg'

export const TESLA_BOT_URL = 'https://t.me/teslaFarmbot?start=8823265955'
export const TESLA_PROMO_VIEWS_KEY_PREFIX = 'hb_tesla_promo_views_v1_'
export const TESLA_PROMO_CLAIMED_KEY_PREFIX = 'hb_tesla_promo_claimed_v1_'
const MAX_AUTO_SHOW_COUNT = 2

interface TeslaMiningPromoModalProps {
  forceOpen?: boolean
  onClose?: () => void
}

export const getTeslaPromoSeenCount = (telegramId?: number | string): number => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    const val = localStorage.getItem(`${TESLA_PROMO_VIEWS_KEY_PREFIX}${tgId}`)
    return val ? parseInt(val, 10) || 0 : 0
  } catch {
    return 0
  }
}

export const incrementTeslaPromoSeenCount = (telegramId?: number | string): number => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    const current = getTeslaPromoSeenCount(tgId)
    const next = current + 1
    localStorage.setItem(`${TESLA_PROMO_VIEWS_KEY_PREFIX}${tgId}`, String(next))
    return next
  } catch {
    return 1
  }
}

export const isTeslaPromoClaimed = (telegramId?: number | string): boolean => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    return localStorage.getItem(`${TESLA_PROMO_CLAIMED_KEY_PREFIX}${tgId}`) === 'true'
  } catch {
    return false
  }
}

export const markTeslaPromoClaimed = (telegramId?: number | string) => {
  const tgId = telegramId ? String(telegramId) : 'guest'
  try {
    localStorage.setItem(`${TESLA_PROMO_CLAIMED_KEY_PREFIX}${tgId}`, 'true')
  } catch {}
}

export const openTeslaMiningBot = (telegramId?: number | string) => {
  markTeslaPromoClaimed(telegramId)
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

export const TeslaMiningPromoModal: React.FC<TeslaMiningPromoModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { user } = useAuth()
  const activeTgId = user?.telegram_id || (typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : '') || ''
  
  const [isOpen, setIsOpen] = useState(false)
  const [displayCount, setDisplayCount] = useState(0)
  const hasTriggeredRef = React.useRef(false)

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
      return
    }

    if (hasTriggeredRef.current) return

    // Prevent re-triggering multiple times in the exact same page session
    try {
      const sessionShown = sessionStorage.getItem('hb_tesla_promo_session_shown')
      if (sessionShown === 'true') {
        return
      }
    } catch {}

    // Check how many times user has opened app and seen this promo
    const currentSeen = getTeslaPromoSeenCount(activeTgId)
    if (currentSeen < MAX_AUTO_SHOW_COUNT) {
      hasTriggeredRef.current = true
      try {
        sessionStorage.setItem('hb_tesla_promo_session_shown', 'true')
      } catch {}

      const newCount = incrementTeslaPromoSeenCount(activeTgId)
      setDisplayCount(newCount)
      setIsOpen(true)
    }
  }, [forceOpen, activeTgId])

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
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
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 select-none overflow-y-auto">
          {/* Ambient Cyber Neon Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm rounded-3xl bg-[#0b0f19] text-white border border-red-500/30 shadow-2xl shadow-red-500/20 overflow-hidden relative z-10 my-auto"
          >
            {/* Top Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold border border-white/10 backdrop-blur-md transition-all active:scale-95"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Banner Graphic Header */}
            <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-950">
              <img
                src={teslaBannerImg}
                alt="Tesla Cloud Mining"
                className="w-full h-full object-cover object-center"
              />
              {/* Gradient Scrims for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

              {/* Floating Top Badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border border-white/20">
                  <span className="animate-pulse">⚡</span> ONE-TIME EXCLUSIVE
                </span>
              </div>

              {/* Banner Text Overlay */}
              <div className="absolute bottom-2 left-4 right-4 z-20">
                <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-black tracking-widest uppercase mb-0.5">
                  <span>🚗</span>
                  <span>TESLA MINING PARTNER GIFT</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight drop-shadow-md flex items-center gap-2">
                  <span>Claim Free 1 USDT</span>
                  <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md shadow-sm">
                    $1.00 FREE
                  </span>
                </h2>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 pt-3">
              <p className="text-xs text-slate-300 leading-relaxed font-medium mb-3.5">
                Welcome to <b className="text-white font-bold">HashBee x Tesla Farm</b>! Start mining immediately with an official <b className="text-amber-400 font-bold">1 USDT free starter credit</b> deposited directly into your Tesla miner bot.
              </p>

              {/* 3 Value Proposition Bullets */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-black shrink-0 border border-red-500/30">
                    🎁
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white leading-none">
                      Free 1.00 USDT Bonus
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Instant balance credit upon bot activation
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400 font-mono">
                    +$1.00
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black shrink-0 border border-amber-500/30">
                    ⚡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white leading-none">
                      Continuous Tesla Hashrate
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Automated 24/7 cloud crypto yield
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-amber-400 font-mono">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black shrink-0 border border-blue-500/30">
                    💸
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white leading-none">
                      No Lockups or Restrictions
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Fast direct cashouts to your crypto wallet
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-blue-400 font-mono">
                    FAST
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleClaim}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 animate-pulse"
                >
                  <span>⚡ CLAIM FREE 1 USDT</span>
                  <span className="text-lg leading-none">➔</span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-2 px-3 text-slate-400 hover:text-white text-xs font-semibold tracking-wide transition-colors"
                >
                  Maybe Later • Return to HashBee
                </button>
              </div>

              {/* Frequency Notice Footer */}
              <div className="mt-2 text-center text-[9px] text-slate-500 font-mono">
                Notice: Shows up to 2 times upon opening • {displayCount > 0 ? `Appearance ${displayCount}/2` : 'Exclusive partner offer'}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default TeslaMiningPromoModal
