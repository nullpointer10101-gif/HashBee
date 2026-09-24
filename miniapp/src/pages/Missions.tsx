import React, { useEffect, useState } from 'react'
import { fetchMissions, completeMission } from '../services/api'
import { Mission } from '../types'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export const Missions: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const { refreshUser } = useAuth()

  const loadMissions = async () => {
    try {
      const data = await fetchMissions()
      setMissions(data)
    } catch (err) {
      setMissions([
        {
          id: 'm-1',
          title: 'airdrops288',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/airdrops288',
          is_completed: false,
        },
        {
          id: 'm-2',
          title: 'criptochts2025',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/criptochts2025',
          is_completed: false,
        },
        {
          id: 'm-3',
          title: 'crYto3l',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/crYto3l',
          is_completed: false,
        },
        {
          id: 'm-4',
          title: 'Aird555',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/Aird555',
          is_completed: false,
        },
        {
          id: 'm-5',
          title: 't.me/HashBeeOfficial',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'custom',
          target_url: 'https://t.me/HashBeeOfficial',
          is_completed: false,
        },
        {
          id: 'm-6',
          title: 'EsayEarningTips',
          description: '+0.1 GHS',
          reward_honey: 100,
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/EsayEarningTips',
          is_completed: false,
        },
        {
          id: 'm-7',
          title: 'Invite 3 friends',
          description: '+10 GHS',
          reward_honey: 1000,
          reward_power: 10,
          type: 'check_in',
          is_completed: true,
        },
        {
          id: 'm-8',
          title: 'Invite 10 friends',
          description: '+25 GHS',
          reward_honey: 2500,
          reward_power: 25,
          type: 'check_in',
          is_completed: false,
        },
        {
          id: 'm-9',
          title: 'Invite 25 friends',
          description: '+50 GHS',
          reward_honey: 5000,
          reward_power: 50,
          type: 'check_in',
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

  const handleAction = async (mission: Mission) => {
    if (mission.target_url) {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(mission.target_url)
      } else {
        window.open(mission.target_url, '_blank')
      }
    }

    setCompletingId(mission.id)
    try {
      const res = await completeMission(mission.id)
      toast.success(`Completed! +${res.reward_power || 0.1} GHS`)
      setMissions((prev) =>
        prev.map((m) => (m.id === mission.id ? { ...m, is_completed: true } : m))
      )
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Verification pending...')
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          TASKS
        </h1>
      </div>

      {/* Top Banner Button: PROMOTE YOUR LINK */}
      <button className="w-full mb-4 py-3.5 rounded-2xl zentorno-card border border-[#2c3e38] font-extrabold text-xs text-stone-300 uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#202e2a] transition-all">
        <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A2.001 2.001 0 017 6h18" />
        </svg>
        PROMOTE YOUR LINK
      </button>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-xs">Loading tasks...</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className="zentorno-card p-3.5 flex items-center justify-between gap-3 border border-[#2c3e38]"
            >
              <div className="flex items-center gap-3">
                {/* Icon Box */}
                <div className="w-10 h-10 rounded-xl bg-[#23332e] flex items-center justify-center text-stone-300 flex-shrink-0">
                  {mission.type === 'custom' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  ) : mission.type === 'check_in' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>

                <div>
                  <div className="text-xs font-extrabold text-stone-200">{mission.title}</div>
                  <div className="text-[11px] font-bold text-stone-400 mt-0.5">
                    +{mission.reward_power} GHS
                  </div>
                </div>
              </div>

              {/* Action Button / Progress */}
              <div>
                {mission.is_completed ? (
                  <button
                    disabled
                    className="px-4 py-2 rounded-xl bg-[#23332e] text-stone-500 font-extrabold text-xs cursor-not-allowed"
                  >
                    Done
                  </button>
                ) : mission.title.includes('Invite 10') ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#23332e] rounded-full overflow-hidden">
                      <div className="w-[70%] h-full bg-[#93b3a6]" />
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-[#23332e] text-stone-300 font-bold text-xs">
                      7/10
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAction(mission)}
                    disabled={completingId === mission.id}
                    className="px-4 py-2 rounded-xl zentorno-btn-primary font-extrabold text-xs"
                  >
                    {completingId === mission.id ? '...' : `+${mission.reward_power} GHS`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
