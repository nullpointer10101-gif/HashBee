import React from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export const Navbar: React.FC = () => {
  const { t } = useLanguage()

  const navItems = [
    {
      to: '/',
      label: t('miner', 'Terminal'),
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      to: '/plans',
      label: 'Yield 24H',
      isHot: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      to: '/spin',
      label: 'Rewards',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      to: '/earn',
      label: t('earn', 'Referral'),
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      to: '/tasks',
      label: t('tasks', 'Missions'),
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      to: '/withdraw',
      label: t('withdraw', 'Cashout'),
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-3 pt-1 px-3 pointer-events-none">
      <div className="max-w-md mx-auto bg-[#090d0b]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex justify-between items-center gap-1 pointer-events-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white text-black font-extrabold shadow-lg shadow-white/10'
                  : 'text-[#7d9187] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.isHot && (
              <span className="absolute -top-1.5 right-1 px-1.5 py-0.2 bg-[#00f090] text-black text-[7px] font-black rounded-full shadow">
                24H
              </span>
            )}
            {item.icon}
            <span className="text-[10px] font-semibold mt-1 tracking-tight truncate max-w-full text-center">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
