"""
JWT cookie + access denylist (logout revokatsiyasi).

- Access / refresh: httpOnly cookie (XSS dan himoya)
- Logout: refresh blacklist + access jti denylist (cache/Redis)
"""
from __future__ import annotations

from datetime import datetime, timezone as dt_tz

from django.conf import settings
from django.core.cache import cache
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken


ACCESS_COOKIE = getattr(settings, "JWT_ACCESS_COOKIE", "bildir_access")
REFRESH_COOKIE = getattr(settings, "JWT_REFRESH_COOKIE", "bildir_refresh")
DENYLIST_PREFIX = "jwt_denylist:"


def access_max_age() -> int:
    lt = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    return int(lt.total_seconds())


def refresh_max_age() -> int:
    lt = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    return int(lt.total_seconds())


def cookie_secure() -> bool:
    return not getattr(settings, "DEBUG", True)


def cookie_samesite() -> str:
    return getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")


def set_jwt_cookies(response, access: str, refresh: str | None = None):
    """DRF/Django Response ga httpOnly cookie yozadi."""
    common = {
        "httponly": True,
        "secure": cookie_secure(),
        "samesite": cookie_samesite(),
        "path": "/",
    }
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=access_max_age(),
        **common,
    )
    if refresh:
        response.set_cookie(
            REFRESH_COOKIE,
            refresh,
            max_age=refresh_max_age(),
            **common,
        )
    return response


def clear_jwt_cookies(response):
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return response


def denylist_access_token(raw_access: str | None) -> bool:
    """
    Access token jti ni muddati tugaguncha denylist ga qo'yadi.
    True — muvaffaqiyatli yozildi.
    """
    if not raw_access:
        return False
    try:
        token = AccessToken(raw_access)
    except Exception:
        return False
    jti = token.get("jti")
    if not jti:
        return False
    exp = token.get("exp")
    ttl = 60
    if exp:
        now = int(datetime.now(dt_tz.utc).timestamp())
        ttl = max(1, int(exp) - now)
    cache.set(f"{DENYLIST_PREFIX}{jti}", "1", timeout=ttl)
    return True


def is_access_denylisted(jti: str | None) -> bool:
    if not jti:
        return False
    return bool(cache.get(f"{DENYLIST_PREFIX}{jti}"))


def blacklist_refresh(raw_refresh: str | None) -> bool:
    if not raw_refresh:
        return False
    try:
        RefreshToken(raw_refresh).blacklist()
        return True
    except Exception:
        return False


def extract_access_from_request(request) -> str | None:
    """Authorization Bearer yoki access cookie."""
    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    return request.COOKIES.get(ACCESS_COOKIE) or None


def extract_refresh_from_request(request) -> str | None:
    data = getattr(request, "data", None) or {}
    if isinstance(data, dict) and data.get("refresh"):
        return str(data.get("refresh"))
    return request.COOKIES.get(REFRESH_COOKIE) or None
