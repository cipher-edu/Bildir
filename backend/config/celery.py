"""Celery application — auth-starter (Bildir)."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("auth_starter")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
