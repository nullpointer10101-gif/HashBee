import React, { useState } from 'react'
import robotMinerImg from '../assets/images/robot_miner.jpg'
import cyberWorkerImg from '../assets/images/cyber_worker_miner.jpg'

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
      glowColor: '#8b5cf6',
      bgGradient: 'from-[#1e1035] via-[#0f172a] to-[#2e1065]',
      title: 'STARTER MECH',
      subtitle: '0.70 TON',
      primaryColor: '#c084fc',
      accentColor: '#a855f7',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#starter-grad)" stroke={color} strokeWidth="2.5" />
          <path d="M22 28h20v14a10 10 0 01-20 0V28z" fill="#0f172a" stroke={color} strokeWidth="2" />
          <circle cx="27" cy="34" r="3" fill="#38bdf8" className="animate-pulse" />
          <circle cx="37" cy="34" r="3" fill="#38bdf8" className="animate-pulse" />
          <path d="M32 14v10M20 20l6 4M44 20l-6 4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="12" r="3" fill="#fbbf24" />
          <defs>
            <linearGradient id="starter-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2e1065" />
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
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#worker-grad)" stroke={color} strokeWidth="2.5" />
          <path d="M18 24h28v18a6 6 0 01-6 6H24a6 6 0 01-6-6V24z" fill="#032b43" stroke={color} strokeWidth="2" />
          <rect x="24" y="28" width="16" height="6" rx="3" fill="#00f0ff" className="animate-pulse" />
          <path d="M32 48l-4 10h8l-4-10z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <path d="M14 30l6-4M50 30l-6-4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
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
      glowColor: '#f59e0b',
      bgGradient: 'from-[#451a03] via-[#0f172a] to-[#78350f]',
      title: 'ROYAL QUEEN',
      subtitle: '3.00 TON',
      primaryColor: '#fbbf24',
      accentColor: '#f59e0b',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#queen-grad)" stroke={color} strokeWidth="2.5" />
          {/* Imperial Golden Crown */}
          <path d="M20 22l6 4 6-8 6 8 6-4v18H20V22z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="2.5" fill="#fde047" />
          <circle cx="32" cy="12" r="3" fill="#ef4444" />
          <circle cx="44" cy="20" r="2.5" fill="#fde047" />
          {/* Cyber Visor */}
          <rect x="24" y="32" width="16" height="5" rx="2" fill="#a855f7" className="animate-pulse" />
          <circle cx="32" cy="46" r="3" fill="#fde047" />
          <defs>
            <linearGradient id="queen-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    titan: {
      glowColor: '#10b981',
      bgGradient: 'from-[#064e3b] via-[#0f172a] to-[#042f2e]',
      title: 'CYBER TITAN',
      subtitle: '6.00 TON',
      primaryColor: '#34d399',
      accentColor: '#10b981',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#titan-grad)" stroke={color} strokeWidth="2.5" />
          {/* Heavy Armor Plates */}
          <path d="M18 20h28l-4 26-10 6-10-6-4-26z" fill="#022c22" stroke={color} strokeWidth="2" />
          <polygon points="32,26 40,32 32,44 24,32" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.5" className="animate-pulse" />
          <path d="M12 28l6 4M52 28l-6 4" stroke={color} strokeWidth="3" strokeLinecap="round" />
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
      bgGradient: 'from-[#7c2d12] via-[#0f172a] to-[#431407]',
      title: 'APEX MASTER',
      subtitle: '12.00 TON',
      primaryColor: '#fb923c',
      accentColor: '#f97316',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#apex-grad)" stroke={color} strokeWidth="2.5" />
          {/* Solar Lava Horns */}
          <path d="M18 16l8 10h12l8-10-4 12H22l-4-12z" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />
          {/* Magma Core */}
          <circle cx="32" cy="36" r="10" fill="#c2410c" stroke="#fdba74" strokeWidth="2" />
          <polygon points="32,28 36,36 32,44 28,36" fill="#fbbf24" className="animate-pulse" />
          <path d="M16 46l8-4M48 46l-8-4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="apex-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#431407" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    matrix: {
      glowColor: '#ec4899',
      bgGradient: 'from-[#831843] via-[#0f172a] to-[#500724]',
      title: 'QUANTUM 2X',
      subtitle: '25.00 TON',
      primaryColor: '#f472b6',
      accentColor: '#ec4899',
      svgIcon: (color) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 drop-shadow-md">
          <circle cx="32" cy="32" r="28" fill="url(#matrix-grad)" stroke={color} strokeWidth="2.5" />
          {/* Dual Quantum Lasers */}
          <path d="M14 20l6 8M50 20l-6 8" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          {/* Infinity Core */}
          <path
            d="M24 32c0-4 4-6 8-2 4-4 8-2 8 2s-4 6-8 2c-4 4-8 2-8-2z"
            fill="none"
            stroke="#f472b6"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="animate-pulse"
          />
          <circle cx="32" cy="32" r="4" fill="#67e8f9" />
          <defs>
            <linearGradient id="matrix-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#500724" />
              <stop offset="100%" stopColor="#831843" />
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
      {/* 1. If physical photo available and loaded */}
      {config.img && !imgFailed ? (
        <img
          src={config.img}
          alt={config.title}
          className="w-full h-full object-cover object-center"
          onError={() => setImgFailed(true)}
        />
      ) : (
        /* 2. Stunning High-Tech 3D Cyber Mech Illustration */
        <div className="w-full h-full relative flex flex-col items-center justify-center p-1.5 text-center overflow-hidden">
          {/* Subtle Grid / Scanline Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, ${config.primaryColor} 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />

          {/* Central 3D Vector Mech */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {config.svgIcon(config.primaryColor)}
            <span
              className="text-[8px] font-black uppercase tracking-wider font-mono mt-0.5 text-white drop-shadow leading-none truncate max-w-full"
              style={{ color: config.primaryColor }}
            >
              {config.title}
            </span>
          </div>

          {/* Bottom Laser Beam */}
          <div
            className="absolute bottom-0 inset-x-0 h-1"
            style={{
              background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)`,
            }}
          />
        </div>
      )}

      {/* Top Left Mini Chip */}
      {badgeText && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[8px] font-black text-white border border-white/20 font-mono leading-none z-20">
          {badgeText}
        </div>
      )}
    </div>
  )
}
