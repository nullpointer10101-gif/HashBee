import React, { useState } from 'react'
import robotMinerImg from '../assets/images/robot_miner.jpg'
import cyberWorkerImg from '../assets/images/cyber_worker_miner.jpg'
import queenMinerImg from '../assets/images/queen_miner.jpg'

interface NftMinerAvatarProps {
  planId?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  badgeText?: string
}

export const NftMinerAvatar: React.FC<NftMinerAvatarProps> = ({
  planId = 'starter',
  className = '',
  size = 'md',
  badgeText,
}) => {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Rich tier configuration for all 6 NFT Miners
  const tierConfig: Record<
    string,
    {
      img?: string
      glowColor: string
      bgGradient: string
      title: string
      subtitle: string
      primaryColor: string
      accentColor: string
      svgIcon: (accent: string) => React.ReactNode
    }
  > = {
    starter: {
      img: robotMinerImg,
      glowColor: '#f59e0b',
      bgGradient: 'from-[#2e1d05] via-[#1a120b] to-[#451a03]',
      title: 'STARTER MECH',
      subtitle: '0.70 TON',
      primaryColor: '#fbbf24',
      accentColor: '#f59e0b',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#starter-grad)" stroke={color} strokeWidth="2.5" />
          {/* Cute Robot Bee Head & Golden Helmet */}
          <path d="M22 26h20v14a10 10 0 01-20 0V26z" fill="#1e1b4b" stroke={color} strokeWidth="2" />
          <path d="M18 24c0-6 6-10 14-10s14 4 14 10H18z" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
          {/* Cyan Glow Visor Eyes */}
          <circle cx="27" cy="32" r="3.5" fill="#38bdf8" className="animate-pulse" />
          <circle cx="37" cy="32" r="3.5" fill="#38bdf8" className="animate-pulse" />
          {/* Headlamp */}
          <circle cx="32" cy="16" r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
          {/* Crystal Pickaxe */}
          <path d="M42 22l8-8M46 10l8 8" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <defs>
            <linearGradient id="starter-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    standard: {
      img: cyberWorkerImg,
      glowColor: '#0088ff',
      bgGradient: 'from-[#082f49] via-[#0f172a] to-[#0369a1]',
      title: 'CYBER DRILL',
      subtitle: '1.30 TON',
      primaryColor: '#38bdf8',
      accentColor: '#0088ff',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#worker-grad)" stroke={color} strokeWidth="2.5" />
          {/* Heavy Armored Mech Head */}
          <path d="M18 22h28v18a6 6 0 01-6 6H24a6 6 0 01-6-6V22z" fill="#032b43" stroke={color} strokeWidth="2" />
          {/* Cyan Horizontal Cyber Visor */}
          <rect x="22" cy="27" width="20" height="7" rx="3.5" fill="#00f0ff" className="animate-pulse" />
          {/* Golden Mech Armor Accents */}
          <circle cx="32" cy="42" r="3" fill="#fbbf24" />
          {/* Plasma Power Drill */}
          <path d="M12 36l8-4M44 32l10 8-10 6z" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
          <defs>
            <linearGradient id="worker-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    queen: {
      img: queenMinerImg,
      glowColor: '#a855f7',
      bgGradient: 'from-[#3b0764] via-[#1e1035] to-[#581c87]',
      title: 'ROYAL QUEEN',
      subtitle: '3.00 TON',
      primaryColor: '#c084fc',
      accentColor: '#a855f7',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#queen-grad)" stroke={color} strokeWidth="2.5" />
          {/* Imperial Golden Crown */}
          <path d="M20 20l6 4 6-8 6 8 6-4v18H20V20z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="20" cy="18" r="2.5" fill="#fde047" />
          <circle cx="32" cy="10" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
          <circle cx="44" cy="18" r="2.5" fill="#fde047" />
          {/* Purple Hologram Cyber Eyes */}
          <circle cx="27" cy="30" r="3" fill="#c084fc" className="animate-pulse" />
          <circle cx="37" cy="30" r="3" fill="#c084fc" className="animate-pulse" />
          <defs>
            <linearGradient id="queen-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    titan: {
      glowColor: '#10b981',
      bgGradient: 'from-[#064e3b] via-[#022c22] to-[#042f2e]',
      title: 'CYBER TITAN',
      subtitle: '6.00 TON',
      primaryColor: '#34d399',
      accentColor: '#10b981',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#titan-grad)" stroke={color} strokeWidth="2.5" />
          {/* Colossal Armor Shield */}
          <path d="M18 18h28l-4 28-10 6-10-6-4-28z" fill="#022c22" stroke={color} strokeWidth="2" />
          {/* Glowing Emerald Matrix Core */}
          <polygon points="32,24 42,32 32,44 22,32" fill="#10b981" stroke="#a7f3d0" strokeWidth="2" className="animate-pulse" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
          <defs>
            <linearGradient id="titan-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#042f2e" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    apex: {
      glowColor: '#f97316',
      bgGradient: 'from-[#7c2d12] via-[#431407] to-[#9a3412]',
      title: 'APEX MASTER',
      subtitle: '12.00 TON',
      primaryColor: '#fb923c',
      accentColor: '#f97316',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#apex-grad)" stroke={color} strokeWidth="2.5" />
          {/* Solar Magma Horns */}
          <path d="M16 16l8 10h16l8-10-4 12H20l-4-12z" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />
          {/* Nuclear Sun Core */}
          <circle cx="32" cy="36" r="10" fill="#c2410c" stroke="#fdba74" strokeWidth="2" />
          <circle cx="32" cy="36" r="6" fill="#fbbf24" className="animate-pulse" />
          <defs>
            <linearGradient id="apex-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#431407" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    matrix: {
      glowColor: '#ec4899',
      bgGradient: 'from-[#831843] via-[#500724] to-[#9d174d]',
      title: 'QUANTUM 2X',
      subtitle: '25.00 TON',
      primaryColor: '#f472b6',
      accentColor: '#ec4899',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">
          <circle cx="32" cy="32" r="28" fill="url(#matrix-grad)" stroke={color} strokeWidth="2.5" />
          {/* Dual Quantum Lasers */}
          <path d="M14 18l8 10M50 18l-8 10" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          {/* Infinity Cyber Core */}
          <path
            d="M24 32c0-5 5-7 8-2 3-5 8-3 8 2s-5 7-8 2c-3 5-8 3-8-2z"
            fill="none"
            stroke="#f472b6"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="animate-pulse"
          />
          <circle cx="32" cy="32" r="4" fill="#67e8f9" />
          <defs>
            <linearGradient id="matrix-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9d174d" />
              <stop offset="100%" stopColor="#500724" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
  }

  const config = tierConfig[planId.toLowerCase()] || tierConfig.starter

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 sm:w-20 sm:h-20 text-sm',
    lg: 'w-20 h-20 sm:w-22 sm:h-22 text-base',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-lg',
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-lg border-2 bg-gradient-to-br ${config.bgGradient} flex items-center justify-center select-none shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ borderColor: `${config.glowColor}80`, boxShadow: `0 0 16px ${config.glowColor}40` }}
    >
      {/* 1. Underlying vibrant 3D vector illustration — guarantees instant stunning render with ZERO blank box */}
      <div className="w-full h-full relative flex flex-col items-center justify-center p-1 text-center overflow-hidden">
        {/* Scanline Grid */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${config.primaryColor} 1.5px, transparent 1.5px)`,
            backgroundSize: '10px 10px',
          }}
        />

        {/* 3D Vector Core */}
        <div className="relative z-10 flex flex-col items-center justify-center scale-95 sm:scale-100">
          {config.svgIcon(config.primaryColor)}
        </div>

        {/* Bottom Cyber Laser Light */}
        <div
          className="absolute bottom-0 inset-x-0 h-1"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)`,
          }}
        />
      </div>

      {/* 2. Photo Overlay if image is loaded */}
      {config.img && !imgFailed && (
        <img
          src={config.img}
          alt={config.title}
          loading="eager"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 z-10 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Top Left Mini Chip */}
      {badgeText && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[8px] font-black text-white border border-white/20 font-mono leading-none z-20 shadow">
          {badgeText}
        </div>
      )}
    </div>
  )
}
