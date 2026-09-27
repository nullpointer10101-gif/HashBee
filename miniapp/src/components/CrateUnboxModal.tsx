import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactConfetti from 'react-confetti'
import { OpenCrateResult } from '../services/api'
import { crateAudio } from '../utils/crateAudio'
import { CrateAnimatedBox } from './CrateAnimatedBox'
import { FootballRewardCard } from './FootballRewardCard'

export interface ReelItem {
  id: string
  title: string
  subtitle: string
  icon: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'JACKPOT'
  rarityColor: string
  rarityBg: string
}

interface CrateUnboxModalProps {
  isOpen: boolean
  tierId: 'bronze' | 'silver' | 'gold' | 'god'
  tierName: string
  accentColor: string
  glowColor: string
  icon: string
  priceGram: number
  priceUsdt: number
  result: OpenCrateResult | null
  pityCount: number
  onClose: () => void
  onOpenAgain: () => void
}

const REEL_POOL: Record<string, ReelItem[]> = {
  bronze: [
    { id: 'b1', title: '+25 GHS Power', subtitle: 'Cloud Mining Power', icon: '⚡', rarity: 'COMMON', rarityColor: '#94a3b8', rarityBg: 'bg-stone-800' },
    { id: 'b2', title: '+60 GHS Power', subtitle: 'Mining Power Boost', icon: '⚡', rarity: 'UNCOMMON', rarityColor: '#34d399', rarityBg: 'bg-emerald-950' },
    { id: 'b3', title: '+0.25 G + 50 GHS', subtitle: 'Crypto & Hashrate', icon: '💎', rarity: 'RARE', rarityColor: '#60a5fa', rarityBg: 'bg-blue-950' },
    { id: 'b4', title: '+1.00 G + 100 GHS', subtitle: '🔥 HIGHEST PRIZE 1.00 G', icon: '👑', rarity: 'JACKPOT', rarityColor: '#f59e0b', rarityBg: 'bg-amber-950' },
  ],
  silver: [
    { id: 's1', title: '+0.35 GRAM Drop', subtitle: 'Base Return', icon: '💎', rarity: 'COMMON', rarityColor: '#94a3b8', rarityBg: 'bg-stone-800' },
    { id: 's2', title: '+3.50 GRAM Drop', subtitle: '91 OVR Surge Return', icon: '💎', rarity: 'UNCOMMON', rarityColor: '#34d399', rarityBg: 'bg-emerald-950' },
    { id: 's3', title: '+5.00 GRAM Mega', subtitle: '👑 95 OVR MEGA JACKPOT', icon: '👑', rarity: 'RARE', rarityColor: '#60a5fa', rarityBg: 'bg-blue-950' },
    { id: 's4', title: '+10.00 GRAM God', subtitle: '🔥 98 OVR ULTRA MULTIPLIER', icon: '👑', rarity: 'JACKPOT', rarityColor: '#f59e0b', rarityBg: 'bg-amber-950' },
  ],
  gold: [
    { id: 'g1', title: '+0.75 GRAM Drop', subtitle: 'Base Return', icon: '💎', rarity: 'COMMON', rarityColor: '#94a3b8', rarityBg: 'bg-stone-800' },
    { id: 'g2', title: '+6.00 GRAM Royal', subtitle: '93 OVR Royal Surge', icon: '💎', rarity: 'UNCOMMON', rarityColor: '#34d399', rarityBg: 'bg-emerald-950' },
    { id: 'g3', title: '+10.00 GRAM Gold', subtitle: '👑 97 OVR GOLDEN JACKPOT', icon: '👑', rarity: 'RARE', rarityColor: '#60a5fa', rarityBg: 'bg-blue-950' },
    { id: 'g4', title: '+20.00 GRAM Deity', subtitle: '🔥 99 OVR SOVEREIGN VAULT', icon: '👑', rarity: 'JACKPOT', rarityColor: '#f59e0b', rarityBg: 'bg-amber-950' },
  ],
  god: [
    { id: 'gd1', title: '+1.20 GRAM Drop', subtitle: 'Base Mortal Return', icon: '💎', rarity: 'COMMON', rarityColor: '#a855f7', rarityBg: 'bg-purple-950' },
    { id: 'gd2', title: '+12.00 GRAM Deity', subtitle: '95 OVR Divine Surge', icon: '💎', rarity: 'UNCOMMON', rarityColor: '#ec4899', rarityBg: 'bg-pink-950' },
    { id: 'gd3', title: '+25.00 GRAM God', subtitle: '⚡ 99 OVR SUPREME GOD', icon: '👁️', rarity: 'RARE', rarityColor: '#38bdf8', rarityBg: 'bg-sky-950' },
    { id: 'gd4', title: '+50.00 GRAM Ultra', subtitle: '🔥 99 OVR CELESTIAL TOP', icon: '⚡', rarity: 'JACKPOT', rarityColor: '#f59e0b', rarityBg: 'bg-amber-950' },
  ],
}

export const CrateUnboxModal: React.FC<CrateUnboxModalProps> = ({
  isOpen,
  tierId,
  tierName,
  accentColor,
  glowColor,
  icon,
  priceGram,
  result,
  pityCount,
  onClose,
  onOpenAgain,
}) => {
  const [phase, setPhase] = useState<'shaking' | 'rolling' | 'revealed'>('shaking')
  const [reelItems, setReelItems] = useState<ReelItem[]>([])
  const [reelOffset, setReelOffset] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const reelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    setPhase('shaking')
    setShowConfetti(false)
    crateAudio.playSuspenseCharge()

    const pool = REEL_POOL[tierId] || REEL_POOL.god || REEL_POOL.gold
    const generatedList: ReelItem[] = []

    for (let i = 0; i < 35; i++) {
      const rand = pool[Math.floor(Math.random() * pool.length)]
      generatedList.push({ ...rand, id: `strip-${i}-${Math.random()}` })
    }

    const targetIdx = 30

    if (result) {
      const gramDrop = result.reward?.reward_gram || 0
      const ghsDrop = result.reward?.reward_ghs || 0
      const isJackpot = gramDrop >= 1 || ghsDrop >= 100
      const isRare = gramDrop >= 0.25 || ghsDrop >= 50

      generatedList[targetIdx] = {
        id: 'winner-item',
        title: result.reward.summary_text,
        subtitle: `${result.reward.rarity_label} Reward`,
        icon: isJackpot ? '👑' : ghsDrop > 0 ? '⚡' : '💎',
        rarity: isJackpot ? 'JACKPOT' : isRare ? 'RARE' : 'UNCOMMON',
        rarityColor: result.reward.rarity_color || '#fbbf24',
        rarityBg: isJackpot ? 'bg-amber-950' : isRare ? 'bg-sky-950' : 'bg-emerald-950',
      }
    }

    setReelItems(generatedList)

    const shakeTimer = setTimeout(() => {
      setPhase('rolling')
      crateAudio.playBoxBurst()

      let tickCount = 0
      const tickInterval = setInterval(() => {
        if (tickCount < 24) {
          crateAudio.playRouletteTick(600 + tickCount * 25)
          tickCount++
        } else {
          clearInterval(tickInterval)
        }
      }, 90)

      const itemWidth = 142
      const targetOffset = targetIdx * itemWidth - 140 + Math.random() * 30 - 15
      setReelOffset(targetOffset)

      const revealTimer = setTimeout(() => {
        setPhase('revealed')
        setShowConfetti(true)
        const isJackpot = result?.reward?.rarity_label?.includes('JACKPOT') || result?.reward?.rarity_label?.includes('TOP') || false
        crateAudio.playWinFanfare(isJackpot)
        crateAudio.playCoins()

        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
        }
      }, 2400)

      return () => clearTimeout(revealTimer)
    }, 1200)

    return () => clearTimeout(shakeTimer)
  }, [isOpen, result, tierId])

  if (!isOpen) return null

  const wonGram = result?.reward?.reward_gram || 0
  const wonGhs = result?.reward?.reward_ghs || 0

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex flex-col items-center justify-center p-3 select-none overflow-y-auto">
        {showConfetti && (
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={260}
            recycle={false}
            gravity={0.25}
          />
        )}

        {/* Ambient background aura */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-35"
          style={{ backgroundColor: accentColor }}
        />

        {/* Main Modal Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl bg-[#0d1411] border-2 border-[#20342a] shadow-2xl relative overflow-hidden flex flex-col p-4 text-center z-10 my-auto"
        >
          {/* Header Tier Pill */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-black text-stone-300">
              <span>{icon}</span>
              <span>{tierName}</span>
            </div>

            {/* Pity Counter Pill */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 animate-pulse">
              <span>💎</span>
              <span>PITY: {pityCount % 3 === 0 ? '👑 GUARANTEED NEXT' : `${(pityCount % 3)}/3 TO TOP`}</span>
            </div>
          </div>

          {/* PHASE 1: SUSPENSE SHAKING */}
          {phase === 'shaking' && (
            <div className="py-6 flex flex-col items-center">
              <div className="my-4">
                <CrateAnimatedBox
                  tierId={tierId}
                  tierName={tierName}
                  accentColor={accentColor}
                  glowColor={glowColor}
                  icon={icon}
                  isOpening={true}
                  size="lg"
                />
              </div>

              <motion.h3
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-lg font-black text-white uppercase tracking-wider mt-4"
              >
                OPENING FOOTBALL PACK...
              </motion.h3>
              <p className="text-xs text-amber-400/90 font-bold mt-1">
                Flipping holographic player card
              </p>
            </div>
          )}

          {/* PHASE 2: CS:GO / GACHA ROULETTE REEL */}
          {phase === 'rolling' && (
            <div className="py-4 flex flex-col items-center">
              <div className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                ROLLING CARD PACK...
              </div>

              {/* Roulette Viewport with Selection Marker */}
              <div className="relative w-full overflow-hidden rounded-2xl bg-[#090e0c] border-2 border-amber-500/50 p-2 shadow-inner">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 z-20 shadow-[0_0_12px_#f59e0b]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400 clip-triangle z-20" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400 rotate-180 clip-triangle z-20" />

                <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#090e0c] to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#090e0c] to-transparent z-10 pointer-events-none" />

                <motion.div
                  ref={reelRef}
                  initial={{ x: 0 }}
                  animate={{ x: -reelOffset }}
                  transition={{ duration: 2.3, ease: [0.15, 0.9, 0.25, 1] }}
                  className="flex gap-3 py-2 items-center"
                >
                  {reelItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{ borderColor: item.rarityColor }}
                      className={`w-32 h-36 shrink-0 rounded-xl border-2 ${item.rarityBg} p-2.5 flex flex-col items-center justify-between text-center shadow-lg relative overflow-hidden`}
                    >
                      <div className="w-full flex justify-end">
                        <span
                          style={{ color: item.rarityColor }}
                          className="text-[8px] font-black uppercase tracking-wider"
                        >
                          {item.rarity}
                        </span>
                      </div>
                      <span className="text-3xl filter drop-shadow-md">{item.icon}</span>
                      <div>
                        <div className="text-[11px] font-black text-white leading-tight">
                          {item.title}
                        </div>
                        <div className="text-[9px] text-stone-400 font-semibold mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <p className="text-[10px] text-stone-400 font-bold mt-3 animate-pulse">
                ⚽ Pack walkout animation in progress...
              </p>
            </div>
          )}

          {/* PHASE 3: FOOTBALL PACK CARD WALKOUT REVEAL */}
          {phase === 'revealed' && result && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-1 flex flex-col items-center"
            >
              {/* Spinning Sunburst rays behind */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-20 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                }}
              />

              <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <span>⚽</span>
                <span>FUT 26 PACK WALKOUT</span>
                <span>✨</span>
              </div>

              {/* FOOTBALL / FIFA CARD PRESENTATION */}
              <FootballRewardCard result={result} tierId={tierId} />

              {/* Instant Credit Stats */}
              <div className="w-full bg-[#131f1a] border border-[#23382f] rounded-2xl p-2.5 my-2 space-y-1 text-left text-xs">
                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider flex justify-between">
                  <span>Instantly Credited:</span>
                  <span className="text-emerald-400 font-bold">✓ Direct to Account</span>
                </div>
                {wonGram > 0 && (
                  <div className="flex items-center justify-between text-amber-300 font-black text-sm">
                    <span>💎 GRAM Won:</span>
                    <span className="font-mono">+{wonGram.toFixed(2)} GRAM</span>
                  </div>
                )}
                {wonGhs > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>⚡ Mining Hashrate:</span>
                    <span className="font-mono">+{wonGhs.toFixed(0)} GHS</span>
                  </div>
                )}
              </div>

              {/* Dopamine CTA Buttons */}
              <div className="w-full space-y-2 mt-1">
                {/* 1-Tap Open Another Button */}
                <button
                  onClick={() => {
                    crateAudio.playClick()
                    onOpenAgain()
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🔥</span>
                  <span>OPEN ANOTHER ({priceGram} GRAM)</span>
                  <span>➔</span>
                </button>

                {/* Collect & Close */}
                <button
                  onClick={() => {
                    crateAudio.playClick()
                    onClose()
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#192721] border border-[#273d33] text-stone-300 font-extrabold text-xs uppercase hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  COLLECT REWARD & CLOSE
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
