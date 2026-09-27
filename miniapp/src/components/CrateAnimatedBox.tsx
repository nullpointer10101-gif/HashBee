import React from 'react'

export interface CrateAnimatedBoxProps {
  tierId: 'bronze' | 'silver' | 'gold' | 'god'
  tierName?: string
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
          boxGradient: 'from-[#5a2c0d] via-[#3d1d0a] to-[#1e0e04]',
          lidGradient: 'from-[#7c3f15] via-[#592a0e] to-[#3a1805]',
          border: 'border-amber-500/70',
          rune: '⚡',
        }
      case 'silver':
        return {
          boxGradient: 'from-[#2a4365] via-[#1a293b] to-[#0f172a]',
          lidGradient: 'from-[#3b5984] via-[#243b53] to-[#102a43]',
          border: 'border-cyan-400/70',
          rune: '💠',
        }
      case 'gold':
        return {
          boxGradient: 'from-[#78350f] via-[#451a03] to-[#1c1917]',
          lidGradient: 'from-[#b45309] via-[#713f12] to-[#422006]',
          border: 'border-yellow-400/80',
          rune: '👑',
        }
      case 'god':
      default:
        return {
          boxGradient: 'from-[#4c1d95] via-[#2e1065] to-[#0f0426]',
          lidGradient: 'from-[#7e22ce] via-[#6b21a8] to-[#3b0764]',
          border: 'border-fuchsia-400/90',
          rune: '👁️',
        }
    }
  }

  const theme = getTheme()
  const dim = size === 'lg' ? 'w-28 h-28' : size === 'sm' ? 'w-16 h-16' : 'w-20 h-20'

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none transition-transform duration-200 active:scale-95 ${dim}`}
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Lightweight Ambient Aura Glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-40 pointer-events-none transition-opacity"
        style={{
          backgroundColor: accentColor,
          filter: 'blur(12px)',
        }}
      />

      {/* 3D Crate Body (Hardware Accelerated) */}
      <div
        className={`relative w-full h-full rounded-2xl border-2 ${theme.border} bg-gradient-to-b ${theme.boxGradient} shadow-lg flex flex-col items-center justify-between p-1.5 overflow-hidden transition-all duration-300 ${
          isOpening ? 'animate-bounce' : 'hover:-translate-y-0.5'
        }`}
        style={{
          boxShadow: `0 6px 20px -3px ${glowColor}`,
        }}
      >
        {/* Shiny Gloss Reflection */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-white/15 rotate-45 pointer-events-none" />

        {/* Top Chest Lid Bar */}
        <div
          className={`w-full h-3.5 rounded bg-gradient-to-r ${theme.lidGradient} border-b border-black/50 flex items-center justify-between px-1.5 shadow-sm shrink-0`}
        >
          <div className="w-1 h-1 rounded-full bg-white/80" />
          <div className="w-5 h-0.5 rounded-full bg-black/60" />
          <div className="w-1 h-1 rounded-full bg-white/80" />
        </div>

        {/* Center Padlock / Power Core Crystal */}
        <div className="relative my-auto flex items-center justify-center">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-md border border-white/30 bg-black/40"
            style={{
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          >
            <span>{theme.rune}</span>
          </div>
        </div>

        {/* Bottom Reinforcement Plate */}
        <div className="w-full h-2 rounded bg-black/50 border-t border-white/10 flex items-center justify-center gap-1 shrink-0">
          <div className="w-0.5 h-0.5 rounded-full bg-amber-400" />
          <div className="w-0.5 h-0.5 rounded-full bg-amber-400" />
          <div className="w-0.5 h-0.5 rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  )
}
