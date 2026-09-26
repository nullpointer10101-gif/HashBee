import React, { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'
import { Spin } from './pages/Spin'
import { BannedScreen } from './components/BannedScreen'
import { PrivateGroupGatekeeper } from './components/PrivateGroupGatekeeper'
import { initMonetagAutoAds } from './services/monetag'

const AppContent: React.FC = () => {
  const { user, isBanned, loading } = useAuth()
  const [isGatekeeperVerified, setIsGatekeeperVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hashbee_vip_join_verified_v1') === 'true'
    } catch {
      return false
    }
  })

  // Show Gatekeeper FIRST to ALL unverified users (both existing and new)
  if (!isGatekeeperVerified) {
    return <PrivateGroupGatekeeper onVerified={() => setIsGatekeeperVerified(true)} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101715] flex flex-col items-center justify-center text-stone-300">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Loading HashBee...</p>
      </div>
    )
  }

  if (isBanned || user?.status === 'banned') {
    return <BannedScreen />
  }

  return (
    <div className="min-h-screen bg-[#101715] text-[#e6f0ec] font-sans antialiased selection:bg-[#93b3a6] selection:text-[#0f1614]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spin" element={<Spin />} />
        <Route path="/earn" element={<Referrals />} />
        <Route path="/tasks" element={<Missions />} />
        <Route path="/withdraw" element={<Withdraw />} />
      </Routes>
      <Navbar />
    </div>
  )
}

export const App: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }

    // Initialize Monetag Opening Ad (1x on launch) & 2-Minute Auto-Ad Trigger
    initMonetagAutoAds()
  }, [])

  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
