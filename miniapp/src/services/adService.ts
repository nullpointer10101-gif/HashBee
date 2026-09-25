// Ad Manager for HashBee
const ADEXIUM_PRIMARY_WID = '8e21d2a6-6c80-4b16-baf9-990e07ff2f00';
const ADEXIUM_FALLBACK_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

let adexiumInstance: any = null;

export function getOrInitAdexium(wid: string = ADEXIUM_PRIMARY_WID) {
  if (typeof window === 'undefined') return null;
  const WidgetClass = (window as any).AdexiumWidget || (window as any).TGAdsWidget;
  if (typeof WidgetClass !== 'function') return null;

  try {
    const instance = new WidgetClass({
      wid: wid,
      adFormat: 'interstitial',
      debug: false
    });
    return instance;
  } catch (e) {
    console.warn('[AdManager] Adexium init failed for WID:', wid, e);
    return null;
  }
}

export async function showGigaPub(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const fn = (window as any).showGiga || (window as any).showGigaPubAd || (window as any).showGigaAd || 
             ((window as any).GigaPub && ((window as any).GigaPub.showAd || (window as any).GigaPub.show));
  
  if (typeof fn !== 'function') return false;

  return new Promise((resolve) => {
    try {
      console.log('[AdManager] 🎬 Showing GigaPub Rewarded Video...');
      const res = fn.call((window as any).GigaPub || window);
      if (res && typeof res.then === 'function') {
        res.then(() => resolve(true)).catch(() => resolve(false));
      } else {
        resolve(true);
      }
    } catch (e) {
      console.warn('[AdManager] GigaPub error:', e);
      resolve(false);
    }
  });
}

export function showOpenAd(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise(async (resolve) => {
    // 1. Try Adexium Primary WID
    let widget = getOrInitAdexium(ADEXIUM_PRIMARY_WID);
    
    // Wait for script if needed
    if (!widget) {
      let waited = 0;
      while (!widget && waited < 1200) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        widget = getOrInitAdexium(ADEXIUM_PRIMARY_WID);
      }
    }

    if (!widget) {
      // Fallback to GigaPub
      console.warn('[AdManager] Adexium not ready, trying GigaPub fallback...');
      const gigaRes = await showGigaPub();
      return resolve(gigaRes);
    }

    let settled = false;

    const cleanup = () => {
      try {
        if (widget.off) {
          widget.off('adReceived', onAdReceived);
          widget.off('adClosed', onClosed);
          widget.off('requestAdError', onError);
          widget.off('noAdFound', onNoAd);
        }
      } catch (e) {}
    };

    const onAdReceived = (ad: any) => {
      console.log('[AdManager] 🎯 Adexium adReceived — displaying interstitial...');
      try {
        if (typeof widget.displayAd === 'function') {
          widget.displayAd(ad);
        }
      } catch (e) {
        console.error('[AdManager] Error calling displayAd:', e);
        onError();
      }
    };

    const onClosed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      console.log('[AdManager] Adexium ad closed');
      resolve(true);
    };

    const tryFallback = async () => {
      if (settled) return;
      console.log('[AdManager] Adexium no-ad/error, trying fallback WID...');
      const fallbackWidget = getOrInitAdexium(ADEXIUM_FALLBACK_WID);
      if (fallbackWidget) {
        try {
          fallbackWidget.on('adReceived', (ad: any) => {
            try { fallbackWidget.displayAd(ad); } catch (e) {}
          });
          fallbackWidget.on('adClosed', () => {
            if (!settled) { settled = true; resolve(true); }
          });
          fallbackWidget.on('noAdFound', async () => {
            if (!settled) { settled = true; const r = await showGigaPub(); resolve(r); }
          });
          fallbackWidget.on('requestAdError', async () => {
            if (!settled) { settled = true; const r = await showGigaPub(); resolve(r); }
          });
          fallbackWidget.requestAd('interstitial');
          return;
        } catch (e) {}
      }
      settled = true;
      const gigaRes = await showGigaPub();
      resolve(gigaRes);
    };

    const onError = () => {
      cleanup();
      tryFallback();
    };

    const onNoAd = () => {
      cleanup();
      tryFallback();
    };

    try {
      widget.on('adReceived', onAdReceived);
      widget.on('adClosed', onClosed);
      widget.on('requestAdError', onError);
      widget.on('noAdFound', onNoAd);

      console.log('[AdManager] 🚀 Requesting Adexium ad for HashBee...');
      widget.requestAd('interstitial');
    } catch (e) {
      onError();
    }

    // Safety timeout
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(false);
      }
    }, 15000);
  });
}
