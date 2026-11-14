'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CryptoSymbol, CRYPTO_ASSETS } from '@/lib/game-data';
import { CryptoCoinBadge } from './CyberSprites';
import { X, Copy, Check, ShieldCheck, AlertTriangle, Wallet, Zap } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface InvoiceModalProps {
  isOpen: boolean;
  coin: CryptoSymbol;
  usdAmount: number;
  coinAmount: string;
  onClose: () => void;
  onConfirmSimulatedPayment: (coin: CryptoSymbol, usdAmount: number, coinAmount: string) => void;
}

export function InvoiceModal({
  isOpen,
  coin,
  usdAmount,
  coinAmount,
  onClose,
  onConfirmSimulatedPayment,
}: InvoiceModalProps) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const asset = CRYPTO_ASSETS[coin];
  const vaultDepositAddress =
    coin === 'TRX'
      ? 'TVault9xCyBerHeist7781920491029384'
      : 'UQCVaultfinityHeistPool8891029384756102938475';

  const handleCopy = async () => {
    triggerHaptic('copy');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(vaultDepositAddress);
      }
    } catch {
      // ignore
    }
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-[400px] rounded-3xl bg-[#13191b] border border-[#26353a] p-5 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CryptoCoinBadge symbol={coin} className="w-8 h-8" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {asset.name} Deposit Invoice
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    Network: {asset.network} Mainnet · Expires in 14:59
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('modal_close');
                  onClose();
                }}
                aria-label="Close modal"
                className="w-9 h-9 rounded-xl bg-[#0a0d0e] border border-[#1e292d] flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Visual & Amount Summary */}
            <div className="rounded-2xl bg-[#0a0d0e] border border-[#1e292d] p-4 flex flex-col items-center text-center space-y-3">
              {/* Stylized Crisp SVG QR Code */}
              <div className="w-36 h-36 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-md">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-[#0a0d0e]">
                  <rect x="4" y="4" width="28" height="28" rx="4" fill="none" stroke="#0a0d0e" strokeWidth="6" />
                  <rect x="12" y="12" width="12" height="12" rx="2" />
                  <rect x="68" y="4" width="28" height="28" rx="4" fill="none" stroke="#0a0d0e" strokeWidth="6" />
                  <rect x="76" y="12" width="12" height="12" rx="2" />
                  <rect x="4" y="68" width="28" height="28" rx="4" fill="none" stroke="#0a0d0e" strokeWidth="6" />
                  <rect x="12" y="76" width="12" height="12" rx="2" />
                  {/* Data matrix blocks */}
                  <rect x="40" y="8" width="8" height="8" />
                  <rect x="52" y="16" width="8" height="16" />
                  <rect x="40" y="28" width="8" height="8" />
                  <rect x="8" y="40" width="16" height="8" />
                  <rect x="32" y="44" width="12" height="12" rx="2" fill="#f59e0b" />
                  <rect x="52" y="40" width="16" height="8" />
                  <rect x="76" y="44" width="16" height="8" />
                  <rect x="40" y="60" width="16" height="8" />
                  <rect x="64" y="60" width="8" height="16" />
                  <rect x="80" y="64" width="12" height="12" />
                  <rect x="40" y="76" width="8" height="16" />
                  <rect x="56" y="84" width="16" height="8" />
                  <rect x="80" y="84" width="12" height="12" />
                </svg>
              </div>

              <div>
                <div className="text-xs text-[#94a3b8]">Send exact amount:</div>
                <div
                  className="text-xl font-extrabold text-[#fbbf24] mt-0.5 tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  {coinAmount} {coin}
                </div>
                <div
                  className="text-xs font-semibold text-[#10b981] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  Credits: +${usdAmount.toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Deposit Address Copy Box */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                VAULT ESCROW ADDRESS ({asset.network})
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#0a0d0e] border border-[#1e292d] p-2 pl-3">
                <span
                  className="text-xs text-[#e2e8f0] truncate flex-1"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  {vaultDepositAddress}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[34px] px-2.5 rounded-lg bg-[#1e292d] hover:bg-[#2d3d43] text-xs font-bold text-[#fbbf24] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedAddr ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  triggerHaptic('drill');
                  onConfirmSimulatedPayment(coin, usdAmount, coinAmount);
                }}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#059669] to-[#10b981] hover:brightness-110 text-white font-extrabold text-sm shadow-[0_6px_18px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Payment (+${usdAmount.toFixed(2)} USD)</span>
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('modal_close');
                  onClose();
                }}
                className="w-full min-h-[42px] rounded-xl bg-[#0a0d0e] border border-[#1e292d] text-xs font-bold text-[#94a3b8] hover:text-white cursor-pointer"
              >
                Cancel Invoice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  itemName: string;
  requiredUsd: number;
  currentUsd: number;
  onClose: () => void;
  onGoToDeposit: () => void;
  onInstantDemoTopup: () => void;
}

export function InsufficientBalanceModal({
  isOpen,
  itemName,
  requiredUsd,
  currentUsd,
  onClose,
  onGoToDeposit,
  onInstantDemoTopup,
}: InsufficientBalanceModalProps) {
  const shortfall = Math.max(0, requiredUsd - currentUsd);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-[390px] rounded-3xl bg-[#13191b] border border-[#ef4444]/40 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Not Enough Balance
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Cannot unlock <span className="text-white font-semibold">{itemName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('modal_close');
                  onClose();
                }}
                aria-label="Close modal"
                className="w-8 h-8 rounded-xl bg-[#0a0d0e] border border-[#1e292d] flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#0a0d0e] border border-[#1e292d] p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">Required Price:</span>
                <span
                  className="font-extrabold text-white tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ${requiredUsd.toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">Your Vault Balance:</span>
                <span
                  className="font-extrabold text-[#fbbf24] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ${currentUsd.toFixed(4)} USD
                </span>
              </div>
              <div className="border-t border-[#1e292d] pt-2 flex items-center justify-between">
                <span className="text-[#ef4444] font-semibold">Missing Amount:</span>
                <span
                  className="font-extrabold text-[#ef4444] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ${shortfall.toFixed(4)} USD
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  triggerHaptic('mode_topup');
                  onGoToDeposit();
                }}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#fbbf24] text-[#0a0d0e] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(245,158,11,0.28)] cursor-pointer"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>Top Up Wallet (GRAM / USDT / TRX)</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  triggerHaptic('recharge');
                  onInstantDemoTopup();
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#06b6d4]/15 hover:bg-[#06b6d4]/25 border border-[#06b6d4]/40 text-[#22d3ee] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Instant Sandbox Credit (+$5.00 USD)</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
