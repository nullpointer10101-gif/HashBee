import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  fetchMissions,
  completeMission,
  claimMilestone,
  createCampaign,
  fetchMyCampaigns,
  checkDeposit,
  rewardAdWatch,
} from '../services/api'
import { showRewardedAdWithWaterfall } from '../services/monetag'
import { Mission, Campaign } from '../types'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useLocation } from 'react-router-dom'

export type ViewMode = 'watch' | 'tasks' | 'campaigns' | 'new_campaign' | 'pay_campaign'

interface MissionsProps {
  defaultTab?: ViewMode
}

const GIGA_TASKS_COUNT = 3
const GIGA_ADS_PER_TIER = 10
const GIGA_POWER_PER_AD = 0.5 // +0.5 GHS each watch
const GIGA_REFRESH_MS = 24 * 60 * 60 * 1000 // 24 hours daily cycle
const LS_KEY_GIGA_ADS = 'hb_gigapub_tasks_v3'

interface GigaWatchAdState {
  windowStart: number
  counts: [number, number, number] // progress in each of the 3 options [0..10, 0..10, 0..10]
}

function loadGigaAdState(): GigaWatchAdState {
  try {
    const raw = localStorage.getItem(LS_KEY_GIGA_ADS)
    if (raw) {
      const parsed: GigaWatchAdState = JSON.parse(raw)
      if (Date.now() - parsed.windowStart >= GIGA_REFRESH_MS) {
        const fresh: GigaWatchAdState = { windowStart: Date.now(), counts: [0, 0, 0] }
        localStorage.setItem(LS_KEY_GIGA_ADS, JSON.stringify(fresh))
        return fresh
      }
      if (Array.isArray(parsed.counts) && parsed.counts.length === 3) {
        return parsed
      }
    }
  } catch {}
  const fresh: GigaWatchAdState = { windowStart: Date.now(), counts: [0, 0, 0] }
  localStorage.setItem(LS_KEY_GIGA_ADS, JSON.stringify(fresh))
  return fresh
}

function saveGigaAdState(state: GigaWatchAdState) {
  localStorage.setItem(LS_KEY_GIGA_ADS, JSON.stringify(state))
}

export const Missions: React.FC<MissionsProps> = ({ defaultTab }) => {
  const { t } = useLanguage()
  const location = useLocation()

  const resolveInitialView = (): ViewMode => {
    if (defaultTab) return defaultTab
    if (location.pathname === '/watch' || new URLSearchParams(location.search).get('tab') === 'watch') {
      return 'watch'
    }
    if (location.pathname === '/tasks' || location.pathname === '/missions') {
      return 'tasks'
    }
    return 'watch'
  }

  const [view, setView] = useState<ViewMode>(resolveInitialView)
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

  const [gigaAdState, setGigaAdState] = useState<GigaWatchAdState>(loadGigaAdState)
  const [watchAdLoadingIndex, setWatchAdLoadingIndex] = useState<number | null>(null)
  const [watchAdCountdown, setWatchAdCountdown] = useState('')

  const totalWatches = (gigaAdState.counts[0] || 0) + (gigaAdState.counts[1] || 0) + (gigaAdState.counts[2] || 0)
  const totalPowerFromAds = (totalWatches * GIGA_POWER_PER_AD).toFixed(2)
  const totalDailyPercent = Math.min(100, (totalWatches / (GIGA_TASKS_COUNT * GIGA_ADS_PER_TIER)) * 100)

  // Synchronize view state with props and URL changes
  useEffect(() => {
    if (defaultTab) {
      setView(defaultTab)
    } else if (location.pathname === '/watch' || new URLSearchParams(location.search).get('tab') === 'watch') {
      setView('watch')
    } else if (location.pathname === '/tasks' || location.pathname === '/missions') {
      setView('tasks')
    }
  }, [defaultTab, location.pathname, location.search])

  // 24-Hour Watch Ad Refresh Timer Ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const elapsed = now - gigaAdState.windowStart
      if (elapsed >= GIGA_REFRESH_MS) {
        // 24 hours passed! Reset all 3 task batches
        const fresh: GigaWatchAdState = { windowStart: now, counts: [0, 0, 0] }
        setGigaAdState(fresh)
        saveGigaAdState(fresh)
        setWatchAdCountdown('24:00:00')
      } else {
        const remainingSec = Math.max(0, Math.floor((GIGA_REFRESH_MS - elapsed) / 1000))
        const hours = Math.floor(remainingSec / 3600)
        const mins = Math.floor((remainingSec % 3600) / 60)
        const secs = remainingSec % 60
        setWatchAdCountdown(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        )
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [gigaAdState.windowStart])

  const completeAdReward = async (taskIndex: number, provider = 'AdExium', durationSec = 10) => {
    let powerAdded = GIGA_POWER_PER_AD
    try {
      const res = await rewardAdWatch(provider, taskIndex, durationSec)
      powerAdded = res.power_gained || GIGA_POWER_PER_AD
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to credit mining power'
      toast.error(`⚠️ ${errMsg}`)
      return
    }

    setGigaAdState((prev) => {
      const newCounts: [number, number, number] = [...prev.counts]
      newCounts[taskIndex] = Math.min(GIGA_ADS_PER_TIER, (newCounts[taskIndex] || 0) + 1)
      const updated: GigaWatchAdState = { ...prev, counts: newCounts }
      saveGigaAdState(updated)
      return updated
    })

    toast.success(`🎉 10s+ Verified! +${powerAdded.toFixed(2)} GHS Mining Power added! (${(gigaAdState.counts[taskIndex] || 0) + 1}/${GIGA_ADS_PER_TIER})`)
    await refreshUser()
  }

  const isAdTaskInProgressRef = useRef(false)

  const handleWatchAdTask = useCallback(
    async (taskIndex: number) => {
      if (isAdTaskInProgressRef.current || watchAdLoadingIndex !== null) return

      const currentCount = gigaAdState.counts[taskIndex] || 0
      if (currentCount >= GIGA_ADS_PER_TIER) {
        toast.error(`Tier ${taskIndex + 1} completed (${GIGA_ADS_PER_TIER}/${GIGA_ADS_PER_TIER})! Try another tier or wait for 24h reset.`)
        return
      }

      isAdTaskInProgressRef.current = true
      setWatchAdLoadingIndex(taskIndex)
      toast.loading('🎬 Launching sponsor video... Please watch for at least 10s to earn reward!', { id: 'ad-load' })

      let adResult: { success: boolean; provider: string; duration: number } = { success: false, provider: 'none', duration: 0 }
      try {
        adResult = await showRewardedAdWithWaterfall('adexium')
      } catch (err) {
        console.warn('Ad playback error:', err)
      } finally {
        toast.dismiss('ad-load')
        setWatchAdLoadingIndex(null)
        isAdTaskInProgressRef.current = false
      }

      if (adResult.success) {
        await completeAdReward(taskIndex, adResult.provider, Math.max(10, Math.round(adResult.duration || 10)))
      } else if (adResult.provider === 'busy') {
        toast.error('⚠️ Ad system is busy with another video. Please wait a moment!')
      } else if (adResult.duration > 0 && adResult.duration < 5) {
        toast.error(`⚠️ Video was closed too early (${adResult.duration.toFixed(0)}s). Please watch the sponsor video to earn +0.50 GHS!`)
      } else {
        toast.error('⚠️ Sponsor video is currently unavailable or loading. Please try again in a moment!')
      }
    },
    [gigaAdState.counts, watchAdLoadingIndex, refreshUser]
  )

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
    const text = '🐝 Join HashBee & get 50 GHS Power! Start mining TON & USDT!'
    const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(inviteLink) + '&text=' + encodeURIComponent(text)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
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
        toast.success('🎉 Payment verified! Campaign is live.', { duration: 5000 })
        setView('campaigns')
      } else {
        toast.error('⚠️ No payment detected yet on the TON blockchain. Please ensure you sent the TON with the required memo and try again!', { duration: 6000 })
      }
    } catch (err: any) {
      toast.dismiss('camp-verify')
      toast.error('⚠️ Payment confirmation takes 5–15 seconds on TON. Please try again!')
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
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#b91c1c] hover:from-[#b91c1c] hover:to-[#dc2626] text-white font-black text-xs uppercase tracking-wider mb-2.5 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 active:scale-95 transition-all border border-red-400"
        >
          {verifyingPayment ? 'CHECKING TON BLOCKCHAIN...' : '✓ I HAVE SENT PAYMENT — VERIFY NOW'}
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
          ← BACK TO MISSIONS
        </button>
      </div>
    )
  }

  // MAIN VIEW (WATCH OR TASKS)
  return (
    <div className="pb-28 pt-3 px-4 max-w-md mx-auto min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      {/* ── TOP HEADER ── */}
      <div className="text-center mb-3.5">
        <h1 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">
          {view === 'watch' ? 'Watch & Boost Network' : 'Tasks & Missions'}
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {view === 'watch'
            ? 'Watch sponsor videos to supercharge your GHS mining power'
            : 'Complete partner missions & milestones for extra rewards'}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── DEDICATED BN RED WATCH & EARN DASHBOARD ─────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {view === 'watch' && (
        <div className="space-y-3.5">
          {/* ── LUXURY BN RED HERO CYBER VAULT CARD ── */}
          <div className="p-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d0407] via-[#2a070e] to-[#120204] text-white border border-red-500/40 shadow-xl shadow-red-950/40">
            {/* Ambient Ruby Flame Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header Row */}
            <div className="flex items-center justify-between relative z-10 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-red-400/40 flex items-center justify-center text-base shadow-sm">
                  🔥
                </div>
                <span className="text-xs font-black tracking-widest text-red-200 uppercase">
                  BN HASHRATE BOOSTER
                </span>
              </div>

              {/* Reset Countdown Timer Badge */}
              <div className="px-3 py-1 rounded-xl bg-black/50 border border-red-400/40 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Resets in {watchAdCountdown || '24:00:00'}</span>
              </div>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-2 gap-2.5 my-3 relative z-10">
              <div className="p-3.5 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
                <span className="text-[9.5px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  COMPLETED TODAY
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {totalWatches} <span className="text-xs text-red-300 font-sans font-medium">/ 30 ADS</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
                <span className="text-[9.5px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  HASHRATE GAINED
                </span>
                <span className="text-2xl font-black text-[#00f090] font-mono mt-1 block">
                  +{totalPowerFromAds} <span className="text-xs text-emerald-200 font-sans font-medium">GHS</span>
                </span>
              </div>
            </div>

            {/* Total Daily Progress Bar */}
            <div className="relative z-10 pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] text-slate-300 font-bold">
                <span>Daily Boost Capacity</span>
                <span className="font-mono text-amber-300 font-black">
                  {totalDailyPercent.toFixed(0)}% (+15.00 GHS Max)
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${totalDailyPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── 3 DEDICATED BN RED BATCH CARDS (10 WATCHES EACH = 30 TOTAL) ── */}
          <div className="space-y-3">
            {[
              {
                id: 0,
                title: 'Crimson Flame Booster',
                badge: 'BATCH #1',
                accentGrad: 'from-[#dc2626] via-[#ef4444] to-[#b91c1c]',
                icon: '🔥',
              },
              {
                id: 1,
                title: 'Scarlet Ruby Vanguard',
                badge: 'BATCH #2',
                accentGrad: 'from-[#e11d48] via-[#f43f5e] to-[#be123c]',
                icon: '⚡',
              },
              {
                id: 2,
                title: 'Phoenix Inferno Sovereign',
                badge: 'BATCH #3',
                accentGrad: 'from-[#b91c1c] via-[#dc2626] to-[#991b1b]',
                icon: '👑',
              },
            ].map((tier, i) => {
              const count = gigaAdState.counts[i] || 0
              const isCompleted = count >= GIGA_ADS_PER_TIER
              const isLoading = watchAdLoadingIndex === i
              const progressPercent = Math.min(100, (count / GIGA_ADS_PER_TIER) * 100)
              const powerEarned = (count * GIGA_POWER_PER_AD).toFixed(2)

              return (
                <div
                  key={tier.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-2.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl shrink-0 font-black border border-red-100">
                        {isCompleted ? '👑' : tier.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                            {tier.title}
                          </span>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono shrink-0">
                            {tier.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>
                            Progress: <b className="text-slate-900 font-mono">{count}/{GIGA_ADS_PER_TIER}</b>
                          </span>
                          <span>•</span>
                          <span className="text-red-600 font-black font-mono">
                            +{powerEarned} / +5.00 GHS
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[10px] font-mono whitespace-nowrap">
                        +0.50 GHS/Ad
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-red-600 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* High-Energy BN Red Action Button */}
                  {isCompleted ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm">
                      <span>✓</span>
                      <span>10/10 BATCH COMPLETED (+5.00 GHS)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleWatchAdTask(i)}
                      disabled={watchAdLoadingIndex !== null}
                      className={`w-full py-3 rounded-xl bg-gradient-to-r ${tier.accentGrad} text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 border border-red-400/40 ${
                        isLoading ? 'opacity-80 cursor-wait' : 'hover:brightness-110'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Streaming Sponsor Video...</span>
                        </>
                      ) : (
                        <>
                          <span>🔥</span>
                          <span>Watch Sponsor Video (+0.50 GHS)</span>
                          <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded-md">
                            {count + 1}/10
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── AUTO-CREDIT INSTANT VERIFICATION FOOTER ── */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border border-red-200/60 text-slate-700 text-xs flex items-center gap-2.5">
            <span className="text-xl shrink-0">⚡</span>
            <div className="text-[11px] leading-snug">
              <span className="font-black text-red-700">Instant Automatic Hashrate:</span> Watching sponsor videos automatically verifies on-chain and credits your cloud mining power in real-time.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TASKS & MISSIONS SECTION (ALL-IN-ONE) ───────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {view === 'tasks' && (
        <div className="space-y-3.5">
          {/* ── 1. TOP PROMOTER BANNER ── */}
          <div
            onClick={() => {
              setView('campaigns')
              loadCampaigns()
            }}
            className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#2563eb] text-white shadow-lg shadow-indigo-500/25 border border-indigo-300/30 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner border border-white/30 shrink-0">
                  📢
                </div>
                <div>
                  <div className="text-xs font-black text-white leading-tight">
                    Promote Your Channel or Link
                  </div>
                  <div className="text-[10px] text-indigo-100 font-medium mt-0.5">
                    Reach thousands of active crypto miners instantly
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-white text-[#4f46e5] font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <span>LAUNCH</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </div>

          {/* Referral Milestones */}
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

          {/* Partner Missions */}
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
      )}
    </div>
  )
}

export default Missions

