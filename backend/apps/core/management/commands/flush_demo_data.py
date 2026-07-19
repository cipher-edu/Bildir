"""
Demo ma'lumotlarni tozalash (SQLite va PostgreSQL).

Qoldiriladi (default):
  - Real foydalanuvchilar (admin@example.com demo hisobdan tashqari, --purge-demo-users)
  - HemisSyncLog

O'chiriladi:
  - So'rovnomalar va bog'liq jadvallar
  - Audit loglar
  - Mock/katalog (ixtiyoriy --purge-catalog) — HEMIS qayta sync uchun
"""
from django.core.management.base import BaseCommand
from django.db import connection


SURVEY_AND_APP_TABLES = [
    "survey_responses",
    "survey_participations",
    "survey_questions",
    "surveys_groups",
    "surveys_specialties",
    "surveys_faculties",
    "surveys",
    "audit_log",
    "audit_logs",
]


class Command(BaseCommand):
    help = "Demo ma'lumotlarni tozalaydi."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument(
            "--purge-catalog",
            action="store_true",
            help="Faculty/Specialty/Group/Subject (va M2M) tozalash — HEMIS qayta sync uchun",
        )
        parser.add_argument(
            "--purge-demo-users",
            action="store_true",
            help="admin@example.com kabi demo userlarni o'chirish",
        )
        parser.add_argument(
            "--all-demo",
            action="store_true",
            help="--purge-catalog + --purge-demo-users + survey/audit",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        purge_catalog = options["purge_catalog"] or options["all_demo"]
        purge_users = options["purge_demo_users"] or options["all_demo"]

        if dry:
            self.stdout.write(self.style.WARNING("=== DRY RUN ==="))

        total = 0

        # ── ORM orqali (xavfsiz, SQLite-friendly) ─────────────
        total += self._flush_surveys(dry)
        total += self._flush_audit(dry)

        if purge_catalog:
            total += self._flush_catalog(dry)
            # DEMO/mock + seed (NDU/FIT) qoldiqlari
            if not dry:
                try:
                    from django.core.management import call_command
                    call_command("purge_demo_catalog", stdout=self.stdout)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  purge_demo_catalog: {e}"))

        if purge_users:
            total += self._flush_demo_users(dry)

        # ── Qolgan raw jadvallar (agar mavjud bo'lsa) ──────────
        existing = self._get_existing_tables()
        for table in SURVEY_AND_APP_TABLES:
            if table not in existing:
                continue
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT COUNT(*) FROM {self._q(table)}")
                count = cursor.fetchone()[0]
            if count == 0:
                continue
            if dry:
                self.stdout.write(f"  [ ] {table}: {count}")
            else:
                self._delete_all(table)
                self.stdout.write(f"  [x] {table}: tozalandi")
            total += count

        if dry:
            self.stdout.write(self.style.WARNING(f"\nJami taxminan: {total}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"\nTozalash yakunlandi (≈{total} ta operatsiya)."))

        self._print_remaining()

    def _q(self, table: str) -> str:
        # SQLite/Postgres identifikator
        return f'"{table}"' if connection.vendor == "postgresql" else table

    def _delete_all(self, table: str):
        with connection.cursor() as cursor:
            if connection.vendor == "postgresql":
                cursor.execute(f'TRUNCATE TABLE "{table}" CASCADE')
            else:
                cursor.execute(f"DELETE FROM {table}")

    def _get_existing_tables(self):
        with connection.cursor() as cursor:
            if connection.vendor == "postgresql":
                cursor.execute(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                )
                return {row[0] for row in cursor.fetchall()}
            # SQLite
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            return {row[0] for row in cursor.fetchall()}

    def _flush_surveys(self, dry: bool) -> int:
        from apps.surveys.models import (
            Survey, SurveyQuestion, SurveyParticipation, SurveyResponse,
        )
        n = 0
        for model, label in [
            (SurveyResponse, "survey_responses"),
            (SurveyParticipation, "survey_participations"),
            (SurveyQuestion, "survey_questions"),
            (Survey, "surveys"),
        ]:
            c = model.objects.count()
            if c == 0:
                continue
            if dry:
                self.stdout.write(f"  [ ] {label}: {c}")
            else:
                model.objects.all().delete()
                self.stdout.write(f"  [x] {label}: {c} o'chirildi")
            n += c
        return n

    def _flush_audit(self, dry: bool) -> int:
        try:
            from apps.users.models import AuditLog
        except Exception:
            return 0
        c = AuditLog.objects.count()
        if c == 0:
            return 0
        if dry:
            self.stdout.write(f"  [ ] audit_log: {c}")
        else:
            AuditLog.objects.all().delete()
            self.stdout.write(f"  [x] audit_log: {c} o'chirildi")
        return c

    def _flush_catalog(self, dry: bool) -> int:
        from apps.core.models import Faculty, Specialty, StudyGroup, Subject
        n = 0
        # FK tartibi: group → specialty → subject → faculty
        for model, label in [
            (StudyGroup, "study_groups"),
            (Specialty, "specialties"),
            (Subject, "subjects"),
            (Faculty, "faculties"),
        ]:
            c = model.objects.count()
            if c == 0:
                continue
            if dry:
                self.stdout.write(f"  [ ] {label}: {c}")
            else:
                model.objects.all().delete()
                self.stdout.write(f"  [x] {label}: {c} o'chirildi (mock/eski katalog)")
            n += c
        return n

    def _flush_demo_users(self, dry: bool) -> int:
        from apps.users.models import User
        demo_emails = ["admin@example.com", "student@example.com", "teacher@example.com"]
        qs = User.objects.filter(email__in=demo_emails)
        c = qs.count()
        if c == 0:
            return 0
        emails = list(qs.values_list("email", flat=True))
        if dry:
            self.stdout.write(f"  [ ] demo users: {emails}")
        else:
            qs.delete()
            self.stdout.write(f"  [x] demo users o'chirildi: {emails}")
        return c

    def _print_remaining(self):
        from apps.users.models import User
        from apps.core.models import University, Faculty, Specialty, StudyGroup, Subject
        from apps.surveys.models import Survey

        self.stdout.write("\nQolgan ma'lumotlar:")
        self.stdout.write(f"  Foydalanuvchilar: {User.objects.count()}")
        self.stdout.write(f"  Universitetlar:   {University.objects.count()}")
        self.stdout.write(f"  Fakultetlar:      {Faculty.objects.count()}")
        self.stdout.write(f"  Yo'nalishlar:     {Specialty.objects.count()}")
        self.stdout.write(f"  Guruhlar:         {StudyGroup.objects.count()}")
        self.stdout.write(f"  Fanlar:           {Subject.objects.count()}")
        self.stdout.write(f"  So'rovnomalar:    {Survey.objects.count()}")
