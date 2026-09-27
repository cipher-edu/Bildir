"""Regressiya: ochiq ro'yxat, sessiya, whistle, risk, media, HTML."""
import os
import tempfile
import uuid

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.compliance.models import WhistleReport
from apps.office.models import Appeal
from apps.office.serializers import AppealSerializer
from apps.surveys.models import Survey
from apps.surveys.services import build_response_meta, start_participation
from apps.users.models import User
from utils.html_sanitize import sanitize_html
from utils.media_views import media_path_contained


class RegisterAndSessionTests(TestCase):
    def test_public_register_cannot_choose_role_or_return_tokens(self):
        client = APIClient()
        response = client.post(
            "/api/v1/auth/register/",
            {
                "email": "new@test.uz",
                "first_name": "Test",
                "last_name": "User",
                "password": "StrongPass123!",
                "role": "superadmin",
                "is_staff": True,
                "is_superuser": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("tokens", response.data["data"])
        user = User.objects.get(email="new@test.uz")
        self.assertEqual(user.role, User.Role.STUDENT)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    @override_settings(ALLOW_OPEN_REGISTRATION=False)
    def test_register_closed_when_not_debug(self):
        response = APIClient().post(
            "/api/v1/auth/register/",
            {
                "email": "closed@test.uz",
                "first_name": "A",
                "last_name": "B",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(User.objects.filter(email="closed@test.uz").exists())

    def test_password_change_revokes_cookie_session(self):
        User.objects.create_user(
            email="sess@test.uz",
            password="OldPass123!",
            first_name="S",
            last_name="S",
            role=User.Role.STUDENT,
        )
        client = APIClient()
        login = client.post(
            "/api/v1/auth/login/",
            {"email": "sess@test.uz", "password": "OldPass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertNotIn("tokens", login.data["data"])
        self.assertEqual(client.get("/api/v1/auth/me/").status_code, 200)
        changed = client.post(
            "/api/v1/auth/me/password/",
            {"old_password": "OldPass123!", "new_password": "NewPass123!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(client.get("/api/v1/auth/me/").status_code, 401)

    def test_forgot_password_does_not_echo_token(self):
        User.objects.create_user(
            email="mail@test.uz",
            password="OldPass123!",
            first_name="M",
            last_name="M",
        )
        response = APIClient().post(
            "/api/v1/auth/forgot-password/",
            {"email": "mail@test.uz"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("token", response.data["data"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password?token=", mail.outbox[0].body)

    def test_inspector_cannot_assign_role(self):
        inspector = User.objects.create_user(
            email="ins@test.uz",
            password="OldPass123!",
            first_name="I",
            last_name="I",
            role=User.Role.AUDIT_INSPECTOR,
        )
        target = User.objects.create_user(
            email="tgt@test.uz",
            password="OldPass123!",
            first_name="T",
            last_name="T",
            role=User.Role.STUDENT,
        )
        client = APIClient()
        client.force_authenticate(user=inspector)
        response = client.patch(
            f"/api/v1/auth/users/{target.pk}/",
            {"role": "superadmin"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        target.refresh_from_db()
        self.assertEqual(target.role, User.Role.STUDENT)


class PrivacySurfaceTests(TestCase):
    def test_risk_register_requires_staff(self):
        response = APIClient().get("/api/v1/compliance/risks/")
        self.assertIn(response.status_code, (401, 403))

    def test_whistle_message_is_encrypted_at_rest(self):
        response = APIClient().post(
            "/api/v1/compliance/whistle/",
            {"message": "Bu maxfiy shikoyat matni.", "context": "fakultet"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        row = WhistleReport.objects.get()
        self.assertTrue(row.message.startswith("enc1:"))
        self.assertNotIn("maxfiy", row.message)
        self.assertGreaterEqual(len(row.tracking_code), 32)

    def test_student_does_not_receive_admin_note(self):
        student = User.objects.create_user(
            email="stu@test.uz",
            password="OldPass123!",
            first_name="S",
            last_name="S",
            role=User.Role.STUDENT,
        )
        appeal = Appeal.objects.create(
            user=student,
            subject="Mavzu",
            body="Matn etarli uzunlikda.",
            admin_note="Ichki izoh",
        )
        request = type("R", (), {"user": student})()
        data = AppealSerializer(appeal, context={"request": request}).data
        self.assertNotIn("admin_note", data)

    def test_anonymous_start_does_not_keep_user(self):
        admin = User.objects.create_user(
            email="adm@test.uz",
            password="OldPass123!",
            first_name="A",
            last_name="A",
            role=User.Role.ADMIN,
        )
        student = User.objects.create_user(
            email="st2@test.uz",
            password="OldPass123!",
            first_name="S",
            last_name="S",
            role=User.Role.STUDENT,
        )
        survey = Survey.objects.create(
            title="Anonim",
            audience=Survey.Audience.STUDENTS,
            privacy_mode=Survey.PrivacyMode.ANONYMOUS,
            status=Survey.Status.PUBLISHED,
            track_participation=False,
            created_by=admin,
        )
        part, _token = start_participation(survey, student)
        part.refresh_from_db()
        self.assertIsNone(part.user_id)
        self.assertTrue(part.participant_key)

    def test_group_meta_requires_explicit_flag(self):
        survey = Survey(
            stats_level=Survey.StatsLevel.COARSE,
            store_group_meta=False,
            privacy_mode=Survey.PrivacyMode.ANONYMOUS,
        )
        user = User(study_year=2, gender="M")
        user.group_id = uuid.uuid4()
        meta = build_response_meta(survey, user)
        self.assertNotIn("group_id", meta)
        self.assertNotIn("group_name", meta)
        survey.store_group_meta = True
        survey.privacy_mode = Survey.PrivacyMode.OPEN
        meta = build_response_meta(survey, user)
        self.assertEqual(meta["group_id"], str(user.group_id))
        survey.privacy_mode = Survey.PrivacyMode.ANONYMOUS
        meta = build_response_meta(survey, user)
        self.assertNotIn("group_id", meta)
        self.assertNotIn("faculty_id", meta)


class SanitizerAndPathTests(TestCase):
    def test_script_and_javascript_url_removed(self):
        raw = '<p>ok</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'
        clean = sanitize_html(raw)
        self.assertIn("<p>ok</p>", clean)
        self.assertNotIn("<script", clean.lower())
        self.assertNotIn("javascript:", clean.lower())
        self.assertNotIn("alert", clean.lower())

    def test_media_prefix_sibling_is_outside(self):
        root = tempfile.mkdtemp()
        sibling = root + "_backup"
        os.makedirs(sibling, exist_ok=True)
        self.assertFalse(media_path_contained(root, os.path.join(sibling, "secret.txt")))
        self.assertTrue(media_path_contained(root, os.path.join(root, "photo.jpg")))
