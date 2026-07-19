import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ComplianceRisk",
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
                ("title", models.CharField(max_length=255)),
                ("title_i18n", models.JSONField(blank=True, default=dict)),
                ("description", models.TextField(blank=True)),
                ("description_i18n", models.JSONField(blank=True, default=dict)),
                (
                    "level",
                    models.CharField(
                        choices=[
                            ("low", "Past"),
                            ("medium", "O'rta"),
                            ("high", "Yuqori"),
                            ("critical", "Kritik"),
                        ],
                        default="medium",
                        max_length=16,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Ochiq"),
                            ("in_progress", "Jarayonda"),
                            ("closed", "Yopilgan"),
                        ],
                        default="open",
                        max_length=16,
                    ),
                ),
                ("owner_name", models.CharField(blank=True, max_length=200)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_risks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "compliance_risks",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="WhistleReport",
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
                (
                    "tracking_code",
                    models.CharField(db_index=True, max_length=16, unique=True),
                ),
                ("message", models.TextField()),
                ("context", models.CharField(blank=True, max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "Yangi"),
                            ("reviewing", "Ko'rib chiqilmoqda"),
                            ("closed", "Yopilgan"),
                        ],
                        default="new",
                        max_length=16,
                    ),
                ),
                ("admin_note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "compliance_whistle_reports",
                "ordering": ["-created_at"],
            },
        ),
    ]
