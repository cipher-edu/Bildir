"""
OsiyoNigohi — core app initial migration
University → Faculty → Specialty → StudyGroup + Subject
"""
import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        # ── University ──────────────────────────────────────────────
        migrations.CreateModel(
            name="University",
            fields=[
                ("id",         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name",       models.CharField(max_length=300, verbose_name="To'liq nomi")),
                ("short_name", models.CharField(max_length=50,  verbose_name="Qisqa nomi")),
                ("code",       models.CharField(max_length=20,  unique=True, verbose_name="Kod")),
                ("domain",     models.CharField(blank=True, max_length=100, verbose_name="Domen")),
                ("city",       models.CharField(blank=True, max_length=100, verbose_name="Shahar")),
                ("is_active",  models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "universities", "ordering": ["name"],
                     "verbose_name": "Universitet", "verbose_name_plural": "Universitetlar"},
        ),
        # ── Faculty ─────────────────────────────────────────────────
        migrations.CreateModel(
            name="Faculty",
            fields=[
                ("id",         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("university", models.ForeignKey("core.University", on_delete=django.db.models.deletion.CASCADE, related_name="faculties", verbose_name="Universitet")),
                ("name",       models.CharField(max_length=200, verbose_name="Nomi")),
                ("code",       models.CharField(max_length=20,  verbose_name="Kod")),
                ("is_active",  models.BooleanField(default=True)),
            ],
            options={"db_table": "faculties", "ordering": ["name"],
                     "verbose_name": "Fakultet", "verbose_name_plural": "Fakultetlar"},
        ),
        migrations.AlterUniqueTogether(name="faculty", unique_together={("university", "code")}),
        # ── Specialty ───────────────────────────────────────────────
        migrations.CreateModel(
            name="Specialty",
            fields=[
                ("id",                 models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("faculty",            models.ForeignKey("core.Faculty", on_delete=django.db.models.deletion.CASCADE, related_name="specialties", verbose_name="Fakultet")),
                ("name",               models.CharField(max_length=200, verbose_name="Nomi")),
                ("code",               models.CharField(max_length=20,  verbose_name="Kod")),
                ("hemis_specialty_id", models.CharField(blank=True, max_length=50, verbose_name="HEMIS ID")),
                ("is_active",          models.BooleanField(default=True)),
            ],
            options={"db_table": "specialties", "ordering": ["name"],
                     "verbose_name": "Yo'nalish", "verbose_name_plural": "Yo'nalishlar"},
        ),
        migrations.AlterUniqueTogether(name="specialty", unique_together={("faculty", "code")}),
        # ── StudyGroup ──────────────────────────────────────────────
        migrations.CreateModel(
            name="StudyGroup",
            fields=[
                ("id",         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("specialty",  models.ForeignKey("core.Specialty", on_delete=django.db.models.deletion.CASCADE, related_name="groups", verbose_name="Yo'nalish")),
                ("name",       models.CharField(max_length=50,  verbose_name="Guruh nomi")),
                ("study_year", models.PositiveSmallIntegerField(verbose_name="O'qish kursi")),
                ("degree",     models.CharField(choices=[("bachelor","Bakalavr"),("master","Magistr"),("phd","PhD")], default="bachelor", max_length=20, verbose_name="Ta'lim darajasi")),
                ("is_active",  models.BooleanField(default=True)),
            ],
            options={"db_table": "study_groups", "ordering": ["study_year", "name"],
                     "verbose_name": "Guruh", "verbose_name_plural": "Guruhlar"},
        ),
        migrations.AlterUniqueTogether(name="studygroup", unique_together={("specialty", "name")}),
        # ── Subject ─────────────────────────────────────────────────
        migrations.CreateModel(
            name="Subject",
            fields=[
                ("id",              models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("faculty",         models.ForeignKey("core.Faculty", on_delete=django.db.models.deletion.CASCADE, related_name="subjects", verbose_name="Fakultet")),
                ("name",            models.CharField(max_length=200, verbose_name="Fan nomi")),
                ("code",            models.CharField(max_length=20,  verbose_name="Fan kodi")),
                ("hemis_course_id", models.CharField(blank=True, max_length=50, verbose_name="HEMIS kurs ID")),
                ("credit_hours",    models.PositiveSmallIntegerField(default=0, verbose_name="Kredit soati")),
                ("is_active",       models.BooleanField(default=True)),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "subjects", "ordering": ["name"],
                     "verbose_name": "Fan", "verbose_name_plural": "Fanlar"},
        ),
        migrations.AlterUniqueTogether(name="subject", unique_together={("faculty", "code")}),
        migrations.AddIndex(model_name="subject", index=models.Index(fields=["hemis_course_id"], name="subjects_hemis_idx")),
    ]
