"""
Risk reestri va anonim xabar (whistleblowing).
Email/Telegram talab qilinmaydi.
"""
from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.db import models


class ComplianceRisk(models.Model):
    class Level(models.TextChoices):
        LOW = "low", "Past"
        MEDIUM = "medium", "O'rta"
        HIGH = "high", "Yuqori"
        CRITICAL = "critical", "Kritik"

    class Status(models.TextChoices):
        OPEN = "open", "Ochiq"
        IN_PROGRESS = "in_progress", "Jarayonda"
        CLOSED = "closed", "Yopilgan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    title_i18n = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    description_i18n = models.JSONField(default=dict, blank=True)
    level = models.CharField(max_length=16, choices=Level.choices, default=Level.MEDIUM)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    owner_name = models.CharField(max_length=200, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_risks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_risks"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class WhistleReport(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Yangi"
        REVIEWING = "reviewing", "Ko'rib chiqilmoqda"
        CLOSED = "closed", "Yopilgan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(max_length=16, unique=True, db_index=True)
    message = models.TextField()
    # ixtiyoriy kontekst (fakultet va h.k.) — identifikatsiyasiz
    context = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_whistle_reports"
        ordering = ["-created_at"]

    def __str__(self):
        return self.tracking_code

    @staticmethod
    def generate_code() -> str:
        return secrets.token_hex(4).upper()
