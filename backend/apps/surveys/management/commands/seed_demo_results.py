"""
Barcha so'rovnomalarga demo javoblar yozish (dashboard/chart uchun).

  python manage.py seed_demo_results
  python manage.py seed_demo_results --count 150
  python manage.py seed_demo_results --clear   # avvalgi javoblarni o'chirib qayta to'ldirish
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
from apps.surveys.services import hour_bucket


class Command(BaseCommand):
    help = "So'rovnomalarga demo natijalar (default 150 ta javob) yozadi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=150,
            help="Har bir so'rovnoma uchun minimal javob soni (default 150)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Avval responses + participations ni tozalash",
        )
        parser.add_argument(
            "--only-published",
            action="store_true",
            help="Faqat nashr/yopilgan so'rovnomalar",
        )

    def handle(self, *args, **options):
        target = max(1, options["count"])
        clear = options["clear"]
        only_pub = options["only_published"]

        qs = Survey.objects.all().prefetch_related("questions")
        if only_pub:
            qs = qs.filter(status__in=[Survey.Status.PUBLISHED, Survey.Status.CLOSED])

        faculties = list(
            Faculty.objects.filter(is_active=True, is_archived=False).only("id", "name")[:50]
        )
        groups = list(
            StudyGroup.objects.filter(is_active=True, is_archived=False)
            .select_related("specialty")
            .only("id", "name", "study_year", "specialty_id")[:300]
        )

        if not faculties:
            self.stdout.write(self.style.WARNING(
                "Fakultet yo'q — meta faqat kurs/jins bilan to'ldiriladi"
            ))

        total_created = 0
        for survey in qs:
            questions = list(survey.questions.order_by("order", "created_at"))
            if not questions:
                self.stdout.write(self.style.WARNING(
                    f"  skip (savol yo'q): {survey.title}"
                ))
                continue

            if clear:
                n_r, _ = SurveyResponse.objects.filter(survey=survey).delete()
                n_p, _ = SurveyParticipation.objects.filter(survey=survey).delete()
                self.stdout.write(f"  cleared {survey.title}: resp={n_r} part={n_p}")

            existing = SurveyResponse.objects.filter(survey=survey).count()
            need = max(0, target - existing)
            if need == 0:
                self.stdout.write(f"  OK {survey.title}: already {existing} (>= {target})")
                continue

            created = self._seed_survey(survey, questions, need, faculties, groups)
            total_created += created
            final = SurveyResponse.objects.filter(survey=survey).count()
            self.stdout.write(self.style.SUCCESS(
                f"  +{created} → {survey.title}: jami {final} javob"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\nYakun: {total_created} ta yangi demo javob yozildi."
        ))

    def _seed_survey(self, survey, questions, count, faculties, groups):
        now = timezone.now()
        genders = ["M", "F"]
        years = [1, 2, 3, 4, 5]

        batch_resp = []
        batch_part = []

        for i in range(count):
            # Vaqt: oxirgi 45 kun ichida tarqatilgan
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

            # Anonim ishtirok (user yo'q, faqat key)
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

            # Katta batch
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
            # Shu fakultetga tegishli guruhlar (agar bor)
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
                if g.study_year:
                    # ba'zan guruh kursiga moslashtirish
                    if random.random() < 0.6:
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

            if qt == SurveyQuestion.QType.SINGLE or qt == "single":
                if opts:
                    o = random.choice(opts)
                    oid = o.get("id") if isinstance(o, dict) else None
                    value = {"option_id": str(oid or o)}
                else:
                    value = {"option_id": "unknown"}

            elif qt == SurveyQuestion.QType.MULTIPLE or qt == "multiple":
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
                samples = [
                    "Yaxshi",
                    "Qoniqarli",
                    "Yaxshilash kerak",
                    "Juda foydali",
                    "O'rtacha",
                    "Demo javob matni",
                    "Tavsiya qilaman",
                    "Aniq emas",
                ]
                value = {"text": random.choice(samples)}

            elif qt in (SurveyQuestion.QType.RATING, "rating"):
                lo = int(settings_.get("min", 1))
                hi = int(settings_.get("max", 5))
                # biroz yuqoriga og'ish (realistik)
                value = {"value": random.choices(
                    range(lo, hi + 1),
                    weights=[1, 2, 3, 4, 5][: hi - lo + 1] or [1],
                )[0]}

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

            out.append({
                "question_id": qid,
                "q_type": qt,
                "value": value,
            })
        return out
