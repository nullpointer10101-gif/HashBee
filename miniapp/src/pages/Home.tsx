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
    toast.success('Official deposit address copied!')
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
    toast.loading('Checking blockchain for your deposit...', { id: 'verify-dep' })
    try {
      const res = await checkDeposit(senderAddress.trim())
      toast.dismiss('verify-dep')
      await refreshUser()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Detected & credited ${res.credited} deposit(s)! Mining power upgraded!`)
      } else {
        toast.success('Blockchain scan complete! Any detected transfers are credited.')
      }
      setShowPayModal(false)
    } catch (err: any) {
      toast.dismiss('verify-dep')
      toast.error('Could not verify yet. TON transfers arrive in 5–15 seconds!')
    } finally {
      setVerifying(false)
    }
  }

  const handleClaim = async () => {
    if (pendingBalance < 0.01 || claiming) {
      toast.error('Minimum claim amount is 0.01')
      return
    }

    setClaiming(true)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      const res = await claimHoney()
      toast.success(`🎉 Claimed +${res.claimed.toFixed(4)} USDT!`)
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
  const modalEarningsPerWeek = modalEarningsPerDay * 7
  const modalEarningsPerMonth = modalEarningsPerDay * 30

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
          Starting Cloud Miner...
        </p>
      </div>
    )
  }

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen">
      {/* Sleek Minimalist Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-sm">
            ⚡
          </div>
          <div>
            <div className="text-sm font-black text-white leading-tight">
              {user.first_name || user.username || 'Miner'}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TON Mainnet Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLangModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-[#0e1613] hover:bg-[#14201c] px-2.5 py-1.5 rounded-xl border border-[#1b2b24] transition-all"
            title="Change Language"
          >
            <span>{currentLanguage.flag}</span>
            <span className="uppercase">{currentLanguage.code}</span>
          </button>

          <a
            href="https://t.me/Bonkcs99"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 transition-all"
          >
            <span>🎧</span>
            <span>Support</span>
          </a>
        </div>
      </div>

      {/* Hero Card: LIVE MINING BALANCE */}
      <div className="zentorno-card p-5 mb-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a8f85]">
            Live Mining Balance
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>

        {/* Big Counter */}
        <div className="mt-2 text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-1.5">
          <span>{pendingBalance.toFixed(7)}</span>
          <span className="text-xs font-black text-emerald-400 font-sans">USDT</span>
        </div>

        <div className="text-[11px] font-medium text-[#7a8f85] mt-0.5 flex items-center gap-1">
          <span>Wallet Balance:</span>
          <strong className="text-slate-200 font-mono">{user.honey_balance.toFixed(4)} USDT</strong>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={pendingBalance < 0.01 || claiming}
          className={`w-full mt-4 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md ${
            pendingBalance >= 0.01
              ? 'zentorno-btn-primary'
              : 'bg-[#101714] text-[#4f6158] border border-[#1a2620] cursor-not-allowed'
          }`}
        >
          {claiming ? 'Claiming...' : pendingBalance >= 0.01 ? '⚡ Harvest to Wallet' : 'Harvest (Min 0.01 USDT)'}
        </button>
      </div>

      {/* Card 2: ACTIVE HASHRATE (GHS) */}
      <div className="zentorno-card p-4 mb-3.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#7a8f85]">
            Active Hashrate
          </div>
          <div className="text-2xl font-black text-white mt-0.5 font-mono">
            {ghs.toLocaleString()} <span className="text-xs font-black text-emerald-400 font-sans">GHS</span>
          </div>
          <div className="text-[10px] text-[#7a8f85] mt-0.5">
            +{earningsPerSecond.toFixed(8)} USDT/sec
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddGhsModal(true)}
            className="px-3.5 py-2 rounded-xl zentorno-btn-primary text-xs font-extrabold uppercase shadow-sm"
          >
            + Add GHS
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="px-3 py-2 rounded-xl zentorno-btn-secondary text-xs font-bold uppercase"
          >
            Free
          </button>
        </div>
      </div>

      {/* 🍯 24H DAILY YIELD PLANS CALLOUT */}
      <div
        onClick={() => navigate('/plans')}
        className="cursor-pointer mb-3 p-4 rounded-2xl bg-gradient-to-r from-[#0d1f18] to-[#0a1712] border border-emerald-500/40 shadow-lg flex items-center justify-between transition-all duration-200 active:scale-98 hover:border-emerald-400"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
            🍯
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-white uppercase tracking-wide">24H Yield Plans</span>
              <span className="text-[8px] bg-emerald-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full">
                +53.8% PROFIT
              </span>
            </div>
            <p className="text-[11px] text-[#8fa69c] font-medium mt-0.5">
              1.30 TON ➔ Receive 2.00 GRAM Next Day
            </p>
          </div>
        </div>
        <span className="text-emerald-400 font-black text-xs shrink-0">
          View ➔
        </span>
      </div>

      {/* 🎡 LUCKY WHEEL CALLOUT */}
      <div
        onClick={() => navigate('/spin')}
        className="cursor-pointer mb-3.5 p-3.5 rounded-2xl bg-[#0e1512] border border-[#1c2c24] flex items-center justify-between transition-all duration-200 active:scale-98 hover:border-amber-400/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            🎡
          </div>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
              <span>Lucky Wheel Spin</span>
              <span className="text-[8px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-full">FREE</span>
            </div>
            <p className="text-[10.5px] text-[#7a8f85] font-medium mt-0.5">
              Win USDT, GRAM & Power boosts
            </p>
          </div>
        </div>
        <span className="text-amber-400 font-black text-xs shrink-0">
          Spin ➔
        </span>
      </div>

      {/* Payout History Link */}
      <button
        onClick={() => navigate('/withdraw?tab=history')}
        className="w-full py-3 rounded-xl zentorno-btn-secondary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-[#7a8f85]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>View Transaction History</span>
      </button>

      {/* ======================================================== */}
      {/* 🚀 MINIMALIST ADD GHS MODAL                              */}
      {/* ======================================================== */}
      {showAddGhsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1512] border border-[#1f3128] rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black uppercase tracking-wider">Add Hashrate (GHS)</h2>
              <button
                onClick={() => setShowAddGhsModal(false)}
                className="w-7 h-7 rounded-full bg-[#16221c] text-[#7a8f85] hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mb-3.5">
              <label className="text-[10px] font-bold text-[#7a8f85] uppercase tracking-wider block mb-1">
                Deposit Amount (GRAM)
              </label>
              <div className="zentorno-input p-3 flex items-center justify-between">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                />
                <span className="text-xs font-extrabold text-emerald-400 ml-2">GRAM</span>
              </div>
            </div>

            <div className="border border-[#1a2a22] bg-[#090f0c] rounded-2xl p-3.5 mb-4 text-center">
              <div className="text-[9px] font-bold text-[#7a8f85] uppercase tracking-widest">
                Estimated Power Output
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                +{totalGhsPower.toFixed(1)} GHS
              </div>
              <div className="text-[10px] text-[#7a8f85] mt-1">
                Yield: ~{modalEarningsPerDay.toFixed(4)} GRAM/day (+5% bonus applied)
              </div>
            </div>

            <button
              onClick={() => {
                setShowAddGhsModal(false)
                setShowPayModal(true)
              }}
              className="w-full py-3.5 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider mb-2 shadow-md"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 💳 MINIMALIST PAYMENT ORDER MODAL                        */}
      {/* ======================================================== */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1512] border border-[#1f3128] rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 text-white shadow-2xl relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black uppercase tracking-wider">Payment Order</h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-7 h-7 rounded-full bg-[#16221c] text-[#7a8f85] hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="border border-[#1a2a22] bg-[#090f0c] rounded-2xl p-3.5 mb-3 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7a8f85]">Amount</span>
                <span className="font-extrabold text-white font-mono text-sm">{numDeposit.toFixed(2)} GRAM</span>
              </div>

              <div className="border-t border-[#16221c] pt-2">
                <span className="text-[10px] font-bold text-[#7a8f85] uppercase block mb-1">Deposit Address</span>
                <div className="zentorno-input p-2 flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-slate-300 truncate flex-1">{depositAddress}</span>
                  <button
                    onClick={copyDepositAddress}
                    className="px-2 py-1 bg-emerald-500 text-stone-950 rounded-lg font-extrabold text-[10px]"
                  >
                    {copiedAddr ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Memo */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-extrabold text-amber-300 uppercase">Required Memo</span>
                  <span className="text-[9px] font-bold text-amber-400">DO NOT OMIT</span>
                </div>
                <div className="zentorno-input p-2 flex items-center justify-between gap-1.5 border-amber-500/40">
                  <span className="text-xs font-mono font-black text-amber-300">{userMemo}</span>
                  <button
                    onClick={copyMemo}
                    className="px-2 py-1 bg-amber-400 text-stone-950 rounded-lg font-black text-[10px]"
                  >
                    {copiedMemo ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenTonkeeper}
              className="w-full py-3 rounded-xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>💎</span> Pay in Tonkeeper (Auto-Fill)
            </button>

            <button
              onClick={handleOpenAnyWallet}
              className="w-full py-2.5 rounded-xl zentorno-btn-secondary text-xs font-bold uppercase mb-3"
            >
              Other Wallet (Tonhub / MyTonWallet)
            </button>

            <div className="mb-3 pt-2 border-t border-[#1a2620]">
              <input
                type="text"
                placeholder="Paste your TON wallet address (Optional)"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                className="w-full zentorno-input p-2.5 text-xs font-mono text-slate-200 placeholder:text-[#4f6158] rounded-xl"
              />
            </div>

            <button
              onClick={handleVerifyDeposit}
              disabled={verifying}
              className="w-full py-3 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider mb-2"
            >
              {verifying ? 'Checking Blockchain...' : '✅ Verify Deposit Now'}
            </button>
          </div>
        </div>
      )}

      <LanguageModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />
    </div>
  )
}

export default Home
