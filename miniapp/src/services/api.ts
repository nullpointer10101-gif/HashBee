import axios from 'axios'
import { User, Mission, Withdrawal, Campaign, ReferralSummary, LeaderboardEntry, UpgradeOption } from '../types'

// Use WebApp initData if running inside Telegram
const getInitData = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData
  }
  return 'query_id=STUB&user=%7B%22id%22%3A6446145632%2C%22first_name%22%3A%22BeeKeeper%22%2C%22username%22%3A%22miner%22%7D&auth_date=1600000000&hash=stub'
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
  let refParam: string | null = null
  if (typeof window !== 'undefined') {
    if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      refParam = window.Telegram.WebApp.initDataUnsafe.start_param
    }
    if (!refParam) {
      const urlParams = new URLSearchParams(window.location.search)
      refParam = urlParams.get('tgWebAppStartParam') || urlParams.get('ref') || urlParams.get('start') || null
    }
  }

  const token = localStorage.getItem('hashbee_token')
  let profileData: any = null

  if (!token) {
    try {
      const authUrl = refParam ? `/api/auth?ref=${encodeURIComponent(refParam)}` : '/api/auth'
      const res = await api.post(authUrl)
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

  const tgId = profileData.telegram_id || 6446145632

  return {
    id: profileData.id,
    telegram_id: tgId,
    username: profileData.username || 'miner',
    first_name: profileData.first_name || 'BeeKeeper',
    last_name: '',
    honey_balance: Number(profileData.honey_balance || 0),
    bee_power: Number(profileData.bp || 10),
    max_hive_capacity: 5000,
    current_unclaimed_honey: Number(profileData.hive?.pending_honey || 0),
    last_claimed_at: profileData.last_collect_at || profileData.created_at || new Date().toISOString(),
    hive_full_at: profileData.hive?.cap_reached_at || new Date(Date.now() + 3600000 * 24).toISOString(),
    streak_count: profileData.streak_count || 1,
    last_streak_date: new Date().toISOString().split('T')[0],
    ref_code: String(tgId),
    created_at: profileData.created_at || new Date().toISOString(),
  }
}

export const claimHoney = async (): Promise<{ claimed: number; new_balance: number }> => {
  const idempKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`
  const res = await api.post('/api/collect', {}, {
    headers: { 'X-Idempotency-Key': idempKey }
  })
  const claimed = Number(res.data?.collected || 0)
  const new_balance = Number(res.data?.profile?.honey_balance || 0)
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
  const refCode = res.data?.referral_code || referralLink.split('=').pop() || ''
  const rawList = swarm.referrals || []

  return {
    ref_code: refCode,
    invite_link: referralLink || `https://t.me/hashbee_bot?start=${refCode}`,
    tier1_count: swarm.level1_count || 0,
    tier2_count: swarm.level2_count || 0,
    tier1_earnings: swarm.level1_honey_earned || 0,
    tier2_earnings: swarm.level2_honey_earned || 0,
    referrals: rawList.map((r: any) => ({
      id: r.id || String(Math.random()),
      username: r.username || 'Miner',
      first_name: r.first_name || '',
      joined_at: r.created_at || new Date().toISOString(),
      honey_earned_for_referrer: r.reward_bp || 5,
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

export const requestWithdrawal = async (amount: number, wallet_address: string, payout_method: string): Promise<Withdrawal> => {
  const res = await api.post('/api/withdraw', {
    amount: amount,
    address: wallet_address,
    network: payout_method === 'GRAM' ? 'GRAM' : 'USDT_BSC',
  })
  const w = res.data?.withdrawal || {}
  return {
    id: w.id || `w-${Date.now()}`,
    amount_honey: w.amount || amount,
    amount_usd: w.amount || amount,
    wallet_address: w.address || wallet_address,
    payout_method: (w.network || payout_method) as any,
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
    amount_usd: w.amount,
    wallet_address: w.address,
    payout_method: w.network as any,
    status: w.status,
    reinvested: false,
    created_at: w.created_at,
  }))
}

export const reinvestHoney = async (amount: number): Promise<{ power_gained: number }> => {
  const res = await api.post('/api/reinvest', { honey_amount: amount })
  return { power_gained: res.data?.bp_gained || amount * 50 }
}

export const createCampaign = async (campaignData: Partial<Campaign>): Promise<Campaign> => {
  const res = await api.post('/api/campaigns', campaignData)
  return res.data?.campaign
}

export const fetchMyCampaigns = async (): Promise<Campaign[]> => {
  const res = await api.get('/api/campaigns')
  return res.data?.campaigns || []
}

export const cancelCampaign = async (id: string): Promise<void> => {
  await api.delete(`/api/campaigns/${id}`)
}

export const checkDeposit = async (): Promise<any> => {
  const res = await api.post('/api/check-deposit')
  return res.data
}
