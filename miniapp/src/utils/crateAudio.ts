// Zero-dependency procedural Web Audio API sound synthesizer
// Plays instant haptic-like sound effects without requiring external audio file downloads

class CrateAudioEngine {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  // Quick mechanical click
  playClick() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04)

      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } catch {}
  }

  // Rapid roulette wheel ticker click
  playRouletteTick(pitch = 800) {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(pitch, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, ctx.currentTime + 0.03)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.03)
    } catch {}
  }

  // Suspenseful rumble and energetic charge-up
  playSuspenseCharge() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(65, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 1.4)

      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.2)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 1.5)
    } catch {}
  }

  // Mechanical crate unlatch burst
  playBoxBurst() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      // Bass boom
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(140, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4)

      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)

      // Shimmer zap
      const zap = ctx.createOscillator()
      const zapGain = ctx.createGain()
      zap.type = 'sine'
      zap.frequency.setValueAtTime(800, ctx.currentTime)
      zap.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.25)
      zapGain.gain.setValueAtTime(0.15, ctx.currentTime)
      zapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

      zap.connect(zapGain)
      zapGain.connect(ctx.destination)
      zap.start()
      zap.stop(ctx.currentTime + 0.25)
    } catch {}
  }

  // Triumphant Victory Chime / Fanfare
  playWinFanfare(isJackpot = false) {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const notes = isJackpot
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] // C5, E5, G5, C6, E6, G6
        : [440.0, 554.37, 659.25, 880.0] // A4, C#5, E5, A5

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = isJackpot ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08)

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08)
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + index * 0.08 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.8)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + index * 0.08)
        osc.stop(ctx.currentTime + index * 0.08 + 0.8)
      })
    } catch {}
  }

  // Coin and treasure jingle
  playCoins() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const freqs = [1800, 2200, 2600, 3100, 3500]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f + Math.random() * 200, ctx.currentTime + i * 0.05)
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.05)
        osc.stop(ctx.currentTime + i * 0.05 + 0.12)
      })
    } catch {}
  }
}

export const crateAudio = new CrateAudioEngine()
