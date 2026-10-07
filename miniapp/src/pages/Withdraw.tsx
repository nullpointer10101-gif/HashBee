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

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    if (tabParam === 'history') {
      setActiveTab('history')
    } else {
      setActiveTab('withdraw')
    }
  }, [tabParam])

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
      if (errMsg.includes('QUALIFICATION_REQUIRED') || errMsg.includes('Plan') || errMsg.includes('friend')) {
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
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      <div className="text-center mb-4">
        <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
          Wallet & Cashout
        </h1>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
          Fast crypto cashouts & transaction ledger
        </p>
      </div>

      {/* ── LIVE WITHDRAWAL PROOFS BANNER (VIBRANT SOLID RED & CRYSTAL CLEAR WHITE TEXT) ── */}
      <div className="p-4 mb-4 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl border-2 border-red-300/60 relative overflow-hidden">
        {/* Dynamic Glow */}
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10 gap-3">
          <div className="flex items-center gap-3">
            {/* Pulsing Live Shield Icon */}
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0 shadow-md border border-white/30 relative">
              <span>🛡️</span>
              <span className="w-2.5 h-2.5 rounded-full bg-white absolute -top-0.5 -right-0.5 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide drop-shadow-sm">
                  CHECK PAYMENT PROOFS ONGOING HERE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/35 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/25 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f090] animate-ping" />
                  LIVE LEDGER
                </span>
              </div>
              <p className="text-[11px] text-white/90 font-bold mt-0.5 leading-tight drop-shadow-sm">
                100% Verified settlements on public blockchain ledger
              </p>
            </div>
          </div>

          <a
            href="https://t.me/HashBeePayouts"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-white text-red-700 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg active:scale-95 transition-all shrink-0 hover:bg-slate-100 border border-white/40"
          >
            <span>PROOFS</span>
            <span>➔</span>
          </a>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 mb-3.5 shadow-sm">
        <button
          onClick={() => switchTab('withdraw')}
          className={`flex-1 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'withdraw'
              ? 'bg-[#0088ff] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>WITHDRAW</span>
        </button>

        <button
          onClick={() => switchTab('history')}
          className={`flex-1 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#0088ff] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>HISTORY</span>
        </button>
      </div>

      {activeTab === 'withdraw' ? (
        <>
          {/* Balance Card (Luxury Dark Emerald & Gold Cyber Vault) */}
          <div className="p-5 mb-4 rounded-3xl bg-gradient-to-br from-[#061512] via-[#0d2920] to-[#041a15] text-white border border-emerald-500/30 shadow-xl relative overflow-hidden text-center">
            {/* Ambient Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest relative z-10">
              AVAILABLE CASHOUT BALANCE
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1.5 mb-4 font-mono relative z-10 drop-shadow">
              {userUsdtBalance} <span className="text-base text-[#00f090] font-sans font-extrabold">USDT</span>
            </div>

            <button
              onClick={handleReinvest}
              disabled={reinvesting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:brightness-105 relative z-10"
            >
              <span>⚡</span>
              <span>{reinvesting ? 'REINVESTING...' : 'REINVEST TO MINING POWER (1 USDT = 50 GHS)'}</span>
            </button>
          </div>

          <form onSubmit={handleWithdraw} className="mine-card p-5 mb-3.5 space-y-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-700 block mb-2 uppercase tracking-wide">
                Select Withdrawal Currency
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 border border-slate-200 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedCrypto('USDT_BSC')}
                  className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
                    selectedCrypto === 'USDT_BSC'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md font-black scale-102'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">💵</span>
                    <span>USDT</span>
                  </div>
                  <span className={`text-[9px] font-mono ${selectedCrypto === 'USDT_BSC' ? 'text-white/90 font-bold' : 'text-slate-400'}`}>
                    BSC (BEP-20)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCrypto('GRAM')}
                  className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
                    selectedCrypto === 'GRAM'
                      ? 'bg-gradient-to-r from-[#0088ff] to-[#00c6ff] text-white shadow-md font-black scale-102'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">💎</span>
                    <span>GRAM</span>
                  </div>
                  <span className={`text-[9px] font-mono ${selectedCrypto === 'GRAM' ? 'text-white/90 font-bold' : 'text-slate-400'}`}>
                    TON Network
                  </span>
                </button>
              </div>
            </div>

            <div className="card-tint-blue py-2.5 px-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">Payout Network:</span>
              <span className="font-black text-[#0066ff]">
                {selectedCrypto === 'USDT_BSC' ? 'BNB Smart Chain (BEP-20)' : 'GRAM Network (TON)'}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-700 uppercase block mb-1">
                {selectedCrypto === 'USDT_BSC' ? 'USDT BSC (BEP-20) Destination Address' : 'GRAM Destination Address'}
              </label>
              <input
                type="text"
                placeholder={selectedCrypto === 'USDT_BSC' ? '0x... (42 characters BSC address)' : 'Enter TON/GRAM address'}
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full mine-input px-3.5 py-2.5 text-xs font-mono font-medium outline-none bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-700 uppercase block mb-1">
                Amount to Withdraw
              </label>
              <div className="mine-input px-3.5 py-2.5 flex items-center justify-between bg-white">
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-sm font-extrabold text-slate-900 outline-none font-mono"
                />
                <span className="text-xs font-black text-[#0088ff] ml-2">
                  {selectedCrypto === 'USDT_BSC' ? 'USDT' : 'GRAM'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mt-1">
                <span>Minimum: <b className="text-slate-800 font-mono">{minWithdrawal.toFixed(2)} USDT</b></span>
                <button
                  type="button"
                  onClick={() => setAmount(String(user?.honey_balance || 0))}
                  className="text-[#0088ff] font-extrabold hover:underline uppercase"
                >
                  MAX BALANCE
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'PROCESSING TRANSFER...' : `CONFIRM CASHOUT ${selectedCrypto === 'USDT_BSC' ? 'USDT (BSC)' : 'GRAM'}`}</span>
              <span>➔</span>
            </button>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-emerald-950">
                <span>🛡️</span>
                <span>Protected Automated Settlements</span>
              </div>
              <p className="leading-snug text-emerald-800">
                You can withdraw all profits from Cloud Mining, 24H NFT Miners, Lucky Spins, and Referrals directly to your personal wallet.
              </p>
            </div>
          </form>
        </>
      ) : (
        /* History Tab */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              WITHDRAWAL HISTORY
            </span>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-[11px] font-bold text-[#0088ff] hover:underline"
            >
              REFRESH
            </button>
          </div>

          {loadingHistory ? (
            <div className="mine-card p-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-[#0088ff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold uppercase tracking-wider">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="mine-card p-8 text-center text-slate-400">
              <div className="text-3xl mb-2">📜</div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-800">No withdrawals yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Your payout requests and blockchain proofs will show up here.</p>
              <button
                onClick={() => switchTab('withdraw')}
                className="mt-4 px-4 py-2.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider"
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
                <div key={item.id} className="mine-card p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {Number(item.amount_usd || item.amount_honey || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.payout_method || 'GRAM'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-600'
                          : isRejected
                          ? 'bg-rose-50 text-rose-500'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isApproved ? '✓ COMPLETED' : isRejected ? '✕ REJECTED' : '⏳ PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="mine-card p-5 max-w-sm w-full shadow-2xl relative text-center bg-white">
            <button
              onClick={() => setShowQualifyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1 rounded-full bg-slate-100"
            >
              ✕
            </button>

            <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
              ⚡
            </div>
            
            <h3 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wide">
              Unlock Instant Cashout
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Activate any <span className="text-slate-900 font-bold">24H Mining Plan</span> (or invite 1 friend who activates a miner) to unlock unlimited lifetime cashouts:
            </p>

            <div className="mt-4 space-y-2.5 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs text-slate-900 uppercase">
                    Option 1: Activate Miner
                  </span>
                  <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full">
                    INSTANT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-snug">
                  Activate any 24h Daily Yield Miner (from <b>0.70 TON</b>) to earn daily profit & unlock unlimited withdrawals.
                </p>
                <button
                  onClick={() => {
                    setShowQualifyModal(false)
                    navigate('/plans')
                  }}
                  className="w-full py-2.5 rounded-xl btn-primary-blue text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <span>⚡ ACTIVATE MINER (0.70 TON)</span>
                  <span>➔</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs text-slate-900 uppercase">
                    Option 2: Invite Friend
                  </span>
                  <span className="text-[10px] font-black text-[#0088ff]">
                    {user?.friend_crates_opened_count || 0}/1
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-snug">
                  Invite 1 friend who activates any Daily Plan for 100% free lifetime verification.
                </p>
                
                <button
                  onClick={() => {
                    setShowQualifyModal(false)
                    navigate('/earn')
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-50 text-[#7c3aed] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <span>👥 INVITE FRIENDS</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowQualifyModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-800 uppercase tracking-wider"
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
