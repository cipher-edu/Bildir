# Bildir — NDU Komplayens nazorat platformasi

[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](./DOCKER.md)
[![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white)](./backend)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](./frontend)
[![i18n](https://img.shields.io/badge/i18n-uz%20%7C%20ru%20%7C%20en%20%7C%20kaa-informational)](#ko‘p-tillilik)

**Bildir** — Navoiy davlat universiteti korrupsiyaga qarshi kurash **«Komplayens nazorat»** bo‘limi uchun raqamli platforma:

- Anonim / ochiq **so‘rovnomalar** (AES-GCM, HMAC)
- **Murojaat** markazi (72 soat SLA, fayl biriktirish)
- **Yangiliklar** va e’lonlar
- **Rahbariyat** ochiq katalogi
- **Risk reestri** va **anonim xabar** (email/Telegram talab qilinmaydi)
- **HEMIS SSO** (talaba / xodim)
- Admin **KPI**, audit, katalog, natijalar
- **Ko‘p tillilik:** o‘zbek, rus, ingliz, qoraqalpoq

> Repository: [github.com/cipher-edu/Bildir](https://github.com/cipher-edu/Bildir)

---

## Tezkor start (Docker)

```bash
git clone https://github.com/cipher-edu/Bildir.git
cd Bildir

cp .env.example .env
# SECRET_KEY, parollar va (ixtiyoriy) HEMIS tokenlarni to'ldiring

docker compose up -d --build

# Migratsiya odatda entrypoint orqali; kerak bo'lsa:
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py fill_content_i18n --force
docker compose exec backend python manage.py seed_demo_news
docker compose exec backend python manage.py seed_demo_officials
docker compose exec backend python manage.py seed_demo_compliance
```

| Servis    | URL |
|-----------|-----|
| Frontend  | http://localhost:3000 |
| Backend   | http://localhost:8000 |
| API docs  | http://localhost:8000/api/v1/docs/ |
| Health    | http://localhost:8000/api/v1/health/ |

**Superadmin** (`.env` / entrypoint):

| | |
|--|--|
| Email | `SUPERUSER_EMAIL` (default `superadmin@ndu.uz`) |
| Parol | `SUPERUSER_PASSWORD` |

Batafsil Docker: **[DOCKER.md](./DOCKER.md)**

---

## Arxitektura

```
┌─────────────┐     /api/v1/*      ┌──────────────┐
│  Next.js 15 │ ─────────────────► │ Django + DRF │
│  (frontend) │     /media/*       │  (backend)   │
└─────────────┘                    └──────┬───────┘
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                         PostgreSQL     Redis      Media/FS
```

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 15, React, TanStack Query, Zustand, Tailwind, TipTap |
| Backend | Django 5, DRF, SimpleJWT, django-filter, Spectacular |
| Auth | HEMIS OAuth / SSO, email login, rollar |
| DB | PostgreSQL 16 (Docker), Redis 7 |
| i18n | UI lug‘atlar + model `*_i18n` JSON (`uz`/`ru`/`en`/`kaa`) |

### Backend domenlar (`backend/apps/`)

| App | Vazifa |
|-----|--------|
| `users` | Foydalanuvchi, JWT, HEMIS, audit |
| `core` | Universitet katalogi, HEMIS sync |
| `surveys` | So‘rovnoma, savollar, ishtirok, eksport |
| `office` | Rahbariyat, murojaatlar, SLA |
| `news` | Yangiliklar moduli |
| `compliance` | Risk reestri, whistleblowing, KPI |

### Frontend marshrutlar

| Yo‘l | Tavsif |
|------|--------|
| `/` | Landing |
| `/news`, `/news/[slug]` | Yangiliklar |
| `/login` | Kirish |
| `/home`, `/surveys`, `/appeals` | Kabinet |
| `/s/[uuid]` | So‘rovnoma to‘ldirish |
| `/risk`, `/whistle` | Risk / anonim xabar |
| `/admin/*` | Admin panel |
| `/privacy` | Maxfiylik siyosati |

---

## Ko‘p tillilik

- **UI:** `frontend/src/i18n/locales/{uz,ru,en,kaa}.ts` + `LanguageSwitcher`
- **API:** so‘rovda `X-Locale` yoki `?lang=en`
- **Kontent:** `title_i18n`, `body_i18n`, savol `text_i18n`, lavozim `position_i18n` va h.k.
- **To‘ldirish:**

```bash
docker compose exec backend python manage.py fill_content_i18n --force
```

Admin yangiliklar formasida **4 til tab** (uz/ru/en/kaa) mavjud.

---

## Asosiy imkoniyatlar

1. **So‘rovnomalar** — anonim/ochiq, QR, progress, shifrlangan javoblar  
2. **Murojaat** — matn + fayl (10 MB), 72 soat SLA  
3. **Yangiliklar** — rich-text, muqova, kategoriya, featured/pin  
4. **Rahbariyat** — landing va admin katalog  
5. **Risk reestri** — ochiq GET (yopilmagan), admin CRUD  
6. **Anonim xabar** — tracking code, email/Telegram **yo‘q**  
7. **KPI dashboard** — murojaat, so‘rovnoma, yangilik, risk, whistle  
8. **HEMIS** — katalog sinxron, SSO  

---

## Lokal ishlab chiqish (ixtiyoriy)

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Frontend `NEXT_PUBLIC_API_URL=/api/v1` orqali same-origin proxy ishlatadi.

---

## Muhim boshqaruv buyruqlari

```bash
docker compose exec backend python manage.py seed_demo_news
docker compose exec backend python manage.py seed_demo_officials
docker compose exec backend python manage.py seed_demo_surveys
docker compose exec backend python manage.py seed_demo_compliance
docker compose exec backend python manage.py fill_content_i18n --force
docker compose exec backend python manage.py sync_hemis_catalog --university-code NDU
docker compose exec backend python manage.py ensure_superuser
```

---

## Xavfsizlik eslatmalari

- `.env` **commit qilinmaydi** — faqat `.env.example`
- Productionda `DJANGO_SECRET_KEY`, `JWT_SECRET_KEY`, DB parollarini almashtiring
- `DEBUG=False` va ruxsat etilgan hostlarni sozlang
- HEMIS tokenlarini ochiq repoga yozmang
- Anonim so‘rovnoma / whistle — identifikatsiya talab qilinmaydi

---

## Loyiha tuzilishi

```
Bildir/
├── backend/                 # Django API
│   ├── apps/
│   ├── config/
│   ├── utils/i18n_fields.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Next.js
│   ├── src/app/
│   ├── src/i18n/
│   ├── src/components/
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── DOCKER.md
├── CONTRIBUTING.md
└── README.md
```

---

## Litsenziya va mualliflik

NDU Komplayens nazorat bo‘limi / **cipher-edu** loyihasi.

Manzil (landing): **Navoiy, Abu Ali ibn Sino ko‘chasi, 45**

---

## Hissa qo‘shish

Qarang: **[CONTRIBUTING.md](./CONTRIBUTING.md)**

Masalalar va PR: [github.com/cipher-edu/Bildir/issues](https://github.com/cipher-edu/Bildir/issues)
