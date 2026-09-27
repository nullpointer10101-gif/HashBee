import React from 'react'
import { motion } from 'framer-motion'

export interface CrateAnimatedBoxProps {
  tierId: 'bronze' | 'silver' | 'gold' | 'god'
  tierName: string
  accentColor: string
  glowColor: string
  icon: string
  isOpening?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export const CrateAnimatedBox: React.FC<CrateAnimatedBoxProps> = ({
  tierId,
  accentColor,
  glowColor,
  isOpening = false,
  onClick,
  size = 'md',
}) => {
  const getTheme = () => {
    switch (tierId) {
      case 'bronze':
        return {
          boxGradient: 'from-[#6b3512] via-[#3d1d0a] to-[#200f04]',
          lidGradient: 'from-[#8f4a1b] via-[#592a0e] to-[#3a1805]',
          border: 'border-amber-500/60',
          metalAccent: '#e58e26',
          crystalGlow: 'rgba(245, 158, 11, 0.8)',
          rune: '⚡',
          sparkleColor: '#f59e0b',
        }
      case 'silver':
        return {
          boxGradient: 'from-[#334e68] via-[#1e2d3d] to-[#0f172a]',
          lidGradient: 'from-[#486581] via-[#243b53] to-[#102a43]',
          border: 'border-cyan-400/60',
          metalAccent: '#38bdf8',
          crystalGlow: 'rgba(56, 189, 248, 0.8)',
          rune: '💠',
          sparkleColor: '#38bdf8',
        }
      case 'gold':
        return {
          boxGradient: 'from-[#854d0e] via-[#451a03] to-[#1c1917]',
          lidGradient: 'from-[#ca8a04] via-[#713f12] to-[#422006]',
          border: 'border-yellow-400/80',
          metalAccent: '#facc15',
          crystalGlow: 'rgba(250, 204, 21, 0.9)',
          rune: '👑',
          sparkleColor: '#fbbf24',
        }
      case 'god':
      default:
        return {
          boxGradient: 'from-[#581c87] via-[#2e1065] to-[#0f0426]',
          lidGradient: 'from-[#9333ea] via-[#6b21a8] to-[#3b0764]',
          border: 'border-fuchsia-400/90',
          metalAccent: '#e879f9',
          crystalGlow: 'rgba(217, 70, 239, 0.95)',
          rune: '👁️',
          sparkleColor: '#f43f5e',
        }
    }
  }

  const theme = getTheme()
  const dim = size === 'lg' ? 'w-36 h-36' : size === 'sm' ? 'w-20 h-20' : 'w-28 h-28'

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group ${dim}`}
      style={{ perspective: 1000 }}
    >
      {/* Ambient Pulsing Aura */}
      <motion.div
        animate={{
          scale: [1, 1.18, 1],
          opacity: isOpening ? [0.7, 1, 0.7] : [0.35, 0.65, 0.35],
        }}
        transition={{
          repeat: Infinity,
          duration: isOpening ? 0.5 : 2.2,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 rounded-3xl blur-2xl pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Floating Cyber Orbit Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
        className="absolute -inset-2 rounded-full border border-dashed border-white/25 pointer-events-none"
        style={{ borderColor: `${accentColor}77` }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
        className="absolute -inset-4 rounded-full border border-dotted border-white/15 pointer-events-none"
      />

      {/* 3D Crate Body */}
      <motion.div
        animate={
          isOpening
            ? {
                x: [-4, 4, -6, 6, -3, 3, 0],
                y: [-3, 3, -4, 4, -2, 2, 0],
                rotateZ: [-4, 4, -5, 5, -2, 2, 0],
                scale: [1, 1.08, 0.96, 1.1, 1],
              }
            : {
                y: [0, -6, 0],
                rotateX: [0, 4, 0],
                rotateY: [-4, 4, -4],
              }
        }
        transition={
          isOpening
            ? { repeat: Infinity, duration: 0.22, ease: 'easeInOut' }
            : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
        }
        className={`relative w-full h-full rounded-2xl border-2 ${theme.border} bg-gradient-to-b ${theme.boxGradient} shadow-2xl flex flex-col items-center justify-between p-2 overflow-hidden`}
        style={{
          boxShadow: `0 10px 35px -5px ${glowColor}, inset 0 2px 12px rgba(255,255,255,0.25)`,
        }}
      >
        {/* Shiny Gloss Reflection */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rotate-45 blur-md pointer-events-none" />

        {/* Top Chest Lid Bar */}
        <motion.div
          animate={isOpening ? { y: [-2, -8, -2] } : {}}
          transition={{ repeat: Infinity, duration: 0.3 }}
          className={`w-full h-5 rounded-lg bg-gradient-to-r ${theme.lidGradient} border-b border-black/40 flex items-center justify-between px-2 shadow-sm`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <div className="w-8 h-1 rounded-full bg-black/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </motion.div>

        {/* Center Padlock / Power Core Crystal */}
        <div className="relative my-auto flex items-center justify-center">
          <motion.div
            animate={{
              scale: isOpening ? [1, 1.35, 1] : [1, 1.12, 1],
              rotate: isOpening ? [0, 180, 360] : 0,
            }}
            transition={{
              repeat: Infinity,
              duration: isOpening ? 0.35 : 1.8,
              ease: 'easeInOut',
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/30"
            style={{
              backgroundColor: `${accentColor}33`,
              boxShadow: `0 0 18px ${theme.crystalGlow}`,
            }}
          >
            <span>{theme.rune}</span>
          </motion.div>

          {/* Energy Sparks */}
          {isOpening && (
            <>
              <motion.div
                animate={{ scale: [0, 1.6], opacity: [1, 0], x: [0, 22], y: [0, -22] }}
                transition={{ repeat: Infinity, duration: 0.45, repeatDelay: 0.1 }}
                className="absolute w-2.5 h-2.5 rounded-full bg-yellow-300"
              />
              <motion.div
                animate={{ scale: [0, 1.6], opacity: [1, 0], x: [0, -22], y: [0, -18] }}
                transition={{ repeat: Infinity, duration: 0.55, repeatDelay: 0.15 }}
                className="absolute w-2.5 h-2.5 rounded-full bg-fuchsia-400"
              />
            </>
          )}
        </div>

        {/* Bottom Reinforcement Plate */}
        <div className="w-full h-3 rounded-md bg-black/40 border-t border-white/10 flex items-center justify-center gap-1">
          <div className="w-1 h-1 rounded-full bg-amber-400/90" />
          <div className="w-1 h-1 rounded-full bg-amber-400/90" />
          <div className="w-1 h-1 rounded-full bg-amber-400/90" />
        </div>
      </motion.div>
    </div>
  )
}
