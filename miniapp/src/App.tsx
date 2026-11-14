import React, { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { Navbar } from './components/Navbar'
import VaultfinityApp from './components/vault/VaultfinityApp'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'
import { Spin } from './pages/Spin'
import { Plans } from './pages/Plans'
import { BannedScreen } from './components/BannedScreen'
import { PrivateGroupGatekeeper, isAccountVerified } from './components/PrivateGroupGatekeeper'
import { ViralBountyWidget } from './components/ViralBountyWidget'
import { TeslaMiningTakeover } from './components/TeslaMiningTakeover'
import { MaintenanceScreen } from './components/MaintenanceScreen'
import { initMonetagAutoAds } from './services/monetag'

// Maintenance Mode toggle: false for live production
const IS_MAINTENANCE_MODE = false

const AppContent: React.FC = () => {
  const { user, isBanned, loading } = useAuth()
  const location = useLocation()
  const isVaultHome = location.pathname === '/'

  if (IS_MAINTENANCE_MODE) {
    return <MaintenanceScreen />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060809] flex flex-col items-center justify-center text-white px-4 relative overflow-hidden selection:bg-[#f59e0b]">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-[#f59e0b]/20 to-[#06b6d4]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#f59e0b]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Cyber Vault Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#06b6d4] p-0.5 shadow-2xl shadow-amber-500/25 animate-pulse">
            <div className="w-full h-full rounded-3xl bg-[#0a0d0e] flex items-center justify-center text-4xl relative overflow-hidden">
              <span className="animate-bounce" style={{ animationDuration: '2s' }}>🏛️</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
          {/* Orbiting particle ring */}
          <div className="absolute -inset-2 rounded-[28px] border border-amber-400/30 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Title Branding */}
        <h1 className="text-xl font-black tracking-wider uppercase text-white mb-1 flex items-center gap-2">
          <span>VAULTFINITY</span>
          <span className="text-[10px] bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black px-2 py-0.5 rounded-full">
            HEIST
          </span>
        </h1>
        <p className="text-[11px] font-mono font-bold text-[#94a3b8] uppercase tracking-widest mb-6">
          Cyber Heist Tycoon
        </p>

        {/* Animated Cyber Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 mb-3">
          <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-[#06b6d4] rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#94a3b8] font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Connecting to vault security grid...</span>
        </div>
      </div>
    )
  }

  if (isBanned || user?.status === 'banned') {
    return <BannedScreen />
  }

  return (
    <div className={`min-h-screen ${isVaultHome ? 'bg-[#060809]' : 'bg-[#f4f7fb]'} text-[#0f172a] font-sans antialiased relative`}>
      <Routes>
        <Route path="/" element={<VaultfinityApp />} />
        <Route path="/classic" element={<Home />} />
        <Route path="/watch" element={<Missions defaultTab="watch" />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/crates" element={<Plans />} />
        <Route path="/spin" element={<Spin />} />
        <Route path="/earn" element={<Referrals />} />
        <Route path="/tasks" element={<Missions defaultTab="tasks" />} />
        <Route path="/missions" element={<Missions defaultTab="tasks" />} />
        <Route path="/withdraw" element={<Withdraw />} />
      </Routes>
      {!isVaultHome && <Navbar />}
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
