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
        <svg className={`w-5 h-5 ${active ? 'text-[#7c3aed]' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      id: 'nft',
      name: 'NFT',
      path: '/plans',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#7c3aed]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'referral',
      name: 'Referral',
      path: '/earn',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#7c3aed]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      name: 'Profile',
      path: '/withdraw',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[#7c3aed]' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] px-3 py-2 max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path === '/plans' && location.pathname === '/crates')
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center relative py-1 px-3 transition-all duration-150 active:scale-95"
            >
              {isActive ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="px-3.5 py-1 rounded-2xl bg-[#f3e8ff] flex items-center justify-center">
                    {tab.icon(true)}
                  </div>
                  <span className="text-[11px] font-extrabold text-[#7c3aed] mt-0.5">
                    {tab.name}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="p-1 flex items-center justify-center">
                    {tab.icon(false)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
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
