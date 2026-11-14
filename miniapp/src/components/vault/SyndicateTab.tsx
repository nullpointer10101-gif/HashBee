'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AffiliateMember } from '@/lib/game-data';
import { SyndicateHeroIllustration } from './CyberSprites';
import { Copy, Check, Share2, UserPlus } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface SyndicateTabProps {
  unclaimedLoot: number;
  crewRecruited: number;
  totalLootEarned: number;
  affiliates: AffiliateMember[];
  onCollectPurse: () => void;
  onSimulateReferral: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const REFERRAL_LINK = 'https://t.me/VaultfinityBot?start=644618';

export default function SyndicateTab({
  unclaimedLoot,
  crewRecruited,
  totalLootEarned,
  affiliates,
  onCollectPurse,
  onSimulateReferral,
  onShowToast,
}: SyndicateTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    triggerHaptic('copy');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(REFERRAL_LINK);
      }
    } catch {
      // Fallback for sandboxed iframe
    }
    setCopied(true);
    onShowToast('Syndicate invite link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteCrew = () => {
    triggerHaptic('share');
    const shareText = encodeURIComponent(
      '🥷 Join my Cyberpunk Bank Vault Heist crew in Vaultfinity! Crack gold 24/7 and cash out in TON & USDT:'
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      REFERRAL_LINK
    )}&text=${shareText}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      handleCopyLink();
      onShowToast('Invite link ready to share on Telegram!', 'info');
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Hero Illustration Banner */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#9a3412] via-[#b45309] to-[#d97706] border border-[#fbbf24]/40 text-center flex flex-col items-center shadow-[0_8px_24px_rgba(245,158,11,0.18)]">
        <SyndicateHeroIllustration className="w-44 h-28 mb-1" />
        <h2 className="text-lg font-extrabold text-white tracking-tight">
          Recruit your heist crew, earn together forever.
        </h2>
        <p className="text-xs text-[#fef3c7]/90 mt-1 max-w-[320px] leading-relaxed">
          You earn a cut of every safecracker and every battery pack they buy — forever.
        </p>
      </div>

      {/* 2. Three Reward Rule Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 text-center flex flex-col items-center justify-center">
          <div
            className="text-base font-extrabold text-[#fbbf24] tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            10%
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1 leading-snug">
            of every Safecracker they hire
          </p>
        </div>

        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 text-center flex flex-col items-center justify-center">
          <div
            className="text-base font-extrabold text-[#06b6d4] tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            10%
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1 leading-snug">
            of every Battery Pack they buy
          </p>
        </div>

        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3 text-center flex flex-col items-center justify-center">
          <div
            className="text-base font-extrabold text-[#10b981] tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            $0.02
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1 leading-snug">
            instant bounty on their first hire
          </p>
        </div>
      </div>

      {/* 3. Invite Box + Rocket CTA */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
          YOUR INVITE LINK
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#0a0d0e] border border-[#1e292d] p-1.5 pl-3 min-h-[48px]">
          <input
            type="text"
            readOnly
            value={REFERRAL_LINK}
            aria-label="Your Syndicate invite link"
            className="w-full bg-transparent text-xs font-medium text-[#e2e8f0] focus:outline-none truncate select-all"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          />
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy referral link"
            className="min-h-[38px] px-3 rounded-lg bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/35 text-[#fbbf24] text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10b981]" />
                <span className="text-[#10b981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleInviteCrew}
          className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm shadow-[0_6px_18px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>🚀 Invite Crew</span>
        </motion.button>
      </div>

      {/* 4. Syndicate Purse Card */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              SYNDICATE PURSE
            </span>
            <button
              type="button"
              onClick={onSimulateReferral}
              className="text-[10px] font-bold text-[#06b6d4] hover:underline flex items-center gap-0.5 cursor-pointer"
              title="Simulate a new crew recruit commission"
            >
              <UserPlus className="w-3 h-3" />
              <span>+Test Recruit</span>
            </button>
          </div>
          <div className="text-xs text-[#94a3b8] mt-0.5">Unclaimed Loot:</div>
          <div
            className="text-2xl font-extrabold text-white tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            ${unclaimedLoot.toFixed(2)}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onCollectPurse}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
            unclaimedLoot > 0
              ? 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)]'
              : 'bg-[#1e292d] text-[#94a3b8] hover:text-white border border-[#2d3d43]'
          }`}
        >
          Collect to Balance
        </motion.button>
      </div>

      {/* 5. Stats 2-Column Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3.5">
          <div className="text-xs font-medium text-[#94a3b8]">Crew Recruited</div>
          <div
            className="text-xl font-extrabold text-white mt-1 tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            {crewRecruited.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-3.5">
          <div className="text-xs font-medium text-[#94a3b8]">Loot Earned</div>
          <div
            className="text-xl font-extrabold text-[#10b981] mt-1 tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            ${totalLootEarned.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 6. Recent Affiliate Feed */}
      <div className="rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 space-y-3">
        <h3 className="text-sm font-extrabold text-white">Earnings from crew</h3>

        <div className="divide-y divide-[#1e292d]">
          {affiliates.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#64748b] font-medium">
              No recruits yet. Share your invite link above to start earning 10% lifetime cuts!
            </div>
          ) : (
            affiliates.map((member) => (
              <div
                key={member.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white truncate">
                      {member.username}
                    </span>
                    <span
                      className="text-xs font-semibold text-[#64748b] tabular-nums"
                      style={{ fontFamily: 'var(--font-mono), monospace' }}
                    >
                      {member.year}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94a3b8]">
                    Joined {member.joinedAgo} · {member.crewSize} Safecrackers
                  </div>
                </div>

                <div
                  className="text-xs font-extrabold text-[#10b981] tabular-nums shrink-0"
                  style={{ fontFamily: 'var(--font-mono), monospace' }}
                >
                  +${member.earnedUsd.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
