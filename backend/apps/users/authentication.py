"""
JWT autentifikatsiya:
1) Authorization: Bearer <access>
2) httpOnly cookie bildir_access
3) denylist tekshiruvi (logout revokatsiyasi)
"""
from __future__ import annotations

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from utils.jwt_security import ACCESS_COOKIE, is_access_denylisted
from utils.session_epoch import token_epoch_ok


class CookieJWTAuthentication(JWTAuthentication):
    """Bearer yoki httpOnly cookie orqali JWT + denylist."""

    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None

        if header is not None:
            raw_token = self.get_raw_token(header)
        if raw_token is None:
            cookie_val = request.COOKIES.get(ACCESS_COOKIE)
            if cookie_val:
                raw_token = cookie_val

        if raw_token is None:
            return None

        validated = self.get_validated_token(raw_token)
        return self.get_user(validated), validated

    def get_validated_token(self, raw_token):
        validated = super().get_validated_token(raw_token)
        jti = validated.get(settings.SIMPLE_JWT.get("JTI_CLAIM", "jti"))
        if is_access_denylisted(jti):
            raise InvalidToken("Token revoked (logout).")
        user_id = validated.get(settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id"))
        if not token_epoch_ok(user_id, validated.get("epoch")):
            raise InvalidToken("Session expired.")
        return validated
