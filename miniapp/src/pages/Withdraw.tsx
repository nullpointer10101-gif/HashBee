import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { requestWithdrawal, reinvestHoney, fetchWithdrawals } from '../services/api'
import { Withdrawal } from '../types'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'

export const Withdraw: React.FC = () => {
  const { t } = useLanguage()
  const { user, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>(tabParam === 'history' ? 'history' : 'withdraw')
  
  const [amount, setAmount] = useState<string>('')
  const [wallet, setWallet] = useState<string>('')
  const [selectedCrypto, setSelectedCrypto] = useState<'GRAM' | 'USDT_BSC'>('GRAM')
  const [submitting, setSubmitting] = useState(false)
  const [reinvesting, setReinvesting] = useState(false)
  const [history, setHistory] = useState<Withdrawal[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showQualifyModal, setShowQualifyModal] = useState(false)
  const navigate = useNavigate()

  const minWithdrawal = 0.05

  // Refresh user profile on mount to ensure fresh balance
  useEffect(() => {
    refreshUser()
  }, [])

  // Sync tab with URL
  useEffect(() => {
    if (tabParam === 'history') {
      setActiveTab('history')
    } else {
      setActiveTab('withdraw')
    }
  }, [tabParam])

  // Load history when tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await fetchWithdrawals()
      setHistory(data || [])
    } catch (err) {
      console.error('Failed to load withdrawals history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const switchTab = (tab: 'withdraw' | 'history') => {
    setActiveTab(tab)
    if (tab === 'history') {
      setSearchParams({ tab: 'history' })
    } else {
      setSearchParams({})
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)

    if (!numAmount || isNaN(numAmount) || numAmount < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${minWithdrawal.toFixed(2)} ${selectedCrypto === 'GRAM' ? 'GRAM' : 'USDT'}`)
      return
    }

    if (!wallet.trim()) {
      toast.error('Please enter your destination wallet address')
      return
    }

    if (selectedCrypto === 'USDT_BSC') {
      if (!wallet.trim().startsWith('0x') || wallet.trim().length !== 42) {
        toast.error('Invalid BSC address. Must start with 0x and be 42 characters')
        return
      }
    }

    if (user && numAmount > user.honey_balance) {
      toast.error(`Insufficient Balance: Available is ${user.honey_balance.toFixed(4)} ${selectedCrypto === 'GRAM' ? 'GRAM' : 'USDT'}`)
      await refreshUser()
      return
    }

    // Check Lifetime Withdrawal Qualification
    const cratesOpened = user?.crates_opened_count || 0
    const friendCratesOpened = user?.friend_crates_opened_count || 0
    const isOneTimeGranted = user?.one_time_withdrawal_granted || false
    const isLifetimeQualified = user?.can_withdraw_lifetime || (cratesOpened >= 1 || friendCratesOpened >= 1 || isOneTimeGranted)

    if (!isLifetimeQualified) {
      setShowQualifyModal(true)
      return
    }

    setSubmitting(true)
    try {
      await requestWithdrawal(numAmount, wallet.trim(), selectedCrypto)
      toast.success('🎉 Withdrawal request submitted successfully!')
      await refreshUser()
      setWallet('')
      setAmount('')
      switchTab('history')
    } catch (err: any) {
      await refreshUser()
      const errMsg = err?.response?.data?.error || 'Withdrawal failed'
      if (errMsg.includes('QUALIFICATION_REQUIRED') || errMsg.includes('Mystery Crate') || errMsg.includes('friend') || errMsg.includes('Plan')) {
        setShowQualifyModal(true)
      } else {
        toast.error(errMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReinvest = async () => {
    if (!user || user.honey_balance < 1.0) {
      toast.error(`Minimum reinvest amount is 1.00 USDT (1 USDT = 50 GHS). Current balance: ${user ? user.honey_balance.toFixed(4) : '0.0000'} USDT`)
      return
    }

    setReinvesting(true)
    try {
      const res = await reinvestHoney(user.honey_balance)
      toast.success(`🎉 Reinvested! +${res.power_gained} GHS Mining Power Added!`)
      await refreshUser()
    } catch (err: any) {
      await refreshUser()
      toast.error(err?.response?.data?.error || 'Reinvestment failed')
    } finally {
      setReinvesting(false)
    }
  }

  const userUsdtBalance = user ? user.honey_balance.toFixed(4) : '0.0000'

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#060807] text-[#f8fafc]">
      <div className="text-center mb-4">
        <h1 className="text-base font-extrabold text-white uppercase tracking-wider">
          Wallet & Cashout
        </h1>
        <p className="text-[11px] font-medium text-[#84948c] mt-0.5">
          Fast crypto cashouts & transaction ledger
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-[#0d1411] p-1 rounded-2xl border border-[#17241d] mb-4 shadow-sm">
        <button
          onClick={() => switchTab('withdraw')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'withdraw'
              ? 'bg-white text-black shadow-md'
              : 'text-[#84948c] hover:text-white'
          }`}
        >
          <span>WITHDRAW</span>
        </button>

        <button
          onClick={() => switchTab('history')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white text-black shadow-md'
              : 'text-[#84948c] hover:text-white'
          }`}
        >
          <span>HISTORY</span>
        </button>
      </div>

      {activeTab === 'withdraw' ? (
        <>
          {/* Balance Card */}
          <div className="lux-card p-5 mb-3.5 text-center">
            <div className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-widest">
              {t('balance_available', 'AVAILABLE BALANCE')}
            </div>
            <div className="text-3xl font-black text-white mt-1 mb-4 font-mono">
              {userUsdtBalance} <span className="text-base text-[#00f090] font-sans">USDT</span>
            </div>

            <button
              onClick={handleReinvest}
              disabled={reinvesting}
              className="w-full py-3 rounded-xl btn-surface font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {reinvesting ? 'REINVESTING...' : '⚡ REINVEST BALANCE (MIN 1 USDT = 50 GHS)'}
            </button>
          </div>

          <form onSubmit={handleWithdraw} className="lux-card p-5 mb-3.5 space-y-4">
            <div>
              <label className="text-[10px] font-extrabold text-[#84948c] block mb-2 uppercase tracking-wide">
                Withdrawal Currency
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#080c0a] border border-[#17241d] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedCrypto('USDT_BSC')}
                  className={`py-2.5 px-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    selectedCrypto === 'USDT_BSC'
                      ? 'bg-white text-black shadow-md'
                      : 'text-[#84948c] hover:text-white'
                  }`}
                >
                  <span>USDT</span>
                  <span className="text-[9px] opacity-70">BSC (BEP-20)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCrypto('GRAM')}
                  className={`py-2.5 px-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    selectedCrypto === 'GRAM'
                      ? 'bg-white text-black shadow-md'
                      : 'text-[#84948c] hover:text-white'
                  }`}
                >
                  <span>GRAM</span>
                  <span className="text-[9px] opacity-70">TON Mainnet</span>
                </button>
              </div>
            </div>

            <div className="bg-[#080c0a] border border-[#17241d] rounded-xl py-2 px-3 flex items-center justify-between text-xs">
              <span className="text-[#84948c] font-bold">Network:</span>
              <span className="font-extrabold text-[#00f090]">
                {selectedCrypto === 'USDT_BSC' ? 'BNB Smart Chain (BEP-20)' : 'GRAM Network (TON)'}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#84948c] uppercase block mb-1.5">
                {selectedCrypto === 'USDT_BSC' ? 'USDT BSC (BEP-20) Address' : 'GRAM Destination Address'}
              </label>
              <input
                type="text"
                placeholder={selectedCrypto === 'USDT_BSC' ? '0x... (42 characters BSC address)' : 'Enter TON/GRAM address'}
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full lux-input px-3.5 py-3 text-xs font-mono font-medium outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#84948c] uppercase block mb-1.5">
                Amount to Withdraw
              </label>
              <div className="lux-input px-3.5 py-2.5 flex items-center justify-between">
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-sm font-extrabold text-white outline-none font-mono"
                />
                <span className="text-xs font-black text-[#84948c] ml-2">
                  {selectedCrypto === 'USDT_BSC' ? 'USDT' : 'GRAM'}
                </span>
              </div>
              <div className="text-[10px] font-medium text-[#84948c] mt-1.5">
                Minimum withdrawal: {minWithdrawal.toFixed(2)} USDT
              </div>
            </div>

            {/* High-Contrast Pure White Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl btn-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {submitting ? 'PROCESSING...' : `WITHDRAW ${selectedCrypto === 'USDT_BSC' ? 'USDT (BSC)' : 'GRAM'}`}
            </button>

            <div className="p-3 rounded-xl bg-[#080c0a] border border-[#17241d] text-[11px] text-[#84948c] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>🛡️</span>
                <span>Protected Automated Settlements</span>
              </div>
              <p className="leading-snug">
                You can withdraw all profits from Cloud Mining, 24H Yield Plans, Spin rewards, and Referrals.
              </p>
            </div>
          </form>
        </>
      ) : (
        /* History Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#84948c]">
              WITHDRAWAL HISTORY
            </span>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-[11px] font-bold text-[#00f090] hover:underline flex items-center gap-1"
            >
              REFRESH
            </button>
          </div>

          {loadingHistory ? (
            <div className="lux-card p-8 text-center text-[#84948c]">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-wider">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="lux-card p-8 text-center text-[#84948c]">
              <div className="text-3xl mb-2">📜</div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">No withdrawals yet</p>
              <p className="text-[11px] text-[#84948c] mt-1">Your payout requests and blockchain proofs will show up here.</p>
              <button
                onClick={() => switchTab('withdraw')}
                className="mt-4 px-4 py-2.5 rounded-xl btn-white font-black text-xs uppercase tracking-wider"
              >
                REQUEST WITHDRAWAL
              </button>
            </div>
          ) : (
            history.map((item) => {
              const status = (item.status || 'pending').toLowerCase()
              const isApproved = status === 'completed' || status === 'approved' || status === 'paid'
              const isRejected = status === 'rejected' || status === 'cancelled'
              
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent'

              const truncAddress = item.wallet_address
                ? item.wallet_address.length > 16
                  ? `${item.wallet_address.slice(0, 8)}...${item.wallet_address.slice(-6)}`
                  : item.wallet_address
                : 'N/A'

              return (
                <div key={item.id} className="lux-card p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white font-mono">
                        {Number(item.amount_usd || item.amount_honey || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#080c0a] text-[#84948c] border border-[#17241d]">
                        {item.payout_method || 'GRAM'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isApproved ? '✓ COMPLETED' : isRejected ? '✕ REJECTED' : '⏳ PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#84948c] pt-1 border-t border-[#17241d]">
                    <span className="font-mono truncate max-w-[180px]" title={item.wallet_address}>
                      {truncAddress}
                    </span>
                    <span className="font-medium">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Qualification Modal Popup */}
      {showQualifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="lux-card p-5 max-w-sm w-full shadow-2xl relative text-center">
            {/* Close Button */}
            <button
              onClick={() => setShowQualifyModal(false)}
              className="absolute top-4 right-4 text-[#84948c] hover:text-white p-1 rounded-full bg-white/5"
            >
              ✕
            </button>

            <div className="w-12 h-12 bg-[#080c0a] border border-[#17241d] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
              ⚡
            </div>
            
            <h3 className="text-sm font-black text-white uppercase tracking-wide">
              Unlock Instant Cashout
            </h3>
            <p className="text-[11px] text-[#84948c] mt-1 leading-relaxed">
              Activate any <span className="text-white font-bold">24H Mining Plan</span> (or invite 1 friend who activates a plan) to unlock unlimited lifetime cashouts:
            </p>

            {/* Requirement Cards */}
            <div className="mt-4 space-y-2.5 text-left">
              {/* Option 1: Activate 1 Mining Plan */}
              <div className="p-3.5 rounded-2xl bg-[#080c0a] border border-[#17241d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs text-white uppercase">
                    Option 1: Activate Plan
                  </span>
                  <span className="bg-[#00f090] text-black text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full">
                    INSTANT
                  </span>
                </div>
                <p className="text-[11px] text-[#84948c] mb-2.5 leading-snug">
                  Activate any 24h Daily Yield Plan (from <b>0.70 TON</b>) to earn daily profit & unlock unlimited withdrawals.
                </p>
                <button
                  onClick={() => {
                    setShowQualifyModal(false)
                    navigate('/plans')
                  }}
                  className="w-full py-2.5 rounded-xl btn-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <span>⚡ ACTIVATE PLAN (0.70 TON)</span>
                  <span>➔</span>
                </button>
              </div>

              {/* Option 2: 1 Friend Activates Plan */}
              <div className="p-3.5 rounded-2xl bg-[#080c0a] border border-[#17241d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs text-white uppercase">
                    Option 2: Invite Friend
                  </span>
                  <span className="text-[10px] font-black text-[#00f090]">
                    {user?.friend_crates_opened_count || 0}/1
                  </span>
                </div>
                <p className="text-[11px] text-[#84948c] mb-2.5 leading-snug">
                  Invite 1 friend who activates any Daily Plan for 100% free lifetime verification.
                </p>
                
                <button
                  onClick={() => {
                    setShowQualifyModal(false)
                    navigate('/earn')
                  }}
                  className="w-full py-2.5 rounded-xl btn-surface text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <span>👥 INVITE FRIENDS</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#17241d]">
              <button
                onClick={() => setShowQualifyModal(false)}
                className="text-xs font-bold text-[#84948c] hover:text-white uppercase tracking-wider"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Withdraw
