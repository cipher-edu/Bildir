import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.news.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NewsArticle",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=255, verbose_name="Sarlavha")),
                (
                    "slug",
                    models.SlugField(blank=True, max_length=280, unique=True, verbose_name="Slug"),
                ),
                (
                    "summary",
                    models.TextField(
                        blank=True,
                        help_text="Kartochka va SEO uchun 1–2 jumla",
                        max_length=600,
                        verbose_name="Qisqa tavsif",
                    ),
                ),
                (
                    "body",
                    models.TextField(
                        help_text="Rich-text muharrirdan keladigan HTML",
                        verbose_name="Asosiy matn (HTML)",
                    ),
                ),
                (
                    "cover",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to=apps.news.models.news_cover_path,
                        verbose_name="Muqova rasm",
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("announcement", "E'lon"),
                            ("event", "Tadbir"),
                            ("regulation", "Normativ / tartib"),
                            ("anti_corruption", "Halollik / komplayens"),
                            ("general", "Umumiy yangilik"),
                        ],
                        db_index=True,
                        default="general",
                        max_length=32,
                        verbose_name="Kategoriya",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Qoralama"),
                            ("published", "Nashr qilingan"),
                            ("archived", "Arxiv"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=16,
                        verbose_name="Holat",
                    ),
                ),
                (
                    "is_featured",
                    models.BooleanField(default=False, verbose_name="Asosiy / featured"),
                ),
                (
                    "is_pinned",
                    models.BooleanField(default=False, verbose_name="Yuqoriga mahkamlangan"),
                ),
                (
                    "published_at",
                    models.DateTimeField(
                        blank=True,
                        db_index=True,
                        null=True,
                        verbose_name="Nashr vaqti",
                    ),
                ),
                (
                    "views_count",
                    models.PositiveIntegerField(default=0, verbose_name="Ko'rishlar"),
                ),
                (
                    "meta_title",
                    models.CharField(blank=True, max_length=255, verbose_name="SEO title"),
                ),
                (
                    "meta_description",
                    models.CharField(
                        blank=True, max_length=320, verbose_name="SEO description"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="news_articles",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Muallif",
                    ),
                ),
            ],
            options={
                "verbose_name": "Yangilik",
                "verbose_name_plural": "Yangiliklar",
                "db_table": "news_articles",
                "ordering": ["-is_pinned", "-published_at", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="newsarticle",
            index=models.Index(
                fields=["status", "-published_at"], name="news_articl_status_7c0a8d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="newsarticle",
            index=models.Index(
                fields=["category", "status"], name="news_articl_categor_1e0d2f_idx"
            ),
        ),
    ]
