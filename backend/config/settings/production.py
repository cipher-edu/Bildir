"""
Bildir — Production Settings
"""
from decouple import Csv, config

from .base import *
from utils.cors_security import sanitize_cors_origins

DEBUG = False
JWT_COOKIE_SECURE = config("JWT_COOKIE_SECURE", default=True, cast=bool)
ALLOW_OPEN_REGISTRATION = False

ALLOWED_HOSTS = config(
    "DJANGO_ALLOWED_HOSTS",
    default="example.com",
    cast=Csv(),
)

# Explicit allowlist — hech qachon *
CORS_ALLOWED_ORIGINS = sanitize_cors_origins(
    list(
        config(
            "CORS_ALLOWED_ORIGINS",
            default="https://example.com",
            cast=Csv(),
        )
    ),
    allow_credentials=True,
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # majburiy o'chiq

CSRF_TRUSTED_ORIGINS = list(
    config(
        "CSRF_TRUSTED_ORIGINS",
        default=",".join(CORS_ALLOWED_ORIGINS) if CORS_ALLOWED_ORIGINS else "https://example.com",
        cast=Csv(),
    )
)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Docker/local da False; reverse-proxy HTTPS orqasida True
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False, cast=bool
)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=False, cast=bool)
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=True, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=True, cast=bool)
# JWT cookie productionda Secure
# (utils.jwt_security cookie_secure() DEBUG ga qarab ishlaydi — DEBUG=False → Secure)

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING"},
        "apps":   {"handlers": ["console"], "level": "INFO"},
    },
}


def _weak_secret(value: str) -> bool:
    text = (value or "").strip()
    if len(text) < 32:
        return True
    lowered = text.lower()
    markers = ("change-me", "dev-secret", "dev-jwt", "please-change", "not-for-production")
    return any(marker in lowered for marker in markers)


if _weak_secret(SECRET_KEY):
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY production uchun uzun va tasodifiy bo'lishi kerak."
    )

_signing = str(SIMPLE_JWT.get("SIGNING_KEY") or "")
if SIMPLE_JWT.get("ALGORITHM", "").startswith("HS") and _weak_secret(_signing):
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "HS256 uchun JWT_SECRET_KEY productionda uzun va tasodifiy bo'lishi kerak."
    )

for _survey_key in ("SURVEY_ENCRYPTION_KEY", "SURVEY_HMAC_KEY", "SURVEY_TOKEN_KEY"):
    if _weak_secret(config(_survey_key, default="")):
        from django.core.exceptions import ImproperlyConfigured

        raise ImproperlyConfigured(
            f"{_survey_key} productionda majburiy. SECRET_KEY dan hosila qilinmaydi."
        )
