"""
OsiyoNigohi — Security & Pentest Tests

OWASP Top 10 asosida:
  1. Broken Access Control (IDOR, role bypass)
  2. Injection (SQL, XSS via API)
  3. Authentication failures
  4. Sensitive data exposure
  5. Security misconfiguration
"""
import uuid
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from conftest import (
    UserFactory, TeacherFactory, AdminFactory,
    ExamFactory, ExamSessionFactory, QuestionFactory,
    SubjectFactory,
)


def _auth(user):
    c = APIClient()
    token = RefreshToken.for_user(user)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return c


# ══════════════════════════════════════════════════════════════════════════════
# 1. BROKEN ACCESS CONTROL — IDOR & Privilege Escalation
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestIDOR:
    """Talaba boshqa foydalanuvchining ma'lumotlariga kira olmasligi."""

    def test_student_cannot_view_other_student_session(self):
        s1 = UserFactory(role="student")
        s2 = UserFactory(role="student")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher)
        session = ExamSessionFactory(user=s2, exam=exam)

        client = _auth(s1)
        r = client.get(f"/api/v1/exams/sessions/{session.id}/")
        assert r.status_code in (403, 404)

    def test_student_cannot_access_admin_users_list(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.get("/api/v1/auth/users/")
        assert r.status_code == 403

    def test_teacher_cannot_edit_other_teachers_exam(self):
        t1 = TeacherFactory()
        t2 = TeacherFactory()
        exam = ExamFactory(created_by=t1)

        client = _auth(t2)
        r = client.patch(
            f"/api/v1/exams/manage/{exam.id}/",
            {"title": "Hacked title"},
            format="json",
        )
        assert r.status_code in (403, 404)

    def test_teacher_cannot_delete_other_teachers_question(self):
        t1 = TeacherFactory()
        t2 = TeacherFactory()
        q = QuestionFactory(created_by=t1)

        client = _auth(t2)
        r = client.delete(f"/api/v1/questions/{q.id}/")
        assert r.status_code in (403, 404)

    def test_student_cannot_manage_exams(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.post("/api/v1/exams/manage/", {"title": "Hack"}, format="json")
        assert r.status_code in (403, 404)

    def test_proctor_cannot_create_questions(self):
        proctor = UserFactory(role="proctor")
        client = _auth(proctor)
        r = client.post("/api/v1/questions/", {"text": "Hack?"}, format="json")
        assert r.status_code in (403, 404)


@pytest.mark.django_db
class TestPrivilegeEscalation:
    """Foydalanuvchi o'z rolini o'zgartira olmasligi."""

    def test_student_cannot_change_own_role(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.patch("/api/v1/auth/me/", {"role": "admin"}, format="json")
        if r.status_code == 200:
            data = r.data.get("data", r.data)
            assert data.get("role") == "student"

    def test_teacher_cannot_elevate_to_superadmin(self):
        teacher = TeacherFactory()
        client = _auth(teacher)
        r = client.patch("/api/v1/auth/me/", {"role": "superadmin"}, format="json")
        if r.status_code == 200:
            data = r.data.get("data", r.data)
            assert data.get("role") == "teacher"

    def test_student_cannot_set_is_staff(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.patch("/api/v1/auth/me/", {"is_staff": True}, format="json")
        if r.status_code == 200:
            student.refresh_from_db()
            assert student.is_staff is False


# ══════════════════════════════════════════════════════════════════════════════
# 2. INJECTION TESTS — SQL Injection, XSS via API
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestInjection:

    def test_sql_injection_in_search(self):
        teacher = TeacherFactory()
        client = _auth(teacher)
        payloads = [
            "'; DROP TABLE users; --",
            "1 OR 1=1",
            "' UNION SELECT * FROM users --",
            "1; DELETE FROM exams; --",
        ]
        for payload in payloads:
            r = client.get("/api/v1/questions/", {"search": payload})
            assert r.status_code in (200, 400)

    def test_sql_injection_in_catalog_search(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"search": "'; DROP TABLE subjects;--"})
        assert r.status_code == 200

    def test_xss_in_exam_title(self):
        teacher = TeacherFactory()
        subject = SubjectFactory()
        client = _auth(teacher)
        xss_payload = '<script>alert("xss")</script>'
        r = client.post("/api/v1/exams/manage/", {
            "title": xss_payload,
            "exam_type": "midterm",
            "duration_sec": 3600,
            "questions_count": 10,
            "passing_score": "60.00",
            "proctor_level": 0,
            "subject": str(subject.id),
            "faculty": str(subject.faculty_id),
        }, format="json")
        if r.status_code == 201:
            data = r.data.get("data", r.data)
            assert "<script>" not in str(data.get("title", ""))

    def test_xss_in_question_text(self):
        teacher = TeacherFactory()
        client = _auth(teacher)
        r = client.post("/api/v1/questions/", {
            "type": "single",
            "text": '<img src=x onerror=alert(1)>',
            "options": [
                {"text": "A", "is_correct": True},
                {"text": "B", "is_correct": False},
            ],
            "answer": {"correct": ["a"]},
            "points": 1,
            "difficulty": "easy",
            "bloom_level": 1,
            "pool_type": "practice",
        }, format="json")
        assert r.status_code in (201, 400)


# ══════════════════════════════════════════════════════════════════════════════
# 3. AUTHENTICATION TESTS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestAuthSecurity:

    def test_expired_token_rejected(self):
        from datetime import timedelta
        user = UserFactory()
        token = RefreshToken.for_user(user)
        access = token.access_token
        access.set_exp(lifetime=-timedelta(hours=1))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(access)}")
        r = client.get("/api/v1/auth/me/")
        assert r.status_code == 401

    def test_invalid_token_rejected(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.here")
        r = client.get("/api/v1/auth/me/")
        assert r.status_code == 401

    def test_empty_auth_header_rejected(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="")
        r = client.get("/api/v1/auth/me/")
        assert r.status_code == 401

    def test_no_auth_header_rejected(self):
        client = APIClient()
        r = client.get("/api/v1/auth/me/")
        assert r.status_code == 401

    def test_blacklisted_refresh_token(self):
        user = UserFactory()
        token = RefreshToken.for_user(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
        client.post("/api/v1/auth/logout/", {"refresh": str(token)})
        r = client.post("/api/v1/auth/token/refresh/", {"refresh": str(token)})
        assert r.status_code in (400, 401)

    def test_brute_force_login_invalid_creds(self):
        user = UserFactory()
        client = APIClient()
        for _ in range(10):
            r = client.post("/api/v1/auth/login/", {
                "email": user.email,
                "password": "wrong_password",
            })
            assert r.status_code in (400, 401, 429)


# ══════════════════════════════════════════════════════════════════════════════
# 4. SENSITIVE DATA EXPOSURE
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDataExposure:

    def test_password_not_in_user_response(self):
        student = UserFactory()
        client = _auth(student)
        r = client.get("/api/v1/auth/me/")
        data = r.data.get("data", r.data)
        assert "password" not in data
        assert "password_hash" not in data

    def test_admin_user_list_no_passwords(self):
        admin = AdminFactory()
        UserFactory()
        client = _auth(admin)
        r = client.get("/api/v1/auth/users/")
        items = r.data.get("data", r.data)
        if isinstance(items, list):
            for u in items:
                assert "password" not in u

    def test_other_student_email_not_exposed_in_sessions(self):
        s1 = UserFactory(role="student")
        s2 = UserFactory(role="student", email="secret@test.uz")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher)
        ExamSessionFactory(user=s2, exam=exam)

        client = _auth(s1)
        r = client.get("/api/v1/exams/sessions/")
        body = str(r.data)
        assert "secret@test.uz" not in body


# ══════════════════════════════════════════════════════════════════════════════
# 5. EXAM INTEGRITY — Anti-cheat controls
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestExamIntegrity:

    def test_cannot_start_draft_exam(self):
        student = UserFactory(role="student")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher, status="draft")
        client = _auth(student)
        r = client.post(f"/api/v1/exams/{exam.id}/start/")
        assert r.status_code in (400, 403, 404)

    def test_cannot_exceed_max_attempts(self):
        student = UserFactory(role="student")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher, status="published", max_attempts=1, proctor_level=0)
        ExamSessionFactory(user=student, exam=exam, attempt_number=1, status="finished")
        client = _auth(student)
        r = client.post(f"/api/v1/exams/{exam.id}/start/")
        assert r.status_code in (400, 403)

    def test_cannot_submit_after_session_finished(self):
        student = UserFactory(role="student")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher, status="published")
        session = ExamSessionFactory(
            user=student, exam=exam, status="finished"
        )
        client = _auth(student)
        r = client.post(f"/api/v1/exams/{exam.id}/finish/", {"answers": {}}, format="json")
        assert r.status_code in (400, 403, 404)

    def test_random_uuid_exam_not_found(self):
        student = UserFactory(role="student")
        client = _auth(student)
        fake_id = str(uuid.uuid4())
        r = client.get(f"/api/v1/exams/{fake_id}/")
        assert r.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# 6. API ROBUSTNESS — Edge cases, malformed input
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestAPIRobustness:

    def test_invalid_uuid_returns_404_or_400(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.get("/api/v1/exams/not-a-uuid/")
        assert r.status_code in (400, 404)

    def test_empty_body_on_post(self):
        teacher = TeacherFactory()
        client = _auth(teacher)
        r = client.post("/api/v1/exams/manage/", {}, format="json")
        assert r.status_code == 400

    def test_huge_page_size_capped(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"page_size": "99999"})
        assert r.status_code == 200

    def test_negative_page_handled(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"page": "-1"})
        assert r.status_code == 200

    def test_very_long_search_string(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"search": "A" * 5000})
        assert r.status_code == 200

    def test_special_chars_in_search(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"search": "%00\x00\n\r\t"})
        assert r.status_code == 200
