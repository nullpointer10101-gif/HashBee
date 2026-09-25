import React, { useEffect, useState } from 'react'
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
import toast from 'react-hot-toast'

type ViewMode = 'tasks' | 'campaigns' | 'new_campaign' | 'pay_campaign'

export const Missions: React.FC = () => {
  const [view, setView] = useState<ViewMode>('tasks')
  const [missions, setMissions] = useState<Mission[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  // New Campaign Form State
  const [promoType, setPromoType] = useState<'link' | 'channel' | 'group' | 'bot'>('link')
  const [promoTarget, setPromoTarget] = useState('')
  const [promoCompletions, setPromoCompletions] = useState<number>(50)

  // Selected Campaign to Pay
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Copy state
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)

  const { user, refreshUser } = useAuth()
  const depositAddress = 'EQAehBZqsy6cBGSmVn2qquO5b44ckmTnhmT9K0LKcfsygDeL'

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
  const userTgId = user?.telegram_id || '6446145632'
  const inviteLink = 'https://t.me/' + botUsername + '?start=' + userTgId

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
          id: 's-1',
          title: 'airdrops288',
          description: '+0.1 GHS',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/airdrops288',
          is_completed: false,
        },
        {
          id: 's-2',
          title: 'criptochts2025',
          description: '+0.1 GHS',
          reward_power: 0.1,
          type: 'telegram_channel',
          target_url: 'https://t.me/criptochts2025',
          is_completed: false,
        },
        {
          id: 's-3',
          title: 'Aird555',
          description: '+0.1 GHS',
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

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true)
      const data = await fetchMyCampaigns()
      setCampaigns(data)
    } catch (err) {
      setCampaigns([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  useEffect(() => {
    if (view === 'campaigns' || view === 'pay_campaign') {
      loadCampaigns()
    }
  }, [view])

  const handleClaimMilestone = async (mission: Mission) => {
    setActionId(mission.id)
    try {
      const res = await claimMilestone(mission.id)
      toast.success('🎉 Milestone Claimed! +' + (res.reward_power || mission.reward_power) + ' GHS POWER')
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
    const text = '⛏️ Join HashBee & get 50 GHS Power! Start mining GRAM & withdraw without restrictions! 💰'
    const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(inviteLink) + '&text=' + encodeURIComponent(text)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  // Pay directly with in-app balance
  const handlePayWithBalance = async () => {
    const target = promoTarget.trim()
    if (!target) {
      toast.error('Please enter your link or @channel')
      return
    }

    const completions = Math.max(50, Number(promoCompletions) || 50)
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
        reward_bp: 0.1,
        pay_with_balance: true,
      })
      toast.success('🎉 Campaign Activated Instantly! Your project is now live on the Tasks board.')
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

  // Open Tonkeeper for campaign payment
  const handlePayInTonkeeper = (camp: Campaign) => {
    const cost = camp.cost || 0.05
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

  // Create Campaign & Go To Payment (Immediately opens Tonkeeper)
  const handlePublishCampaign = async () => {
    const target = promoTarget.trim()
    if (!target) {
      toast.error('Please enter your link or @channel')
      return
    }

    const completions = Math.max(50, Number(promoCompletions) || 50)
    const cost = completions * 0.001
    setPublishing(true)

    // Guaranteed fallback memo so user is NEVER blocked if backend is restarting
    const fallbackMemo = 'CMP' + Math.random().toString(16).substring(2, 8).toUpperCase()
    let campaignObj: Campaign = {
      id: 'cmp-' + Date.now(),
      type: promoType,
      target: target,
      title: target.replace(/^https?:\/\//, '').replace(/^t\.me\//, ''),
      total_completions: completions,
      done_completions: 0,
      reward_bp: 0.1,
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
        reward_bp: 0.1,
        pay_with_balance: false,
      })
      if (newCamp && newCamp.payment_memo) {
        campaignObj = newCamp
      }
    } catch (err: any) {
      console.warn('Backend campaign creation note, proceeding with direct invoice:', err)
    } finally {
      setPublishing(false)
      setSelectedCampaign(campaignObj)
      setView('pay_campaign')
      loadCampaigns()
      toast.success('Invoice ready! Opening Tonkeeper...')
      // Immediately open Tonkeeper!
      handlePayInTonkeeper(campaignObj)
    }
  }

  // Verify payment for campaign
  const handleVerifyCampaignPayment = async (camp: Campaign) => {
    setVerifyingPayment(true)
    toast.loading('Checking blockchain for campaign payment...', { id: 'camp-verify' })
    try {
      await checkDeposit()
      toast.dismiss('camp-verify')
      const updated = await fetchMyCampaigns()
      setCampaigns(updated)
      const found = updated.find((c) => c.id === camp.id)
      if (found && found.status === 'active') {
        toast.success('🎉 Payment verified! Your campaign is now LIVE!')
        setView('campaigns')
      } else {
        toast.success('Blockchain scan complete! Campaigns activate within a minute of payment.')
      }
    } catch (err) {
      toast.dismiss('camp-verify')
      toast.error('Could not verify yet. Please wait a few seconds after sending.')
    } finally {
      setVerifyingPayment(false)
    }
  }

  const milestones = missions.filter((m) => m.type === 'milestone')
  const sponsored = missions.filter((m) => m.type !== 'milestone')

  const calculatedCost = ((Math.max(50, Number(promoCompletions) || 50)) * 0.001).toFixed(4)

  // =========================================================================
  // VIEW 4: PAY TO PUBLISH (SCREENSHOT 4)
  // =========================================================================
  if (view === 'pay_campaign' && selectedCampaign) {
    const campCost = (selectedCampaign.cost || 0.05).toFixed(2) + ' GRAM'
    const campMemo = selectedCampaign.payment_memo || 'CMP123'
    const qrData = 'ton://transfer/' + depositAddress + '?amount=' + Math.round((selectedCampaign.cost || 0.05) * 1e9) + '&text=' + encodeURIComponent(campMemo)
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=' + encodeURIComponent(qrData)

    return (
      <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-[#1e2d27] border border-[#2e423b] flex items-center justify-center mx-auto mb-2 text-stone-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A2.001 2.001 0 017 6h18" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
            PAY TO PUBLISH
          </h1>
        </div>

        {/* QR Code */}
        <div className="zentorno-card p-4 flex flex-col items-center justify-center mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-lg mb-2">
            <img src={qrUrl} alt="Payment QR Code" className="w-48 h-48 block rounded-lg" />
          </div>
        </div>

        {/* Card 1: AMOUNT TO PAY */}
        <div className="zentorno-card p-3.5 mb-2.5 flex items-center justify-between border border-[#2b3d37]">
          <div>
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider">AMOUNT TO PAY</div>
            <div className="text-sm font-black text-stone-100 mt-0.5">{campCost}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(campCost.replace(' GRAM', ''))
              setCopiedAmount(true)
              toast.success('Amount copied!')
              setTimeout(() => setCopiedAmount(false), 2000)
            }}
            className="p-2 rounded-xl bg-[#23332e] text-stone-300 hover:text-white"
          >
            {copiedAmount ? (
              <span className="text-xs font-black text-emerald-400">✓</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Card 2: PAYMENT ADDRESS */}
        <div className="zentorno-card p-3.5 mb-2.5 flex items-center justify-between border border-[#2b3d37] gap-2">
          <div className="truncate flex-1">
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider">PAYMENT ADDRESS</div>
            <div className="text-xs font-mono text-stone-200 mt-0.5 truncate">{depositAddress}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(depositAddress)
              setCopiedAddr(true)
              toast.success('Payment address copied!')
              setTimeout(() => setCopiedAddr(false), 2000)
            }}
            className="p-2 rounded-xl bg-[#23332e] text-stone-300 hover:text-white shrink-0"
          >
            {copiedAddr ? (
              <span className="text-xs font-black text-emerald-400">✓</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Card 3: MEMO / COMMENT - REQUIRED */}
        <div className="zentorno-card p-3.5 mb-3 flex items-center justify-between border border-amber-500/40 bg-[#1d221b]">
          <div>
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
              MEMO / COMMENT — REQUIRED
            </div>
            <div className="text-sm font-mono font-black text-amber-200 mt-0.5 tracking-wider">{campMemo}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(campMemo)
              setCopiedMemo(true)
              toast.success('Memo copied!')
              setTimeout(() => setCopiedMemo(false), 2000)
            }}
            className="p-2 rounded-xl bg-amber-400 text-stone-900 font-bold"
          >
            {copiedMemo ? (
              <span className="text-xs font-black">✓</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#242013] border-l-4 border-amber-400 p-3 rounded-xl mb-3 text-[11px] text-amber-200/90 leading-relaxed">
          ⚠ Send the memo with your payment. Without it we cannot tell whose it is, and it cannot be credited.
        </div>

        <p className="text-[11px] text-stone-400 text-center mb-4 leading-normal px-2">
          Send the exact amount with the memo. Your campaign goes live on its own, within a minute of the payment landing.
        </p>

        {/* Actions */}
        <button
          onClick={() => handlePayInTonkeeper(selectedCampaign)}
          className="w-full py-3.5 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2.5 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span>💎</span> PAY IN TONKEEPER (AUTO-FILL)
        </button>

        <button
          onClick={() => handleVerifyCampaignPayment(selectedCampaign)}
          disabled={verifyingPayment}
          className="w-full py-3.5 rounded-2xl zentorno-btn-primary font-black text-xs uppercase tracking-wider mb-2.5 active:scale-95 shadow-md flex items-center justify-center gap-2"
        >
          {verifyingPayment ? 'CHECKING BLOCKCHAIN...' : '✅ I HAVE PAID (VERIFY NOW)'}
        </button>

        <button
          onClick={() => setView('campaigns')}
          className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-black text-xs uppercase tracking-wider active:scale-95"
        >
          BACK
        </button>
      </div>
    )
  }

  // =========================================================================
  // VIEW 3: NEW CAMPAIGN (SCREENSHOT 3)
  // =========================================================================
  if (view === 'new_campaign') {
    return (
      <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-[#1e2d27] border border-[#2e423b] flex items-center justify-center mx-auto mb-2 text-stone-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A2.001 2.001 0 017 6h18" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider">
            NEW CAMPAIGN
          </h1>
        </div>

        <div className="zentorno-card p-5 border border-[#2b3d37] mb-5">
          {/* Radio Group: WHAT DO YOU WANT PROMOTED? */}
          <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mb-3">
            WHAT DO YOU WANT PROMOTED?
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              { id: 'link', label: 'A link' },
              { id: 'channel', label: 'A channel' },
              { id: 'group', label: 'A group' },
              { id: 'bot', label: 'A bot' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPromoType(item.id as any)}
                className={'p-3 rounded-2xl border flex items-center justify-between transition-all ' + (
                  promoType === item.id
                    ? 'bg-[#1e2e28] border-[#93b3a6] text-white shadow-sm'
                    : 'bg-[#15221e] border-[#293d36] text-stone-400 hover:border-[#38534a]'
                )}
              >
                <span className="text-xs font-bold">{item.label}</span>
                <span className={'w-4 h-4 rounded-full border flex items-center justify-center ' + (
                  promoType === item.id ? 'border-[#93b3a6]' : 'border-stone-500'
                )}>
                  {promoType === item.id && <span className="w-2 h-2 rounded-full bg-[#93b3a6]" />}
                </span>
              </button>
            ))}
          </div>

          {/* Your link */}
          <div className="mb-4">
            <label className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider block mb-1.5">
              Your link
            </label>
            <input
              type="text"
              placeholder="https://... / @canal"
              value={promoTarget}
              onChange={(e) => setPromoTarget(e.target.value)}
              className="w-full zentorno-input p-3.5 text-xs text-stone-200 placeholder:text-stone-600 rounded-2xl"
            />
          </div>

          {/* How many completions */}
          <div className="mb-3">
            <label className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider block mb-1.5">
              How many completions (Min 50)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {[50, 100, 250, 500, 1000].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPromoCompletions(num)}
                  className={'py-2 px-1 rounded-xl text-xs transition-all border ' + (
                    promoCompletions === num
                      ? 'bg-[#93b3a6] text-[#0f1614] border-[#93b3a6] font-black shadow-sm'
                      : 'bg-[#15221e] text-stone-300 border-[#2b3d37] hover:border-[#38534a]'
                  )}
                >
                  {num} Users
                  <div className="text-[9px] opacity-75">{(num * 0.001).toFixed(2)} GRAM</div>
                </button>
              ))}
              <div className="flex items-center justify-center bg-[#15221e] border border-[#2b3d37] rounded-xl px-2">
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={promoCompletions}
                  onChange={(e) => setPromoCompletions(Number(e.target.value))}
                  placeholder="Custom"
                  className="w-full bg-transparent text-xs text-center font-black text-stone-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live Invoice Summary */}
          <div className="border border-[#2e423b] bg-[#16231f] rounded-2xl p-4 mb-5 space-y-2">
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-center mb-1">
              ⚡ CAMPAIGN INVOICE BREAKDOWN
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-bold">Target Completions:</span>
              <span className="font-black text-stone-200">{promoCompletions} Users</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-bold">Reward per User:</span>
              <span className="font-bold text-[#93b3a6]">+0.1 GHS Power</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-[#23332d] pt-2">
              <span className="font-black text-stone-300 uppercase text-[11px]">Total Invoice Amount:</span>
              <span className="font-black text-base text-emerald-400 font-mono">{calculatedCost} GRAM</span>
            </div>
          </div>

          {/* Direct Payment Channel 1: In-App Balance */}
          {user && user.honey_balance >= Number(calculatedCost) ? (
            <button
              onClick={handlePayWithBalance}
              disabled={publishing}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-900 font-black text-xs uppercase tracking-wider mb-2.5 active:scale-95 shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <span>⚡</span> PAY WITH BALANCE ({user.honey_balance.toFixed(4)} GRAM)
            </button>
          ) : (
            <div className="mb-3 p-3 bg-[#182320] border border-[#2b3d37] rounded-xl text-xs flex justify-between items-center">
              <span className="text-stone-400">Balance: <strong className="text-stone-200">{user ? user.honey_balance.toFixed(4) : '0.0000'} GRAM</strong></span>
              <span className="text-amber-400 font-bold text-[11px]">Need {calculatedCost} GRAM</span>
            </div>
          )}

          {/* Direct Payment Channel 2: Tonkeeper Invoice */}
          <button
            onClick={handlePublishCampaign}
            disabled={publishing}
            className="w-full py-4 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2.5 active:scale-95 shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <span>💎</span> GET INVOICE & PAY VIA TONKEEPER
          </button>

          <button
            onClick={() => setView('campaigns')}
            className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-black text-xs uppercase tracking-wider active:scale-95"
          >
            BACK
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: MY CAMPAIGNS (SCREENSHOT 2)
  // =========================================================================
  if (view === 'campaigns') {
    return (
      <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
        <div className="text-center mb-4">
          <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A2.001 2.001 0 017 6h18" />
            </svg>
            MY CAMPAIGNS
          </h1>
        </div>

        {/* NEW CAMPAIGN Button */}
        <button
          onClick={() => setView('new_campaign')}
          className="w-full mb-4 py-3.5 rounded-2xl zentorno-btn-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          NEW CAMPAIGN
        </button>

        {/* Campaign List */}
        {loadingCampaigns ? (
          <div className="text-center py-10 text-stone-500 text-xs animate-pulse">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="zentorno-card p-6 text-center border border-[#2b3d37] mb-4">
            <div className="text-3xl mb-2">📢</div>
            <div className="text-xs font-black text-stone-200">No campaigns created yet</div>
            <p className="text-[11px] text-stone-400 mt-1">
              Promote your channel, bot, group, or link to thousands of active miners!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mb-4">
            {campaigns.map((camp) => {
              const isWaiting = camp.status === 'waiting_for_payment'
              const isFinished = camp.status === 'finished' || camp.done_completions >= camp.total_completions
              const percent = Math.min(100, Math.round(((camp.done_completions || 0) / (camp.total_completions || 50)) * 100))

              return (
                <div
                  key={camp.id}
                  className="zentorno-card p-3.5 flex items-center justify-between gap-3 border border-[#2b3d37]"
                >
                  <div className="flex items-center gap-3 truncate flex-1">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#23332e] flex items-center justify-center text-stone-300 flex-shrink-0">
                      {camp.type === 'bot' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : camp.type === 'link' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Details */}
                    <div className="truncate flex-1">
                      <div className="text-xs font-black text-stone-200 truncate">{camp.title || camp.target}</div>
                      <div className="text-[11px] font-bold text-stone-400 mt-0.5">
                        {isWaiting ? (
                          <span className="text-amber-300">Waiting for payment</span>
                        ) : isFinished ? (
                          <span className="text-stone-400">Finished</span>
                        ) : (
                          <span>{camp.done_completions}/{camp.total_completions} completions</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Action or Progress */}
                  <div className="shrink-0">
                    {isWaiting ? (
                      <button
                        onClick={() => {
                          setSelectedCampaign(camp)
                          setView('pay_campaign')
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#d1d5db] text-[#121c19] font-black text-xs uppercase tracking-wider hover:bg-white active:scale-95 shadow-sm"
                      >
                        Pay to publish
                      </button>
                    ) : (
                      <div className="w-20">
                        <div className="h-2 bg-[#202e2a] rounded-full overflow-hidden border border-[#2b3d37]">
                          <div
                            className={'h-full ' + (isFinished ? 'bg-stone-500' : 'bg-[#93b3a6]')}
                            style={{ width: percent + '%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setView('tasks')}
          className="w-full py-3.5 rounded-2xl zentorno-btn-secondary font-black text-xs uppercase tracking-wider active:scale-95"
        >
          ← BACK TO TASKS
        </button>
      </div>
    )
  }

  // =========================================================================
  // VIEW 1: TASKS (SCREENSHOT 1)
  // =========================================================================
  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen">
      {/* Centered Page Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-black text-stone-100 uppercase tracking-wider flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          TASKS
        </h1>
      </div>

      {/* Top Banner Button: PROMOTE YOUR LINK (MATCHES SCREENSHOT 1) */}
      <button
        onClick={() => setView('campaigns')}
        className="w-full mb-4 py-3.5 rounded-2xl zentorno-card border border-[#2c3e38] font-black text-xs text-stone-300 uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#202e2a] transition-all shadow-md active:scale-95"
      >
        <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A2.001 2.001 0 017 6h18" />
        </svg>
        PROMOTE YOUR LINK
      </button>

      {/* SECTION 1: REFERRAL MILESTONES (UP TO +500 GHS) */}
      {milestones.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> REFERRAL MILESTONES (UP TO +500 GHS)
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              VIRAL BOOST
            </span>
          </div>

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

                  <div className="w-full flex items-center gap-2.5 pt-1">
                    <div className="flex-1 h-2 bg-[#17231f] rounded-full overflow-hidden border border-[#273a33]">
                      <div
                        className="h-full bg-gradient-to-r from-[#93b3a6] to-emerald-400 transition-all duration-300"
                        style={{ width: percent + '%' }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 shrink-0">
                      {progress + '/' + count + ' (' + percent + '%)'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: PROMOTED & SPONSORED TASKS (MATCHES SCREENSHOT 1) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>📢</span> PROMOTED & PARTNER TASKS
          </span>
          <span className="text-[10px] font-bold text-stone-400">+0.1 GHS EACH</span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-stone-400 text-xs animate-pulse">Loading tasks...</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sponsored.map((mission) => (
              <div
                key={mission.id}
                className="zentorno-card p-3.5 flex items-center justify-between gap-3 border border-[#2c3e38]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#23332e] flex items-center justify-center text-stone-300 flex-shrink-0">
                    {mission.type === 'bot' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : mission.type === 'link' || mission.type === 'custom' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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
