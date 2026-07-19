# Hissa qo‘shish (Contributing)

Bildir ochiq ishlab chiqish rejimida. PR va issue larni xush ko‘ramiz.

## Boshlash

1. Repo ni fork / clone qiling  
2. `.env.example` → `.env`  
3. `docker compose up -d --build`  
4. O‘z branch ingizda ishlang: `feature/...` yoki `fix/...`

## Kod uslubi

- **Backend:** Django/DRF, aniq serializer/view, `utils/i18n_fields` orqali tarjima  
- **Frontend:** TypeScript, client komponentlarda `useI18n().t()`, hardcode matn kamaytirilsin  
- Yangi UI matn → `frontend/src/i18n/locales/{uz,ru,en,kaa}.ts` ga **4 tilda**  
- Yangi kontent maydoni → base + `*_i18n` JSON + serializer `pick_i18n`

## Commit

Aniq, qisqa xabarlar (masalan: `feat: news i18n fields`, `fix: media proxy`).

## PR oldidan

```bash
docker compose exec backend python manage.py test
cd frontend && npm run build
```

## Maxfiylik

Secret, token, `.env`, real foydalanuvchi ma’lumotlarini PR ga qo‘shmang.
