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
      toast.error(`Insufficient Balance: Available is ${user.honey_balance.toFixed(4)} ${selectedCrypto === 'GRAM' ? 'GRAM' : 'USDT'} (Requested: ${numAmount.toFixed(4)}). Collect from your Miner to earn more!`)
      await refreshUser()
      return
    }

    setSubmitting(true)
    try {
      await requestWithdrawal(numAmount, wallet.trim(), selectedCrypto)
      toast.success('🎉 Withdrawal request submitted successfully!')
      await refreshUser()
      setWallet('')
      setAmount('')
      // Switch to history tab to view pending payout
      switchTab('history')
    } catch (err: any) {
      await refreshUser()
      const errMsg = err?.response?.data?.error || 'Withdrawal failed'
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReinvest = async () => {
    if (!user || user.honey_balance < 1.0) {
      toast.error(`Minimum reinvest amount is 1.00 USDT (1 USDT = 50 GHS). Your current balance is ${user ? user.honey_balance.toFixed(4) : '0.0000'} USDT. Collect honey from your miner!`)
      return
    }

    setReinvesting(true)
    try {
      const res = await reinvestHoney(user.honey_balance)
      toast.success(`🎉 Reinvested! +${res.power_gained} GHS Mining Power Added!`)
      await refreshUser()
    } catch (err: any) {
      await refreshUser()
      const errMsg = err?.response?.data?.error || 'Reinvestment failed'
      toast.error(errMsg)
    } finally {
      setReinvesting(false)
    }
  }

  const userUsdtBalance = user ? user.honey_balance.toFixed(7) : '0.0000000'

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      <div className="text-center mb-5">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
          WALLET & CASHOUT
        </h1>
        <p className="text-xs font-semibold text-stone-400 mt-1">
          Fast crypto cashouts & transaction history
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#131d1a] border border-[#273a33] rounded-2xl mb-4 shadow-sm">
        <button
          onClick={() => switchTab('withdraw')}
          className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'withdraw'
              ? 'bg-[#93b3a6] text-[#0f1614] shadow-md scale-[1.01]'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          WITHDRAW
        </button>

        <button
          onClick={() => switchTab('history')}
          className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-[#93b3a6] text-[#0f1614] shadow-md scale-[1.01]'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          HISTORY
        </button>
      </div>

      {activeTab === 'withdraw' ? (
        <>
          <div className="zentorno-card p-5 mb-4 text-center">
            <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
              YOUR {t('balance_available', 'AVAILABLE BALANCE')}
            </div>
            <div className="text-3xl font-black text-stone-100 mt-1 mb-4">
              {userUsdtBalance} USDT
            </div>

            <button
              onClick={handleReinvest}
              disabled={reinvesting}
              className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {reinvesting ? 'REINVESTING...' : 'REINVEST BALANCE (MIN 1 USDT = 50 GHS)'}
            </button>
          </div>

          <form onSubmit={handleWithdraw} className="zentorno-card p-5 mb-4">
            <div className="mb-5">
              <label className="text-[11px] font-extrabold text-stone-400 block mb-2 uppercase tracking-wide">
                Withdrawal Currency (Select One)
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#131d1a] border border-[#273a33] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedCrypto('USDT_BSC')}
                  className={`py-3 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    selectedCrypto === 'USDT_BSC'
                      ? 'bg-[#93b3a6] text-[#0f1614] shadow-md scale-[1.02]'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <span>USDT</span>
                  <span className="text-[9px] font-bold opacity-80">BSC (BEP-20)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCrypto('GRAM')}
                  className={`py-3 px-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    selectedCrypto === 'GRAM'
                      ? 'bg-[#93b3a6] text-[#0f1614] shadow-md scale-[1.02]'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <span>GRAM</span>
                  <span className="text-[9px] font-bold opacity-80">GRAM Network</span>
                </button>
              </div>
            </div>

            <div className="mb-4 bg-[#1f2d28] border border-[#2e423b] rounded-xl py-2 px-3 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-bold">Selected Network:</span>
              <span className="font-black text-[#93b3a6]">
                {selectedCrypto === 'USDT_BSC' ? 'BNB Smart Chain (BEP-20)' : 'GRAM Network (TON)'}
              </span>
            </div>

            <div className="mb-4">
              <label className="text-xs font-extrabold text-stone-300 block mb-2">
                {selectedCrypto === 'USDT_BSC' ? 'USDT BSC (BEP-20) Address' : 'GRAM ' + t('destination_wallet', 'Wallet Address')}
              </label>
              <input
                type="text"
                placeholder={selectedCrypto === 'USDT_BSC' ? '0x... (42 characters BSC address)' : 'Enter your GRAM address'}
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full zentorno-input px-4 py-3.5 text-xs font-mono font-medium focus:outline-none focus:border-[#93b3a6]"
              />
            </div>

            <div className="mb-1">
              <label className="text-xs font-extrabold text-stone-300 block mb-2">
                Amount to withdraw
              </label>
              <div className="zentorno-input px-4 py-3 flex items-center justify-between">
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-sm font-extrabold text-stone-100 focus:outline-none"
                />
                <span className="text-xs font-black text-stone-300 ml-2">
                  {selectedCrypto === 'USDT_BSC' ? 'USDT' : 'GRAM'}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-stone-400 mb-4 mt-1">
              Minimum withdrawal is {minWithdrawal.toFixed(2)} USDT
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl zentorno-btn-primary font-black text-sm uppercase tracking-wider shadow-md active:scale-95"
            >
              {submitting ? 'PROCESSING...' : `WITHDRAW ${selectedCrypto === 'USDT_BSC' ? 'USDT (BSC)' : 'GRAM'}`}
            </button>
          </form>
        </>
      ) : (
        /* History Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
              WITHDRAWAL REQUESTS
            </span>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-[11px] font-bold text-[#93b3a6] hover:underline flex items-center gap-1"
            >
              <svg className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              REFRESH
            </button>
          </div>

          {loadingHistory ? (
            <div className="zentorno-card p-8 text-center text-stone-400">
              <div className="w-8 h-8 border-3 border-[#93b3a6] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-wider">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="zentorno-card p-8 text-center text-stone-400">
              <div className="text-3xl mb-2">📜</div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-300">No withdrawals yet</p>
              <p className="text-[11px] text-stone-500 mt-1">Your payout requests and statuses will show up here.</p>
              <button
                onClick={() => switchTab('withdraw')}
                className="mt-4 px-4 py-2 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider"
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
                <div key={item.id} className="zentorno-card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-stone-100">
                        {Number(item.amount_usd || item.amount_honey || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#1d2b26] text-[#93b3a6] border border-[#2e423b]">
                        {item.payout_method || 'GRAM'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isApproved
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : isRejected
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {isApproved ? '✅ COMPLETED' : isRejected ? '❌ REJECTED' : '⏳ PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-[#1d2b26]">
                    <span className="font-mono text-stone-400 truncate max-w-[200px]" title={item.wallet_address}>
                      {truncAddress}
                    </span>
                    <span className="text-stone-500 font-medium">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="w-full mt-4 py-4 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
      >
        BACK TO MINER
      </button>
    </div>
  )
}
export default Withdraw
