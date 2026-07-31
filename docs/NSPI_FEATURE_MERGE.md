# Survey NSPI funksiyalari → Bildir (:3000)

## Xulosa
Bildir frontend saqlangan. Survey NSPI dagi kerakli imkoniyatlar tekshirildi va yetishmaganlari qo‘shildi.

| Funksiya | Holat |
|----------|--------|
| HEMIS talaba/hodim login (parol + OAuth) | ✅ Allaqachon bor (`apps/users`) |
| So‘rovnomalar + statistika + QR | ✅ Allaqachon bor (`apps/surveys`) |
| Mas’ulga xabar + attachment | ✅ Appeals + endi **mas’ul tanlash** |
| Murojaat QR + unique code | ✅ **Yangi** (Survey NSPI uslubi) |
| Django Jazzmin | ✅ Allaqachon bor |
| Celery: QR + profil sync task | ✅ **Yangi** worker + tasks |
| NSPI HEMIS integratsiya | ✅ `student.nspi.uz` / `hemis.nspi.uz` |

## Yangi o‘zgarishlar
- `Appeal.responsible_person`, `unique_code`, `qr_code_image`
- `apps/office/tasks.py`, `services.py`, Celery worker in compose
- Frontend `/appeals`: mas’ul select, ID/QR ko‘rinishi
- Survey NSPI: eski `*_old/*_new` HTML shablonlar o‘chirildi

## URL
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Admin (Jazzmin): http://localhost:8000/admin/
