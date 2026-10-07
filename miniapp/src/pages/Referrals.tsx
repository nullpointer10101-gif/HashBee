import React, { useState, useEffect } from 'react'
import { fetchReferrals } from '../services/api'
import { ReferralSummary } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

export const Referrals: React.FC = () => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [summary, setSummary] = useState<ReferralSummary | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
  const userTgId = user?.telegram_id || '6446145632'

  const loadReferrals = async () => {
    try {
      setLoading(true)
      const data = await fetchReferrals()
      setSummary(data)
    } catch (err) {
      setSummary({
        ref_code: String(userTgId),
        invite_link: "https://t.me/" + botUsername + "?start=" + userTgId,
        tier1_count: 0,
        tier2_count: 0,
        tier1_earnings: 0,
        tier2_earnings: 0,
        referrals: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferrals()
  }, [user])

  const link = summary?.invite_link?.includes('?')
    ? summary.invite_link
    : "https://t.me/" + botUsername + "?start=" + userTgId

  const copyInviteLink = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  const shareTelegram = () => {
    const text = '⛏️ Join Crypto Mine & get 50 GHS Cloud Mining Power! Start auto-mining USDT!'
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text)

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      {/* Centered Page Header */}
      <div className="text-center mb-4">
        <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
          {t('invite_friends_title', 'Invite Partners & Earn GHS')}
        </h1>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
          Get <span className="text-[#059669] font-extrabold">+3 GHS</span> for every partner who activates mining!
        </p>
      </div>

      {/* Card 1: Your Referral Link & Share Button */}
      <div className="card-tint-purple p-4.5 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider">
            Your Personal Referral Link
          </label>
          <span className="text-[9px] font-mono text-[#7c3aed] bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg font-black">
            ID: {userTgId}
          </span>
        </div>
        
        {/* Link Input Box with Copy Button */}
        <div className="bg-white border border-purple-200 rounded-2xl p-2 flex items-center justify-between mb-3 gap-2 shadow-sm">
          <span className="text-xs font-mono text-purple-950 font-bold truncate flex-1 px-1">
            {link}
          </span>
          <button
            onClick={copyInviteLink}
            className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white rounded-xl font-black text-xs uppercase tracking-wider shrink-0 shadow-md active:scale-95"
          >
            {copied ? t('copied', 'COPIED') : t('copy', 'COPY')}
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={shareTelegram}
          className="w-full py-3.5 rounded-xl btn-primary-purple font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span>⚡ SHARE PARTNER LINK (GET +3 GHS PER FRIEND)</span>
          <span>➔</span>
        </button>
      </div>

      {/* Card 2: Viral Milestones */}
      <div className="card-tint-emerald p-4.5 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
            <span>🚀</span> HASHRATE POWER MILESTONES
          </span>
          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase">
            UP TO +500 GHS
          </span>
        </div>
        <p className="text-[11px] text-emerald-800 font-semibold mb-3">
          Earn massive bonus computing power as your network grows:
        </p>

        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-1">
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">10 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+10 GHS</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">20 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+20 GHS</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">50 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+50 GHS</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">100 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+100 GHS</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">250 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+250 GHS</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-sm">
            <div className="font-extrabold text-slate-800 text-[11px]">500 Active</div>
            <div className="text-emerald-600 font-black text-xs mt-0.5 font-mono">+500 GHS</div>
          </div>
        </div>
      </div>

      {/* Card 3: 3-Tier Network */}
      <div className="mine-card p-4.5 mb-3.5">
        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center mb-3">
          3-TIER MULTI-LEVEL PARTNER MATRIX
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setSelectedLevel(1)}
            className={`p-3 rounded-2xl text-center border transition-all ${
              selectedLevel === 1
                ? 'bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white font-black shadow-lg scale-102 border-transparent'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider font-bold opacity-90">Tier 1</div>
            <div className="text-base font-black mt-0.5 font-mono">{summary?.tier1_count || 0}</div>
            <div className="text-[10px] font-black mt-0.5 text-emerald-300">+3 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(2)}
            className={`p-3 rounded-2xl text-center border transition-all ${
              selectedLevel === 2
                ? 'bg-gradient-to-tr from-[#0088ff] to-[#00c6ff] text-white font-black shadow-lg scale-102 border-transparent'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider font-bold opacity-90">Tier 2</div>
            <div className="text-base font-black mt-0.5 font-mono">{summary?.tier2_count || 0}</div>
            <div className="text-[10px] font-black mt-0.5 text-emerald-300">+1 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(3)}
            className={`p-3 rounded-2xl text-center border transition-all ${
              selectedLevel === 3
                ? 'bg-gradient-to-tr from-[#10b981] to-[#059669] text-white font-black shadow-lg scale-102 border-transparent'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider font-bold opacity-90">Tier 3</div>
            <div className="text-base font-black mt-0.5 font-mono">0</div>
            <div className="text-[10px] font-black mt-0.5 text-emerald-300">+0.5 GHS</div>
          </button>
        </div>

        <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-3 text-center">
          <div className="text-xs font-bold text-slate-700">
            {selectedLevel === 1 && '⭐ Tier 1: Direct invites — earn +3 GHS power per active partner!'}
            {selectedLevel === 2 && '⚡ Tier 2: Secondary network — earn +1 GHS power!'}
            {selectedLevel === 3 && '✨ Tier 3: Extended network — earn +0.5 GHS power!'}
          </div>
        </div>
      </div>

      {/* Card 4: Invited Partners List */}
      <div className="mine-card p-4.5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            INVITED PARTNERS ({summary?.referrals?.length || 0})
          </div>
          <div className="text-[9px] text-[#059669] font-bold">
            ⚡ +3 GHS PER ACTIVE
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs font-bold text-slate-400 animate-pulse">
            Loading partner ledger...
          </div>
        ) : !summary?.referrals || summary.referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-xs font-extrabold text-slate-800">No partners yet</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Share your link above to start earning bonus computing power!
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.referrals.map((r, i) => {
              const isActive = r.status === 'active'
              return (
                <div
                  key={r.id || i}
                  className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center font-black text-xs text-[#0088ff]">
                      {r.first_name ? r.first_name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {r.first_name || r.username || 'Partner'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Joined {new Date(r.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="flex flex-col items-end">
                      <div className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-lg text-xs font-black">
                        +3 GHS
                      </div>
                      <span className="text-[8px] text-[#059669] font-black mt-0.5 uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-xs font-black">
                        PENDING
                      </div>
                      <span className="text-[8px] text-slate-400 font-medium mt-0.5">
                        on 1st claim
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Referrals
