# Xavfsizlik (security hardening)

## 1. So‘rovnoma race / double-submit

- `@transaction.atomic` + `select_for_update()`
- Conditional `UPDATE ... WHERE status=STARTED AND token_used=False`
- Unique `participant_key` constraint

## 2. K-anonimlik

- `display_min = max(5, min_n_for_breakdown)` anonim rejimda
- Open rejimda `display_min = max(1, min_n_for_breakdown)`
- n < k kesimlar yashiriladi (`_other`)

## 3. JWT storage (XSS)

- Access/refresh: **httpOnly** cookie (`bildir_access`, `bildir_refresh`)
- Frontend **localStorage da token saqlamaydi** (faqat user profili)
- Cookie SameSite=Lax; productionda Secure=True (DEBUG=False)

## 4. Logout revokatsiya

- Refresh: SimpleJWT blacklist
- Access: **jti denylist** (Redis/cache, TTL = token exp)
- Cookie tozalanadi

Access default muddati: **15 daqiqa** (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`).

## 5. Fayl yuklash

- Extension + **magic bytes**
- Rasm: Pillow re-encode (polyglot/script tozalash)
- PDF: signature + asosiy JS/embedded filter
- Serve: `X-Content-Type-Options: nosniff`, user upload `Content-Disposition: attachment`

## 6. Login / SSO rate limiting (brute-force)

| Scope | Default | Qayerda |
|-------|---------|---------|
| `login` | 10/min | IP — email + HEMIS login/tutor |
| `login_account` | 20/hour | email yoki HEMIS login |
| `forgot_password` | 5/hour | IP |
| `token_refresh` | 30/min | token/IP |
| `anon` | 120/min | global |
| `user` | 300/min | global |

Env orqali: `THROTTLE_LOGIN`, `THROTTLE_LOGIN_ACCOUNT`, …

## 7. CORS

- Production: explicit allowlist, `CORS_ALLOW_ALL_ORIGINS=False`
- `*` va noto‘g‘ri sxemalar `utils.cors_security.sanitize_cors_origins` bilan olib tashlanadi
- `CORS_ALLOW_CREDENTIALS=True` bilan wildcard taqiqlangan

## 8. JWT blacklist tozalash (token bloat)

```bash
python manage.py flushexpiredtokens
# yoki
python manage.py security_maintenance
```

- **entrypoint**: har start da flush
- **docker compose `maintenance` servisi**: har 24 soatda `security_maintenance`

## Tekshiruv

```bash
docker compose exec backend python manage.py test apps.surveys.tests utils.tests_security_hardening -v1
```
