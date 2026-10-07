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
import { Plans } from './pages/Plans'
import { BannedScreen } from './components/BannedScreen'
import { PrivateGroupGatekeeper, isAccountVerified } from './components/PrivateGroupGatekeeper'
import { ViralBountyWidget } from './components/ViralBountyWidget'
import { initMonetagAutoAds } from './services/monetag'

const AppContent: React.FC = () => {
  const { user, isBanned, loading } = useAuth()
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({})

  // Resolve current Telegram account ID
  const activeTgId = user?.telegram_id || (typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : 0) || 0
  const isVerified = Boolean(activeTgId && isAccountVerified(activeTgId))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-white px-4 relative overflow-hidden selection:bg-[#0088ff]">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-[#f59e0b]/20 to-[#0088ff]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#6366f1]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Animated 3D Cyber Hexagon Avatar */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-indigo-600 p-[2px] shadow-2xl shadow-amber-500/25 animate-pulse">
            <div className="w-full h-full rounded-3xl bg-[#0f172a] flex items-center justify-center text-4xl relative overflow-hidden">
              <span className="animate-bounce" style={{ animationDuration: '2s' }}>🐝</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
          {/* Orbiting particle ring */}
          <div className="absolute -inset-2 rounded-[28px] border border-amber-400/30 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* Title Branding */}
        <h1 className="text-xl font-black tracking-wider uppercase text-white mb-1 flex items-center gap-2">
          <span>HASHBEE</span>
          <span className="text-[10px] bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
            PRO
          </span>
        </h1>
        <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-6">
          Cloud Miner Network
        </p>

        {/* Animated Cyber Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 mb-3">
          <div className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-[#0088ff] rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Syncing cloud hashrate pools...</span>
        </div>
      </div>
    )
  }

  if (isBanned || user?.status === 'banned') {
    return <BannedScreen />
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#0f172a] font-sans antialiased selection:bg-[#0066ff] selection:text-[#ffffff] relative">
      {/* 🔒 1-TIME VIP CHANNEL VERIFICATION MODAL OVERLAY FOR EVERY TELEGRAM ACCOUNT */}
      {!isVerified && (!activeTgId || !verifiedMap[String(activeTgId)]) && (
        <PrivateGroupGatekeeper
          telegramId={activeTgId}
          onVerified={() => {
            setVerifiedMap((prev) => ({ ...prev, [String(activeTgId)]: true }))
          }}
        />
      )}

      {/* 🎁 10 GRAM 7-DAY VIRAL REFERRAL BOUNTY FLOATING WIDGET */}
      <ViralBountyWidget />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/crates" element={<Plans />} />
        <Route path="/spin" element={<Spin />} />
        <Route path="/earn" element={<Referrals />} />
        <Route path="/tasks" element={<Missions />} />
        <Route path="/missions" element={<Missions />} />
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
