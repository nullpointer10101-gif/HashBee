import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { rewardAdWatch } from '../services/api'
import {
  showRewardedAdWithWaterfall,
  getAdCooldownRemaining,
  setAdCooldown,
  clearAdCooldown,
} from '../services/monetag'

export interface DailyAdStationProps {
  totalDailyAds?: number // Default: 20 ads per day
  powerPerAd?: number // Default: 25 Power (+0.50 GHS)
  ghsPerAd?: number // Default: 0.50 GHS
  onRewardClaimed?: (powerAdded: number) => void
  className?: string
}

const LS_KEY_DAILY_STATION = 'hb_daily_ad_station_v2'
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

interface StationStorageState {
  windowStart: number
  completedCount: number
}

function loadStationState(totalAds: number): StationStorageState {
  try {
    const raw = localStorage.getItem(LS_KEY_DAILY_STATION)
    if (raw) {
      const parsed: StationStorageState = JSON.parse(raw)
      const now = Date.now()
      if (now - parsed.windowStart >= TWENTY_FOUR_HOURS_MS) {
        const fresh: StationStorageState = { windowStart: now, completedCount: 0 }
        localStorage.setItem(LS_KEY_DAILY_STATION, JSON.stringify(fresh))
        return fresh
      }
      return {
        windowStart: parsed.windowStart || now,
        completedCount: Math.min(totalAds, Math.max(0, Number(parsed.completedCount) || 0)),
      }
    }
  } catch {}
  const fresh: StationStorageState = { windowStart: Date.now(), completedCount: 0 }
  try {
    localStorage.setItem(LS_KEY_DAILY_STATION, JSON.stringify(fresh))
  } catch {}
  return fresh
}

function saveStationState(state: StationStorageState) {
  try {
    localStorage.setItem(LS_KEY_DAILY_STATION, JSON.stringify(state))
  } catch {}
}

export const DailyAdStation: React.FC<DailyAdStationProps> = ({
  totalDailyAds = 30,
  powerPerAd = 25,
  ghsPerAd = 0.5,
  onRewardClaimed,
  className = '',
}) => {
  const { refreshUser } = useAuth()

  const [stationState, setStationState] = useState<StationStorageState>(() => loadStationState(totalDailyAds))
  const [adCooldownRemaining, setAdCooldownRemaining] = useState<number>(() => getAdCooldownRemaining())
  const [isLoadingAd, setIsLoadingAd] = useState(false)
  const [resetCountdown, setResetCountdown] = useState<string>('24h 00m 00s')
  const isActionLockedRef = useRef(false)

  // Maximum Daily Power Calculations
  const dailyMaxPower = totalDailyAds * powerPerAd
  const dailyMaxGhs = (totalDailyAds * ghsPerAd).toFixed(1)
  const earnedPower = stationState.completedCount * powerPerAd
  const earnedGhs = (stationState.completedCount * ghsPerAd).toFixed(2)
  const remainingAds = Math.max(0, totalDailyAds - stationState.completedCount)
  const progressPercent = Math.min(100, Math.max(0, (stationState.completedCount / totalDailyAds) * 100))

  // 1. Ticker for 30s Cooldown
  useEffect(() => {
    const checkCooldown = () => {
      const rem = getAdCooldownRemaining()
      setAdCooldownRemaining(rem)
    }
    checkCooldown()
    const interval = setInterval(checkCooldown, 500)
    return () => clearInterval(interval)
  }, [])

  // 2. Ticker for 24h Reset Timer
  useEffect(() => {
    const updateResetCountdown = () => {
      const now = Date.now()
      const elapsed = now - stationState.windowStart
      if (elapsed >= TWENTY_FOUR_HOURS_MS) {
        // Reset 24-hour cycle
        const fresh: StationStorageState = { windowStart: now, completedCount: 0 }
        setStationState(fresh)
        saveStationState(fresh)
        setResetCountdown('24h 00m 00s')
      } else {
        const remainingSec = Math.max(0, Math.floor((TWENTY_FOUR_HOURS_MS - elapsed) / 1000))
        const hours = Math.floor(remainingSec / 3600)
        const mins = Math.floor((remainingSec % 3600) / 60)
        const secs = remainingSec % 60
        setResetCountdown(
          `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
        )
      }
    }

    updateResetCountdown()
    const timer = setInterval(updateResetCountdown, 1000)
    return () => clearInterval(timer)
  }, [stationState.windowStart])

  // 3. Complete and credit the ad reward
  const handleRewardSuccess = async (durationSec: number, provider: string) => {
    if (durationSec < 9.5) {
      clearAdCooldown()
      setAdCooldownRemaining(0)
      toast.error(`⚠️ Video playback was too short (${durationSec.toFixed(0)}s). Minimum 10 seconds required to earn Power!`)
      return
    }

    // Determine backend optionIndex (tier 0 for first 10, tier 1 for 10-19)
    const optionIndex = Math.min(2, Math.floor(stationState.completedCount / 10))

    try {
      const res = await rewardAdWatch(provider || 'AdExium', optionIndex, durationSec)
      const powerGained = res.power_gained || ghsPerAd

      setStationState((prev) => {
        const nextCount = Math.min(totalDailyAds, prev.completedCount + 1)
        const updated = { ...prev, completedCount: nextCount }
        saveStationState(updated)
        return updated
      })

      // Set 7s cooldown ONLY after confirmed completion
      setAdCooldown(7)
      setAdCooldownRemaining(7)

      // Telegram Haptic feedback
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }

      toast.success(
        `🎉 +${powerPerAd} Power (+${powerGained.toFixed(2)} GHS) credited! (${stationState.completedCount + 1}/${totalDailyAds})`,
        { duration: 4000 }
      )

      if (onRewardClaimed) {
        onRewardClaimed(powerGained)
      }

      await refreshUser()
    } catch (err: any) {
      clearAdCooldown()
      setAdCooldownRemaining(0)
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to credit power'
      toast.error(`⚠️ ${errMsg}`)
    }
  }

  // 4. Primary Watch Ad Click Handler
  const handleWatchAd = useCallback(async () => {
    if (isActionLockedRef.current || isLoadingAd) return

    // Haptic tap
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }

    const cooldown = getAdCooldownRemaining()
    if (cooldown > 0) {
      setAdCooldownRemaining(cooldown)
      toast.error(`⏳ Ad network breakdown: Please wait ${cooldown}s before watching the next ad!`)
      return
    }

    if (stationState.completedCount >= totalDailyAds) {
      toast.success(`🏆 All ${totalDailyAds}/${totalDailyAds} ads completed for today! Check back in ${resetCountdown}.`)
      return
    }

    isActionLockedRef.current = true
    setIsLoadingAd(true)
    toast.loading('🎬 Launching sponsor video... Please watch for 10s to earn reward!', { id: 'ad-load-station' })

    let adResult = { success: false, provider: 'none', duration: 0 }
    try {
      adResult = await showRewardedAdWithWaterfall('adexium')
    } catch (err) {
      console.warn('Ad playback error:', err)
    } finally {
      toast.dismiss('ad-load-station')
      setIsLoadingAd(false)
      isActionLockedRef.current = false
    }

    if (adResult.success && adResult.duration >= 9.5) {
      await handleRewardSuccess(Math.round(adResult.duration), adResult.provider)
    } else if (adResult.provider === 'cooldown') {
      const rem = getAdCooldownRemaining()
      if (rem > 0) {
        setAdCooldownRemaining(rem)
        toast.error(`⏳ Network cooldown active. Please wait ${rem}s!`)
      } else {
        clearAdCooldown()
        setAdCooldownRemaining(0)
      }
    } else if (adResult.provider === 'busy') {
      toast.error('⚠️ Ad system is busy. Please wait a moment!')
    } else if (adResult.duration > 0 && adResult.duration < 9.5) {
      clearAdCooldown()
      setAdCooldownRemaining(0)
      toast.error(`⚠️ Video ended early (${adResult.duration.toFixed(0)}s). Minimum 10 seconds required to earn power!`)
    } else {
      clearAdCooldown()
      setAdCooldownRemaining(0)
      toast.error('⚠️ Video sponsor is currently refilling inventory. Please retry in a few moments!')
    }
  }, [stationState.completedCount, totalDailyAds, isLoadingAd, resetCountdown, refreshUser])

  const isCompletedAll = stationState.completedCount >= totalDailyAds
  const isCooldownActive = adCooldownRemaining > 0 && !isCompletedAll

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1220] via-[#10192e] to-[#090e18] text-white border border-slate-700/60 shadow-2xl p-4 sm:p-5 transition-all duration-300 ${className}`}
      style={{
        boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.5), 0 0 25px -2px rgba(245, 158, 11, 0.08)',
      }}
    >
      {/* Ambient background glow accents */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP HEADER SECTION ── */}
      <div className="flex items-center gap-3.5 relative z-10 mb-4">
        {/* Holographic Glowing Screen Icon */}
        <div className="relative shrink-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-[2px] shadow-lg shadow-amber-500/30">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-[#1e1708] to-[#0a0701] flex items-center justify-center relative overflow-hidden">
              {/* Futuristic TV / Screen SVG with broadcast antenna */}
              <svg
                className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* TV Antenna */}
                <path d="M7 3l4.5 4.5" />
                <path d="M17 3l-4.5 4.5" />
                {/* Screen frame */}
                <rect x="2" y="7.5" width="20" height="13" rx="3" />
                {/* Screen stand */}
                <path d="M8 22h8" />
                {/* Inner screen glare */}
                <path d="M6 11l4 4" strokeWidth="1.5" strokeOpacity="0.4" />
              </svg>
              {/* Subtle pulsing beacon */}
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping opacity-75" />
            </div>
          </div>
        </div>

        {/* Title & Subtitle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
              Daily Ad Station
            </h2>
            {/* Pill Badge */}
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs">
              {totalDailyAds} / Day
            </span>
          </div>

          <div className="text-[11.5px] text-slate-300 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-amber-400 font-black flex items-center gap-0.5">
              <span>⚡</span>
              <span>+{powerPerAd} Power</span>
            </span>
            <span className="text-slate-400">per ad</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">
              {dailyMaxPower} Power ({dailyMaxGhs} GHS) daily max
            </span>
          </div>
        </div>
      </div>

      {/* ── INNER PROGRESS PANEL ── */}
      <div className="relative z-10 rounded-2xl bg-[#070b14]/90 border border-slate-800/80 p-3.5 sm:p-4 mb-3.5 backdrop-blur-md shadow-inner">
        {/* Progress Header Row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            {/* Medal / Ribbon SVG */}
            <svg
              className="w-4 h-4 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <span>Today's Progress</span>
          </div>

          <div className="text-xs font-mono font-extrabold text-white">
            <span className="text-sm font-black text-amber-300">{stationState.completedCount}</span>
            <span className="text-slate-400 font-semibold"> / {totalDailyAds} Ads</span>
          </div>
        </div>

        {/* Progress Bar Track & Bar */}
        <div className="w-full h-2.5 bg-[#0b1329] rounded-full overflow-hidden p-[2px] border border-slate-800 mb-3 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full animate-sweep-shimmer" />
          </div>
        </div>

        {/* 2-Column Summary Metrics */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Box 1: Earned Today */}
          <div className="rounded-xl bg-[#0c1326] border border-slate-800/80 p-2.5 sm:p-3 text-center transition-all hover:border-emerald-500/30">
            <span className="block text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              EARNED TODAY
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-[#00f090] drop-shadow-[0_0_8px_rgba(0,240,144,0.3)]">
              +{earnedPower} Power
            </div>
            <span className="text-[9px] font-mono text-emerald-300/70 font-semibold block mt-0.5">
              +{earnedGhs} GHS Hashrate
            </span>
          </div>

          {/* Box 2: Daily Max */}
          <div className="rounded-xl bg-[#0c1326] border border-slate-800/80 p-2.5 sm:p-3 text-center transition-all hover:border-amber-500/30">
            <span className="block text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              DAILY MAX
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
              +{dailyMaxPower} Power
            </div>
            <span className="text-[9px] font-mono text-amber-300/70 font-semibold block mt-0.5">
              +{dailyMaxGhs} GHS Hashrate
            </span>
          </div>
        </div>

        {/* Reset Countdown Timer Row */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <svg
              className="w-3.5 h-3.5 text-cyan-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Resets in:</span>
          </div>

          <div className="font-mono font-bold text-cyan-300 tracking-wider">
            {resetCountdown}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ACTION BUTTON ── */}
      <div className="relative z-10">
        {isCompletedAll ? (
          <div className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-teal-600/30 border border-emerald-400/50 text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 backdrop-blur-md shadow-lg shadow-emerald-950/40">
            <span className="text-base">✓</span>
            <span>ALL {totalDailyAds}/{totalDailyAds} ADS COMPLETED (+{dailyMaxPower} POWER CLAIMED)</span>
          </div>
        ) : isCooldownActive ? (
          <button
            disabled
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-800/90 via-slate-700/80 to-slate-800/90 text-amber-200 font-black text-xs uppercase tracking-wider border border-amber-500/30 cursor-not-allowed flex items-center justify-between shadow-lg relative overflow-hidden backdrop-blur-sm"
          >
            {/* Dynamic visual progress fill for cooldown */}
            <div
              className="absolute inset-y-0 left-0 bg-amber-500/15 transition-all duration-300 pointer-events-none"
              style={{ width: `${Math.min(100, Math.max(0, ((30 - adCooldownRemaining) / 30) * 100))}%` }}
            />
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-sm animate-pulse">⏳</span>
              <span>30S COOLDOWN • READY IN {adCooldownRemaining}S</span>
            </div>
            <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded-lg border border-amber-300/30 text-amber-300 font-black relative z-10">
              {adCooldownRemaining}s
            </span>
          </button>
        ) : (
          <button
            onClick={handleWatchAd}
            disabled={isLoadingAd}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#ea580c] hover:from-[#fcd34d] hover:to-[#f97316] text-[#0a0701] font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-between group border border-white/40 relative overflow-hidden"
          >
            {/* Shimmer sweep highlight */}
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            {/* Left Button Content */}
            <div className="flex items-center gap-2 relative z-10">
              {isLoadingAd ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Launching Sponsor Video...</span>
                </>
              ) : (
                <>
                  <span className="text-sm transition-transform group-hover:scale-125">▶</span>
                  <span>Watch Ad (+{powerPerAd} Power)</span>
                </>
              )}
            </div>

            {/* Right Pill Badge inside button */}
            {!isLoadingAd && (
              <span className="relative z-10 px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold bg-black/25 text-[#0a0701] border border-black/15 shadow-inner">
                {remainingAds} Left Today
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
