# API qisqa ma’lumotnoma

Base: `/api/v1/`

Hujjatlar (Swagger): `/api/v1/docs/`  
Schema: `/api/v1/schema/`  
Health: `/api/v1/health/`

## Autentifikatsiya

- `POST /auth/login/`
- `POST /auth/login/hemis/`
- `POST /auth/token/refresh/`
- OAuth: `/auth/oauth/...`
- Header: `Authorization: Bearer <access>`

## Asosiy resurslar

| Prefiks | Tavsif |
|---------|--------|
| `/auth/` | Kirish, token, profil |
| `/catalog/` | Fakultet, yo‘nalish, guruh |
| `/surveys/` | So‘rovnomalar, ishtirok, natijalar |
| `/office/persons/` | Rahbariyat (public) |
| `/office/appeals/` | Murojaatlar |
| `/news/` | Yangiliklar |
| `/compliance/risks/` | Risk reestri |
| `/compliance/whistle/` | Anonim xabar (POST ochiq) |
| `/compliance/kpi/` | Admin KPI |

## Locale

```
GET /api/v1/news/?lang=en
X-Locale: ru
```

Javobda `title`, `summary`, `body` tanlangan tilda; `*_i18n` to‘liq lug‘at admin tahrir uchun.
