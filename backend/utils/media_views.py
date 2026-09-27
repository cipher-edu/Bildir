"""
Xavfsiz media serve: user upload lar attachment sifatida (XSS oldini olish).
Murojaat fayllari faqat egasi yoki komplayens xodimi uchun.
"""
from __future__ import annotations

import mimetypes
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import FileResponse, Http404

STAFF_ROLES = {"admin", "superadmin", "audit_inspector"}


# Inline ko'rsatilishi mumkin bo'lgan xavfsiz tiplar (rasm/pdf)
INLINE_OK = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
}


def media_path_contained(root: str, candidate: str) -> bool:
    """Papka prefiksi emas, haqiqiy ichki yo'l. media va media_backup ajraladi."""
    root_real = os.path.realpath(root)
    cand_real = os.path.realpath(candidate)
    try:
        return os.path.commonpath([root_real, cand_real]) == root_real
    except ValueError:
        return False


def _request_user(request):
    from apps.users.authentication import CookieJWTAuthentication

    try:
        result = CookieJWTAuthentication().authenticate(request)
    except Exception:
        return None
    if not result:
        return None
    return result[0]


def _can_read_appeal_media(user, norm_path: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "role", None) in STAFF_ROLES:
        return True
    from apps.office.models import Appeal

    parts = norm_path.split("/")
    if len(parts) < 3 or parts[0] != "office" or parts[1] != "appeals":
        return False
    if parts[2] == "qr":
        base = parts[-1].rsplit(".", 1)[0]
        if not base.startswith("appeal_"):
            return False
        code = base[len("appeal_"):]
        return Appeal.objects.filter(unique_code=code, user=user).exists()
    try:
        return Appeal.objects.filter(pk=parts[2], user=user).exists()
    except (ValueError, ValidationError):
        return False


def safe_media_serve(request, path):
    """
    /media/* — office appeals va boshqa user content uchun
    Content-Disposition: attachment (HTML execute bo'lmasin).
    Rasmlar/PDF: inline + nosniff.
    """
    full = os.path.normpath(os.path.join(settings.MEDIA_ROOT, path))
    if not media_path_contained(str(settings.MEDIA_ROOT), full):
        raise Http404("Invalid path")

    norm = path.replace("\\", "/").lstrip("/")
    private = norm.startswith("office/appeals/")
    if private and not _can_read_appeal_media(_request_user(request), norm):
        raise Http404("Not found")

    if not os.path.isfile(full):
        raise Http404("Not found")

    ctype, _ = mimetypes.guess_type(full)
    ctype = ctype or "application/octet-stream"

    # User upload: appeals — doim attachment (XSS)
    force_attachment = path.replace("\\", "/").startswith("office/")

    response = FileResponse(open(full, "rb"), content_type=ctype)
    response["X-Content-Type-Options"] = "nosniff"
    response["X-Frame-Options"] = "DENY"
    fname = os.path.basename(full)

    if force_attachment or ctype not in INLINE_OK:
        response["Content-Disposition"] = f'attachment; filename="{fname}"'
    else:
        response["Content-Disposition"] = f'inline; filename="{fname}"'

    # HTML/JS hech qachon
    if ctype in ("text/html", "application/xhtml+xml", "image/svg+xml"):
        response["Content-Disposition"] = f'attachment; filename="{fname}"'
        response["Content-Type"] = "application/octet-stream"

    if private:
        response["Cache-Control"] = "private, no-store"
    else:
        response["Cache-Control"] = "public, max-age=3600"

    return response
