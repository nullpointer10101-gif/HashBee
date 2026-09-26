import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { showRewardedInterstitial } from '../services/monetag'
import toast from 'react-hot-toast'
import ReactConfetti from 'react-confetti'

interface WheelSlice {
  id: number
  label: string
  sublabel: string
  icon: string
  color: string
  textColor: string
  weight: number // Drop probability weight
  type: 'usdt' | 'gram' | 'hash' | 'spin'
  amount: number
}

// 8 exact requested slices with low chance on big rewards
const SLICES: WheelSlice[] = [
  { id: 0, label: '1 HASH', sublabel: 'Mining Boost', icon: '⚡', color: '#1a2e26', textColor: '#10b981', weight: 35, type: 'hash', amount: 1 },
  { id: 1, label: '0.01 GRAM', sublabel: 'Crypto Drop', icon: '🪙', color: '#272015', textColor: '#f59e0b', weight: 25, type: 'gram', amount: 0.01 },
  { id: 2, label: '+1 SPIN', sublabel: 'Free Re-spin', icon: '🔄', color: '#1e2430', textColor: '#60a5fa', weight: 20, type: 'spin', amount: 1 },
  { id: 3, label: '0.01 USDT', sublabel: 'Cash Win', icon: '💵', color: '#192b23', textColor: '#34d399', weight: 12, type: 'usdt', amount: 0.01 },
  { id: 4, label: '0.02 GRAM', sublabel: 'Token Reward', icon: '🪙', color: '#2b1f15', textColor: '#fbbf24', weight: 4.5, type: 'gram', amount: 0.02 },
  { id: 5, label: '2 HASH', sublabel: 'Double Hash', icon: '⚡', color: '#16382a', textColor: '#059669', weight: 2, type: 'hash', amount: 2 },
  { id: 6, label: '0.03 USDT', sublabel: 'Big Cash', icon: '💵', color: '#133924', textColor: '#10b981', weight: 1.0, type: 'usdt', amount: 0.03 },
  { id: 7, label: '1 GRAM', sublabel: '★ JACKPOT ★', icon: '👑', color: '#3d240d', textColor: '#fbbf24', weight: 0.5, type: 'gram', amount: 1 },
]

export const Spin: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()

  const [spinsLeft, setSpinsLeft] = useState<number>(() => {
    const saved = localStorage.getItem('hb_spins_count')
    return saved !== null ? parseInt(saved, 10) : 1
  })
  const [lastFreeDate, setLastFreeDate] = useState<string>(() => {
    return localStorage.getItem('hb_last_free_spin') || ''
  })
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [wonReward, setWonReward] = useState<WheelSlice | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [adLoading, setAdLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Save spins count
  useEffect(() => {
    localStorage.setItem('hb_spins_count', spinsLeft.toString())
  }, [spinsLeft])

  // Daily free spin grant
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (lastFreeDate !== today) {
      setSpinsLeft((prev) => prev + 1)
      setLastFreeDate(today)
      localStorage.setItem('hb_last_free_spin', today)
    }
  }, [lastFreeDate])

  // Draw the lucky wheel canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const radius = center - 8
    const totalSlices = SLICES.length
    const arc = (2 * Math.PI) / totalSlices

    ctx.clearRect(0, 0, size, size)

    // Draw outer golden ring
    ctx.beginPath()
    ctx.arc(center, center, radius + 4, 0, 2 * Math.PI)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 6
    ctx.stroke()

    // Draw Slices
    SLICES.forEach((slice, i) => {
      const angle = i * arc
      ctx.beginPath()
      ctx.fillStyle = slice.color
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, angle, angle + arc)
      ctx.lineTo(center, center)
      ctx.fill()

      ctx.strokeStyle = '#23332e'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Slice text & icon
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(angle + arc / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = slice.textColor
      ctx.font = 'bold 13px Outfit, sans-serif'
      ctx.fillText(slice.label, radius - 24, 4)

      // Slice Icon
      ctx.font = '14px sans-serif'
      ctx.fillText(slice.icon, radius - 6, 5)
      ctx.restore()
    })

    // Center pin
    ctx.beginPath()
    ctx.arc(center, center, 24, 0, 2 * Math.PI)
    ctx.fillStyle = '#0f1715'
    ctx.fill()
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🐝', center, center)
  }, [])

  // Weighted random picker
  const pickRandomReward = (): WheelSlice => {
    const totalWeight = SLICES.reduce((sum, s) => sum + s.weight, 0)
    let randomNum = Math.random() * totalWeight
    for (const slice of SLICES) {
      if (randomNum < slice.weight) {
        return slice
      }
      randomNum -= slice.weight
    }
    return SLICES[0]
  }

  // Handle spin action
  const handleSpin = () => {
    if (isSpinning) return
    if (spinsLeft <= 0) {
      toast.error('No spins left! Watch an ad or invite friends to get more.')
      return
    }

    setIsSpinning(true)
    setWonReward(null)
    setSpinsLeft((prev) => Math.max(0, prev - 1))

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }

    const selectedReward = pickRandomReward()
    const sliceIndex = selectedReward.id
    const sliceAngle = 360 / SLICES.length

    // Target angle where slice lands under top indicator (270 degrees in canvas coordinates)
    const extraSpins = 5 * 360 // 5 full rotations
    const targetSliceCenter = sliceIndex * sliceAngle + sliceAngle / 2
    const stopAngle = 360 - targetSliceCenter + 270
    const finalRotation = rotation + extraSpins + (stopAngle - (rotation % 360))

    setRotation(finalRotation)

    setTimeout(() => {
      setIsSpinning(false)
      setWonReward(selectedReward)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4500)

      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }

      if (selectedReward.type === 'spin') {
        setSpinsLeft((prev) => prev + 1)
        toast.success('🎉 You won +1 FREE SPIN!')
      } else {
        toast.success(`🎉 You won ${selectedReward.label}!`)
      }

      if (refreshUser) refreshUser()
    }, 4200)
  }

  // Watch Monetag Rewarded Ad to get +1 Spin
  const handleWatchAd = async () => {
    setAdLoading(true)
    toast.loading('Loading sponsor video...', { id: 'monetag-ad' })
    try {
      const watched = await showRewardedInterstitial()
      toast.dismiss('monetag-ad')
      if (watched) {
        setSpinsLeft((prev) => prev + 1)
        toast.success('🎉 +1 Free Spin added for watching!')
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
        }
      } else {
        toast.error('Ad ended early or no ads available. Try again in a minute!')
      }
    } catch (e) {
      toast.dismiss('monetag-ad')
      toast.error('Could not load ad right now.')
    } finally {
      setAdLoading(false)
    }
  }

  // Share referral link to get spins
  const handleShareReferral = () => {
    const botUser = 'hashbee_bot'
    const refCode = user?.telegram_id || ''
    const refUrl = `https://t.me/${botUser}?start=ref_${refCode}`
    const shareText = encodeURIComponent(`🐝 Join HashBee & Spin the Lucky Wheel for free USDT, GRAM & Mining Power! 🎁\n\n${refUrl}`)
    const tgUrl = `https://t.me/share/url?url=${refUrl}&text=${shareText}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl)
    } else {
      navigator.clipboard.writeText(refUrl)
      toast.success('Invite link copied! Send to friends for +3 spins.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-28 px-4 pt-4 text-stone-100 max-w-md mx-auto relative overflow-hidden">
      {showConfetti && <ReactConfetti numberOfPieces={140} recycle={false} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999 }} />}

      {/* Top Banner */}
      <div className="flex items-center justify-between bg-[#14221c] border border-[#233f33] rounded-2xl p-3.5 mb-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎡</span>
          <div>
            <h1 className="text-sm font-black text-[#e6f0ec] tracking-wide uppercase">Lucky Honey Wheel</h1>
            <p className="text-[11px] text-[#6e8a7e]">Spin & Win Crypto & Hashrate!</p>
          </div>
        </div>
        <div className="bg-[#1b3327] border border-[#29523f] px-3 py-1.5 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-[#10b981] block">Spins Left</span>
          <span className="text-lg font-black text-amber-400">{spinsLeft}</span>
        </div>
      </div>

      {/* Wheel Area */}
      <div className="relative flex flex-col items-center justify-center my-3">
        {/* Top Pointer Indicator */}
        <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(251,191,36,0.6)]"></div>
        </div>

        {/* Wheel Canvas Container */}
        <div
          className="relative w-[300px] h-[300px] rounded-full p-2 bg-gradient-to-b from-[#1b3327] to-[#0d1613] shadow-[0_0_35px_rgba(16,185,129,0.25)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
          }}
        >
          <canvas ref={canvasRef} width={284} height={284} className="rounded-full" />
        </div>

        {/* Spin Action Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || spinsLeft <= 0}
          className={`mt-6 w-full max-w-xs py-3.5 px-6 rounded-2xl font-black text-base uppercase tracking-wider transition-all duration-200 transform active:scale-95 shadow-xl flex items-center justify-center gap-2 ${
            spinsLeft > 0 && !isSpinning
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 hover:brightness-110 animate-pulse'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
          }`}
        >
          {isSpinning ? (
            <span className="flex items-center gap-2 text-stone-900">
              <span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></span>
              Spinning Wheel...
            </span>
          ) : spinsLeft > 0 ? (
            <span>SPIN NOW ({spinsLeft} Left) 🎰</span>
          ) : (
            <span>No Spins Left (Get More Below)</span>
          )}
        </button>
      </div>

      {/* Won Reward Alert Modal */}
      {wonReward && (
        <div className="bg-gradient-to-br from-[#1b3327] to-[#12221a] border-2 border-amber-400/80 rounded-2xl p-4 mt-4 shadow-2xl text-center animate-fade-in">
          <span className="text-3xl mb-1 block">{wonReward.icon}</span>
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">Congratulations!</p>
          <h3 className="text-xl font-black text-white">{wonReward.label}</h3>
          <p className="text-xs text-stone-300 mt-1">{wonReward.sublabel} credited to your account!</p>
        </div>
      )}

      {/* Get More Spins Actions */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 px-1">Get Extra Spins</h3>

        {/* Watch Ad for Spin */}
        <button
          onClick={handleWatchAd}
          disabled={adLoading || isSpinning}
          className="w-full bg-[#13281f] hover:bg-[#1a382b] border border-[#234d3a] p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-[#1b382b] rounded-xl">🎬</span>
            <div className="text-left">
              <span className="text-sm font-bold text-[#e6f0ec] block">Watch Sponsor Ad</span>
              <span className="text-[11px] text-[#10b981]">Watch a 15s video ➔ +1 Free Spin</span>
            </div>
          </div>
          <span className="text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl">
            +1 SPIN
          </span>
        </button>

        {/* Invite Friends for 3 Spins */}
        <button
          onClick={handleShareReferral}
          className="w-full bg-[#13281f] hover:bg-[#1a382b] border border-[#234d3a] p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-[#1b382b] rounded-xl">👥</span>
            <div className="text-left">
              <span className="text-sm font-bold text-[#e6f0ec] block">Invite 1 Friend</span>
              <span className="text-[11px] text-[#60a5fa]">Share invite link ➔ +3 Free Spins</span>
            </div>
          </div>
          <span className="text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl">
            +3 SPINS
          </span>
        </button>
      </div>

      {/* Rewards Odds & Legend */}
      <div className="mt-6 bg-[#0f1715]/90 border border-[#1e3028] rounded-2xl p-3.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-2">
          Available Wheel Rewards
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {SLICES.map((s) => (
            <div key={s.id} className="flex items-center gap-2 bg-[#14211c] px-2.5 py-1.5 rounded-xl border border-[#1f362c]">
              <span>{s.icon}</span>
              <span className="font-bold text-stone-200">{s.label}</span>
              <span className="text-[10px] text-stone-500 ml-auto">{s.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
