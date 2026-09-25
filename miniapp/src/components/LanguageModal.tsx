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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-[#141e1b] border border-[#23332e] rounded-t-3xl sm:rounded-3xl p-6 text-stone-100 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h2 className="text-base font-extrabold uppercase tracking-wider text-stone-100">
              {t('select_language', 'Select Language')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b2824] hover:bg-[#23332e] flex items-center justify-center text-stone-400 hover:text-stone-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  onClose()
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-[#10b981]/15 border-[#10b981] text-emerald-300 font-extrabold shadow-sm'
                    : 'bg-[#182320] border-[#22332c] text-stone-300 hover:bg-[#1f2d29] hover:border-stone-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-sm font-bold leading-none">{lang.nativeName}</div>
                    <div className="text-[10px] text-stone-400 mt-1">{lang.name}</div>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-emerald-400 font-black text-sm">✓</span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-[#1b2824] border border-[#2a3c36] text-stone-300 font-bold text-xs uppercase tracking-wider hover:bg-[#23332e]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
