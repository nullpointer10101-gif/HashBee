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

  const numDeposit = Math.max(0.1, parseFloat(depositAmount) || 0.1)
  const totalGhsPower = numDeposit * 50 * 1.05
  const modalEarningsPerDay = totalGhsPower * 0.0005
  const modalEarningsPerSecond = modalEarningsPerDay / 86400
  const modalEarningsPerWeek = modalEarningsPerDay * 7
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

  const handleOpenAnyWallet = () => {
    const nanoAmount = Math.round(numDeposit * 1e9)
    const comment = encodeURIComponent(userMemo)
    const tonhubUrl = `https://tonhub.com/transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(tonhubUrl)
    } else {
      window.open(`ton://transfer/${depositAddress}?amount=${nanoAmount}&text=${comment}`, '_blank')
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="lux-card w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 text-white shadow-2xl relative">
        {step === 'calculate' ? (
          <div>
            <div className="text-center mb-4 relative">
              <button
                onClick={onClose}
                className="absolute left-0 top-0 text-[#84948c] hover:text-white p-1"
              >
                ✕
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider">UPGRADE COMPUTING POWER</h2>
            </div>

            <div className="mb-3.5">
              <label className="text-[10px] font-extrabold text-[#84948c] block mb-1 uppercase tracking-wide">
                Amount to Deposit (TON)
              </label>
              <div className="lux-input p-3 flex items-center justify-between">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-transparent text-lg font-black text-white outline-none font-mono"
                />
                <span className="text-xs font-black text-[#84948c] ml-2">
                  TON
                </span>
              </div>
              <div className="text-[9px] text-[#84948c] font-medium mt-1">
                Minimum deposit: 0.10 TON
              </div>
            </div>

            <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-3.5 text-center mb-3">
              <div className="text-[9px] font-extrabold text-[#84948c] uppercase tracking-widest">
                ESTIMATED POWER
              </div>
              <div className="text-2xl font-black text-white mt-0.5 font-mono">
                {totalGhsPower.toFixed(1)} <span className="text-xs font-bold text-[#00f090]">GHS</span>
              </div>
              <div className="text-[10px] font-bold text-[#00f090] mt-0.5">
                ⚡ +5% deposit power bonus applied!
              </div>
            </div>

            <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-3 mb-4">
              <div className="text-[9px] font-extrabold text-[#84948c] uppercase tracking-widest text-center mb-2">
                PROJECTED REVENUE
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#060807] border border-[#17241d] rounded-lg p-2">
                  <div className="text-[8px] font-bold text-[#84948c] uppercase">PER DAY</div>
                  <div className="text-xs font-black text-white font-mono mt-0.5">
                    {modalEarningsPerDay.toFixed(4)} USDT
                  </div>
                </div>

                <div className="bg-[#060807] border border-[#17241d] rounded-lg p-2">
                  <div className="text-[8px] font-bold text-[#84948c] uppercase">PER MONTH</div>
                  <div className="text-xs font-black text-white font-mono mt-0.5">
                    {modalEarningsPerMonth.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('pay')}
              className="w-full py-3.5 rounded-xl btn-white font-black text-xs uppercase tracking-wider mb-2 shadow-lg active:scale-95 transition-all"
            >
              PROCEED TO PAYMENT
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl btn-surface font-extrabold text-xs uppercase tracking-wider"
            >
              CANCEL
            </button>
          </div>
        ) : (
          <div>
            <div className="text-center mb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider">PAYMENT DETAILS</h2>
              <p className="text-[10px] text-[#84948c] mt-0.5">Send exact TON on blockchain</p>
            </div>

            <div className="bg-[#080c0a] border border-[#17241d] rounded-xl p-3.5 mb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#84948c] uppercase">Amount</span>
                <span className="text-sm font-black text-white font-mono">{numDeposit.toFixed(2)} TON</span>
              </div>

              <div className="border-t border-[#17241d] pt-2">
                <div className="text-[9px] font-extrabold text-[#84948c] uppercase mb-1">
                  Deposit Address
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={depositAddress}
                    className="flex-1 bg-[#060807] text-[10px] text-white font-mono px-2.5 py-1.5 rounded-lg border border-[#17241d] outline-none truncate"
                  />
                  <button
                    onClick={copyDepositAddress}
                    className="px-2.5 py-1.5 btn-surface text-[10px] font-bold rounded-lg"
                  >
                    {copiedAddr ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[9px] font-extrabold text-[#00f090] uppercase mb-1 font-bold">
                  Transfer Memo (REQUIRED)
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={userMemo}
                    className="flex-1 bg-[#060807] text-[11px] text-[#00f090] font-mono font-bold px-2.5 py-1.5 rounded-lg border border-[#00f090]/40 outline-none"
                  />
                  <button
                    onClick={copyMemo}
                    className="px-2.5 py-1.5 bg-[#00f090]/15 text-[#00f090] text-[10px] font-bold rounded-lg border border-[#00f090]/30"
                  >
                    {copiedMemo ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenTonkeeper}
              className="w-full py-3.5 rounded-xl btn-white font-black text-xs uppercase tracking-wider mb-2 shadow-lg flex items-center justify-center gap-1.5"
            >
              <span>💎 1-CLICK PAY VIA TONKEEPER</span>
            </button>

            <button
              onClick={handleVerifyDeposit}
              disabled={verifying}
              className="w-full py-3 rounded-xl btn-surface font-extrabold text-xs uppercase tracking-wider mb-2"
            >
              {verifying ? 'VERIFYING...' : '✓ I HAVE PAID — VERIFY'}
            </button>

            <button
              onClick={() => setStep('calculate')}
              className="w-full py-2.5 rounded-xl bg-white/5 text-[#84948c] font-bold text-xs uppercase tracking-wider"
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
