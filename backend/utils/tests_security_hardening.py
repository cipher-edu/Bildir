"""CORS sanitize + upload magic + throttle rates mavjudligi."""
from django.conf import settings
from django.test import SimpleTestCase, override_settings

from utils.cors_security import sanitize_cors_origins
from utils.upload_security import sniff_magic, validate_and_sanitize_upload


class CorsSecurityTests(SimpleTestCase):
    def test_strips_wildcard(self):
        out = sanitize_cors_origins(
            ["*", "https://bildir.uz", ""],
            allow_credentials=True,
        )
        self.assertEqual(out, ["https://bildir.uz"])

    def test_rejects_bad_scheme(self):
        out = sanitize_cors_origins(["ftp://x.com", "http://localhost:3000"])
        self.assertEqual(out, ["http://localhost:3000"])


class UploadMagicTests(SimpleTestCase):
    def test_png_magic(self):
        header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8
        exts, ctype = sniff_magic(header)
        self.assertIn("png", exts or set())
        self.assertEqual(ctype, "image/png")

    def test_pdf_magic(self):
        exts, ctype = sniff_magic(b"%PDF-1.4\n")
        self.assertIn("pdf", exts or set())
        self.assertEqual(ctype, "application/pdf")

    def test_extension_mismatch_rejected(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        # HTML content named as png
        f = SimpleUploadedFile(
            "evil.png",
            b"<html><script>alert(1)</script></html>",
            content_type="image/png",
        )
        err, _ = validate_and_sanitize_upload(
            f, allowed_ext={"png", "jpg", "pdf"}, max_bytes=1024 * 1024
        )
        self.assertIsNotNone(err)


class ThrottleConfigTests(SimpleTestCase):
    def test_login_rates_configured(self):
        rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
        self.assertIn("login", rates)
        self.assertIn("login_account", rates)
        self.assertIn("forgot_password", rates)
        self.assertIn("token_refresh", rates)
