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

  // Map each tier to its custom image & color scheme
  const tierConfig: Record<
    string,
    {
      img?: string
      glowColor: string
      bgGradient: string
      emoji: string
      label: string
      laserColor: string
    }
  > = {
    starter: {
      img: robotMinerImg,
      glowColor: '#8b5cf6',
      bgGradient: 'from-violet-950 via-slate-900 to-indigo-950',
      emoji: '🤖',
      label: 'STARTER',
      laserColor: '#a78bfa',
    },
    standard: {
      img: cyberWorkerImg,
      glowColor: '#0088ff',
      bgGradient: 'from-blue-950 via-slate-900 to-cyan-950',
      emoji: '⚡',
      label: 'WORKER',
      laserColor: '#38bdf8',
    },
    queen: {
      glowColor: '#f59e0b',
      bgGradient: 'from-amber-950 via-slate-900 to-purple-950',
      emoji: '👑',
      label: 'ROYAL',
      laserColor: '#fbbf24',
    },
    titan: {
      glowColor: '#10b981',
      bgGradient: 'from-emerald-950 via-slate-900 to-teal-950',
      emoji: '💎',
      label: 'TITAN',
      laserColor: '#34d399',
    },
    apex: {
      glowColor: '#f97316',
      bgGradient: 'from-orange-950 via-slate-900 to-red-950',
      emoji: '🔥',
      label: 'APEX',
      laserColor: '#fb923c',
    },
    matrix: {
      glowColor: '#ec4899',
      bgGradient: 'from-pink-950 via-purple-950 to-slate-950',
      emoji: '🌌',
      label: 'MATRIX 2X',
      laserColor: '#f472b6',
    },
  }

  const config = tierConfig[planId.toLowerCase()] || tierConfig.starter

  const sizeClasses = {
    sm: 'w-10 h-10 text-base',
    md: 'w-16 h-16 sm:w-20 sm:h-20 text-2xl',
    lg: 'w-20 h-20 sm:w-22 sm:h-22 text-3xl',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-4xl',
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-lg border-2 bg-gradient-to-br ${config.bgGradient} flex items-center justify-center select-none shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ borderColor: `${config.glowColor}60`, boxShadow: `0 0 16px ${config.glowColor}40` }}
    >
      {/* 1. Try real image if available */}
      {config.img && !imgFailed ? (
        <img
          src={config.img}
          alt={config.label}
          className="w-full h-full object-cover object-center"
          onError={() => setImgFailed(true)}
        />
      ) : (
        /* 2. High-Tech 3D Vector Cyber Mech Display (100% unbreakable on any device) */
        <div className="w-full h-full relative flex flex-col items-center justify-center p-2 text-center overflow-hidden">
          {/* Subtle Grid / Scanline Background */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, ${config.laserColor} 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />

          {/* Central Glowing Energy Core & 3D Character Icon */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-inner relative"
              style={{
                background: `radial-gradient(circle, ${config.laserColor}30 0%, rgba(15,23,42,0.8) 70%)`,
                border: `1.5px solid ${config.laserColor}`,
              }}
            >
              <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse">
                {config.emoji}
              </span>
            </div>
            <span
              className="text-[8px] font-black uppercase tracking-wider font-mono mt-1 text-white/90 drop-shadow"
              style={{ color: config.laserColor }}
            >
              {config.label}
            </span>
          </div>

          {/* Glowing Cyber Accent Lines */}
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
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[8px] font-black text-white border border-white/20 font-mono leading-none">
          {badgeText}
        </div>
      )}
    </div>
  )
}
