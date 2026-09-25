import React, { useEffect, useState } from 'react'
import { fetchMissions, completeMission, claimMilestone } from '../services/api'
import { Mission } from '../types'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export const Missions: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const { user, refreshUser } = useAuth()

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
  const userTgId = user?.telegram_id || '6446145632'
  const inviteLink = "https://t.me/" + botUsername + "?start=" + userTgId

  const loadMissions = async () => {
    try {
      setLoading(true)
      const data = await fetchMissions()
      setMissions(data)
    } catch (err) {
      setMissions([
        {
          id: 'm-10',
          title: 'Invite 10 Active Friends',
          description: 'Reach 10 friends who start mining',
          reward_power: 10,
          type: 'milestone',
          milestone_count: 10,
          progress: 0,
          is_completed: false,
        },
        {
          id: 'm-20',
          title: 'Invite 20 Active Friends',
          description: 'Reach 20 friends who start mining',
          reward_power: 20,
          type: 'milestone',
          milestone_count: 20,
          progress: 0,
          is_completed: false,
        },
        {
          id: 'm-50',
          title: 'Invite 50 Active Friends',
          description: 'Reach 50 friends who start mining',
          reward_power: 50,
          type: 'milestone',
          milestone_count: 50,
          progress: 0,
          is_completed: false,
        },
        {
          id: 'm-100',
          title: 'Invite 100 Active Friends',
          description: 'Reach 100 friends who start mining',
          reward_power: 100,
          type: 'milestone',
          milestone_count: 100,
          progress: 0,
          is_completed: false,
        },
        {
          id: 'm-250',
          title: 'Invite 250 Active Friends',
          description: 'Reach 250 friends who start mining',
          reward_power: 250,
          type: 'milestone',
          milestone_count: 250,
          progress: 0,
          is_completed: false,
        },
        {
          id: 'm-500',
          title: 'Invite 500 Active Friends',
          description: 'Reach 500 friends who start mining',
          reward_power: 500,
          type: 'milestone',
          milestone_count: 500,
          progress: 0,
          is_completed: false,
        },
        {
          id: 's-1',
          title: 'airdrops288',
          description: 'Join Telegram Channel',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/airdrops288',
          is_completed: false,
        },
        {
          id: 's-2',
          title: 'criptochts2025',
          description: 'Join Telegram Channel',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/criptochts2025',
          is_completed: false,
        },
        {
          id: 's-3',
          title: 'crYto3l',
          description: 'Join Telegram Channel',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/crYto3l',
          is_completed: false,
        },
        {
          id: 's-4',
          title: 'Aird555',
          description: 'Join Telegram Channel',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/Aird555',
          is_completed: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  const handleClaimMilestone = async (mission: Mission) => {
    setActionId(mission.id)
    try {
      const res = await claimMilestone(mission.id)
      toast.success("🎉 Milestone Claimed! +" + (res.reward_power || mission.reward_power) + " GHS POWER")
      setMissions((prev) =>
        prev.map((m) => (m.id === mission.id ? { ...m, is_completed: true } : m))
      )
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to claim milestone')
    } finally {
      setActionId(null)
    }
  }

  const handleSponsoredAction = async (mission: Mission) => {
    if (mission.target_url) {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(mission.target_url)
      } else {
        window.open(mission.target_url, '_blank')
      }
    }

    setActionId(mission.id)
    try {
      const res = await completeMission(mission.id)
      toast.success("Completed! +" + (res.reward_power || 0.1) + " GHS")
      setMissions((prev) =>
        prev.map((m) => (m.id === mission.id ? { ...m, is_completed: true } : m))
      )
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Verification pending...')
    } finally {
      setActionId(null)
    }
  }

  const handleShare = () => {
    const text = '⛏️ Join HashBee & get 50 GHS Power! Start mining GRAM & withdraw without restrictions! 💰'
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(inviteLink) + "&text=" + encodeURIComponent(text)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const milestones = missions.filter((m) => m.type === 'milestone')
  const sponsored = missions.filter((m) => m.type !== 'milestone')

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-5">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider flex items-center justify-center gap-2">
          <span className="text-amber-400">⚡</span> TASKS & REWARDS
        </h1>
        <p className="text-xs text-stone-400 mt-1 font-semibold">
          Complete tasks & invite friends to boost your GHS mining power!
        </p>
      </div>

      {/* Top Banner Button: INVITE & EARN */}
      <button
        onClick={handleShare}
        className="w-full mb-5 py-3.5 px-4 rounded-2xl zentorno-card border border-[#2c3e38] font-black text-xs text-[#93b3a6] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#202e2a] transition-all shadow-md active:scale-95"
      >
        <svg className="w-4 h-4 text-[#93b3a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        SHARE YOUR INVITE LINK (+3 GHS / ACTIVE)
      </button>

      {/* SECTION 1: VIRAL REFERRAL MILESTONES */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>👥</span> REFERRAL MILESTONES (UP TO +500 GHS)
          </span>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            VIRAL BOOST
          </span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-stone-400 text-xs animate-pulse">Loading milestones...</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {milestones.map((mission) => {
              const count = mission.milestone_count || 10
              const progress = mission.progress || 0
              const isEligible = progress >= count && !mission.is_completed
              const percent = Math.min(100, Math.round((progress / count) * 100))

              return (
                <div
                  key={mission.id}
                  className="zentorno-card p-3.5 flex flex-col gap-2.5 border border-[#2c3e38]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#23332e] border border-[#344b43] flex items-center justify-center text-amber-300 font-black text-sm flex-shrink-0">
                        {count}👥
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-stone-200">{mission.title}</div>
                        <div className="text-[11px] font-bold text-[#93b3a6] mt-0.5">
                          +{mission.reward_power} GHS MINING POWER
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {mission.is_completed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#23332e] text-stone-500 font-extrabold text-xs inline-block">
                          DONE ✅
                        </span>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleClaimMilestone(mission)}
                          disabled={actionId === mission.id}
                          className="px-4 py-2 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider animate-bounce shadow-lg"
                        >
                          {actionId === mission.id ? '...' : ('CLAIM +' + mission.reward_power + ' GHS')}
                        </button>
                      ) : (
                        <button
                          onClick={handleShare}
                          className="px-3 py-1.5 rounded-xl bg-[#1a2622] border border-[#2e423b] text-stone-300 font-bold text-xs hover:border-[#93b3a6] transition-colors"
                        >
                          INVITE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full flex items-center gap-2.5 pt-1">
                    <div className="flex-1 h-2 bg-[#17231f] rounded-full overflow-hidden border border-[#273a33]">
                      <div
                        className="h-full bg-gradient-to-r from-[#93b3a6] to-emerald-400 transition-all duration-300"
                        style={{ width: percent + "%" }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 shrink-0">
                      {progress + "/" + count + " (" + percent + "%)"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: SPONSORED & SOCIAL MISSIONS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>📢</span> PARTNER CHANNELS
          </span>
          <span className="text-[10px] font-bold text-stone-400">+0.1 GHS EACH</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-stone-400 text-xs animate-pulse">Loading channels...</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sponsored.map((mission) => (
              <div
                key={mission.id}
                className="zentorno-card p-3.5 flex items-center justify-between gap-3 border border-[#2c3e38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#23332e] flex items-center justify-center text-stone-300 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-stone-200">{mission.title}</div>
                    <div className="text-[11px] font-bold text-stone-400 mt-0.5">
                      +{mission.reward_power} GHS
                    </div>
                  </div>
                </div>

                <div>
                  {mission.is_completed ? (
                    <span className="px-4 py-2 rounded-xl bg-[#23332e] text-stone-500 font-extrabold text-xs inline-block">
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSponsoredAction(mission)}
                      disabled={actionId === mission.id}
                      className="px-4 py-2 rounded-xl zentorno-btn-primary font-extrabold text-xs"
                    >
                      {actionId === mission.id ? '...' : ('+' + mission.reward_power + ' GHS')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default Missions
