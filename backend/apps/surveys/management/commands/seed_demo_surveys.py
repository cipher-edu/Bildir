"""
Demo: 10 ta nashr qilingan so'rovnoma + savollar + natijalar.

  python manage.py seed_demo_surveys
  python manage.py seed_demo_surveys --count 10 --responses 150
  python manage.py seed_demo_surveys --skip-if-enough   # allaqachon 10+ demo bo'lsa o'tkazib yuborish
"""
from __future__ import annotations

import random
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.core.models import Faculty, StudyGroup
from apps.surveys import crypto
from apps.surveys.models import Survey, SurveyParticipation, SurveyQuestion, SurveyResponse
from apps.surveys.services import ensure_option_ids, hour_bucket, publish_survey

DEMO_MARKER = "[DEMO]"

# 10 ta realistik so'rovnoma shabloni
DEMO_SURVEYS = [
    {
        "title": f"{DEMO_MARKER} O'quv jarayoni sifati 2026",
        "description": "Darslar, o'qituvchilar va o'quv materiallari bo'yicha anonim fikr-mulohaza.",
        "audience": Survey.Audience.STUDENTS,
        "questions": [
            ("single", "Umuman olganda o'quv jarayonidan qoniqasizmi?", [
                "Juda qoniqaman", "Qoniqaman", "O'rtacha", "Qoniqmayman", "Umuman qoniqmayman",
            ]),
            ("rating", "Dars materiallarining foydaliligi (1–5)", None),
            ("nps", "Universitetni do'stlaringizga tavsiya qilasizmi? (0–10)", None),
            ("likert", "O'qituvchilar savollarga o'z vaqtida javob beradi", None),
            ("textarea", "Yaxshilash bo'yicha takliflaringiz", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Kutubxona va axborot resurslari",
        "description": "Kutubxona xizmati, elektron bazalar va o'qish zallari.",
        "audience": Survey.Audience.ALL,
        "questions": [
            ("single", "Kutubxonadan qancha tez-tez foydalanasiz?", [
                "Har kuni", "Haftada 1–2 marta", "Oyda bir necha", "Deyarli yo'q",
            ]),
            ("rating", "Elektron resurslar sifati", None),
            ("multiple", "Qaysi xizmatlar muhim?", [
                "Kitoblar fondi", "Wi‑Fi", "O'qish zali", "Onlayn katalog", "Konsultatsiya",
            ]),
            ("text", "Qaysi adabiyot yetishmayapti?", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Talabalar turar joyi (TTJ)",
        "description": "Yotoqxona sharoiti va xizmatlar bahosi.",
        "audience": Survey.Audience.STUDENTS,
        "questions": [
            ("single", "TTJda yashaysizmi?", ["Ha", "Yo'q"]),
            ("rating", "Yashash sharoiti", None),
            ("likert", "Xavfsizlik darajasi qoniqarli", None),
            ("nps", "TTJni boshqa talabalarga tavsiya qilasizmi?", None),
            ("textarea", "Muammolar va takliflar", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Raqamli xizmatlar va HEMIS",
        "description": "Kabinet, jadval, baholar va onlayn xizmatlar.",
        "audience": Survey.Audience.ALL,
        "questions": [
            ("single", "HEMIS tizimidan foydalanish qulayligi", [
                "Juda qulay", "Qulay", "O'rtacha", "Qiyin", "Juda qiyin",
            ]),
            ("rating", "Mobil ilova / veb interfeys", None),
            ("multiple", "Qaysi funksiyalar kerak?", [
                "Jadval", "Baholar", "To'lov", "Arizalar", "Bildirishnomalar",
            ]),
            ("text", "Texnik muammo bo'lganmi? Qisqacha yozing", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Sport va sog'lom turmush",
        "description": "Sport zallari, musobaqalar va sog'liqni saqlash.",
        "audience": Survey.Audience.STUDENTS,
        "questions": [
            ("single", "Sport seksiyalarida qatnashasizmi?", [
                "Ha, muntazam", "Ba'zan", "Yo'q, lekin xohlayman", "Qiziqmayman",
            ]),
            ("rating", "Sport infratuzilmasi", None),
            ("likert", "Universitet sog'lom turmushni rag'batlantiradi", None),
            ("textarea", "Qanday sport turlari kerak?", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Ovqatlanish va oshxona",
        "description": "Kampus oshxonasi sifati, narx va tozalik.",
        "audience": Survey.Audience.ALL,
        "questions": [
            ("rating", "Ovqat sifati", None),
            ("rating", "Narxlarning adolatliligi", None),
            ("single", "Qancha tez-tez oshxonadan foydalanasiz?", [
                "Har kuni", "Haftada bir necha", "Kamdan-kam", "Hech qachon",
            ]),
            ("text", "Taklifingiz", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Karyera markazi va amaliyot",
        "description": "Ishga joylashish, amaliyot va mentorlik dasturlari.",
        "audience": Survey.Audience.STUDENTS,
        "questions": [
            ("single", "Karyera markazi xizmatlaridan foydalangansizmi?", [
                "Ha", "Yo'q, lekin bilaman", "Eshitmaganman",
            ]),
            ("nps", "Karyera tadbirlarini tavsiya qilasizmi?", None),
            ("multiple", "Sizga nima kerak?", [
                "Rezyume yordami", "Ish yarmarkasi", "Amaliyot", "Mentor", "Soft skills",
            ]),
            ("likert", "Amaliyot joylari yetarli", None),
            ("textarea", "Ish beruvchilar bilan aloqa haqida fikr", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Xodimlar ish muhiti",
        "description": "O'qituvchi va xodimlar uchun ish sharoiti so'rovnomasi (demo — hammaga ochiq).",
        "audience": Survey.Audience.ALL,
        "questions": [
            ("rating", "Ish yuklamasi adolatliligi", None),
            ("likert", "Rahbariyat qo'llab-quvvatlaydi", None),
            ("single", "Professional rivojlanish imkoniyatlari", [
                "Yetarli", "Qisman", "Yetarli emas", "Umuman yo'q",
            ]),
            ("nps", "Ish joyini tavsiya qilasizmi?", None),
            ("textarea", "Taklif va e'tirozlar", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Campus Wi‑Fi va infratuzilma",
        "description": "Internet, auditoriyalar, jihozlar holati.",
        "audience": Survey.Audience.ALL,
        "questions": [
            ("rating", "Wi‑Fi sifati", None),
            ("rating", "Auditoriyalar jihozlari", None),
            ("single", "Eng katta muammo", [
                "Internet", "Projektor", "Isitish/sovitish", "Tozalik", "Joy yetishmasligi",
            ]),
            ("text", "Qaysi bino / auditoriya?", None),
        ],
    },
    {
        "title": f"{DEMO_MARKER} Talabalar o'zini o'zi boshqarish",
        "description": "TSS, klublar va tadbirlar faolligi.",
        "audience": Survey.Audience.STUDENTS,
        "questions": [
            ("single", "Klub yoki jamiyat a'zosisizmi?", ["Ha", "Yo'q"]),
            ("rating", "Talabalar tadbirlari sifati", None),
            ("nps", "TSS faoliyatini tavsiya qilasizmi?", None),
            ("multiple", "Qaysi tadbirlar kerak?", [
                "Ilmiy", "Madaniy", "Sport", "Volontyorlik", "Startap",
            ]),
            ("textarea", "G'oyangiz", None),
        ],
    },
]


class Command(BaseCommand):
    help = "10 ta demo so'rovnoma + savollar + natijalar yaratadi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Yaratiladigan demo so'rovnomalar soni (default 10, max 10 shablon)",
        )
        parser.add_argument(
            "--responses",
            type=int,
            default=150,
            help="Har bir so'rovnomaga demo javoblar soni (default 150)",
        )
        parser.add_argument(
            "--skip-if-enough",
            action="store_true",
            help=f"Allaqachon {DEMO_MARKER} so'rovnomalar yetarli bo'lsa chiqish",
        )

    def handle(self, *args, **options):
        n = max(1, min(options["count"], len(DEMO_SURVEYS)))
        resp_n = max(20, options["responses"])

        existing_demo = Survey.objects.filter(title__startswith=DEMO_MARKER).count()
        if options["skip_if_enough"] and existing_demo >= n:
            self.stdout.write(self.style.WARNING(
                f"Allaqachon {existing_demo} ta {DEMO_MARKER} so'rovnoma bor — o'tkazib yuborildi."
            ))
            return

        faculties = list(
            Faculty.objects.filter(is_active=True, is_archived=False).only("id", "name")[:50]
        )
        groups = list(
            StudyGroup.objects.filter(is_active=True, is_archived=False)
            .select_related("specialty")
            .only("id", "name", "study_year", "specialty_id")[:300]
        )

        templates = DEMO_SURVEYS[:n]
        created_surveys = 0
        created_responses = 0

        for idx, tpl in enumerate(templates):
            # Bir xil title bo'lsa yangisini yaratishda suffix
            title = tpl["title"]
            if Survey.objects.filter(title=title).exists():
                title = f"{tpl['title']} #{existing_demo + idx + 1}"

            # Yaratilish sanasini biroz tarqatish (paginatsiya demo)
            created_offset = timedelta(days=idx, hours=random.randint(0, 12))

            with transaction.atomic():
                survey = Survey.objects.create(
                    title=title,
                    description=tpl["description"],
                    status=Survey.Status.DRAFT,
                    audience=tpl["audience"],
                    privacy_mode=Survey.PrivacyMode.ANONYMOUS,
                    stats_level=Survey.StatsLevel.DETAILED,
                    store_group_meta=True,
                    track_participation=True,
                    study_years=[],
                    public_path="",
                )
                # created_at auto_now_add — keyin update
                Survey.objects.filter(pk=survey.pk).update(
                    created_at=timezone.now() - created_offset,
                    updated_at=timezone.now() - created_offset,
                )
                survey.refresh_from_db()

                for qi, (qtype, text, opts) in enumerate(tpl["questions"]):
                    options = []
                    settings = {}
                    if opts:
                        options = ensure_option_ids([
                            {"text": t, "order": oi} for oi, t in enumerate(opts)
                        ])
                    if qtype == "rating":
                        settings = {"min": 1, "max": 5}
                    elif qtype == "nps":
                        settings = {"min": 0, "max": 10}
                    elif qtype == "likert":
                        settings = {"min": 1, "max": 5}

                    SurveyQuestion.objects.create(
                        survey=survey,
                        order=qi,
                        q_type=qtype,
                        text=text,
                        required=True,
                        options=options,
                        settings=settings,
                    )

                survey = publish_survey(survey)
                created_surveys += 1

            questions = list(survey.questions.order_by("order", "created_at"))
            added = self._seed_responses(survey, questions, resp_n, faculties, groups)
            created_responses += added
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {survey.title} — {len(questions)} savol, {added} javob, status={survey.status}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\nYakun: {created_surveys} ta demo so'rovnoma, {created_responses} ta javob."
        ))
        total = Survey.objects.filter(status=Survey.Status.PUBLISHED).count()
        self.stdout.write(f"Jami nashr qilingan so'rovnomalar: {total}")

    def _seed_responses(self, survey, questions, count, faculties, groups):
        now = timezone.now()
        genders = ["M", "F"]
        years = [1, 2, 3, 4, 5]
        batch_resp = []
        batch_part = []

        for _ in range(count):
            days_ago = random.randint(0, 44)
            hours_ago = random.randint(0, 23)
            when = now - timedelta(days=days_ago, hours=hours_ago)
            bucket = hour_bucket(when)
            meta = self._random_meta(faculties, groups, years, genders)
            answers = self._random_answers(questions)

            seal_body = {
                "survey_id": str(survey.id),
                "answers": answers,
                "meta": meta,
                "submitted_bucket": bucket.isoformat(),
                "privacy_mode": survey.privacy_mode,
            }
            chash, sig = crypto.seal_payload(seal_body)
            enc = crypto.encrypt_answers(answers)

            batch_resp.append(
                SurveyResponse(
                    survey=survey,
                    respondent=None,
                    meta=meta,
                    answers_encrypted=enc,
                    content_hash=chash,
                    signature=sig,
                    is_sealed=True,
                    seal_version=1,
                    submitted_bucket=bucket,
                )
            )
            fake_key = crypto.hash_participation_token(
                f"demo|{survey.id}|{uuid.uuid4()}"
            )
            batch_part.append(
                SurveyParticipation(
                    survey=survey,
                    user=None,
                    participant_key=fake_key,
                    status=SurveyParticipation.Status.SUBMITTED,
                    token_hash="",
                    token_used=True,
                    submitted_day=bucket.date(),
                )
            )
            if len(batch_resp) >= 100:
                self._flush(batch_resp, batch_part)
                batch_resp, batch_part = [], []

        if batch_resp:
            self._flush(batch_resp, batch_part)
        return count

    def _flush(self, responses, participations):
        with transaction.atomic():
            SurveyResponse.objects.bulk_create(responses, batch_size=100)
            SurveyParticipation.objects.bulk_create(participations, batch_size=100)

    def _random_meta(self, faculties, groups, years, genders):
        meta = {
            "study_year": random.choice(years),
            "gender": random.choice(genders),
        }
        if faculties:
            fac = random.choice(faculties)
            meta["faculty_id"] = str(fac.id)
            meta["faculty_name"] = fac.name
            fac_groups = [
                g for g in groups
                if getattr(g, "specialty", None)
                and str(getattr(g.specialty, "faculty_id", "")) == str(fac.id)
            ] if groups else []
            pool = fac_groups or groups
            if pool:
                g = random.choice(pool[:80] if len(pool) > 80 else pool)
                meta["group_id"] = str(g.id)
                meta["group_name"] = g.name
                if g.study_year and random.random() < 0.6:
                    meta["study_year"] = g.study_year
        elif groups:
            g = random.choice(groups)
            meta["group_id"] = str(g.id)
            meta["group_name"] = g.name
        return meta

    def _random_answers(self, questions):
        out = []
        for q in questions:
            qid = str(q.id)
            qt = q.q_type
            opts = q.options or []
            settings_ = q.settings or {}
            value = {}

            if qt in (SurveyQuestion.QType.SINGLE, "single"):
                if opts:
                    o = random.choice(opts)
                    oid = o.get("id") if isinstance(o, dict) else None
                    value = {"option_id": str(oid or o)}
                else:
                    value = {"option_id": "unknown"}
            elif qt in (SurveyQuestion.QType.MULTIPLE, "multiple"):
                if opts:
                    k = random.randint(1, min(3, len(opts)))
                    chosen = random.sample(opts, k)
                    value = {
                        "option_ids": [
                            str(o.get("id") if isinstance(o, dict) else o)
                            for o in chosen
                        ]
                    }
                else:
                    value = {"option_ids": []}
            elif qt in (SurveyQuestion.QType.TEXT, SurveyQuestion.QType.TEXTAREA, "text", "textarea"):
                value = {"text": random.choice([
                    "Yaxshi", "Qoniqarli", "Yaxshilash kerak", "Juda foydali",
                    "O'rtacha", "Demo javob", "Tavsiya qilaman",
                ])}
            elif qt in (SurveyQuestion.QType.RATING, "rating"):
                lo = int(settings_.get("min", 1))
                hi = int(settings_.get("max", 5))
                span = list(range(lo, hi + 1))
                weights = [1, 2, 3, 4, 5][: len(span)] or [1]
                value = {"value": random.choices(span, weights=weights)[0]}
            elif qt in (SurveyQuestion.QType.NPS, "nps"):
                value = {"value": random.choices(
                    range(0, 11),
                    weights=[1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7],
                )[0]}
            elif qt in (SurveyQuestion.QType.LIKERT, "likert"):
                value = {"value": random.choices(
                    range(1, 6),
                    weights=[1, 2, 3, 4, 3],
                )[0]}
            else:
                value = {"text": "demo"}

            out.append({"question_id": qid, "q_type": qt, "value": value})
        return out
