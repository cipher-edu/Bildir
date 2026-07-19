"""
Yangiliklar moduli — landing va admin panel uchun.
Rich HTML body (CKEditor/TipTap dan keladi).
"""
from __future__ import annotations

import re
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def news_cover_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    return f"news/covers/{instance.id}.{ext}"


class NewsArticle(models.Model):
    """Mukammal yangilik / e'lon kartochkasi."""

    class Category(models.TextChoices):
        ANNOUNCEMENT = "announcement", "E'lon"
        EVENT = "event", "Tadbir"
        REGULATION = "regulation", "Normativ / tartib"
        ANTI_CORRUPTION = "anti_corruption", "Halollik / komplayens"
        GENERAL = "general", "Umumiy yangilik"

    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        PUBLISHED = "published", "Nashr qilingan"
        ARCHIVED = "archived", "Arxiv"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Sarlavha (uz default)")
    title_i18n = models.JSONField(
        default=dict, blank=True, verbose_name="Sarlavha tarjimalari (uz/ru/en/kaa)"
    )
    slug = models.SlugField(max_length=280, unique=True, blank=True, verbose_name="Slug")
    summary = models.TextField(
        max_length=600,
        blank=True,
        verbose_name="Qisqa tavsif (uz default)",
        help_text="Kartochka va SEO uchun 1–2 jumla",
    )
    summary_i18n = models.JSONField(
        default=dict, blank=True, verbose_name="Tavsif tarjimalari"
    )
    body = models.TextField(
        verbose_name="Asosiy matn HTML (uz default)",
        help_text="Rich-text muharrirdan keladigan HTML",
    )
    body_i18n = models.JSONField(
        default=dict, blank=True, verbose_name="Matn tarjimalari (HTML)"
    )
    cover = models.ImageField(
        upload_to=news_cover_path,
        null=True,
        blank=True,
        verbose_name="Muqova rasm",
    )
    category = models.CharField(
        max_length=32,
        choices=Category.choices,
        default=Category.GENERAL,
        db_index=True,
        verbose_name="Kategoriya",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        verbose_name="Holat",
    )
    is_featured = models.BooleanField(default=False, verbose_name="Asosiy / featured")
    is_pinned = models.BooleanField(default=False, verbose_name="Yuqoriga mahkamlangan")
    published_at = models.DateTimeField(
        null=True, blank=True, db_index=True, verbose_name="Nashr vaqti"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="news_articles",
        verbose_name="Muallif",
    )
    views_count = models.PositiveIntegerField(default=0, verbose_name="Ko'rishlar")
    meta_title = models.CharField(max_length=255, blank=True, verbose_name="SEO title")
    meta_title_i18n = models.JSONField(default=dict, blank=True)
    meta_description = models.CharField(
        max_length=320, blank=True, verbose_name="SEO description"
    )
    meta_description_i18n = models.JSONField(default=dict, blank=True)

    def localized(self, field: str, locale: str = "uz") -> str:
        from utils.i18n_fields import pick_i18n

        base = getattr(self, field, "") or ""
        i18n = getattr(self, f"{field}_i18n", None)
        return pick_i18n(base, i18n, locale)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "news_articles"
        ordering = ["-is_pinned", "-published_at", "-created_at"]
        verbose_name = "Yangilik"
        verbose_name_plural = "Yangiliklar"
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "yangilik"
            # O'zbek harflari uchun fallback
            if not base or base == "yangilik":
                base = re.sub(r"[^\w\s-]", "", self.title.lower())
                base = re.sub(r"[-\s]+", "-", base).strip("-") or "yangilik"
            slug = base[:240]
            n = 1
            while NewsArticle.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base[:230]}-{n}"
            self.slug = slug

        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        if self.status != self.Status.PUBLISHED:
            # draft/archived — published_at saqlanadi (qayta nashr uchun)
            pass

        super().save(*args, **kwargs)

    @property
    def is_public(self) -> bool:
        return self.status == self.Status.PUBLISHED
