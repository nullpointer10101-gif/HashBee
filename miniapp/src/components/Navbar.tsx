import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    {
      id: 'home',
      name: 'Home',
      path: '/',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#0088ff]' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      id: 'nft',
      name: 'NFT',
      path: '/plans',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#0088ff]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'tasks',
      name: 'Tasks',
      path: '/tasks',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#0088ff]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'referral',
      name: 'Referral',
      path: '/earn',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#0088ff]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'withdraw',
      name: 'Withdraw',
      path: '/withdraw',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#0088ff]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] px-2 py-1.5 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/plans' && location.pathname === '/crates') ||
            (tab.path === '/tasks' && location.pathname === '/missions')
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 active:scale-95"
            >
              {isActive ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="px-3 py-1 rounded-2xl bg-[#eff6ff] flex items-center justify-center">
                    {tab.icon(true)}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black text-[#0088ff] mt-0.5">
                    {tab.name}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="p-1 flex items-center justify-center">
                    {tab.icon(false)}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
                    {tab.name}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Navbar
