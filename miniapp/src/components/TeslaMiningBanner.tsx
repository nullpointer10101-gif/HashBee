import React from 'react'
import { useAuth } from '../context/AuthContext'
import teslaBannerImg from '../assets/images/tesla_mining_banner.jpg'
import { triggerTeslaMiningTakeover } from './TeslaMiningTakeover'

interface TeslaMiningBannerProps {
  onOpenModal?: () => void
  className?: string
}

export const TeslaMiningBanner: React.FC<TeslaMiningBannerProps> = ({
  onOpenModal,
  className = '',
}) => {
  const handleClick = () => {
    if (onOpenModal) {
      onOpenModal()
    } else {
      triggerTeslaMiningTakeover()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`p-0 relative overflow-hidden rounded-3xl shadow-xl cursor-pointer active:scale-98 transition-all border border-red-500/30 bg-[#0b0f19] text-white group ${className}`}
    >
      <div className="relative h-32 sm:h-36 w-full overflow-hidden">
        {/* Background Visual Banner */}
        <img
          src={teslaBannerImg}
          alt="Tesla Mining - Claim Free 1 USDT"
          loading="eager"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Ambient Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Banner Content */}
        <div className="absolute inset-0 flex items-center justify-between p-4 z-10">
          <div className="max-w-[75%] pr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <span>⚡</span> 1-TIME GIFT
              </span>
              <span className="text-[10px] text-red-400 font-extrabold uppercase tracking-wide">
                Tesla Mining
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow">
              Claim Free 1.00 USDT
            </h3>
            <p className="text-[10px] text-amber-200/90 font-medium mt-0.5 line-clamp-1">
              Start Tesla Cloud Mining & collect 1 USDT bonus instantly!
            </p>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 flex items-center gap-1.5"
              >
                <span>⚡ CLAIM 1 USDT</span>
                <span>➔</span>
              </button>
              <span className="text-[9px] text-slate-400 font-semibold">
                Free Starter Yield
              </span>
            </div>
          </div>

          {/* Right Floating Icon */}
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-400 flex items-center justify-center font-black text-lg shadow-xl shrink-0 group-hover:scale-110 transition-transform">
            ⚡
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeslaMiningBanner
