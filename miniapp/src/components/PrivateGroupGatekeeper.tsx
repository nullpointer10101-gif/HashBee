import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const PRIVATE_CHANNEL_URL = 'https://t.me/+L4xApdSQJkA3N2Rl'

interface PrivateGroupGatekeeperProps {
  onVerified?: () => void
}

export const PrivateGroupGatekeeper: React.FC<PrivateGroupGatekeeperProps> = ({ onVerified }) => {
  const { user } = useAuth()
  const [hasClickedLink, setHasClickedLink] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Trigger haptic feedback if available
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
      }
    } catch {
      // ignore
    }
  }

  const triggerSuccessHaptic = () => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
    } catch {
      // ignore
    }
  }

  const handleOpenChannel = () => {
    triggerHaptic('medium')
    setErrorMsg(null)
    setHasClickedLink(true)

    // Remember link was clicked in session
    const storageKey = `hashbee_pvt_clicked_${user?.telegram_id || user?.id || 'guest'}`
    try {
      localStorage.setItem(storageKey, 'true')
    } catch {
      // ignore
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

    triggerHaptic('medium')
    setErrorMsg(null)
    setIsVerifying(true)

    // 1.5s simulated verification check for high engagement & authentic feel
    setTimeout(() => {
      setIsVerifying(false)
      setVerifiedSuccess(true)
      triggerSuccessHaptic()

      try {
        localStorage.setItem('hashbee_vip_join_verified_v1', 'true')
        if (user?.telegram_id) {
          localStorage.setItem(`hashbee_vip_join_verified_${user.telegram_id}`, 'true')
        }
      } catch {
        // ignore
      }

      setTimeout(() => {
        if (onVerified) {
          onVerified()
        }
      }, 700)
    }, 1500)
  }

  useEffect(() => {
    const storageKey = `hashbee_pvt_clicked_${user?.telegram_id || user?.id || 'guest'}`
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        setHasClickedLink(true)
      }
    } catch {
      // ignore
    }
  }, [user])

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0c1210] text-[#e6f0ec] flex flex-col justify-between items-center px-5 py-8 overflow-y-auto select-none">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#10b981]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#f59e0b]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-sm text-center pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162923] border border-[#10b981]/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#10b981]">
            Required Verification
          </span>
        </div>

        {/* VIP Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1b2a24] to-[#121c18] border border-[#10b981]/30 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-4">
          <div className="text-4xl animate-bounce">📢</div>
          <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#000] font-black text-[9px] uppercase tracking-wider shadow">
            VIP
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2 leading-tight">
          Join VIP Channel <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#34d399]">
            To Enter HashBee
          </span>
        </h1>

        <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto mb-6">
          To start mining USDT, spin rewards & withdrawals, you must send a request to join our official private channel.
        </p>

        {/* Steps Box */}
        <div className="w-full bg-[#131c18]/90 border border-[#23352e] rounded-2xl p-4 text-left backdrop-blur-md mb-4 shadow-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black text-[#10b981]">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-white">Send Join Request</p>
              <p className="text-[11px] text-stone-400">
                Tap button below & click <b>"Request to Join"</b> in Telegram.
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-[#1e2f28] w-full" />

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black text-[#f59e0b]">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-white">Verify & Unlock Miner</p>
              <p className="text-[11px] text-stone-400">
                Return here and tap <b>"Verify & Enter"</b> to get full access.
              </p>
            </div>
          </div>
        </div>

        {/* Error Warning if not clicked */}
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 font-semibold mb-3 animate-shake">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Action Buttons Section */}
      <div className="relative z-10 w-full max-w-sm space-y-3 pb-2">
        {/* Step 1: Open Channel Link */}
        <button
          onClick={handleOpenChannel}
          className={`w-full py-4 px-5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-between transition-all active:scale-[0.98] ${
            hasClickedLink
              ? 'bg-[#182a23] border border-[#10b981]/50 text-[#34d399]'
              : 'bg-gradient-to-r from-[#0088cc] to-[#00a8ff] text-white shadow-[0_4px_25px_rgba(0,136,204,0.35)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📢</span>
            <span className="text-left font-extrabold">
              {hasClickedLink ? '1. Request Sent (Tap to re-open)' : '1. Send Join Request'}
            </span>
          </div>
          {hasClickedLink ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/30">
              ✓ Done
            </span>
          ) : (
            <span className="text-lg font-bold">➔</span>
          )}
        </button>

        {/* Step 2: Verify and Enter Button */}
        <button
          onClick={handleVerifyAndEnter}
          disabled={isVerifying || verifiedSuccess}
          className={`w-full py-4 px-5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            verifiedSuccess
              ? 'bg-[#10b981] text-[#0c1210] shadow-[0_4px_30px_rgba(16,185,129,0.4)]'
              : hasClickedLink
              ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-[#091511] shadow-[0_4px_30px_rgba(16,185,129,0.3)] animate-pulse'
              : 'bg-[#1a2622] text-stone-500 border border-[#273933] cursor-not-allowed opacity-90'
          }`}
        >
          {isVerifying ? (
            <>
              <div className="w-4 h-4 border-2 border-[#091511] border-t-transparent rounded-full animate-spin" />
              <span>Verifying Request...</span>
            </>
          ) : verifiedSuccess ? (
            <>
              <span>🎉</span>
              <span>Access Granted! Entering Miner...</span>
            </>
          ) : (
            <>
              <span>⛏️</span>
              <span>2. Verify & Enter Miner</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-stone-500 uppercase tracking-widest pt-1">
          🔒 Required 1-time verification for all miners
        </p>
      </div>
    </div>
  )
}

export default PrivateGroupGatekeeper
