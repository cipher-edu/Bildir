"""
Xavfsiz media serve: user upload lar attachment sifatida (XSS oldini olish).
"""
from __future__ import annotations

import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404


# Inline ko'rsatilishi mumkin bo'lgan xavfsiz tiplar (rasm/pdf)
INLINE_OK = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
}


def safe_media_serve(request, path):
    """
    /media/* — office appeals va boshqa user content uchun
    Content-Disposition: attachment (HTML execute bo'lmasin).
    Rasmlar/PDF: inline + nosniff.
    """
    # path traversal himoya django_serve da bor
    full = os.path.normpath(os.path.join(settings.MEDIA_ROOT, path))
    media_root = os.path.normpath(str(settings.MEDIA_ROOT))
    if not full.startswith(media_root):
        raise Http404("Invalid path")

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

    return response
