export type TabId = 'vault' | 'market' | 'wallet' | 'syndicate';

export type SafecrackerId = 'rookie' | 'specialist' | 'infiltrator' | 'boss';

export interface SafecrackerUnit {
  id: SafecrackerId;
  name: string;
  roleTitle: string;
  roiBadge: string;
  isHot?: boolean;
  goldPerDay: number;
  usdPerDay: number;
  priceUsd: number;
  powerPerDay: number; // kWh consumed per day
  accentColor: string;
}

export interface BatteryPackItem {
  id: 'pack' | 'plasma' | 'reactor';
  name: string;
  kwhAmount: number;
  durationLabel: string;
  priceUsd: number;
  bestValue?: boolean;
}

export interface DailyMilestone {
  day: number;
  kwh: number;
  label: string;
  claimed: boolean;
  claimable?: boolean;
  bonusTag?: string;
}

export type CryptoSymbol = 'GRAM' | 'USDT' | 'TRX';

export interface CryptoAssetConfig {
  symbol: CryptoSymbol;
  name: string;
  network: string;
  ratePerUsd: number; // how many coins per $1 USD
  minUsd: number;
  placeholderAddress: string;
  addressPrefix: string;
}

export interface WalletTransaction {
  id: string;
  type: 'Top-up' | 'Withdraw';
  date: string;
  coinAmount: string;
  coinSymbol: CryptoSymbol;
  usdValue: number;
  status: 'Credited' | 'Completed' | 'Processing';
}

export interface AffiliateMember {
  id: string;
  username: string;
  year: string;
  joinedAgo: string;
  earnedUsd: number;
  crewSize: number;
}

export const SAFECRACKERS: SafecrackerUnit[] = [
  {
    id: 'rookie',
    name: 'Lockpick Rookie',
    roleTitle: 'Sub-dermal bypass & pin tumbler specialist',
    roiBadge: '10%/day',
    goldPerDay: 5000,
    usdPerDay: 0.05,
    priceUsd: 0.50,
    powerPerDay: 5000,
    accentColor: '#fbbf24',
  },
  {
    id: 'specialist',
    name: 'Drill Specialist',
    roleTitle: 'Thermal plasma lance & titanium core cutter',
    roiBadge: '10%/day',
    goldPerDay: 10000,
    usdPerDay: 0.10,
    priceUsd: 1.00,
    powerPerDay: 10000,
    accentColor: '#06b6d4',
  },
  {
    id: 'infiltrator',
    name: 'Cyber Infiltrator',
    roleTitle: 'Zero-day biometric spoofing & duffle runner',
    roiBadge: '11%/day',
    goldPerDay: 27500,
    usdPerDay: 0.275,
    priceUsd: 2.50,
    powerPerDay: 27500,
    accentColor: '#10b981',
  },
  {
    id: 'boss',
    name: 'Master Vault Boss',
    roleTitle: 'Quantum cipher decryptor & syndicate commander',
    roiBadge: '🔥 12%/day',
    isHot: true,
    goldPerDay: 60000,
    usdPerDay: 0.60,
    priceUsd: 5.00,
    powerPerDay: 60000,
    accentColor: '#f59e0b',
  },
];

export const BATTERY_PACKS: BatteryPackItem[] = [
  {
    id: 'pack',
    name: 'Battery Pack',
    kwhAmount: 50000,
    durationLabel: '3d 8h',
    priceUsd: 0.10,
  },
  {
    id: 'plasma',
    name: 'Plasma Cell',
    kwhAmount: 300000,
    durationLabel: '20d 0h',
    priceUsd: 0.50,
  },
  {
    id: 'reactor',
    name: 'Nuclear Micro-Reactor',
    kwhAmount: 2000000,
    durationLabel: '133d 8h',
    priceUsd: 3.00,
    bestValue: true,
  },
];

export const INITIAL_STREAK: DailyMilestone[] = [
  { day: 1, kwh: 2000, label: '2,000', claimed: false, claimable: true },
  { day: 2, kwh: 3000, label: '3,000', claimed: false },
  { day: 3, kwh: 4000, label: '4,000', claimed: false },
  { day: 4, kwh: 5000, label: '5,000', claimed: false },
  { day: 5, kwh: 6000, label: '6,000', claimed: false },
  { day: 6, kwh: 8000, label: '8,000', claimed: false },
  { day: 7, kwh: 12000, label: '12K', claimed: false, bonusTag: '+Drone 🎁' },
];

export const CRYPTO_ASSETS: Record<CryptoSymbol, CryptoAssetConfig> = {
  GRAM: {
    symbol: 'GRAM',
    name: 'GRAM',
    network: 'TON',
    ratePerUsd: 0.892857143,
    minUsd: 1.0,
    placeholderAddress: 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXt7vK82mLp9zR',
    addressPrefix: 'UQ',
  },
  USDT: {
    symbol: 'USDT',
    name: 'USD₮',
    network: 'TON',
    ratePerUsd: 1.0,
    minUsd: 1.0,
    placeholderAddress: 'UQDAqNQO65I06uJT4oxnfQPAQoE3qnMYYSeXt7vK82mLp9zR',
    addressPrefix: 'UQ',
  },
  TRX: {
    symbol: 'TRX',
    name: 'TRX',
    network: 'TRON',
    ratePerUsd: 6.4516129,
    minUsd: 1.0,
    placeholderAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
    addressPrefix: 'T',
  },
};

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [];

export const INITIAL_AFFILIATES: AffiliateMember[] = [];

// 100,000 Gold = $1.00 USD => 1,000 Gold = $0.01 USD => 281 Gold = $0.00281 USD
export const GOLD_TO_USD_RATE = 0.00001;
export const MIN_SMELT_GOLD = 1000;
