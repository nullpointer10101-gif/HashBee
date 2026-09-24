import axios from 'axios'
import { User, Mission, Withdrawal, Campaign, ReferralSummary, LeaderboardEntry, UpgradeOption } from '../types'

// Use WebApp initData if running inside Telegram
const getInitData = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData
  }
  // Mock data for browser testing
  return 'query_id=STUB&user=%7B%22id%22%3A12345678%2C%22first_name%22%3A%22BeeKeeper%22%2C%22username%22%3A%22honeymaster%22%7D&auth_date=1600000000&hash=stub'
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://hashbee.onrender.com'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const initData = getInitData()
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData
  }
  const token = localStorage.getItem('hashbee_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export const fetchProfile = async (): Promise<User> => {
  const token = localStorage.getItem('hashbee_token')
  let profileData: any = null

  if (!token) {
    try {
      const res = await api.post('/api/auth')
      if (res.data?.token) {
        localStorage.setItem('hashbee_token', res.data.token)
      }
      profileData = res.data?.profile
    } catch (e) {
      console.warn('Backend /api/auth failed, fallback to /api/me', e)
    }
  }

  if (!profileData) {
    const res = await api.get('/api/me')
    profileData = res.data
  }

  return {
    id: profileData.id,
    telegram_id: profileData.telegram_id,
    username: profileData.username || 'miner',
    first_name: profileData.first_name || 'BeeKeeper',
    last_name: '',
    honey_balance: profileData.honey_balance || 0,
    bee_power: profileData.bp || 10,
    max_hive_capacity: 5000,
    current_unclaimed_honey: profileData.hive?.pending_honey || 0,
    last_claimed_at: new Date().toISOString(),
    hive_full_at: profileData.hive?.cap_reached_at || new Date(Date.now() + 3600000 * 4).toISOString(),
    streak_count: profileData.streak_count || 1,
    last_streak_date: new Date().toISOString().split('T')[0],
    ref_code: profileData.id,
    created_at: profileData.created_at || new Date().toISOString(),
  }
}

export const claimHoney = async (): Promise<{ claimed: number; new_balance: number }> => {
  const idempKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`
  const res = await api.post('/api/collect', {}, {
    headers: { 'X-Idempotency-Key': idempKey }
  })
  const claimed = res.data?.collected || 0
  const new_balance = res.data?.profile?.honey_balance || 0
  return { claimed, new_balance }
}

export const claimStreak = async (): Promise<{ streak_count: number; bonus_honey: number }> => {
  const res = await api.post('/api/checkin')
  return {
    streak_count: res.data?.streak || 1,
    bonus_honey: res.data?.reward_bp || 0,
  }
}

export const fetchUpgrades = async (): Promise<UpgradeOption[]> => {
  return [
    {
      id: 'up-1',
      name: 'Nectar Booster',
      description: 'Boost honey collection speed by 25%',
      power_bonus: 25,
      cost_honey: 1500,
      icon: '🍯',
      category: 'nectar',
    },
    {
      id: 'up-2',
      name: 'Queen Bee Pheromone',
      description: 'Double your colony gathering rate',
      power_bonus: 50,
      cost_honey: 3000,
      icon: '👑',
      category: 'queen',
    },
    {
      id: 'up-3',
      name: 'Reinforced Comb',
      description: 'Extend maximum hive capacity and storage',
      power_bonus: 100,
      cost_honey: 7500,
      icon: '🐝',
      category: 'hive',
    },
  ]
}

export const buyUpgrade = async (upgradeId: string): Promise<{ new_bee_power: number; new_balance: number }> => {
  return { new_bee_power: 150, new_balance: 10000 }
}

export const fetchMissions = async (): Promise<Mission[]> => {
  const res = await api.get('/api/missions')
  const sponsored = res.data?.sponsored || []
  const milestone = res.data?.milestone || []
  const all = [...sponsored, ...milestone]
  if (all.length === 0) {
    throw new Error('No missions in backend')
  }
  return all.map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    reward_honey: m.reward_honey || 100,
    reward_power: m.reward_bp || 0.1,
    type: m.type || 'telegram_channel',
    target_url: m.target_url || '',
    is_completed: m.is_completed || false,
    expires_at: m.expires_at,
  }))
}

export const completeMission = async (missionId: string): Promise<{ reward_honey: number; reward_power: number }> => {
  try {
    await api.post(`/api/missions/${missionId}/start`)
  } catch (e) {
    // already started
  }
  const res = await api.post(`/api/missions/${missionId}/verify`)
  return {
    reward_honey: res.data?.reward_honey || 100,
    reward_power: res.data?.reward_bp || 0.1,
  }
}

export const fetchReferrals = async (): Promise<ReferralSummary> => {
  const res = await api.get('/api/swarm')
  const swarm = res.data?.swarm || {}
  const referralLink = res.data?.referral_link || ''
  return {
    ref_code: referralLink.split('=').pop() || '',
    invite_link: referralLink || `https://t.me/hashbe_bot`,
    tier1_count: swarm.level1_count || 0,
    tier2_count: swarm.level2_count || 0,
    tier1_earnings: swarm.level1_honey_earned || 0,
    tier2_earnings: swarm.level2_honey_earned || 0,
    referrals: (swarm.referrals || []).map((r: any) => ({
      id: r.id,
      username: r.username || 'Miner',
      first_name: r.first_name || '',
      joined_at: r.created_at || new Date().toISOString(),
      honey_earned_for_referrer: r.honey_earned || 0,
    })),
  }
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  return [
    { rank: 1, username: 'CryptoBee', first_name: 'Alex', bee_power: 450, honey_balance: 85000 },
    { rank: 2, username: 'QueenSwarms', first_name: 'Elena', bee_power: 380, honey_balance: 62000 },
    { rank: 3, username: 'HiveKing', first_name: 'Dmitry', bee_power: 310, honey_balance: 49500 },
  ]
}

export const requestWithdrawal = async (amount_honey: number, wallet_address: string, payout_method: string): Promise<Withdrawal> => {
  const res = await api.post('/api/withdraw', {
    amount: amount_honey,
    address: wallet_address,
    network: payout_method === 'TON' ? 'TON' : 'USDT_TRC20',
  })
  const w = res.data?.withdrawal || {}
  return {
    id: w.id || `w-${Date.now()}`,
    amount_honey: w.amount || amount_honey,
    amount_usd: (w.amount || amount_honey) * 0.0001,
    wallet_address: w.address || wallet_address,
    payout_method: payout_method as any,
    status: w.status || 'pending',
    reinvested: false,
    created_at: w.created_at || new Date().toISOString(),
  }
}

export const fetchWithdrawals = async (): Promise<Withdrawal[]> => {
  const res = await api.get('/api/withdrawals')
  const list = res.data?.withdrawals || []
  return list.map((w: any) => ({
    id: w.id,
    amount_honey: w.amount,
    amount_usd: w.amount * 0.0001,
    wallet_address: w.address,
    payout_method: w.network as any,
    status: w.status,
    reinvested: false,
    created_at: w.created_at,
  }))
}

export const reinvestHoney = async (amount_honey: number): Promise<{ power_gained: number }> => {
  const res = await api.post('/api/reinvest', { honey_amount: amount_honey })
  return { power_gained: res.data?.bp_gained || amount_honey / 100 }
}

export const createCampaign = async (title: string, description: string, target_url: string, budget_honey: number, reward_per_user: number): Promise<Campaign> => {
  const res = await api.post('/api/campaigns', {
    title,
    description,
    target_url,
    budget_honey,
    reward_per_user,
  })
  return res.data.data
}

export default api
