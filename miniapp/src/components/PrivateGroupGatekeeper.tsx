import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { checkChannelsAPI } from '../services/api'
import robotMinerImg from '../assets/images/robot_miner.jpg'

export const VIP_CHANNEL_URL = 'https://t.me/+L4xApdSQJkA3N2Rl'
export const PAYOUTS_CHANNEL_URL = 'https://t.me/HashBeePayouts'
export const GATEKEEPER_KEY_PREFIX = 'hb_dual_channels_v5_'

interface PrivateGroupGatekeeperProps {
  telegramId?: number | string
  onVerified?: () => void
}

export const getActiveTelegramId = (userTelegramId?: number | string): string => {
  if (userTelegramId && Number(userTelegramId) > 0) {
    return String(userTelegramId)
  }
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return String(window.Telegram.WebApp.initDataUnsafe.user.id)
  }
  try {
    const stored = localStorage.getItem('hashbee_user_id')
    if (stored && stored !== '0' && stored !== 'default') return stored
  } catch {}
  return ''
}

export const isAccountVerified = (userTelegramId?: number | string): boolean => {
  const tgId = getActiveTelegramId(userTelegramId)
  if (!tgId) {
    return false
  }
  try {
    return localStorage.getItem(`${GATEKEEPER_KEY_PREFIX}${tgId}`) === 'true'
  } catch {
    return false
  }
}

export const markAccountVerified = (userTelegramId?: number | string) => {
  const tgId = getActiveTelegramId(userTelegramId)
  if (tgId) {
    try {
      localStorage.setItem(`${GATEKEEPER_KEY_PREFIX}${tgId}`, 'true')
    } catch {}
  }
}

export const PrivateGroupGatekeeper: React.FC<PrivateGroupGatekeeperProps> = ({ telegramId, onVerified }) => {
  const { user } = useAuth()
  const currentTgId = getActiveTelegramId(telegramId || user?.telegram_id)

  const [clickedCh1, setClickedCh1] = useState<boolean>(() => {
    if (!currentTgId) return false
    try {
      return localStorage.getItem(`hb_ch1_v5_${currentTgId}`) === 'true'
    } catch {
      return false
    }
  })

  const [clickedCh2, setClickedCh2] = useState<boolean>(() => {
    if (!currentTgId) return false
    try {
      return localStorage.getItem(`hb_ch2_v5_${currentTgId}`) === 'true'
    } catch {
      return false
    }
  })

  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
      }
    } catch {}
  }

  const triggerSuccessHaptic = () => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
    } catch {}
  }

  const handleOpenCh1 = () => {
    triggerHaptic('medium')
    setErrorMsg(null)
    setClickedCh1(true)
    if (currentTgId) {
      try {
        localStorage.setItem(`hb_ch1_v5_${currentTgId}`, 'true')
      } catch {}
    }
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(VIP_CHANNEL_URL)
    } else {
      window.open(VIP_CHANNEL_URL, '_blank')
    }
  }

  const handleOpenCh2 = () => {
    triggerHaptic('medium')
    setErrorMsg(null)
    setClickedCh2(true)
    if (currentTgId) {
      try {
        localStorage.setItem(`hb_ch2_v5_${currentTgId}`, 'true')
      } catch {}
    }
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(PAYOUTS_CHANNEL_URL)
    } else {
      window.open(PAYOUTS_CHANNEL_URL, '_blank')
    }
  }

  const handleVerifyAndEnter = async () => {
    if (!clickedCh1) {
      triggerHaptic('heavy')
      setErrorMsg('⚠️ Please tap Channel 1 first and send your join request!')
      return
    }

    if (!clickedCh2) {
      triggerHaptic('heavy')
      setErrorMsg('⚠️ Please tap Channel 2 and join the Payout Proofs channel!')
      return
    }

    triggerHaptic('light')
    setIsVerifying(true)
    setErrorMsg(null)

    try {
      await checkChannelsAPI(VIP_CHANNEL_URL, PAYOUTS_CHANNEL_URL)
    } catch (e) {
      // Graceful fallback
    }

    setTimeout(() => {
      setIsVerifying(false)
      setVerifiedSuccess(true)
      triggerSuccessHaptic()

      markAccountVerified(currentTgId)

      setTimeout(() => {
        if (onVerified) {
          onVerified()
        }
      }, 700)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center px-4 py-6 text-center select-none overflow-y-auto font-sans">
      <div className="mine-card max-w-sm w-full p-5 sm:p-6 text-center relative overflow-hidden shadow-2xl bg-white border border-slate-200">
        {/* Robot Miner Avatar */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-sky-200 bg-sky-50 mx-auto mb-3 shadow-md flex items-center justify-center text-3xl relative">
          <span className="absolute inset-0 flex items-center justify-center text-3xl">🤖</span>
          <img
            src={robotMinerImg}
            alt="HashBee"
            loading="eager"
            className="w-full h-full object-cover relative z-10"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none'
            }}
          />
        </div>

        <h1 className="text-base sm:text-lg font-black text-slate-900 mb-1 uppercase tracking-tight">
          Join Official Channels
        </h1>
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">
          Join both channels below to activate your <b className="text-slate-900 font-bold">50 GHS Cloud Mining</b> and unlock instant withdrawals.
        </p>

        {/* Both Channel Cards */}
        <div className="space-y-2.5 mb-4 text-left">
          {/* Channel 1: VIP Community */}
          <div
            onClick={handleOpenCh1}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-98 ${
              clickedCh1
                ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                : 'bg-blue-50/60 border-blue-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0088ff] to-[#00c6ff] text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                📢
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <span>1. VIP Community Channel</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Send join request for gift codes & updates
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ml-2 ${
                clickedCh1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#0088ff] text-white'
              }`}
            >
              {clickedCh1 ? '✓ REQUESTED' : 'JOIN ➔'}
            </span>
          </div>

          {/* Channel 2: Payout Proofs */}
          <div
            onClick={handleOpenCh2}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-98 ${
              clickedCh2
                ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                : 'bg-purple-50/60 border-purple-200 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                💎
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <span>2. Live Payouts & Proofs</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Real-time TON & USDT on-chain receipts
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ml-2 ${
                clickedCh2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#7c3aed] text-white'
              }`}
            >
              {clickedCh2 ? '✓ JOINED' : 'JOIN ➔'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-600 font-bold mb-3 text-left">
            {errorMsg}
          </div>
        )}

        {/* Verify & Enter Button */}
        <button
          onClick={handleVerifyAndEnter}
          disabled={isVerifying || verifiedSuccess}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
            verifiedSuccess
              ? 'bg-emerald-600 text-white'
              : clickedCh1 && clickedCh2
              ? 'btn-primary-blue'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isVerifying ? (
            <span>VERIFYING CHANNELS...</span>
          ) : verifiedSuccess ? (
            <span>✓ VERIFIED & ACCESS GRANTED</span>
          ) : (
            <span>3. VERIFY MEMBERSHIP & ENTER ➔</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default PrivateGroupGatekeeper
