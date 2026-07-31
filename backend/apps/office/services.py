"""Office domain yordamchilari — murojaat QR va boshqalar."""
from __future__ import annotations

import io
import logging

from django.core.files.base import ContentFile
from django.conf import settings

logger = logging.getLogger("auth_starter.office")


def generate_qr_image(payload: str) -> ContentFile:
    import qrcode

    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ContentFile(buf.read(), name="qr.png")


def appeal_public_ref(appeal) -> str:
    """QR ichidagi matn — frontend tracking."""
    front = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    code = appeal.unique_code or str(appeal.id)
    return f"{front}/appeals?code={code}"


def ensure_appeal_qr(appeal) -> None:
    """Murojaat uchun QR yaratish/yozish (sync)."""
    if appeal.qr_code_image:
        return
    ref = appeal_public_ref(appeal)
    qr_file = generate_qr_image(ref)
    appeal.qr_code_image.save(f"appeal_{appeal.unique_code or appeal.id}.png", qr_file, save=True)
    logger.info("appeal QR generated id=%s code=%s", appeal.id, appeal.unique_code)
