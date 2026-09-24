import React, { useState } from 'react'

interface ClaimButtonProps {
  unclaimedHoney: number
  onClaim: () => Promise<void>
  isFull: boolean
}

export const ClaimButton: React.FC<ClaimButtonProps> = ({ unclaimedHoney, onClaim, isFull }) => {
  const [claiming, setClaiming] = useState(false)
  const [floatingItems, setFloatingItems] = useState<{ id: number; text: string }[]>([])

  const handleClick = async () => {
    if (unclaimedHoney <= 0 || claiming) return

    setClaiming(true)
    const amount = unclaimedHoney
    const newId = Date.now()
    setFloatingItems((prev) => [...prev, { id: newId, text: `+${amount.toLocaleString()} 🍯` }])

    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
      await onClaim()
    } catch (err) {
      console.error(err)
    } finally {
      setClaiming(false)
      setTimeout(() => {
        setFloatingItems((prev) => prev.filter((item) => item.id !== newId))
      }, 1200)
    }
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Floating Honey particle text animation */}
      {floatingItems.map((item) => (
        <span
          key={item.id}
          className="absolute -top-14 text-xl font-black text-amber-300 animate-fade-up pointer-events-none drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] z-40"
        >
          {item.text}
        </span>
      ))}

      <button
        onClick={handleClick}
        disabled={unclaimedHoney <= 0 || claiming}
        className={`w-full py-4 px-6 rounded-2xl font-black text-lg tracking-wide transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2.5 shadow-2xl relative overflow-hidden ${
          unclaimedHoney > 0
            ? isFull
              ? 'btn-gold animate-bounce'
              : 'btn-gold'
            : 'bg-stone-900/80 text-stone-500 border border-stone-800 cursor-not-allowed'
        }`}
      >
        {claiming ? (
          <span className="flex items-center gap-2.5 text-stone-950 font-extrabold">
            <svg className="animate-spin h-5 w-5 text-stone-950" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Harvesting Honey...
          </span>
        ) : (
          <>
            <span className="text-2xl">🍯</span>
            <span className="text-stone-950 uppercase font-black text-base tracking-wider">
              {unclaimedHoney > 0 ? `Harvest ${unclaimedHoney.toLocaleString()} Honey` : 'Hive Empty'}
            </span>
          </>
        )}
      </button>
    </div>
  )
}
