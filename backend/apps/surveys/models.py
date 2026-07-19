"""
Surveys domain — xavfsiz so'rovnoma modellari (bounded context).

Suhbat xulosasi:
  - privacy_mode: open | anonymous
  - anonymous: ishtirok (kim) ochiq, javob (nima) user bilan bog'lanmagan
  - 1 odam = 1 ishtirok (SurveyParticipation)
  - javoblar muhrlangan (hash + HMAC) va at-rest shifrlangan (AES-GCM)
  - targeting: audience + fakultet/yo'nalish/guruh/kurs
  - 7 savol turi, UUID, QR

Mikroservis chegarasi: faqat users.User va core katalogga FK.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Survey(models.Model):
    """So'rovnoma — admin yaratadi, nashr qiladi, QR bilan tarqatadi."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        PUBLISHED = "published", "Nashr qilingan"
        CLOSED = "closed", "Yopilgan"
        ARCHIVED = "archived", "Arxiv"

    class Audience(models.TextChoices):
        STUDENTS = "students", "Talabalar"
        STAFF = "staff", "Xodimlar / o'qituvchilar"
        ALL = "all", "Hammasi"

    class PrivacyMode(models.TextChoices):
        OPEN = "open", "Ochiq (javob ↔ shaxs bog'lanadi)"
        ANONYMOUS = "anonymous", "Anonim (ishtirok ochiq, javob unlink)"

    class StatsLevel(models.TextChoices):
        NONE = "none", "Faqat umumiy"
        COARSE = "coarse", "Fakultet + kurs"
        DETAILED = "detailed", "Yo'nalishgacha"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university = models.ForeignKey(
        "core.University",
        on_delete=models.CASCADE,
        related_name="surveys",
        null=True,
        blank=True,
        verbose_name="Universitet",
    )
    title = models.CharField(max_length=300, verbose_name="Sarlavha")
    title_i18n = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True, verbose_name="Tavsif")
    description_i18n = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    audience = models.CharField(
        max_length=20,
        choices=Audience.choices,
        default=Audience.ALL,
        verbose_name="Auditoriya",
    )
    privacy_mode = models.CharField(
        max_length=20,
        choices=PrivacyMode.choices,
        default=PrivacyMode.ANONYMOUS,
        verbose_name="Maxfiylik rejimi",
        help_text="Publish dan keyin o'zgarmaydi",
    )
    stats_level = models.CharField(
        max_length=20,
        choices=StatsLevel.choices,
        default=StatsLevel.COARSE,
        verbose_name="Statistika darajasi",
    )
    min_n_for_breakdown = models.PositiveSmallIntegerField(
        default=10,
        verbose_name="Kesim uchun minimal n (k-anonymity)",
    )
    store_group_meta = models.BooleanField(
        default=False,
        verbose_name="Guruh meta (anonimda default o'chiq)",
    )
    track_participation = models.BooleanField(
        default=True,
        verbose_name="Ishtirokni kuzatish (kim topshirgan)",
    )

    start_at = models.DateTimeField(null=True, blank=True, verbose_name="Boshlanish")
    end_at = models.DateTimeField(null=True, blank=True, verbose_name="Tugash")

    # Targeting — bo'sh M2M = auditoriyadagi hamma
    faculties = models.ManyToManyField(
        "core.Faculty", blank=True, related_name="surveys", verbose_name="Fakultetlar"
    )
    specialties = models.ManyToManyField(
        "core.Specialty", blank=True, related_name="surveys", verbose_name="Yo'nalishlar"
    )
    groups = models.ManyToManyField(
        "core.StudyGroup", blank=True, related_name="surveys", verbose_name="Guruhlar"
    )
    study_years = models.JSONField(
        default=list,
        blank=True,
        help_text="Masalan [1,2,3]. Bo'sh = barcha kurslar",
        verbose_name="Kurslar",
    )

    qr_image = models.ImageField(
        upload_to="surveys/qr/%Y/%m/",
        null=True,
        blank=True,
        verbose_name="QR kod",
    )
    public_path = models.CharField(
        max_length=200,
        blank=True,
        help_text="/s/{uuid} — frontend yo'li",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_surveys",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "surveys"
        ordering = ["-created_at"]
        verbose_name = "So'rovnoma"
        verbose_name_plural = "So'rovnomalar"
        indexes = [
            models.Index(fields=["status", "start_at", "end_at"]),
            models.Index(fields=["privacy_mode", "status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    @property
    def public_url(self) -> str:
        base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        path = self.public_path or f"/s/{self.id}"
        return f"{base}{path}"

    def is_within_schedule(self, now=None) -> bool:
        now = now or timezone.now()
        if self.start_at and now < self.start_at:
            return False
        if self.end_at and now > self.end_at:
            return False
        return True

    def can_accept_responses(self) -> bool:
        return self.status == self.Status.PUBLISHED and self.is_within_schedule()

    def clean(self):
        if self.start_at and self.end_at and self.start_at >= self.end_at:
            raise ValidationError({"end_at": "Tugash vaqti boshlanishdan keyin bo'lishi kerak."})


class SurveyQuestion(models.Model):
    """So'rovnoma savoli — 7 tur."""

    class QType(models.TextChoices):
        SINGLE = "single", "Bir tanlov"
        MULTIPLE = "multiple", "Ko'p tanlov"
        TEXT = "text", "Yozma (qisqa)"
        TEXTAREA = "textarea", "Yozma (batafsil)"
        RATING = "rating", "Yulduz"
        NPS = "nps", "NPS (0–10)"
        LIKERT = "likert", "Likert shkala"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="questions"
    )
    order = models.PositiveSmallIntegerField(default=0)
    q_type = models.CharField(max_length=20, choices=QType.choices)
    text = models.TextField(verbose_name="Savol matni")
    text_i18n = models.JSONField(default=dict, blank=True)
    help_text = models.CharField(max_length=500, blank=True)
    help_text_i18n = models.JSONField(default=dict, blank=True)
    required = models.BooleanField(default=True)
    # single/multiple: [{"id": "uuid", "text": "...", "text_i18n": {...}, "order": 0}]
    options = models.JSONField(default=list, blank=True)
    # rating: {min, max}, multiple: {min_select, max_select}, text: {max_length}
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "survey_questions"
        ordering = ["order", "created_at"]
        verbose_name = "Savol"
        verbose_name_plural = "Savollar"
        indexes = [
            models.Index(fields=["survey", "order"]),
        ]

    def __str__(self):
        return f"Q{self.order}: {self.text[:60]}"


class SurveyParticipation(models.Model):
    """
    Ishtirok yozuvi.
    - track_participation=True: user saqlanadi (admin kimligini ko'radi)
    - track_participation=False: submit dan keyin user=NULL (DB da anonim),
      participant_key orqali 1 odam = 1 ovoz (qayta tanib bo'lmaydi).
    Javob matni bu jadvalda yo'q.
    """

    class Status(models.TextChoices):
        STARTED = "started", "Boshlangan"
        SUBMITTED = "submitted", "Topshirilgan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="participations"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_participations",
    )
    # HMAC(user|survey) — user o'chirilganda ham unique qayta ovoz to'sig'i
    participant_key = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="Pseudonim barmoq izi — shaxsga reverse qilib bo'lmaydi",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.STARTED,
        db_index=True,
    )
    # Bir martalik token — faqat hash saqlanadi
    token_hash = models.CharField(max_length=64, blank=True, db_index=True)
    token_used = models.BooleanField(default=False)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    started_at = models.DateTimeField(auto_now_add=True)
    # Qo'pol vaqt (soniyasiz juftlashni qiyinlashtirish) — submitted da soat/kun
    submitted_day = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "survey_participations"
        verbose_name = "Ishtirok"
        verbose_name_plural = "Ishtiroklar"
        constraints = [
            models.UniqueConstraint(
                fields=["survey", "participant_key"],
                name="uniq_survey_participation_key",
            ),
        ]
        indexes = [
            models.Index(fields=["survey", "status"]),
            models.Index(fields=["survey", "user"]),
        ]

    def __str__(self):
        who = self.user_id or ((self.participant_key[:8] + "…") if self.participant_key else "?")
        return f"{who} @ {self.survey_id} ({self.status})"


class SurveyResponse(models.Model):
    """
    Javob yozuvi — muhrlangan va shifrlangan.
    anonymous: respondent=NULL, meta faqat stats_level bo'yicha.
    open: respondent to'ldiriladi.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="responses"
    )
    # Faqat privacy_mode=open da to'ldiriladi
    respondent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_responses",
    )
    # Anonim/open uchun demografik snapshot (k-anonymity siyasati bilan)
    meta = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"faculty_id": "...", "study_year": 2} — guruh default yo\'q',
    )

    # AES-GCM ciphertext (base64)
    answers_encrypted = models.TextField(verbose_name="Shifrlangan javoblar")
    content_hash = models.CharField(max_length=64, verbose_name="SHA-256")
    signature = models.CharField(max_length=64, verbose_name="HMAC imzo")
    is_sealed = models.BooleanField(default=True)
    seal_version = models.PositiveSmallIntegerField(default=1)

    # Qo'pol vaqt — soniya saqlanmaydi (unlink)
    submitted_bucket = models.DateTimeField(
        help_text="Soat boshiga yaxlitlangan vaqt",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "survey_responses"
        ordering = ["-created_at"]
        verbose_name = "Javob"
        verbose_name_plural = "Javoblar"
        indexes = [
            models.Index(fields=["survey", "submitted_bucket"]),
        ]

    def __str__(self):
        return f"Response {self.id} ({self.survey_id})"

    def save(self, *args, **kwargs):
        # Muhrlangan yozuv — faqat INSERT; UPDATE taqiqlanadi
        if not self._state.adding and self.is_sealed:
            raise ValidationError(
                "Muhrlangan so'rovnoma javobini o'zgartirish mumkin emas."
            )
        super().save(*args, **kwargs)
