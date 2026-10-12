/**
 * Multi-Provider Ad Coordinator for HashBee
 * Primary: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 * Backup: GigaPub (App ID: 8543)
 * Automatic Ad Schedule: Strictly every 2 minutes with safety mutex
 */

declare global {
  interface Window {
    showGiga?: () => Promise<any>
    adexiumWidget?: any
    AdexiumWidget?: any
    TGAdsWidget?: any
    initAdexium?: () => any
    requestAdexiumAd?: (format?: string) => boolean
    _adexiumReady?: boolean
  }
}

// Global Ad Mutex: Ensures NEVER two ads play or load at the same time
let isAdActive = false
let lastAdEndedTimestamp = 0
const MIN_AD_COOLDOWN_MS = 15_000 // 15s min between ambient ads

export const isAnyAdActive = (): boolean => isAdActive

// -------------------------------------------------------------------
// Pre-warm: Initialise AdExium widget as soon as the script is ready.
// Called from initMonetagAutoAds() AND lazily inside showAdexiumAd().
// -------------------------------------------------------------------
const ensureAdexiumWidget = (): any => {
  if (typeof window === 'undefined') return null

  // Already cached
  if (window.adexiumWidget) return window.adexiumWidget

  // Try the page-level initAdexium helper (defined in index.html)
  if (typeof window.initAdexium === 'function') {
    try {
      const w = window.initAdexium()
      if (w) return w
    } catch (e) {
      console.warn('[AdExium] initAdexium() error:', e)
    }
  }

  // Last-resort: construct directly if script class is available
  const WidgetClass = window.AdexiumWidget || window.TGAdsWidget
  if (WidgetClass) {
    try {
      const isInsideTg = !!(
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        window.Telegram?.WebApp?.initData
      )
      const adex = new WidgetClass({
        wid: '8e21d2a6-6c80-4b16-baf9-990e07ff2f00',
        adFormat: 'interstitial',
        debug: !isInsideTg,
      })
      window.adexiumWidget = adex
      console.log('[AdExium] ✅ Widget pre-warmed from ensureAdexiumWidget()')
      return adex
    } catch (e) {
      console.warn('[AdExium] Direct widget construction error:', e)
    }
  }

  return null
}

/**
 * Wait up to `maxMs` for the AdExium script to finish loading.
 * Polls every 200 ms — avoids the "no widget yet" race on slow connections.
 */
const waitForAdexiumScript = async (maxMs = 8000): Promise<boolean> => {
  if (ensureAdexiumWidget()) return true
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 200))
    if (ensureAdexiumWidget()) return true
  }
  return false
}

/**
 * 1. AdExium Rewarded Video Player with Strict Cleanup
 */
export const showAdexiumAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  // Wait up to 8s for AdExium script if widget isn't ready yet
  const ready = await waitForAdexiumScript(8000)
  if (!ready) {
    console.warn('[AdExium] Script not loaded / widget unavailable after waiting 8s')
    return false
  }

  return new Promise((resolve) => {
    let resolved = false
    let isDisplaying = false
    let adStartTime = 0

    const adex = ensureAdexiumWidget()

    const finish = (success: boolean) => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(success)
      }
    }

    // Timeout: 20s total (10s for network + 10s buffer for slow mobile)
    const timeoutTimer = setTimeout(() => {
      if (!isDisplaying) {
        console.log('[AdExium] Request timeout (no ad returned in 20s)')
        finish(false)
      }
    }, 20000)

    if (!adex || typeof adex.requestAd !== 'function') {
      clearTimeout(timeoutTimer)
      finish(false)
      return
    }

    const handleReceived = (ad: any) => {
      console.log('[AdExium] Ad received from network. Displaying...')
      if (isDisplaying) return
      isDisplaying = true
      adStartTime = Date.now()
      clearTimeout(timeoutTimer)
      try {
        if (typeof adex.displayAd === 'function') {
          adex.displayAd(ad)
        }
      } catch (err) {
        console.warn('[AdExium] displayAd error:', err)
        finish(false)
      }
    }

    const handleDisplayed = () => {
      console.log('[AdExium] Ad displayed')
      isDisplaying = true
      if (!adStartTime) adStartTime = Date.now()
      clearTimeout(timeoutTimer)
    }

    const handleCompleted = () => {
      const durationSec = adStartTime ? (Date.now() - adStartTime) / 1000 : 0
      console.log(`✅ [AdExium] Playback completed (${durationSec.toFixed(1)}s)`)
      finish(durationSec >= 9.5)
    }

    const handleClosed = () => {
      const durationSec = adStartTime ? (Date.now() - adStartTime) / 1000 : 0
      console.log(`[AdExium] Ad closed after ${durationSec.toFixed(1)}s`)
      finish(isDisplaying && durationSec >= 9.5)
    }

    const handleRedirected = () => {
      const durationSec = adStartTime ? (Date.now() - adStartTime) / 1000 : 0
      console.log(`[AdExium] User clicked/redirected after ${durationSec.toFixed(1)}s`)
      finish(isDisplaying && durationSec >= 9.5)
    }

    const handleNoAd = () => {
      console.log('[AdExium] No ad available (no-fill)')
      finish(false)
    }

    const handleError = (err: any) => {
      console.warn('[AdExium] Error during request:', err)
      finish(false)
    }

    const cleanup = () => {
      clearTimeout(timeoutTimer)
      if (adex && typeof adex.off === 'function') {
        try {
          adex.off('adReceived', handleReceived)
          adex.off('adDisplayed', handleDisplayed)
          adex.off('adPlaybackCompleted', handleCompleted)
          adex.off('adClosed', handleClosed)
          adex.off('adRedirected', handleRedirected)
          adex.off('noAdFound', handleNoAd)
          adex.off('requestAdError', handleError)
        } catch {}
      }
    }

    if (typeof adex.on === 'function') {
      adex.on('adReceived', handleReceived)
      adex.on('adDisplayed', handleDisplayed)
      adex.on('adPlaybackCompleted', handleCompleted)
      adex.on('adClosed', handleClosed)
      adex.on('adRedirected', handleRedirected)
      adex.on('noAdFound', handleNoAd)
      adex.on('requestAdError', handleError)
    }

    try {
      adex.requestAd('interstitial', true).then((ads: any) => {
        if (Array.isArray(ads) && ads.length > 0) {
          if (!isDisplaying) {
            isDisplaying = true
            adStartTime = Date.now()
            clearTimeout(timeoutTimer)
            try {
              if (typeof adex.displayAd === 'function') {
                adex.displayAd(ads)
              }
            } catch {
              finish(false)
            }
          }
        } else if (Array.isArray(ads) && ads.length === 0) {
          finish(false)
        }
      }).catch((e: any) => {
        console.warn('[AdExium] requestAd promise rejected:', e)
        finish(false)
      })
    } catch (e) {
      console.warn('[AdExium] requestAd exception:', e)
      finish(false)
    }
  })
}

let isGigaPubActive = false
let lastGigaPubEndTime = 0

/**
 * 2. GigaPub Player (App ID 8543) - Guaranteed Exactly 1 Ad Execution
 */
export const showGigaPubAd = async (): Promise<{ success: boolean; duration: number }> => {
  if (typeof window === 'undefined') return { success: false, duration: 0 }

  const now = Date.now()
  if (isGigaPubActive || now - lastGigaPubEndTime < 3000) {
    console.warn('[GigaPub] Ad cooldown or already active.')
    return { success: false, duration: 0 }
  }

  // Wait up to 5s for GigaPub script to load
  if (typeof window.showGiga !== 'function') {
    const startWait = Date.now()
    while (Date.now() - startWait < 5000) {
      if (typeof window.showGiga === 'function') break
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  if (typeof window.showGiga === 'function') {
    isGigaPubActive = true
    try {
      console.log('[GigaPub] Requesting ad (App ID: 8543)...')
      const gigaStartTime = Date.now()
      await window.showGiga()
      const duration = (Date.now() - gigaStartTime) / 1000
      console.log(`✅ [GigaPub] Completed in ${duration.toFixed(1)}s`)
      return { success: duration >= 9.5, duration }
    } catch (err) {
      console.warn('[GigaPub] Playback closed or error:', err)
      return { success: false, duration: 0 }
    } finally {
      isGigaPubActive = false
      lastGigaPubEndTime = Date.now()
    }
  }

  return { success: false, duration: 0 }
}

/**
 * Full Sequential Waterfall:
 * 1. Checks global mutex (prevents concurrent ads).
 * 2. Try AdExium first (1st provider).
 * 3. ONLY if AdExium fails/no-fill, try GigaPub as backup (exactly 1 time).
 */
export const showRewardedAdWithWaterfall = async (
  preferredProvider: 'adexium' | 'gigapub' | 'any' = 'adexium'
): Promise<{ success: boolean; provider: string; duration: number }> => {
  if (typeof window === 'undefined') return { success: false, provider: 'none', duration: 0 }

  if (isAdActive) {
    console.warn('[Ads] Another ad is currently active. Request ignored.')
    return { success: false, provider: 'busy', duration: 0 }
  }

  isAdActive = true

  try {
    // 1. Primary: AdExium
    if (preferredProvider !== 'gigapub') {
      console.log('[Ads] Step 1/2: Requesting AdExium primary provider...')
      const adStartTime = Date.now()
      const adexSuccess = await showAdexiumAd()
      const adDuration = (Date.now() - adStartTime) / 1000

      if (adexSuccess && adDuration >= 9.5) {
        lastAdEndedTimestamp = Date.now()
        console.log(`✅ [Ads] AdExium successfully verified (${adDuration.toFixed(1)}s)!`)
        return { success: true, provider: 'AdExium', duration: adDuration }
      }
      if (adexSuccess && adDuration < 9.5) {
        console.warn(`⚠️ [Ads] AdExium closed too quickly (${adDuration.toFixed(1)}s < 10s).`)
        return { success: false, provider: 'AdExium', duration: adDuration }
      }
      console.log('⚠️ [Ads] AdExium no-fill or unavailable. Cascading to GigaPub backup...')
    }

    // 2. Backup: GigaPub (App ID 8543)
    console.log('[Ads] Step 2/2: Requesting GigaPub backup provider (id: 8543)...')
    const gigaRes = await showGigaPubAd()

    if (gigaRes.success && gigaRes.duration >= 9.5) {
      lastAdEndedTimestamp = Date.now()
      console.log(`✅ [Ads] GigaPub successfully verified (${gigaRes.duration.toFixed(1)}s)!`)
      return { success: true, provider: 'GigaPub', duration: gigaRes.duration }
    }
    if (gigaRes.duration > 0 && gigaRes.duration < 9.5) {
      console.warn(`⚠️ [Ads] GigaPub closed too quickly (${gigaRes.duration.toFixed(1)}s < 10s).`)
      return { success: false, provider: 'GigaPub', duration: gigaRes.duration }
    }

    console.log('ℹ️ [Ads] No video ad available from any provider.')
    return { success: false, provider: 'none', duration: 0 }
  } finally {
    isAdActive = false
    lastAdEndedTimestamp = Date.now()
  }
}

/**
 * Opening Ad on Launch: ONLY AdExium (if unavailable, DO NOT fallback to GigaPub)
 */
export const showOpeningAdOnlyAdExium = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  if (isAdActive) return false

  console.log('[Ads] App Launch: Checking AdExium opening interstitial (AdExium only)...')
  isAdActive = true
  try {
    const success = await showAdexiumAd()
    if (success) {
      lastAdEndedTimestamp = Date.now()
      console.log('✅ [Ads] AdExium opening ad displayed successfully!')
      return true
    }
    console.log('[Ads] AdExium opening ad not available. Suppressing fallback on launch.')
    return false
  } finally {
    isAdActive = false
    lastAdEndedTimestamp = Date.now()
  }
}

/**
 * Helper: check if current page is one where we should not auto-show an ad.
 * Works with both hash-router and path-router, and inside Telegram's iframe.
 */
const isAdSuppressedPage = (): boolean => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname + window.location.hash
  // suppress on watch/tasks/missions/withdraw pages
  return (
    path.includes('/watch') ||
    path.includes('/tasks') ||
    path.includes('/missions') ||
    path.includes('/withdraw')
  )
}

/**
 * Periodic 2-Minute Automatic Ad: 1st AdExium -> Backup GigaPub
 */
export const showPeriodic2MinAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  if (isAdActive) return false

  const now = Date.now()
  if (now - lastAdEndedTimestamp < MIN_AD_COOLDOWN_MS) return false

  // Suppress if tab is hidden
  if (typeof document !== 'undefined' && document.hidden) return false

  // Suppress on ad/missions pages
  if (isAdSuppressedPage()) return false

  console.log('[Ads] 2-Minute Periodic Trigger: Requesting AdExium (1st) with GigaPub fallback...')
  const res = await showRewardedAdWithWaterfall('adexium')
  return res.success
}

let hasInitializedAutoAds = false
let periodicAutoAdTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic background ads:
 * 1. Pre-warm AdExium widget immediately (so first ad request is instant).
 * 2. Launch ad after 15s (AdExium ONLY - no fallback if unavailable).
 *    Delayed to 15s (was 8s) to ensure: Telegram auth done, widget loaded, user settled.
 * 3. Strictly every 2 minutes (120,000ms): 1st AdExium, backup GigaPub.
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined' || hasInitializedAutoAds) return
  hasInitializedAutoAds = true

  // Step 0: Pre-warm the AdExium widget as soon as possible.
  // This starts the SDK connection to the ad network early so the first real
  // ad request completes much faster (avoids cold-start RTT on first show).
  const tryPrewarm = () => {
    const w = ensureAdexiumWidget()
    if (w) {
      console.log('[Ads] ✅ AdExium widget pre-warmed on init')
    } else {
      // Script not yet parsed — retry once after 3s
      setTimeout(() => {
        ensureAdexiumWidget()
      }, 3000)
    }
  }
  tryPrewarm()

  // Step 1: Launch Ad after 15 seconds (AdExium ONLY, no GigaPub fallback)
  // 15s gives enough time for: Telegram auth, widget script load, user to settle in.
  setTimeout(() => {
    if (!isAdActive && !isAdSuppressedPage()) {
      showOpeningAdOnlyAdExium().catch(() => {})
    }
  }, 15000)

  // Step 2: Periodic 2-Minute (120,000ms) Ad Waterfall (AdExium -> GigaPub)
  if (periodicAutoAdTimer) clearInterval(periodicAutoAdTimer)
  periodicAutoAdTimer = setInterval(() => {
    showPeriodic2MinAd().catch(() => {})
  }, 120000)
}
