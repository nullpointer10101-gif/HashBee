'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  SAFECRACKERS,
  BATTERY_PACKS,
  SafecrackerId,
  SafecrackerUnit,
  BatteryPackItem,
} from '@/lib/game-data';
import { SafecrackerSprite, BatterySprite } from './CyberSprites';
import { Zap } from 'lucide-react';

interface BlackMarketTabProps {
  subTab: 'safecrackers' | 'batteries';
  onChangeSubTab: (sub: 'safecrackers' | 'batteries') => void;
  crewCounts: Record<SafecrackerId, number>;
  powerKwh: number;
  dailyGoldRate: number;
  onBuySafecracker: (unit: SafecrackerUnit) => void;
  onBuyBattery: (pack: BatteryPackItem) => void;
}

export default function BlackMarketTab({
  subTab,
  onChangeSubTab,
  crewCounts,
  powerKwh,
  dailyGoldRate,
  onBuySafecracker,
  onBuyBattery,
}: BlackMarketTabProps) {
  const burnRatePerDay = Math.max(dailyGoldRate, 5000);
  const totalHoursLeft = Math.max(0, Math.floor((powerKwh / burnRatePerDay) * 24));
  const daysLeft = Math.floor(totalHoursLeft / 24);
  const hoursLeft = totalHoursLeft % 24;

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Top Segmented Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#13191b] border border-[#1e292d]">
        <button
          type="button"
          onClick={() => onChangeSubTab('safecrackers')}
          className={`min-h-[44px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'safecrackers'
              ? 'bg-[#0a0d0e] text-[#fbbf24] border border-[#f59e0b]/40 shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <span>🥷 Safecrackers</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeSubTab('batteries')}
          className={`min-h-[44px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            subTab === 'batteries'
              ? 'bg-[#0a0d0e] text-[#06b6d4] border border-[#06b6d4]/40 shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <span>⚡ Power Batteries</span>
        </button>
      </div>

      {subTab === 'safecrackers' ? (
        <div className="space-y-3.5">
          {/* Sub-headline */}
          <p className="text-xs text-[#94a3b8] leading-relaxed px-0.5">
            Every safecracker cracks gold continuously while battery is live. Buy duplicates to stack speed.
          </p>

          {/* 2-Column Safecrackers Grid */}
          <div className="grid grid-cols-2 gap-3">
            {SAFECRACKERS.map((unit) => {
              const ownedCount = crewCounts[unit.id] || 0;
              return (
                <div
                  key={unit.id}
                  className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 flex flex-col justify-between hover:border-[#2d3d43] transition-colors"
                >
                  {/* Sprite Stage Box */}
                  <div className="relative w-full h-36 rounded-xl bg-[#0a0d0e] border border-[#1a2327] flex items-center justify-center overflow-hidden mb-3">
                    {/* Subtle radial spotlight */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        background: `radial-gradient(circle at 50% 55%, ${unit.accentColor}, transparent 70%)`,
                      }}
                    />

                    {/* Owned Multiplier Tag (Top-Left, e.g., x1) */}
                    {ownedCount > 0 && (
                      <span
                        className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#0a0d0e] text-[11px] font-extrabold tabular-nums shadow"
                        style={{ fontFamily: 'var(--font-mono), monospace' }}
                      >
                        x{ownedCount}
                      </span>
                    )}

                    {/* Daily ROI Badge (Top-Right) */}
                    <span
                      className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                        unit.isHot
                          ? 'bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/40'
                          : 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                      }`}
                    >
                      {unit.roiBadge}
                    </span>

                    <SafecrackerSprite id={unit.id} className="w-full h-full relative z-0" />
                  </div>

                  {/* Unit Title & Yield Info */}
                  <div className="text-center space-y-1 mb-3">
                    <h3 className="text-sm font-extrabold text-white truncate">
                      {unit.name}
                    </h3>
                    <div
                      className="text-xs font-bold text-[#f1f5f9] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono), monospace' }}
                    >
                      🪙 {unit.goldPerDay.toLocaleString()}/day
                    </div>
                    <div
                      className="text-[11px] font-medium text-[#94a3b8] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono), monospace' }}
                    >
                      ≈ ${unit.usdPerDay.toFixed(unit.usdPerDay < 0.1 ? 2 : unit.usdPerDay === 0.275 ? 3 : 2)}/day
                    </div>
                  </div>

                  {/* Buy Button */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onBuySafecracker(unit)}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm shadow-[0_4px_12px_rgba(245,158,11,0.25)] transition-all cursor-pointer tabular-nums"
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                  >
                    ${unit.priceUsd.toFixed(2)}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Top Current Power Grid Status Card */}
          <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-xl bg-[#0a0d0e] border border-[#06b6d4]/35 flex items-center justify-center shrink-0">
              <BatterySprite id="grid" className="w-11 h-11" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                🔋 CURRENT GRID
              </div>
              <div
                className="text-xl font-extrabold text-white tabular-nums"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                {Math.floor(powerKwh).toLocaleString()} <span className="text-sm font-bold text-[#06b6d4]">kWh</span>
              </div>
              <div className="text-xs text-[#94a3b8]">
                Lasts {daysLeft}d {hoursLeft}h
              </div>
            </div>
          </div>

          {/* Power Batteries Consumables List */}
          <div className="space-y-3">
            {BATTERY_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl bg-[#13191b] p-4 flex items-center justify-between gap-3 transition-colors ${
                  pack.bestValue
                    ? 'border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.12)] mt-2'
                    : 'border border-[#1e292d]'
                }`}
              >
                {pack.bestValue && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-[#0a0d0e] text-[10px] font-extrabold uppercase tracking-wider shadow">
                    BEST VALUE
                  </span>
                )}

                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-2xl bg-[#0a0d0e] border border-[#1e292d] flex items-center justify-center shrink-0">
                    <BatterySprite id={pack.id} className="w-14 h-14" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-white truncate">
                      {pack.name}
                    </h3>
                    <div
                      className="flex items-center gap-1 text-sm font-extrabold text-[#06b6d4] tabular-nums mt-0.5"
                      style={{ fontFamily: 'var(--font-mono), monospace' }}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>+{pack.kwhAmount.toLocaleString()} kWh</span>
                    </div>
                    <div className="text-xs text-[#94a3b8] mt-0.5">
                      Powers your crew {pack.durationLabel}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onBuyBattery(pack)}
                  className="min-h-[46px] min-w-[88px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm shadow-[0_4px_12px_rgba(245,158,11,0.25)] shrink-0 cursor-pointer tabular-nums"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  ${pack.priceUsd.toFixed(2)}
                </motion.button>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#94a3b8] leading-relaxed px-1 pt-1">
            Hackers drill gold while power is live. No power, no gold — keep the generator grid full.
          </p>
        </div>
      )}
    </div>
  );
}
