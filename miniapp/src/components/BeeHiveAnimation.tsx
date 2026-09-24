import React from 'react'

interface BeeHiveProps {
  unclaimedHoney: number
  maxCapacity: number
  beePower: number
  isFull: boolean
}

export const BeeHiveAnimation: React.FC<BeeHiveProps> = ({
  unclaimedHoney,
  maxCapacity,
  beePower,
  isFull,
}) => {
  const fillPercentage = Math.min(100, Math.max(0, (unclaimedHoney / maxCapacity) * 100))

  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center my-6 select-none">
      {/* Dynamic Background Glowing Pulse Radial Halo */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-1000 ${
          isFull
            ? 'bg-gradient-to-r from-amber-500/40 via-yellow-400/50 to-amber-600/40 blur-3xl animate-pulse-glow'
            : 'bg-gradient-to-r from-amber-600/15 via-yellow-500/20 to-amber-700/15 blur-2xl'
        }`}
      />

      {/* Multi-layered Hexagonal Honeycomb SVG */}
      <svg className="w-64 h-64 z-10 drop-shadow-[0_10px_30px_rgba(245,158,11,0.25)]" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="liquidGold" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset={`${fillPercentage}%`} stopColor="#fbbf24" />
            <stop offset={`${fillPercentage}%`} stopColor="#1a1309" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#120c04" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#080603" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Hex Frame */}
        <polygon
          points="100,10 178,55 178,145 100,190 22,145 22,55"
          fill="#100b05"
          stroke="url(#goldBorder)"
          strokeWidth="3.5"
        />

        {/* Middle Hex Shadow Frame */}
        <polygon
          points="100,22 166,60 166,140 100,178 34,140 34,60"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Inner Honey Reservoir Filled Level */}
        <polygon
          points="100,32 156,64 156,136 100,168 44,136 44,64"
          fill="url(#liquidGold)"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeOpacity="0.8"
        />

        {/* Inner Ambient Glow */}
        <polygon
          points="100,32 156,64 156,136 100,168 44,136 44,64"
          fill="url(#innerGlow)"
        />

        {/* Subtle Decorative Grid Pattern overlay */}
        <g stroke="#fbbf24" strokeWidth="0.75" strokeOpacity="0.15" fill="none">
          <line x1="100" y1="32" x2="100" y2="168" />
          <line x1="44" y1="64" x2="156" y2="136" />
          <line x1="44" y1="136" x2="156" y2="64" />
        </g>
      </svg>

      {/* Central Content Badge */}
      <div className="absolute z-20 flex flex-col items-center justify-center text-center">
        {/* Bee Power Rate Chip */}
        <div className="flex items-center gap-1.5 bg-[#0f0b04]/90 px-3.5 py-1 rounded-full border border-amber-500/40 backdrop-blur-md shadow-lg">
          <span className="text-base animate-bounce">🐝</span>
          <span className="text-xs font-extrabold text-amber-300 tracking-wider">
            {beePower} H/h
          </span>
        </div>

        {/* Live Accumulating Honey Balance */}
        <div className="mt-2 text-4xl font-black text-gold-gradient tracking-tight drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
          {unclaimedHoney.toLocaleString()}
        </div>

        {/* Capacity Percentage / Status Subtext */}
        <div className="mt-1 text-xs font-semibold">
          {isFull ? (
            <span className="text-amber-300 font-bold tracking-wide animate-pulse flex items-center gap-1 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
              ⚡ Hive Full! Harvest Now
            </span>
          ) : (
            <span className="text-stone-400">
              Storage: <span className="text-amber-400 font-bold">{fillPercentage.toFixed(0)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Floating Animated Bees & Sparkles */}
      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-2 left-6 text-lg animate-float">🐝</div>
        <div className="absolute bottom-6 right-6 text-sm animate-float" style={{ animationDelay: '1.5s' }}>🐝</div>
        <div className="absolute top-10 right-4 text-xs animate-ping text-amber-300 opacity-75">✨</div>
      </div>
    </div>
  )
}
