"""
OsiyoNigohi — Demo ma'lumotlarni tozalash

Qoldiriladi:
  - Foydalanuvchilar (barcha rollar)
  - HEMIS real katalog (University, Faculty, Specialty, StudyGroup, Subject)
  - HemisSyncLog

O'chiriladi:
  - Imtihonlar, sessiyalar, javoblar, sertifikatlar
  - Savollar, savol versiyalari
  - Mashq sessiyalari
  - So'rovnomalar
  - Proctoring yozuvlari
  - Audit loglar
  - Bildirishnomalar
  - Approval workflow'lar
  - Integrity (anomaliya) eventlari
  - Natijalar, sertifikatlar
  - Sifat metrikalari, bayroqlar
  - Imtihon joylari
"""
from django.core.management.base import BaseCommand
from django.db import connection


TABLES_TO_FLUSH = [
    # FK bog'lanishlar tartibida — chuqur bog'langanlar avval
    # Results & Certificates
    "result_certificates",
    "exam_results",
    # Quality
    "review_flags",
    "question_quality_metrics",
    # Integrity
    "session_integrity_scores",
    "anomaly_events",
    # Approval
    "approval_steps",
    "approval_workflows",
    # Notifications
    "notifications",
    # Audit
    "audit_logs",
    # Proctoring
    "violation_events",
    "proctoring_records",
    # Surveys
    "survey_answers",
    "survey_responses",
    "survey_questions",
    "surveys",
    # Practice
    "practice_answers",
    "practice_sessions",
    # Exams — deep FK chain
    "blockchain_records",
    "certificates",
    "user_answers",
    "exam_sessions",
    "exam_approvals",
    "exams_exam_allowed_groups",
    "exams",
    # Questions
    "question_versions",
    "question_subjects",
    "questions",
    # Locations
    "exam_locations_iprange",
    "exam_locations",
    "exams_examlocation",
]


class Command(BaseCommand):
    help = "Demo ma'lumotlarni tozalaydi. Userlar va HEMIS katalog qoladi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="O'chirmasdan, faqat nima o'chirilishini ko'rsatadi",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        existing = self._get_existing_tables()

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN ==="))

        total = 0
        with connection.cursor() as cursor:
            for table in TABLES_TO_FLUSH:
                if table not in existing:
                    continue
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                if count == 0:
                    continue

                if dry_run:
                    self.stdout.write(f"  [ ] {table}: {count} ta o'chiriladi")
                else:
                    cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
                    self.stdout.write(f"  [x] {table}: {count} ta o'chirildi")
                total += count

        if dry_run:
            self.stdout.write(self.style.WARNING(f"\nJami: {total} ta yozuv o'chirilishi mumkin"))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n{total} ta demo yozuv tozalandi"))

        self._print_remaining()

    def _get_existing_tables(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            return {row[0] for row in cursor.fetchall()}

    def _print_remaining(self):
        from apps.users.models import User
        from apps.core.models import University, Faculty, Specialty, StudyGroup, Subject

        self.stdout.write("\nQolgan ma'lumotlar:")
        self.stdout.write(f"  Foydalanuvchilar: {User.objects.count()}")
        self.stdout.write(f"  Universitetlar:   {University.objects.count()}")
        self.stdout.write(f"  Fakultetlar:      {Faculty.objects.filter(is_active=True).count()}")
        self.stdout.write(f"  Yo'nalishlar:     {Specialty.objects.filter(is_active=True).count()}")
        self.stdout.write(f"  Guruhlar:         {StudyGroup.objects.filter(is_active=True).count()}")
        self.stdout.write(f"  Fanlar:           {Subject.objects.filter(is_active=True).count()}")
