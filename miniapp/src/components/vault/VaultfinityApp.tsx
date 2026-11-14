'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TabId,
  SafecrackerId,
  SafecrackerUnit,
  BatteryPackItem,
  DailyMilestone,
  CryptoSymbol,
  WalletTransaction,
  AffiliateMember,
  SAFECRACKERS,
  INITIAL_STREAK,
  INITIAL_TRANSACTIONS,
  INITIAL_AFFILIATES,
  GOLD_TO_USD_RATE,
} from '@/lib/game-data';
import { triggerHaptic, setGlobalSoundEnabled, SoundEffectType } from '@/lib/haptics';
import { useAuth } from '@/context/AuthContext';
import {
  fetchVaultStatus,
  smeltGold as apiSmeltGold,
  buyCrew as apiBuyCrew,
  buyEnergy as apiBuyEnergy,
  fetchSyndicate as apiFetchSyndicate,
  claimSyndicatePurse as apiClaimSyndicatePurse,
  claimDailySupply as apiClaimDailySupply,
  requestWithdrawal,
  saveUserWallet,
  checkDeposit,
} from '@/services/api';
import VaultTab from './VaultTab';
import BlackMarketTab from './BlackMarketTab';
import WalletTab from './WalletTab';
import SyndicateTab from './SyndicateTab';
import { InvoiceModal, InsufficientBalanceModal } from './Modals';
import { Plus, Landmark, ShoppingCart, Wallet, Users, Volume2, VolumeX } from 'lucide-react';

interface FloatingToast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function VaultfinityApp() {
  const { user, refreshUser } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabId>('vault');
  const [marketSubTab, setMarketSubTab] = useState<'safecrackers' | 'batteries'>('safecrackers');
  const [walletMode, setWalletMode] = useState<'topup' | 'withdraw'>('topup');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Core Economy State (Clean Initial State: 0 Gold, 50,000 kWh starter power, $0.00 Balance)
  const [usdBalance, setUsdBalance] = useState<number>(0.0);
  const [withdrawableUsd, setWithdrawableUsd] = useState<number>(0.0);
  const [vaultGold, setVaultGold] = useState<number>(0.0);
  const [powerKwh, setPowerKwh] = useState<number>(50000);

  // Initial Owned Crew: 1 Starter Lockpick Rookie (5,000/day)
  const [crewCounts, setCrewCounts] = useState<Record<SafecrackerId, number>>({
    rookie: 1,
    specialist: 0,
    infiltrator: 0,
    boss: 0,
  });

  // 7-Day Daily Generator Streak
  const [streakDays, setStreakDays] = useState<DailyMilestone[]>(INITIAL_STREAK);

  // Wallet Transactions History
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  // Syndicate Referral State
  const defaultInviteLink = user?.telegram_id
    ? `https://t.me/hashbe_bot?start=${user.telegram_id}`
    : 'https://t.me/hashbe_bot';
  const [inviteLink, setInviteLink] = useState<string>(defaultInviteLink);
  const [unclaimedSyndicateLoot, setUnclaimedSyndicateLoot] = useState<number>(0.0);
  const [crewRecruited, setCrewRecruited] = useState<number>(0);
  const [totalSyndicateEarned, setTotalSyndicateEarned] = useState<number>(0.0);
  const [affiliates, setAffiliates] = useState<AffiliateMember[]>([]);

  // Synchronize with real backend on mount
  useEffect(() => {
    let isMounted = true;
    if (user?.honey_balance !== undefined) {
      setUsdBalance(user.honey_balance);
      setWithdrawableUsd(user.honey_balance);
    }
    if (user?.telegram_id) {
      setInviteLink(`https://t.me/hashbe_bot?start=${user.telegram_id}`);
    }

    const loadBackendStatus = async () => {
      try {
        const status = await fetchVaultStatus();
        if (!isMounted || !status) return;

        if (status.gold_stash !== undefined) setVaultGold(status.gold_stash);
        if (status.energy_kwh !== undefined) setPowerKwh(status.energy_kwh);

        if (status.crew && Array.isArray(status.crew)) {
          const newCounts: Record<SafecrackerId, number> = { rookie: 0, specialist: 0, infiltrator: 0, boss: 0 };
          status.crew.forEach((c) => {
            const t = c.crew_type.toLowerCase();
            if (t.includes('rookie')) newCounts.rookie = c.count;
            else if (t.includes('specialist')) newCounts.specialist = c.count;
            else if (t.includes('infiltrator')) newCounts.infiltrator = c.count;
            else if (t.includes('boss')) newCounts.boss = c.count;
          });
          if (newCounts.rookie === 0 && newCounts.specialist === 0 && newCounts.infiltrator === 0 && newCounts.boss === 0) {
            newCounts.rookie = 1;
          }
          setCrewCounts(newCounts);
        }

        if (status.streak_day) {
          setStreakDays((prev) =>
            prev.map((d) => {
              if (d.day < status.streak_day) return { ...d, claimed: true, claimable: false };
              if (d.day === status.streak_day) return { ...d, claimed: status.streak_claimed_today, claimable: !status.streak_claimed_today };
              return d;
            })
          );
        }
      } catch (e) {
        // Safe offline fallback
      }

      try {
        const synd = await apiFetchSyndicate();
        if (!isMounted || !synd) return;
        if (synd.invite_link) setInviteLink(synd.invite_link);
        if (synd.friends_count !== undefined) setCrewRecruited(synd.friends_count);
        if (synd.friends_purse_usd !== undefined) setUnclaimedSyndicateLoot(synd.friends_purse_usd);
        if (synd.total_earned_usd !== undefined) setTotalSyndicateEarned(synd.total_earned_usd);
        if (synd.recent_activities && Array.isArray(synd.recent_activities)) {
          const mapped: AffiliateMember[] = synd.recent_activities.map((a: any) => ({
            id: a.id,
            username: a.buyer_username ? `@${a.buyer_username.replace(/^@/, '')}` : '@operative',
            year: '2026',
            joinedAgo: 'recently',
            earnedUsd: Number(a.amount_usd || 0),
            crewSize: 1,
          }));
          setAffiliates(mapped);
        }
      } catch (e) {
        // Safe offline fallback
      }
    };

    loadBackendStatus();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Floating Toasts & Smelt Floating Animation
  const [toasts, setToasts] = useState<FloatingToast[]>([]);
  const [smeltFloatText, setSmeltFloatText] = useState<string | null>(null);

  // Modals State
  const [invoiceModal, setInvoiceModal] = useState<{
    isOpen: boolean;
    coin: CryptoSymbol;
    usdAmount: number;
    coinAmount: string;
  }>({
    isOpen: false,
    coin: 'GRAM',
    usdAmount: 1,
    coinAmount: '0.8928',
  });

  const [insufficientModal, setInsufficientModal] = useState<{
    isOpen: boolean;
    itemName: string;
    requiredUsd: number;
  }>({
    isOpen: false,
    itemName: '',
    requiredUsd: 0,
  });

  // Derived Crew Stats
  const dailyGoldRate = SAFECRACKERS.reduce(
    (sum, unit) => sum + (crewCounts[unit.id] || 0) * unit.goldPerDay,
    0
  );
  const dailyUsdRate = dailyGoldRate * GOLD_TO_USD_RATE;
  const totalHackers = Object.values(crewCounts).reduce((a, b) => a + b, 0);

  // Live Rolling Counter Loop (250ms tick for ultra-smooth mobile performance without excessive re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerKwh((currentPower) => {
        if (currentPower <= 0) return 0;
        // Scale tick rate so live counter and gold mountain visibly grow during preview
        const tickGold = (dailyGoldRate / 86400) * 3.5;
        setVaultGold((prevGold) => prevGold + tickGold);
        return Math.max(0, currentPower - tickGold * 0.25);
      });
    }, 250);

    return () => clearInterval(interval);
  }, [dailyGoldRate]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Handlers with Distinct Sound Effects per Tab & Action
  const handleTabSwitch = (tab: TabId) => {
    const tabSoundMap: Record<TabId, SoundEffectType> = {
      vault: 'tab_vault',
      market: 'tab_market',
      wallet: 'tab_wallet',
      syndicate: 'tab_syndicate',
    };
    triggerHaptic(tabSoundMap[tab], soundEnabled);
    setActiveTab(tab);
  };

  const handleJumpToDeposit = () => {
    triggerHaptic('mode_topup', soundEnabled);
    setWalletMode('topup');
    setActiveTab('wallet');
  };

  const handleSmeltGold = () => {
    if (vaultGold < 1) {
      triggerHaptic('warning', soundEnabled);
      showToast('No gold in the safe to smelt yet!', 'error');
      return;
    }

    const goldToSmelt = Math.floor(vaultGold);
    const usdEarned = goldToSmelt * GOLD_TO_USD_RATE;

    // Play drilling + gold extraction sound and empty the gold mountain completely
    triggerHaptic('drill', soundEnabled);
    setVaultGold(0);
    setUsdBalance((prev) => prev + usdEarned);
    setWithdrawableUsd((prev) => prev + usdEarned);

    const formattedUsd = `+$${usdEarned.toFixed(4)}`;
    setSmeltFloatText(formattedUsd);
    setTimeout(() => setSmeltFloatText(null), 1400);

    showToast(`Smelted ${goldToSmelt.toLocaleString()} Gold ➔ ${formattedUsd} USD!`, 'success');

    // Trigger backend smelt
    apiSmeltGold()
      .then((res) => {
        if (res?.new_balance !== undefined) {
          setUsdBalance(res.new_balance);
          setWithdrawableUsd(res.new_balance);
        }
        refreshUser();
      })
      .catch(() => {});
  };

  const handleClaimStreakDay = (day: number) => {
    const milestone = streakDays.find((d) => d.day === day);
    if (!milestone || milestone.claimed || !milestone.claimable) return;

    triggerHaptic('drill', soundEnabled);
    setPowerKwh((prev) => prev + milestone.kwh);
    setStreakDays((prev) =>
      prev.map((d) => {
        if (d.day === day) return { ...d, claimed: true, claimable: false };
        if (d.day === day + 1) return { ...d, claimable: true };
        return d;
      })
    );

    if (day === 7) {
      setCrewCounts((prev) => ({ ...prev, rookie: prev.rookie + 1 }));
      showToast(`Day 7 Claimed: +${milestone.kwh.toLocaleString()} kWh & Free Drill Drone!`, 'success');
    } else {
      showToast(`Day ${day} Generator Supply: +${milestone.kwh.toLocaleString()} kWh online!`, 'success');
    }

    apiClaimDailySupply()
      .then((res) => {
        if (res?.reward_kwh !== undefined) {
          setPowerKwh((prev) => prev + res.reward_kwh);
        }
      })
      .catch(() => {});
  };

  const handleBuySafecracker = (unit: SafecrackerUnit) => {
    if (usdBalance < unit.priceUsd) {
      triggerHaptic('error', soundEnabled);
      setInsufficientModal({
        isOpen: true,
        itemName: unit.name,
        requiredUsd: unit.priceUsd,
      });
      return;
    }

    triggerHaptic('drill', soundEnabled);
    setUsdBalance((prev) => Math.max(0, prev - unit.priceUsd));
    setCrewCounts((prev) => ({
      ...prev,
      [unit.id]: (prev[unit.id] || 0) + 1,
    }));
    showToast(`Hired ${unit.name}! +${unit.goldPerDay.toLocaleString()} Gold/day`, 'success');

    apiBuyCrew(unit.id)
      .then((res) => {
        if (res?.new_balance !== undefined) {
          setUsdBalance(res.new_balance);
        }
        refreshUser();
      })
      .catch(() => {});
  };

  const handleBuyBattery = (pack: BatteryPackItem) => {
    if (usdBalance < pack.priceUsd) {
      triggerHaptic('error', soundEnabled);
      setInsufficientModal({
        isOpen: true,
        itemName: pack.name,
        requiredUsd: pack.priceUsd,
      });
      return;
    }

    triggerHaptic('recharge', soundEnabled);
    setUsdBalance((prev) => Math.max(0, prev - pack.priceUsd));
    setPowerKwh((prev) => prev + pack.kwhAmount);
    showToast(`Charged +${pack.kwhAmount.toLocaleString()} kWh (${pack.name})!`, 'success');

    apiBuyEnergy(pack.id)
      .then((res) => {
        if (res?.new_balance !== undefined) {
          setUsdBalance(res.new_balance);
        }
        refreshUser();
      })
      .catch(() => {});
  };

  const handleOpenInvoiceModal = (coin: CryptoSymbol, usdAmount: number, coinAmount: string) => {
    setInvoiceModal({
      isOpen: true,
      coin,
      usdAmount,
      coinAmount,
    });
  };

  const handleVerifyBlockchainPayment = async (
    coin: CryptoSymbol,
    usdAmount: number,
    coinAmount: string
  ): Promise<{ verified: boolean; message?: string }> => {
    try {
      const res = await checkDeposit({
        coin,
        expected_usd: usdAmount,
        sender_address: user?.wallet_address || '',
      });

      if (res && res.verified) {
        if (res.profile?.honey_balance !== undefined) {
          setUsdBalance(res.profile.honey_balance);
          setWithdrawableUsd(res.profile.honey_balance);
        } else {
          setUsdBalance((prev) => prev + usdAmount);
          setWithdrawableUsd((prev) => prev + usdAmount);
        }

        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
          today.getMonth() + 1
        ).padStart(2, '0')}/26`;

        const newTx: WalletTransaction = {
          id: `tx-${Date.now()}`,
          type: 'Top-up',
          date: dateStr,
          coinAmount,
          coinSymbol: coin,
          usdValue: usdAmount,
          status: 'Credited',
        };
        setTransactions((prev) => [newTx, ...prev]);
        if (refreshUser) refreshUser();
        showToast(`Payment confirmed! Credited +$${usdAmount.toFixed(2)} USD`, 'success');
        return { verified: true, message: 'Payment confirmed! Balance credited.' };
      }

      return {
        verified: false,
        message:
          res?.message ||
          'Payment not detected. Please complete your payment and try again.',
      };
    } catch {
      return {
        verified: false,
        message:
          'Payment not detected. Please complete your payment and try again.',
      };
    }
  };

  const handleSaveWalletAddress = async (address: string, network: string) => {
    try {
      await saveUserWallet(address, network);
      if (refreshUser) refreshUser();
      showToast(`Personal ${network} address registered!`, 'success');
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to register address';
      showToast(errMsg, 'error');
    }
  };

  const handleRequestWithdraw = async (coin: CryptoSymbol, usdAmount: number, address: string) => {
    if (usdAmount < 1.0) {
      triggerHaptic('error', soundEnabled);
      showToast('Minimum withdrawal is $1.00 USD', 'error');
      return;
    }
    if (usdAmount > withdrawableUsd) {
      triggerHaptic('error', soundEnabled);
      setInsufficientModal({
        isOpen: true,
        itemName: `${coin} Withdrawal ($${usdAmount.toFixed(2)})`,
        requiredUsd: usdAmount,
      });
      return;
    }

    triggerHaptic('drill', soundEnabled);
    try {
      const net = coin === 'TRX' ? 'TRX' : coin === 'USDT' ? 'USDT' : 'GRAM';
      await requestWithdrawal(usdAmount, address, net);
      // Auto-save the validated wallet address
      await saveUserWallet(address, coin === 'TRX' ? 'TRON' : 'TON');

      setWithdrawableUsd((prev) => Math.max(0, prev - usdAmount));
      setUsdBalance((prev) => Math.max(0, prev - usdAmount));

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'Withdraw',
        date: new Date().toLocaleDateString(),
        coinAmount: (usdAmount * (coin === 'GRAM' ? 0.8928 : coin === 'TRX' ? 6.45 : 1)).toFixed(4),
        coinSymbol: coin,
        usdValue: usdAmount,
        status: 'Processing',
      };
      setTransactions((prev) => [newTx, ...prev]);
      showToast(
        `Withdrawal of $${usdAmount.toFixed(2)} USD queued for payout!`,
        'success'
      );
      if (refreshUser) refreshUser();
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Withdrawal request failed';
      showToast(errMsg, 'error');
    }
  };

  const handleCollectSyndicatePurse = () => {
    if (unclaimedSyndicateLoot <= 0) {
      triggerHaptic('warning', soundEnabled);
      showToast('No unclaimed syndicate loot yet! Click "+Test Recruit" or invite crew.', 'info');
      return;
    }

    triggerHaptic('drill', soundEnabled);
    const amount = unclaimedSyndicateLoot;
    setUnclaimedSyndicateLoot(0);
    setUsdBalance((prev) => prev + amount);
    showToast(`Collected +$${amount.toFixed(2)} USD from Syndicate Purse!`, 'success');

    apiClaimSyndicatePurse()
      .then((res) => {
        if (res?.new_balance !== undefined) {
          setUsdBalance(res.new_balance);
        }
        refreshUser();
      })
      .catch(() => {});
  };

  return (
    <div className="w-full h-screen bg-[#060809] flex items-center justify-center overflow-hidden">
      {/* Mobile-First TMA Locked 440px Container, 100vh Height, No Browser Scrollbars */}
      <div className="relative w-full max-w-[440px] h-screen bg-[#0a0d0e] sm:border-x sm:border-[#1e292d] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)]">
        {/* Floating Green Smelt Toast & General Toasts */}
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-[400px] px-4 flex flex-col items-center gap-1.5">
          <AnimatePresence>
            {smeltFloatText && (
              <motion.div
                key="smelt-float"
                initial={{ opacity: 0, y: 20, scale: 0.85 }}
                animate={{ opacity: 1, y: -6, scale: 1.08 }}
                exit={{ opacity: 0, y: -24, scale: 0.9 }}
                className="px-4 py-1.5 rounded-full bg-[#10b981] text-[#0a0d0e] font-extrabold text-sm shadow-[0_6px_20px_rgba(16,185,129,0.5)] tabular-nums"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                {smeltFloatText} USD CREDITED
              </motion.div>
            )}
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold shadow-lg backdrop-blur-md text-center ${
                  toast.type === 'error'
                    ? 'bg-[#1f1214]/95 border-[#ef4444]/50 text-[#fca5a5]'
                    : toast.type === 'info'
                    ? 'bg-[#101c20]/95 border-[#06b6d4]/50 text-[#67e8f9]'
                    : 'bg-[#0d1f18]/95 border-[#10b981]/50 text-[#6ee7b7]'
                }`}
              >
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 1. Sticky Top Header */}
        <header className="shrink-0 h-[62px] px-3.5 bg-[#0e1315]/95 backdrop-blur-md border-b border-[#1e292d] flex items-center justify-between gap-2 z-30">
          {/* Left: Bot Avatar with Hammer badge + Heist Miner branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#06b6d4] shadow-[0_0_14px_rgba(245,158,11,0.4)] shrink-0">
              <div className="w-full h-full rounded-full bg-[#0a0d0e] flex items-center justify-center overflow-hidden relative">
                <img
                  src="/bot_avatar.jpg"
                  alt="Heist Miner 🔨"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-sm font-extrabold text-[#fbbf24]">🔨</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border border-[#060809] flex items-center justify-center text-[9px]">
                🔨
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white truncate flex items-center gap-1">
                  <span>Heist Miner</span>
                  <span className="text-xs">🔨</span>
                </span>
                <span className="text-[10px] font-bold text-[#fbbf24] bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                  {user?.username ? `@${user.username}` : 'Operative'}
                </span>
              </div>
              <div className="text-[10px] text-[#94a3b8] truncate font-mono">
                Cyber Heist Tycoon
              </div>
            </div>
          </div>

          {/* Right: Sound Toggle + Balance Pill with Green [+] Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextSound = !soundEnabled;
                setSoundEnabled(nextSound);
                setGlobalSoundEnabled(nextSound);
                if (nextSound) {
                  triggerHaptic('sound_toggle', true);
                }
              }}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
              className="w-8 h-8 rounded-full bg-[#13191b] border border-[#1e292d] flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-[#f8fafc] text-[#0a0d0e] shadow-sm">
              <span
                className="text-xs font-extrabold tabular-nums tracking-tight"
                style={{ fontFamily: 'var(--font-mono), monospace' }}
              >
                ${usdBalance.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={handleJumpToDeposit}
                aria-label="Top up balance in Wallet"
                className="w-6 h-6 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center shadow transition-transform active:scale-90 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </header>

        {/* 2. Scrollable Main Viewport Area (Hidden Scrollbar) */}
        <main className="flex-1 overflow-y-auto no-scrollbar px-3.5 pt-3.5 pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'vault' && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
              >
                <VaultTab
                  vaultGold={vaultGold}
                  crewCounts={crewCounts}
                  dailyGoldRate={dailyGoldRate}
                  dailyUsdRate={dailyUsdRate}
                  totalHackers={totalHackers}
                  powerKwh={powerKwh}
                  streakDays={streakDays}
                  onSmeltGold={handleSmeltGold}
                  onOpenBatteryShop={() => {
                    triggerHaptic('recharge', soundEnabled);
                    setMarketSubTab('batteries');
                    setActiveTab('market');
                  }}
                  onClaimStreakDay={handleClaimStreakDay}
                />
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div
                key="market"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
              >
                <BlackMarketTab
                  subTab={marketSubTab}
                  onChangeSubTab={(sub) => {
                    triggerHaptic(
                      sub === 'safecrackers' ? 'subtab_safecrackers' : 'subtab_batteries',
                      soundEnabled
                    );
                    setMarketSubTab(sub);
                  }}
                  crewCounts={crewCounts}
                  powerKwh={powerKwh}
                  dailyGoldRate={dailyGoldRate}
                  onBuySafecracker={handleBuySafecracker}
                  onBuyBattery={handleBuyBattery}
                />
              </motion.div>
            )}

            {activeTab === 'wallet' && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
              >
                <WalletTab
                  mode={walletMode}
                  onChangeMode={setWalletMode}
                  usdBalance={usdBalance}
                  withdrawableUsd={withdrawableUsd}
                  transactions={transactions}
                  savedWalletAddress={user?.wallet_address}
                  savedWalletNetwork={user?.wallet_network}
                  onOpenInvoiceModal={handleOpenInvoiceModal}
                  onRequestWithdraw={handleRequestWithdraw}
                  onSaveWalletAddress={handleSaveWalletAddress}
                  onShowToast={showToast}
                />
              </motion.div>
            )}

            {activeTab === 'syndicate' && (
              <motion.div
                key="syndicate"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
              >
                <SyndicateTab
                  inviteLink={inviteLink}
                  unclaimedLoot={unclaimedSyndicateLoot}
                  crewRecruited={crewRecruited}
                  totalLootEarned={totalSyndicateEarned}
                  affiliates={affiliates}
                  onCollectPurse={handleCollectSyndicatePurse}
                  onShowToast={showToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 3. Fixed 4-Tab Bottom Navigation Bar */}
        <nav
          aria-label="Primary bottom navigation"
          className="shrink-0 h-[68px] px-2 bg-[#0e1315]/95 backdrop-blur-md border-t border-[#1e292d] grid grid-cols-4 items-center gap-1.5 z-30"
        >
          <button
            type="button"
            onClick={() => handleTabSwitch('vault')}
            className={`h-[54px] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[#fbbf24]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Landmark className="w-5 h-5" />
            <span className="text-[11px] font-bold mt-0.5 whitespace-nowrap">
              🏛️ Vault
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('market')}
            className={`h-[54px] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'market'
                ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[#fbbf24]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[11px] font-bold mt-0.5 whitespace-nowrap">
              🛒 Black Market
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('wallet')}
            className={`h-[54px] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[#fbbf24]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[11px] font-bold mt-0.5 whitespace-nowrap">
              💼 Wallet
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('syndicate')}
            className={`h-[54px] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'syndicate'
                ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[#fbbf24]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px] font-bold mt-0.5 whitespace-nowrap">
              👥 Syndicate
            </span>
          </button>
        </nav>

        {/* Interactive Modals */}
        <InvoiceModal
          isOpen={invoiceModal.isOpen}
          coin={invoiceModal.coin}
          usdAmount={invoiceModal.usdAmount}
          coinAmount={invoiceModal.coinAmount}
          onClose={() => setInvoiceModal((prev) => ({ ...prev, isOpen: false }))}
          onVerifyPayment={handleVerifyBlockchainPayment}
        />

        <InsufficientBalanceModal
          isOpen={insufficientModal.isOpen}
          itemName={insufficientModal.itemName}
          requiredUsd={insufficientModal.requiredUsd}
          currentUsd={usdBalance}
          onClose={() => setInsufficientModal((prev) => ({ ...prev, isOpen: false }))}
          onGoToDeposit={() => {
            setInsufficientModal((prev) => ({ ...prev, isOpen: false }));
            setWalletMode('topup');
            setActiveTab('wallet');
          }}
        />
      </div>
    </div>
  );
}
