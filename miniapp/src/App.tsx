import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'

export const App: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
  }, [])

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#101715] text-[#e6f0ec] font-sans antialiased selection:bg-[#93b3a6] selection:text-[#0f1614]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/earn" element={<Referrals />} />
          <Route path="/tasks" element={<Missions />} />
          <Route path="/withdraw" element={<Withdraw />} />
        </Routes>
        <Navbar />
      </div>
    </AuthProvider>
  )
}

export default App
