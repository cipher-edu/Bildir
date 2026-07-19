# Surveys service (bounded context)

Mikroservis chegarasi: `apps.surveys` — auth (`users`) va katalog (`core`) ga faqat FK.

## Suhbat xulosasi

| Rejim | Kim ishtirok etgan | Nima javob bergan |
|-------|--------------------|-------------------|
| `open` | Ko‘rinadi | Javob ↔ user bog‘langan |
| `anonymous` | Ko‘rinadi (`SurveyParticipation`) | Javobda `respondent=NULL`, unlink |

- **1 odam = 1 ovoz** — `SurveyParticipation` + bir martalik token (faqat hash)
- **At-rest** — `answers_encrypted` (AES-GCM)
- **Butunlik** — `content_hash` + HMAC `signature`; muhrlangan yozuv UPDATE qilinmaydi
- **Statistika** — `stats_level` + `min_n_for_breakdown` (k-anonymity)
- **QR** — publish paytida `FRONTEND_URL/s/{uuid}`

## Admin ketma-ketlik

1. `POST /api/v1/surveys/` — draft yaratish (`privacy_mode`, `audience`, targeting)
2. `POST /api/v1/surveys/{id}/questions/` — savollar (7 tur)
3. `PATCH /api/v1/surveys/{id}/` — muddat, fakultet/guruh/kurs
4. `POST /api/v1/surveys/{id}/publish/` — UUID public + QR
5. `GET .../participations/` — kim topshirgan
6. `GET .../results/` — agregat (individual yo‘q anonymous da)
7. `GET .../responses/` — faqat **open**
8. `POST .../close/`

## Foydalanuvchi ketma-ketlik

1. `GET /api/v1/surveys/available/`
2. `GET /api/v1/surveys/{id}/take/`
3. `POST /api/v1/surveys/{id}/start/` → `token`
4. `POST /api/v1/surveys/{id}/submit/` `{ token, answers }`

## Savol turlari

`single` | `multiple` | `text` | `textarea` | `rating` | `nps` | `likert`

## Env (production)

```
SURVEY_ENCRYPTION_KEY=
SURVEY_HMAC_KEY=
SURVEY_TOKEN_KEY=
FRONTEND_URL=https://...
```
