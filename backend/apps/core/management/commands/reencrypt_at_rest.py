"""Eski SECRET_KEY hosilasidagi so'rovnoma javoblarini yangi kalitga ko'chirish.

SURVEY_LEGACY_SECRET berilsa, o'sha hosila bilan ochib, joriy kalit bilan yozadi.
So'rov yo'li legacy kalitni qabul qilmaydi.
"""
from django.core.management.base import BaseCommand

from apps.surveys import crypto
from apps.surveys.models import SurveyParticipation, SurveyResponse
from apps.surveys.services import decrypt_and_verify


class Command(BaseCommand):
    help = "So'rovnoma javoblari va anonim xabarlarni joriy kalit bilan qayta muhrlaydi"

    def handle(self, *args, **options):
        moved = self._surveys()
        sealed = self._whistles()
        linked = self._participation_keys()
        self.stdout.write(
            self.style.SUCCESS(
                f"reencrypt: surveys={moved} whistles={sealed} participations={linked}"
            )
        )

    def _surveys(self) -> int:
        n = 0
        for row in SurveyResponse.objects.select_related("survey").iterator():
            try:
                decrypt_and_verify(row)
                continue
            except Exception:
                pass
            try:
                answers = crypto.decrypt_answers_any(row.answers_encrypted)
            except Exception:
                self.stderr.write(f"survey response ochilmadi: {row.pk}")
                continue
            seal_body = {
                "survey_id": str(row.survey_id),
                "answers": answers,
                "meta": row.meta or {},
                "submitted_bucket": row.submitted_bucket.isoformat(),
                "privacy_mode": row.survey.privacy_mode,
            }
            if row.respondent_id:
                seal_body["respondent_id"] = str(row.respondent_id)
            chash, sig = crypto.seal_payload(seal_body)
            row.answers_encrypted = crypto.encrypt_answers(answers)
            row.content_hash = chash
            row.signature = sig
            SurveyResponse.objects.filter(pk=row.pk).update(
                answers_encrypted=row.answers_encrypted,
                content_hash=chash,
                signature=sig,
            )
            n += 1
        return n

    def _whistles(self) -> int:
        from apps.compliance.models import WhistleReport
        from utils.at_rest import is_sealed, seal_text

        n = 0
        for row in WhistleReport.objects.all().iterator():
            fields = []
            if row.message and not is_sealed(row.message):
                row.message = seal_text(row.message, purpose="whistle-message")
                fields.append("message")
            if row.context and not is_sealed(row.context):
                row.context = seal_text(row.context, purpose="whistle-context")
                fields.append("context")
            if fields:
                WhistleReport.objects.filter(pk=row.pk).update(
                    **{name: getattr(row, name) for name in fields}
                )
                n += 1
        return n

    def _participation_keys(self) -> int:
        n = 0
        qs = SurveyParticipation.objects.exclude(user_id=None).iterator()
        for part in qs:
            new_key = crypto.participant_key(part.user_id, part.survey_id)
            if not new_key or part.participant_key == new_key:
                continue
            clash = (
                SurveyParticipation.objects.filter(
                    survey_id=part.survey_id,
                    participant_key=new_key,
                )
                .exclude(pk=part.pk)
                .exists()
            )
            if clash:
                continue
            SurveyParticipation.objects.filter(pk=part.pk).update(participant_key=new_key)
            n += 1
        return n
