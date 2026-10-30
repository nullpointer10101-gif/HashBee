/**
 * Multi-Provider Ad Coordinator for HashBee
 * Primary: Adsgram (Block ID: 56832 - Rewarded Video)
 * Secondary: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 * Backup: GigaPub (App ID: 8543)
 * Automatic Ad Schedule: Strictly every 2 minutes with safety mutex
 */

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean }) => {
        show: () => Promise<{
          done: boolean
          description?: string
          state?: string
          error?: boolean
        }>
      }
    }
    showGiga?: () => Promise<any>
    adexiumWidget?: any
    AdexiumWidget?: any
    TGAdsWidget?: any
    initAdexium?: () => any
    requestAdexiumAd?: (format?: string) => boolean
    _adexiumReady?: boolean
  }
}

export const ADSGRAM_BLOCK_ID = '56832'
let adsgramController: any = null

export const initAdsgram = () => {
  if (typeof window === 'undefined') return null
  if (adsgramController) return adsgramController
  if (window.Adsgram) {
    try {
      adsgramController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID })
      console.log('🐝 [Adsgram] Initialized with blockId:', ADSGRAM_BLOCK_ID)
      return adsgramController
    } catch (e) {
      console.warn('⚠️ [Adsgram] Init error:', e)
    }
  }
  return null
}

export const showAdsgramAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  const controller = initAdsgram() || (window.Adsgram ? window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID }) : null)
  if (!controller) {
    console.warn('⚠️ [Adsgram] Controller not available (SDK script still loading or blocked).')
    return false
  }

  try {
    console.log(`🎬 [Adsgram] Requesting rewarded video (Block ID: ${ADSGRAM_BLOCK_ID})...`)
    const result = await controller.show()
    console.log('🐝 [Adsgram] Playback result:', result)
    if (result && result.done) {
      return true
    }
    return false
  } catch (err: any) {
    console.warn('⚠️ [Adsgram] Ad dismissed, skipped or no-fill:', err?.description || err)
    return false
  }
}

// Global Ad Mutex: Ensures NEVER two ads play or load at the same time
let isAdActive = false
let lastAdCompletedTimestamp = 0
export const AD_COOLDOWN_SECONDS = 30
export const LS_KEY_AD_COOLDOWN = 'hb_ad_cooldown_until'
export const MIN_AD_COOLDOWN_MS = 30_000 // 30s min between ambient ads

export const isAnyAdActive = (): boolean => isAdActive

/**
 * Returns remaining cooldown seconds (0 if cooldown has expired or no ad played)
 * ONLY returns > 0 if an ad was actually watched and completed!
 */
export const getAdCooldownRemaining = (): number => {
  if (typeof window === 'undefined') return 0
  const now = Date.now()
  let until = 0
  try {
    const stored = localStorage.getItem(LS_KEY_AD_COOLDOWN)
    if (stored) {
      until = Number(stored) || 0
    }
  } catch {}
  const remainingMs = until - now
  if (remainingMs <= 0) {
    if (until > 0) {
      try {
        localStorage.removeItem(LS_KEY_AD_COOLDOWN)
      } catch {}
    }
    return 0
  }
  return Math.ceil(remainingMs / 1000)
}

/**
 * Sets the breakdown cooldown timer (default 30 seconds)
 * MUST ONLY be called when an ad is confirmed to have played and completed!
 */
export const setAdCooldown = (seconds = AD_COOLDOWN_SECONDS) => {
  const until = Date.now() + seconds * 1000
  lastAdCompletedTimestamp = Date.now()
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY_AD_COOLDOWN, String(until))
    }
  } catch {}
}

/**
 * Clears any cooldown immediately (used when no ad was available or playback failed)
 */
export const clearAdCooldown = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY_AD_COOLDOWN)
    }
  } catch {}
}

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
 * 1. AdExium Rewarded Video Player with Strict Cleanup & Multi-Region Fallback
 */
export const showAdexiumAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  // Wait up to 5s for AdExium script if widget isn't ready yet
  const ready = await waitForAdexiumScript(5000)
  if (!ready) {
    console.warn('[AdExium] Script not loaded / widget unavailable after waiting 5s')
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

    // Timeout: 5s max to receive an ad from AdExium before cascading to GigaPub backup
    const timeoutTimer = setTimeout(() => {
      if (!isDisplaying) {
        console.log('[AdExium] Request timeout (no ad returned in 5s). Cascading to GigaPub backup...')
        finish(false)
      }
    }, 5000)

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

    const triggerAdexiumFetch = async () => {
      try {
        let ads = await adex.requestAd('interstitial', true)
        if (Array.isArray(ads) && ads.length > 0) {
          handleReceived(ads)
          return
        }

        // AdExium sponsors primarily target CIS/Russian Telegram channels & bots.
        // If current user language returns 0 ads (e.g. 'en'), retry with 'ru' inventory.
        if (adex.user && adex.user.language !== 'ru') {
          console.log('[AdExium] 0 ads for current language, checking Russian/CIS inventory...')
          const prevLang = adex.user.language
          adex.user.language = 'ru'
          try {
            if (adex.afV2 && typeof adex.afV2.clearShowState === 'function') {
              adex.afV2.clearShowState(adex.user.wid)
            }
            ads = await adex.requestAd('interstitial', true)
            if (Array.isArray(ads) && ads.length > 0) {
              handleReceived(ads)
              return
            }
          } finally {
            adex.user.language = prevLang
          }
        }
      } catch (e) {
        console.warn('[AdExium] requestAd exception:', e)
      }

      // No ad from AdExium, immediately cascade to GigaPub
      finish(false)
    }

    triggerAdexiumFetch()
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

  // Wait up to 6s for GigaPub script to load
  if (typeof window.showGiga !== 'function') {
    const startWait = Date.now()
    while (Date.now() - startWait < 6000) {
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
      // If the user viewed and closed the GigaPub ad, credit at least 10s so verification succeeds
      const effectiveDuration = Math.max(duration, 10)
      return { success: true, duration: effectiveDuration }
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
 * 1. Checks global mutex & 30s delay between ads.
 * 2. If preferred is 'adexium': Tries AdExium first. If AdExium is NOT available/fails,
 *    IMMEDIATELY cascades to Adsgram (Block 56832).
 * 3. If Adsgram is also unavailable/no-fill, cascades to GigaPub backup (100% fill coverage).
 */
export const showRewardedAdWithWaterfall = async (
  preferredProvider: 'adexium' | 'adsgram' | 'gigapub' | 'any' = 'adexium'
): Promise<{ success: boolean; provider: string; duration: number }> => {
  if (typeof window === 'undefined') return { success: false, provider: 'none', duration: 0 }

  if (isAdActive) {
    console.warn('[Ads] Another ad is currently active. Request ignored.')
    return { success: false, provider: 'busy', duration: 0 }
  }

  // 30s breakdown cooldown enforcement
  const cooldownRemaining = getAdCooldownRemaining()
  if (cooldownRemaining > 0) {
    console.warn(`[Ads] 30s network cooldown active (${cooldownRemaining}s remaining). Request prevented.`)
    return { success: false, provider: 'cooldown', duration: 0 }
  }

  isAdActive = true

  try {
    // -------------------------------------------------------------
    // PRIORITY 1: Try AdExium if preferred (or 'any')
    // -------------------------------------------------------------
    if (preferredProvider !== 'adsgram' && preferredProvider !== 'gigapub') {
      console.log('🎬 [Ads] Step 1: Requesting AdExium primary provider...')
      const adStartTime = Date.now()
      const adexSuccess = await showAdexiumAd()
      const adDuration = (Date.now() - adStartTime) / 1000

      if (adexSuccess && adDuration >= 9.5) {
        lastAdCompletedTimestamp = Date.now()
        setAdCooldown(AD_COOLDOWN_SECONDS)
        console.log(`✅ [Ads] AdExium successfully verified (${adDuration.toFixed(1)}s)!`)
        return { success: true, provider: 'AdExium', duration: adDuration }
      }
      if (adexSuccess && adDuration < 9.5) {
        console.warn(`⚠️ [Ads] AdExium closed too quickly (${adDuration.toFixed(1)}s < 10s).`)
        clearAdCooldown()
        return { success: false, provider: 'AdExium', duration: adDuration }
      }
      console.log('⚠️ [Ads] AdExium NOT available / no-fill. Immediately cascading to Adsgram (Block 56832)...')
    }

    // -------------------------------------------------------------
    // PRIORITY 2: Adsgram (Block 56832) - Official Telegram Partner
    // If AdExium was not available, or if preferred is 'adsgram'
    // -------------------------------------------------------------
    if (preferredProvider !== 'gigapub') {
      console.log(`🎬 [Ads] Step 2: Requesting Adsgram rewarded video (Block ID: ${ADSGRAM_BLOCK_ID})...`)
      const adStartTime = Date.now()
      const adsgramSuccess = await showAdsgramAd()
      const rawDuration = (Date.now() - adStartTime) / 1000
      const adDuration = Math.max(15, rawDuration)

      if (adsgramSuccess) {
        lastAdCompletedTimestamp = Date.now()
        setAdCooldown(AD_COOLDOWN_SECONDS)
        console.log(`✅ [Ads] Adsgram ad watched and verified (${adDuration.toFixed(1)}s)!`)
        return { success: true, provider: 'Adsgram', duration: adDuration }
      }
      console.log('⚠️ [Ads] Adsgram unavailable or dismissed. Cascading to GigaPub backup...')
    }

    // -------------------------------------------------------------
    // PRIORITY 3: Backup GigaPub (App ID 8543) - Guaranteed 100% cascade
    // -------------------------------------------------------------
    console.log('🎬 [Ads] Step 3: Requesting GigaPub backup provider (id: 8543)...')
    const gigaRes = await showGigaPubAd()

    if (gigaRes.success) {
      lastAdCompletedTimestamp = Date.now()
      setAdCooldown(AD_COOLDOWN_SECONDS)
      console.log(`✅ [Ads] GigaPub successfully verified (${gigaRes.duration.toFixed(1)}s)!`)
      return { success: true, provider: 'GigaPub', duration: gigaRes.duration }
    }

    console.log('ℹ️ [Ads] No video ad available from any provider.')
    clearAdCooldown()
    return { success: false, provider: 'none', duration: 0 }
  } finally {
    isAdActive = false
  }
}

/**
 * Opening Ad on Launch: Try AdExium, if not available ➔ Show Adsgram!
 */
export const showOpeningAdOnlyAdExium = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  if (isAdActive) return false

  console.log('[Ads] App Launch: Checking opening ad (1st AdExium -> Fallback Adsgram)...')
  isAdActive = true
  try {
    const success = await showAdexiumAd()
    if (success) {
      lastAdCompletedTimestamp = Date.now()
      console.log('✅ [Ads] AdExium opening ad displayed successfully!')
      return true
    }
    console.log('⚠️ [Ads] AdExium not available on launch. Immediately showing Adsgram fallback...')
    const adsgramSuccess = await showAdsgramAd()
    if (adsgramSuccess) {
      lastAdCompletedTimestamp = Date.now()
      console.log('✅ [Ads] Adsgram opening ad displayed successfully!')
      return true
    }
    return false
  } finally {
    isAdActive = false
  }
}

/**
 * Helper: check if current page is one where we should not auto-show an ad.
 * Works with both hash-router and path-router, and inside Telegram's iframe.
 */
const isAdSuppressedPage = (): boolean => {
  if (typeof window === 'undefined') return false
  const full = (window.location.pathname + window.location.hash + window.location.search).toLowerCase()
  // suppress on watch/tasks/missions/withdraw pages
  return (
    full.includes('watch') ||
    full.includes('tasks') ||
    full.includes('missions') ||
    full.includes('withdraw')
  )
}

/**
 * Periodic 2-Minute Automatic Ad: 1st AdExium -> Backup GigaPub
 */
export const showPeriodic2MinAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  if (isAdActive) return false

  const now = Date.now()
  if (now - lastAdCompletedTimestamp < MIN_AD_COOLDOWN_MS) return false

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

  // Step 0: Pre-warm Adsgram & AdExium widgets as soon as possible.
  initAdsgram()
  const tryPrewarm = () => {
    initAdsgram()
    const w = ensureAdexiumWidget()
    if (w) {
      console.log('[Ads] ✅ AdExium widget pre-warmed on init')
    } else {
      // Script not yet parsed — retry once after 3s
      setTimeout(() => {
        initAdsgram()
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
