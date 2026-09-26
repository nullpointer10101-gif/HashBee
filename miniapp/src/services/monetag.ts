/**
 * Monetag SDK Helper for HashBee (Zone 11894371)
 */

export const isMonetagReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.show_11894371 === 'function'
}

/**
 * Show Rewarded / Interstitial Ad
 */
export const showInterstitialAd = async (): Promise<boolean> => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready or adblocker detected')
    return false
  }

  try {
    await window.show_11894371!()
    console.log('[Monetag] Interstitial ad displayed successfully')
    return true
  } catch (err) {
    console.error('[Monetag] Interstitial ad error/dismissed:', err)
    return false
  }
}

export const showRewardedInterstitial = showInterstitialAd


/**
 * Show Rewarded Popup Ad ('pop')
 */
export const showRewardedPopup = async (): Promise<boolean> => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready or adblocker detected')
    return false
  }

  try {
    await window.show_11894371!('pop')
    return true
  } catch (err) {
    console.error('[Monetag] Rewarded Popup error:', err)
    return false
  }
}

let periodicTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic Monetag Ads:
 * 1. Shows an ad upon opening the app (after SDK loads).
 * 2. Automatically triggers an ad every 2 minutes (120 seconds).
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined') return

  // Helper to wait for SDK and trigger initial opening ad
  const triggerOpeningAd = (attemptsLeft = 10) => {
    if (isMonetagReady()) {
      console.log('[Monetag] Showing opening ad on app launch...')
      window.show_11894371!({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 120,
          timeout: 2,
          everyPage: false,
        },
      })
      // Also try instant interstitial call after 1.5s
      setTimeout(() => {
        showInterstitialAd().catch(() => {})
      }, 1500)
    } else if (attemptsLeft > 0) {
      setTimeout(() => triggerOpeningAd(attemptsLeft - 1), 800)
    }
  }

  // Start opening ad check
  triggerOpeningAd()

  // Setup periodic ad trigger every 2 minutes (120,000 ms)
  if (periodicTimer) {
    clearInterval(periodicTimer)
  }

  periodicTimer = setInterval(() => {
    console.log('[Monetag] Triggering scheduled 2-minute recurring ad...')
    showInterstitialAd().catch((err) => {
      console.warn('[Monetag] Periodic ad skip/error:', err)
    })
  }, 120000) // 2 minutes
}
