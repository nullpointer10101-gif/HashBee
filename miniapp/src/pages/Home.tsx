import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { claimHoney, checkDeposit } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export const Home: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [claiming, setClaiming] = useState(false)
  const [showAddGhsModal, setShowAddGhsModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState<string>('1')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const navigate = useNavigate()

  // Real-time ticking pending balance
  const [pendingBalance, setPendingBalance] = useState<number>(0)

  const ghs = user?.bee_power || 10
  // Zentorno formula: 0.9000 USDT per day per 1,000 GHS
  const earningsPerDay = ghs * 0.0009
  const earningsPerSecond = earningsPerDay / 86400

  useEffect(() => {
    if (user) {
      setPendingBalance(user.current_unclaimed_honey || 0)
    }
  }, [user?.current_unclaimed_honey])

  useEffect(() => {
    // Tick up every 100ms
    const interval = setInterval(() => {
      setPendingBalance((prev) => prev + earningsPerSecond / 10)
    }, 100)
    return () => clearInterval(interval)
  }, [earningsPerSecond])

  if (!user) return null

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
      toast.success(`🎉 Claimed +${res.claimed.toFixed(7)} USDT!`)
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
  // Rate: 20 USDT = 1000 GHS => 1 USDT = 50 GHS, +5% bonus = 52.5 GHS per 1 USDT
  const totalGhsPower = numDeposit * 50 * 1.05
  const modalEarningsPerDay = totalGhsPower * 0.0009
  const modalEarningsPerSecond = modalEarningsPerDay / 86400
  const modalEarningsPerWeek = modalEarningsPerDay * 7
  const modalEarningsPerMonth = modalEarningsPerDay * 30

  const depositAddress = 'UQAehBZqsy6cBGSmVn2qquO5b44ckmTnhmT9K0LKcfsygGpO'
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const userMemo = user ? `HB_${user.telegram_id}` : 'HB_MINER'

  const copyMemo = () => {
    navigator.clipboard.writeText(userMemo)
    setCopiedMemo(true)
    toast.success('Memo copied! Paste this in your transfer comment.')
    setTimeout(() => setCopiedMemo(false), 2500)
  }

  const handleVerifyDeposit = async () => {
    setVerifying(true)
    toast.loading('Checking blockchain for your deposit...', { id: 'verify-dep' })
    try {
      const res = await checkDeposit()
      toast.dismiss('verify-dep')
      await refreshUser()
      toast.success('🎉 Deposit check complete! Any detected transfers are credited.')
      setShowPayModal(false)
    } catch (err: any) {
      toast.dismiss('verify-dep')
      toast.error('Could not verify yet. TON transfers usually arrive in 5–15 seconds!')
    } finally {
      setVerifying(false)
    }
  }

  const copyDepositAddress = () => {
    navigator.clipboard.writeText(depositAddress)
    setCopiedAddr(true)
    toast.success('USDT (BSC) address copied!')
    setTimeout(() => setCopiedAddr(false), 2500)
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-extrabold text-stone-100 uppercase tracking-wider">
          MINING DASHBOARD
        </h1>
      </div>

      {/* Card 1: TOTAL GHS POWER */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
          TOTAL GHS POWER
        </div>
        <div className="text-3xl font-black text-stone-100 mt-1">
          {ghs.toLocaleString()} GHS
        </div>
        <div className="text-xs font-semibold text-stone-400 mt-1">
          +{earningsPerSecond.toFixed(8)} USDT/second
        </div>

        {/* Side-by-Side Buttons */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={() => setShowAddGhsModal(true)}
            className="flex-1 py-3 rounded-2xl zentorno-btn-primary font-extrabold text-xs uppercase tracking-wider shadow-md"
          >
            ADD GHS
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex-1 py-3 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
          >
            FREE GHS
          </button>
        </div>
      </div>

      {/* Card 2: YOUR BALANCE & PENDING BALANCE */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
          YOUR BALANCE
        </div>
        <div className="text-3xl font-black text-stone-100 mt-1">
          {user.honey_balance.toFixed(7)} USDT
        </div>

        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>PENDING BALANCE (LIVE)</span>
        </div>
        <div className="text-2xl font-black text-stone-100 mt-1 font-mono tracking-tight">
          {pendingBalance.toFixed(8)} USDT
        </div>
        <div className="text-[11px] font-bold text-[#86a397] mt-0.5">
          ⚡ 24/7 Cloud Mining Active (+{earningsPerSecond.toFixed(8)} USDT/sec)
        </div>

        {/* CLAIM BALANCE Primary Button */}
        <button
          onClick={handleClaim}
          disabled={pendingBalance < 0.01 || claiming}
          className={`w-full mt-5 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
            pendingBalance >= 0.01
              ? 'zentorno-btn-primary active:scale-95'
              : 'bg-[#1b2623] text-stone-600 border border-[#253530] cursor-not-allowed'
          }`}
        >
          {claiming ? 'CLAIMING...' : pendingBalance >= 0.01 ? 'CLAIM BALANCE' : 'CLAIM (MIN 0.01)'}
        </button>
      </div>

      {/* Card 3: HISTORY Outline Button */}
      <button
        onClick={() => navigate('/withdraw')}
        className="w-full py-4 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        HISTORY
      </button>

      {/* ======================================================== */}
      {/* 🚀 EXACT ADD GHS MODAL (ZENTORNO CLONE)                  */}
      {/* ======================================================== */}
      {showAddGhsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#121c19] border border-[#273a33] rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 text-stone-100 shadow-2xl relative">
            {/* Header */}
            <div className="text-center mb-5 relative">
              <button
                onClick={() => setShowAddGhsModal(false)}
                className="absolute left-0 top-0 text-stone-400 hover:text-white p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-black uppercase tracking-wider">ADD GHS</h2>
            </div>

            {/* Input: Amount to deposit (GRAM) */}
            <div className="mb-4">
              <label className="text-[11px] font-extrabold text-stone-400 block mb-1.5 uppercase tracking-wide">
                Amount to deposit (GRAM)
              </label>
              <div className="zentorno-input p-3.5 flex items-center justify-between">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent text-xl font-black text-stone-100 focus:outline-none"
                />
                <span className="text-xs font-black text-stone-400 ml-2 whitespace-nowrap">
                  GRAM
                </span>
              </div>
              <div className="text-[10px] text-stone-400 font-semibold mt-1">
                Minimum deposit: 0.10 GRAM
              </div>
            </div>

            {/* +5% First Deposit Bonus Banner */}
            <div className="bg-[#8ba89c] text-[#0f1614] rounded-2xl py-3 px-4 text-center mb-4 font-black text-xs uppercase tracking-wide shadow-sm">
              +5% first deposit bonus!
            </div>

            {/* Card: YOU WILL GET */}
            <div className="border border-[#2a3c35] bg-[#16231f] rounded-2xl p-4 text-center mb-4">
              <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">
                YOU WILL GET
              </div>
              <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mt-1">
                TOTAL GHS POWER
              </div>
              <div className="text-3xl font-black text-stone-100 mt-1">
                {totalGhsPower.toFixed(1)} GHS
              </div>
              <div className="text-[11px] font-bold text-[#86a397] mt-1 flex items-center justify-center gap-1">
                🎁 +5% first deposit bonus applied!
              </div>
            </div>

            {/* Card: POTENTIAL EARNINGS (2x2 Grid) */}
            <div className="border border-[#2a3c35] bg-[#16231f] rounded-2xl p-4 mb-4">
              <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest text-center mb-3">
                POTENTIAL EARNINGS
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* PER SECOND */}
                <div className="bg-[#121b18] border border-[#22332d] rounded-xl p-2.5">
                  <div className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">
                    PER SECOND
                  </div>
                  <div className="text-xs font-black text-stone-100 mt-0.5 truncate">
                    {modalEarningsPerSecond.toFixed(8)}
                  </div>
                  <div className="text-[9px] font-bold text-stone-500">GRAM</div>
                </div>

                {/* PER DAY */}
                <div className="bg-[#121b18] border border-[#22332d] rounded-xl p-2.5">
                  <div className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">
                    PER DAY
                  </div>
                  <div className="text-xs font-black text-stone-100 mt-0.5">
                    {modalEarningsPerDay.toFixed(4)}
                  </div>
                  <div className="text-[9px] font-bold text-stone-500">GRAM</div>
                </div>

                {/* PER WEEK */}
                <div className="bg-[#121b18] border border-[#22332d] rounded-xl p-2.5">
                  <div className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">
                    PER WEEK
                  </div>
                  <div className="text-xs font-black text-stone-100 mt-0.5">
                    {modalEarningsPerWeek.toFixed(4)}
                  </div>
                  <div className="text-[9px] font-bold text-stone-500">GRAM</div>
                </div>

                {/* PER MONTH */}
                <div className="bg-[#121b18] border border-[#22332d] rounded-xl p-2.5">
                  <div className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">
                    PER MONTH
                  </div>
                  <div className="text-xs font-black text-stone-100 mt-0.5">
                    {modalEarningsPerMonth.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-bold text-stone-500">GRAM</div>
                </div>
              </div>

              {/* Footnote */}
              <div className="text-[9.5px] italic text-stone-400 text-center mt-3 leading-relaxed">
                These GHS last 30 days. Earnings: 0.9000 GRAM per day per 1,000 GHS. Rate: 20.00 GRAM = 1,000 GHS.
              </div>
            </div>

            {/* Buttons: PAY ORDER & BACK */}
            <button
              onClick={() => {
                setShowAddGhsModal(false)
                setShowPayModal(true)
              }}
              className="w-full py-4 rounded-2xl bg-[#8ba89c] hover:bg-[#9cb8ac] text-[#0f1614] font-black text-sm uppercase tracking-wider mb-2.5 shadow-md active:scale-95 transition-all"
            >
              PAY ORDER
            </button>

            <button
              onClick={() => setShowAddGhsModal(false)}
              className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 💳 PAY ORDER MODAL (TON / GRAM AUTOMATIC)                 */}
      {/* ======================================================== */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#121c19] border border-[#273a33] rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 text-stone-100 shadow-2xl relative">
            <div className="text-center mb-3">
              <h2 className="text-lg font-black uppercase tracking-wider">PAYMENT ORDER</h2>
              <p className="text-xs text-stone-400 mt-0.5">Send exact GRAM on TON Blockchain</p>
            </div>

            <div className="border border-[#2a3c35] bg-[#16231f] rounded-2xl p-3.5 mb-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-400">Network</span>
                <span className="text-xs font-black text-[#93b3a6] bg-[#1f2d28] px-2 py-0.5 rounded-lg border border-[#2e423b]">
                  TON / GRAM
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-400">Amount</span>
                <span className="text-base font-black text-white">{numDeposit.toFixed(2)} GRAM</span>
              </div>

              {/* Deposit Address */}
              <div className="border-t border-[#253530] pt-2.5">
                <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider mb-1">
                  Official Deposit Address
                </div>
                <div className="zentorno-input p-2 flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-stone-200 truncate flex-1">
                    {depositAddress}
                  </span>
                  <button
                    onClick={copyDepositAddress}
                    className="p-1.5 bg-[#93b3a6] text-[#0f1614] rounded-lg font-bold text-[11px] shrink-0"
                  >
                    {copiedAddr ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* REQUIRED COMMENT / MEMO */}
              <div className="bg-[#241c10] border border-[#543b18] rounded-xl p-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                    REQUIRED MEMO / COMMENT
                  </span>
                  <span className="text-[9px] font-bold text-amber-400">MUST INCLUDE</span>
                </div>
                <div className="zentorno-input p-2 flex items-center justify-between gap-1.5 border-amber-500/40">
                  <span className="text-xs font-mono font-black text-amber-300">
                    {userMemo}
                  </span>
                  <button
                    onClick={copyMemo}
                    className="p-1.5 bg-amber-400 hover:bg-amber-300 text-stone-900 rounded-lg font-black text-[11px] shrink-0"
                  >
                    {copiedMemo ? 'COPIED!' : 'COPY MEMO'}
                  </button>
                </div>
                <div className="text-[9.5px] text-amber-200/80 font-medium mt-1 leading-tight">
                  ⚠️ Paste this in your wallet comment so power is credited automatically!
                </div>
              </div>
            </div>

            {/* Direct Tonkeeper / Wallet link button */}
            <a
              href={`ton://transfer/${depositAddress}?amount=${Math.round(numDeposit * 1e9)}&text=${encodeURIComponent(userMemo)}`}
              className="w-full py-3 rounded-2xl bg-[#0088cc] hover:bg-[#0099e6] text-white font-black text-xs uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center block"
            >
              💎 PAY IN TONKEEPER / WALLET
            </a>

            {/* Instant verification button */}
            <button
              onClick={handleVerifyDeposit}
              disabled={verifying}
              className="w-full py-3.5 rounded-2xl zentorno-btn-primary font-black text-xs uppercase tracking-wider mb-2 active:scale-95 shadow-md"
            >
              {verifying ? 'CHECKING BLOCKCHAIN...' : '✅ I HAVE SENT PAYMENT (VERIFY NOW)'}
            </button>

            <button
              onClick={() => setShowPayModal(false)}
              className="w-full py-2.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default Home
