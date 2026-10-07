import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { checkDeposit } from '../services/api'
import toast from 'react-hot-toast'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialStep?: 'calculate' | 'pay'
  initialAmount?: string
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStep = 'calculate',
  initialAmount = '1',
}) => {
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState<'calculate' | 'pay'>(initialStep)
  const [depositAmount, setDepositAmount] = useState<string>(initialAmount)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [senderAddress, setSenderAddress] = useState('')
  const [verifying, setVerifying] = useState(false)

  if (!isOpen) return null

  const depositAddress = 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXtat_fF-JioNR'
  const userMemo = user ? `HB_${user.telegram_id}` : 'HB_MINER'

  const copyMemo = () => {
    navigator.clipboard.writeText(userMemo)
    setCopiedMemo(true)
    toast.success('Memo copied!')
    setTimeout(() => setCopiedMemo(false), 2500)
  }

  const copyDepositAddress = () => {
    navigator.clipboard.writeText(depositAddress)
    setCopiedAddr(true)
    toast.success('Deposit address copied!')
    setTimeout(() => setCopiedAddr(false), 2500)
  }

  const minTonDeposit = 0.5
  const numDeposit = Math.max(minTonDeposit, parseFloat(depositAmount) || minTonDeposit)
  const totalGhsPower = numDeposit * 520
  const modalEarningsPerDay = totalGhsPower * 0.0005
  const modalEarningsPerMonth = modalEarningsPerDay * 30

  const handleOpenTonkeeper = () => {
    const nanoAmount = Math.round(numDeposit * 1e9)
    const comment = encodeURIComponent(userMemo)
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`
    const directUrl = `ton://transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonkeeperUrl)
    } else {
      window.location.href = directUrl
      setTimeout(() => {
        window.open(tonkeeperUrl, '_blank')
      }, 500)
    }
  }

  const handleVerifyDeposit = async () => {
    setVerifying(true)
    toast.loading('Checking blockchain for your deposit...', { id: 'verify-dep' })
    try {
      const res = await checkDeposit(senderAddress.trim())
      toast.dismiss('verify-dep')
      await refreshUser()
      if (res?.credited && res.credited > 0) {
        toast.success(`🎉 Credited ${res.credited} deposit(s)! Computing power upgraded!`)
        onSuccess?.()
        onClose()
      } else {
        toast.success('Blockchain scan complete! Any detected transfers are credited.')
      }
    } catch (err: any) {
      toast.dismiss('verify-dep')
      toast.error('TON transfers arrive in 5–15 seconds!')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="mine-card w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 text-[#0f172a] shadow-2xl relative bg-white">
        {step === 'calculate' ? (
          <div>
            <div className="text-center mb-4 relative">
              <button
                onClick={onClose}
                className="absolute left-0 top-0 text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider">UPGRADE COMPUTING POWER</h2>
            </div>

            <div className="mb-3.5">
              <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">
                Amount to Deposit (TON)
              </label>
              <div className="mine-input p-3 flex items-center justify-between">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent text-lg font-black text-slate-900 outline-none font-mono"
                />
                <span className="text-xs font-black text-slate-400 ml-2">
                  TON
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-medium mt-1">
                Minimum deposit: 0.50 TON
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 text-center mb-3">
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                ESTIMATED POWER
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                {totalGhsPower.toFixed(0)} <span className="text-xs font-bold text-[#0088ff]">GHS</span>
              </div>
              <div className="text-[10px] font-bold text-[#059669] mt-0.5">
                ⚡ 1 TON = 520 GHS Mining Hashrate
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3 mb-4">
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-center mb-2">
                PROJECTED REVENUE
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase">PER DAY</div>
                  <div className="text-xs font-black text-[#059669] font-mono mt-0.5">
                    +{modalEarningsPerDay.toFixed(4)} USDT
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                  <div className="text-[8px] font-bold text-slate-400 uppercase">PER MONTH</div>
                  <div className="text-xs font-black text-[#0088ff] font-mono mt-0.5">
                    +{modalEarningsPerMonth.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('pay')}
              className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider mb-2 shadow-md active:scale-95 transition-all"
            >
              PROCEED TO PAYMENT
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider"
            >
              CANCEL
            </button>
          </div>
        ) : (
          <div>
            <div className="text-center mb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider">PAYMENT DETAILS</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Send exact TON on blockchain</p>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 mb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                <span className="text-sm font-black text-slate-900 font-mono">{numDeposit.toFixed(2)} TON</span>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">
                  Deposit Address
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={depositAddress}
                    className="flex-1 bg-white text-[10px] text-slate-800 font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none truncate"
                  />
                  <button
                    onClick={copyDepositAddress}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200"
                  >
                    {copiedAddr ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[9px] font-extrabold text-[#7c3aed] uppercase mb-1 font-bold">
                  Transfer Memo (REQUIRED)
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={userMemo}
                    className="flex-1 bg-white text-[11px] text-[#7c3aed] font-mono font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 outline-none"
                  />
                  <button
                    onClick={copyMemo}
                    className="px-2.5 py-1.5 bg-purple-100 text-[#7c3aed] text-[10px] font-bold rounded-lg"
                  >
                    {copiedMemo ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenTonkeeper}
              className="w-full py-3.5 rounded-xl btn-primary-blue font-black text-xs uppercase tracking-wider mb-2 shadow-md flex items-center justify-center gap-1.5"
            >
              <span>💎 1-CLICK PAY VIA TONKEEPER</span>
            </button>

            <button
              onClick={handleVerifyDeposit}
              disabled={verifying}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs uppercase tracking-wider mb-2 border border-slate-200"
            >
              {verifying ? 'VERIFYING...' : '✓ I HAVE PAID — VERIFY'}
            </button>

            <button
              onClick={() => setStep('calculate')}
              className="w-full py-2.5 rounded-xl bg-white text-slate-500 font-bold text-xs uppercase tracking-wider border border-slate-200"
            >
              BACK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DepositModal
