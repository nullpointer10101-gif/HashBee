/**
 * Unified Ad Coordinator for HashBee
 * Primary: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 * Fallback: Monetag (Zone 11894371) — ONLY if AdExium fails
 */

export const isAdExiumReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.adexiumWidget
}

export const isMonetagReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.show_11894371 === 'function'
}

let lastAdTimestamp = 0
const AD_COOLDOWN_MS = 60_000 // 1 minute

/**
 * Show Interstitial/Rewarded Ad:
 * 1. Tries AdExium first
 * 2. If AdExium fails / not ready, falls back to Monetag
 */
export const showInterstitialAd = async (force = false): Promise<boolean> => {
  const now = Date.now()
  if (!force && now - lastAdTimestamp < AD_COOLDOWN_MS) {
    const remainingSecs = Math.round((AD_COOLDOWN_MS - (now - lastAdTimestamp)) / 1000)
    console.log(`[Ads] Ad skipped due to cooldown (${remainingSecs}s left)`)
    return false
  }

  // 1. Try AdExium (Primary)
  if (isAdExiumReady()) {
    try {
      lastAdTimestamp = now
      console.log('[Ads] Requesting primary AdExium ad...')
      window.adexiumWidget.requestAd('interstitial')
      return true
    } catch (e) {
      console.warn('[Ads] AdExium request error, attempting Monetag fallback:', e)
    }
  }

  // 2. Try Monetag (Fallback)
  if (isMonetagReady()) {
    try {
      lastAdTimestamp = now
      console.log('[Ads] Showing fallback Monetag ad...')
      await window.show_11894371!()
      return true
    } catch (err) {
      console.error('[Ads] Monetag fallback error:', err)
      return false
    }
  }

  console.warn('[Ads] Neither AdExium nor Monetag is ready.')
  return false
}

export const showRewardedInterstitial = showInterstitialAd

export const showRewardedPopup = async (): Promise<boolean> => {
  return showInterstitialAd(true)
}

let hasInitialized = false
let periodicTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic ads (AdExium primary, Monetag fallback):
 * - Recurring ad every 2 minutes with cooldown protection
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined' || hasInitialized) return
  hasInitialized = true

  // Setup recurring ad trigger every 2 minutes
  if (periodicTimer) {
    clearInterval(periodicTimer)
  }

  periodicTimer = setInterval(() => {
    console.log('[Ads] Triggering scheduled recurring ad (AdExium primary)...')
    showInterstitialAd().catch(() => {})
  }, 120000)
}
