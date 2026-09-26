/**
 * Monetag SDK Helper for HashBee (Zone 11894371)
 * Enforces strictly:
 * 1. Exactly ONE opening ad on app launch (after 2.5s).
 * 2. Automatic recurring ad every 2 minutes (120 seconds).
 * 3. 2-minute cooldown protection to prevent any double ads.
 */

export const isMonetagReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.show_11894371 === 'function'
}

let lastAdTimestamp = 0
const AD_COOLDOWN_MS = 120_000 // 2 minutes (120 seconds)

/**
 * Show Rewarded / Interstitial Ad with cooldown check
 */
export const showInterstitialAd = async (force = false): Promise<boolean> => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready or adblocker detected')
    return false
  }

  const now = Date.now()
  if (!force && (now - lastAdTimestamp < AD_COOLDOWN_MS)) {
    const remainingSecs = Math.round((AD_COOLDOWN_MS - (now - lastAdTimestamp)) / 1000)
    console.log(`[Monetag] Ad skipped to protect UX (cooldown: ${remainingSecs}s left)`)
    return false
  }

  try {
    lastAdTimestamp = now
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

let hasInitialized = false
let periodicTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic Monetag Ads:
 * - Shows ONE ad upon opening the app (after 2.5s).
 * - Automatically triggers an ad every 2 minutes (120 seconds).
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined' || hasInitialized) return
  hasInitialized = true

  // Helper to wait for SDK and trigger ONE initial opening ad
  const triggerOpeningAd = (attemptsLeft = 15) => {
    if (isMonetagReady()) {
      console.log('[Monetag] SDK detected. Scheduling single opening ad in 2.5s...')
      setTimeout(() => {
        showInterstitialAd(true).catch(() => {})
      }, 2500)
    } else if (attemptsLeft > 0) {
      setTimeout(() => triggerOpeningAd(attemptsLeft - 1), 500)
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
  }, 120000) // Exactly 2 minutes
}
