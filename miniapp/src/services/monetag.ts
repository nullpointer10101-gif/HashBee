/**
 * Multi-Provider Ad Coordinator for HashBee
 * Primary: AdExium (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)
 * Backup 1: GigaPub (App ID: 8543)
 * Backup 2: Adsgram (Reward Controller with fallback validation)
 */

declare global {
  interface Window {
    showGiga?: () => Promise<any>
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean }) => {
        show: () => Promise<any>
      }
    }
    adexiumWidget?: any
    initAdexium?: () => any
    requestAdexiumAd?: (format?: string) => boolean
  }
}

export const isAdExiumReady = (): boolean => {
  if (typeof window === 'undefined') return false
  if (window.adexiumWidget) return true
  if (typeof window.initAdexium === 'function') {
    return !!window.initAdexium()
  }
  return false
}

let lastAdTimestamp = 0
const AD_COOLDOWN_MS = 30_000 // 30 seconds between ambient ads

/**
 * 1. AdExium Player
 */
export const showAdexiumAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  if (typeof window.initAdexium === 'function') {
    window.initAdexium()
  }

  return new Promise((resolve) => {
    let finished = false
    const done = (success: boolean) => {
      if (!finished) {
        finished = true
        resolve(success)
      }
    }

    const timer = setTimeout(() => {
      done(false)
    }, 8000)

    try {
      let adex = window.adexiumWidget
      if (!adex && typeof window.initAdexium === 'function') {
        adex = window.initAdexium()
      }

      if (adex && typeof adex.requestAd === 'function') {
        const handleReceived = (ad: any) => {
          try {
            if (typeof adex.displayAd === 'function') {
              adex.displayAd(ad)
            }
          } catch {}
        }

        const handleClosed = () => {
          cleanup()
          clearTimeout(timer)
          done(true)
        }

        const handleCompleted = () => {
          cleanup()
          clearTimeout(timer)
          done(true)
        }

        const handleNoAd = () => {
          cleanup()
          clearTimeout(timer)
          done(false)
        }

        const handleError = () => {
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

        adex.requestAd('interstitial', true).then((ads: any) => {
          if (Array.isArray(ads) && ads.length > 0) {
            try {
              if (typeof adex.displayAd === 'function') {
                adex.displayAd(ads)
              }
            } catch {}
          }
        }).catch(() => {
          cleanup()
          clearTimeout(timer)
          done(false)
        })

        return
      }
    } catch (e) {
      console.warn('[Ads] AdExium request error:', e)
    }

    clearTimeout(timer)
    done(false)
  })
}

/**
 * 2. GigaPub Player (App ID 8543)
 */
export const showGigaPubAd = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  if (typeof window.showGiga === 'function') {
    try {
      console.log('[Ads] Requesting GigaPub ad (App ID: 8543)...')
      await window.showGiga()
      console.log('✅ [Ads] GigaPub ad completed successfully!')
      return true
    } catch (err) {
      console.warn('[Ads] GigaPub ad error/skipped:', err)
      return false
    }
  }

  return false
}

/**
 * 3. Adsgram Player (Backup Provider with proper validation)
 */
export const showAdsgramAd = async (blockId = 'int-8543'): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  if (window.Adsgram) {
    try {
      console.log('[Ads] Requesting Adsgram ad...')
      const isInsideTg = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || window.Telegram?.WebApp?.initData)
      const controller = window.Adsgram.init({
        blockId: blockId,
        debug: !isInsideTg,
      })
      await controller.show()
      console.log('✅ [Ads] Adsgram ad completed successfully!')
      return true
    } catch (err) {
      console.warn('[Ads] Adsgram ad error/no-fill:', err)
      return false
    }
  }

  return false
}

/**
 * Full Waterfall / Cascade Rewarded Ad Player:
 * Priority 1: AdExium (Primary Provider)
 * Priority 2: GigaPub (Backup Provider, App ID 8543)
 * Priority 3: Fallback (In-App Interactive Booster Modal)
 */
export const showRewardedAdWithWaterfall = async (
  preferredProvider: 'adexium' | 'gigapub' | 'any' = 'adexium'
): Promise<{ success: boolean; provider: string }> => {
  if (typeof window === 'undefined') return { success: false, provider: 'none' }

  // 1. Primary Provider: AdExium (unless gigapub explicitly prioritized)
  if (preferredProvider !== 'gigapub') {
    console.log('[Ads] Waterfall Step 1/2: Requesting AdExium primary provider...')
    const adexSuccess = await showAdexiumAd()
    if (adexSuccess) {
      console.log('✅ [Ads] AdExium ad delivered and completed!')
      return { success: true, provider: 'AdExium' }
    }
    console.log('⚠️ [Ads] AdExium unavailable / no fill. Cascading to GigaPub backup...')
  }

  // 2. Backup Provider: GigaPub (App ID 8543)
  console.log('[Ads] Waterfall Step 2/2: Requesting GigaPub backup provider (id: 8543)...')
  const gigaSuccess = await showGigaPubAd()
  if (gigaSuccess) {
    console.log('✅ [Ads] GigaPub ad delivered and completed!')
    return { success: true, provider: 'GigaPub' }
  }

  // 3. Fallback: If gigapub was preferred and failed, try AdExium once more
  if (preferredProvider === 'gigapub') {
    console.log('[Ads] Waterfall fallback: Trying AdExium...')
    const adexSuccess = await showAdexiumAd()
    if (adexSuccess) {
      return { success: true, provider: 'AdExium' }
    }
  }

  console.log('ℹ️ [Ads] All ad networks exhausted / no fill. Launching interactive in-app booster fallback.')
  return { success: false, provider: 'none' }
}

/**
 * Interstitial helper
 */
export const showInterstitialAd = async (force = false): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  const now = Date.now()
  if (!force && now - lastAdTimestamp < AD_COOLDOWN_MS) {
    return false
  }
  lastAdTimestamp = now

  const res = await showRewardedAdWithWaterfall('any')
  return res.success
}

export const showRewardedInterstitial = showInterstitialAd
export const showRewardedPopup = async (): Promise<boolean> => showInterstitialAd(true)

let hasInitialized = false
let periodicTimer: ReturnType<typeof setInterval> | null = null

/**
 * Initialize automatic background ads (every 90s)
 */
export const initMonetagAutoAds = () => {
  if (typeof window === 'undefined' || hasInitialized) return
  hasInitialized = true

  setTimeout(() => {
    showInterstitialAd(true).catch(() => {})
  }, 2000)

  if (periodicTimer) {
    clearInterval(periodicTimer)
  }

  periodicTimer = setInterval(() => {
    showInterstitialAd(true).catch(() => {})
  }, 90000)
}
