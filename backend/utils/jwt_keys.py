"""
JWT RS256 key management.
- Private key (signing) — Vault'dan yoki fayldan (/etc/eduverify/keys/jwt_private.pem)
- Public key (verify)   — Frontend va boshqa servislarga ham tarqatish mumkin
- Key rotation: kid (key id) header'i orqali
"""
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("eduverify.jwt")

_PRIVATE_KEY_CACHE: Optional[str] = None
_PUBLIC_KEY_CACHE:  Optional[str] = None
_KID_CACHE:         Optional[str] = None


def _read_file(path: str) -> Optional[str]:
    try:
        return Path(path).read_text(encoding="utf-8")
    except OSError:
        return None


def get_private_key() -> str:
    """JWT signing uchun private key (RS256)."""
    global _PRIVATE_KEY_CACHE
    if _PRIVATE_KEY_CACHE:
        return _PRIVATE_KEY_CACHE

    # 1) Vault
    try:
        from utils.vault_client import vault
        if vault.enabled:
            pem = vault.get("eduverify/django", "jwt_private_key")
            if pem:
                _PRIVATE_KEY_CACHE = pem
                return pem
    except Exception as e:
        logger.warning("Vault'dan JWT key o'qib bo'lmadi: %s", e)

    # 2) Fayl tizimi (production'da k8s secret mount)
    path = os.environ.get("JWT_PRIVATE_KEY_PATH", "/etc/eduverify/keys/jwt_private.pem")
    pem = _read_file(path)
    if pem:
        _PRIVATE_KEY_CACHE = pem
        return pem

    # 3) Env (dev/CI uchun, PEM single-line bilan \n encoded)
    raw = os.environ.get("JWT_PRIVATE_KEY", "")
    if raw:
        _PRIVATE_KEY_CACHE = raw.replace("\\n", "\n")
        return _PRIVATE_KEY_CACHE

    raise RuntimeError(
        "JWT private key topilmadi: Vault, JWT_PRIVATE_KEY_PATH yoki JWT_PRIVATE_KEY env kerak"
    )


def get_public_key() -> str:
    """JWT verify uchun public key."""
    global _PUBLIC_KEY_CACHE
    if _PUBLIC_KEY_CACHE:
        return _PUBLIC_KEY_CACHE

    try:
        from utils.vault_client import vault
        if vault.enabled:
            pem = vault.get("eduverify/django", "jwt_public_key")
            if pem:
                _PUBLIC_KEY_CACHE = pem
                return pem
    except Exception:
        pass

    path = os.environ.get("JWT_PUBLIC_KEY_PATH", "/etc/eduverify/keys/jwt_public.pem")
    pem = _read_file(path)
    if pem:
        _PUBLIC_KEY_CACHE = pem
        return pem

    raw = os.environ.get("JWT_PUBLIC_KEY", "")
    if raw:
        _PUBLIC_KEY_CACHE = raw.replace("\\n", "\n")
        return _PUBLIC_KEY_CACHE

    raise RuntimeError("JWT public key topilmadi")


def get_kid() -> str:
    """Key ID — rotatsiyada eski/yangi kalitlarni farqlash uchun."""
    global _KID_CACHE
    if _KID_CACHE:
        return _KID_CACHE
    _KID_CACHE = os.environ.get("JWT_KEY_ID", "primary")
    return _KID_CACHE
