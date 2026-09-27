"""
So'rovnoma javoblari uchun shifrlash va butunlik (integrity).

- AES-GCM: at-rest konfidensiallik (DB dump dan o'qib bo'lmasin)
- HMAC-SHA256: muhr — o'zgartirish aniqlanadi
- Participation token: bir martalik, faqat hash saqlanadi

Kalitlar DB da saqlanmaydi. Production: SURVEY_ENCRYPTION_KEY, SURVEY_HMAC_KEY,
SURVEY_TOKEN_KEY majburiy. SECRET_KEY hosilasi faqat DEBUG.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _material_key(secret: str, purpose: str, length: int = 32) -> bytes:
    material = f"{secret}|survey|{purpose}".encode("utf-8")
    return hashlib.sha256(material).digest()[:length]


def _derive_key(env_name: str, purpose: str, length: int = 32) -> bytes:
    """Env kaliti. Yo'q bo'lsa faqat DEBUG da SECRET_KEY hosilasi.

    Production da SECRET_KEY dan jim hosila qilinmaydi: placeholder kalit
    bazadagi javoblarni ochib berardi.
    """
    from django.core.exceptions import ImproperlyConfigured

    raw = os.environ.get(env_name) or getattr(settings, env_name, None)
    if raw:
        if isinstance(raw, bytes):
            data = raw
        else:
            try:
                data = base64.b64decode(raw)
            except Exception:
                data = str(raw).encode("utf-8")
        if len(data) >= length:
            return data[:length]
        return hashlib.sha256(data + purpose.encode()).digest()[:length]
    if not getattr(settings, "DEBUG", False):
        raise ImproperlyConfigured(
            f"{env_name} productionda majburiy. SECRET_KEY dan hosila qilinmaydi."
        )
    return _material_key(str(settings.SECRET_KEY), purpose, length)


def legacy_key(purpose: str, length: int = 32) -> bytes | None:
    """Bir martalik migratsiya. So'rov yo'lida ishlatilmaydi."""
    secret = (os.environ.get("SURVEY_LEGACY_SECRET") or "").strip()
    if not secret:
        return None
    return _material_key(secret, purpose, length)


def _enc_key() -> bytes:
    return _derive_key("SURVEY_ENCRYPTION_KEY", "aes-gcm-v1", 32)


def _hmac_key() -> bytes:
    return _derive_key("SURVEY_HMAC_KEY", "hmac-seal-v1", 32)


def _token_key() -> bytes:
    return _derive_key("SURVEY_TOKEN_KEY", "token-hmac-v1", 32)


def canonical_json(data: Any) -> bytes:
    """Barqaror JSON — hash/imzo uchun."""
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def content_hash(payload: dict) -> str:
    return hashlib.sha256(canonical_json(payload)).hexdigest()


def seal_payload(payload: dict) -> tuple[str, str]:
    """
    Returns (content_hash, signature_hex).
    """
    h = content_hash(payload)
    sig = hmac.new(_hmac_key(), h.encode("ascii"), hashlib.sha256).hexdigest()
    return h, sig


def verify_seal(payload: dict, expected_hash: str, signature: str) -> bool:
    h, sig = seal_payload(payload)
    return (
        hmac.compare_digest(h, expected_hash or "")
        and hmac.compare_digest(sig, signature or "")
    )


def encrypt_answers(answers: list | dict) -> str:
    """
    AES-GCM shifr. Natija: base64(nonce || ciphertext+tag).
    """
    plaintext = canonical_json(answers)
    nonce = os.urandom(12)
    ct = AESGCM(_enc_key()).encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ct).decode("ascii")


def _decrypt_with(key: bytes, blob: str) -> Any:
    raw = base64.b64decode(blob.encode("ascii"))
    nonce, ct = raw[:12], raw[12:]
    plaintext = AESGCM(key).decrypt(nonce, ct, None)
    return json.loads(plaintext.decode("utf-8"))


def decrypt_answers(blob: str) -> Any:
    return _decrypt_with(_enc_key(), blob)


def decrypt_answers_any(blob: str) -> Any:
    """Joriy kalit, bo'lmasa SURVEY_LEGACY_SECRET hosilasi. Faqat migratsiya."""
    try:
        return decrypt_answers(blob)
    except Exception:
        old = legacy_key("aes-gcm-v1")
        if old is None:
            raise
        return _decrypt_with(old, blob)


def issue_participation_token() -> str:
    """Clientga beriladigan bir martalik token (ochiq matn)."""
    return secrets.token_urlsafe(32)


def hash_participation_token(token: str) -> str:
    return hmac.new(_token_key(), token.encode("utf-8"), hashlib.sha256).hexdigest()


def participant_key(user_id, survey_id) -> str:
    """
    Foydalanuvchini qayta tanib bo'lmaydigan, lekin unique barmoq izi.
    track_participation=False da user FK o'chiriladi; qayta ovoz shu kalit orqali to'siladi.
    """
    msg = f"{survey_id}|{user_id}".encode("utf-8")
    return hmac.new(_token_key(), msg, hashlib.sha256).hexdigest()
