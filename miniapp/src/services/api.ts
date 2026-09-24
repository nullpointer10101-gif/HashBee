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

const api = axios.create({
  baseURL: '/api/v1',
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
  const res = await api.get('/user/profile')
  return res.data.data
}

export const claimHoney = async (): Promise<{ claimed: number; new_balance: number }> => {
  const res = await api.post('/user/claim')
  return res.data.data
}

export const claimStreak = async (): Promise<{ streak_count: number; bonus_honey: number }> => {
  const res = await api.post('/user/streak')
  return res.data.data
}

export const fetchUpgrades = async (): Promise<UpgradeOption[]> => {
  const res = await api.get('/user/upgrades')
  return res.data.data
}

export const buyUpgrade = async (upgradeId: string): Promise<{ new_bee_power: number; new_balance: number }> => {
  const res = await api.post('/user/upgrade', { upgrade_id: upgradeId })
  return res.data.data
}

export const fetchMissions = async (): Promise<Mission[]> => {
  const res = await api.get('/missions')
  return res.data.data
}

export const completeMission = async (missionId: string): Promise<{ reward_honey: number; reward_power: number }> => {
  const res = await api.post(`/missions/${missionId}/complete`)
  return res.data.data
}

export const fetchReferrals = async (): Promise<ReferralSummary> => {
  const res = await api.get('/user/referrals')
  return res.data.data
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await api.get('/user/leaderboard')
  return res.data.data
}

export const requestWithdrawal = async (amount_honey: number, wallet_address: string, payout_method: string): Promise<Withdrawal> => {
  const res = await api.post('/withdrawal/request', {
    amount_honey,
    wallet_address,
    payout_method,
  })
  return res.data.data
}

export const fetchWithdrawals = async (): Promise<Withdrawal[]> => {
  const res = await api.get('/withdrawal/history')
  return res.data.data
}

export const reinvestHoney = async (amount_honey: number): Promise<{ power_gained: number }> => {
  const res = await api.post('/withdrawal/reinvest', { amount_honey })
  return res.data.data
}

export const createCampaign = async (title: string, description: string, target_url: string, budget_honey: number, reward_per_user: number): Promise<Campaign> => {
  const res = await api.post('/campaigns', {
    title,
    description,
    target_url,
    budget_honey,
    reward_per_user,
  })
  return res.data.data
}

export default api
