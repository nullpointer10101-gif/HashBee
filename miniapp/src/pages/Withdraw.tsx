import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { requestWithdrawal, reinvestHoney } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export const Withdraw: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [amount, setAmount] = useState<string>('')
  const [wallet, setWallet] = useState<string>('')
  const [cryptoType, setCryptoType] = useState<string>('USDT TRC20')
  const [submitting, setSubmitting] = useState(false)
  const [reinvesting, setReinvesting] = useState(false)
  const navigate = useNavigate()

  const minWithdrawal = 0.05

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const numUsdt = parseFloat(amount)

    if (!numUsdt || numUsdt < minWithdrawal) {
      toast.error(`Minimum is ${minWithdrawal.toFixed(4)} USDT`)
      return
    }

    if (!wallet.trim()) {
      toast.error('Enter your wallet address')
      return
    }

    setSubmitting(true)
    try {
      const honeyAmount = Math.round(numUsdt * 10000)
      await requestWithdrawal(honeyAmount, wallet, 'CRYPTO')
      toast.success('Withdrawal request submitted!')
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
      toast.success(`Reinvested! +${res.power_gained} GHS Gained`)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Reinvestment failed')
    } finally {
      setReinvesting(false)
    }
  }

  const userUsdtBalance = user ? (user.honey_balance / 10000).toFixed(7) : '0.0000000'

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
          WITHDRAW
        </h1>
      </div>

      {/* Card 1: YOUR BALANCE & REINVEST BALANCE */}
      <div className="zentorno-card p-5 mb-4 text-center">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
          YOUR BALANCE
        </div>
        <div className="text-3xl font-black text-stone-100 mt-1 mb-4">
          {userUsdtBalance} USDT
        </div>

        {/* REINVEST BALANCE Outline Button */}
        <button
          onClick={handleReinvest}
          disabled={reinvesting}
          className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {reinvesting ? 'REINVESTING...' : 'REINVEST BALANCE'}
        </button>
      </div>

      {/* Card 2: Form */}
      <form onSubmit={handleWithdraw} className="zentorno-card p-5 mb-4">
        {/* Wallet Address Input */}
        <div className="mb-4">
          <label className="text-xs font-extrabold text-stone-300 block mb-2">
            Wallet address
          </label>
          <input
            type="text"
            placeholder="Enter your wallet address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full zentorno-input px-4 py-3.5 text-xs font-medium focus:outline-none focus:border-[#93b3a6]"
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
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-sm font-extrabold text-stone-100 focus:outline-none"
            />
            <span className="text-xs font-black text-stone-300 ml-2">USDT</span>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-stone-400 mb-4 mt-1">
          Minimum is {minWithdrawal.toFixed(4)} USDT
        </div>

        {/* SELECT CRYPTOCURRENCY Button */}
        <button
          type="button"
          onClick={() => {
            const next = cryptoType === 'USDT TRC20' ? 'TON' : cryptoType === 'TON' ? 'USDT BEP20' : 'USDT TRC20'
            setCryptoType(next)
            toast.success(`Selected ${next}`)
          }}
          className="w-full mb-3 py-3.5 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider"
        >
          {cryptoType}
        </button>

        {/* WITHDRAW Primary Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl zentorno-btn-primary font-black text-sm uppercase tracking-wider shadow-md active:scale-95"
        >
          {submitting ? 'SUBMITTING...' : 'WITHDRAW'}
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
