"""
Auth endpoint throttling — brute-force va abuse himoyasi.

Scope lar (DEFAULT_THROTTLE_RATES da sozlanadi):
  login          — IP bo'yicha login/SSO (qat'iy)
  login_account  — email/login bo'yicha (akkaunt hujumi)
  token_refresh  — refresh token qiymati bo'yicha
  forgot_password — parol tiklash
  anon / user    — global (ixtiyoriy DEFAULT_THROTTLE_CLASSES)
"""
from __future__ import annotations

import hashlib

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class RefreshTokenThrottle(SimpleRateThrottle):
    """Bitta refresh tokenning tez-tez qayta ishlatilishini cheklaydi."""

    scope = "token_refresh"

    def get_cache_key(self, request, view):
        token = None
        if hasattr(request, "data"):
            token = request.data.get("refresh")
        if not token:
            token = request.COOKIES.get("bildir_refresh")
        if not token:
            return self.get_ident(request)  # IP fallback
        ident = hashlib.sha256(str(token).encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginIPThrottle(SimpleRateThrottle):
    """Login / HEMIS SSO — IP bo'yicha (masalan 10/min)."""

    scope = "login"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginAccountThrottle(SimpleRateThrottle):
    """
    Bir email yoki HEMIS login bo'yicha cheklov (masalan 20/hour).
    IP o'zgartirib ham bir akkauntni bosib ketishni qiyinlashtiradi.
    """

    scope = "login_account"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        data = getattr(request, "data", {}) or {}
        ident = (
            (data.get("email") or data.get("login") or "")
            .strip()
            .lower()
        )
        if not ident:
            return None
        digest = hashlib.sha256(ident.encode("utf-8")).hexdigest()[:32]
        return self.cache_format % {"scope": self.scope, "ident": digest}


class WhistleCreateThrottle(SimpleRateThrottle):
    """Anonim xabar — IP bo'yicha. Umumiy anon limitidan qat'iyroq."""

    scope = "whistle"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class ForgotPasswordThrottle(SimpleRateThrottle):
    """Parol tiklash — IP bo'yicha."""

    scope = "forgot_password"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class BurstAnonThrottle(AnonRateThrottle):
    """Anonim umumiy cheklov (API abuse)."""

    scope = "anon"


class BurstUserThrottle(UserRateThrottle):
    """Autentifikatsiyalangan umumiy cheklov."""

    scope = "user"
