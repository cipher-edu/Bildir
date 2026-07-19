# Docker boshqaruvi — Bildir

Stack: **PostgreSQL 16** + **Redis 7** + **Django (Gunicorn)** + **Next.js 15**

Loyiha: [Bildir](https://github.com/cipher-edu/Bildir) · asosiy README: [../README.md](./README.md)

## Tezkor start

```bash
# 1) .env (bir marta)
cp .env.example .env
# HEMIS_BACKEND_TOKEN va parollarni to'ldiring

# 2) Build + ishga tushirish
docker compose up -d --build

# 3) Holat
docker compose ps
docker compose logs -f backend
```

| Servis    | URL |
|-----------|-----|
| Frontend  | http://localhost:3000 |
| Backend   | http://localhost:8000 |
| API docs  | http://localhost:8000/api/v1/docs/ |
| Health    | http://localhost:8000/api/v1/health/ |
| Postgres  | localhost:5432 (`auth` / `.env` dagi parol) |

**Superadmin** (entrypoint avtomatik yaratadi):

- Email: `SUPERUSER_EMAIL` (default `superadmin@ndu.uz`)
- Parol: `SUPERUSER_PASSWORD` (default `SuperAdmin2026!`)

## Foydali buyruqlar

```bash
# Loglar
docker compose logs -f
docker compose logs -f backend frontend db

# To'xtatish / qayta ishga tushirish
docker compose stop
docker compose start
docker compose restart backend

# To'liq o'chirish (volume saqlanadi)
docker compose down

# DB ham o'chirish (EHTIYOT — ma'lumot yo'qoladi)
docker compose down -v

# Django manage.py
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py ensure_superuser
docker compose exec backend python manage.py sync_hemis_catalog
docker compose exec backend python manage.py flush_demo_data --all-demo
docker compose exec backend python manage.py fill_content_i18n --force
docker compose exec backend python manage.py seed_demo_news
docker compose exec backend python manage.py seed_demo_officials
docker compose exec backend python manage.py seed_demo_compliance
docker compose exec backend python manage.py shell

# Postgres shell
docker compose exec db psql -U auth -d auth_starter
```

## HEMIS sinxronlash (Docker ichida)

```bash
docker compose exec backend python manage.py sync_hemis_catalog \
  --university-code NDU \
  --university-name "Navoiy davlat universiteti"
```

`.env` da `HEMIS_MOCK_MODE=False` va `HEMIS_BACKEND_TOKEN=...` bo'lishi shart.

## Dev (hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Backend: `runserver`, frontend: `next dev` (kod volume orqali).

## Production eslatmalar

- `DEBUG=False`, kuchli `DJANGO_SECRET_KEY` / `POSTGRES_PASSWORD`
- `DJANGO_SETTINGS_MODULE=config.settings.production`
- HTTPS reverse-proxy orqasida: `SECURE_SSL_REDIRECT=True`, cookie secure flagnar
- Volume backup: `postgres_data`, `backend_media`

## Arxitektura

```
browser → frontend:3000
       → backend:8000/api  → postgres:5432
                           → redis:6379
```

Ma'lumotlar bazasi **faqat PostgreSQL** (Docker da). SQLite faqat `POSTGRES_HOST` bo'sh bo'lganda lokal dev uchun.
