import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { claimHoney } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export const Home: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [claiming, setClaiming] = useState(false)
  const navigate = useNavigate()

  if (!user) return null

  const handleClaim = async () => {
    if (user.current_unclaimed_honey <= 0 || claiming) return

    setClaiming(true)
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      const res = await claimHoney()
      toast.success(`Claimed +${res.claimed.toLocaleString()} Honey!`)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to claim balance')
    } finally {
      setClaiming(false)
    }
  }

  const usdEarnedPerSecond = ((user.bee_power * 0.0001) / 3600).toFixed(8)

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
          {user.bee_power} GHS
        </div>
        <div className="text-xs font-semibold text-stone-400 mt-1">
          +{usdEarnedPerSecond} USDT/second
        </div>

        {/* Side-by-Side Buttons */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={() => navigate('/tasks')}
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
          {(user.honey_balance / 10000).toFixed(7)} USDT
        </div>

        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mt-4">
          PENDING BALANCE
        </div>
        <div className="text-2xl font-extrabold text-stone-300 mt-1">
          {(user.current_unclaimed_honey / 10000).toFixed(8)} USDT
        </div>
        <div className="text-[11px] font-bold text-[#86a397] mt-0.5">
          ({user.current_unclaimed_honey.toLocaleString()} Honey)
        </div>

        {/* CLAIM BALANCE Primary Button */}
        <button
          onClick={handleClaim}
          disabled={user.current_unclaimed_honey <= 0 || claiming}
          className={`w-full mt-5 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
            user.current_unclaimed_honey > 0
              ? 'zentorno-btn-primary active:scale-95'
              : 'bg-[#1b2623] text-stone-600 border border-[#253530] cursor-not-allowed'
          }`}
        >
          {claiming ? 'CLAIMING...' : 'CLAIM BALANCE'}
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
    </div>
  )
}
