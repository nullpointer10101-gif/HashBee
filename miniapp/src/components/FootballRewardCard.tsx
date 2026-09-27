import React from 'react'
import { motion } from 'framer-motion'
import { OpenCrateResult } from '../services/api'

interface FootballRewardCardProps {
  result: OpenCrateResult
  tierId: 'bronze' | 'silver' | 'gold' | 'god'
}

export const FootballRewardCard: React.FC<FootballRewardCardProps> = ({ result, tierId }) => {
  const reward = result.reward
  const isGod = tierId === 'god' || (reward.reward_gram || 0) >= 15
  const isJackpot = reward.rarity_label.includes('JACKPOT') || reward.rarity_label.includes('TOP PRIZE') || (reward.reward_gram || 0) >= 1
  const isRare = (reward.reward_gram || 0) >= 0.25 || (reward.reward_ghs || 0) >= 50

  // Determine FIFA Overall Rating (OVR)
  const rating = isGod ? 99 : isJackpot ? 96 : isRare ? 91 : 86

  // Determine Football Card Theme
  const getCardTheme = () => {
    if (isGod) {
      return {
        cardBg: 'from-[#4a044e] via-[#2e1065] to-[#0f0426]',
        border: 'border-fuchsia-400',
        badgeBg: 'bg-fuchsia-500 text-stone-950',
        foilGradient: 'from-fuchsia-500/30 via-pink-400/20 to-amber-400/30',
        nameBg: 'from-fuchsia-600 via-purple-600 to-pink-600',
        glow: 'rgba(217, 70, 239, 0.75)',
        position: 'GOD',
        rarityTitle: 'CYBER DEITY',
        statColor: 'text-fuchsia-300',
      }
    }
    if (isJackpot) {
      return {
        cardBg: 'from-[#713f12] via-[#422006] to-[#1c1917]',
        border: 'border-yellow-400',
        badgeBg: 'bg-gradient-to-r from-yellow-400 to-amber-300 text-stone-950 font-black',
        foilGradient: 'from-amber-400/40 via-yellow-300/30 to-amber-500/40',
        nameBg: 'from-amber-500 via-yellow-500 to-amber-600',
        glow: 'rgba(250, 204, 21, 0.85)',
        position: 'VIP',
        rarityTitle: 'ICON JACKPOT',
        statColor: 'text-amber-300',
      }
    }
    if (isRare) {
      return {
        cardBg: 'from-[#0369a1] via-[#082f49] to-[#02182b]',
        border: 'border-cyan-400',
        badgeBg: 'bg-cyan-400 text-stone-950 font-black',
        foilGradient: 'from-cyan-400/30 via-sky-300/20 to-blue-500/30',
        nameBg: 'from-cyan-600 via-sky-600 to-blue-600',
        glow: 'rgba(56, 189, 248, 0.7)',
        position: 'ST',
        rarityTitle: 'STAR CARD',
        statColor: 'text-cyan-300',
      }
    }
    return {
      cardBg: 'from-[#065f46] via-[#064e3b] to-[#022c22]',
      border: 'border-emerald-400',
      badgeBg: 'bg-emerald-400 text-stone-950 font-black',
      foilGradient: 'from-emerald-400/30 via-teal-300/20 to-emerald-600/30',
      nameBg: 'from-emerald-600 via-teal-600 to-emerald-700',
      glow: 'rgba(52, 211, 153, 0.6)',
      position: 'CAM',
      rarityTitle: 'MINER CARD',
      statColor: 'text-emerald-300',
    }
  }

  const theme = getCardTheme()

  const gramAmount = reward.reward_gram || 0
  const ghsAmount = reward.reward_ghs || 0

  const statGrm = gramAmount > 0 ? Math.min(99, Math.round(75 + gramAmount * 3)) : 70
  const statPow = ghsAmount > 0 ? Math.min(99, Math.round(75 + ghsAmount * 0.2)) : 80
  const statLck = isGod ? 99 : isJackpot ? 97 : isRare ? 91 : 84
  const statVal = Math.min(99, Math.round(80 + gramAmount * 2 + ghsAmount * 0.1))
  const statBst = isGod ? 99 : isJackpot ? 95 : isRare ? 90 : 82
  const statRar = isGod ? 99 : isJackpot ? 96 : isRare ? 91 : 85

  return (
    <motion.div
      initial={{ scale: 0.6, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 100, duration: 0.8 }}
      className="relative mx-auto my-2 w-72 select-none"
      style={{ perspective: 1000 }}
    >
      {/* Outer Halo Glow */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute -inset-3 rounded-3xl blur-2xl pointer-events-none"
        style={{ backgroundColor: theme.glow }}
      />

      {/* FIFA Shield Card Container */}
      <div
        style={{
          boxShadow: `0 15px 35px -5px ${theme.glow}, inset 0 2px 15px rgba(255,255,255,0.3)`,
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 88%, 50% 100%, 0% 88%)',
        }}
        className={`relative w-full rounded-2xl border-4 ${theme.border} bg-gradient-to-b ${theme.cardBg} p-3 pb-8 flex flex-col items-center overflow-hidden`}
      >
        {/* Holographic Diagonal Foil Lines */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)`,
          }}
        />

        {/* Shimmering Top Gloss */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/20 rotate-45 blur-lg pointer-events-none" />

        {/* TOP SECTION: FIFA Rating, Position, Nation, Crest */}
        <div className="w-full flex items-start justify-between relative z-10">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-white font-mono tracking-tighter drop-shadow-md leading-none">
              {rating}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-0.5 ${theme.badgeBg}`}>
              {theme.position}
            </span>

            <div className="mt-2 flex flex-col items-center gap-1">
              <span className="text-base" title="TON / GRAM Chain">💎</span>
              <span className="text-xs font-black text-amber-300">GRAM</span>
            </div>
          </div>

          {/* Central 3D Dynamic Player / Hero Avatar */}
          <motion.div
            animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="flex-1 flex flex-col items-center justify-center -mt-1"
          >
            <div className="relative">
              <span className="text-6xl filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.7)]">
                {isGod ? '👁️' : isJackpot ? '👑' : ghsAmount > 0 ? '⚡' : '💎'}
              </span>
              <motion.span
                animate={{ rotate: 360, scale: [0.8, 1.2, 0.8] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -top-1 -right-2 text-sm"
              >
                ✨
              </motion.span>
            </div>
          </motion.div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">
              FUT 26
            </span>
            <span className="text-[8px] font-bold text-stone-300 uppercase">
              {result.tier_name.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* PLAYER NAMEPLATE BAR */}
        <div className="w-full mt-2 relative z-10">
          <div className={`w-full py-1.5 px-3 rounded-lg bg-gradient-to-r ${theme.nameBg} text-center shadow-md border border-white/30`}>
            <div className="text-xs font-black text-stone-950 uppercase tracking-widest truncate">
              {reward.summary_text.replace(/^[+🎉⚡🔥\s]+/, '')}
            </div>
          </div>
          <div className="text-center text-[9px] font-black text-stone-300 uppercase tracking-widest mt-0.5">
            {theme.rarityTitle} • {reward.rarity_label}
          </div>
        </div>

        {/* 6-ATTRIBUTE FIFA STAT GRID */}
        <div className="w-full mt-2.5 pt-2 border-t border-white/20 grid grid-cols-6 gap-1 text-center relative z-10">
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statGrm}</div>
            <div className="text-[8px] font-extrabold text-stone-400">GRM</div>
          </div>
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statPow}</div>
            <div className="text-[8px] font-extrabold text-stone-400">POW</div>
          </div>
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statLck}</div>
            <div className="text-[8px] font-extrabold text-stone-400">LCK</div>
          </div>
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statVal}</div>
            <div className="text-[8px] font-extrabold text-stone-400">VAL</div>
          </div>
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statBst}</div>
            <div className="text-[8px] font-extrabold text-stone-400">BST</div>
          </div>
          <div>
            <div className={`text-xs font-black ${theme.statColor}`}>{statRar}</div>
            <div className="text-[8px] font-extrabold text-stone-400">RAR</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
