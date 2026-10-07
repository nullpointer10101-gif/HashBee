import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchMissions,
  completeMission,
  claimMilestone,
  createCampaign,
  fetchMyCampaigns,
  checkDeposit,
} from '../services/api'
import { Mission, Campaign } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import toast from 'react-hot-toast'

type ViewMode = 'tasks' | 'campaigns' | 'new_campaign' | 'pay_campaign'

const WATCH_AD_TASKS_COUNT = 3
const WATCH_AD_REFRESH_MS = 3 * 60 * 60 * 1000 // 3 hours
const WATCH_AD_POWER_REWARD = 1 // 1 GHS Mining Power
const LS_KEY_WATCH_ADS = 'hb_watch_ad_tasks_v1'

interface WatchAdState {
  windowStart: number
  completed: number[]
}

function loadWatchAdState(): WatchAdState {
  try {
    const raw = localStorage.getItem(LS_KEY_WATCH_ADS)
    if (raw) {
      const parsed: WatchAdState = JSON.parse(raw)
      if (Date.now() - parsed.windowStart >= WATCH_AD_REFRESH_MS) {
        return { windowStart: Date.now(), completed: [] }
      }
      return parsed
    }
  } catch {}
  return { windowStart: Date.now(), completed: [] }
}

function saveWatchAdState(state: WatchAdState) {
  localStorage.setItem(LS_KEY_WATCH_ADS, JSON.stringify(state))
}

function showAd(): Promise<boolean> {
  return new Promise((resolve) => {
    // 1. Try AdExium Interstitial
    if (typeof window !== 'undefined' && (window as any).adexiumWidget && typeof (window as any).adexiumWidget.requestAd === 'function') {
      try {
        (window as any).adexiumWidget.requestAd('interstitial')
        setTimeout(() => resolve(true), 2500)
        return
      } catch (err) {
        console.warn('[Missions] AdExium error:', err)
      }
    }

    // 2. Try Monetag Interstitial
    if (typeof (window as any).show_8985160 === 'function') {
      try {
        (window as any)
          .show_8985160()
          .then(() => resolve(true))
          .catch((err: any) => {
            console.warn('[Missions] Monetag ad error:', err)
            resolve(false)
          })
        return
      } catch (e) {
        console.warn('[Missions] Monetag call error:', e)
      }
    }

    // No ad provider currently active or available
    resolve(false)
  })
}

export const Missions: React.FC = () => {
  const { t } = useLanguage()
  const [view, setView] = useState<ViewMode>('tasks')
  const [missions, setMissions] = useState<Mission[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  const [promoType, setPromoType] = useState<'link' | 'channel' | 'group' | 'bot'>('link')
  const [promoTarget, setPromoTarget] = useState('')
  const [promoCompletions, setPromoCompletions] = useState<number>(500)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  const [copiedAmount, setCopiedAmount] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)

  const { user, refreshUser } = useAuth()
  const depositAddress = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'

  const [watchAdState, setWatchAdState] = useState<WatchAdState>(loadWatchAdState)
  const [watchAdVerifyingIndex, setWatchAdVerifyingIndex] = useState<number | null>(null)
  const [watchAdSecondsLeft, setWatchAdSecondsLeft] = useState<number>(0)
  const [watchAdCountdown, setWatchAdCountdown] = useState('')
  const watchAdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchAdVerifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const elapsed = now - watchAdState.windowStart
      const remainingMs = Math.max(0, WATCH_AD_REFRESH_MS - elapsed)

      if (remainingMs === 0) {
        const fresh: WatchAdState = { windowStart: Date.now(), completed: [] }
        setWatchAdState(fresh)
        saveWatchAdState(fresh)
        setWatchAdCountdown('')
        return
      }

      const totalSec = Math.floor(remainingMs / 1000)
      const hrs = Math.floor(totalSec / 3600)
      const mins = Math.floor((totalSec % 3600) / 60)
      const secs = totalSec % 60
      setWatchAdCountdown(
        `${hrs > 0 ? `${hrs}h ` : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      )
    }

    updateCountdown()
    watchAdTimerRef.current = setInterval(updateCountdown, 1000)
    return () => {
      if (watchAdTimerRef.current) clearInterval(watchAdTimerRef.current)
    }
  }, [watchAdState.windowStart])

  const handleWatchAdTask = useCallback(
    async (taskIndex: number) => {
      if (watchAdState.completed.includes(taskIndex)) return
      if (watchAdVerifyingIndex !== null) return

      toast.loading('Requesting video ad...', { id: 'ad-load' })
      let adPlayed = false
      try {
        adPlayed = await showAd()
      } catch (err) {
        console.warn('Ad playback error:', err)
      } finally {
        toast.dismiss('ad-load')
      }

      if (!adPlayed) {
        toast.error('⚠️ Ad is not available right now. Please try again in a moment!')
        return
      }

      const countdownSec = 15
      setWatchAdVerifyingIndex(taskIndex)
      setWatchAdSecondsLeft(countdownSec)

      let remaining = countdownSec
      if (watchAdVerifyTimerRef.current) clearInterval(watchAdVerifyTimerRef.current)

      watchAdVerifyTimerRef.current = setInterval(async () => {
        remaining -= 1
        setWatchAdSecondsLeft(remaining)

        if (remaining <= 0) {
          if (watchAdVerifyTimerRef.current) clearInterval(watchAdVerifyTimerRef.current)
          setWatchAdVerifyingIndex(null)

          setWatchAdState((prev) => {
            const nextCompleted = [...new Set([...prev.completed, taskIndex])]
            const updated: WatchAdState = { ...prev, completed: nextCompleted }
            saveWatchAdState(updated)
            return updated
          })

          try {
            await completeMission(`watch_ad_${taskIndex + 1}`)
          } catch {
            // fallback
          }

          toast.success(`🎉 +${WATCH_AD_POWER_REWARD} GHS Mining Power added!`)
          await refreshUser()
        }
      }, 1000)
    },
    [watchAdState.completed, watchAdVerifyingIndex, refreshUser]
  )

  useEffect(() => {
    return () => {
      if (watchAdVerifyTimerRef.current) clearInterval(watchAdVerifyTimerRef.current)
    }
  }, [])

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
  const userTgId = user?.telegram_id || ''
  const inviteLink = 'https://t.me/' + botUsername + '?start=' + userTgId

  const loadMissions = async () => {
    try {
      setLoading(true)
      const data = await fetchMissions()
      setMissions(data || [])
    } catch (err) {
      console.error('Failed to load missions', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true)
      const data = await fetchMyCampaigns()
      setCampaigns(data || [])
    } catch (err) {
      console.error('Failed to load campaigns', err)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  const milestones = missions.filter((m) => m.category === 'referral_milestone')
  const sponsored = missions.filter((m) => m.category !== 'referral_milestone')

  const handleClaimMilestone = async (mission: Mission) => {
    setActionId(mission.id)
    try {
      const res = await claimMilestone(mission.id)
      toast.success(res.message || 'Milestone claimed!')
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
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink && mission.target_url.includes('t.me/')) {
        window.Telegram.WebApp.openTelegramLink(mission.target_url)
      } else {
        window.open(mission.target_url, '_blank')
      }
    }

    setActionId(mission.id)
    try {
      const res = await completeMission(mission.id)
      toast.success('Completed! +' + (res.reward_power || 0.1) + ' GHS')
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
    const text = '⛏️ Join Crypto Mine & get 50 GHS Power! Start mining USDT!'
    const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(inviteLink) + '&text=' + encodeURIComponent(text)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const handlePayWithBalance = async () => {
    const target = promoTarget.trim()
    if (!target) {
      toast.error('Please enter your link or @channel')
      return
    }

    const completions = Number(promoCompletions) || 0
    if (completions < 500) {
      toast.error('Minimum order is 500 completions (0.50 GRAM)')
      setPromoCompletions(500)
      return
    }
    const cost = completions * 0.001

    if (!user || user.honey_balance < cost) {
      toast.error(`Insufficient balance (${user ? user.honey_balance.toFixed(4) : 0} GRAM). Need ${cost.toFixed(4)} GRAM. Please pay via Tonkeeper!`)
      return
    }

    setPublishing(true)
    try {
      await createCampaign({
        type: promoType,
        target: target,
        title: target.replace(/^https?:\/\//, '').replace(/^t\.me\//, ''),
        total_completions: completions,
        reward_bp: 0.5,
        pay_with_balance: true,
      })
      toast.success('🎉 Campaign Activated Instantly!')
      await refreshUser()
      await loadMissions()
      await loadCampaigns()
      setView('campaigns')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to activate with balance')
    } finally {
      setPublishing(false)
    }
  }

  const handlePayInTonkeeper = (camp: Campaign) => {
    const cost = camp.cost || 0.10
    const nanoAmount = Math.round(cost * 1e9)
    const memo = encodeURIComponent(camp.payment_memo || '')
    const tonkeeperUrl = 'https://app.tonkeeper.com/transfer/' + depositAddress + '?amount=' + nanoAmount + '&text=' + memo
    const directUrl = 'ton://transfer/' + depositAddress + '?amount=' + nanoAmount + '&text=' + memo

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonkeeperUrl)
    } else {
      window.location.href = directUrl
      setTimeout(() => {
        window.open(tonkeeperUrl, '_blank')
      }, 500)
    }
  }

  const handlePublishCampaign = async () => {
    const target = promoTarget.trim()
    if (!target) {
      toast.error('Please enter your link or @channel')
      return
    }

    const completions = Number(promoCompletions) || 0
    if (completions < 500) {
      toast.error('Minimum order is 500 completions (0.50 GRAM)')
      setPromoCompletions(500)
      return
    }
    const cost = completions * 0.001
    setPublishing(true)

    const fallbackMemo = 'CMP' + Math.random().toString(16).substring(2, 8).toUpperCase()
    let campaignObj: Campaign = {
      id: 'cmp-' + Date.now(),
      type: promoType,
      target: target,
      title: target.replace(/^https?:\/\//, '').replace(/^t\.me\//, ''),
      total_completions: completions,
      done_completions: 0,
      reward_bp: 0.5,
      cost: cost,
      status: 'waiting_for_payment',
      payment_memo: fallbackMemo,
      created_at: new Date().toISOString(),
    }

    try {
      const newCamp = await createCampaign({
        type: promoType,
        target: target,
        title: target.replace(/^https?:\/\//, '').replace(/^t\.me\//, ''),
        total_completions: completions,
        reward_bp: 0.5,
        pay_with_balance: false,
      })
      if (newCamp && newCamp.payment_memo) {
        campaignObj = newCamp
      }
    } catch (err: any) {
      console.warn('Backend campaign creation note:', err)
    } finally {
      setPublishing(false)
      setSelectedCampaign(campaignObj)
      setView('pay_campaign')
      loadCampaigns()
      toast.success('Invoice ready! Opening Tonkeeper...')
      handlePayInTonkeeper(campaignObj)
    }
  }

  const handleVerifyCampaignPayment = async (camp: Campaign) => {
    setVerifyingPayment(true)
    toast.loading('Scanning blockchain for payment...', { id: 'camp-verify' })
    try {
      const res = await checkDeposit()
      toast.dismiss('camp-verify')
      await refreshUser()
      await loadCampaigns()
      if (res?.credited && res.credited > 0) {
        toast.success('🎉 Payment verified! Campaign is live.')
        setView('campaigns')
      } else {
        toast.success('Scan complete. Active campaigns appear automatically.')
        setView('campaigns')
      }
    } catch (err: any) {
      toast.dismiss('camp-verify')
      toast.error('Payment confirmation takes 5–15 seconds on TON.')
    } finally {
      setVerifyingPayment(false)
    }
  }

  const calculatedCost = (promoCompletions * 0.001).toFixed(2)

  // VIEW 4: PAY CAMPAIGN
  if (view === 'pay_campaign' && selectedCampaign) {
    const cost = selectedCampaign.cost || (selectedCampaign.total_completions * 0.001) || 0.50
    const campMemo = selectedCampaign.payment_memo || 'CMP' + selectedCampaign.id.replace(/\D/g, '').slice(-6)

    return (
      <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
        <div className="text-center mb-4">
          <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
            CAMPAIGN INVOICE
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Complete TON payment to launch your task
          </p>
        </div>

        <div className="mine-card p-4 mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">Amount to Send</span>
            <span className="text-sm font-black text-slate-900 font-mono">{cost.toFixed(2)} TON</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">Target Users</span>
            <span className="text-xs font-bold text-[#0088ff] font-mono">{selectedCampaign.total_completions} Users</span>
          </div>
        </div>

        {/* Deposit Address */}
        <div className="mine-card p-3.5 mb-3">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-1">
            Deposit Address
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={depositAddress}
              className="flex-1 bg-[#f8fafc] text-[10px] text-slate-900 font-mono px-2.5 py-2 rounded-xl border border-slate-200 outline-none truncate select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(depositAddress)
                setCopiedAddr(true)
                toast.success('Address copied!')
                setTimeout(() => setCopiedAddr(false), 2000)
              }}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
            >
              {copiedAddr ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Memo */}
        <div className="mine-card p-3.5 mb-3.5">
          <label className="text-[9px] font-extrabold text-[#7c3aed] uppercase block mb-1 font-bold">
            Payment Memo (REQUIRED)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={campMemo}
              className="flex-1 bg-[#f8fafc] text-[11px] text-[#7c3aed] font-mono font-bold px-2.5 py-2 rounded-xl border border-purple-200 outline-none select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(campMemo)
                setCopiedMemo(true)
                toast.success('Memo copied!')
                setTimeout(() => setCopiedMemo(false), 2000)
              }}
              className="px-3 py-2 bg-purple-100 text-[#7c3aed] text-xs font-bold rounded-xl"
            >
              {copiedMemo ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => handlePayInTonkeeper(selectedCampaign)}
          className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider mb-2.5 shadow-md flex items-center justify-center gap-2"
        >
          <span>💎 1-CLICK PAY IN TONKEEPER</span>
        </button>

        <button
          onClick={() => handleVerifyCampaignPayment(selectedCampaign)}
          disabled={verifyingPayment}
          className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs uppercase tracking-wider mb-2.5 flex items-center justify-center gap-2 border border-slate-200"
        >
          {verifyingPayment ? 'CHECKING BLOCKCHAIN...' : '✓ I HAVE PAID (VERIFY NOW)'}
        </button>

        <button
          onClick={() => setView('campaigns')}
          className="w-full py-3 rounded-xl bg-white text-slate-500 font-bold text-xs uppercase tracking-wider border border-slate-200"
        >
          BACK
        </button>
      </div>
    )
  }

  // VIEW 3: NEW CAMPAIGN
  if (view === 'new_campaign') {
    return (
      <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
        <div className="text-center mb-4">
          <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
            Create Campaign
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Promote to thousands of active crypto users
          </p>
        </div>

        <div className="mine-card p-4.5 mb-3.5 space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
              Promo Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'link', label: 'Web Link' },
                { id: 'channel', label: 'Telegram Channel' },
                { id: 'group', label: 'Telegram Group' },
                { id: 'bot', label: 'Telegram Bot' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPromoType(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    promoType === item.id
                      ? 'bg-[#0088ff] text-white font-extrabold border-[#0088ff] shadow-sm'
                      : 'bg-[#f8fafc] text-slate-600 border-slate-200'
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Destination URL or @Username
            </label>
            <input
              type="text"
              placeholder="https://... or @channel"
              value={promoTarget}
              onChange={(e) => setPromoTarget(e.target.value)}
              className="w-full mine-input px-3.5 py-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              Completions (Min 500 Users = 0.50 GRAM)
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[500, 1000, 2000, 5000, 10000].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPromoCompletions(num)}
                  className={`py-2 px-1 rounded-xl text-xs transition-all border ${
                    promoCompletions === num
                      ? 'bg-[#0088ff] text-white font-black border-[#0088ff] shadow-sm'
                      : 'bg-[#f8fafc] text-slate-600 border-slate-200'
                  }`}
                >
                  {num} Users
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Target Reach:</span>
              <span className="font-bold text-slate-900">{promoCompletions} Users</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-1.5">
              <span className="font-extrabold text-slate-900 uppercase text-[10px]">Total Cost:</span>
              <span className="font-black text-sm text-[#0088ff] font-mono">{calculatedCost} GRAM</span>
            </div>
          </div>

          {user && user.honey_balance >= Number(calculatedCost) ? (
            <button
              onClick={handlePayWithBalance}
              disabled={publishing}
              className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
            >
              <span>⚡ PAY WITH BALANCE ({user.honey_balance.toFixed(4)} GRAM)</span>
            </button>
          ) : null}

          <button
            onClick={handlePublishCampaign}
            disabled={publishing}
            className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
          >
            <span>💎 PAY VIA TONKEEPER ({calculatedCost} TON)</span>
          </button>
        </div>

        <button
          onClick={() => setView('campaigns')}
          className="w-full py-3 rounded-xl bg-white text-slate-600 font-extrabold text-xs uppercase tracking-wider border border-slate-200"
        >
          BACK
        </button>
      </div>
    )
  }

  // VIEW 2: CAMPAIGNS LIST
  if (view === 'campaigns') {
    return (
      <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
        <div className="text-center mb-4">
          <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
            Promote Channel & Links
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Broadcast tasks to thousands of active miners
          </p>
        </div>

        <button
          onClick={() => setView('new_campaign')}
          className="w-full mb-3.5 py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
        >
          <span>+ CREATE NEW CAMPAIGN</span>
        </button>

        {loadingCampaigns ? (
          <div className="text-center py-8 text-slate-400 text-xs animate-pulse">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="mine-card p-6 text-center mb-4">
            <div className="text-2xl mb-1">📢</div>
            <div className="text-xs font-bold text-slate-800">No campaigns created yet</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Promote your channel, bot, group, or link to thousands of active miners.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {campaigns.map((camp) => {
              const isWaiting = camp.status === 'waiting_for_payment'
              const isFinished = camp.status === 'finished' || camp.status === 'completed' || camp.done_completions >= camp.total_completions

              return (
                <div key={camp.id} className="mine-card p-3.5 flex items-center justify-between gap-3">
                  <div className="truncate flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">{camp.title || camp.target}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {isWaiting ? (
                        <span className="text-amber-500 font-bold">Waiting for payment</span>
                      ) : isFinished ? (
                        <span className="text-[#059669] font-bold">✓ Completed ({camp.total_completions}/{camp.total_completions})</span>
                      ) : (
                        <span>{camp.done_completions}/{camp.total_completions} completions</span>
                      )}
                    </div>
                  </div>

                  {isWaiting && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(camp)
                        setView('pay_campaign')
                      }}
                      className="px-3.5 py-1.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-sm"
                    >
                      Pay
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setView('tasks')}
          className="w-full py-3 rounded-xl bg-white text-slate-600 font-extrabold text-xs uppercase tracking-wider border border-slate-200"
        >
          ← BACK TO TASKS
        </button>
      </div>
    )
  }

  // VIEW 1: TASKS
  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      <div className="text-center mb-4">
        <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
          Tasks & Missions
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Complete daily tasks to boost your computing power
        </p>
      </div>

      {/* Top Banner Button: PROMOTE YOUR LINK */}
      <button
        onClick={() => {
          setView('campaigns')
          loadCampaigns()
        }}
        className="w-full mb-3.5 py-3 rounded-xl bg-white border border-slate-200 text-[#0f172a] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:border-slate-300 active:scale-95"
      >
        <span>📢</span>
        <span>PROMOTE YOUR LINK OR CHANNEL</span>
      </button>

      {/* ── SECTION 0: WATCH AD TASKS ─────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>📺</span> WATCH AD REWARDS
          </span>
          <span className="text-[9px] font-extrabold text-[#0088ff] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            +{WATCH_AD_POWER_REWARD} GHS EACH
          </span>
        </div>

        <div className="space-y-2">
          {Array.from({ length: WATCH_AD_TASKS_COUNT }, (_, i) => {
            const isDone = watchAdState.completed.includes(i)
            const isVerifying = watchAdVerifyingIndex === i
            const allPreviousDone = i === 0 || watchAdState.completed.includes(i - 1)
            const isLocked = !isDone && !allPreviousDone

            return (
              <div key={i} className="mine-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0088ff] flex items-center justify-center text-sm shrink-0 font-black">
                    {isDone ? '✅' : isVerifying ? '⏱️' : isLocked ? '🔒' : '📺'}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Watch Booster Ad #{i + 1}
                    </div>
                    <div className="text-[10px] text-[#0088ff] font-bold mt-0.5 font-mono">
                      {isDone ? `+${WATCH_AD_POWER_REWARD} GHS Claimed ✓` : isVerifying ? `Verifying... (${watchAdSecondsLeft}s)` : `+${WATCH_AD_POWER_REWARD} GHS Mining Power`}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                      ✓ Done
                    </span>
                  ) : isVerifying ? (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-extrabold text-xs">
                      {watchAdSecondsLeft}s
                    </span>
                  ) : isLocked ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-extrabold text-xs">
                      Locked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleWatchAdTask(i)}
                      disabled={watchAdVerifyingIndex !== null}
                      className="px-4 py-2 rounded-xl btn-primary-blue font-black text-xs uppercase shadow-sm"
                    >
                      ▶ Watch
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 1: REFERRAL MILESTONES */}
      {milestones.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> HASHRATE MILESTONES
            </span>
            <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              BONUS POWER
            </span>
          </div>

          <div className="space-y-2">
            {milestones.map((mission) => {
              const count = mission.milestone_count || 10
              const progress = mission.progress || 0
              const isEligible = progress >= count && !mission.is_completed
              const percent = mission.is_completed ? 100 : Math.min(100, Math.round((progress / count) * 100))

              return (
                <div key={mission.id} className="mine-card p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 min-w-[48px] px-2 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center gap-1 font-black text-xs shrink-0">
                        <span>{count}</span>
                        <span className="text-[10px]">👥</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{mission.title}</div>
                        <div className="text-[10px] font-bold text-[#059669] mt-0.5">
                          +{mission.reward_power} GHS MINING POWER
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {mission.is_completed ? (
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
                          DONE ✓
                        </span>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleClaimMilestone(mission)}
                          disabled={actionId === mission.id}
                          className="px-3.5 py-1.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider shadow-md"
                        >
                          {actionId === mission.id ? '...' : `CLAIM +${mission.reward_power} GHS`}
                        </button>
                      ) : (
                        <button
                          onClick={handleShare}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs"
                        >
                          INVITE
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2 pt-0.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00d68f] to-[#0088ff] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      {progress}/{count} ({percent}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: PROMOTED TASKS */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span> PARTNER MISSIONS
          </span>
          <span className="text-[9px] font-bold text-slate-400">+0.1 GHS EACH</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-400 text-xs animate-pulse">Loading tasks...</div>
        ) : sponsored.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">
            ✨ All tasks completed! Check back soon for new tasks.
          </div>
        ) : (
          <div className="space-y-2">
            {sponsored.map((mission) => (
              <div key={mission.id} className="mine-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0088ff] flex items-center justify-center text-sm shrink-0">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{mission.title}</div>
                    <div className="text-[10px] text-[#059669] font-bold mt-0.5">
                      +{mission.reward_power} GHS
                    </div>
                  </div>
                </div>

                <div>
                  {mission.is_completed ? (
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSponsoredAction(mission)}
                      disabled={actionId === mission.id}
                      className="px-3.5 py-1.5 rounded-xl btn-primary-blue font-black text-xs uppercase"
                    >
                      {actionId === mission.id ? '...' : `+${mission.reward_power} GHS`}
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
