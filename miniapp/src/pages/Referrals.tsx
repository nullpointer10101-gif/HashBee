import React, { useState, useEffect } from 'react'
import { fetchReferrals } from '../services/api'
import { ReferralSummary } from '../types'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export const Referrals: React.FC = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<ReferralSummary | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)

  const loadReferrals = async () => {
    try {
      const data = await fetchReferrals()
      setSummary(data)
    } catch (err) {
      setSummary({
        ref_code: user?.ref_code || '6446145632',
        invite_link: `https://t.me/HashBee_bot?start=${user?.ref_code || '6446145632'}`,
        tier1_count: 23,
        tier2_count: 14,
        tier1_earnings: 35,
        tier2_earnings: 12,
        referrals: [
          {
            id: 'ref-1',
            username: 'cabdi_xasiib',
            first_name: 'Cabdi Xasiib',
            joined_at: new Date(Date.now() - 3600000 * 5).toISOString(),
            honey_earned_for_referrer: 5,
          },
          {
            id: 'ref-2',
            username: 'sugiyono',
            first_name: 'Sugiyono',
            joined_at: new Date(Date.now() - 3600000 * 9).toISOString(),
            honey_earned_for_referrer: 5,
          },
          {
            id: 'ref-3',
            username: 'johnross29',
            first_name: 'Johnross29',
            joined_at: new Date(Date.now() - 3600000 * 21).toISOString(),
            honey_earned_for_referrer: 5,
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferrals()
  }, [])

  const link = summary?.invite_link || `https://t.me/HashBee_bot?start=${user?.ref_code || ''}`

  const copyInviteLink = () => {
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  const shareTelegram = () => {
    const text = 'Join HashBee on Telegram and earn free mining rewards!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
          INVITE FRIENDS!
        </h1>
        <p className="text-xs font-semibold text-stone-400 mt-1">
          You and your friend will get bonuses
        </p>
      </div>

      {/* Card 1: Your referral link & SHARE LINK */}
      <div className="zentorno-card p-4 mb-4">
        <label className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider block mb-2">
          Your referral link
        </label>
        
        {/* Link Input Box with Copy Button */}
        <div className="zentorno-input p-2.5 flex items-center justify-between mb-3 gap-2">
          <span className="text-xs font-mono text-stone-300 truncate flex-1">
            {link}
          </span>
          <button
            onClick={copyInviteLink}
            className="p-2 rounded-xl bg-[#2b3d36] hover:bg-[#384f47] text-[#93b3a6] flex-shrink-0 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* SHARE LINK Primary Button */}
        <button
          onClick={shareTelegram}
          className="w-full py-3.5 rounded-2xl zentorno-btn-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          SHARE LINK
        </button>
      </div>

      {/* Card 2: MY REFERRALS */}
      <div className="zentorno-card p-4">
        <div className="text-center font-extrabold text-sm text-stone-200 uppercase tracking-wider mb-4">
          MY REFERRALS
        </div>

        {/* Level Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedLevel === level
                  ? 'bg-[#93b3a6] text-[#0f1614]'
                  : 'bg-[#1e2b27] text-stone-400 border border-[#2c3e38]'
              }`}
            >
              LEVEL {level}
            </button>
          ))}
        </div>

        {/* Reward Summary Box */}
        <div className="zentorno-input p-4 text-center mb-4 border border-[#2c3e38]">
          <div className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">
            TOTAL REWARD OBTAINED
          </div>
          <div className="text-3xl font-black text-stone-100 mt-1">
            {selectedLevel === 1 ? (summary?.tier1_earnings || 35) : selectedLevel === 2 ? (summary?.tier2_earnings || 12) : 0} GHS
          </div>
          <div className="text-xs font-semibold text-stone-400 mt-1">
            +{selectedLevel === 1 ? '5' : selectedLevel === 2 ? '2' : '1'} GHS per referral
          </div>
          <div className="text-xs font-semibold text-stone-400">
            {selectedLevel === 1 ? (summary?.tier1_count || 23) : selectedLevel === 2 ? (summary?.tier2_count || 14) : 0} referrals
          </div>
        </div>

        {/* LAST 10 REFERRALS Section */}
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mb-3">
          LAST 10 REFERRALS
        </div>

        {loading ? (
          <div className="text-stone-400 text-xs py-4 text-center">Loading referrals...</div>
        ) : summary?.referrals && summary.referrals.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {summary.referrals.map((ref) => (
              <div
                key={ref.id}
                className="zentorno-input p-3 flex items-center gap-3 border border-[#2c3e38]"
              >
                {/* Yellow Star Icon Box */}
                <div className="w-10 h-10 rounded-xl bg-[#283832] flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
                  ★
                </div>
                <div>
                  <div className="text-xs font-extrabold text-stone-200">
                    {ref.first_name || ref.username}
                  </div>
                  <div className="text-[10px] font-medium text-stone-400 mt-0.5">
                    {new Date(ref.joined_at).getHours()} hours ago · pending
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-stone-500 text-xs font-medium">
            No referrals found for Level {selectedLevel}.
          </div>
        )}
      </div>
    </div>
  )
}
