"""
OsiyoNigohi — WebSocket uchun JWT autentifikatsiya middleware.

API butunlay JWT (rest_framework_simplejwt) orqali ishlaydi — hech qayerda
Django session login() chaqirilmaydi, shu sabab standart
`channels.auth.AuthMiddlewareStack` (session cookiega tayanadi) doim
AnonymousUser qaytaradi va har bir WebSocket ulanish 4401 bilan rad etiladi.
Bu middleware query-string dagi `?token=<access_token>` orqali JWT ni
tekshiradi va scope["user"] ni to'g'ri to'ldiradi.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _authenticate(raw_token: str):
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

    try:
        validated_token = JWTAuthentication().get_validated_token(raw_token)
        return JWTAuthentication().get_user(validated_token)
    except (TokenError, InvalidToken):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        params = parse_qs(scope.get("query_string", b"").decode())
        token = params.get("token", [None])[0]
        scope["user"] = await _authenticate(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
