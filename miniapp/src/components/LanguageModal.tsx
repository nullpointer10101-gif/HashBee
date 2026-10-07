import React from 'react'
import { LANGUAGES, useLanguage } from '../context/LanguageContext'

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div 
        className="w-full max-w-sm lux-card p-5 text-white shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
              {t('select_language', 'Select Language')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#84948c] hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  onClose()
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white text-black font-extrabold border-white shadow-md'
                    : 'bg-[#080c0a] border-[#17241d] text-[#84948c] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold leading-none">{lang.nativeName}</div>
                    <div className="text-[9px] opacity-75 mt-0.5">{lang.name}</div>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-black font-black text-sm">✓</span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl btn-surface text-xs font-extrabold uppercase tracking-wider"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default LanguageModal
