"""
HashiCorp Vault client wrapper.

Foydalanish:
    from utils.vault_client import vault
    secret = vault.get("eduverify/django", "secret_key")

Production'da Django settings ichida ishlatiladi:
    SECRET_KEY = vault.get("eduverify/django", "secret_key")

Agar Vault mavjud bo'lmasa (dev/CI), fallback env'dan o'qiydi.
"""
import logging
import os
import threading
import time
from typing import Optional

import requests

logger = logging.getLogger("eduverify.vault")


class VaultClient:
    """
    Thread-safe Vault client.
    Token TTL ga yaqinlashganda avtomatik renew qiladi.
    AppRole auth: VAULT_ROLE_ID + VAULT_SECRET_ID env'lardan.
    """

    def __init__(self) -> None:
        self.addr   = os.environ.get("VAULT_ADDR", "http://vault:8200").rstrip("/")
        self._role_id   = os.environ.get("VAULT_ROLE_ID", "")
        self._secret_id = os.environ.get("VAULT_SECRET_ID", "")
        self._lock = threading.Lock()
        self._token: Optional[str] = None
        self._token_expires_at: float = 0
        self._cache: dict[tuple[str, str], tuple[float, str]] = {}
        self._cache_ttl = 300  # 5 daqiqa

    @property
    def enabled(self) -> bool:
        return bool(self._role_id and self._secret_id)

    def _login(self) -> None:
        if not self.enabled:
            raise RuntimeError("Vault AppRole credentials yo'q (VAULT_ROLE_ID, VAULT_SECRET_ID)")

        r = requests.post(
            f"{self.addr}/v1/auth/approle/login",
            json={"role_id": self._role_id, "secret_id": self._secret_id},
            timeout=5,
        )
        r.raise_for_status()
        auth = r.json()["auth"]
        self._token = auth["client_token"]
        self._token_expires_at = time.time() + auth["lease_duration"] - 60
        logger.info("Vault login muvaffaqiyatli, TTL=%ss", auth["lease_duration"])

    def _ensure_token(self) -> str:
        with self._lock:
            if not self._token or time.time() >= self._token_expires_at:
                self._login()
            return self._token  # type: ignore[return-value]

    def get(self, path: str, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        KV v2 dan sir o'qiydi.
        path: 'eduverify/django' (mount/path)
        key:  'secret_key'
        """
        if not self.enabled:
            # Fallback — env'dan
            env_key = f"{path.replace('/', '_').upper()}_{key.upper()}"
            return os.environ.get(env_key, default)

        cache_key = (path, key)
        cached = self._cache.get(cache_key)
        if cached and cached[0] > time.time():
            return cached[1]

        try:
            token = self._ensure_token()
            mount, _, sub = path.partition("/")
            r = requests.get(
                f"{self.addr}/v1/{mount}/data/{sub}",
                headers={"X-Vault-Token": token},
                timeout=5,
            )
            r.raise_for_status()
            value = r.json()["data"]["data"].get(key)
            if value is None:
                return default
            self._cache[cache_key] = (time.time() + self._cache_ttl, value)
            return value
        except Exception as e:
            logger.warning("Vault o'qish xatosi (%s/%s): %s", path, key, e)
            return default

    def encrypt(self, key_name: str, plaintext_b64: str) -> str:
        """Transit engine — field-level encryption (PII uchun)."""
        if not self.enabled:
            raise RuntimeError("Vault transit engine ishlatish uchun Vault yoqilgan bo'lishi kerak")
        token = self._ensure_token()
        r = requests.post(
            f"{self.addr}/v1/transit/encrypt/{key_name}",
            headers={"X-Vault-Token": token},
            json={"plaintext": plaintext_b64},
            timeout=5,
        )
        r.raise_for_status()
        return r.json()["data"]["ciphertext"]

    def decrypt(self, key_name: str, ciphertext: str) -> str:
        token = self._ensure_token()
        r = requests.post(
            f"{self.addr}/v1/transit/decrypt/{key_name}",
            headers={"X-Vault-Token": token},
            json={"ciphertext": ciphertext},
            timeout=5,
        )
        r.raise_for_status()
        return r.json()["data"]["plaintext"]


# Singleton — settings.py va tasks'lar ishlatadi
vault = VaultClient()
