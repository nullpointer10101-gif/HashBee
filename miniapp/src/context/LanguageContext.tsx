import React, { createContext, useContext, useState } from 'react'

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

export const translations: Record<string, Record<string, string>> = {
  en: {
    // Header & Navbar
    mining_dashboard: 'MINING DASHBOARD',
    support: 'Support',
    earn: 'EARN',
    miner: 'MINER',
    tasks: 'TASKS',
    withdraw: 'WITHDRAW',
    select_language: 'Select Language',
    close: 'Close',

    // Miner Home Page
    total_ghs_power: 'TOTAL GHS POWER',
    add_ghs: 'ADD GHS',
    free_ghs: 'FREE GHS',
    your_balance: 'YOUR BALANCE',
    pending_balance_live: 'PENDING BALANCE (LIVE)',
    cloud_active: '24/7 Cloud Mining Active',
    claim_balance: 'CLAIM BALANCE',
    claiming: 'CLAIMING...',
    claim_min: 'CLAIM (MIN 0.01)',
    history: 'HISTORY',
    amount_to_deposit: 'Amount to deposit (GRAM)',
    min_deposit: 'Minimum deposit: 0.10 GRAM',
    first_deposit_bonus: '+5% first deposit bonus!',
    profit_calculator: 'PROFIT CALCULATOR',
    daily_profit: 'Daily Profit',
    monthly_profit: 'Monthly Profit',
    pay_tonkeeper: '⚡ PAY WITH TONKEEPER',
    pay_manually: '📋 PAY MANUALLY',
    reinvest_btn: '🔄 REINVEST BALANCE INTO GHS',

    // Referrals Page
    invite_friends_title: 'INVITE FRIENDS & EARN GHS',
    invite_friends_sub: 'Get +3 GHS for every active referral who starts mining!',
    your_referral_link: 'Your referral link',
    copy: 'COPY',
    copied: 'COPIED!',
    share_link: '🚀 SHARE REFERRAL LINK',
    referral_stats: 'REFERRAL STATS',
    tier1: 'Tier 1 (Direct)',
    tier2: 'Tier 2 (Friends of friends)',
    tier3: 'Tier 3 (Network)',
    active_referrals: 'Active Referrals',
    commissions: 'Commissions',
    no_referrals_yet: 'No referrals yet. Share your link to start earning GHS!',

    // Missions Page
    missions_board: 'MISSIONS BOARD',
    missions_sub: 'Complete sponsor tasks & boost your GH/s power',
    all_tasks: 'TASKS',
    my_campaigns: 'MY CAMPAIGNS',
    promote_channel: '+ PROMOTE CHANNEL/BOT',
    claim_reward: 'CLAIM',
    start_task: 'START',
    verify_task: 'VERIFY',
    task_completed: 'COMPLETED',

    // Withdraw Page
    withdraw_title: 'WITHDRAW REWARDS',
    withdraw_sub: 'Fast, secure payouts in USDT & GRAM',
    balance_available: 'AVAILABLE BALANCE',
    enter_amount: 'Amount to Withdraw',
    destination_wallet: 'Wallet Address',
    select_network: 'Network',
    submit_withdrawal: 'CONFIRM WITHDRAWAL',
    min_withdraw_note: 'Min withdrawal: 0.05 USDT',
    req_refs: 'Requires 3 active referrals',
    req_missions: 'Requires 5 completed missions',
    recent_withdrawals: 'RECENT WITHDRAWALS',
    no_withdrawals: 'No withdrawal history yet.'
  },

  ru: {
    // Header & Navbar
    mining_dashboard: 'МАЙНИНГ ПАНЕЛЬ',
    support: 'Поддержка',
    earn: 'ДОХОД',
    miner: 'МАЙНЕР',
    tasks: 'ЗАДАНИЯ',
    withdraw: 'ВЫВОД',
    select_language: 'Выберите язык',
    close: 'Закрыть',

    // Miner Home Page
    total_ghs_power: 'ОБЩАЯ МОЩНОСТЬ GHS',
    add_ghs: 'КУПИТЬ GHS',
    free_ghs: 'БЕСПЛАТНЫЙ GHS',
    your_balance: 'ВАШ БАЛАНС',
    pending_balance_live: 'ДОБЫТО СЕЙЧАС (LIVE)',
    cloud_active: '24/7 Облачный майнинг активен',
    claim_balance: 'СОБРАТЬ НАГРАДУ',
    claiming: 'СБОР...',
    claim_min: 'СОБРАТЬ (ОТ 0.01)',
    history: 'ИСТОРИЯ',
    amount_to_deposit: 'Сумма депозита (GRAM)',
    min_deposit: 'Минимальный депозит: 0.10 GRAM',
    first_deposit_bonus: '+5% бонус на первый депозит!',
    profit_calculator: 'КАЛЬКУЛЯТОР ДОХОДА',
    daily_profit: 'Доход в день',
    monthly_profit: 'Доход в месяц',
    pay_tonkeeper: '⚡ ОПЛАТИТЬ ЧЕРЕЗ TONKEEPER',
    pay_manually: '📋 ОПЛАТИТЬ ВРУЧНУЮ',
    reinvest_btn: '🔄 РЕИНВЕСТИРОВАТЬ В GHS',

    // Referrals Page
    invite_friends_title: 'ПРИГЛАШАЙТЕ ДРУЗЕЙ И ПОЛУЧАЙТЕ GHS',
    invite_friends_sub: 'Получайте +3 GHS за каждого активного реферала!',
    your_referral_link: 'Ваша реферальная ссылка',
    copy: 'КОПИРОВАТЬ',
    copied: 'СКОПИРОВАНО!',
    share_link: '🚀 ПОДЕЛИТЬСЯ ССЫЛКОЙ',
    referral_stats: 'СТАТИСТИКА РЕФЕРАЛОВ',
    tier1: 'Уровень 1 (Прямые)',
    tier2: 'Уровень 2 (Друзья друзей)',
    tier3: 'Уровень 3 (Сеть)',
    active_referrals: 'Активные рефералы',
    commissions: 'Комиссия',
    no_referrals_yet: 'У вас пока нет рефералов. Отправьте ссылку друзьям!',

    // Missions Page
    missions_board: 'СПИСОК ЗАДАНИЙ',
    missions_sub: 'Выполняйте задания спонсоров и увеличивайте мощность GH/s',
    all_tasks: 'ЗАДАНИЯ',
    my_campaigns: 'МОИ КАМПАНИИ',
    promote_channel: '+ РЕКЛАМИРОВАТЬ КАНАЛ/БОТА',
    claim_reward: 'ЗАБРАТЬ',
    start_task: 'НАЧАТЬ',
    verify_task: 'ПРОВЕРИТЬ',
    task_completed: 'ВЫПОЛНЕНО',

    // Withdraw Page
    withdraw_title: 'ВЫВОД СРЕДСТВ',
    withdraw_sub: 'Быстрые и надежные выплаты в USDT и GRAM',
    balance_available: 'ДОСТУПНЫЙ БАЛАНС',
    enter_amount: 'Сумма вывода',
    destination_wallet: 'Адрес кошелька',
    select_network: 'Сеть',
    submit_withdrawal: 'ПОДТВЕРДИТЬ ВЫВОД',
    min_withdraw_note: 'Мин. вывод: 0.05 USDT',
    req_refs: 'Требуется 3 активных реферала',
    req_missions: 'Требуется 5 выполненных заданий',
    recent_withdrawals: 'ИСТОРИЯ ВЫВОДОВ',
    no_withdrawals: 'История выводов пуста.'
  },

  uz: {
    // Header & Navbar
    mining_dashboard: 'MAYNING PANELI',
    support: 'Yordam',
    earn: 'DAROMAD',
    miner: 'MAYNER',
    tasks: 'VAZIFALAR',
    withdraw: 'YECHISH',
    select_language: 'Tilni tanlang',
    close: 'Yopish',

    // Miner Home Page
    total_ghs_power: 'UMUMIY GHS QUVVATI',
    add_ghs: 'GHS SOTIB OLISH',
    free_ghs: 'TEKIN GHS',
    your_balance: 'SIZNING BALANSINGIZ',
    pending_balance_live: 'YIG‘ILMOQDA (JONLI)',
    cloud_active: '24/7 Bulutli mayning faol',
    claim_balance: 'BALANSNI YIG‘ISH',
    claiming: 'YIG‘ILMOQDA...',
    claim_min: 'YIG‘ISH (MIN 0.01)',
    history: 'TARIX',
    amount_to_deposit: 'Depozit miqdori (GRAM)',
    min_deposit: 'Minimal depozit: 0.10 GRAM',
    first_deposit_bonus: '+5% birinchi depozit bonusi!',
    profit_calculator: 'DAROMAD KALKULYATORI',
    daily_profit: 'Kunlik daromad',
    monthly_profit: 'Oylik daromad',
    pay_tonkeeper: '⚡ TONKEEPER ORQALI TO‘LASH',
    pay_manually: '📋 QO‘LDA TO‘LASH',
    reinvest_btn: '🔄 GHS GA QAYTA KIRITISH',

    // Referrals Page
    invite_friends_title: 'DO‘STARNI TAKLIF QILING VA GHS OLING',
    invite_friends_sub: 'Har bir faol do‘stingiz uchun +3 GHS oling!',
    your_referral_link: 'Taklif havolangiz',
    copy: 'NUSXA',
    copied: 'NUSXALANDI!',
    share_link: '🚀 HAVOLANI ULASHISH',
    referral_stats: 'REFERAL STATISTIKASI',
    tier1: '1-daraja (To‘g‘ridan-to‘g‘ri)',
    tier2: '2-daraja (Do‘stlarning do‘stlari)',
    tier3: '3-daraja (Tarmoq)',
    active_referrals: 'Faol referallar',
    commissions: 'Komissiyalar',
    no_referrals_yet: 'Hali referallar yo‘q. Do‘stlaringizga yuboring!',

    // Missions Page
    missions_board: 'VAZIFALAR RO‘YXATI',
    missions_sub: 'Homiylar vazifalarini bajaring va GH/s quvvatingizni oshiring',
    all_tasks: 'VAZIFALAR',
    my_campaigns: 'MENING REKLAMALARIM',
    promote_channel: '+ KANAL/BOT REKLAMA QILISH',
    claim_reward: 'OLISH',
    start_task: 'BOSHLASH',
    verify_task: 'TEKSHIRISH',
    task_completed: 'BAJARILDI',

    // Withdraw Page
    withdraw_title: 'PUL YECHIB OLISH',
    withdraw_sub: 'USDT va GRAM da xavfsiz va tez to‘lovlar',
    balance_available: 'MAVJUD BALANS',
    enter_amount: 'Yechish miqdori',
    destination_wallet: 'Hamyon manzili',
    select_network: 'Tarmoq',
    submit_withdrawal: 'YECHIB OLISHNI TASDIQLASH',
    min_withdraw_note: 'Minimal yechish: 0.05 USDT',
    req_refs: '3 ta faol referal kerak',
    req_missions: '5 ta bajarilgan vazifa kerak',
    recent_withdrawals: 'YECHIB OLISHLAR TARIXI',
    no_withdrawals: 'Hali yechib olingan to‘lovlar yo‘q.'
  },

  id: {
    mining_dashboard: 'DASHBOARD MINING',
    support: 'Bantuan',
    earn: 'PENDAPATAN',
    miner: 'MINER',
    tasks: 'TUGAS',
    withdraw: 'PENARIKAN',
    select_language: 'Pilih Bahasa',
    close: 'Tutup',

    total_ghs_power: 'TOTAL DAYA GHS',
    add_ghs: 'TAMBAH GHS',
    free_ghs: 'GHS GRATIS',
    your_balance: 'SALDO ANDA',
    pending_balance_live: 'SALDO TERTUNDA (LIVE)',
    cloud_active: 'Cloud Mining 24/7 Aktif',
    claim_balance: 'KLAIM SALDO',
    claiming: 'MENGKLAIM...',
    claim_min: 'KLAIM (MIN 0.01)',
    history: 'RIWAYAT',
    amount_to_deposit: 'Jumlah Deposit (GRAM)',
    min_deposit: 'Deposit minimum: 0.10 GRAM',
    first_deposit_bonus: '+5% bonus deposit pertama!',
    profit_calculator: 'KALKULATOR PROFIT',
    daily_profit: 'Profit Harian',
    monthly_profit: 'Profit Bulanan',
    pay_tonkeeper: '⚡ BAYAR VIA TONKEEPER',
    pay_manually: '📋 BAYAR MANUAL',
    reinvest_btn: '🔄 REINVEST KE GHS',

    invite_friends_title: 'UNDANG TEMAN & DAPATKAN GHS',
    invite_friends_sub: 'Dapatkan +3 GHS untuk setiap referral aktif!',
    your_referral_link: 'Link referral Anda',
    copy: 'SALIN',
    copied: 'TERSALIN!',
    share_link: '🚀 BAGIKAN LINK',
    referral_stats: 'STATISTIK REFERRAL',
    tier1: 'Level 1 (Langsung)',
    tier2: 'Level 2 (Teman dari teman)',
    tier3: 'Level 3 (Jaringan)',
    active_referrals: 'Referral Aktif',
    commissions: 'Komisi',
    no_referrals_yet: 'Belum ada referral. Bagikan link Anda sekarang!',

    missions_board: 'DAFTAR MISI',
    missions_sub: 'Selesaikan misi sponsor & tingkatkan daya GH/s',
    all_tasks: 'MISI',
    my_campaigns: 'IKLAN SAYA',
    promote_channel: '+ PASANG IKLAN KANAL/BOT',
    claim_reward: 'KLAIM',
    start_task: 'MULAI',
    verify_task: 'VERIFIKASI',
    task_completed: 'SELESAI',

    withdraw_title: 'PENARIKAN REWARD',
    withdraw_sub: 'Pembayaran cepat dan aman di USDT & GRAM',
    balance_available: 'SALDO TERSEDIA',
    enter_amount: 'Jumlah Penarikan',
    destination_wallet: 'Alamat Dompet',
    select_network: 'Jaringan',
    submit_withdrawal: 'KONFIRMASI PENARIKAN',
    min_withdraw_note: 'Penarikan minimum: 0.05 USDT',
    req_refs: 'Perlu 3 referral aktif',
    req_missions: 'Perlu 5 misi selesai',
    recent_withdrawals: 'RIWAYAT PENARIKAN',
    no_withdrawals: 'Belum ada riwayat penarikan.'
  },

  vi: {
    mining_dashboard: 'BẢNG ĐIỀU KHIỂN ĐÀO',
    support: 'Hỗ trợ',
    earn: 'KIẾM TIỀN',
    miner: 'MÁY ĐÀO',
    tasks: 'NHIỆM VỤ',
    withdraw: 'RÚT TIỀN',
    select_language: 'Chọn ngôn ngữ',
    close: 'Đóng',

    total_ghs_power: 'TỔNG CÔNG SUẤT GHS',
    add_ghs: 'NẠP GHS',
    free_ghs: 'GHS MIỄN PHÍ',
    your_balance: 'SỐ DƯ CỦA BẠN',
    pending_balance_live: 'ĐANG ĐÀO ĐƯỢC (TRỰC TIẾP)',
    cloud_active: 'Khai thác đám mây 24/7 đang hoạt động',
    claim_balance: 'NHẬN SỐ DƯ',
    claiming: 'ĐANG NHẬN...',
    claim_min: 'NHẬN (TỐI THIỂU 0.01)',
    history: 'LỊCH SỬ',
    amount_to_deposit: 'Số lượng nạp (GRAM)',
    min_deposit: 'Nạp tối thiểu: 0.10 GRAM',
    first_deposit_bonus: '+5% thưởng nạp lần đầu!',
    profit_calculator: 'TÍNH TOÁN LỢI NHUẬN',
    daily_profit: 'Lợi nhuận ngày',
    monthly_profit: 'Lợi nhuận tháng',
    pay_tonkeeper: '⚡ THANH TOÁN QUA TONKEEPER',
    pay_manually: '📋 THANH TOÁN THỦ CÔNG',
    reinvest_btn: '🔄 TÁI ĐẦU TƯ VÀO GHS',

    invite_friends_title: 'MỜI BẠN BÈ & NHẬN GHS',
    invite_friends_sub: 'Nhận ngay +3 GHS cho mỗi bạn bè bắt đầu đào!',
    your_referral_link: 'Liên kết giới thiệu của bạn',
    copy: 'CHÉP',
    copied: 'ĐÃ CHÉP!',
    share_link: '🚀 CHIA SẺ LIÊN KẾT',
    referral_stats: 'THỐNG KÊ GIỚI THIỆU',
    tier1: 'Tầng 1 (Trực tiếp)',
    tier2: 'Tầng 2 (Bạn của bạn)',
    tier3: 'Tầng 3 (Hệ thống)',
    active_referrals: 'Người giới thiệu hoạt động',
    commissions: 'Hoa hồng',
    no_referrals_yet: 'Chưa có người giới thiệu. Hãy chia sẻ liên kết!',

    missions_board: 'DANH SÁCH NHIỆM VỤ',
    missions_sub: 'Hoàn thành nhiệm vụ để gia tăng tốc độ đào GH/s',
    all_tasks: 'NHIỆM VỤ',
    my_campaigns: 'CHIẾN DỊCH CỦA TÔI',
    promote_channel: '+ QUẢNG CÁO KÊNH/BOT',
    claim_reward: 'NHẬN THƯỞNG',
    start_task: 'BẮT ĐẦU',
    verify_task: 'XÁC NHẬN',
    task_completed: 'ĐÃ XONG',

    withdraw_title: 'RÚT PHẦN THƯỞNG',
    withdraw_sub: 'Rút tiền nhanh chóng & an toàn qua USDT / GRAM',
    balance_available: 'SỐ DƯ KHẢ DỤNG',
    enter_amount: 'Số tiền muốn rút',
    destination_wallet: 'Địa chỉ ví nhận',
    select_network: 'Mạng lưới',
    submit_withdrawal: 'XÁC NHẬN RÚT TIỀN',
    min_withdraw_note: 'Rút tối thiểu: 0.05 USDT',
    req_refs: 'Cần 3 bạn bè hoạt động',
    req_missions: 'Cần hoàn thành 5 nhiệm vụ',
    recent_withdrawals: 'LỊCH SỬ RÚT TIỀN',
    no_withdrawals: 'Chưa có lịch sử rút tiền.'
  },

  es: {
    mining_dashboard: 'PANEL DE MINERÍA',
    support: 'Soporte',
    earn: 'GANAR',
    miner: 'MINERO',
    tasks: 'TAREAS',
    withdraw: 'RETIRAR',
    select_language: 'Seleccionar idioma',
    close: 'Cerrar',

    total_ghs_power: 'POTENCIA TOTAL GHS',
    add_ghs: 'AÑADIR GHS',
    free_ghs: 'GHS GRATIS',
    your_balance: 'TU BALANCE',
    pending_balance_live: 'BALANCE PENDIENTE (EN VIVO)',
    cloud_active: 'Minería en la nube activa 24/7',
    claim_balance: 'RECLAMAR BALANCE',
    claiming: 'RECLAMANDO...',
    claim_min: 'RECLAMAR (MIN 0.01)',
    history: 'HISTORIAL',
    amount_to_deposit: 'Cantidad a depositar (GRAM)',
    min_deposit: 'Depósito mínimo: 0.10 GRAM',
    first_deposit_bonus: '¡+5% de bono en el primer depósito!',
    profit_calculator: 'CALCULADORA DE BENEFICIOS',
    daily_profit: 'Beneficio diario',
    monthly_profit: 'Beneficio mensual',
    pay_tonkeeper: '⚡ PAGAR CON TONKEEPER',
    pay_manually: '📋 PAGAR MANUALMENTE',
    reinvest_btn: '🔄 REINVERTIR EN GHS',

    invite_friends_title: 'INVITA AMIGOS Y GANA GHS',
    invite_friends_sub: '¡Obtén +3 GHS por cada amigo activo que empiece a minar!',
    your_referral_link: 'Tu enlace de referido',
    copy: 'COPIAR',
    copied: '¡COPIADO!',
    share_link: '🚀 COMPARTIR ENLACE',
    referral_stats: 'ESTADÍSTICAS DE REFERIDOS',
    tier1: 'Nivel 1 (Directos)',
    tier2: 'Nivel 2 (Amigos de amigos)',
    tier3: 'Nivel 3 (Red)',
    active_referrals: 'Referidos Activos',
    commissions: 'Comisiones',
    no_referrals_yet: 'Aún no tienes referidos. ¡Comparte tu enlace!',

    missions_board: 'TABLÓN DE MISIONES',
    missions_sub: 'Completa tareas patrocinadas y aumenta tu potencia GH/s',
    all_tasks: 'TAREAS',
    my_campaigns: 'MIS CAMPAÑAS',
    promote_channel: '+ PROMOCIONAR CANAL/BOT',
    claim_reward: 'RECLAMAR',
    start_task: 'EMPEZAR',
    verify_task: 'VERIFICAR',
    task_completed: 'COMPLETADO',

    withdraw_title: 'RETIRAR FONDOS',
    withdraw_sub: 'Pagos rápidos y seguros en USDT y GRAM',
    balance_available: 'BALANCE DISPONIBLE',
    enter_amount: 'Cantidad a retirar',
    destination_wallet: 'Dirección de billetera',
    select_network: 'Red',
    submit_withdrawal: 'CONFIRMAR RETIRO',
    min_withdraw_note: 'Retiro mínimo: 0.05 USDT',
    req_refs: 'Requiere 3 referidos activos',
    req_missions: 'Requiere 5 misiones completadas',
    recent_withdrawals: 'HISTORIAL DE RETIROS',
    no_withdrawals: 'Sin retiros todavía.'
  },

  hi: {
    mining_dashboard: 'माइनिंग डैशबोर्ड',
    support: 'सहायता',
    earn: 'कमाई',
    miner: 'माइनर',
    tasks: 'टास्क',
    withdraw: 'निकासी',
    select_language: 'भाषा चुनें',
    close: 'बंद करें',

    total_ghs_power: 'कुल GHS पावर',
    add_ghs: 'GHS जोड़ें',
    free_ghs: 'मुफ्त GHS',
    your_balance: 'आपका बैलेंस',
    pending_balance_live: 'उपलब्ध माइनिंग (लाइव)',
    cloud_active: '24/7 क्लाउड माइनिंग सक्रिय',
    claim_balance: 'बैलेंस कलेक्ट करें',
    claiming: 'कलेक्ट हो रहा है...',
    claim_min: 'कलेक्ट (न्यूनतम 0.01)',
    history: 'इतिहास',
    amount_to_deposit: 'जमा राशि (GRAM)',
    min_deposit: 'न्यूनतम जमा: 0.10 GRAM',
    first_deposit_bonus: '+5% पहले डिपॉजिट पर बोनस!',
    profit_calculator: 'लाभ कैलकुलेटर',
    daily_profit: 'दैनिक लाभ',
    monthly_profit: 'मासिक लाभ',
    pay_tonkeeper: '⚡ TONKEEPER से भुगतान करें',
    pay_manually: '📋 मैन्युअल भुगतान करें',
    reinvest_btn: '🔄 GHS में पुनर्निवेश करें',

    invite_friends_title: 'मित्रों को आमंत्रित करें और GHS पाएं',
    invite_friends_sub: 'माइनिंग शुरू करने वाले प्रत्येक सक्रिय मित्र पर +3 GHS पाएं!',
    your_referral_link: 'आपका रेफरल लिंक',
    copy: 'कॉपी',
    copied: 'कॉपी किया गया!',
    share_link: '🚀 रेफरल लिंक साझा करें',
    referral_stats: 'रेफरल सांख्यिकी',
    tier1: 'टियर 1 (सीधे)',
    tier2: 'टियर 2 (मित्रों के मित्र)',
    tier3: 'टियर 3 (नेटवर्क)',
    active_referrals: 'सक्रिय रेफरल',
    commissions: 'कमीशन',
    no_referrals_yet: 'अभी कोई रेफरल नहीं है। लिंक साझा करें!',

    missions_board: 'मिशन बोर्ड',
    missions_sub: 'टास्क पूरे करें और GH/s पावर बढ़ाएं',
    all_tasks: 'टास्क',
    my_campaigns: 'मेरे अभियान',
    promote_channel: '+ चैनल/बॉट प्रमोट करें',
    claim_reward: 'क्लेम',
    start_task: 'शुरू करें',
    verify_task: 'सत्यापित करें',
    task_completed: 'पूर्ण',

    withdraw_title: 'रिवॉर्ड निकासी',
    withdraw_sub: 'USDT और GRAM में तेज़ व सुरक्षित भुगतान',
    balance_available: 'उपलब्ध बैलेंस',
    enter_amount: 'निकासी राशि',
    destination_wallet: 'वॉलेट पता',
    select_network: 'नेटवर्क',
    submit_withdrawal: 'निकासी की पुष्टि करें',
    min_withdraw_note: 'न्यूनतम निकासी: 0.05 USDT',
    req_refs: '3 सक्रिय रेफरल आवश्यक',
    req_missions: '5 पूर्ण टास्क आवश्यक',
    recent_withdrawals: 'हाल की निकासी',
    no_withdrawals: 'अभी तक कोई निकासी इतिहास नहीं है।'
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
