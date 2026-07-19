"""
Demo mas'ul / rahbar shaxslar.

  python manage.py seed_demo_officials
  python manage.py seed_demo_officials --clear
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.office.models import ResponsiblePerson

# NDU uslubidagi demo rahbariyat
DEMO_OFFICIALS = [
    {
        "last_name": "Karimov",
        "first_name": "Azizbek",
        "middle_name": "Rustamovich",
        "position": "Rektor",
        "department": "Rektorat",
        "academic_title": "Professor, i.f.d.",
        "phone": "+998 71 200-00-01",
        "email": "rektor@ndu.uz",
        "office_room": "Bosh bino, 301-xona",
        "reception_hours": "Seshanba, Payshanba 14:00–16:00",
        "biography": (
            "Oliy ta'lim boshqaruvida 20 yildan ortiq tajriba. "
            "Xalqaro hamkorlik va ta'lim sifati bo'yicha bir qator loyihalar rahbari."
        ),
        "responsibilities": (
            "Universitet umumiy rahbarligi, strategik rivojlanish, "
            "xalqaro aloqalar va kengash ishini tashkil etish."
        ),
        "extra_info": "Qabul oldindan yozilish asosida.",
        "order": 1,
    },
    {
        "last_name": "Toshmatova",
        "first_name": "Dilnoza",
        "middle_name": "Bahodirovna",
        "position": "O'quv ishlari bo'yicha prorektor",
        "department": "O'quv boshqarmasi",
        "academic_title": "Dotsent, p.f.n.",
        "phone": "+998 71 200-00-12",
        "email": "prorektor.uquv@ndu.uz",
        "office_room": "Bosh bino, 215-xona",
        "reception_hours": "Dushanba–Juma 10:00–12:00",
        "biography": (
            "Pedagogika va o'quv dasturlari islohoti sohasida faol. "
            "Kredit-modul tizimini joriy etish ishlarida ishtirok etgan."
        ),
        "responsibilities": (
            "O'quv rejalari, dars jadvali, baholash tizimi, "
            "o'qituvchilar malakasini oshirish nazorati."
        ),
        "extra_info": "Talabalar murojaati: dars sifati, jadval, o'tish.",
        "order": 2,
    },
    {
        "last_name": "Rahmonov",
        "first_name": "Sardor",
        "middle_name": "Alisherovich",
        "position": "Yoshlar masalalari va ma'naviy-ma'rifiy ishlar bo'yicha prorektor",
        "department": "Yoshlar markazi",
        "academic_title": "PhD",
        "phone": "+998 71 200-00-18",
        "email": "prorektor.yoshlar@ndu.uz",
        "office_room": "2-bino, 110-xona",
        "reception_hours": "Chorshanba 15:00–17:00",
        "biography": (
            "Talabalar hayoti, klublar va ijtimoiy loyihalar bo'yicha tajribali mutaxassis."
        ),
        "responsibilities": (
            "Talabalar o'zini o'zi boshqarish, madaniy tadbirlar, "
            "stipendiya va ijtimoiy yordam masalalari."
        ),
        "extra_info": "TSS va klub rahbarlari uchun alohida qabul.",
        "order": 3,
    },
    {
        "last_name": "Usmonova",
        "first_name": "Malika",
        "middle_name": "Shuhratovna",
        "position": "Ilmiy ishlar va innovatsiyalar bo'yicha prorektor",
        "department": "Ilmiy boshqarma",
        "academic_title": "Professor, f.f.d.",
        "phone": "+998 71 200-00-22",
        "email": "prorektor.ilm@ndu.uz",
        "office_room": "Bosh bino, 220-xona",
        "reception_hours": "Seshanba 11:00–13:00",
        "biography": (
            "Ilmiy jurnallar va grantlar bo'yicha nufuzli tadqiqotchi. "
            "Yosh olimlar maktabi tashabbuskori."
        ),
        "responsibilities": (
            "Ilmiy tadqiqotlar, dissertatsiya kengashlari, innovatsiya markazi, "
            "patent va startap loyihalari."
        ),
        "extra_info": "Magistratura/PhD masalalari uchun oldindan yoziling.",
        "order": 4,
    },
    {
        "last_name": "Nazarov",
        "first_name": "Bobur",
        "middle_name": "Karimovich",
        "position": "Moliya-iqtisodiyot ishlari bo'yicha prorektor",
        "department": "Moliya boshqarmasi",
        "academic_title": "Iqtisod fanlari nomzodi",
        "phone": "+998 71 200-00-30",
        "email": "prorektor.moliya@ndu.uz",
        "office_room": "Bosh bino, 105-xona",
        "reception_hours": "Payshanba 09:00–11:00",
        "biography": "Byudjet rejalashtirish va shaffof moliyaviy hisobot sohasida mutaxassis.",
        "responsibilities": (
            "Byudjet, to'lov-kontrakt, stipendiyalar, xaridlar va moliyaviy nazorat."
        ),
        "extra_info": "To'lov va kontrakt bo'yicha arizalar onlayn ham qabul qilinadi.",
        "order": 5,
    },
    {
        "last_name": "Saidova",
        "first_name": "Gulnora",
        "middle_name": "Akmalovna",
        "position": "Kadrlar bo'limi boshlig'i",
        "department": "Kadrlar bo'limi",
        "academic_title": "",
        "phone": "+998 71 200-00-41",
        "email": "kadr@ndu.uz",
        "office_room": "Bosh bino, 112-xona",
        "reception_hours": "Dushanba–Juma 09:00–17:00 (tushlik 13:00–14:00)",
        "biography": "Kadrlar hujjatlari va mehnat qonunchiligi bo'yicha 15 yillik tajriba.",
        "responsibilities": (
            "Ishga qabul, mehnat shartnomalari, ta'til, malaka oshirish hujjatlari."
        ),
        "extra_info": "Xodimlar murojaati uchun navbat tizimi mavjud.",
        "order": 6,
    },
    {
        "last_name": "Ismoilov",
        "first_name": "Jasur",
        "middle_name": "Farruxovich",
        "position": "Talabalar ishlari bo'limi boshlig'i",
        "department": "Talabalar ishlari bo'limi",
        "academic_title": "",
        "phone": "+998 71 200-00-55",
        "email": "talabalar@ndu.uz",
        "office_room": "2-bino, 205-xona",
        "reception_hours": "Har kuni 09:00–12:00, 14:00–17:00",
        "biography": "Talabalar bilan ishlash, TTJ va ijtimoiy himoya yo'nalishida faol.",
        "responsibilities": (
            "Talaba guvohnomasi, akademik ma'lumotnoma, ijtimoiy yordam, "
            "intizom va murojaatlar."
        ),
        "extra_info": "Shoshilinch masalalar uchun 55-ichki raqam.",
        "order": 7,
    },
    {
        "last_name": "Xolmatova",
        "first_name": "Sevara",
        "middle_name": "Dilshodovna",
        "position": "Axborot texnologiyalari markazi rahbari",
        "department": "IT markaz / HEMIS",
        "academic_title": "PhD (informatika)",
        "phone": "+998 71 200-00-77",
        "email": "it@ndu.uz",
        "office_room": "IT-bino, 1-qavat",
        "reception_hours": "Dushanba–Juma 09:00–18:00",
        "biography": (
            "HEMIS, raqamli xizmatlar va tarmoq xavfsizligi bo'yicha mutaxassis."
        ),
        "responsibilities": (
            "HEMIS, Wi‑Fi, e-platforma, texnik yordam, foydalanuvchi hisoblari."
        ),
        "extra_info": "Texnik murojaat: it@ndu.uz yoki helpdesk.",
        "order": 8,
    },
    {
        "last_name": "Abdullayev",
        "first_name": "Kamol",
        "middle_name": "Otabekovich",
        "position": "Kutubxona direktori",
        "department": "Axborot-resurs markazi",
        "academic_title": "",
        "phone": "+998 71 200-00-88",
        "email": "kutubxona@ndu.uz",
        "office_room": "Kutubxona binosi, 2-qavat",
        "reception_hours": "Dushanba–Shanba 08:30–18:00",
        "biography": "Elektron resurslar va ochiq ilm tashabbuslarini rivojlantiradi.",
        "responsibilities": (
            "Fond, elektron baza, o'qish zallari, kitob berish qoidalari."
        ),
        "extra_info": "Tungi o'qish zal: imtihon davrida 22:00 gacha.",
        "order": 9,
    },
    {
        "last_name": "Mirzayeva",
        "first_name": "Nilufar",
        "middle_name": "G'ayratovna",
        "position": "Karyera markazi rahbari",
        "department": "Karyera va amaliyot markazi",
        "academic_title": "",
        "phone": "+998 71 200-00-95",
        "email": "karyera@ndu.uz",
        "office_room": "3-bino, 40-xona",
        "reception_hours": "Chorshanba, Juma 10:00–16:00",
        "biography": "Ish beruvchilar bilan hamkorlik va bitiruvchilar bandligi bo'yicha ishlaydi.",
        "responsibilities": (
            "Amaliyot joylash, ish yarmarkasi, rezyume maslahati, mentorlik."
        ),
        "extra_info": "Har oy ish yarmarkasi e'lonlari Telegram kanalida.",
        "order": 10,
    },
]


class Command(BaseCommand):
    help = "Demo mas'ul / rahbar shaxslarni yaratadi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Mavjud demo yozuvlarni o'chirib qayta to'ldirish",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            # Faqat demo email domain bo'yicha tozalash
            n, _ = ResponsiblePerson.objects.filter(email__endswith="@ndu.uz").delete()
            self.stdout.write(f"Tozalandi: {n}")

        created = 0
        updated = 0
        for row in DEMO_OFFICIALS:
            obj, was_created = ResponsiblePerson.objects.update_or_create(
                email=row["email"],
                defaults={
                    **row,
                    "is_active": True,
                    "is_public": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  + {obj}"))
            else:
                updated += 1
                self.stdout.write(f"  ~ {obj}")

        total = ResponsiblePerson.objects.filter(is_active=True).count()
        self.stdout.write(self.style.SUCCESS(
            f"\nYakun: +{created} yangi, ~{updated} yangilandi. Faol jami: {total}"
        ))
