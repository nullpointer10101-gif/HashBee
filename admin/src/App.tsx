import React, { useState } from 'react'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('hashbee_admin_token'))

  const handleLogin = (newToken: string) => {
    localStorage.setItem('hashbee_admin_token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('hashbee_admin_token')
    setToken(null)
  }

  return token ? <Dashboard token={token} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />
}

export default App
