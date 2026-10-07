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
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  const shareTelegram = () => {
    const text = '⛏️ Join HashBee & get 50 GHS Cloud Mining Power! Start mining GRAM & USDT!'
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text)

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#060807] text-[#f8fafc]">
      {/* Centered Page Header */}
      <div className="text-center mb-4">
        <h1 className="text-base font-extrabold text-white uppercase tracking-wider">
          {t('invite_friends_title', 'Invite Partners & Earn GHS')}
        </h1>
        <p className="text-[11px] font-medium text-[#84948c] mt-0.5">
          Get <span className="text-[#00f090] font-extrabold">+3 GHS</span> for every partner who activates mining!
        </p>
      </div>

      {/* Card 1: Your Referral Link & Share Button */}
      <div className="lux-card p-4.5 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-wider">
            Your Invitation Link
          </label>
          <span className="text-[9px] font-mono text-[#00f090] bg-[#080c0a] px-2 py-0.5 rounded-md border border-[#17241d]">
            ID: {userTgId}
          </span>
        </div>
        
        {/* Link Input Box with Copy Button */}
        <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2 flex items-center justify-between mb-3 gap-2">
          <span className="text-xs font-mono text-[#f8fafc] truncate flex-1 px-1">
            {link}
          </span>
          <button
            onClick={copyInviteLink}
            className="px-3 py-1.5 btn-surface rounded-xl font-extrabold text-xs uppercase tracking-wider shrink-0 transition-transform active:scale-95"
          >
            {copied ? t('copied', 'COPIED') : t('copy', 'COPY')}
          </button>
        </div>

        {/* High-Contrast Pure White Action Button */}
        <button
          onClick={shareTelegram}
          className="w-full py-3.5 rounded-xl btn-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span>⚡ SHARE PARTNER LINK (+3 GHS)</span>
        </button>
      </div>

      {/* Card 2: Viral Milestones */}
      <div className="lux-card p-4.5 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>🚀</span> HASHRATE MILESTONES
          </span>
          <span className="text-[9px] font-extrabold text-[#00f090] bg-[#00f090]/10 px-2 py-0.5 rounded-full border border-[#00f090]/25">
            UP TO +500 GHS
          </span>
        </div>
        <p className="text-[11px] text-[#84948c] font-medium mb-3">
          Earn bonus power milestones in addition to +3 GHS per friend:
        </p>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-2">
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">10 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+10 GHS</div>
          </div>
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">20 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+20 GHS</div>
          </div>
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">50 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+50 GHS</div>
          </div>
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">100 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+100 GHS</div>
          </div>
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">250 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+250 GHS</div>
          </div>
          <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2">
            <div className="font-extrabold text-white">500 Active</div>
            <div className="text-[#00f090] font-black text-[11px] mt-0.5 font-mono">+500 GHS</div>
          </div>
        </div>
      </div>

      {/* Card 3: 3-Tier Network */}
      <div className="lux-card p-4.5 mb-3.5">
        <div className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-widest text-center mb-3">
          3-TIER PARTNER NETWORK
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setSelectedLevel(1)}
            className={`p-2.5 rounded-xl text-center border transition-all ${
              selectedLevel === 1
                ? 'bg-white text-black font-black border-white shadow-md'
                : 'bg-[#080c0a] text-[#84948c] border-[#17241d]'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 1</div>
            <div className="text-sm font-black mt-0.5 font-mono">{summary?.tier1_count || 0}</div>
            <div className="text-[9px] font-bold mt-0.5">+3 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(2)}
            className={`p-2.5 rounded-xl text-center border transition-all ${
              selectedLevel === 2
                ? 'bg-white text-black font-black border-white shadow-md'
                : 'bg-[#080c0a] text-[#84948c] border-[#17241d]'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 2</div>
            <div className="text-sm font-black mt-0.5 font-mono">{summary?.tier2_count || 0}</div>
            <div className="text-[9px] font-bold mt-0.5">+1 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(3)}
            className={`p-2.5 rounded-xl text-center border transition-all ${
              selectedLevel === 3
                ? 'bg-white text-black font-black border-white shadow-md'
                : 'bg-[#080c0a] text-[#84948c] border-[#17241d]'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 3</div>
            <div className="text-sm font-black mt-0.5 font-mono">0</div>
            <div className="text-[9px] font-bold mt-0.5">+0.5 GHS</div>
          </button>
        </div>

        <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-2.5 text-center">
          <div className="text-xs font-semibold text-[#84948c]">
            {selectedLevel === 1 && '⭐ Tier 1: Direct invites — earn +3 GHS bonus per active partner!'}
            {selectedLevel === 2 && '⚡ Tier 2: Secondary network — earn +1 GHS bonus!'}
            {selectedLevel === 3 && '✨ Tier 3: Extended network — earn +0.5 GHS bonus!'}
          </div>
        </div>
      </div>

      {/* Card 4: Invited Partners List */}
      <div className="lux-card p-4.5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-extrabold text-[#84948c] uppercase tracking-widest">
            INVITED PARTNERS ({summary?.referrals?.length || 0})
          </div>
          <div className="text-[9px] text-[#00f090] font-bold">
            ⚡ +3 GHS PER ACTIVE
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs font-bold text-[#84948c] animate-pulse">
            Loading partner ledger...
          </div>
        ) : !summary?.referrals || summary.referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-xs font-extrabold text-white">No partners yet</div>
            <div className="text-[11px] text-[#84948c] mt-1">
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
                  className="bg-[#080c0a] border border-[#17241d] rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-white">
                      {r.first_name ? r.first_name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {r.first_name || r.username || 'Partner'}
                      </div>
                      <div className="text-[10px] text-[#84948c]">
                        Joined {new Date(r.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="flex flex-col items-end">
                      <div className="bg-[#00f090]/15 border border-[#00f090]/30 text-[#00f090] px-2.5 py-0.5 rounded-lg text-xs font-black">
                        +3 GHS
                      </div>
                      <span className="text-[8px] text-[#00f090] font-black mt-0.5 uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-lg text-xs font-black">
                        PENDING
                      </div>
                      <span className="text-[8px] text-[#84948c] font-medium mt-0.5">
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
