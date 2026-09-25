import React, { createContext, useContext, useState, useEffect } from 'react'

export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: '🇺🇿' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
]

const translations: Record<string, Record<string, string>> = {
  en: {
    mining_dashboard: 'MINING DASHBOARD',
    support: 'Support',
    total_ghs_power: 'TOTAL GHS POWER',
    add_ghs_boost: '⚡ Add GHS Boost',
    reinvest_balance: '🔄 Reinvest Mined',
    unclaimed_mined_balance: 'UNCLAIMED MINED BALANCE',
    ready_to_collect: 'READY TO COLLECT',
    collect_honey: 'COLLECT REWARDS',
    wallet_balance: 'BALANCE',
    miner_status: 'MINER STATUS',
    online_active: 'ONLINE ACTIVE',
    rate_per_sec: 'EARNING RATE',
    daily_estimated: 'ESTIMATED DAILY',
    per_day: 'per day',
    earn: 'EARN',
    miner: 'MINER',
    tasks: 'TASKS',
    withdraw: 'WITHDRAW',
    select_language: 'Select Language',
    invite_friends: 'INVITE FRIENDS',
    your_referral_link: 'YOUR REFERRAL LINK',
    copy_link: 'Copy Link',
    friends_invited: 'Friends Invited',
    earned_commissions: 'Earned Commissions',
    missions_board: 'MISSIONS BOARD',
    complete_tasks_earn: 'Complete sponsor tasks & boost your GH/s power',
    withdraw_funds: 'WITHDRAW REWARDS',
    payout_address: 'Enter Wallet Address',
    withdraw_btn: 'REQUEST WITHDRAWAL',
    min_withdrawal_notice: 'Minimum withdrawal: 0.05 USDT / GRAM'
  },
  ru: {
    mining_dashboard: 'МАЙНИНГ ПАНЕЛЬ',
    support: 'Поддержка',
    total_ghs_power: 'ОБЩАЯ МОЩНОСТЬ GHS',
    add_ghs_boost: '⚡ Добавить GHS',
    reinvest_balance: '🔄 Реинвестировать',
    unclaimed_mined_balance: 'ДОБЫТЫЙ БАЛАНС',
    ready_to_collect: 'ГОТОВО К СБОРУ',
    collect_honey: 'СОБРАТЬ НАГРАДУ',
    wallet_balance: 'БАЛАНС',
    miner_status: 'СТАТУС МАЙНЕРА',
    online_active: 'АКТИВЕН ОНЛАЙН',
    rate_per_sec: 'СКОРОСТЬ ДОБЫЧИ',
    daily_estimated: 'ПРИМЕРНО В СУТКИ',
    per_day: 'в день',
    earn: 'ДОХОД',
    miner: 'МАЙНЕР',
    tasks: 'ЗАДАНИЯ',
    withdraw: 'ВЫВОД',
    select_language: 'Выберите язык',
    invite_friends: 'ПРИГЛАСИТЬ ДРУЗЕЙ',
    your_referral_link: 'ВАША РЕФЕРАЛЬНАЯ ССЫЛКА',
    copy_link: 'Скопировать',
    friends_invited: 'Приглашено друзей',
    earned_commissions: 'Заработано на рефералах',
    missions_board: 'СПИСОК ЗАДАНИЙ',
    complete_tasks_earn: 'Выполняйте задания и увеличивайте мощность GH/s',
    withdraw_funds: 'ВЫВОД СРЕДСТВ',
    payout_address: 'Введите адрес кошелька',
    withdraw_btn: 'ЗАПРОСИТЬ ВЫВОД',
    min_withdrawal_notice: 'Минимальный вывод: 0.05 USDT / GRAM'
  },
  uz: {
    mining_dashboard: 'MAYNING PANELI',
    support: 'Yordam',
    total_ghs_power: 'UMUMIY GHS QUVVATI',
    add_ghs_boost: '⚡ GHS Oshirish',
    reinvest_balance: '🔄 Qayta kiritish',
    unclaimed_mined_balance: 'YIG‘ILGAN BALANS',
    ready_to_collect: 'YIG‘ISHGA TAYYOR',
    collect_honey: 'MUKOFOTNI OLISH',
    wallet_balance: 'BALANS',
    miner_status: 'MAYNER HOLATI',
    online_active: 'FAOL ONLAYN',
    rate_per_sec: 'ISHLASH TEZLIGI',
    daily_estimated: 'KUNLIK DAROMAD',
    per_day: 'kuniga',
    earn: 'DAROMAD',
    miner: 'MAYNER',
    tasks: 'VAZIFALAR',
    withdraw: 'YECHIB OLISH',
    select_language: 'Tilni tanlang',
    invite_friends: 'DO‘STARNI TAKLIF QILING',
    your_referral_link: 'SIZNING TAKLIF HAVOLANGIZ',
    copy_link: 'Nusxalash',
    friends_invited: 'Taklif qilinganlar',
    earned_commissions: 'Ishlangan komissiya',
    missions_board: 'VAZIFALAR RO‘YXATI',
    complete_tasks_earn: 'Vazifalarni bajaring va GH/s quvvatingizni oshiring',
    withdraw_funds: 'MABLAG‘NI YECHISH',
    payout_address: 'Hamyon manzilini kiriting',
    withdraw_btn: 'YECHIB OLISH',
    min_withdrawal_notice: 'Minimal yechib olish: 0.05 USDT / GRAM'
  },
  id: {
    mining_dashboard: 'DASHBOARD MINING',
    support: 'Bantuan',
    total_ghs_power: 'TOTAL DAYA GHS',
    add_ghs_boost: '⚡ Tambah GHS',
    reinvest_balance: '🔄 Reinvestasi',
    unclaimed_mined_balance: 'SALDO BELUM DIAMBIL',
    ready_to_collect: 'SIAP DIAMBIL',
    collect_honey: 'AMBIL HADIAH',
    wallet_balance: 'SALDO',
    miner_status: 'STATUS MINER',
    online_active: 'AKTIF ONLINE',
    rate_per_sec: 'KECEPATAN MINING',
    daily_estimated: 'ESTIMASI HARIAN',
    per_day: 'per hari',
    earn: 'PENGHASILAN',
    miner: 'MINER',
    tasks: 'TUGAS',
    withdraw: 'PENARIKAN',
    select_language: 'Pilih Bahasa',
    invite_friends: 'UNDANG TEMAN',
    your_referral_link: 'LINK REFERRAL ANDA',
    copy_link: 'Salin Link',
    friends_invited: 'Teman Diundang',
    earned_commissions: 'Komisi Diperoleh',
    missions_board: 'DAFTAR TUGAS',
    complete_tasks_earn: 'Selesaikan tugas & tingkatkan daya GH/s Anda',
    withdraw_funds: 'TARIK REWARD',
    payout_address: 'Masukkan Alamat Dompet',
    withdraw_btn: 'AJUKAN PENARIKAN',
    min_withdrawal_notice: 'Penarikan minimum: 0.05 USDT / GRAM'
  },
  vi: {
    mining_dashboard: 'BẢNG ĐIỀU KHIỂN ĐÀO',
    support: 'Hỗ trợ',
    total_ghs_power: 'TỔNG CÔNG SUẤT GHS',
    add_ghs_boost: '⚡ Tăng Tốc GHS',
    reinvest_balance: '🔄 Tái Đầu Tư',
    unclaimed_mined_balance: 'SỐ DƯ CHƯA NHẬN',
    ready_to_collect: 'SẴN SÀNG NHẬN',
    collect_honey: 'NHẬN THƯỞNG',
    wallet_balance: 'SỐ DƯ VÍ',
    miner_status: 'TRẠNG THÁI MÁY ĐÀO',
    online_active: 'ĐANG HOẠT ĐỘNG',
    rate_per_sec: 'TỐC ĐỘ ĐÀO',
    daily_estimated: 'ƯỚC TÍNH MỖI NGÀY',
    per_day: 'mỗi ngày',
    earn: 'KIẾM TIỀN',
    miner: 'MÁY ĐÀO',
    tasks: 'NHIỆM VỤ',
    withdraw: 'RÚT TIỀN',
    select_language: 'Chọn Ngôn Ngữ',
    invite_friends: 'MỜI BẠN BÈ',
    your_referral_link: 'LIÊN KẾT GIỚI THIỆU',
    copy_link: 'Sao chép liên kết',
    friends_invited: 'Bạn bè đã mời',
    earned_commissions: 'Hoa hồng nhận được',
    missions_board: 'DANH SÁCH NHIỆM VỤ',
    complete_tasks_earn: 'Hoàn thành nhiệm vụ để tăng công suất GH/s',
    withdraw_funds: 'RÚT PHẦN THƯỞNG',
    payout_address: 'Nhập địa chỉ ví',
    withdraw_btn: 'YÊU CẦU RÚT TIỀN',
    min_withdrawal_notice: 'Rút tối thiểu: 0.05 USDT / GRAM'
  },
  es: {
    mining_dashboard: 'PANEL DE MINERÍA',
    support: 'Soporte',
    total_ghs_power: 'POTENCIA TOTAL GHS',
    add_ghs_boost: '⚡ Añadir GHS',
    reinvest_balance: '🔄 Reinvertir',
    unclaimed_mined_balance: 'BALANCE SIN RECLAMAR',
    ready_to_collect: 'LISTO PARA RECLAMAR',
    collect_honey: 'RECLAMAR RECOMPENSA',
    wallet_balance: 'BALANCE',
    miner_status: 'ESTADO DEL MINERO',
    online_active: 'ACTIVO EN LÍNEA',
    rate_per_sec: 'VELOCIDAD DE MINADO',
    daily_estimated: 'ESTIMADO DIARIO',
    per_day: 'por día',
    earn: 'GANAR',
    miner: 'MINERO',
    tasks: 'TAREAS',
    withdraw: 'RETIRAR',
    select_language: 'Seleccionar idioma',
    invite_friends: 'INVITAR AMIGOS',
    your_referral_link: 'TU ENLACE DE REFERIDO',
    copy_link: 'Copiar Enlace',
    friends_invited: 'Amigos invitados',
    earned_commissions: 'Comisiones ganadas',
    missions_board: 'TABLÓN DE MISIONES',
    complete_tasks_earn: 'Completa tareas y aumenta tu potencia GH/s',
    withdraw_funds: 'RETIRAR FONDOS',
    payout_address: 'Introduce dirección de billetera',
    withdraw_btn: 'SOLICITAR RETIRO',
    min_withdrawal_notice: 'Retiro mínimo: 0.05 USDT / GRAM'
  },
  hi: {
    mining_dashboard: 'माइनिंग डैशबोर्ड',
    support: 'सहायता',
    total_ghs_power: 'कुल GHS पावर',
    add_ghs_boost: '⚡ GHS पावर बढ़ाएं',
    reinvest_balance: '🔄 पुनः निवेश करें',
    unclaimed_mined_balance: 'उपलब्ध कमाई',
    ready_to_collect: 'कलेक्ट करने के लिए तैयार',
    collect_honey: 'रिवॉर्ड प्राप्त करें',
    wallet_balance: 'वॉलेट बैलेंस',
    miner_status: 'माइनर स्थिति',
    online_active: 'ऑनलाइन सक्रिय',
    rate_per_sec: 'कमाई की दर',
    daily_estimated: 'दैनिक अनुमानित',
    per_day: 'प्रति दिन',
    earn: 'कमाई',
    miner: 'माइनर',
    tasks: 'टास्क',
    withdraw: 'निकासी',
    select_language: 'भाषा चुनें',
    invite_friends: 'मित्रों को आमंत्रित करें',
    your_referral_link: 'आपका रेफरल लिंक',
    copy_link: 'लिंक कॉपी करें',
    friends_invited: 'आमंत्रित मित्र',
    earned_commissions: 'अर्जित कमीशन',
    missions_board: 'मिशन बोर्ड',
    complete_tasks_earn: 'टास्क पूरे करें और GH/s पावर बढ़ाएं',
    withdraw_funds: 'रिवॉर्ड निकालें',
    payout_address: 'वॉलेट पता दर्ज करें',
    withdraw_btn: 'निकासी का अनुरोध करें',
    min_withdrawal_notice: 'न्यूनतम निकासी: 0.05 USDT / GRAM'
  }
}

interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  currentLanguage: LanguageOption
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  currentLanguage: LANGUAGES[0],
  t: (key: string) => key,
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hashbee_lang')
      if (saved && translations[saved]) return saved

      // Auto detect from Telegram WebApp
      const tgLang = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code
      if (tgLang) {
        const langLower = tgLang.toLowerCase()
        if (translations[langLower]) return langLower
        const short = langLower.split('-')[0]
        if (translations[short]) return short
      }
    } catch (e) {}
    return 'en'
  })

  const setLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguageState(lang)
      try {
        localStorage.setItem('hashbee_lang', lang)
      } catch (e) {}
    }
  }

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.en
    return langDict[key] || translations.en[key] || fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
