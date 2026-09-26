/**
 * Monetag SDK Helper for HashBee (Zone 11894371)
 */

export const isMonetagReady = (): boolean => {
  return typeof window !== 'undefined' && typeof window.show_11894371 === 'function'
}

/**
 * Show Rewarded Interstitial Ad
 * Returns true if the user watched the ad successfully and earned their reward.
 */
export const showRewardedInterstitial = async (): Promise<boolean> => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready or blocked')
    return false
  }

  try {
    await window.show_11894371!()
    return true
  } catch (err) {
    console.error('[Monetag] Rewarded Interstitial error:', err)
    return false
  }
}

/**
 * Show Rewarded Popup Ad ('pop')
 * Returns true if user completed/closed the popup reward ad.
 */
export const showRewardedPopup = async (): Promise<boolean> => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready or blocked')
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

/**
 * Initialize In-App Interstitial background ads
 */
export const initInAppInterstitial = (config = {
  frequency: 2,
  capping: 0.1,
  interval: 30,
  timeout: 5,
  everyPage: false,
}) => {
  if (!isMonetagReady()) {
    console.warn('[Monetag] SDK not ready for In-App Interstitial')
    return
  }

  try {
    window.show_11894371!({
      type: 'inApp',
      inAppSettings: config,
    })
    console.log('[Monetag] In-App Interstitial initialized')
  } catch (err) {
    console.error('[Monetag] In-App Interstitial init error:', err)
  }
}
