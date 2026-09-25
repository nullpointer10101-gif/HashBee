import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from '../types'
import { fetchProfile } from '../services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  isBanned: boolean
  refreshUser: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBanned: false,
  refreshUser: async () => {},
  error: null,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isBanned, setIsBanned] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = async () => {
    try {
      const data = await fetchProfile()
      if (data && (data.status === 'banned' || data.status === 'blocked')) {
        setIsBanned(true)
        setUser(data)
        return
      }
      setIsBanned(false)
      setUser(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load profile', err)
      const errStatus = err?.response?.status
      const errMsg = String(err?.response?.data?.error || '').toLowerCase()
      if (errStatus === 403 || errMsg.includes('banned') || errMsg.includes('suspended')) {
        setIsBanned(true)
        setError('account banned')
        setUser({
          id: 'banned-user',
          telegram_id: 0,
          username: '',
          first_name: 'Suspended Account',
          last_name: '',
          honey_balance: 0,
          bee_power: 0,
          max_hive_capacity: 0,
          current_unclaimed_honey: 0,
          last_claimed_at: new Date().toISOString(),
          hive_full_at: new Date().toISOString(),
          streak_count: 0,
          last_streak_date: '',
          ref_code: '',
          status: 'banned',
          created_at: new Date().toISOString(),
        })
        return
      }

      setError(err?.response?.data?.error || 'Failed to authenticate')
      // Fallback mock user only for offline preview when not explicitly banned
      setUser({
        id: 'mock-uuid-1',
        telegram_id: 12345678,
        username: 'honey_bee',
        first_name: 'Honey',
        last_name: 'Master',
        honey_balance: 14250,
        bee_power: 125,
        max_hive_capacity: 5000,
        current_unclaimed_honey: 1280,
        last_claimed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        hive_full_at: new Date(Date.now() + 3600000 * 4).toISOString(),
        streak_count: 5,
        last_streak_date: new Date().toISOString().split('T')[0],
        ref_code: 'BEE98765',
        status: 'active',
        created_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isBanned, refreshUser, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
