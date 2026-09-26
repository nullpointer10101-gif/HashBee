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
    toast.success('Memo copied! Paste this in your transfer comment.')
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
      toast.error('Could not verify yet. TON transfers usually arrive in 5–15 seconds!')
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
  // Rate: 1 GRAM = 50 GHS, +5% bonus = 52.5 GHS per 1 GRAM
  const totalGhsPower = numDeposit * 50 * 1.05
  const modalEarningsPerDay = totalGhsPower * 0.0005
  const modalEarningsPerSecond = modalEarningsPerDay / 86400
  const modalEarningsPerWeek = modalEarningsPerDay * 7
  const modalEarningsPerMonth = modalEarningsPerDay * 30

  // IF LOADING, SHOW BEAUTIFUL LOADING SPINNER INSTEAD OF BLANK SCREEN
  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div className="w-12 h-12 border-4 border-[#93b3a6] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-extrabold text-[#93b3a6] uppercase tracking-wider animate-pulse">
          Starting Cloud Miner...
        </p>
      </div>
    )
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header with Language Switcher & Support Link */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-stone-100 uppercase tracking-wider">
          {t('mining_dashboard', 'MINING DASHBOARD')}
        </h1>
        <div className="flex items-center gap-1.5">
          {/* Language Switcher Option Left to CS Support */}
          <button
            onClick={() => setShowLangModal(true)}
            className="flex items-center gap-1 text-[11px] font-extrabold text-stone-200 bg-[#1e2d27] hover:bg-[#283d35] px-2.5 py-1.5 rounded-full border border-[#334d42] transition-all shadow-sm active:scale-95"
            title="Change Language"
          >
            <span className="text-xs">{currentLanguage.flag}</span>
            <span className="uppercase tracking-wider">{currentLanguage.code}</span>
          </button>

          {/* CS Support Button */}
          <a
            href="https://t.me/kiopajje"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 px-2.5 py-1.5 rounded-full border border-emerald-400/20 transition-all active:scale-95"
          >
            <span>🎧</span>
            <span>{t('support', 'Support')}</span>
          </a>
        </div>
      </div>

      {/* Card 1: TOTAL GHS POWER */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">{t('total_ghs_power', 'TOTAL GHS POWER')}</div>
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
          >{t('add_ghs', 'ADD GHS')}</button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex-1 py-3 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
          >{t('free_ghs', 'FREE GHS')}</button>
        </div>
      </div>

      {/* 🎡 LUCKY WHEEL CALLOUT BANNER */}
      <div
        onClick={() => navigate('/spin')}
        className="cursor-pointer mb-4 p-4 rounded-3xl bg-gradient-to-r from-[#1b382b] via-[#244b3a] to-[#1b382b] border border-[#346b53] shadow-xl flex items-center justify-between transition-all duration-200 active:scale-98 hover:border-amber-400/60"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">🎡</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Lucky Wheel</span>
              <span className="text-[9px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.5 rounded-full">FREE SPINS</span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium mt-0.5">Spin for USDT, GRAM & Hashrate!</p>
          </div>
        </div>
        <button className="bg-amber-400 text-stone-950 px-3.5 py-1.5 rounded-xl font-black text-xs uppercase shadow-md hover:bg-amber-300">
          SPIN ➔
        </button>
      </div>

      {/* Card 2: YOUR BALANCE & PENDING BALANCE */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">{t('your_balance', 'YOUR BALANCE')}</div>
        <div className="text-3xl font-black text-stone-100 mt-1">
          {user.honey_balance.toFixed(7)} USDT
        </div>

        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{t('pending_balance_live', 'PENDING BALANCE (LIVE)')}</span>
        </div>
        <div className="text-2xl font-black text-stone-100 mt-1 font-mono tracking-tight">
          {pendingBalance.toFixed(8)} USDT
        </div>
        <div className="text-[11px] font-bold text-[#86a397] mt-0.5">
          ⚡ {t('cloud_active', '24/7 Cloud Mining Active')} (+{earningsPerSecond.toFixed(8)} USDT/sec)
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
          {claiming ? t('claiming', 'CLAIMING...') : pendingBalance >= 0.01 ? t('claim_balance', 'CLAIM BALANCE') : t('claim_min', 'CLAIM (MIN 0.01)')}
        </button>
      </div>

      {/* Card 3: HISTORY Outline Button */}
      <button
        onClick={() => navigate('/withdraw?tab=history')}
        className="w-full py-4 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>{t('history', 'HISTORY')}</button>

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
              <label className="text-[11px] font-extrabold text-stone-400 block mb-1.5 uppercase tracking-wide">{t('amount_to_deposit', 'Amount to deposit (GRAM)')}</label>
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
                {t('min_deposit', 'Minimum deposit: 0.10 GRAM')}
              </div>
            </div>

            {/* +5% First Deposit Bonus Banner */}
            <div className="bg-[#8ba89c] text-[#0f1614] rounded-2xl py-3 px-4 text-center mb-4 font-black text-xs uppercase tracking-wide shadow-sm">
              {t('first_deposit_bonus', '+5% first deposit bonus!')}
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
                These GHS last 30 days. Earnings: 0.0500 GRAM per day per 100 GHS (0.50 GRAM / 1,000 GHS).
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

            {/* Direct Tonkeeper Button */}
            <button
              onClick={handleOpenTonkeeper}
              className="w-full py-3.5 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <span>💎</span> PAY IN TONKEEPER (AUTO-FILL)
            </button>

            {/* Other Wallets Button */}
            <button
              onClick={handleOpenAnyWallet}
              className="w-full py-2.5 rounded-2xl bg-[#182621] hover:bg-[#20332c] text-[#93b3a6] border border-[#2b4137] font-bold text-xs uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span>⚡</span> OTHER WALLET (TONHUB / MYTONWALLET)
            </button>

            {/* Optional sender address for memo-less payments */}
            <div className="mb-3 pt-2 border-t border-[#23332d]">
              <label className="text-[10.5px] font-bold text-stone-400 block mb-1">
                Sent without memo? (Optional)
              </label>
              <input
                type="text"
                placeholder="Paste your TON wallet address (UQ... or 0:...)"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                className="w-full zentorno-input p-2.5 text-xs font-mono text-stone-200 placeholder:text-stone-600 rounded-xl"
              />
            </div>

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
      <LanguageModal isOpen={showLangModal} onClose={() => setShowLangModal(false)} />
    </div>
  )
}

export default Home
