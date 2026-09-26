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
    const text = '⛏️ Join HashBee & get 50 GHS Power! Start mining GRAM & withdraw without restrictions! 💰'
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text)

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
          {t('invite_friends_title', 'INVITE FRIENDS & EARN GHS')}
        </h1>
        <p className="text-xs font-semibold text-stone-400 mt-1">
          Get <span className="text-emerald-400 font-extrabold">+10 GHS</span> &amp; <span className="text-amber-400 font-extrabold">+1 Free Spin</span> for every friend you invite!
        </p>
      </div>

      {/* Card 1: {t('your_referral_link', 'Your referral link')} & SHARE LINK */}
      <div className="zentorno-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
            Your referral link
          </label>
          <span className="text-[10px] font-mono text-[#93b3a6] bg-[#1f2d28] px-2 py-0.5 rounded-md border border-[#2e423b]">
            ID: {userTgId}
          </span>
        </div>
        
        {/* Link Input Box with Copy Button */}
        <div className="zentorno-input p-2.5 flex items-center justify-between mb-3 gap-2">
          <span className="text-xs font-mono text-stone-300 truncate flex-1">
            {link}
          </span>
          <button
            onClick={copyInviteLink}
            className="px-3 py-1.5 bg-[#93b3a6] text-[#0f1614] rounded-xl font-black text-xs uppercase tracking-wider shrink-0 transition-transform active:scale-95 shadow-sm"
          >
            {copied ? t('copied', 'COPIED!') : t('copy', 'COPY')}
          </button>
        </div>

        {/* SHARE LINK Primary Button */}
        <button
          onClick={shareTelegram}
          className="w-full py-3.5 rounded-2xl zentorno-btn-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          SHARE LINK (+10 GHS &amp; +1 SPIN / INVITE)
        </button>
      </div>

      {/* Card 2: Viral Milestones Banner */}
      <div className="zentorno-card p-4 mb-4 border border-amber-500/30 bg-gradient-to-b from-[#1b2621] to-[#121c18]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🚀</span> VIRAL REFERRAL TASKS
          </span>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            UP TO +500 GHS
          </span>
        </div>
        <p className="text-[11px] text-stone-300 mb-3">
          Earn huge bonus power milestones in addition to +3 GHS per friend:
        </p>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-3">
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">10 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+10 GHS</div>
          </div>
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">20 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+20 GHS</div>
          </div>
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">50 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+50 GHS</div>
          </div>
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">100 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+100 GHS</div>
          </div>
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">250 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+250 GHS</div>
          </div>
          <div className="bg-[#192420] border border-[#2d4239] rounded-xl p-2">
            <div className="font-extrabold text-stone-200">500 Refers</div>
            <div className="text-emerald-400 font-black text-[11px] mt-0.5">+500 GHS</div>
          </div>
        </div>

        <div className="text-[10px] text-stone-400 text-center">
          ⚡ <i>Active refers means friends who start mining & collect rewards. Check the Tasks tab to claim!</i>
        </div>
      </div>

      {/* Card 3: Swarm Bonus Tiers (3 Levels) */}
      <div className="zentorno-card p-4 mb-4">
        <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest text-center mb-3">
          3-TIER REFERRAL NETWORK
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setSelectedLevel(1)}
            className={"p-2.5 rounded-2xl text-center border transition-all " + (
              selectedLevel === 1
                ? 'bg-[#93b3a6] text-[#0f1614] border-[#93b3a6] shadow-sm font-black'
                : 'bg-[#141f1c] text-stone-400 border-[#23342e]'
            )}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 1</div>
            <div className="text-base font-black mt-0.5">{summary?.tier1_count || 0}</div>
            <div className="text-[9px] font-bold mt-0.5">+10 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(2)}
            className={"p-2.5 rounded-2xl text-center border transition-all " + (
              selectedLevel === 2
                ? 'bg-[#93b3a6] text-[#0f1614] border-[#93b3a6] shadow-sm font-black'
                : 'bg-[#141f1c] text-stone-400 border-[#23342e]'
            )}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 2</div>
            <div className="text-base font-black mt-0.5">{summary?.tier2_count || 0}</div>
            <div className="text-[9px] font-bold mt-0.5">+0.5 GHS</div>
          </button>

          <button
            onClick={() => setSelectedLevel(3)}
            className={"p-2.5 rounded-2xl text-center border transition-all " + (
              selectedLevel === 3
                ? 'bg-[#93b3a6] text-[#0f1614] border-[#93b3a6] shadow-sm font-black'
                : 'bg-[#141f1c] text-stone-400 border-[#23342e]'
            )}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-80">Tier 3</div>
            <div className="text-base font-black mt-0.5">0</div>
            <div className="text-[9px] font-bold mt-0.5">+1 GHS</div>
          </button>
        </div>

        <div className="bg-[#121b18] border border-[#22332d] rounded-xl p-3 text-center">
          <div className="text-xs font-black text-stone-200">
            {selectedLevel === 1 && '⭐ Tier 1: Direct invites — earn +3 GHS bonus per active friend who starts mining!'}
            {selectedLevel === 2 && '⚡ Tier 2: Friends of friends — earn +1 GHS bonus!'}
            {selectedLevel === 3 && '✨ Tier 3: Extended network — earn +0.5 GHS bonus!'}
          </div>
        </div>
      </div>

      {/* Referral Activation Rule Info Card */}
      <div className="bg-[#14201c] border border-[#263a33] rounded-2xl p-3.5 mb-4 flex items-start gap-3 shadow-sm">
        <div className="text-xl shrink-0 mt-0.5">ℹ️</div>
        <div className="flex-1 text-xs">
          <div className="font-black text-stone-100 uppercase tracking-wide mb-1">
            Referral Activation Rule
          </div>
          <div className="text-stone-300 leading-relaxed text-[11px]">
            New invites join as <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">Pending</span>. You will unlock <span className="text-emerald-400 font-black bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">+3 GHS</span> mining power bonus automatically once your friend completes their first mining claim!
          </div>
        </div>
      </div>

      {/* Card 4: Invited Friends List */}
      <div className="zentorno-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">
            INVITED FRIENDS ({summary?.referrals?.length || 0})
          </div>
          <div className="text-[10px] text-stone-500 font-bold">
            ⚡ +3 GHS PER ACTIVE
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs font-bold text-stone-500 animate-pulse">
            Loading referrals...
          </div>
        ) : !summary?.referrals || summary.referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-xs font-extrabold text-stone-300">No referrals yet</div>
            <div className="text-[11px] text-stone-500 mt-1">
              Share your link above to start earning bonus GHS!
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.referrals.map((r, i) => {
              const isActive = r.status === 'active'
              return (
                <div
                  key={r.id || i}
                  className="bg-[#131d1a] border border-[#273a33] rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1e2d28] border border-[#2e423b] flex items-center justify-center font-black text-xs text-[#93b3a6]">
                      {r.first_name ? r.first_name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-stone-200">
                        {r.first_name || r.username || 'Miner'}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Joined {new Date(r.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="flex flex-col items-end">
                      <div className="bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                        <span>✅</span> +3 GHS
                      </div>
                      <span className="text-[9px] text-emerald-500 font-black mt-0.5 uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="bg-amber-950/80 border border-amber-800/60 text-amber-400 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                        <span>⏳</span> PENDING
                      </div>
                      <span className="text-[9px] text-stone-400 font-medium mt-0.5">
                        +3 GHS on 1st claim
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
