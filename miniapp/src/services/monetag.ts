/**
 * Exclusive Ad Coordinator for HashBee
 * Provider: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 */

export const isAdExiumReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.adexiumWidget
}

let lastAdTimestamp = 0
const AD_COOLDOWN_MS = 60_000 // 1 minute

/**
 * Show Interstitial/Rewarded Ad using AdExium exclusively
 */
export const showInterstitialAd = async (force = false): Promise<boolean> => {
  const now = Date.now()
  if (!force && now - lastAdTimestamp < AD_COOLDOWN_MS) {
    const remainingSecs = Math.round((AD_COOLDOWN_MS - (now - lastAdTimestamp)) / 1000)
    console.log(`[Ads] Ad skipped due to cooldown (${remainingSecs}s left)`)
    return false
  }

  // AdExium Exclusive
  if (isAdExiumReady()) {
    try {
      lastAdTimestamp = now
      console.log('[Ads] Requesting AdExium interstitial ad...')
      window.adexiumWidget.requestAd('interstitial')
      return true
    } catch (e) {
      console.warn('[Ads] AdExium request error:', e)
      return false
    }
  }

  console.warn('[Ads] AdExium widget not yet initialized.')
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

  // Setup recurring ad trigger every 2 minutes
  if (periodicTimer) {
    clearInterval(periodicTimer)
  }

  periodicTimer = setInterval(() => {
    console.log('[Ads] Triggering scheduled AdExium ad...')
    showInterstitialAd().catch(() => {})
  }, 120000)
}
