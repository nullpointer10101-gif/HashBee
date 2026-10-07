/**
 * Exclusive Ad Coordinator for HashBee
 * Provider: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 */

export const isAdExiumReady = (): boolean => {
  if (typeof window === 'undefined') return false
  if ((window as any).adexiumWidget) return true
  if (typeof (window as any).initAdexium === 'function') {
    return !!(window as any).initAdexium()
  }
  return false
}

let lastAdTimestamp = 0
const AD_COOLDOWN_MS = 45_000 // 45 seconds

/**
 * Show Interstitial/Rewarded Ad using AdExium exclusively
 */
export const showInterstitialAd = async (force = false): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  const now = Date.now()
  if (!force && now - lastAdTimestamp < AD_COOLDOWN_MS) {
    const remainingSecs = Math.round((AD_COOLDOWN_MS - (now - lastAdTimestamp)) / 1000)
    console.log(`[Ads] Ad skipped due to cooldown (${remainingSecs}s left)`)
    return false
  }

  // Ensure AdExium is initialized
  if (typeof (window as any).initAdexium === 'function') {
    (window as any).initAdexium()
  }

  if (typeof (window as any).requestAdexiumAd === 'function') {
    try {
      lastAdTimestamp = now
      console.log('[Ads] Requesting AdExium interstitial ad...')
      const requested = (window as any).requestAdexiumAd('interstitial')
      return requested
    } catch (e) {
      console.warn('[Ads] AdExium request error:', e)
      return false
    }
  }

  if (isAdExiumReady() && (window as any).adexiumWidget?.requestAd) {
    try {
      lastAdTimestamp = now
      ;(window as any).adexiumWidget.requestAd('interstitial')
      return true
    } catch (e) {
      console.warn('[Ads] AdExium direct request error:', e)
    }
  }

  return false
}

export const showRewardedInterstitial = showInterstitialAd

export const showRewardedPopup = async (): Promise<boolean> => {
  return showInterstitialAd(true)
}

let hasInitialized = false
let periodicTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic AdExium ads:
 * - Recurring ad every 2 minutes with cooldown protection
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined' || hasInitialized) return
  hasInitialized = true

  // Initial trigger after short delay
  setTimeout(() => {
    showInterstitialAd(true).catch(() => {})
  }, 1000)

  // Setup recurring ad trigger every 2 minutes
  if (periodicTimer) {
    clearInterval(periodicTimer)
  }

  periodicTimer = setInterval(() => {
    console.log('[Ads] Triggering scheduled AdExium ad...')
    showInterstitialAd().catch(() => {})
  }, 120000)
}

