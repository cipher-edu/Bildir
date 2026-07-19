"""
Demo yangiliklar (15 ta).

  python manage.py seed_demo_news
  python manage.py seed_demo_news --clear
"""
from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.news.models import NewsArticle

DEMO_NEWS = [
    {
        "title": "Komplayens nazorat bo'limi 2026-yil rejasini e'lon qildi",
        "summary": "Halollik madaniyati, ochiqlik va raqamli monitoring — yilning ustuvor yo'nalishlari.",
        "category": "anti_corruption",
        "is_featured": True,
        "is_pinned": True,
        "days_ago": 1,
        "body": """
<p>Navoiy davlat universiteti <strong>Korrupsiyaga qarshi kurash «Komplayens nazorat» tizimini boshqarish bo'limi</strong>
2026-yil uchun asosiy ish rejasini e'lon qildi.</p>
<h2>Ustuvor yo'nalishlar</h2>
<ul>
<li>Anonim so'rovnomalar orqali jamoatchilik fikrini o'rganish</li>
<li>Murojaatlarni 72 soat SLA doirasida ko'rib chiqish</li>
<li>Rahbariyat ochiqligi va qabul soatlarini yangilash</li>
<li>Talaba va xodimlar uchun profilaktik seminarlar</li>
</ul>
<p>Barcha e'lonlar <em>Bildir</em> platformasida joylashtiriladi.</p>
""",
    },
    {
        "title": "Bildir platformasi orqali yangi anonim so'rovnoma boshlandi",
        "summary": "O'quv sifati va xizmat ko'rsatish bo'yicha anonim fikr-mulohaza yig'ilmoqda.",
        "category": "announcement",
        "is_featured": True,
        "is_pinned": False,
        "days_ago": 2,
        "body": """
<p>Universitet bo'ylab <strong>o'quv sifati</strong> bo'yicha anonim so'rovnoma ishga tushirildi.</p>
<h3>Qanday ishtirok etish mumkin?</h3>
<ol>
<li>Bildir tizimiga HEMIS SSO orqali kiring</li>
<li>«So'rovnomalar» bo'limidan faol so'rovnomani tanlang</li>
<li>Javoblaringiz shifrlangan holda saqlanadi — shaxs bog'lanmaydi</li>
</ol>
<p>So'rovnoma muddati: <strong>30 kun</strong>.</p>
""",
    },
    {
        "title": "Murojaat markazi: 72 soat ichida javob berish tartibi",
        "summary": "Foydalanuvchilar yozma murojaat va fayl biriktirib yuborishi mumkin.",
        "category": "regulation",
        "is_featured": False,
        "is_pinned": True,
        "days_ago": 3,
        "body": """
<p>Bo'lim murojaatlarni qabul qilish va javob berish tartibini yangiladi.</p>
<blockquote>Har bir murojaat 72 soat ichida ko'rib chiqiladi yoki jarayonda ekanligi haqida xabar beriladi.</blockquote>
<ul>
<li>Matn + PDF/JPG fayl (10 MB gacha)</li>
<li>Status: kutilmoqda → jarayonda → javob berildi</li>
<li>Admin javobi va fayl biriktirishi mumkin</li>
</ul>
""",
    },
    {
        "title": "Halollik kuni: ochiq muloqot sessiyasi o'tkazildi",
        "summary": "Talabalar va xodimlar bilan korrupsiyaga qarshi profilaktika mavzusida suhbat.",
        "category": "event",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 4,
        "body": """
<p>Universitet axborot resurslari markazida <strong>Halollik kuni</strong> doirasida ochiq muloqot o'tkazildi.</p>
<p>Ishtirokchilar murojaat kanallari, anonim so'rovnomalar va shaffoflik mezonlari haqida savollar berishdi.</p>
<h3>Natija</h3>
<p>Yig'ilgan takliflar komplayens rejasiga kiritiladi.</p>
""",
    },
    {
        "title": "HEMIS SSO orqali kirish: foydalanuvchilar uchun eslatma",
        "summary": "Talaba va xodimlar yagona davlat tizimi orqali xavfsiz autentifikatsiya qiladi.",
        "category": "general",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 5,
        "body": """
<p><strong>Bildir</strong> platformasiga kirish uchun HEMIS OAuth tavsiya etiladi.</p>
<ul>
<li>Parolni platformaga kiritmasdan xavfsiz kirish</li>
<li>Talaba va hodim portallari alohida</li>
<li>Sessiya himoyalangan JWT tokenlar bilan saqlanadi</li>
</ul>
<p>Muammo bo'lsa, bo'limga murojaat qiling.</p>
""",
    },
    {
        "title": "Rahbariyat ma'lumotlari landing sahifada yangilandi",
        "summary": "Kontakt, qabul soatlari va lavozim ma'lumotlari ochiq ko'rsatiladi.",
        "category": "announcement",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 6,
        "body": """
<p>Ochiqlik siyosati doirasida rahbariyat kartochkalari yangilandi.</p>
<p>Foydalanuvchilar bosh sahifadagi <em>Rahbariyat</em> bo'limida telefon, email, xona va qabul vaqtini ko'rishlari mumkin.</p>
""",
    },
    {
        "title": "Anonimlik va maxfiylik: AES-GCM va HMAC muhri",
        "summary": "So'rovnoma javoblari shifrlangan; shaxs va javob bog'lanmaydi.",
        "category": "anti_corruption",
        "is_featured": True,
        "is_pinned": False,
        "days_ago": 7,
        "body": """
<p>Bildir so'rovnomalarida maxfiylik texnik jihatdan ta'minlanadi.</p>
<ol>
<li><strong>AES-GCM</strong> — javoblar shifrlash</li>
<li><strong>HMAC</strong> — ma'lumotlar yaxlitligi muhri</li>
<li>Anonim rejimda identifikatorlar saqlanmaydi</li>
</ol>
<p>Admin faqat agregat natijalarni ko'radi.</p>
""",
    },
    {
        "title": "Fakultetlar kesimida tahlil dashboardi taqdim etildi",
        "summary": "Jonli KPI, line chart va Excel eksport imkoniyati.",
        "category": "general",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 8,
        "body": """
<p>Admin panelda so'rovnoma natijalari uchun yangi tahlil paneli ochildi.</p>
<ul>
<li>Fakultet, kurs, jins kesimlari</li>
<li>Kunlik ishtirok dinamikasi</li>
<li>Himoyalangan Excel eksport</li>
</ul>
""",
    },
    {
        "title": "QR kod orqali so'rovnoma tarqatish yo'riqnomasi",
        "summary": "Har bir so'rovnoma havola va QR bilan auditoriyaga ulashiladi.",
        "category": "announcement",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 9,
        "body": """
<p>So'rovnomani tezkor tarqatish uchun:</p>
<ol>
<li>Admin panelda so'rovnomani nashr qiling</li>
<li>QR kodni yuklab oling yoki havolani nusxalang</li>
<li>Telegram / WhatsApp orqali ulashing</li>
</ol>
<p>Mobil-first interfeys telefonlarda qulay ishlaydi.</p>
""",
    },
    {
        "title": "Korrupsiyaga qarshi kurash agentligi materiallari tavsiya etildi",
        "summary": "Rasmiy manbalar: anticorruption.uz, lex.uz, president.uz.",
        "category": "anti_corruption",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 10,
        "body": """
<p>Talaba va xodimlarga quyidagi rasmiy manbalar tavsiya etiladi:</p>
<ul>
<li>Korrupsiyaga qarshi kurash agentligi — anticorruption.uz</li>
<li>Qonunchilik — lex.uz</li>
<li>Prezident rasmiy portali — president.uz</li>
</ul>
<p>Landing sahifadagi «Halollik» bo'limida qisqa iqtiboslar joylashtirilgan.</p>
""",
    },
    {
        "title": "Yangi o'quv yili: komplayens bo'yicha onboarding sessiyasi",
        "summary": "Birinchi kurs talabalari uchun platforma va murojaat tartibi tushuntirildi.",
        "category": "event",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 11,
        "body": """
<p>Yangi talabalar uchun <strong>onboarding</strong> sessiyasi o'tkazildi.</p>
<p>Mavzular: Bildir kabineti, so'rovnomalar, murojaat yuborish, maxfiylik siyosati.</p>
""",
    },
    {
        "title": "Ichki tartib-qoidalar monitoringi kuchaytirildi",
        "summary": "Komplayens nazorat doirasida ichki talablar bajarilishi tekshiriladi.",
        "category": "regulation",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 12,
        "body": """
<p>Bo'lim ichki tartib-qoidalar va korrupsiyaga qarshi talablar bajarilishini monitoring qiladi.</p>
<blockquote>Maqsad — jarayonlarni shaffof va oldindan bashorat qilinadigan qilish.</blockquote>
""",
    },
    {
        "title": "Bildir mobil interfeysi yangilandi",
        "summary": "Animatsion tab bar va qulay navigatsiya mobil qurilmalarda ishga tushdi.",
        "category": "general",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 13,
        "body": """
<p>Landing sahifaning mobil versiyasida zamonaviy pastki menyu (tab bar) qo'shildi.</p>
<ul>
<li>Bosh, Yangiliklar, Imkoniyatlar, Rahbariyat</li>
<li>Tez kirish / kabinet tugmasi</li>
</ul>
""",
    },
    {
        "title": "Ochiq ma'lumotlar: bo'lim hisobotlari chop etiladi",
        "summary": "Choraklik agregat ko'rsatkichlar va tendensiyalar e'lon qilinadi.",
        "category": "announcement",
        "is_featured": False,
        "is_pinned": False,
        "days_ago": 14,
        "body": """
<p>Shaffoflikni oshirish maqsadida bo'lim choraklik hisobotlarni e'lon qilishni rejalashtirgan.</p>
<p>Hisobotlarda shaxsiy ma'lumotlar bo'lmaydi — faqat agregat natijalar.</p>
""",
    },
    {
        "title": "Seminar: «Etika va kasbiy mas'uliyat»",
        "summary": "Xodimlar uchun amaliy mashg'ulot — 20 iyul, 15:00.",
        "category": "event",
        "is_featured": True,
        "is_pinned": False,
        "days_ago": 15,
        "body": """
<p><strong>Sana:</strong> 20-iyul · <strong>Vaqt:</strong> 15:00 · <strong>Joy:</strong> Asosiy bino, konferens-zal</p>
<h2>Mavzu</h2>
<p>Kasbiy etika, manfaatlar to'qnashuvi va ichki xabar berish mexanizmlari.</p>
<p>Ro'yxatdan o'tish: bo'lim email orqali yoki Bildir murojaat bo'limi orqali.</p>
""",
    },
]


class Command(BaseCommand):
    help = "15 ta demo yangilik qo'shadi (Bildir / NDU Komplayens)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Mavjud demo yangiliklarni o'chirib, qayta yaratadi",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = NewsArticle.objects.filter(
                title__in=[d["title"] for d in DEMO_NEWS]
            ).delete()
            self.stdout.write(self.style.WARNING(f"O'chirildi: {deleted}"))

        now = timezone.now()
        created = 0
        skipped = 0

        for item in DEMO_NEWS:
            if NewsArticle.objects.filter(title=item["title"]).exists():
                skipped += 1
                continue

            days = item.get("days_ago", 1)
            published = now - timedelta(days=days, hours=days % 5)

            from utils.i18n_fields import ensure_i18n_bucket

            title = item["title"]
            summary = item.get("summary") or ""
            body = (item.get("body") or "").strip()
            NewsArticle.objects.create(
                title=title,
                title_i18n=ensure_i18n_bucket(title, None),
                summary=summary,
                summary_i18n=ensure_i18n_bucket(summary, None),
                body=body,
                body_i18n=ensure_i18n_bucket(body, None),
                category=item["category"],
                status=NewsArticle.Status.PUBLISHED,
                is_featured=item.get("is_featured", False),
                is_pinned=item.get("is_pinned", False),
                published_at=published,
                meta_title=title[:255],
                meta_description=summary[:320],
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo yangiliklar: yaratildi={created}, o'tkazib yuborildi={skipped}, jami={NewsArticle.objects.count()}"
            )
        )
