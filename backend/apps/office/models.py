"""
Mas'ul shaxslar (rahbariyat) va foydalanuvchi murojaatlari.
SLA: murojaatga 72 soat ichida javob berish majburiy.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

SLA_HOURS = 72


def person_photo_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"office/persons/{instance.id}.{ext}"


def appeal_file_path(instance, filename):
    safe = filename.replace(" ", "_")[:80]
    return f"office/appeals/{instance.appeal_id}/{uuid.uuid4().hex[:10]}_{safe}"


class ResponsiblePerson(models.Model):
    """Admin kiritadigan rahbar / mas'ul shaxs kartochkasi."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    photo = models.ImageField(
        upload_to=person_photo_path, null=True, blank=True, verbose_name="Surat"
    )
    first_name = models.CharField(max_length=100, verbose_name="Ism")
    last_name = models.CharField(max_length=100, verbose_name="Familiya")
    middle_name = models.CharField(max_length=100, blank=True, verbose_name="Otasining ismi")
    position = models.CharField(max_length=200, verbose_name="Lavozim")
    position_i18n = models.JSONField(default=dict, blank=True)
    department = models.CharField(max_length=200, blank=True, verbose_name="Bo'lim / fakultet")
    department_i18n = models.JSONField(default=dict, blank=True)
    academic_title = models.CharField(max_length=150, blank=True, verbose_name="Ilmiy unvon")
    academic_title_i18n = models.JSONField(default=dict, blank=True)
    phone = models.CharField(max_length=40, blank=True, verbose_name="Telefon")
    email = models.EmailField(blank=True, verbose_name="Email")
    office_room = models.CharField(max_length=80, blank=True, verbose_name="Kabinet")
    reception_hours = models.CharField(
        max_length=200, blank=True, verbose_name="Qabul soatlari"
    )
    reception_hours_i18n = models.JSONField(default=dict, blank=True)
    biography = models.TextField(blank=True, verbose_name="Qisqa biografiya")
    biography_i18n = models.JSONField(default=dict, blank=True)
    responsibilities = models.TextField(blank=True, verbose_name="Vazifalar / mas'uliyat")
    responsibilities_i18n = models.JSONField(default=dict, blank=True)
    extra_info = models.TextField(blank=True, verbose_name="Qo'shimcha ma'lumot")
    extra_info_i18n = models.JSONField(default=dict, blank=True)
    order = models.PositiveSmallIntegerField(default=0, verbose_name="Tartib")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    is_public = models.BooleanField(
        default=True, verbose_name="Foydalanuvchilarga ko'rsatish"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "office_responsible_persons"
        ordering = ["order", "last_name", "first_name"]
        verbose_name = "Mas'ul shaxs"
        verbose_name_plural = "Mas'ul shaxslar"

    def __str__(self):
        return f"{self.last_name} {self.first_name} — {self.position}"

    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name, self.middle_name]
        return " ".join(p for p in parts if p).strip()


class Appeal(models.Model):
    """Foydalanuvchi murojaati — 72 soat ichida javob kutiladi."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        IN_PROGRESS = "in_progress", "Ko'rib chiqilmoqda"
        ANSWERED = "answered", "Javob berilgan"
        CLOSED = "closed", "Yopilgan"

    class Category(models.TextChoices):
        GENERAL = "general", "Umumiy"
        ACADEMIC = "academic", "O'quv jarayoni"
        SOCIAL = "social", "Ijtimoiy"
        TECHNICAL = "technical", "Texnik"
        COMPLAINT = "complaint", "Shikoyat"
        SUGGESTION = "suggestion", "Taklif"
        OTHER = "other", "Boshqa"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="appeals",
        verbose_name="Foydalanuvchi",
    )
    # Survey NSPI uslubi: aniq mas'ul shaxsga murojaat (ixtiyoriy)
    responsible_person = models.ForeignKey(
        ResponsiblePerson,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appeals",
        verbose_name="Mas'ul shaxs",
    )
    subject = models.CharField(max_length=300, verbose_name="Mavzu")
    body = models.TextField(verbose_name="Murojaat matni")
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.GENERAL,
        verbose_name="Kategoriya",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    # Kuzatuv kodi + QR (Survey NSPI MessageToResponsible uslubi)
    unique_code = models.CharField(
        max_length=32,
        unique=True,
        editable=False,
        blank=True,
        default="",
        verbose_name="Murojaat ID",
    )
    qr_code_image = models.ImageField(
        upload_to="office/appeals/qr/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="QR kod",
    )
    # Admin javobi
    answer_text = models.TextField(blank=True, verbose_name="Javob matni")
    answered_at = models.DateTimeField(null=True, blank=True)
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answered_appeals",
    )
    # SLA: javob 72 soatdan kechikkanmi (javob berilganda belgilanishi mumkin)
    answered_late = models.BooleanField(default=False, verbose_name="Kechikib javob")
    admin_note = models.TextField(blank=True, verbose_name="Ichki izoh (admin)")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.unique_code:
            for _ in range(8):
                code = secrets.token_hex(8)
                if not Appeal.objects.filter(unique_code=code).exclude(pk=self.pk).exists():
                    self.unique_code = code
                    break
            else:
                self.unique_code = secrets.token_hex(16)
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # QR async (Celery) yoki sync fallback
        if is_new and self.unique_code and not self.qr_code_image:
            try:
                from apps.office.tasks import generate_appeal_qr_code

                generate_appeal_qr_code.delay(str(self.pk))
            except Exception:
                try:
                    from apps.office.services import ensure_appeal_qr

                    ensure_appeal_qr(self)
                except Exception:
                    pass

    class Meta:
        db_table = "office_appeals"
        ordering = ["-created_at"]
        verbose_name = "Murojaat"
        verbose_name_plural = "Murojaatlar"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.subject[:40]} ({self.get_status_display()})"

    @property
    def sla_deadline(self):
        return self.created_at + timedelta(hours=SLA_HOURS)

    @property
    def is_overdue(self) -> bool:
        """Hali javob yo'q va 72 soat o'tgan."""
        if self.status in (self.Status.ANSWERED, self.Status.CLOSED) and self.answered_at:
            return False
        return timezone.now() > self.sla_deadline

    @property
    def hours_left(self) -> float | None:
        if self.status in (self.Status.ANSWERED, self.Status.CLOSED):
            return None
        delta = self.sla_deadline - timezone.now()
        return round(delta.total_seconds() / 3600, 1)

    def mark_answered(self, admin_user, text: str):
        now = timezone.now()
        self.answer_text = text
        self.answered_at = now
        self.answered_by = admin_user
        self.status = self.Status.ANSWERED
        self.answered_late = now > self.sla_deadline
        self.save(
            update_fields=[
                "answer_text",
                "answered_at",
                "answered_by",
                "status",
                "answered_late",
                "updated_at",
            ]
        )


class AppealAttachment(models.Model):
    class Kind(models.TextChoices):
        USER = "user", "Foydalanuvchi"
        ADMIN = "admin", "Admin javobi"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appeal = models.ForeignKey(
        Appeal, on_delete=models.CASCADE, related_name="attachments"
    )
    kind = models.CharField(
        max_length=10,
        choices=Kind.choices,
        default=Kind.USER,
        db_index=True,
        verbose_name="Turi",
    )
    file = models.FileField(upload_to=appeal_file_path, verbose_name="Fayl")
    original_name = models.CharField(max_length=255)
    size = models.PositiveIntegerField(default=0)
    content_type = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "office_appeal_attachments"
        ordering = ["created_at"]

    def __str__(self):
        return self.original_name
