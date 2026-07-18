"""
OsiyoNigohi — Core Models (Normalizatsiya kataloglari)

Iyerarxiya:
  University → Faculty → Specialty → StudyGroup
  Faculty    → Subject
"""
import uuid
from django.db import models
from django.utils import timezone


class University(models.Model):
    """
    Universitet — multi-tenant tizimning asosi.
    Har bir universitet o'z ma'lumotlar to'plamiga ega.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name       = models.CharField(max_length=300, verbose_name="To'liq nomi")
    short_name = models.CharField(max_length=50, verbose_name="Qisqa nomi")
    code       = models.CharField(max_length=20, unique=True, verbose_name="Kod")
    domain     = models.CharField(
        max_length=100, blank=True,
        help_text="HEMIS SSO uchun domen, masalan: tashpi.uz",
        verbose_name="Domen"
    )
    city       = models.CharField(max_length=100, blank=True, verbose_name="Shahar")
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "universities"
        verbose_name = "Universitet"
        verbose_name_plural = "Universitetlar"
        ordering = ["name"]

    def __str__(self):
        return f"{self.short_name} ({self.code})"


class Faculty(models.Model):
    """
    Fakultet — universitetning bo'limi.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university  = models.ForeignKey(
        University, on_delete=models.CASCADE,
        related_name="faculties", verbose_name="Universitet"
    )
    name        = models.CharField(max_length=200, verbose_name="Nomi")
    code        = models.CharField(max_length=20, verbose_name="Kod")
    is_active   = models.BooleanField(default=True)
    synced_at   = models.DateTimeField(null=True, blank=True, verbose_name="Sinxronlangan vaqt")
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlangan")
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name="Arxivlangan vaqt")

    class Meta:
        db_table = "faculties"
        verbose_name = "Fakultet"
        verbose_name_plural = "Fakultetlar"
        unique_together = [["university", "code"]]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} — {self.university.short_name}"


class Specialty(models.Model):
    """
    Yo'nalish (mutaxassislik) — fakultet ostida.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty             = models.ForeignKey(
        Faculty, on_delete=models.CASCADE,
        related_name="specialties", verbose_name="Fakultet"
    )
    name                = models.CharField(max_length=200, verbose_name="Nomi")
    code                = models.CharField(max_length=20, verbose_name="Kod")
    hemis_specialty_id  = models.CharField(
        max_length=50, blank=True,
        help_text="HEMIS tizimidagi yo'nalish identifikatori",
        verbose_name="HEMIS ID"
    )
    is_active   = models.BooleanField(default=True)
    synced_at   = models.DateTimeField(null=True, blank=True, verbose_name="Sinxronlangan vaqt")
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlangan")
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name="Arxivlangan vaqt")

    class Meta:
        db_table = "specialties"
        verbose_name = "Yo'nalish"
        verbose_name_plural = "Yo'nalishlar"
        unique_together = [["faculty", "code"]]
        ordering = ["name"]
        indexes = [
            models.Index(fields=["faculty", "is_active"]),
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class HemisSyncLog(models.Model):
    """
    Har bir HEMIS sinxronizatsiya sessiyasining yozuvi.
    Tarix, arxiv statistikasi va tiklash imkoniyatini ta'minlaydi.
    """
    class Status(models.TextChoices):
        RUNNING = "running", "Ishlayapti"
        SUCCESS = "success", "Muvaffaqiyatli"
        FAILED  = "failed",  "Xato"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    started_at   = models.DateTimeField(auto_now_add=True)
    finished_at  = models.DateTimeField(null=True, blank=True)
    started_by   = models.CharField(max_length=200, blank=True)
    status       = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RUNNING
    )
    options      = models.JSONField(default=dict, blank=True)
    stats_before = models.JSONField(default=dict, blank=True)
    stats_after  = models.JSONField(default=dict, blank=True)
    archived     = models.JSONField(default=dict, blank=True,
                                    help_text="Arxivlangan yozuvlar soni (har model bo'yicha)")
    restored     = models.JSONField(default=dict, blank=True,
                                    help_text="Arxivdan tiklangan yozuvlar soni")
    errors       = models.TextField(blank=True)

    class Meta:
        db_table = "hemis_sync_logs"
        verbose_name = "HEMIS sinxronizatsiya jurnali"
        verbose_name_plural = "HEMIS sinxronizatsiya jurnallari"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Sync {self.started_at:%Y-%m-%d %H:%M} — {self.get_status_display()}"

    def finish(self, success=True, errors=""):
        self.finished_at = timezone.now()
        self.status      = self.Status.SUCCESS if success else self.Status.FAILED
        self.errors      = errors
        self.save(update_fields=["finished_at", "status", "errors"])


class StudyGroup(models.Model):
    """
    Talabalar guruhi — yo'nalish va kurs asosida.
    """
    class Degree(models.TextChoices):
        BACHELOR = "bachelor", "Bakalavr"
        MASTER   = "master",   "Magistr"
        PHD      = "phd",      "PhD"

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    specialty   = models.ForeignKey(
        Specialty, on_delete=models.CASCADE,
        related_name="groups", verbose_name="Yo'nalish"
    )
    name        = models.CharField(max_length=100, verbose_name="Guruh nomi")
    study_year  = models.PositiveSmallIntegerField(
        verbose_name="O'qish kursi",
        help_text="1-kurs, 2-kurs, ..."
    )
    degree      = models.CharField(
        max_length=20, choices=Degree.choices,
        default=Degree.BACHELOR, verbose_name="Ta'lim darajasi"
    )
    is_active   = models.BooleanField(default=True)
    synced_at   = models.DateTimeField(null=True, blank=True, verbose_name="Sinxronlangan vaqt")
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlangan")
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name="Arxivlangan vaqt")

    class Meta:
        db_table = "study_groups"
        verbose_name = "Guruh"
        verbose_name_plural = "Guruhlar"
        unique_together = [["specialty", "name"]]
        ordering = ["study_year", "name"]
        indexes = [
            models.Index(fields=["specialty", "is_active"]),
            models.Index(fields=["is_active", "study_year", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.study_year}-kurs, {self.get_degree_display()})"


class Subject(models.Model):
    """
    Fan (o'quv predmeti) — fakultetga tegishli.
    Bir fan bir nechta yo'nalishda o'qitilishi mumkin.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty          = models.ForeignKey(
        Faculty, on_delete=models.CASCADE,
        related_name="subjects", verbose_name="Fakultet"
    )
    name             = models.CharField(max_length=200, verbose_name="Fan nomi")
    code             = models.CharField(max_length=20, verbose_name="Fan kodi")
    hemis_course_id  = models.CharField(
        max_length=50, blank=True,
        help_text="HEMIS tizimidagi kurs identifikatori",
        verbose_name="HEMIS kurs ID"
    )
    credit_hours     = models.PositiveSmallIntegerField(
        default=0,
        help_text="Kredit soati — KPI hisobi uchun",
        verbose_name="Kredit soati"
    )
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    synced_at   = models.DateTimeField(null=True, blank=True, verbose_name="Sinxronlangan vaqt")
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlangan")
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name="Arxivlangan vaqt")

    class Meta:
        db_table = "subjects"
        verbose_name = "Fan"
        verbose_name_plural = "Fanlar"
        unique_together = [["faculty", "code"]]
        ordering = ["name"]
        indexes = [
            models.Index(fields=["hemis_course_id"]),
            models.Index(fields=["faculty", "is_active"]),
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
