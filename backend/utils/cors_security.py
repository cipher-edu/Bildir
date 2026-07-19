"""
CORS sozlamalarini xavfsizlik jihatidan tekshirish.
Credentials=True bo'lganda wildcard (*) taqiqlanadi.
"""
from __future__ import annotations

import logging
import warnings

logger = logging.getLogger("auth_starter.cors")


def normalize_origins(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        items = [x.strip() for x in raw.split(",") if x.strip()]
    else:
        items = [str(x).strip() for x in raw if str(x).strip()]
    return items


def sanitize_cors_origins(origins: list[str], *, allow_credentials: bool = True) -> list[str]:
    """
    * va bo'sh qiymatlarni olib tashlaydi.
    Credentials bilan * mutlaqo taqiqlanadi.
    """
    cleaned: list[str] = []
    for o in origins:
        if not o or o == "*":
            msg = (
                "CORS_ALLOWED_ORIGINS da '*' yoki bo'sh qiymat topildi — "
                "CORS_ALLOW_CREDENTIALS=True bilan xavfsiz emas, o'tkazib yuborildi."
            )
            logger.warning(msg)
            warnings.warn(msg, RuntimeWarning, stacklevel=2)
            continue
        if not (o.startswith("http://") or o.startswith("https://")):
            msg = f"CORS origin noto'g'ri sxema (http/https kerak): {o!r}"
            logger.warning(msg)
            continue
        cleaned.append(o.rstrip("/"))
    return cleaned


def apply_secure_cors(settings_module):
    """settings.py oxirida chaqiriladi."""
    allow_cred = getattr(settings_module, "CORS_ALLOW_CREDENTIALS", False)
    origins = normalize_origins(getattr(settings_module, "CORS_ALLOWED_ORIGINS", []))
    settings_module.CORS_ALLOWED_ORIGINS = sanitize_cors_origins(
        origins, allow_credentials=allow_cred
    )
    # Hech qachon credentials bilan allow all
    if allow_cred and getattr(settings_module, "CORS_ALLOW_ALL_ORIGINS", False):
        logger.error(
            "CORS_ALLOW_ALL_ORIGINS=True + CREDENTIALS=True — xavfli. "
            "CORS_ALLOW_ALL_ORIGINS o'chirilmoqda."
        )
        settings_module.CORS_ALLOW_ALL_ORIGINS = False
