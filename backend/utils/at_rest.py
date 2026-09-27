"""Qisqa matnni bazada AES-GCM bilan saqlash (whistle va shunga o‘xshash).

Kalit `WHISTLE_ENCRYPTION_KEY`, bo‘lmasa `SURVEY_ENCRYPTION_KEY`.
Ikkalasi ham yo‘q bo‘lsa, faqat DEBUG da SECRET_KEY dan hosila olinadi.
"""
from __future__ import annotations

import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

SEAL_PREFIX = "enc1:"


def _mix(raw: str, purpose: str) -> bytes:
    return hashlib.sha256(f"{raw}|{purpose}".encode("utf-8")).digest()


def _env_secret(name: str) -> str:
    raw = os.environ.get(name) or getattr(settings, name, "") or ""
    return str(raw).strip()


def text_key(purpose: str) -> bytes:
    for name in ("WHISTLE_ENCRYPTION_KEY", "SURVEY_ENCRYPTION_KEY"):
        secret = _env_secret(name)
        if secret:
            return _mix(secret, purpose)
    if settings.DEBUG:
        return _mix(str(settings.SECRET_KEY), purpose)
    raise ImproperlyConfigured(
        "WHISTLE_ENCRYPTION_KEY yoki SURVEY_ENCRYPTION_KEY productionda majburiy."
    )


def is_sealed(value: str | None) -> bool:
    return bool(value) and str(value).startswith(SEAL_PREFIX)


def seal_text(plain: str, *, purpose: str) -> str:
    if plain is None or plain == "":
        return plain or ""
    if is_sealed(plain):
        return plain
    nonce = os.urandom(12)
    ct = AESGCM(text_key(purpose)).encrypt(nonce, str(plain).encode("utf-8"), None)
    return SEAL_PREFIX + base64.b64encode(nonce + ct).decode("ascii")


def open_text(value: str | None, *, purpose: str) -> str:
    if not value:
        return ""
    if not is_sealed(value):
        return str(value)
    raw = base64.b64decode(str(value)[len(SEAL_PREFIX):].encode("ascii"))
    nonce, ct = raw[:12], raw[12:]
    plain = AESGCM(text_key(purpose)).decrypt(nonce, ct, None)
    return plain.decode("utf-8")
