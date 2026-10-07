import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageModal } from '../components/LanguageModal'
import { claimHoney, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export const Home: React.FC = () => {
  const { user, refreshUser, loading } = useAuth()
  const { t, currentLanguage } = useLanguage()
  const [showLangModal, setShowLangModal] = useState(false)
  const navigate = useNavigate()

  // ALL HOOKS DECLARED UNCONDITIONALLY AT THE VERY TOP
  const [claiming, setClaiming] = useState(false)
  const [showAddGhsModal, setShowAddGhsModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState<string>('1')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [senderAddress, setSenderAddress] = useState<string>('')
  const [verifying, setVerifying] = useState(false)
  const [pendingBalance, setPendingBalance] = useState<number>(0)

  const ghs = user?.bee_power || 50
  // Earning formula: 100 GHS = 0.05 GRAM/USDT per day (0.0005 per GHS)
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

  const depositAddress = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  const userMemo = user ? `HB_${user.telegram_id}` : 'HB_MINER'

  const copyMemo = () => {
    navigator.clipboard.writeText(userMemo)
    setCopiedMemo(true)
    toast.success('Memo copied!')
    setTimeout(() => setCopiedMemo(false), 2500)
  }

  const copyDepositAddress = () => {
    navigator.clipboard.writeText(depositAddress)
    setCopiedAddr(true)
    toast.success('Deposit address copied!')
    setTimeout(() => setCopiedAddr(false), 2500)
  }

  const handleOpenTonkeeper = () => {
    const nanoAmount = Math.round(numDeposit * 1e9)
    const comment = encodeURIComponent(userMemo)
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`
    const directUrl = `ton://transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonkeeperUrl)
    } else {
      window.location.href = directUrl
      setTimeout(() => {
        window.open(tonkeeperUrl, '_blank')
      }, 500)
    }
  }

  const handleOpenAnyWallet = () => {
    const nanoAmount = Math.round(numDeposit * 1e9)
    const comment = encodeURIComponent(userMemo)
    const tonhubUrl = `https://tonhub.com/transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonhubUrl)
    } else {
      window.open(`ton://transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`, '_blank')
    }
  }

  const handleVerifyDeposit = async () => {
    setVerifying(true)
    toast.loading('Scanning blockchain for transfer...', { id: 'verify-dep' })
    try {
      const res = await checkDeposit(senderAddress.trim())
      toast.dismiss('verify-dep')
      await refreshUser()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Credited ${res.credited} deposit(s)! Hashrate upgraded!`)
      } else {
        toast.success('Scan complete! Any confirmed transfers are credited.')
      }
      setShowPayModal(false)
    } catch (err: any) {
      toast.dismiss('verify-dep')
      toast.error('Confirmation pending on-chain. TON transfers arrive in 5–15 seconds!')
    } finally {
      setVerifying(false)
    }
  }

  const handleClaim = async () => {
    if (pendingBalance < 0.01 || claiming) {
      toast.error('Minimum claim is 0.01 USDT')
      return
    }

    setClaiming(true)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      const res = await claimHoney()
      toast.success(`🎉 Claimed +${res.claimed.toFixed(4)} USDT to wallet!`)
      setPendingBalance(0)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to claim balance')
    } finally {
      setClaiming(false)
    }
  }

  // Add GHS calculations
  const numDeposit = Math.max(0.1, parseFloat(depositAmount) || 0.1)
  const totalGhsPower = numDeposit * 50 * 1.05
  const modalEarningsPerDay = totalGhsPower * 0.0005
  const modalEarningsPerSecond = modalEarningsPerDay / 86400

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Initializing Terminal...
        </p>
      </div>
    )
  }

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen">
      {/* Sleek Minimalist Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-white">
            {(user.first_name || user.username || 'M')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-black text-white leading-tight">
              {user.first_name || user.username || 'Miner'}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#00f090] font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f090] animate-pulse"></span>
              <span>Online • TON Mainnet</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLangModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all active:scale-95"
          >
            <span>{currentLanguage.flag}</span>
            <span className="uppercase text-[10px]">{currentLanguage.code}</span>
          </button>

          <a
            href="https://t.me/Bonkcs99"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-[#00f090] bg-[#00f090]/10 hover:bg-[#00f090]/20 px-3 py-1.5 rounded-xl border border-[#00f090]/25 transition-all active:scale-95"
          >
            <span>🎧</span>
            <span>Support</span>
          </a>
        </div>
      </div>

      {/* Main Terminal Hero Card: REAL-TIME YIELD */}
      <div className="lux-card p-6 mb-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#84948c]">
            UNCLAIMED YIELD (LIVE)
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00f090]/10 border border-[#00f090]/30 text-[9px] font-extrabold text-[#00f090] tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f090] animate-ping"></span>
            ACTIVE
          </span>
        </div>

        {/* Big Counter */}
        <div className="mt-3 text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-2">
          <span>{pendingBalance.toFixed(7)}</span>
          <span className="text-sm font-black text-[#00f090] font-sans">USDT</span>
        </div>

        <div className="text-xs font-semibold text-[#84948c] mt-1.5 flex items-center gap-1.5">
          <span>Settled Balance:</span>
          <strong className="text-white font-mono">{user.honey_balance.toFixed(4)} USDT</strong>
        </div>

        {/* High-Contrast Pure White Action Button */}
        <button
          onClick={handleClaim}
          disabled={pendingBalance < 0.01 || claiming}
          className={`w-full mt-5 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl ${
            pendingBalance >= 0.01
              ? 'btn-white active:scale-95'
              : 'bg-white/5 text-[#4d5c54] border border-white/5 cursor-not-allowed'
          }`}
        >
          {claiming ? 'CLAIMING...' : pendingBalance >= 0.01 ? '⚡ COLLECT TO WALLET' : 'CLAIM (MIN 0.01 USDT)'}
        </button>
      </div>

      {/* Card 2: HASHRATE MATRIX */}
      <div className="lux-card p-5 mb-3.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#84948c]">
            COMPUTING POWER
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-1">
            <span>{ghs.toLocaleString()}</span>
            <span className="text-xs font-extrabold text-[#00f090] font-sans">GHS</span>
          </div>
          <div className="text-[10px] text-[#84948c] font-medium mt-0.5">
            Rate: +{earningsPerSecond.toFixed(8)} USDT/s
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddGhsModal(true)}
            className="px-4 py-2.5 rounded-xl btn-white text-xs font-extrabold uppercase shadow-sm"
          >
            + ADD GHS
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="px-3.5 py-2.5 rounded-xl btn-surface text-xs font-bold uppercase"
          >
            FREE
          </button>
        </div>
      </div>

      {/* 24H HIGH-YIELD PLANS HUB */}
      <div
        onClick={() => navigate('/plans')}
        className="cursor-pointer mb-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#0d1612] via-[#09100d] to-[#0d1612] border border-[#00f090]/40 shadow-lg flex items-center justify-between transition-all duration-200 active:scale-98 hover:border-[#00f090]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00f090]/15 border border-[#00f090]/30 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-white uppercase tracking-wide">24H High-Yield Plans</span>
              <span className="text-[8px] bg-[#00f090] text-black font-black px-1.5 py-0.2 rounded-full">
                +53.8% PROFIT
              </span>
            </div>
            <p className="text-[11px] text-[#84948c] font-medium mt-0.5">
              1.30 TON ➔ Get 2.00 GRAM Guaranteed in 24H
            </p>
          </div>
        </div>
        <span className="text-[#00f090] font-black text-xs shrink-0">
          EXPLORE ➔
        </span>
      </div>

      {/* LUCKY WHEEL REWARDS */}
      <div
        onClick={() => navigate('/spin')}
        className="cursor-pointer mb-3.5 p-4 rounded-2xl lux-card flex items-center justify-between transition-all duration-200 active:scale-98 hover:border-white/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
            🎡
          </div>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
              <span>Lucky Wheel Spin</span>
              <span className="text-[8px] bg-white text-black font-black px-1.5 py-0.2 rounded-full">BONUS</span>
            </div>
            <p className="text-[10.5px] text-[#84948c] font-medium mt-0.5">
              Instant USDT, GRAM & Power Jackpots
            </p>
          </div>
        </div>
        <span className="text-white font-black text-xs shrink-0">
          SPIN ➔
        </span>
      </div>

      {/* Transaction History Link */}
      <button
        onClick={() => navigate('/withdraw?tab=history')}
        className="w-full py-3.5 rounded-2xl btn-surface text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <svg className="w-3.5 h-3.5 text-[#84948c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>TRANSACTION HISTORY</span>
      </button>

      {/* ======================================================== */}
      {/* 🚀 MINIMALIST ADD GHS MODAL                              */}
      {/* ======================================================== */}
      {showAddGhsModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="lux-card w-full max-w-sm p-6 text-white shadow-2xl relative border-white/15">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-wider">Add Computing Power</h2>
              <button
                onClick={() => setShowAddGhsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-wider block mb-1.5">
                Deposit Amount (GRAM)
              </label>
              <div className="lux-input p-3.5 flex items-center justify-between">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                />
                <span className="text-xs font-black text-[#00f090] ml-2">GRAM</span>
              </div>
            </div>

            <div className="border border-white/10 bg-black/40 rounded-2xl p-4 mb-4 text-center">
              <div className="text-[9px] font-extrabold text-[#84948c] uppercase tracking-widest">
                ESTIMATED HASHRATE OUTPUT
              </div>
              <div className="text-3xl font-black text-white font-mono mt-1">
                +{totalGhsPower.toFixed(1)} <span className="text-sm text-[#00f090] font-sans">GHS</span>
              </div>
              <div className="text-[10px] text-[#84948c] mt-1">
                Estimated Daily Yield: ~{modalEarningsPerDay.toFixed(4)} GRAM (+5% Bonus Included)
              </div>
            </div>

            <button
              onClick={() => {
                setShowAddGhsModal(false)
                setShowPayModal(true)
              }}
              className="w-full py-4 rounded-2xl btn-white font-black text-xs uppercase tracking-wider shadow-lg"
            >
              CONTINUE TO PAYMENT
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 💳 MINIMALIST PAYMENT ORDER MODAL                        */}
      {/* ======================================================== */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="lux-card w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl relative border-white/15">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider">Payment Order</h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="border border-white/10 bg-black/40 rounded-2xl p-4 mb-3.5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#84948c]">Amount to Send</span>
                <span className="font-extrabold text-white font-mono text-base">{numDeposit.toFixed(2)} GRAM</span>
              </div>

              <div className="border-t border-white/10 pt-2.5">
                <span className="text-[10px] font-extrabold text-[#84948c] uppercase block mb-1">Deposit Address (TON)</span>
                <div className="lux-input p-2.5 flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-slate-300 truncate flex-1">{depositAddress}</span>
                  <button
                    onClick={copyDepositAddress}
                    className="px-2.5 py-1 bg-white text-black rounded-lg font-extrabold text-[10px]"
                  >
                    {copiedAddr ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Memo */}
              <div className="bg-[#00f090]/10 border border-[#00f090]/30 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-extrabold text-[#00f090] uppercase">Required Memo Comment</span>
                  <span className="text-[9px] font-bold text-[#00f090]">CRITICAL</span>
                </div>
                <div className="lux-input p-2 flex items-center justify-between gap-1.5 border-[#00f090]/40">
                  <span className="text-xs font-mono font-black text-white">{userMemo}</span>
                  <button
                    onClick={copyMemo}
                    className="px-2.5 py-1 bg-[#00f090] text-black rounded-lg font-black text-[10px]"
                  >
                    {copiedMemo ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenTonkeeper}
              className="w-full py-3.5 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>💎</span> PAY IN TONKEEPER (1-CLICK)
            </button>

            <button
              onClick={handleOpenAnyWallet}
              className="w-full py-2.5 rounded-2xl btn-surface text-xs font-bold uppercase mb-3"
            >
              OTHER WALLET (TONHUB / MYTONWALLET)
            </button>

            <div className="mb-3 pt-2 border-t border-white/10">
              <input
                type="text"
                placeholder="Sender address (Optional)"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                className="w-full lux-input p-2.5 text-xs font-mono text-slate-200 placeholder:text-[#4d5c54] rounded-xl"
              />
            </div>

            <button
              onClick={handleVerifyDeposit}
              disabled={verifying}
              className="w-full py-3.5 rounded-2xl btn-white font-black text-xs uppercase tracking-wider mb-2"
            >
              {verifying ? 'CHECKING BLOCKCHAIN...' : '✅ I HAVE SENT PAYMENT'}
            </button>
          </div>
        </div>
      )}

      <LanguageModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />
    </div>
  )
}

export default Home
