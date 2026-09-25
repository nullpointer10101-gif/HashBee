import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { requestWithdrawal, reinvestHoney } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export const Withdraw: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [amount, setAmount] = useState<string>('')
  const [wallet, setWallet] = useState<string>('')
  // ONLY TWO WITHDRAW OPTIONS: USDT (BSC) and GRAM
  const [selectedCrypto, setSelectedCrypto] = useState<'USDT_BSC' | 'GRAM'>('USDT_BSC')
  const [submitting, setSubmitting] = useState(false)
  const [reinvesting, setReinvesting] = useState(false)
  const navigate = useNavigate()

  const minWithdrawal = 0.05

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)

    if (!numAmount || numAmount < minWithdrawal) {
      toast.error(`Minimum withdrawal is ${minWithdrawal.toFixed(2)} USDT`)
      return
    }

    if (!wallet.trim()) {
      toast.error('Please enter your wallet address')
      return
    }

    if (selectedCrypto === 'USDT_BSC') {
      if (!wallet.trim().startsWith('0x') || wallet.trim().length !== 42) {
        toast.error('Invalid BSC address. Must start with 0x and be 42 characters')
        return
      }
    }

    if (user && numAmount > user.honey_balance) {
      toast.error('Insufficient balance')
      return
    }

    setSubmitting(true)
    try {
      await requestWithdrawal(numAmount, wallet.trim(), selectedCrypto)
      toast.success('🎉 Withdrawal request submitted successfully!')
      await refreshUser()
      setWallet('')
      setAmount('')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Withdrawal failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReinvest = async () => {
    if (!user || user.honey_balance <= 0) {
      toast.error('No balance to reinvest')
      return
    }

    setReinvesting(true)
    try {
      const res = await reinvestHoney(user.honey_balance)
      toast.success(`🎉 Reinvested! +${res.power_gained} GHS Mining Power Added!`)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Reinvestment failed')
    } finally {
      setReinvesting(false)
    }
  }

  const userUsdtBalance = user ? user.honey_balance.toFixed(7) : '0.0000000'

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
          WITHDRAW
        </h1>
        <p className="text-xs font-semibold text-stone-400 mt-1">
          Fast crypto cashouts directly to your wallet
        </p>
      </div>

      {/* Card 1: YOUR BALANCE & REINVEST BALANCE */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
          YOUR BALANCE
        </div>
        <div className="text-3xl font-black text-stone-100 mt-1 mb-4">
          {userUsdtBalance} USDT
        </div>

        {/* REINVEST BALANCE Button */}
        <button
          onClick={handleReinvest}
          disabled={reinvesting || !user || user.honey_balance <= 0}
          className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {reinvesting ? 'REINVESTING...' : 'REINVEST BALANCE (1 USDT = 50 GHS)'}
        </button>
      </div>

      {/* Card 2: Form */}
      <form onSubmit={handleWithdraw} className="zentorno-card p-5 mb-4">
        {/* WITHDRAW OPTION SELECTOR (ONLY 2 OPTIONS: USDT BSC & GRAM) */}
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

        {/* Network Badge */}
        <div className="mb-4 bg-[#1f2d28] border border-[#2e423b] rounded-xl py-2 px-3 flex items-center justify-between text-xs">
          <span className="text-stone-400 font-bold">Selected Network:</span>
          <span className="font-black text-[#93b3a6]">
            {selectedCrypto === 'USDT_BSC' ? 'BNB Smart Chain (BEP-20)' : 'GRAM Network (TON)'}
          </span>
        </div>

        {/* Wallet Address Input */}
        <div className="mb-4">
          <label className="text-xs font-extrabold text-stone-300 block mb-2">
            {selectedCrypto === 'USDT_BSC' ? 'USDT BSC (BEP-20) Address' : 'GRAM Wallet Address'}
          </label>
          <input
            type="text"
            placeholder={selectedCrypto === 'USDT_BSC' ? '0x... (42 characters BSC address)' : 'Enter your GRAM address'}
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full zentorno-input px-4 py-3.5 text-xs font-mono font-medium focus:outline-none focus:border-[#93b3a6]"
          />
        </div>

        {/* Amount Input */}
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

        {/* WITHDRAW Primary Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl zentorno-btn-primary font-black text-sm uppercase tracking-wider shadow-md active:scale-95"
        >
          {submitting ? 'PROCESSING...' : `WITHDRAW ${selectedCrypto === 'USDT_BSC' ? 'USDT (BSC)' : 'GRAM'}`}
        </button>
      </form>

      {/* BACK Outline Button */}
      <button
        onClick={() => navigate('/')}
        className="w-full py-4 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
      >
        BACK
      </button>
    </div>
  )
}
export default Withdraw
