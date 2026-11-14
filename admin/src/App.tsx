import React, { useState } from 'react'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('vaultfinity_admin_token') || localStorage.getItem('hashbee_admin_token')
  )

  const handleLogin = (newToken: string) => {
    localStorage.setItem('vaultfinity_admin_token', newToken)
    localStorage.setItem('hashbee_admin_token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('vaultfinity_admin_token')
    localStorage.removeItem('hashbee_admin_token')
    setToken(null)
  }

  return token ? <Dashboard token={token} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />
}

export default App
