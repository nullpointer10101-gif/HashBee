import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export const PRIVATE_CHANNEL_URL = 'https://t.me/+L4xApdSQJkA3N2Rl'
export const GATEKEEPER_KEY_PREFIX = 'hb_vip_channel_v3_'

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

  const [hasClickedLink, setHasClickedLink] = useState<boolean>(() => {
    if (!currentTgId) return false
    try {
      return localStorage.getItem(`hb_pvt_clicked_v3_${currentTgId}`) === 'true'
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

  const handleOpenChannel = () => {
    triggerHaptic('medium')
    setErrorMsg(null)
    setHasClickedLink(true)

    if (currentTgId) {
      try {
        localStorage.setItem(`hb_pvt_clicked_v3_${currentTgId}`, 'true')
      } catch {}
    }

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(PRIVATE_CHANNEL_URL)
    } else {
      window.open(PRIVATE_CHANNEL_URL, '_blank')
    }
  }

  const handleVerifyAndEnter = () => {
    if (!hasClickedLink) {
      triggerHaptic('heavy')
      setErrorMsg('⚠️ Please tap Step 1 first to send a request to the VIP channel!')
      return
    }

    triggerHaptic('light')
    setIsVerifying(true)
    setErrorMsg(null)

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
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center px-4 py-6 text-center select-none overflow-y-auto">
      <div className="mine-card max-w-sm w-full p-6 text-center relative overflow-hidden shadow-2xl bg-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl mx-auto mb-3">
          🤖
        </div>

        <h1 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-wide">
          Official Community
        </h1>
        <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
          Send a request to join our official community channel to unlock instant cashouts and live cloud mining.
        </p>

        {/* Steps Box */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 text-left space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#0088ff] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Send Join Request</p>
              <p className="text-[10px] text-slate-500">Tap button below and click "Request to Join".</p>
            </div>
          </div>

          <div className="h-[1px] bg-slate-200 w-full" />

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#0088ff] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Verify & Enter App</p>
              <p className="text-[10px] text-slate-500">Return here and tap "Verify & Enter".</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-600 font-bold mb-3">
            {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleOpenChannel}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-between ${
              hasClickedLink
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                : 'bg-[#0088ff] text-white shadow-md'
            }`}
          >
            <span>{hasClickedLink ? '1. Request Sent (Re-open)' : '1. Send Join Request'}</span>
            <span>➔</span>
          </button>

          <button
            onClick={handleVerifyAndEnter}
            disabled={isVerifying || verifiedSuccess}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
              verifiedSuccess
                ? 'bg-emerald-600 text-white'
                : hasClickedLink
                ? 'btn-primary-blue'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <span>VERIFYING REQUEST...</span>
            ) : verifiedSuccess ? (
              <span>✓ ACCESS GRANTED</span>
            ) : (
              <span>2. VERIFY & ENTER MINER</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrivateGroupGatekeeper
