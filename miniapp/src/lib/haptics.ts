'use client';

// Safe access to Telegram WebApp across different type declarations
function getTg(): any {
  if (typeof window === 'undefined') return undefined;
  return (window as any).Telegram?.WebApp;
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundEffectType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'drill'
  | 'tab_vault'
  | 'tab_market'
  | 'tab_wallet'
  | 'tab_syndicate'
  | 'subtab_safecrackers'
  | 'subtab_batteries'
  | 'mode_topup'
  | 'mode_withdraw'
  | 'coin_gram'
  | 'coin_usdt'
  | 'coin_trx'
  | 'amount_pill'
  | 'copy'
  | 'share'
  | 'recharge'
  | 'sound_toggle'
  | 'modal_close';

let globalSoundEnabled = true;

export function setGlobalSoundEnabled(enabled: boolean) {
  globalSoundEnabled = enabled;
}

function playToneNotes(
  ctx: AudioContext,
  notes: Array<{
    freq: number;
    endFreq?: number;
    delay: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
  }>
) {
  const now = ctx.currentTime;
  notes.forEach(({ freq, endFreq, delay, duration, type = 'triangle', gain = 0.055 }) => {
    const startAt = now + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startAt + duration);
    }
    g.gain.setValueAtTime(0.001, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + Math.min(0.012, duration * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0008, startAt + duration);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.005);
  });
}

export function playDrillingSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  const duration = 0.48;

  // 1. High-torque rotary auger motor growl (FM modulated sawtooth + square)
  const motorOsc = ctx.createOscillator();
  const lfoOsc = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const motorFilter = ctx.createBiquadFilter();
  const motorGain = ctx.createGain();

  motorOsc.type = 'sawtooth';
  motorOsc.frequency.setValueAtTime(88, now);
  motorOsc.frequency.exponentialRampToValueAtTime(165, now + 0.14);
  motorOsc.frequency.setValueAtTime(155, now + 0.32);
  motorOsc.frequency.exponentialRampToValueAtTime(72, now + duration);

  // Rapid hammer-drill modulation (~34 Hz impact vibration)
  lfoOsc.type = 'square';
  lfoOsc.frequency.setValueAtTime(34, now);
  lfoGain.gain.setValueAtTime(42, now);

  motorFilter.type = 'bandpass';
  motorFilter.frequency.setValueAtTime(360, now);
  motorFilter.frequency.exponentialRampToValueAtTime(980, now + 0.25);
  motorFilter.Q.setValueAtTime(3.2, now);

  motorGain.gain.setValueAtTime(0.001, now);
  motorGain.gain.linearRampToValueAtTime(0.095, now + 0.03);
  motorGain.gain.setValueAtTime(0.085, now + 0.34);
  motorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  lfoOsc.connect(lfoGain);
  lfoGain.connect(motorOsc.frequency);
  motorOsc.connect(motorFilter);
  motorFilter.connect(motorGain);
  motorGain.connect(ctx.destination);

  motorOsc.start(now);
  lfoOsc.start(now);
  motorOsc.stop(now + duration);
  lfoOsc.stop(now + duration);

  // 2. Rock-crushing pneumatic noise bursts (simulating drill bit biting into gold vein)
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const pulse = 0.5 + 0.5 * Math.sin((i / ctx.sampleRate) * Math.PI * 2 * 36);
    output[i] = (Math.random() * 2 - 1) * pulse;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const rockFilter = ctx.createBiquadFilter();
  rockFilter.type = 'bandpass';
  rockFilter.frequency.setValueAtTime(1200, now);
  rockFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.3);
  rockFilter.Q.setValueAtTime(1.8, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  whiteNoise.connect(rockFilter);
  rockFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  whiteNoise.start(now);
  whiteNoise.stop(now + duration);

  // 3. Extracted Gold Bullion Clinks at the end of the drill burst
  const clinkFreqs = [1396.91, 1760.0, 2349.32];
  clinkFreqs.forEach((freq, idx) => {
    const startAt = now + 0.16 + idx * 0.075;
    const clinkOsc = ctx.createOscillator();
    const clinkGain = ctx.createGain();
    clinkOsc.type = 'triangle';
    clinkOsc.frequency.setValueAtTime(freq, startAt);
    clinkOsc.frequency.exponentialRampToValueAtTime(freq * 1.03, startAt + 0.09);

    clinkGain.gain.setValueAtTime(0.055, startAt);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.11);

    clinkOsc.connect(clinkGain);
    clinkGain.connect(ctx.destination);

    clinkOsc.start(startAt);
    clinkOsc.stop(startAt + 0.11);
  });
}

export function triggerHaptic(
  style: SoundEffectType = 'medium',
  soundEnabledOverride?: boolean
) {
  if (typeof window === 'undefined') return;

  const shouldPlaySound =
    soundEnabledOverride !== undefined ? soundEnabledOverride : globalSoundEnabled;

  try {
    const hf = (window as any)?.Telegram?.WebApp?.HapticFeedback;
    if (hf) {
      if (style === 'drill' || style === 'success') {
        hf.impactOccurred('heavy');
        hf.notificationOccurred('success');
      } else if (style === 'warning' || style === 'error') {
        hf.impactOccurred('medium');
        hf.notificationOccurred(style);
      } else if (style.startsWith('tab_') || style.startsWith('subtab_')) {
        hf.selectionChanged();
      } else {
        hf.impactOccurred('light');
      }
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (style === 'drill' || style === 'success') {
        navigator.vibrate([25, 30, 35, 30, 45]);
      } else {
        navigator.vibrate(10);
      }
    }
  } catch {
    // Ignore environment restrictions
  }

  if (!shouldPlaySound) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (style) {
      case 'drill':
      case 'success':
        // Mechanical rotary rock-drilling + gold bullion cascade on claiming/smelting/buying
        playDrillingSound(ctx);
        break;

      case 'tab_vault':
        // 🏛️ Vault Tab: Heavy Vault Tumbler Lock + Golden Harmonic Chime
        playToneNotes(ctx, [
          { freq: 196.0, endFreq: 146.83, delay: 0, duration: 0.06, type: 'sine', gain: 0.07 },
          { freq: 587.33, delay: 0.03, duration: 0.11, type: 'triangle', gain: 0.055 },
          { freq: 880.0, delay: 0.08, duration: 0.16, type: 'sine', gain: 0.05 },
        ]);
        break;

      case 'tab_market':
        // 🛒 Black Market Tab: Crisp Bullion Merchant Arpeggio
        playToneNotes(ctx, [
          { freq: 783.99, delay: 0, duration: 0.07, type: 'triangle', gain: 0.05 },
          { freq: 987.77, delay: 0.045, duration: 0.08, type: 'triangle', gain: 0.055 },
          { freq: 1318.51, delay: 0.09, duration: 0.14, type: 'sine', gain: 0.05 },
        ]);
        break;

      case 'tab_wallet':
        // 💼 Wallet Tab: Crystalline Crypto Ledger Chime
        playToneNotes(ctx, [
          { freq: 659.25, delay: 0, duration: 0.08, type: 'sine', gain: 0.05 },
          { freq: 1046.5, delay: 0.05, duration: 0.12, type: 'triangle', gain: 0.055 },
          { freq: 1567.98, delay: 0.1, duration: 0.15, type: 'sine', gain: 0.045 },
        ]);
        break;

      case 'tab_syndicate':
        // 👥 Syndicate Tab: Tactical Crew Uplink Double Sonar Ping
        playToneNotes(ctx, [
          { freq: 523.25, endFreq: 554.37, delay: 0, duration: 0.07, type: 'sine', gain: 0.055 },
          { freq: 783.99, delay: 0.055, duration: 0.08, type: 'triangle', gain: 0.05 },
          { freq: 1046.5, delay: 0.11, duration: 0.15, type: 'sine', gain: 0.05 },
        ]);
        break;

      case 'subtab_safecrackers':
        // 🥷 Safecrackers Sub-Tab: Metallic Pickaxe / Anvil Clink
        playToneNotes(ctx, [
          { freq: 932.33, endFreq: 1396.91, delay: 0, duration: 0.09, type: 'triangle', gain: 0.055 },
          { freq: 1864.66, delay: 0.03, duration: 0.1, type: 'sine', gain: 0.035 },
        ]);
        break;

      case 'subtab_batteries':
        // ⚡ Power Batteries Sub-Tab: Electric Capacitor Charge Sweep
        playToneNotes(ctx, [
          { freq: 329.63, endFreq: 987.77, delay: 0, duration: 0.13, type: 'sine', gain: 0.06 },
          { freq: 659.25, endFreq: 1318.51, delay: 0.04, duration: 0.11, type: 'triangle', gain: 0.04 },
        ]);
        break;

      case 'mode_topup':
        // 📥 Top-Up Mode / Header [+] Button: Ascending Deposit Bell
        playToneNotes(ctx, [
          { freq: 587.33, delay: 0, duration: 0.07, type: 'sine', gain: 0.05 },
          { freq: 880.0, delay: 0.05, duration: 0.12, type: 'triangle', gain: 0.055 },
        ]);
        break;

      case 'mode_withdraw':
        // 📤 Withdraw Mode: Vault Payout Dispatch Chime
        playToneNotes(ctx, [
          { freq: 880.0, delay: 0, duration: 0.07, type: 'sine', gain: 0.05 },
          { freq: 659.25, delay: 0.045, duration: 0.07, type: 'sine', gain: 0.05 },
          { freq: 1046.5, delay: 0.09, duration: 0.12, type: 'triangle', gain: 0.055 },
        ]);
        break;

      case 'coin_gram':
        // 💎 GRAM (TON): High Diamond Ping
        playToneNotes(ctx, [
          { freq: 880.0, endFreq: 1318.51, delay: 0, duration: 0.09, type: 'sine', gain: 0.055 },
        ]);
        break;

      case 'coin_usdt':
        // 💵 USDT (TON): Emerald Harmonic Pluck
        playToneNotes(ctx, [
          { freq: 739.99, endFreq: 1108.73, delay: 0, duration: 0.09, type: 'triangle', gain: 0.055 },
        ]);
        break;

      case 'coin_trx':
        // 🔺 TRX (TRON): Ruby Synth Pluck
        playToneNotes(ctx, [
          { freq: 659.25, endFreq: 987.77, delay: 0, duration: 0.09, type: 'triangle', gain: 0.055 },
        ]);
        break;

      case 'amount_pill':
        // Quick Amount ($5, $10, $25, $50, MAX): Crisp Chip Tap
        playToneNotes(ctx, [
          { freq: 1046.5, endFreq: 1480.0, delay: 0, duration: 0.055, type: 'sine', gain: 0.045 },
        ]);
        break;

      case 'copy':
        // Copy / Paste Button: Upbeat Double Chirp
        playToneNotes(ctx, [
          { freq: 880.0, delay: 0, duration: 0.05, type: 'sine', gain: 0.05 },
          { freq: 1318.51, delay: 0.045, duration: 0.09, type: 'triangle', gain: 0.055 },
        ]);
        break;

      case 'share':
        // 🚀 Invite Crew Button: Ascending Launch Triad
        playToneNotes(ctx, [
          { freq: 523.25, delay: 0, duration: 0.06, type: 'triangle', gain: 0.05 },
          { freq: 659.25, delay: 0.045, duration: 0.06, type: 'triangle', gain: 0.05 },
          { freq: 783.99, delay: 0.09, duration: 0.07, type: 'triangle', gain: 0.055 },
          { freq: 1046.5, delay: 0.135, duration: 0.16, type: 'sine', gain: 0.06 },
        ]);
        break;

      case 'recharge':
        // ⚡ Re-charge Button: Electric Generator Surge
        playToneNotes(ctx, [
          { freq: 293.66, endFreq: 587.33, delay: 0, duration: 0.08, type: 'sine', gain: 0.055 },
          { freq: 587.33, endFreq: 1174.66, delay: 0.06, duration: 0.14, type: 'triangle', gain: 0.06 },
        ]);
        break;

      case 'sound_toggle':
        // Speaker Toggle Icon: Acoustic Bell Pop
        playToneNotes(ctx, [
          { freq: 698.46, endFreq: 1046.5, delay: 0, duration: 0.08, type: 'sine', gain: 0.05 },
        ]);
        break;

      case 'modal_close':
        // Modal Close / Cancel: Soft Descending Dismiss
        playToneNotes(ctx, [
          { freq: 659.25, endFreq: 440.0, delay: 0, duration: 0.08, type: 'sine', gain: 0.045 },
        ]);
        break;

      case 'error':
      case 'warning':
        // Low-Balance / Alert Buzz
        playToneNotes(ctx, [
          { freq: 220.0, endFreq: 164.81, delay: 0, duration: 0.1, type: 'sawtooth', gain: 0.045 },
          { freq: 164.81, endFreq: 130.81, delay: 0.09, duration: 0.12, type: 'sawtooth', gain: 0.045 },
        ]);
        break;

      case 'light':
      case 'medium':
      case 'heavy':
      default: {
        // Tactile Crystal UI Click
        const startF = style === 'light' ? 880 : style === 'heavy' ? 440 : 660;
        playToneNotes(ctx, [
          { freq: startF, endFreq: startF * 1.35, delay: 0, duration: 0.06, type: 'sine', gain: 0.045 },
        ]);
        break;
      }
    }
  } catch {
    // Ignore audio context errors
  }
}
