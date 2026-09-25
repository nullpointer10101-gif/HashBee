import React from 'react'

interface InsufficientFundsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFunds: () => void
  title?: string
  currentBalance?: number
  requiredAmount?: number
  message?: string
}

export const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
  isOpen,
  onClose,
  onAddFunds,
  title = 'INSUFFICIENT FUNDS',
  currentBalance = 0,
  requiredAmount = 1.0,
  message,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121c19] border border-[#273a33] rounded-3xl w-full max-w-sm p-6 text-stone-100 shadow-2xl relative text-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
          ⚠️
        </div>

        <h2 className="text-lg font-black uppercase tracking-wider text-amber-300">
          {title}
        </h2>

        <p className="text-xs font-semibold text-stone-300 mt-2 mb-4 leading-relaxed">
          {message || (
            <>
              You need at least <span className="text-white font-black">{requiredAmount.toFixed(2)} USDT</span> to reinvest into mining power (1 USDT = 50 GHS).
            </>
          )}
        </p>

        <div className="border border-[#2a3c35] bg-[#16231f] rounded-2xl p-3.5 mb-5 text-left space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Your Current Balance</span>
            <span className="font-black text-stone-200 font-mono">{currentBalance.toFixed(6)} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-[#23332d] pt-2">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Minimum Required</span>
            <span className="font-black text-amber-300 font-mono">{requiredAmount.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-[#23332d] pt-2">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px]">Needed Amount</span>
            <span className="font-black text-emerald-400 font-mono">
              +{Math.max(0, requiredAmount - currentBalance).toFixed(4)} USDT
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            onClose()
            onAddFunds()
          }}
          className="w-full py-4 rounded-2xl bg-[#0098ea] hover:bg-[#00a8ff] text-white font-black text-xs uppercase tracking-wider mb-2.5 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span>💎</span> ADD FUNDS NOW (DEPOSIT GRAM)
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl zentorno-btn-secondary font-extrabold text-xs uppercase tracking-wider text-stone-400 hover:text-white"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}
