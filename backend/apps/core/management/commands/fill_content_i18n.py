"""
Barcha kontent maydonlarini uz/ru/en/kaa bilan to'ldirish.

  python manage.py fill_content_i18n
  python manage.py fill_content_i18n --force   # mavjud tarjimalarni qayta yozadi
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from utils.i18n_fields import LOCALES, ensure_i18n_bucket

# Aniq matn → 4 til (kalit = o'zbekcha asl matn, trim)
PHRASES: dict[str, dict[str, str]] = {
    # ── Lavozim / bo'lim ──
    "Rektor": {
        "uz": "Rektor",
        "ru": "Ректор",
        "en": "Rector",
        "kaa": "Rektor",
    },
    "Rektorat": {
        "uz": "Rektorat",
        "ru": "Ректорат",
        "en": "Rectorate",
        "kaa": "Rektorat",
    },
    "O'quv ishlari bo'yicha prorektor": {
        "uz": "O'quv ishlari bo'yicha prorektor",
        "ru": "Проректор по учебной работе",
        "en": "Vice-rector for academic affairs",
        "kaa": "Oqıw isleri boyınsha prorektor",
    },
    "O'quv boshqarmasi": {
        "uz": "O'quv boshqarmasi",
        "ru": "Учебное управление",
        "en": "Academic office",
        "kaa": "Oqıw basqarması",
    },
    "Yoshlar masalalari va ma'naviy-ma'rifiy ishlar bo'yicha prorektor": {
        "uz": "Yoshlar masalalari va ma'naviy-ma'rifiy ishlar bo'yicha prorektor",
        "ru": "Проректор по делам молодёжи и духовно-просветительской работе",
        "en": "Vice-rector for youth and spiritual-educational affairs",
        "kaa": "Jaslar hám mádeniy-maǵlıwmatlıq isler boyınsha prorektor",
    },
    "Yoshlar markazi": {
        "uz": "Yoshlar markazi",
        "ru": "Молодёжный центр",
        "en": "Youth center",
        "kaa": "Jaslar orayı",
    },
    "Komplayens nazorat bo'limi boshlig'i": {
        "uz": "Komplayens nazorat bo'limi boshlig'i",
        "ru": "Начальник отдела комплаенс-контроля",
        "en": "Head of compliance control",
        "kaa": "Komplayens baqlaw bólimi basshısı",
    },
    "Komplayens nazorat": {
        "uz": "Komplayens nazorat",
        "ru": "Комплаенс-контроль",
        "en": "Compliance control",
        "kaa": "Komplayens baqlaw",
    },
    # ── Risk ──
    "Xaridlar shaffofligi bo'shlig'i": {
        "uz": "Xaridlar shaffofligi bo'shlig'i",
        "ru": "Пробел прозрачности закупок",
        "en": "Procurement transparency gap",
        "kaa": "Satıp alıw ashıqlıǵı boślıǵı",
    },
    "Murojaat SLA kechikishi xavfi": {
        "uz": "Murojaat SLA kechikishi xavfi",
        "ru": "Риск просрочки SLA по обращениям",
        "en": "Appeal SLA delay risk",
        "kaa": "Múrájat SLA keshigiw qáwpi",
    },
    "Demo: xarid jarayonida ochiqlikni kuchaytirish.": {
        "uz": "Demo: xarid jarayonida ochiqlikni kuchaytirish.",
        "ru": "Демо: усилить прозрачность закупок.",
        "en": "Demo: strengthen procurement transparency.",
        "kaa": "Demo: satıp alıw ashıqlıǵın kúsheytiw.",
    },
    "72 soatlik javob muddatini nazorat qilish.": {
        "uz": "72 soatlik javob muddatini nazorat qilish.",
        "ru": "Контроль 72-часового срока ответа.",
        "en": "Monitor the 72-hour response deadline.",
        "kaa": "72 saatlıq juwap múddetin baqlaw.",
    },
    # ── So'rovnoma variantlari ──
    "Juda qoniqaman": {
        "uz": "Juda qoniqaman",
        "ru": "Очень доволен(на)",
        "en": "Very satisfied",
        "kaa": "Júdá qanaatlanaman",
    },
    "Qoniqaman": {
        "uz": "Qoniqaman",
        "ru": "Доволен(на)",
        "en": "Satisfied",
        "kaa": "Qanaatlanaman",
    },
    "O'rtacha": {
        "uz": "O'rtacha",
        "ru": "Средне",
        "en": "Average",
        "kaa": "Orta",
    },
    "Qoniqmayman": {
        "uz": "Qoniqmayman",
        "ru": "Недоволен(на)",
        "en": "Dissatisfied",
        "kaa": "Qanaatlanbayman",
    },
    "Umuman qoniqmayman": {
        "uz": "Umuman qoniqmayman",
        "ru": "Совсем недоволен(на)",
        "en": "Very dissatisfied",
        "kaa": "Umuman qanaatlanbayman",
    },
    "Ha": {"uz": "Ha", "ru": "Да", "en": "Yes", "kaa": "Awa"},
    "Yo'q": {"uz": "Yo'q", "ru": "Нет", "en": "No", "kaa": "Yaq"},
    "Har kuni": {
        "uz": "Har kuni",
        "ru": "Каждый день",
        "en": "Every day",
        "kaa": "Hár kúni",
    },
    "Haftada 1–2 marta": {
        "uz": "Haftada 1–2 marta",
        "ru": "1–2 раза в неделю",
        "en": "1–2 times a week",
        "kaa": "Háptege 1–2 ret",
    },
    "Oyda bir necha": {
        "uz": "Oyda bir necha",
        "ru": "Несколько раз в месяц",
        "en": "A few times a month",
        "kaa": "Ayda bir neshe",
    },
    "Deyarli yo'q": {
        "uz": "Deyarli yo'q",
        "ru": "Почти никогда",
        "en": "Almost never",
        "kaa": "Derlik joq",
    },
    "Juda qulay": {
        "uz": "Juda qulay",
        "ru": "Очень удобно",
        "en": "Very convenient",
        "kaa": "Júdá ońay",
    },
    "Qulay": {"uz": "Qulay", "ru": "Удобно", "en": "Convenient", "kaa": "Ońay"},
    "Qiyin": {"uz": "Qiyin", "ru": "Сложно", "en": "Difficult", "kaa": "Qıyın"},
    "Juda qiyin": {
        "uz": "Juda qiyin",
        "ru": "Очень сложно",
        "en": "Very difficult",
        "kaa": "Júdá qıyın",
    },
    "Kitoblar fondi": {
        "uz": "Kitoblar fondi",
        "ru": "Книжный фонд",
        "en": "Book collection",
        "kaa": "Kitaplar fondı",
    },
    "Wi‑Fi": {"uz": "Wi‑Fi", "ru": "Wi‑Fi", "en": "Wi‑Fi", "kaa": "Wi‑Fi"},
    "O'qish zali": {
        "uz": "O'qish zali",
        "ru": "Читальный зал",
        "en": "Reading room",
        "kaa": "Oqıw zaly",
    },
    "Onlayn katalog": {
        "uz": "Onlayn katalog",
        "ru": "Онлайн-каталог",
        "en": "Online catalog",
        "kaa": "Onlayn katalog",
    },
    "Konsultatsiya": {
        "uz": "Konsultatsiya",
        "ru": "Консультация",
        "en": "Consultation",
        "kaa": "Konsultatsiya",
    },
    "Jadval": {"uz": "Jadval", "ru": "Расписание", "en": "Schedule", "kaa": "Jadval"},
    "Baholar": {"uz": "Baholar", "ru": "Оценки", "en": "Grades", "kaa": "Bahalar"},
    "To'lov": {"uz": "To'lov", "ru": "Оплата", "en": "Payment", "kaa": "Tólem"},
    "Arizalar": {
        "uz": "Arizalar",
        "ru": "Заявления",
        "en": "Applications",
        "kaa": "Arzalar",
    },
    "Bildirishnomalar": {
        "uz": "Bildirishnomalar",
        "ru": "Уведомления",
        "en": "Notifications",
        "kaa": "Xabarlandırıwlar",
    },
    "Ha, muntazam": {
        "uz": "Ha, muntazam",
        "ru": "Да, регулярно",
        "en": "Yes, regularly",
        "kaa": "Awa, úzliksiz",
    },
    "Ba'zan": {"uz": "Ba'zan", "ru": "Иногда", "en": "Sometimes", "kaa": "Keyde"},
    "Yo'q, lekin xohlayman": {
        "uz": "Yo'q, lekin xohlayman",
        "ru": "Нет, но хочу",
        "en": "No, but I want to",
        "kaa": "Yaq, biraq qáleymen",
    },
    "Qiziqmayman": {
        "uz": "Qiziqmayman",
        "ru": "Не интересно",
        "en": "Not interested",
        "kaa": "Qızıqpayman",
    },
    # savollar
    "Umuman olganda o'quv jarayonidan qoniqasizmi?": {
        "uz": "Umuman olganda o'quv jarayonidan qoniqasizmi?",
        "ru": "В целом вы довольны учебным процессом?",
        "en": "Overall, are you satisfied with the learning process?",
        "kaa": "Ulıwma oqıw processinen qanaatlanasız ba?",
    },
    "Dars materiallarining foydaliligi (1–5)": {
        "uz": "Dars materiallarining foydaliligi (1–5)",
        "ru": "Полезность учебных материалов (1–5)",
        "en": "Usefulness of course materials (1–5)",
        "kaa": "Sabaq materiallarınıń paydalılıǵı (1–5)",
    },
    "Universitetni do'stlaringizga tavsiya qilasizmi? (0–10)": {
        "uz": "Universitetni do'stlaringizga tavsiya qilasizmi? (0–10)",
        "ru": "Порекомендуете ли университет друзьям? (0–10)",
        "en": "Would you recommend the university to friends? (0–10)",
        "kaa": "Universitetti doslarıńızǵa usınıs etesiz be? (0–10)",
    },
    "O'qituvchilar savollarga o'z vaqtida javob beradi": {
        "uz": "O'qituvchilar savollarga o'z vaqtida javob beradi",
        "ru": "Преподаватели вовремя отвечают на вопросы",
        "en": "Teachers answer questions on time",
        "kaa": "Oqıtıwshılar sorawlarǵa óz waqtında juwap beredi",
    },
    "Yaxshilash bo'yicha takliflaringiz": {
        "uz": "Yaxshilash bo'yicha takliflaringiz",
        "ru": "Ваши предложения по улучшению",
        "en": "Your suggestions for improvement",
        "kaa": "Jaqsılaw boyınsha usınıslarıńız",
    },
    "Kutubxonadan qancha tez-tez foydalanasiz?": {
        "uz": "Kutubxonadan qancha tez-tez foydalanasiz?",
        "ru": "Как часто вы пользуетесь библиотекой?",
        "en": "How often do you use the library?",
        "kaa": "Kitapxanadan qansha jiyi paydalanasız?",
    },
    "Elektron resurslar sifati": {
        "uz": "Elektron resurslar sifati",
        "ru": "Качество электронных ресурсов",
        "en": "Quality of electronic resources",
        "kaa": "Elektron resurslar sapası",
    },
    "Qaysi xizmatlar muhim?": {
        "uz": "Qaysi xizmatlar muhim?",
        "ru": "Какие услуги важны?",
        "en": "Which services matter?",
        "kaa": "Qaysı xızmetler áhmiyetli?",
    },
    "Qaysi adabiyot yetishmayapti?": {
        "uz": "Qaysi adabiyot yetishmayapti?",
        "ru": "Какой литературы не хватает?",
        "en": "Which literature is missing?",
        "kaa": "Qaysı ádebiyat jetispeydi?",
    },
    "TTJda yashaysizmi?": {
        "uz": "TTJda yashaysizmi?",
        "ru": "Вы живёте в общежитии?",
        "en": "Do you live in the dormitory?",
        "kaa": "TTJda jasaysız ba?",
    },
    "Yashash sharoiti": {
        "uz": "Yashash sharoiti",
        "ru": "Условия проживания",
        "en": "Living conditions",
        "kaa": "Jasaw shártleri",
    },
    "Xavfsizlik darajasi qoniqarli": {
        "uz": "Xavfsizlik darajasi qoniqarli",
        "ru": "Уровень безопасности удовлетворителен",
        "en": "Security level is satisfactory",
        "kaa": "Qáwipsizlik dárejesi qanaatlı",
    },
    "TTJni boshqa talabalarga tavsiya qilasizmi?": {
        "uz": "TTJni boshqa talabalarga tavsiya qilasizmi?",
        "ru": "Порекомендуете ли общежитие другим студентам?",
        "en": "Would you recommend the dorm to other students?",
        "kaa": "TTJdi basqa studentlerge usınıs etesiz be?",
    },
    "Muammolar va takliflar": {
        "uz": "Muammolar va takliflar",
        "ru": "Проблемы и предложения",
        "en": "Problems and suggestions",
        "kaa": "Mashqalalar hám usınıslar",
    },
    "HEMIS tizimidan foydalanish qulayligi": {
        "uz": "HEMIS tizimidan foydalanish qulayligi",
        "ru": "Удобство использования системы HEMIS",
        "en": "Ease of using the HEMIS system",
        "kaa": "HEMIS sistemasınan paydalanıw ońaylıǵı",
    },
    "Mobil ilova / veb interfeys": {
        "uz": "Mobil ilova / veb interfeys",
        "ru": "Мобильное приложение / веб-интерфейс",
        "en": "Mobile app / web interface",
        "kaa": "Mobil ilova / veb interfeys",
    },
    "Qaysi funksiyalar kerak?": {
        "uz": "Qaysi funksiyalar kerak?",
        "ru": "Какие функции нужны?",
        "en": "Which features are needed?",
        "kaa": "Qaysı funkciyalar kerek?",
    },
    "Texnik muammo bo'lganmi? Qisqacha yozing": {
        "uz": "Texnik muammo bo'lganmi? Qisqacha yozing",
        "ru": "Были ли технические проблемы? Кратко опишите",
        "en": "Any technical issues? Briefly describe",
        "kaa": "Texnikalıq másele bolǵan ba? Qısqasha jazıń",
    },
    "Sport seksiyalarida qatnashasizmi?": {
        "uz": "Sport seksiyalarida qatnashasizmi?",
        "ru": "Участвуете ли в спортивных секциях?",
        "en": "Do you join sports sections?",
        "kaa": "Sport sekciyalarında qatnasasız ba?",
    },
    "Sport infratuzilmasi": {
        "uz": "Sport infratuzilmasi",
        "ru": "Спортивная инфраструктура",
        "en": "Sports infrastructure",
        "kaa": "Sport infrastrukturası",
    },
    "Universitet sog'lom turmushni rag'batlantiradi": {
        "uz": "Universitet sog'lom turmushni rag'batlantiradi",
        "ru": "Университет поощряет здоровый образ жизни",
        "en": "The university promotes a healthy lifestyle",
        "kaa": "Universitet sawlıqlı turmıstı xoshametleydi",
    },
    "Qanday sport turlari kerak?": {
        "uz": "Qanday sport turlari kerak?",
        "ru": "Какие виды спорта нужны?",
        "en": "Which sports are needed?",
        "kaa": "Qanday sport túrleri kerek?",
    },
}

# So'rovnoma sarlavhalari (DEMO)
SURVEY_TITLES = {
    "[DEMO] O'quv jarayoni sifati 2026": {
        "uz": "[DEMO] O'quv jarayoni sifati 2026",
        "ru": "[DEMO] Качество учебного процесса 2026",
        "en": "[DEMO] Learning process quality 2026",
        "kaa": "[DEMO] Oqıw processı sapası 2026",
    },
    "[DEMO] Kutubxona va axborot resurslari": {
        "uz": "[DEMO] Kutubxona va axborot resurslari",
        "ru": "[DEMO] Библиотека и информационные ресурсы",
        "en": "[DEMO] Library and information resources",
        "kaa": "[DEMO] Kitapxana hám maǵlıwmat resursları",
    },
    "[DEMO] Talabalar turar joyi (TTJ)": {
        "uz": "[DEMO] Talabalar turar joyi (TTJ)",
        "ru": "[DEMO] Студенческое общежитие",
        "en": "[DEMO] Student dormitory",
        "kaa": "[DEMO] Student turar jayı (TTJ)",
    },
    "[DEMO] Raqamli xizmatlar va HEMIS": {
        "uz": "[DEMO] Raqamli xizmatlar va HEMIS",
        "ru": "[DEMO] Цифровые услуги и HEMIS",
        "en": "[DEMO] Digital services and HEMIS",
        "kaa": "[DEMO] Cifrlı xızmetler hám HEMIS",
    },
    "[DEMO] Sport va sog'lom turmush": {
        "uz": "[DEMO] Sport va sog'lom turmush",
        "ru": "[DEMO] Спорт и здоровый образ жизни",
        "en": "[DEMO] Sport and healthy lifestyle",
        "kaa": "[DEMO] Sport hám sawlıqlı turmıs",
    },
    "[DEMO] Ovqatlanish va oshxona": {
        "uz": "[DEMO] Ovqatlanish va oshxona",
        "ru": "[DEMO] Питание и столовая",
        "en": "[DEMO] Meals and cafeteria",
        "kaa": "[DEMO] Awqatlanıw hám asxana",
    },
}

NEWS_TITLES = {
    "Komplayens nazorat bo'limi 2026-yil rejasini e'lon qildi": {
        "uz": "Komplayens nazorat bo'limi 2026-yil rejasini e'lon qildi",
        "ru": "Отдел комплаенс-контроля объявил план на 2026 год",
        "en": "Compliance control department announced the 2026 plan",
        "kaa": "Komplayens baqlaw bólimi 2026-jıl rejesin járiyaladı",
    },
    "Bildir platformasi orqali yangi anonim so'rovnoma boshlandi": {
        "uz": "Bildir platformasi orqali yangi anonim so'rovnoma boshlandi",
        "ru": "На платформе Bildir стартовал новый анонимный опрос",
        "en": "A new anonymous survey started on Bildir",
        "kaa": "Bildir platforması arqalı jańa anonim sorawnama baslandı",
    },
    "Murojaat markazi: 72 soat ichida javob berish tartibi": {
        "uz": "Murojaat markazi: 72 soat ichida javob berish tartibi",
        "ru": "Центр обращений: порядок ответа в течение 72 часов",
        "en": "Appeals center: 72-hour response procedure",
        "kaa": "Múrájat orayı: 72 saat ishinde juwap beriw tártibi",
    },
    "Halollik kuni: ochiq muloqot sessiyasi o'tkazildi": {
        "uz": "Halollik kuni: ochiq muloqot sessiyasi o'tkazildi",
        "ru": "День честности: проведена открытая дискуссия",
        "en": "Integrity Day: open dialogue session held",
        "kaa": "Durıslıq kúni: ashıq sáwbet sessiyası ótkerildi",
    },
    "Bildir mobil interfeysi yangilandi": {
        "uz": "Bildir mobil interfeysi yangilandi",
        "ru": "Мобильный интерфейс Bildir обновлён",
        "en": "Bildir mobile interface updated",
        "kaa": "Bildir mobil interfeysi jańalandı",
    },
    "Ochiq ma'lumotlar: bo'lim hisobotlari chop etiladi": {
        "uz": "Ochiq ma'lumotlar: bo'lim hisobotlari chop etiladi",
        "ru": "Открытые данные: будут опубликованы отчёты отдела",
        "en": "Open data: department reports to be published",
        "kaa": "Ashıq maǵlıwmatlar: bólim esabatları shıǵarıladı",
    },
    "Seminar: «Etika va kasbiy mas'uliyat»": {
        "uz": "Seminar: «Etika va kasbiy mas'uliyat»",
        "ru": "Семинар: «Этика и профессиональная ответственность»",
        "en": "Seminar: «Ethics and professional responsibility»",
        "kaa": "Seminar: «Etika hám kásibiy juwapkershilik»",
    },
    "HEMIS SSO orqali kirish: foydalanuvchilar uchun eslatma": {
        "uz": "HEMIS SSO orqali kirish: foydalanuvchilar uchun eslatma",
        "ru": "Вход через HEMIS SSO: памятка для пользователей",
        "en": "Sign-in via HEMIS SSO: user reminder",
        "kaa": "HEMIS SSO arqalı kiriw: paydalanıwshılar ushın esletpe",
    },
    "Rahbariyat ma'lumotlari landing sahifada yangilandi": {
        "uz": "Rahbariyat ma'lumotlari landing sahifada yangilandi",
        "ru": "Данные руководства обновлены на главной странице",
        "en": "Leadership info updated on the landing page",
        "kaa": "Basshılıq maǵlıwmatları bas bette jańalandı",
    },
    "Anonimlik va maxfiylik: AES-GCM va HMAC muhri": {
        "uz": "Anonimlik va maxfiylik: AES-GCM va HMAC muhri",
        "ru": "Анонимность и конфиденциальность: печать AES-GCM и HMAC",
        "en": "Anonymity and privacy: AES-GCM and HMAC seal",
        "kaa": "Anonimlik hám quqıqsızlıq: AES-GCM hám HMAC muhrı",
    },
    "Fakultetlar kesimida tahlil dashboardi taqdim etildi": {
        "uz": "Fakultetlar kesimida tahlil dashboardi taqdim etildi",
        "ru": "Представлена аналитическая панель по факультетам",
        "en": "Faculty analytics dashboard presented",
        "kaa": "Fakultetler kesiminde analiz dashboardı usınıldı",
    },
    "QR kod orqali so'rovnoma tarqatish yo'riqnomasi": {
        "uz": "QR kod orqali so'rovnoma tarqatish yo'riqnomasi",
        "ru": "Инструкция по распространению опроса через QR-код",
        "en": "Guide to sharing surveys via QR code",
        "kaa": "QR kod arqalı sorawnama tarqatıw qollanbası",
    },
    "Korrupsiyaga qarshi kurash agentligi materiallari tavsiya etildi": {
        "uz": "Korrupsiyaga qarshi kurash agentligi materiallari tavsiya etildi",
        "ru": "Рекомендованы материалы Агентства по противодействию коррупции",
        "en": "Anti-corruption agency materials recommended",
        "kaa": "Korruptsiyaǵa qarsı agentlik materialları usınıldı",
    },
    "Yangi o'quv yili: komplayens bo'yicha onboarding sessiyasi": {
        "uz": "Yangi o'quv yili: komplayens bo'yicha onboarding sessiyasi",
        "ru": "Новый учебный год: сессия по комплаенсу",
        "en": "New academic year: compliance onboarding session",
        "kaa": "Jańa oqıw jılı: komplayens boyınsha onboarding sessiyası",
    },
    "Ichki tartib-qoidalar monitoringi kuchaytirildi": {
        "uz": "Ichki tartib-qoidalar monitoringi kuchaytirildi",
        "ru": "Усилен мониторинг внутренних правил",
        "en": "Internal rules monitoring strengthened",
        "kaa": "Ishki tártip-qaǵıydalar monitoringi kúsheytildi",
    },
}

NEWS_SUMMARIES = {
    "Halollik madaniyati, ochiqlik va raqamli monitoring — yilning ustuvor yo'nalishlari.": {
        "uz": "Halollik madaniyati, ochiqlik va raqamli monitoring — yilning ustuvor yo'nalishlari.",
        "ru": "Культура честности, открытость и цифровой мониторинг — приоритеты года.",
        "en": "Integrity culture, openness and digital monitoring — priorities of the year.",
        "kaa": "Durıslıq mádeniyatı, ashıqlıq hám cifrlı monitoring — jıldıń bastı baǵdarları.",
    },
    "O'quv sifati va xizmat ko'rsatish bo'yicha anonim fikr-mulohaza yig'ilmoqda.": {
        "uz": "O'quv sifati va xizmat ko'rsatish bo'yicha anonim fikr-mulohaza yig'ilmoqda.",
        "ru": "Собирается анонимная обратная связь по качеству обучения и сервису.",
        "en": "Anonymous feedback on education quality and services is being collected.",
        "kaa": "Oqıw sapası hám xızmet boyınsha anonim pikir jıynalmaqta.",
    },
    "Foydalanuvchilar yozma murojaat va fayl biriktirib yuborishi mumkin.": {
        "uz": "Foydalanuvchilar yozma murojaat va fayl biriktirib yuborishi mumkin.",
        "ru": "Пользователи могут отправлять письменные обращения с файлами.",
        "en": "Users can submit written appeals with file attachments.",
        "kaa": "Paydalanıwshılar jazba múrájat hám fayl biriktirip jibere aladı.",
    },
}

SURVEY_DESCS = {
    "Darslar, o'qituvchilar va o'quv materiallari bo'yicha anonim fikr-mulohaza.": {
        "uz": "Darslar, o'qituvchilar va o'quv materiallari bo'yicha anonim fikr-mulohaza.",
        "ru": "Анонимный отзыв о занятиях, преподавателях и учебных материалах.",
        "en": "Anonymous feedback on classes, teachers and materials.",
        "kaa": "Sabaqlar, oqıtıwshılar hám materiallar boyınsha anonim pikir.",
    },
    "Kutubxona xizmati, elektron bazalar va o'qish zallari.": {
        "uz": "Kutubxona xizmati, elektron bazalar va o'qish zallari.",
        "ru": "Библиотечный сервис, электронные базы и читальные залы.",
        "en": "Library service, e-databases and reading rooms.",
        "kaa": "Kitapxana xızmeti, elektron bazalar hám oqıw zalları.",
    },
    "Yotoqxona sharoiti va xizmatlar bahosi.": {
        "uz": "Yotoqxona sharoiti va xizmatlar bahosi.",
        "ru": "Условия общежития и оценка услуг.",
        "en": "Dorm conditions and service rating.",
        "kaa": "Jataqxana shártleri hám xızmetler bahası.",
    },
    "Kabinet, jadval, baholar va onlayn xizmatlar.": {
        "uz": "Kabinet, jadval, baholar va onlayn xizmatlar.",
        "ru": "Кабинет, расписание, оценки и онлайн-услуги.",
        "en": "Cabinet, schedule, grades and online services.",
        "kaa": "Kabinet, jadval, bahalar hám onlayn xızmetler.",
    },
    "Sport zallari, musobaqalar va sog'liqni saqlash.": {
        "uz": "Sport zallari, musobaqalar va sog'liqni saqlash.",
        "ru": "Спортзалы, соревнования и здоровье.",
        "en": "Gyms, competitions and health.",
        "kaa": "Sport zalları, jarıs hám sawlıq.",
    },
    "Kampus oshxonasi sifati, narx va tozalik.": {
        "uz": "Kampus oshxonasi sifati, narx va tozalik.",
        "ru": "Качество, цена и чистота кампусной столовой.",
        "en": "Campus cafeteria quality, price and cleanliness.",
        "kaa": "Kampus asxanası sapası, baha hám tazalıq.",
    },
}


def translate_text(text: str, force: bool = False, existing: dict | None = None) -> dict[str, str]:
    """Asl matnni 4 tilli lug'atga aylantiradi."""
    base = (text or "").strip()
    if not base:
        return ensure_i18n_bucket("", existing)

    if not force and isinstance(existing, dict):
        filled = {k: v for k, v in existing.items() if k in LOCALES and str(v).strip()}
        if len(filled) >= 4:
            return {k: str(filled[k]) for k in LOCALES if k in filled}

    # Faqat aniq moslik — qisman match sarlavhani buzmasin
    for table in (PHRASES, SURVEY_TITLES, SURVEY_DESCS, NEWS_TITLES, NEWS_SUMMARIES):
        if base in table:
            return dict(table[base])
        bare = base.replace("[DEMO] ", "").strip()
        key_demo = f"[DEMO] {bare}"
        if key_demo in table:
            return dict(table[key_demo])
        if bare in table:
            return dict(table[bare])

    # fallback: barcha tillarga o'zbekcha (struktura to'liq; keyinroq qo'lda to'ldiriladi)
    return ensure_i18n_bucket(base, existing)


def translate_options(options: list, force: bool = False) -> list:
    if not options:
        return []
    out = []
    for opt in options:
        if not isinstance(opt, dict):
            continue
        item = dict(opt)
        text = (item.get("text") or "").strip()
        prev = item.get("text_i18n") if isinstance(item.get("text_i18n"), dict) else {}
        item["text_i18n"] = translate_text(text, force=force, existing=prev)
        # bazani uz saqlaymiz
        item["text"] = item["text_i18n"].get("uz") or text
        out.append(item)
    return out


class Command(BaseCommand):
    help = "DB kontentini uz/ru/en/kaa i18n bilan to'ldirish"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Mavjud tarjimalarni ham qayta yozish",
        )

    def handle(self, *args, **options):
        force = options["force"]
        n_news = self._news(force)
        n_surv = self._surveys(force)
        n_q = self._questions(force)
        n_off = self._officials(force)
        n_risk = self._risks(force)
        self.stdout.write(
            self.style.SUCCESS(
                f"i18n filled: news={n_news} surveys={n_surv} "
                f"questions={n_q} officials={n_off} risks={n_risk}"
            )
        )

    def _news(self, force: bool) -> int:
        from apps.news.models import NewsArticle

        n = 0
        for obj in NewsArticle.objects.all().iterator():
            changed = False
            for field in ("title", "summary", "body", "meta_title", "meta_description"):
                base = getattr(obj, field) or ""
                key = f"{field}_i18n"
                prev = getattr(obj, key) or {}
                new = translate_text(base, force=force, existing=prev)
                # yangilik body: agar tarjima yo'q bo'lsa, barcha tillarga base
                if field == "body" and base:
                    new = ensure_i18n_bucket(base, None if force else prev)
                    # title-based short note in en if only uz
                    if force or not (isinstance(prev, dict) and prev.get("en")):
                        title_tr = translate_text(obj.title, force=True)
                        for loc in LOCALES:
                            if loc == "uz":
                                new[loc] = base
                            elif not (prev or {}).get(loc) or force:
                                # keep base HTML but prefix language note is messy;
                                # use full base for all until manual translation
                                new[loc] = base
                if new != (prev or {}):
                    setattr(obj, key, new)
                    changed = True
            if changed:
                obj.save(
                    update_fields=[
                        "title_i18n",
                        "summary_i18n",
                        "body_i18n",
                        "meta_title_i18n",
                        "meta_description_i18n",
                    ]
                )
                n += 1
        return n

    def _surveys(self, force: bool) -> int:
        from apps.surveys.models import Survey

        n = 0
        for obj in Survey.objects.all().iterator():
            ti = translate_text(obj.title, force=force, existing=obj.title_i18n)
            di = translate_text(
                obj.description, force=force, existing=obj.description_i18n
            )
            if ti != (obj.title_i18n or {}) or di != (obj.description_i18n or {}):
                obj.title_i18n = ti
                obj.description_i18n = di
                obj.save(update_fields=["title_i18n", "description_i18n"])
                n += 1
        return n

    def _questions(self, force: bool) -> int:
        from apps.surveys.models import SurveyQuestion

        n = 0
        for obj in SurveyQuestion.objects.all().iterator():
            ti = translate_text(obj.text, force=force, existing=obj.text_i18n)
            hi = translate_text(
                obj.help_text, force=force, existing=obj.help_text_i18n
            )
            opts = translate_options(obj.options or [], force=force)
            if (
                ti != (obj.text_i18n or {})
                or hi != (obj.help_text_i18n or {})
                or opts != (obj.options or [])
            ):
                obj.text_i18n = ti
                obj.help_text_i18n = hi
                obj.options = opts
                obj.save(update_fields=["text_i18n", "help_text_i18n", "options"])
                n += 1
        return n

    def _officials(self, force: bool) -> int:
        from apps.office.models import ResponsiblePerson

        fields = (
            "position",
            "department",
            "academic_title",
            "reception_hours",
            "biography",
            "responsibilities",
            "extra_info",
        )
        n = 0
        for obj in ResponsiblePerson.objects.all().iterator():
            changed = False
            for field in fields:
                base = getattr(obj, field) or ""
                key = f"{field}_i18n"
                prev = getattr(obj, key) or {}
                new = translate_text(base, force=force, existing=prev)
                if new != (prev or {}):
                    setattr(obj, key, new)
                    changed = True
            if changed:
                obj.save(update_fields=[f"{f}_i18n" for f in fields])
                n += 1
        return n

    def _risks(self, force: bool) -> int:
        from apps.compliance.models import ComplianceRisk

        n = 0
        for obj in ComplianceRisk.objects.all().iterator():
            ti = translate_text(obj.title, force=force, existing=obj.title_i18n)
            di = translate_text(
                obj.description, force=force, existing=obj.description_i18n
            )
            if ti != (obj.title_i18n or {}) or di != (obj.description_i18n or {}):
                obj.title_i18n = ti
                obj.description_i18n = di
                obj.save(update_fields=["title_i18n", "description_i18n"])
                n += 1
        return n
