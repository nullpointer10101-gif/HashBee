export interface User {
  id: string
  telegram_id: number
  username: string
  first_name: string
  last_name: string
  honey_balance: number
  bee_power: number
  max_hive_capacity: number
  current_unclaimed_honey: number
  last_claimed_at: string
  hive_full_at: string
  streak_count: number
  last_streak_date: string
  ref_code: string
  referrer_id?: string
  spin_balance?: number
  status?: string
  created_at: string
}

export interface UpgradeOption {
  id: string
  name: string
  description: string
  power_bonus: number
  cost_honey: number
  icon: string
  category: 'nectar' | 'queen' | 'hive'
}

export interface Mission {
  id: string
  title: string
  description?: string
  reward_honey?: number
  reward_power: number
  type: string
  target_url?: string
  is_completed: boolean
  expires_at?: string
  milestone_count?: number
  progress?: number
}

export interface Withdrawal {
  id: string
  amount_honey: number
  amount_usd: number
  wallet_address: string
  payout_method: 'TON' | 'STARS' | 'CRYPTO'
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  reinvested: boolean
  created_at: string
}

export interface Campaign {
  id: string
  owner_user_id?: string
  title: string
  type: 'link' | 'channel' | 'group' | 'bot' | string
  target: string
  total_completions: number
  done_completions: number
  reward_bp: number
  cost: number
  status: 'waiting_for_payment' | 'active' | 'finished' | 'pending' | 'cancelled' | string
  payment_memo?: string
  created_at: string
}

export interface ReferralSummary {
  ref_code: string
  invite_link: string
  tier1_count: number
  tier2_count: number
  tier1_earnings: number
  tier2_earnings: number
  referrals: {
    id: string
    username: string
    first_name: string
    joined_at: string
    honey_earned_for_referrer: number
    status?: 'pending' | 'active' | string
  }[]
}

export interface LeaderboardEntry {
  rank: number
  username: string
  first_name: string
  bee_power: number
  honey_balance: number
}
