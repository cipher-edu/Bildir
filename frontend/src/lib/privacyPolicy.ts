/**
 * So'rovnomalar maxfiylik siyosati va axborot xavfsizligi qoidalari.
 * Versiya yangilanganda SURVEY_PRIVACY_VERSION ni oshiring.
 */

export const SURVEY_PRIVACY_VERSION = "1.0";
export const SURVEY_PRIVACY_EFFECTIVE = "2026-07-19";

export type PrivacyMode = "anonymous" | "open";

export interface ConsentItem {
  id: string;
  required: boolean;
  label: string;
  detail?: string;
}

/** So'rovnoma oldidan majburiy roziliklar */
export function getSurveyConsentItems(mode: PrivacyMode): ConsentItem[] {
  const base: ConsentItem[] = [
    {
      id: "privacy_read",
      required: true,
      label: "Maxfiylik siyosatini o‘qib chiqdim va roziman",
      detail: "To‘liq matn quyida yoki «Maxfiylik siyosati» sahifasida.",
    },
    {
      id: "security_rules",
      required: true,
      label: "Axborot xavfsizligi qoidalariga rioya qilishga majburman",
      detail:
        "Javoblarni boshqalar nomidan yubormaslik, tizimni buzishga urinmaslik, hisob ma’lumotlarini ulashmaslik.",
    },
    {
      id: "voluntary",
      required: true,
      label: "Ishtirok ixtiyoriy ekanini tushunaman va o‘z xohishim bilan qatnashaman",
    },
  ];

  if (mode === "anonymous") {
    base.push({
      id: "anon_ack",
      required: true,
      label:
        "Anonim rejim: ishtirokim qayd etilishini, lekin javoblarim shaxsimga bog‘lanmasligini tushunaman",
    });
  } else {
    base.push({
      id: "open_ack",
      required: true,
      label:
        "Ochiq rejim: javoblarim foydalanuvchi profilim bilan bog‘lanishi mumkinligiga roziman",
    });
  }

  return base;
}

/** To‘liq siyosat bo‘limlari (sahifa va so‘rovnoma ichida) */
export const PRIVACY_SECTIONS: {
  id: string;
  title: string;
  body: string[];
}[] = [
  {
    id: "purpose",
    title: "1. Maqsad",
    body: [
      "Ushbu Maxfiylik siyosati «Bildir» platformasi (Navoiy davlat universiteti, Korrupsiyaga qarshi kurash «Komplayens nazorat» tizimini boshqarish bo‘limi) orqali yig‘iladigan ma’lumotlarning qanday ishlatilishi, saqlanishi va himoya qilinishini tushuntiradi.",
      "So‘rovnomalar o‘quv jarayoni sifati, xizmatlar va tashkiliy jarayonlarni yaxshilash maqsadida o‘tkaziladi.",
    ],
  },
  {
    id: "controller",
    title: "2. Ma’lumotlar operatori",
    body: [
      "Ma’lumotlar operatori — Navoiy davlat universiteti (NDU) va uning vakolatli tizim administratorlari.",
      "Texnik qayta ishlash platforma serverlarida amalga oshiriladi; kirish faqat ruxsat etilgan xodimlar (admin, audit) uchun cheklangan.",
    ],
  },
  {
    id: "modes",
    title: "3. Maxfiylik rejimlari",
    body: [
      "Anonim rejim: tizim ishtirok etganingizni (kim topshirganini) qayd etishi mumkin, lekin konkret javoblaringiz foydalanuvchi identifikatoringizga bog‘lanmaydi. Javoblar shifrlangan va muhrlangan holda saqlanadi.",
      "Ochiq rejim: javoblaringiz profilingiz (masalan, email yoki ID) bilan bog‘lanishi mumkin. Bu rejimda individual javoblarni ko‘rish faqat maxsus ruxsatga ega administratorlarga ochiq bo‘lishi mumkin.",
      "Rejim so‘rovnoma nashr qilinganda belgilanadi va keyin o‘zgartirilmaydi.",
    ],
  },
  {
    id: "data",
    title: "4. Qanday ma’lumotlar yig‘iladi",
    body: [
      "Hisob: autentifikatsiya uchun identifikator, rol, tashkiliy bog‘lanishlar (fakultet, guruh, kurs — agar mavjud bo‘lsa).",
      "Ishtirok: so‘rovnomaga kirish vaqti, topshirish holati (boshlangan / topshirgan).",
      "Javoblar: savollarga bergan javoblaringiz. Anonim rejimda ular shaxsga bog‘lanmagan holda saqlanadi.",
      "Texnik meta: xavfsizlik va ishlash uchun minimal server jurnallari (masalan, so‘rov vaqti, xato kodlari) — maxsus tahlil uchun emas.",
    ],
  },
  {
    id: "security",
    title: "5. Axborot xavfsizligi choralari",
    body: [
      "Javoblar saqlashda shifrlanadi (at-rest encryption).",
      "Muhrlash (hash + imzo) orqali o‘zgartirishga qarshi himoya: muhrlangan yozuv keyin tahrirlanmaydi.",
      "Bir foydalanuvchi — bir ishtirok: qayta ovoz berish cheklanadi.",
      "Kirish JWT autentifikatsiya va rol asosida nazorat qilinadi.",
      "Statistika kesimlarida k-anonimlik (minimal n) qo‘llanilishi mumkin — kichik guruhlar ochilmasligi uchun.",
    ],
  },
  {
    id: "user_rules",
    title: "6. Foydalanuvchi majburiyatlari",
    body: [
      "Faqat o‘z hisobingiz orqali ishtirok eting; boshqa shaxs nomidan javob yubormang.",
      "Login va parolni boshqalarga bermang, seansni ochiq qurilmalarda qoldirmang.",
      "Tizimga ruxsatsiz kirish, skanerlash, ekspluatatsiya yoki xizmatni buzishga urinish taqiqlanadi.",
      "So‘rovnoma matnini ruxsatsiz nusxalash va tashqi kanallarga tarqatish taqiqlanishi mumkin (ichki foydalanish).",
      "Haqiqatga yaqin, hurmatli va haqoratsiz javob berish tavsiya etiladi.",
    ],
  },
  {
    id: "retention",
    title: "7. Saqlash muddati va huquqlar",
    body: [
      "Ma’lumotlar tahlil va hisobot maqsadida zarur muddat davomida saqlanadi, keyin arxivlanishi yoki o‘chirilishi mumkin.",
      "Anonim rejimda individual javoblarni «o‘chirish» so‘rovi texnik jihatdan shaxsga bog‘liq bo‘lmagani sababli cheklangan bo‘lishi mumkin.",
      "Ochiq rejimda qonuniy asosda ma’lumotlaringiz bo‘yicha so‘rov yuborishingiz mumkin — operator belgilangan tartibda ko‘rib chiqadi.",
      "Ishtirok ixtiyoriy: boshlashdan oldin rozilik bermasangiz, so‘rovnoma ochilmaydi.",
    ],
  },
  {
    id: "cookies",
    title: "8. Sessiyalar va tokenlar",
    body: [
      "Tizim ishlashi uchun autentifikatsiya tokenlari (masalan, brauzer xotirasida) ishlatilishi mumkin.",
      "Ular faqat sizni tizimda tanish va xavfsiz so‘rovlar uchun kerak; reklama maqsadida uchinchi tomonlarga sotilmaydi.",
    ],
  },
  {
    id: "changes",
    title: "9. O‘zgarishlar",
    body: [
      `Ushbu siyosat versiyasi: ${SURVEY_PRIVACY_VERSION} (kuchga kirgan: ${SURVEY_PRIVACY_EFFECTIVE}).`,
      "Yangilanishlar platformada e’lon qilinadi. Muhim o‘zgarishlarda so‘rovnoma oldidan qayta rozilik so‘ralishi mumkin.",
    ],
  },
  {
    id: "contact",
    title: "10. Bog‘lanish",
    body: [
      "Maxfiylik yoki xavfsizlik bo‘yicha savollar uchun universitet IT / axborot xavfsizligi bo‘limi yoki tizim administratoriga murojaat qiling.",
      "Shubhali faoliyat yoki ma’lumot sizishi taxmini haqida darhol xabar bering.",
    ],
  },
];

/** So‘rovnoma intro uchun qisqa xulosa (3–5 band) */
export function getSurveyPrivacySummary(mode: PrivacyMode): string[] {
  const common = [
    "Ishtirok ixtiyoriy; rozilik berganingizdan keyin boshlanadi.",
    "Javoblar himoyalangan kanal orqali yuboriladi va saqlashda shifrlanadi.",
    "Bir hisob bilan bir so‘rovnomaga bir marta topshirish mumkin.",
  ];
  if (mode === "anonymous") {
    return [
      ...common,
      "Anonim rejim: kim ishtirok etgani ko‘rinishi mumkin, nima deb javob berganingiz shaxsga bog‘lanmaydi.",
      "Boshqa shaxs nomidan yoki tizimni buzishga urinish taqiqlanadi.",
    ];
  }
  return [
    ...common,
    "Ochiq rejim: javoblaringiz profilingiz bilan bog‘lanishi mumkin.",
    "Boshqa shaxs nomidan yoki tizimni buzishga urinish taqiqlanadi.",
  ];
}
