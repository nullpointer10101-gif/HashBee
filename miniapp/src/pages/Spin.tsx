import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fetchReferrals, fetchSpinEpoch, claimSpinReward } from '../services/api'
import toast from 'react-hot-toast'
import ReactConfetti from 'react-confetti'

interface ReferralItem {
  id: string
  username: string
  first_name: string
  joined_at: string
  status?: string
}

interface WheelSlice {
  id: number
  label: string
  sublabel: string
  icon: string
  color1: string
  color2: string
  textColor: string
  weight: number
  type: 'usdt' | 'gram' | 'hash' | 'spin'
  amount: number
}

// 8 wheel slices configured with 0.002 GRAM & 0.001 USDT (50% drop rate), plus 0.01 USDT and 1 GRAM jackpot (0% drop rate)
const SLICES: WheelSlice[] = [
  { id: 0, label: '0.002 GRAM', sublabel: 'Crypto Drop', icon: '🪙', color1: '#261b0c', color2: '#382812', textColor: '#fbbf24', weight: 25.0, type: 'gram', amount: 0.002 },
  { id: 1, label: '0.001 USDT', sublabel: 'Cash Win', icon: '💵', color1: '#0e2b1e', color2: '#174530', textColor: '#4ade80', weight: 25.0, type: 'usdt', amount: 0.001 },
  { id: 2, label: '1 HASH', sublabel: 'Mining Boost', icon: '⚡', color1: '#112920', color2: '#16382a', textColor: '#34d399', weight: 25.0, type: 'hash', amount: 1 },
  { id: 3, label: '+1 SPIN', sublabel: 'Free Re-spin', icon: '🔄', color1: '#142338', color2: '#1e3554', textColor: '#60a5fa', weight: 18.0, type: 'spin', amount: 1 },
  { id: 4, label: '2 HASH', sublabel: 'Double Hash', icon: '⚡', color1: '#0c3321', color2: '#134f33', textColor: '#10b981', weight: 5.0, type: 'hash', amount: 2 },
  { id: 5, label: '0.01 USDT', sublabel: 'Big Cash', icon: '💵', color1: '#09361c', color2: '#12572e', textColor: '#22c55e', weight: 1.0, type: 'usdt', amount: 0.01 },
  { id: 6, label: '5 HASH', sublabel: 'Mega Boost', icon: '⚡', color1: '#153325', color2: '#1f4a36', textColor: '#6ee7b7', weight: 1.0, type: 'hash', amount: 5 },
  { id: 7, label: '1 GRAM', sublabel: '★ JACKPOT ★', icon: '👑', color1: '#3d1d05', color2: '#5e2d09', textColor: '#ffd700', weight: 0, type: 'gram', amount: 1.0 },
]

export const Spin: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()

  // Spins balance: authoritative from server database profile
  const [spinsLeft, setSpinsLeft] = useState<number>(() => {
    return user?.spin_balance !== undefined ? user.spin_balance : 1
  })
  const [recentFriends, setRecentFriends] = useState<ReferralItem[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [wonReward, setWonReward] = useState<WheelSlice | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Clean legacy local storage keys from previous versions
  useEffect(() => {
    try {
      for (let i = 1; i <= 10; i++) {
        localStorage.removeItem(`hb_spins_v${i}`)
        localStorage.removeItem(`hb_spin_credited_ids_v${i}`)
      }
      localStorage.removeItem('hb_spins')
      localStorage.removeItem('hb_spin_credited_ids')
    } catch {
      // Ignore
    }
  }, [])

  // Sync spinsLeft whenever authoritative user profile updates
  useEffect(() => {
    if (user?.spin_balance !== undefined) {
      setSpinsLeft(user.spin_balance)
    }
  }, [user?.spin_balance])

  // Load friends/referrals list (filtered by spin epoch so only fresh new invites are shown)
  useEffect(() => {
    if (!user) return

    const loadReferrals = async () => {
      try {
        const [data, epochStr] = await Promise.all([
          fetchReferrals(),
          fetchSpinEpoch(),
        ])
        const allRefs = data?.referrals || []
        const epochMs = epochStr ? new Date(epochStr).getTime() : 0

        // Filter: only show referrals that joined after the spin reset epoch
        const freshInvites = allRefs.filter((r: ReferralItem) => {
          if (!r.joined_at) return false
          const joinedMs = new Date(r.joined_at).getTime()
          return joinedMs >= epochMs
        })

        setRecentFriends(freshInvites)
      } catch (err) {
        // Silently catch network blip
      }
    }

    loadReferrals()
    const interval = setInterval(loadReferrals, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Render High-DPR Crisp Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 2
    const size = 320
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const center = size / 2
    const radius = center - 14
    const totalSlices = SLICES.length
    const arc = (2 * Math.PI) / totalSlices

    ctx.clearRect(0, 0, size, size)

    // Outer Glowing Metallic Gold Bezel
    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, radius + 10, 0, 2 * Math.PI)
    const goldGrad = ctx.createLinearGradient(0, 0, size, size)
    goldGrad.addColorStop(0, '#ffe57f')
    goldGrad.addColorStop(0.3, '#f59e0b')
    goldGrad.addColorStop(0.7, '#d97706')
    goldGrad.addColorStop(1, '#fffae0')
    ctx.strokeStyle = goldGrad
    ctx.lineWidth = 9
    ctx.stroke()
    ctx.restore()

    // Outer LED Lights
    const numBulbs = 24
    for (let b = 0; b < numBulbs; b++) {
      const bulbAngle = (b * 2 * Math.PI) / numBulbs
      const bx = center + (radius + 10) * Math.cos(bulbAngle)
      const by = center + (radius + 10) * Math.sin(bulbAngle)
      ctx.beginPath()
      ctx.arc(bx, by, 2.5, 0, 2 * Math.PI)
      ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#fbbf24'
      ctx.fill()
    }

    // Draw Slices with Rich Radial Gradients
    SLICES.forEach((slice, i) => {
      const angle = i * arc
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, angle, angle + arc)
      ctx.lineTo(center, center)

      const grad = ctx.createRadialGradient(center, center, 10, center, center, radius)
      grad.addColorStop(0, slice.color2)
      grad.addColorStop(1, slice.color1)
      ctx.fillStyle = grad
      ctx.fill()

      // Slice Divider Line
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Slice Typography & Icons
      ctx.translate(center, center)
      ctx.rotate(angle + arc / 2)
      ctx.textAlign = 'right'

      // Amount / Label
      ctx.fillStyle = slice.textColor
      ctx.font = '900 13px Outfit, -apple-system, sans-serif'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4
      ctx.fillText(slice.label, radius - 30, 4)

      // Icon
      ctx.font = '16px sans-serif'
      ctx.shadowBlur = 0
      ctx.fillText(slice.icon, radius - 8, 5)

      ctx.restore()
    })

    // Center Gold Metallic Cap
    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, 28, 0, 2 * Math.PI)
    const centerGrad = ctx.createRadialGradient(center - 5, center - 5, 2, center, center, 28)
    centerGrad.addColorStop(0, '#fef08a')
    centerGrad.addColorStop(0.5, '#eab308')
    centerGrad.addColorStop(1, '#78350f')
    ctx.fillStyle = centerGrad
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡', center, center)
    ctx.restore()
  }, [])

  // Weighted random picker (strictly excludes 0-weight slices)
  const pickRandomReward = (): WheelSlice => {
    const validSlices = SLICES.filter((s) => s.weight > 0)
    const totalWeight = validSlices.reduce((sum, s) => sum + s.weight, 0)
    let randomNum = Math.random() * totalWeight
    for (const slice of validSlices) {
      if (randomNum < slice.weight) {
        return slice
      }
      randomNum -= slice.weight
    }
    return validSlices[0] || SLICES[0]
  }

  // Fast & Snappy Spin Action (2.2s)
  const handleSpin = async () => {
    if (isSpinning) return
    if (spinsLeft <= 0) {
      toast.error('No spins left! For each invite you get 1 free spin.')
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

    // Target landing under the top pointer
    const extraSpins = 4 * 360 // 4 full rotations
    const targetSliceCenter = sliceIndex * sliceAngle + sliceAngle / 2
    const stopAngle = 360 - targetSliceCenter + 270
    const finalRotation = rotation + extraSpins + (stopAngle - (rotation % 360))

    setRotation(finalRotation)

    // Spin animation duration: 2.2 seconds
    setTimeout(async () => {
      try {
        const res = await claimSpinReward(
          selectedReward.type,
          selectedReward.label,
          selectedReward.amount,
          `spin_${Date.now()}`
        )

        if (res.new_spin_balance !== undefined) {
          setSpinsLeft(res.new_spin_balance)
        }

        setWonReward(selectedReward)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3500)

        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
        }

        if (selectedReward.type === 'spin') {
          toast.success('🎉 You won +1 FREE SPIN!')
        } else {
          toast.success(`🎉 You won ${selectedReward.label}! Credited instantly.`)
        }

        if (refreshUser) refreshUser()
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error || 'Failed to claim spin reward'
        toast.error(errorMsg)
        if (refreshUser) refreshUser()
      } finally {
        setIsSpinning(false)
      }
    }, 2200)
  }

  // Share referral link to get +1 spin
  const handleShareReferral = () => {
    const botUser = 'hashbee_bot'
    const refCode = user?.telegram_id || ''
    const refUrl = `https://t.me/${botUser}?start=${refCode}`
    const shareText = encodeURIComponent(`🐝 Spin the Lucky Wheel on HashBee to win USDT, GRAM & Mining Power! 🎁\n\n${refUrl}`)
    const tgUrl = `https://t.me/share/url?url=${refUrl}&text=${shareText}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl)
    } else {
      navigator.clipboard.writeText(refUrl)
      toast.success('Invite link copied! Send to friends for 1 free spin each.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-28 px-4 pt-4 text-stone-100 max-w-md mx-auto relative overflow-hidden">
      {showConfetti && <ReactConfetti numberOfPieces={130} recycle={false} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999 }} />}

      {/* Top Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#12231b] via-[#1a382b] to-[#12231b] border border-[#2c5743] rounded-2xl p-3.5 mb-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-pulse">🎡</span>
          <div>
            <h1 className="text-sm font-black text-[#e6f0ec] tracking-wide uppercase">Lucky Honey Wheel</h1>
            <p className="text-[11px] text-[#78a591]">For each invite you get 1 free spin</p>
          </div>
        </div>
        <div className="bg-[#0f1c16] border border-[#234535] px-3.5 py-1.5 rounded-xl text-center shadow-inner">
          <span className="text-[9px] uppercase font-black text-[#10b981] block">Spins</span>
          <span className="text-xl font-black text-amber-400">{spinsLeft}</span>
        </div>
      </div>

      {/* High-Quality Wheel Section */}
      <div className="relative flex flex-col items-center justify-center my-2">
        {/* Top Pointer Indicator */}
        <div className="absolute -top-3.5 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_10px_rgba(251,191,36,0.9)]">
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[24px] border-t-amber-400"></div>
        </div>

        {/* Wheel Container with 3D Depth & Lighting */}
        <div
          className="relative w-[320px] h-[320px] rounded-full p-2 bg-gradient-to-b from-[#1b3d2c] via-[#0f2118] to-[#070e0a] shadow-[0_0_45px_rgba(16,185,129,0.35)] border-2 border-amber-400/30"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 2.2s cubic-bezier(0.12, 0.8, 0.2, 1.0)' : 'none',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '300px', height: '300px' }} className="rounded-full" />
        </div>

        {/* Fast Spin Action Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || spinsLeft <= 0}
          className={`mt-5 w-full max-w-xs py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider transition-all duration-150 transform active:scale-95 shadow-2xl flex items-center justify-center gap-2 ${
            spinsLeft > 0 && !isSpinning
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-stone-950 hover:brightness-110 shadow-[0_0_25px_rgba(251,191,36,0.4)]'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
          }`}
        >
          {isSpinning ? (
            <span className="flex items-center gap-2 text-stone-900">
              <span className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></span>
              Fast Spinning...
            </span>
          ) : spinsLeft > 0 ? (
            <span>SPIN NOW ({spinsLeft} Left) 🎰</span>
          ) : (
            <span>No Spins Left (Invite Friends)</span>
          )}
        </button>
      </div>

      {/* Won Reward Alert Card */}
      {wonReward && (
        <div className="bg-gradient-to-br from-[#16382a] via-[#1b4232] to-[#10241c] border-2 border-amber-400 rounded-3xl p-4 mt-3 shadow-2xl text-center animate-fade-in">
          <span className="text-3xl mb-1 block">{wonReward.icon}</span>
          <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Congratulations!</p>
          <h3 className="text-xl font-black text-white mt-0.5">{wonReward.label}</h3>
          <p className="text-xs text-emerald-300 font-medium mt-0.5">{wonReward.sublabel} credited!</p>
        </div>
      )}

      {/* Referral Viral Share */}
      <div className="mt-4">
        <button
          onClick={handleShareReferral}
          className="w-full bg-gradient-to-r from-[#142820] to-[#1b3b2e] hover:from-[#1b3b2e] hover:to-[#224c3b] border border-[#2d614b] p-3.5 rounded-2xl flex items-center justify-between transition-all duration-150 active:scale-[0.98] shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-[#10241b] rounded-xl border border-[#234535]">👥</span>
            <div className="text-left">
              <span className="text-sm font-black text-[#e6f0ec] block">For each invite you get 1 free spin</span>
              <span className="text-[11px] text-[#60a5fa] font-semibold">Share your link ➔ Instant +1 spin on signup!</span>
            </div>
          </div>
          <span className="text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 px-3.5 py-1.5 rounded-xl shadow">
            +1 SPIN
          </span>
        </button>
      </div>

      {/* Recently Joined Friends Section */}
      <div className="mt-4 bg-[#0d1713]/95 border border-[#1e362a] rounded-2xl p-3.5 shadow-inner">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#1b2f25]">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <span>👥</span> New Invited Friends
          </span>
          <span className="text-[10px] font-bold text-[#10b981]">
            {recentFriends.length} Invites
          </span>
        </div>

        {recentFriends.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentFriends.map((friend, idx) => (
              <div
                key={friend.id || idx}
                className="flex items-center justify-between bg-[#12211a] px-3 py-2 rounded-xl border border-[#1d382b]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#1a382b] flex items-center justify-center text-xs font-bold text-amber-300">
                    🐝
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">
                      {friend.first_name || friend.username || 'Friend'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {friend.username ? `@${friend.username}` : 'Friend joined'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] font-black text-emerald-400">+1 SPIN</span>
                  <span className="text-[9px] text-emerald-300">✨</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 px-2">
            <span className="text-2xl block mb-1">🎁</span>
            <p className="text-xs font-bold text-stone-300">No new friends joined yet</p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Share your invite link above — for each new friend who signs up, you'll receive +1 free spin immediately!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
