"""
Yuklangan fayllarni kontent bo'yicha tekshirish (magic bytes) va xavfsiz saqlash.
Faqat kengaytmaga ishonmaydi.
"""
from __future__ import annotations

import io
import logging
from typing import BinaryIO

logger = logging.getLogger("auth_starter.upload")

# Signature → (exts, canonical content-type)
MAGIC_MAP: list[tuple[bytes, set[str], str]] = [
    (b"%PDF", {"pdf"}, "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", {"png"}, "image/png"),
    (b"\xff\xd8\xff", {"jpg", "jpeg"}, "image/jpeg"),
    (b"GIF87a", {"gif"}, "image/gif"),
    (b"GIF89a", {"gif"}, "image/gif"),
    (b"RIFF", {"webp"}, "image/webp"),  # WEBP: RIFF....WEBP
    (b"PK\x03\x04", {"docx", "zip"}, "application/zip"),
    (b"\xd0\xcf\x11\xe0", {"doc"}, "application/msword"),
]

TEXT_SAFE_EXT = {"txt"}
MAX_SNIFF = 32


def sniff_magic(header: bytes) -> tuple[set[str] | None, str | None]:
    if not header:
        return None, None
    for sig, exts, ctype in MAGIC_MAP:
        if header.startswith(sig):
            if sig == b"RIFF" and len(header) >= 12:
                if header[8:12] != b"WEBP":
                    continue
            return exts, ctype
    # UTF-8 text heuristic
    try:
        header[:MAX_SNIFF].decode("utf-8")
        # no null bytes
        if b"\x00" not in header[:MAX_SNIFF]:
            return TEXT_SAFE_EXT, "text/plain"
    except Exception:
        pass
    return None, None


def read_header(f, n: int = MAX_SNIFF) -> bytes:
    pos = None
    try:
        if hasattr(f, "seek") and hasattr(f, "tell"):
            pos = f.tell()
            f.seek(0)
        data = f.read(n) or b""
        if isinstance(data, str):
            data = data.encode("latin-1", errors="ignore")
        return data
    finally:
        if pos is not None and hasattr(f, "seek"):
            try:
                f.seek(pos)
            except Exception:
                f.seek(0)


def reencode_image(f) -> tuple[io.BytesIO, str, str] | None:
    """
    Rasmni Pillow orqali qayta yozadi — embedded script/polyglot tozalanadi.
    Returns (buffer, ext, content_type) yoki None.
    """
    try:
        from PIL import Image, ImageFile

        ImageFile.LOAD_TRUNCATED_IMAGES = False
        f.seek(0)
        img = Image.open(f)
        img.load()
        fmt = (img.format or "PNG").upper()
        if fmt == "JPEG":
            out_fmt, ext, ctype = "JPEG", "jpg", "image/jpeg"
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
        elif fmt == "PNG":
            out_fmt, ext, ctype = "PNG", "png", "image/png"
        elif fmt == "GIF":
            out_fmt, ext, ctype = "PNG", "png", "image/png"
            img = img.convert("RGBA") if img.mode == "P" else img
        elif fmt == "WEBP":
            out_fmt, ext, ctype = "WEBP", "webp", "image/webp"
        else:
            out_fmt, ext, ctype = "PNG", "png", "image/png"
            if img.mode not in ("RGB", "RGBA", "L"):
                img = img.convert("RGBA")

        buf = io.BytesIO()
        save_kwargs = {}
        if out_fmt == "JPEG":
            save_kwargs["quality"] = 90
            save_kwargs["optimize"] = True
        img.save(buf, format=out_fmt, **save_kwargs)
        buf.seek(0)
        return buf, ext, ctype
    except Exception as e:
        logger.warning("image reencode failed: %s", e)
        return None


def validate_and_sanitize_upload(
    f,
    *,
    allowed_ext: set[str],
    max_bytes: int,
) -> tuple[str | None, dict]:
    """
    Returns (error_message | None, meta dict).
    meta: {content_type, safe_ext, file (maybe replaced), sanitized: bool}
    """
    name = getattr(f, "name", "") or "file"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    size = getattr(f, "size", 0) or 0

    if ext not in allowed_ext:
        return (
            f"Ruxsat etilmagan format: .{ext}. Ruxsat: {', '.join(sorted(allowed_ext))}",
            {},
        )
    if size > max_bytes:
        return (f"Fayl juda katta. Maksimal {max_bytes // (1024 * 1024)} MB.", {})
    if size == 0:
        return ("Bo'sh fayl.", {})

    header = read_header(f)
    magic_exts, magic_ctype = sniff_magic(header)

    # docx is zip — allow zip magic for docx
    if ext == "docx" and magic_exts and "zip" in magic_exts:
        magic_exts = magic_exts | {"docx"}
        magic_ctype = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    if magic_exts is not None and ext not in magic_exts and not (
        ext in {"jpg", "jpeg"} and magic_exts & {"jpg", "jpeg"}
    ):
        return (
            f"Fayl tarkibi kengaytmaga mos emas (magic mismatch: .{ext}).",
            {},
        )

    meta: dict = {
        "content_type": magic_ctype
        or getattr(f, "content_type", "")
        or "application/octet-stream",
        "safe_ext": ext,
        "file": f,
        "sanitized": False,
        "original_name": name,
    }

    # Images: re-encode
    if ext in {"png", "jpg", "jpeg", "gif", "webp"}:
        result = reencode_image(f)
        if result is None:
            return ("Rasm fayli buzilgan yoki xavfli.", {})
        buf, new_ext, ctype = result
        # Django UploadedFile-like wrapper
        from django.core.files.uploadedfile import InMemoryUploadedFile

        safe_name = name.rsplit(".", 1)[0][:80] + f".{new_ext}"
        wrapped = InMemoryUploadedFile(
            buf,
            field_name=getattr(f, "field_name", "file"),
            name=safe_name,
            content_type=ctype,
            size=buf.getbuffer().nbytes,
            charset=None,
        )
        meta.update(
            {
                "file": wrapped,
                "content_type": ctype,
                "safe_ext": new_ext,
                "sanitized": True,
                "original_name": safe_name,
            }
        )
    elif ext == "pdf":
        if not header.startswith(b"%PDF"):
            return ("PDF imzosi topilmadi.", {})
        # block javascript in pdf (basic)
        try:
            f.seek(0)
            sample = f.read(min(size, 512_000)) or b""
            f.seek(0)
            low = sample.lower()
            if b"/js" in low or b"javascript" in low or b"/embeddedfile" in low:
                return ("PDF ichida skript/embedded fayl aniqlandi — rad etildi.", {})
        except Exception:
            f.seek(0)

    return None, meta
