# Generated manually — participant_key + nullable user for DB-level anonymization

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_participant_keys(apps, schema_editor):
    import hashlib
    import hmac
    import os

    from django.conf import settings as dj_settings

    SurveyParticipation = apps.get_model("surveys", "SurveyParticipation")

    def token_key():
        env_name = "SURVEY_TOKEN_KEY"
        purpose = "token-hmac-v1"
        raw = os.environ.get(env_name) or getattr(dj_settings, env_name, None)
        if raw:
            if isinstance(raw, bytes):
                data = raw
            else:
                try:
                    import base64
                    data = base64.b64decode(raw)
                except Exception:
                    data = str(raw).encode("utf-8")
            if len(data) >= 32:
                return data[:32]
            return hashlib.sha256(data + purpose.encode()).digest()[:32]
        material = f"{dj_settings.SECRET_KEY}|survey|{purpose}".encode("utf-8")
        return hashlib.sha256(material).digest()[:32]

    key = token_key()
    for p in SurveyParticipation.objects.all().iterator():
        if p.participant_key:
            continue
        if p.user_id:
            msg = f"{p.survey_id}|{p.user_id}".encode("utf-8")
            p.participant_key = hmac.new(key, msg, hashlib.sha256).hexdigest()
            p.save(update_fields=["participant_key"])
        else:
            # bo'sh kalit unique buzadi — vaqtinchalik id dan
            msg = f"{p.survey_id}|orphan|{p.id}".encode("utf-8")
            p.participant_key = hmac.new(key, msg, hashlib.sha256).hexdigest()
            p.save(update_fields=["participant_key"])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("surveys", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="surveyparticipation",
            name="participant_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Pseudonim barmoq izi — shaxsga reverse qilib bo'lmaydi",
                max_length=64,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="surveyparticipation",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="survey_participations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RemoveConstraint(
            model_name="surveyparticipation",
            name="uniq_survey_participation_user",
        ),
        migrations.RunPython(backfill_participant_keys, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="surveyparticipation",
            constraint=models.UniqueConstraint(
                fields=("survey", "participant_key"),
                name="uniq_survey_participation_key",
            ),
        ),
        migrations.AddIndex(
            model_name="surveyparticipation",
            index=models.Index(
                fields=["survey", "user"],
                name="survey_part_s_u_idx",
            ),
        ),
    ]
