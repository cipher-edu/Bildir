"""
auth-starter — Development Settings
"""
from decouple import Csv, config
from .base import *

DEBUG = True
JWT_COOKIE_SECURE = False
ALLOW_OPEN_REGISTRATION = True

ALLOWED_HOSTS = config(
    "DJANGO_ALLOWED_HOSTS",
    default="localhost,127.0.0.1,0.0.0.0,backend",
    cast=Csv(),
)

from utils.cors_security import sanitize_cors_origins

CORS_ALLOWED_ORIGINS = sanitize_cors_origins(
    list(
        config(
            "CORS_ALLOWED_ORIGINS",
            default="http://localhost:3000,http://127.0.0.1:3000",
            cast=Csv(),
        )
    ),
    allow_credentials=True,
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# SQLite WAL — parallel o'qish/yozish (runserver + sync)
from django.db.backends.signals import connection_created


def _sqlite_on_connect(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        cursor = connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=60000;")
        cursor.execute("PRAGMA synchronous=NORMAL;")


connection_created.connect(_sqlite_on_connect)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO",  "propagate": False},
        "apps":   {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
