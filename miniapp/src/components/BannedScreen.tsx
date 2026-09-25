import React from 'react'

export const BannedScreen: React.FC = () => {
  const handleContactSupport = () => {
    const supportUrl = 'https://t.me/TaskyAppbot'
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(supportUrl)
    } else {
      window.open(supportUrl, '_blank')
    }
  }

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1311] text-stone-100 flex flex-col items-center justify-center px-6 py-12 text-center select-none">
      {/* Red Glow Container */}
      <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-pulse">
        <span className="text-5xl">🚫</span>
      </div>

      <div className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-[11px] uppercase tracking-widest mb-3">
        Account Suspended
      </div>

      <h1 className="text-2xl font-black text-stone-100 uppercase tracking-wide mb-3">
        ACCESS RESTRICTED
      </h1>

      <p className="text-sm text-stone-400 leading-relaxed max-w-sm mb-6">
        Your HashBee account has been permanently suspended by administration for violating community guidelines or suspicious activity.
      </p>

      <div className="w-full max-w-xs bg-[#141c19] border border-red-500/20 rounded-2xl p-4 mb-8 text-left">
        <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1">
          Restriction Details
        </div>
        <div className="text-xs text-red-300 font-semibold mb-2">
          • Mining and balance collection disabled
        </div>
        <div className="text-xs text-red-300 font-semibold mb-2">
          • Task completions & withdrawals frozen
        </div>
        <div className="text-xs text-stone-400 font-mono text-[11px]">
          If you believe this is an error, appeal to official support.
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleContactSupport}
          className="w-full py-4 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>💬</span> CONTACT SUPPORT (@TaskyAppbot)
        </button>

        <button
          onClick={handleClose}
          className="w-full py-3.5 rounded-2xl bg-[#1a2521] border border-[#273a33] text-stone-400 hover:text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
        >
          CLOSE MINI APP
        </button>
      </div>
    </div>
  )
}
export default BannedScreen
