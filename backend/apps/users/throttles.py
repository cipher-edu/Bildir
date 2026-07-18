"""Refresh token uchun maxsus throttling."""
import hashlib

from rest_framework.throttling import SimpleRateThrottle


class RefreshTokenThrottle(SimpleRateThrottle):
    """Bitta refresh tokenning tez-tez qayta ishlatilishini cheklaydi
    (masalan, klientdagi retry-loop xatosi sabab) — boshqa foydalanuvchilarning
    tokenlariga ta'sir qilmaydi, chunki kalit har bir token qiymatiga xos."""

    scope = "token_refresh"

    def get_cache_key(self, request, view):
        token = request.data.get("refresh")
        if not token:
            return None
        ident = hashlib.sha256(token.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}
