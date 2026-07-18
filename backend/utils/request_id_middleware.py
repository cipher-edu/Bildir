"""
Request ID middleware
- Har bir HTTP so'rovga unique request_id biriktiradi
- X-Request-ID header'idan oladi (downstream'dan o'tib kelganda) yoki yangisini yaratadi
- Response header'iga X-Request-ID qo'yadi
- LogRecord kontekstiga uzatadi (utils.logging_filters)
"""
import logging
from utils.logging_filters import (
    new_request_id,
    set_request_context,
    _request_id_ctx,
    _user_id_ctx,
    _session_id_ctx,
)

logger = logging.getLogger("eduverify.middleware")


class RequestIDMiddleware:
    HEADER = "HTTP_X_REQUEST_ID"
    RESPONSE_HEADER = "X-Request-ID"
    MAX_LEN = 64

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Header'dan o'qiymiz yoki yangi yaratamiz
        incoming = request.META.get(self.HEADER, "")[: self.MAX_LEN]
        rid = incoming if incoming and incoming.replace("-", "").isalnum() else new_request_id()

        token_rid = _request_id_ctx.set(rid)
        token_uid = _user_id_ctx.set("-")
        token_sid = _session_id_ctx.set("-")
        request.request_id = rid

        try:
            response = self.get_response(request)
        finally:
            # User aniqlanganda update qilamiz (auth keyin ishlaydi)
            user = getattr(request, "user", None)
            if user is not None and getattr(user, "is_authenticated", False):
                _user_id_ctx.set(str(user.pk))

        response[self.RESPONSE_HEADER] = rid

        # ContextVar'larni qaytaramiz
        _request_id_ctx.reset(token_rid)
        _user_id_ctx.reset(token_uid)
        _session_id_ctx.reset(token_sid)
        return response
