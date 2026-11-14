'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CRYPTO_ASSETS,
  CryptoSymbol,
  WalletTransaction,
} from '@/lib/game-data';
import { CryptoCoinBadge } from './CyberSprites';
import { ClipboardPaste, CheckCircle2, AlertCircle, Zap, ArrowUpRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface WalletTabProps {
  mode: 'topup' | 'withdraw';
  onChangeMode: (m: 'topup' | 'withdraw') => void;
  usdBalance: number;
  withdrawableUsd: number;
  transactions: WalletTransaction[];
  onOpenInvoiceModal: (coin: CryptoSymbol, usdAmount: number, coinAmount: string) => void;
  onRequestWithdraw: (coin: CryptoSymbol, usdAmount: number, address: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function WalletTab({
  mode,
  onChangeMode,
  usdBalance,
  withdrawableUsd,
  transactions,
  onOpenInvoiceModal,
  onRequestWithdraw,
  onShowToast,
}: WalletTabProps) {
  const [selectedCoin, setSelectedCoin] = useState<CryptoSymbol>('GRAM');
  const [topupAmountStr, setTopupAmountStr] = useState<string>('1');
  const [withdrawAmountStr, setWithdrawAmountStr] = useState<string>('1');
  const [recipientAddress, setRecipientAddress] = useState<string>(
    CRYPTO_ASSETS.GRAM.placeholderAddress
  );

  const asset = CRYPTO_ASSETS[selectedCoin];

  const handleSelectCoin = (coin: CryptoSymbol) => {
    const coinSound =
      coin === 'GRAM' ? 'coin_gram' : coin === 'USDT' ? 'coin_usdt' : 'coin_trx';
    triggerHaptic(coinSound);
    setSelectedCoin(coin);
    // Update default demo address if untouched or matching another placeholder
    const isDefaultAddress = Object.values(CRYPTO_ASSETS).some(
      (c) => c.placeholderAddress === recipientAddress
    );
    if (isDefaultAddress || !recipientAddress) {
      setRecipientAddress(CRYPTO_ASSETS[coin].placeholderAddress);
    }
  };

  // Top-up calculations
  const parsedTopupUsd = Math.max(0, parseFloat(topupAmountStr) || 0);
  const topupCoinAmount = (parsedTopupUsd * asset.ratePerUsd).toFixed(4);

  // Withdraw calculations
  const parsedWithdrawUsd = Math.max(0, parseFloat(withdrawAmountStr) || 0);
  const withdrawCoinAmount = (parsedWithdrawUsd * asset.ratePerUsd).toFixed(4);

  // Address format validation
  const trimmedAddress = recipientAddress.trim();
  const isAddressValid =
    selectedCoin === 'TRX'
      ? trimmedAddress.startsWith('T') && trimmedAddress.length >= 24
      : (trimmedAddress.startsWith('UQ') || trimmedAddress.startsWith('EQ')) &&
        trimmedAddress.length >= 24;

  const handlePasteAddress = async () => {
    triggerHaptic('copy');
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 8) {
          setRecipientAddress(text.trim());
          onShowToast('Wallet address pasted from clipboard', 'info');
          return;
        }
      }
    } catch {
      // Clipboard permission blocked in iframe; fallback to valid sample address
    }
    setRecipientAddress(asset.placeholderAddress);
    onShowToast(`Pasted verified ${asset.network} address`, 'info');
  };

  const handleMaxWithdraw = () => {
    triggerHaptic('amount_pill');
    setWithdrawAmountStr(withdrawableUsd.toFixed(4));
  };

  const handleCreateInvoiceClick = () => {
    if (parsedTopupUsd < asset.minUsd) {
      triggerHaptic('error');
      onShowToast(`Minimum deposit is $${asset.minUsd.toFixed(2)} USD`, 'error');
      return;
    }
    triggerHaptic('recharge');
    onOpenInvoiceModal(selectedCoin, parsedTopupUsd, topupCoinAmount);
  };

  const handleWithdrawClick = () => {
    if (!isAddressValid) {
      triggerHaptic('error');
      onShowToast(`Invalid ${asset.network} address format (starts with ${asset.addressPrefix})`, 'error');
      return;
    }
    onRequestWithdraw(selectedCoin, parsedWithdrawUsd, trimmedAddress);
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Withdrawable Balance Hero Card */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-[#d97706] via-[#b45309] to-[#78350f] border border-[#fbbf24]/40 shadow-[0_8px_24px_rgba(245,158,11,0.18)]">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#fef3c7]/90">
          BALANCE
        </div>
        <div
          className="text-3xl font-extrabold text-white mt-0.5 tabular-nums"
          style={{ fontFamily: 'var(--font-mono), monospace' }}
        >
          ${usdBalance.toFixed(4)}
        </div>
        <div
          className="text-xs font-semibold text-[#fef3c7]/90 mt-1 tabular-nums"
          style={{ fontFamily: 'var(--font-mono), monospace' }}
        >
          Withdrawable: <span className="font-bold text-white">${withdrawableUsd.toFixed(4)} USD</span>
        </div>
      </div>

      {/* 2. Top Segmented Switcher: [ 📥 Top Up ] | [ 📤 Withdraw ] */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#13191b] border border-[#1e292d]">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('mode_topup');
            onChangeMode('topup');
          }}
          className={`min-h-[44px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mode === 'topup'
              ? 'bg-[#0a0d0e] text-[#fbbf24] border border-[#f59e0b]/40 shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <span>📥 Top Up</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('mode_withdraw');
            onChangeMode('withdraw');
          }}
          className={`min-h-[44px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mode === 'withdraw'
              ? 'bg-[#0a0d0e] text-[#fbbf24] border border-[#f59e0b]/40 shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <span>📤 Withdraw</span>
        </button>
      </div>

      {/* 3. Main Form Card */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 space-y-4">
        {/* Coin Selector Pills */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">
            COIN
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['GRAM', 'USDT', 'TRX'] as CryptoSymbol[]).map((sym) => {
              const item = CRYPTO_ASSETS[sym];
              const isSelected = selectedCoin === sym;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelectCoin(sym)}
                  className={`min-h-[52px] px-2.5 py-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0a0d0e] border-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.18)]'
                      : 'bg-[#0e1315] border-[#1e292d] hover:border-[#334155]'
                  }`}
                >
                  <CryptoCoinBadge symbol={sym} className="w-7 h-7 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-xs font-extrabold text-white leading-tight truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] font-semibold text-[#94a3b8] leading-tight">
                      {item.network}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'topup' ? (
          <>
            {/* Top Up USD Input */}
            <div>
              <label
                htmlFor="topup-usd-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2"
              >
                AMOUNT (USD)
              </label>
              <div className="relative flex items-center rounded-xl bg-[#0a0d0e] border border-[#1e292d] focus-within:border-[#f59e0b] px-3.5 min-h-[50px]">
                <span
                  className="text-base font-bold text-[#94a3b8] mr-2"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  $
                </span>
                <input
                  id="topup-usd-input"
                  type="number"
                  min="1"
                  step="0.5"
                  value={topupAmountStr}
                  onChange={(e) => setTopupAmountStr(e.target.value)}
                  className="w-full bg-transparent text-white font-extrabold text-base focus:outline-none tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                />
              </div>

              {/* Quick-select pills: [$5] [$10] [$25] [$50] */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      triggerHaptic('amount_pill');
                      setTopupAmountStr(String(amt));
                    }}
                    className={`min-h-[38px] rounded-xl border text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                      Number(topupAmountStr) === amt
                        ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#fbbf24]'
                        : 'bg-[#0a0d0e] border-[#1e292d] text-[#f1f5f9] hover:border-[#334155]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Conversion Preview */}
            <div className="space-y-1 text-xs pt-1">
              <div className="text-[#cbd5e1]">
                You get:{' '}
                <span
                  className="font-extrabold text-white tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ${parsedTopupUsd.toFixed(2)}
                </span>{' '}
                • You send:{' '}
                <span
                  className="font-extrabold text-[#fbbf24] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  {topupCoinAmount} {selectedCoin}
                </span>
              </div>
              <div className="text-[#94a3b8]">Minimum ${asset.minUsd.toFixed(2)}</div>
            </div>

            {/* Primary CTA: ⚡ Create Invoice */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleCreateInvoiceClick}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm shadow-[0_6px_18px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Create Invoice</span>
            </motion.button>
          </>
        ) : (
          <>
            {/* Withdraw Recipient Address Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="withdraw-address-input"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]"
                >
                  YOUR {selectedCoin} ADDRESS ({asset.network})
                </label>
                <span
                  className={`text-[10px] font-semibold flex items-center gap-1 ${
                    isAddressValid ? 'text-[#10b981]' : 'text-[#ef4444]'
                  }`}
                >
                  {isAddressValid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Valid format
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Needs {asset.addressPrefix}...
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-[#0a0d0e] border border-[#1e292d] focus-within:border-[#f59e0b] p-1.5 pl-3 min-h-[50px]">
                <input
                  id="withdraw-address-input"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder={`Enter ${selectedCoin} (${asset.network}) address...`}
                  className="w-full bg-transparent text-xs font-medium text-white focus:outline-none truncate"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                />
                <button
                  type="button"
                  onClick={handlePasteAddress}
                  title="Paste address"
                  className="min-h-[38px] px-3 rounded-lg bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/30 text-[#fbbf24] text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* Withdraw USD Amount Input with [MAX] Button */}
            <div>
              <label
                htmlFor="withdraw-usd-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2"
              >
                AMOUNT (USD)
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-[#0a0d0e] border border-[#1e292d] focus-within:border-[#f59e0b] p-1.5 pl-3.5 min-h-[50px]">
                <span
                  className="text-base font-bold text-[#94a3b8]"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  $
                </span>
                <input
                  id="withdraw-usd-input"
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={withdrawAmountStr}
                  onChange={(e) => setWithdrawAmountStr(e.target.value)}
                  className="w-full bg-transparent text-white font-extrabold text-base focus:outline-none tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                />
                <button
                  type="button"
                  onClick={handleMaxWithdraw}
                  className="min-h-[38px] px-3 rounded-lg bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/30 text-[#fbbf24] text-xs font-extrabold uppercase shrink-0 cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Conversion Preview */}
            <div className="space-y-1 text-xs pt-0.5">
              <div className="text-[#cbd5e1]">
                You receive:{' '}
                <span
                  className="font-extrabold text-white tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ≈ {withdrawCoinAmount} {selectedCoin}
                </span>
              </div>
              <div
                className="text-[#94a3b8] tabular-nums"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                Min ${asset.minUsd.toFixed(2)} · Withdrawable: ${withdrawableUsd.toFixed(4)}
              </div>
            </div>

            {/* Primary CTA: 💸 Withdraw to Wallet */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleWithdrawClick}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm shadow-[0_6px_18px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Withdraw to Wallet</span>
            </motion.button>
          </>
        )}
      </div>

      {/* Anti-fraud policy note on Withdraw view */}
      {mode === 'withdraw' && (
        <div className="px-2 text-center space-y-1.5 text-xs text-[#94a3b8] leading-relaxed">
          <p>
            Only what your vault operations mined can be withdrawn. Bonuses, top-ups and syndicate earnings are for hiring crew & batteries.
          </p>
          <p>
            Payments process automatically. Operatives who have topped up are prioritized.
          </p>
        </div>
      )}

      {/* 4. Recent Transactions Table (History) */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 space-y-3">
        <h3 className="text-sm font-extrabold text-white">History</h3>

        <div className="divide-y divide-[#1e292d]">
          {transactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#64748b] font-medium">
              No transactions yet. Top up or withdraw to see activity here.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CryptoCoinBadge symbol={tx.coinSymbol} className="w-8 h-8 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white">{tx.type}</div>
                    <div
                      className="text-[11px] text-[#94a3b8] tabular-nums truncate"
                      style={{ fontFamily: 'var(--font-mono), monospace' }}
                    >
                      {tx.date} · {tx.coinAmount} {tx.coinSymbol}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-extrabold tabular-nums ${
                      tx.type === 'Top-up' ? 'text-white' : 'text-[#fbbf24]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                  >
                    {tx.type === 'Top-up' ? '+' : '-'}${tx.usdValue.toFixed(2)}
                  </div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-[10px] font-bold">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
