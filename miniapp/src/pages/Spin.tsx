import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fetchReferrals, claimSpinReward, fetchSpinStatus } from '../services/api'
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

// 8 colorful wheel slices for Crypto Mine Lucky Wheel
const SLICES: WheelSlice[] = [
  { id: 0, label: '0.002 GRAM', sublabel: 'Crypto Drop', icon: '💎', color1: '#3b82f6', color2: '#2563eb', textColor: '#ffffff', weight: 25.0, type: 'gram', amount: 0.002 },
  { id: 1, label: '0.001 USDT', sublabel: 'Cash Win', icon: '💵', color1: '#10b981', color2: '#059669', textColor: '#ffffff', weight: 25.0, type: 'usdt', amount: 0.001 },
  { id: 2, label: '1 HASH', sublabel: 'Mining Boost', icon: '⚡', color1: '#8b5cf6', color2: '#7c3aed', textColor: '#ffffff', weight: 25.0, type: 'hash', amount: 1 },
  { id: 3, label: '+1 SPIN', sublabel: 'Free Re-spin', icon: '🔄', color1: '#06b6d4', color2: '#0891b2', textColor: '#ffffff', weight: 18.0, type: 'spin', amount: 1 },
  { id: 4, label: '2 HASH', sublabel: 'Double Hash', icon: '⚡', color1: '#10b981', color2: '#047857', textColor: '#ffffff', weight: 5.0, type: 'hash', amount: 2 },
  { id: 5, label: '0.01 USDT', sublabel: 'Big Cash', icon: '💵', color1: '#ec4899', color2: '#db2777', textColor: '#ffffff', weight: 1.0, type: 'usdt', amount: 0.01 },
  { id: 6, label: '5 HASH', sublabel: 'Mega Boost', icon: '⚡', color1: '#a855f7', color2: '#9333ea', textColor: '#ffffff', weight: 1.0, type: 'hash', amount: 5 },
  { id: 7, label: '1 GRAM', sublabel: '★ JACKPOT ★', icon: '👑', color1: '#f59e0b', color2: '#d97706', textColor: '#ffffff', weight: 0, type: 'gram', amount: 1.0 },
]

export const Spin: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()

  const [spinsLeft, setSpinsLeft] = useState<number>(() => {
    return user?.spin_balance !== undefined ? user.spin_balance : 1
  })
  const [spinsToday, setSpinsToday] = useState<number>(0)
  const [dailyLimit, setDailyLimit] = useState<number>(10)
  const [recentFriends, setRecentFriends] = useState<ReferralItem[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [wonReward, setWonReward] = useState<WheelSlice | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (user?.spin_balance !== undefined) {
      setSpinsLeft(user.spin_balance)
    }
  }, [user?.spin_balance])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await fetchSpinStatus()
        if (status) {
          if (status.spins_today !== undefined) setSpinsToday(status.spins_today)
          if (status.daily_limit !== undefined) setDailyLimit(status.daily_limit)
          if (status.spin_balance !== undefined) setSpinsLeft(status.spin_balance)
        }
      } catch (err) {
        // Fallback
      }

      try {
        const refData = await fetchReferrals()
        if (refData?.referrals) {
          const list: ReferralItem[] = refData.referrals.map((r: any) => ({
            id: String(r.id || Math.random()),
            username: r.username || '',
            first_name: r.first_name || r.username || 'Partner',
            joined_at: r.joined_at || new Date().toISOString(),
            status: r.status,
          }))
          setRecentFriends(list)
        }
      } catch (err) {
        // Ignore
      }
    }

    loadStatus()
  }, [])

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 300
    canvas.width = size * 2
    canvas.height = size * 2
    ctx.scale(2, 2)

    const center = size / 2
    const radius = center - 8
    const sliceAngle = (2 * Math.PI) / SLICES.length

    ctx.clearRect(0, 0, size, size)

    SLICES.forEach((slice, i) => {
      const angle = i * sliceAngle
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, angle, angle + sliceAngle)
      ctx.closePath()

      const grad = ctx.createRadialGradient(center, center, 20, center, center, radius)
      grad.addColorStop(0, slice.color1)
      grad.addColorStop(1, slice.color2)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(angle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      ctx.fillStyle = slice.textColor
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif'
      ctx.fillText(slice.label, radius - 26, 0)

      ctx.font = '14px sans-serif'
      ctx.fillText(slice.icon, radius - 8, 0)

      ctx.restore()
      ctx.restore()
    })

    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, 24, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#0088ff'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🤖', center, center)
    ctx.restore()
  }, [])

  useEffect(() => {
    drawWheel()
  }, [drawWheel])

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

  const handleSpin = async () => {
    if (isSpinning) return
    if (spinsToday >= dailyLimit) {
      toast.error(`Daily limit reached (${spinsToday}/${dailyLimit} spins). Resets at 00:00 UTC.`)
      return
    }
    if (spinsLeft <= 0) {
      toast.error('No spins left! Invite friends for 1 free spin each.')
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

    const extraSpins = 4 * 360
    const targetSliceCenter = sliceIndex * sliceAngle + sliceAngle / 2
    const stopAngle = 360 - targetSliceCenter + 270
    const finalRotation = rotation + extraSpins + (stopAngle - (rotation % 360))

    setRotation(finalRotation)

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
        if ((res as any).spins_today !== undefined) {
          setSpinsToday((res as any).spins_today)
        } else {
          setSpinsToday((prev) => prev + 1)
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
        toast.error(err?.response?.data?.error || 'Failed to claim spin reward')
        if (refreshUser) refreshUser()
      } finally {
        setIsSpinning(false)
      }
    }, 2200)
  }

  const handleShareReferral = () => {
    const botUser = import.meta.env.VITE_BOT_USERNAME || 'hashbe_bot'
    const refCode = user?.telegram_id || ''
    const refUrl = `https://t.me/${botUser}?start=${refCode}`
    const shareText = encodeURIComponent(`🐝 Spin the Lucky Wheel on HashBee to win USDT & Hashrate! 🎁\n\n${refUrl}`)
    const tgUrl = `https://t.me/share/url?url=${refUrl}&text=${shareText}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl)
    } else {
      navigator.clipboard.writeText(refUrl)
      toast.success('Invite link copied! Send to friends for 1 free spin each.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-28 px-4 pt-4 text-[#0f172a] max-w-md mx-auto relative overflow-hidden bg-[#f4f7fb]">
      {showConfetti && <ReactConfetti numberOfPieces={100} recycle={false} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999 }} />}

      {/* Top Banner with Balance and Daily Limit Status */}
      <div className="mine-card p-3.5 mb-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wide">Lucky Wheel Arena</h1>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">1 free spin per invite • 10 daily max</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-center">
            <span className="text-[8px] uppercase font-bold text-slate-400 block">Today</span>
            <span className={`text-xs font-mono font-bold ${spinsToday >= dailyLimit ? 'text-rose-500' : 'text-slate-800'}`}>
              {spinsToday}/{dailyLimit}
            </span>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-center">
            <span className="text-[8px] uppercase font-bold text-[#0088ff] block">Spins</span>
            <span className="text-sm font-mono font-black text-[#0088ff]">{spinsLeft}</span>
          </div>
        </div>
      </div>

      {/* High-Quality Wheel Section */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#0088ff]"></div>
        </div>

        <div
          className="relative w-[308px] h-[308px] rounded-full p-1 bg-white border-2 border-slate-200 shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 2.2s cubic-bezier(0.12, 0.8, 0.2, 1.0)' : 'none',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '300px', height: '300px' }} className="rounded-full" />
        </div>

        <button
          onClick={handleSpin}
          disabled={isSpinning || spinsLeft <= 0 || spinsToday >= dailyLimit}
          className={`mt-5 w-full max-w-xs py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-150 transform active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
            spinsToday >= dailyLimit
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : spinsLeft > 0 && !isSpinning
              ? 'btn-primary-amber'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSpinning ? (
            <span>SPINNING WHEEL...</span>
          ) : spinsToday >= dailyLimit ? (
            <span>DAILY LIMIT REACHED ({dailyLimit}/{dailyLimit})</span>
          ) : spinsLeft > 0 ? (
            <span>🎰 SPIN WHEEL NOW ({spinsLeft} Left)</span>
          ) : (
            <span>NO SPINS LEFT (INVITE FRIENDS)</span>
          )}
        </button>
      </div>

      {/* Won Reward Alert Card */}
      {wonReward && (
        <div className="card-tint-amber p-4 mt-3 text-center bg-white border-2 border-amber-300 shadow-md">
          <span className="text-3xl mb-1 block">{wonReward.icon}</span>
          <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Reward Unlocked!</p>
          <h3 className="text-xl font-black text-slate-900 mt-0.5">{wonReward.label}</h3>
          <p className="text-xs text-amber-800 font-bold mt-0.5">{wonReward.sublabel} credited instantly</p>
        </div>
      )}

      {/* Referral Viral Share */}
      <div className="mt-3.5">
        <button
          onClick={handleShareReferral}
          className="w-full card-tint-purple p-4 flex items-center justify-between transition-all duration-150 active:scale-98 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👥</span>
            <div className="text-left">
              <span className="text-xs font-black text-purple-950 block">Get 1 free spin for each invite</span>
              <span className="text-[10px] text-purple-800 font-semibold">Share link ➔ Instant +1 spin per friend!</span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white px-3 py-1.5 rounded-xl shadow-sm">
            +1 SPIN
          </span>
        </button>
      </div>
    </div>
  )
}

export default Spin
