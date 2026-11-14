'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  SafecrackerId,
  DailyMilestone,
  GOLD_TO_USD_RATE,
  MIN_SMELT_GOLD,
} from '@/lib/game-data';
import HeistArena from './HeistArena';
import { BatterySprite } from './CyberSprites';
import { Check, Flame, Zap, Gift, ArrowRight } from 'lucide-react';

interface VaultTabProps {
  vaultGold: number;
  crewCounts: Record<SafecrackerId, number>;
  dailyGoldRate: number;
  dailyUsdRate: number;
  totalHackers: number;
  powerKwh: number;
  streakDays: DailyMilestone[];
  onSmeltGold: () => void;
  onOpenBatteryShop: () => void;
  onClaimStreakDay: (day: number) => void;
}

export default function VaultTab({
  vaultGold,
  crewCounts,
  dailyGoldRate,
  dailyUsdRate,
  totalHackers,
  powerKwh,
  streakDays,
  onSmeltGold,
  onOpenBatteryShop,
  onClaimStreakDay,
}: VaultTabProps) {
  const smeltUsdValue = vaultGold * GOLD_TO_USD_RATE;
  const smeltProgressPct = Math.min(100, (vaultGold / MIN_SMELT_GOLD) * 100);
  const isSmeltReady = vaultGold >= MIN_SMELT_GOLD;

  // Calculate how long current kWh lasts based on daily Gold/Power burn rate
  const burnRatePerDay = Math.max(dailyGoldRate, 5000);
  const totalHoursLeft = Math.max(0, Math.floor((powerKwh / burnRatePerDay) * 24));
  const daysLeft = Math.floor(totalHoursLeft / 24);
  const hoursLeft = totalHoursLeft % 24;
  const gridFillPct = Math.min(100, Math.max(8, (powerKwh / 50000) * 100));

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. 2.5D Animated Heist Arena (Pure Idle Tycoon — No Tap Clicker) */}
      <HeistArena
        vaultGold={vaultGold}
        crewCounts={crewCounts}
        powerKwh={powerKwh}
        dailyGoldRate={dailyGoldRate}
      />

      {/* 2. Integrated Bullion Smelter Console (Smelt Gold CTA + Refined Capacity Meter) */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-2.5 space-y-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={onSmeltGold}
          className="relative w-full min-h-[54px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#047857] via-[#059669] to-[#10b981] hover:brightness-110 border border-[#34d399]/40 shadow-[0_4px_16px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-between gap-2 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#064e3b]/80 border border-[#34d399]/40 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-[#fbbf24] fill-[#fbbf24]" />
            </div>
            <span className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase whitespace-nowrap">
              SMELT GOLD
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#064e3b]/75 border border-[#34d399]/30 text-xs sm:text-sm font-extrabold text-white tabular-nums whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            <span className="text-[#fde047]">{Math.floor(vaultGold).toLocaleString()}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6ee7b7]" />
            <span className="text-[#6ee7b7]">+${smeltUsdValue.toFixed(4)}</span>
          </div>
        </motion.button>

        {/* Sleek Recessed Smelter Threshold Bar Underneath */}
        <div className="px-1 pt-0.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#94a3b8]">
              Min sell:{' '}
              <strong
                className="text-[#f1f5f9] tabular-nums"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                {MIN_SMELT_GOLD.toLocaleString()} Gold
              </strong>
            </span>
            <span
              className={`tabular-nums font-bold ${
                isSmeltReady ? 'text-[#fbbf24]' : 'text-[#94a3b8]'
              }`}
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              {isSmeltReady
                ? 'SMELTER READY (100%)'
                : `${Math.floor(vaultGold).toLocaleString()} / ${MIN_SMELT_GOLD.toLocaleString()} (${Math.floor(smeltProgressPct)}%)`}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#090d0f] border border-[#1e292d] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fde047] transition-all duration-200"
              style={{ width: `${smeltProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Stats Triple-Card Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#94a3b8]">Gold / day</span>
          <div
            className="mt-1 text-sm sm:text-base font-extrabold text-white tabular-nums whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            {dailyGoldRate.toLocaleString()} 🪙
          </div>
        </div>

        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#94a3b8]">Earning / day</span>
          <div
            className="mt-1 text-sm sm:text-base font-extrabold text-[#10b981] tabular-nums whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            ${dailyUsdRate.toFixed(2)} 💵
          </div>
        </div>

        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#94a3b8]">Active Crew</span>
          <div
            className="mt-1 text-sm sm:text-base font-extrabold text-[#fbbf24] tabular-nums whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            {totalHackers} Hackers 🥷
          </div>
        </div>
      </div>

      {/* 4. Power Grid (Energy Fuel Section) */}
      <div className="rounded-2xl bg-[#13191b] border border-[#06b6d4]/45 shadow-[0_0_24px_rgba(6,182,212,0.08)] p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#0a0d0e] border border-[#06b6d4]/30 flex items-center justify-center shrink-0">
              <BatterySprite id="grid" className="w-10 h-10" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#06b6d4]">
                POWER GRID
              </div>
              <div
                className="text-lg font-extrabold text-white tabular-nums leading-tight truncate"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                {Math.floor(powerKwh).toLocaleString()}{' '}
                <span className="text-xs font-semibold text-[#06b6d4]">kWh</span>
              </div>
              <div className="text-xs text-[#94a3b8] mt-0.5">
                Lasts {daysLeft}d {hoursLeft}h
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenBatteryShop}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#0a0d0e] font-extrabold text-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Re-charge</span>
          </motion.button>
        </div>

        {/* Cyan-to-Emerald Progress Bar at ~75% */}
        <div className="w-full h-3 rounded-full bg-[#0a0d0e] border border-[#1e292d] overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] via-[#0891b2] to-[#10b981] transition-all duration-300"
            style={{ width: `${gridFillPct}%` }}
          />
        </div>

        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Hackers drill while power is live. No power, no gold — keep generators online.
        </p>
      </div>

      {/* 5. Daily Generator Supply (7-Day Streak) */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Daily Generator Supply</h2>
            <p className="text-xs text-[#94a3b8]">
              Come back every day — the power streak grows
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#fbbf24]">
            7-Day Bonus 🎁
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {streakDays.map((item) => {
            const isClaimed = item.claimed;
            const isClaimable = item.claimable && !item.claimed;

            return (
              <motion.button
                key={item.day}
                type="button"
                disabled={!isClaimable}
                onClick={() => isClaimable && onClaimStreakDay(item.day)}
                animate={isClaimable ? { y: [0, -4, 0] } : { y: 0 }}
                transition={
                  isClaimable
                    ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
                }
                className={`relative rounded-xl p-1.5 flex flex-col items-center justify-between min-h-[78px] border text-center transition-all ${
                  isClaimable
                    ? 'bg-gradient-to-b from-[#06b6d4]/25 to-[#10b981]/20 border-[#06b6d4] shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer'
                    : isClaimed
                    ? 'bg-[#0e1416] border-[#10b981]/35 opacity-85 cursor-default'
                    : 'bg-[#0a0d0e] border-[#1e292d] opacity-75 cursor-default'
                }`}
              >
                {isClaimed && (
                  <div className="absolute -top-1.5 -right-1 w-4 h-4 rounded-full bg-[#10b981] text-[#0a0d0e] flex items-center justify-center shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}

                <span className="text-[10px] font-semibold text-[#94a3b8]">
                  Day {item.day}
                </span>

                <div className="my-1 flex items-center justify-center">
                  {item.day === 7 ? (
                    <Gift className="w-4 h-4 text-[#fbbf24]" />
                  ) : (
                    <Zap
                      className={`w-4 h-4 ${
                        isClaimed
                          ? 'text-[#10b981]'
                          : isClaimable
                          ? 'text-[#06b6d4] fill-[#06b6d4]'
                          : 'text-[#64748b]'
                      }`}
                    />
                  )}
                </div>

                {isClaimable ? (
                  <span className="w-full py-0.5 rounded bg-[#06b6d4] text-[#0a0d0e] text-[9px] font-extrabold uppercase tracking-tight">
                    Claim
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-bold text-white tabular-nums"
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                  >
                    {item.label}
                  </span>
                )}

                {item.bonusTag && (
                  <span className="text-[8px] font-bold text-[#fbbf24] leading-none mt-0.5">
                    +Drone
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
