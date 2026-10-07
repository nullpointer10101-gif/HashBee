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
const WATCH_AD_REFRESH_MS = 2 * 60 * 60 * 1000 // 2 hours
const WATCH_AD_POWER_REWARD = 1 // 1 GHS Mining Power
const LS_KEY_WATCH_ADS = 'hb_watch_ad_tasks_v2'

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
        const fresh = { windowStart: Date.now(), completed: [] }
        localStorage.setItem(LS_KEY_WATCH_ADS, JSON.stringify(fresh))
        return fresh
      }
      return parsed
    }
  } catch {}
  const fresh = { windowStart: Date.now(), completed: [] }
  localStorage.setItem(LS_KEY_WATCH_ADS, JSON.stringify(fresh))
  return fresh
}

function saveWatchAdState(state: WatchAdState) {
  localStorage.setItem(LS_KEY_WATCH_ADS, JSON.stringify(state))
}

function showAd(): Promise<boolean> {
  return new Promise((resolve) => {
    let finished = false
    const done = (success: boolean) => {
      if (!finished) {
        finished = true
        resolve(success)
      }
    }

    // Safety timeout: 12 seconds for AdExium response & presentation
    const timer = setTimeout(() => {
      console.log('[Missions] AdExium timeout reached, fallback triggered')
      done(false)
    }, 12000)

    // 1. Try AdExium Interstitial/Rewarded Video
    try {
      let adex = (window as any).adexiumWidget
      if (!adex && typeof (window as any).initAdexium === 'function') {
        adex = (window as any).initAdexium()
      }
      if (!adex) {
        const WidgetClass = (window as any).AdexiumWidget || (window as any).TGAdsWidget
        if (WidgetClass) {
          const isInsideTg = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || window.Telegram?.WebApp?.initData)
          adex = new WidgetClass({
            wid: '8e21d2a6-6c80-4b16-baf9-990e07ff2f00',
            adFormat: 'interstitial',
            debug: !isInsideTg,
          })
          ;(window as any).adexiumWidget = adex
        }
      }

      if (adex && typeof adex.requestAd === 'function') {
        const handleReceived = (ad: any) => {
          console.log('[Missions] AdExium adReceived! Displaying now...')
          try {
            if (typeof adex.displayAd === 'function') {
              adex.displayAd(ad)
            }
          } catch (e) {
            console.warn('[AdExium] displayAd error:', e)
          }
        }

        const handleClosed = () => {
          console.log('[Missions] AdExium adClosed -> User completed view')
          cleanup()
          clearTimeout(timer)
          done(true)
        }

        const handleCompleted = () => {
          console.log('[Missions] AdExium adPlaybackCompleted')
          cleanup()
          clearTimeout(timer)
          done(true)
        }

        const handleNoAd = () => {
          console.log('[Missions] AdExium noAdFound from network')
          cleanup()
          clearTimeout(timer)
          done(false)
        }

        const handleError = (err: any) => {
          console.warn('[Missions] AdExium requestAdError:', err)
          cleanup()
          clearTimeout(timer)
          done(false)
        }

        const cleanup = () => {
          if (typeof adex.off === 'function') {
            try {
              adex.off('adReceived', handleReceived)
              adex.off('adClosed', handleClosed)
              adex.off('adPlaybackCompleted', handleCompleted)
              adex.off('noAdFound', handleNoAd)
              adex.off('requestAdError', handleError)
            } catch {}
          }
        }

        if (typeof adex.on === 'function') {
          adex.on('adReceived', handleReceived)
          adex.on('adClosed', handleClosed)
          adex.on('adPlaybackCompleted', handleCompleted)
          adex.on('noAdFound', handleNoAd)
          adex.on('requestAdError', handleError)
        }

        console.log('[Missions] Requesting AdExium interstitial rewarded...')
        adex.requestAd('interstitial', true).then((ads: any) => {
          if (Array.isArray(ads) && ads.length > 0) {
            try {
              if (typeof adex.displayAd === 'function') {
                adex.displayAd(ads)
              }
            } catch (e) {
              console.warn('[Missions] displayAd promise resolution error:', e)
            }
          }
        }).catch((err: any) => {
          console.warn('[Missions] requestAd promise error:', err)
        })

        return
      }
    } catch (err) {
      console.warn('[Missions] AdExium request error:', err)
    }

    // If AdExium is not available
    clearTimeout(timer)
    done(false)
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
  const [watchAdLoadingIndex, setWatchAdLoadingIndex] = useState<number | null>(null)
  const [watchAdCountdown, setWatchAdCountdown] = useState('')
  const watchAdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // In-app interactive booster ad video player fallback
  const [showInAppAdModal, setShowInAppAdModal] = useState(false)
  const [adPlayingTaskIndex, setAdPlayingTaskIndex] = useState<number | null>(null)
  const [inAppAdCountdown, setInAppAdCountdown] = useState(5)
  const [inAppAdCanClaim, setInAppAdCanClaim] = useState(false)

  // 2-Hour Watch Ad Refresh Timer Ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const elapsed = now - watchAdState.windowStart
      if (elapsed >= WATCH_AD_REFRESH_MS) {
        // 2 hours passed! Reset tasks
        const fresh: WatchAdState = { windowStart: now, completed: [] }
        setWatchAdState(fresh)
        saveWatchAdState(fresh)
        setWatchAdCountdown('02:00:00')
      } else {
        const remainingSec = Math.max(0, Math.floor((WATCH_AD_REFRESH_MS - elapsed) / 1000))
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
  }, [watchAdState.windowStart])

  useEffect(() => {
    let adInterval: any = null
    if (showInAppAdModal && inAppAdCountdown > 0) {
      adInterval = setInterval(() => {
        setInAppAdCountdown((prev) => {
          if (prev <= 1) {
            setInAppAdCanClaim(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (adInterval) clearInterval(adInterval)
    }
  }, [showInAppAdModal, inAppAdCountdown])

  const completeAdReward = async (taskIndex: number) => {
    setWatchAdState((prev) => {
      const nextCompleted = [...new Set([...prev.completed, taskIndex])]
      const updated: WatchAdState = { ...prev, completed: nextCompleted }
      saveWatchAdState(updated)
      return updated
    })

    try {
      await completeMission(`watch_ad_${taskIndex + 1}`)
    } catch {}

    toast.success(`🎉 +${WATCH_AD_POWER_REWARD} GHS Mining Power added!`)
    await refreshUser()
  }

  const handleWatchAdTask = useCallback(
    async (taskIndex: number) => {
      if (watchAdState.completed.includes(taskIndex)) return
      if (watchAdLoadingIndex !== null) return

      setWatchAdLoadingIndex(taskIndex)
      toast.loading('🎬 Launching video booster ad...', { id: 'ad-load' })

      let adPlayed = false
      try {
        adPlayed = await showAd()
      } catch (err) {
        console.warn('Ad playback error:', err)
      } finally {
        toast.dismiss('ad-load')
        setWatchAdLoadingIndex(null)
      }

      if (adPlayed) {
        await completeAdReward(taskIndex)
        return
      }

      // If network ad is pending / blocked, launch interactive in-app booster player
      setAdPlayingTaskIndex(taskIndex)
      setInAppAdCountdown(5)
      setInAppAdCanClaim(false)
      setShowInAppAdModal(true)
    },
    [watchAdState.completed, watchAdLoadingIndex, refreshUser]
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

      {/* Top Banner: PROMOTE YOUR LINK OR CHANNEL */}
      <div
        onClick={() => {
          setView('campaigns')
          loadCampaigns()
        }}
        className="relative overflow-hidden mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#2563eb] text-white shadow-lg shadow-indigo-500/25 border border-indigo-300/30 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/30 shrink-0">
              📢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                  🔥 PROMOTER HUB
                </span>
              </div>
              <div className="text-sm font-black text-white mt-1 leading-tight">
                Promote Your Channel or Link
              </div>
              <div className="text-[11px] text-indigo-100 font-medium mt-0.5">
                Reach thousands of active crypto miners instantly
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white text-[#4f46e5] font-black text-xs shadow-md uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-50">
              <span>LAUNCH</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 0: WATCH AD TASKS (REFRESH EVERY 2 HOURS) ─────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>📺</span> WATCH AD REWARDS
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-extrabold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Resets in {watchAdCountdown || '02:00:00'}</span>
            </span>
            <span className="text-[9px] font-extrabold text-[#0088ff] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              +{WATCH_AD_POWER_REWARD} GHS
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: WATCH_AD_TASKS_COUNT }, (_, i) => {
            const isDone = watchAdState.completed.includes(i)
            const isLoading = watchAdLoadingIndex === i
            const allPreviousDone = i === 0 || watchAdState.completed.includes(i - 1)
            const isLocked = !isDone && !allPreviousDone

            return (
              <div key={i} className="mine-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0088ff] flex items-center justify-center text-sm shrink-0 font-black">
                    {isDone ? '✅' : isLoading ? '⏳' : isLocked ? '🔒' : '📺'}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Watch Booster Ad #{i + 1}
                    </div>
                    <div className="text-[10px] text-[#0088ff] font-bold mt-0.5 font-mono">
                      {isDone ? `+${WATCH_AD_POWER_REWARD} GHS Claimed ✓` : isLoading ? 'Loading Video Ad...' : `+${WATCH_AD_POWER_REWARD} GHS Mining Power`}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                      ✓ Done
                    </span>
                  ) : isLoading ? (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-extrabold text-xs animate-pulse">
                      Loading...
                    </span>
                  ) : isLocked ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-extrabold text-xs">
                      Locked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleWatchAdTask(i)}
                      disabled={watchAdLoadingIndex !== null}
                      className="px-4 py-2 rounded-xl btn-primary-blue font-black text-xs uppercase shadow-sm active:scale-95 transition-transform"
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

      {/* ── IN-APP BOOSTER AD VIDEO PLAYER MODAL ── */}
      {showInAppAdModal && (() => {
        const sponsors = [
          {
            title: 'TON Cyber Cloud Miner',
            tag: 'FEATURED SPONSOR',
            desc: 'Unlock ultra high-speed TON & USDT cloud hashrate with 0% fees.',
            icon: '⚡',
            gradient: 'from-blue-600 via-indigo-600 to-slate-900',
            glow: 'rgba(59,130,246,0.35)',
            btnText: '🚀 Explore Sponsor Node',
            btnUrl: 'https://t.me/hashbe_bot',
          },
          {
            title: 'Toncoin Liquid Staking Pool',
            tag: 'VERIFIED PARTNER',
            desc: 'Stake TON on-chain and earn high-yield daily mining distributions.',
            icon: '💎',
            gradient: 'from-sky-500 via-blue-600 to-slate-900',
            glow: 'rgba(14,165,233,0.35)',
            btnText: '💎 View Staking Pool',
            btnUrl: 'https://ton.org',
          },
          {
            title: 'HashBee ASIC Queen Swarm',
            tag: 'OFFICIAL AD NETWORK',
            desc: 'Supercharge your daily revenue with 100 GHS enterprise ASIC rigs.',
            icon: '🐝',
            gradient: 'from-amber-500 via-orange-600 to-slate-900',
            glow: 'rgba(245,158,11,0.35)',
            btnText: '🐝 Boost Hashrate Now',
            btnUrl: 'https://t.me/hashbe_bot',
          },
          {
            title: 'Telegram Web3 Payout Network',
            tag: 'LIVE SPONSOR',
            desc: 'Direct automated on-chain TON & USDT payouts straight to your wallet.',
            icon: '🚀',
            gradient: 'from-emerald-500 via-teal-600 to-slate-900',
            glow: 'rgba(16,185,129,0.35)',
            btnText: '📢 Live Proofs Channel',
            btnUrl: 'https://t.me/HashBeePayouts',
          },
        ]
        const currentSponsor = sponsors[(adPlayingTaskIndex ?? 0) % sponsors.length]

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#0b1120] border border-blue-500/40 rounded-3xl p-5 max-w-sm w-full text-white shadow-2xl relative overflow-hidden text-center">
              {/* Ambient Background Glow */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-700"
                style={{ backgroundColor: currentSponsor.glow }}
              />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

              {/* Header Badges */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  🎬 {currentSponsor.tag}
                </span>
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-lg">
                  {inAppAdCountdown > 0 ? `⏳ ${inAppAdCountdown}s` : '✅ Complete'}
                </span>
              </div>

              {/* Dynamic Video Ad Player Screen */}
              <div className={`relative w-full aspect-video rounded-2xl bg-gradient-to-br ${currentSponsor.gradient} border border-white/15 overflow-hidden flex flex-col items-center justify-center mb-4 p-4 shadow-2xl relative group`}>
                {/* Live Scanline / Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                {/* Animated Badge & Icon */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl mb-2.5 shadow-lg animate-pulse">
                  <span>{currentSponsor.icon}</span>
                  <div className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-500 text-[8px] font-black uppercase tracking-widest text-white rounded-full">
                    AD
                  </div>
                </div>

                <div className="relative z-10 text-sm font-black text-white tracking-wide drop-shadow-md">
                  {currentSponsor.title}
                </div>
                <p className="relative z-10 text-[11px] text-slate-200/90 mt-1 max-w-[240px] leading-snug font-medium drop-shadow-sm">
                  {currentSponsor.desc}
                </p>

                {/* Optional sponsor direct link */}
                <a
                  href={currentSponsor.btnUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 mt-2.5 text-[10px] font-extrabold text-white bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1 rounded-full transition-all flex items-center gap-1 shadow-sm"
                >
                  {currentSponsor.btnText} →
                </a>

                {/* Live Video Timeline Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/60 backdrop-blur-sm">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-emerald-400 transition-all duration-1000 ease-linear shadow-glow"
                    style={{ width: `${((5 - inAppAdCountdown) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Reward Info */}
              <div className="mb-4">
                <div className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                  <span>Watching Booster Video #{(adPlayingTaskIndex ?? 0) + 1}</span>
                </div>
                <div className="text-xs text-emerald-400 font-extrabold mt-0.5 flex items-center justify-center gap-1">
                  <span>🎁 Reward:</span>
                  <span className="text-amber-300 font-black">+{WATCH_AD_POWER_REWARD} GHS Mining Power</span>
                </div>
              </div>

              {/* Action Button */}
              {inAppAdCanClaim ? (
                <button
                  onClick={async () => {
                    if (adPlayingTaskIndex !== null) {
                      await completeAdReward(adPlayingTaskIndex)
                    }
                    setShowInAppAdModal(false)
                    setAdPlayingTaskIndex(null)
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/35 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>🎉</span>
                  <span>Claim +{WATCH_AD_POWER_REWARD} GHS Mining Reward</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3.5 rounded-2xl bg-slate-800/90 text-slate-400 font-bold text-xs uppercase tracking-wider cursor-not-allowed border border-slate-700/80 flex items-center justify-center gap-2"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Streaming Sponsor Video ({inAppAdCountdown}s)...</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowInAppAdModal(false)
                  setAdPlayingTaskIndex(null)
                }}
                className="mt-3 text-[11px] text-slate-400 hover:text-slate-200 font-bold"
              >
                Cancel & Close
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default Missions
