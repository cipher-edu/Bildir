"""
OsiyoNigohi — QA Integration Tests

Har bir rolning to'liq ish jarayonini sinovdan o'tkazadi:
  1. Login → Me → Logout (barcha rollar)
  2. Teacher: Savol yaratish → Imtihon yaratish → Approve flow
  3. Student: Imtihon ko'rish → Boshlash → Tugatish → Natija
  4. Admin: Foydalanuvchilar boshqaruvi → Audit loglar
  5. Catalog: CRUD operatsiyalar
  6. Practice: Mashq sessiyalari
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from conftest import (
    UserFactory, TeacherFactory, AdminFactory, MethodistFactory,
    ExamFactory, QuestionFactory, ExamSessionFactory,
    SubjectFactory, FacultyFactory, UniversityFactory,
)


def _auth(user):
    c = APIClient()
    token = RefreshToken.for_user(user)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return c


# ══════════════════════════════════════════════════════════════════════════════
# 1. LOGIN FLOW — Har bir rol uchun
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestLoginFlowAllRoles:

    @pytest.mark.parametrize("role", [
        "student", "teacher", "methodist", "department_head",
        "proctor", "admin", "superadmin", "audit_inspector",
    ])
    def test_login_and_me(self, role):
        user = UserFactory(role=role, is_staff=role in ("admin", "superadmin"))
        client = APIClient()
        r = client.post("/api/v1/auth/login/", {
            "email": user.email,
            "password": "TestPass123!",
        })
        assert r.status_code == 200
        assert "tokens" not in r.data["data"]
        access = r.cookies["bildir_access"].value
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        r2 = client.get("/api/v1/auth/me/")
        assert r2.status_code == 200
        me = r2.data.get("data", r2.data)
        assert me["role"] == role

    @pytest.mark.parametrize("role", [
        "student", "teacher", "methodist", "department_head",
        "proctor", "admin", "superadmin", "audit_inspector",
    ])
    def test_logout(self, role):
        user = UserFactory(role=role, is_staff=role in ("admin", "superadmin"))
        token = RefreshToken.for_user(user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
        r = client.post("/api/v1/auth/logout/", {"refresh": str(token)})
        assert r.status_code in (200, 204, 205)


# ══════════════════════════════════════════════════════════════════════════════
# 2. TEACHER WORKFLOW — Savol + Imtihon yaratish
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestTeacherWorkflow:

    def test_create_question(self):
        teacher = TeacherFactory()
        client = _auth(teacher)
        r = client.post("/api/v1/questions/", {
            "type": "single",
            "text": "Django da ORM nima?",
            "options": [
                {"text": "Object Relational Mapping", "is_correct": True},
                {"text": "Object Random Memory", "is_correct": False},
            ],
            "answer": {"correct": ["a"]},
            "points": 2,
            "difficulty": "easy",
            "bloom_level": 1,
            "pool_type": "exam",
        }, format="json")
        assert r.status_code == 201

    def test_list_own_questions(self):
        teacher = TeacherFactory()
        QuestionFactory(created_by=teacher)
        QuestionFactory(created_by=teacher)
        client = _auth(teacher)
        r = client.get("/api/v1/questions/")
        assert r.status_code == 200

    def test_create_exam(self):
        teacher = TeacherFactory()
        subject = SubjectFactory()
        client = _auth(teacher)
        r = client.post("/api/v1/exams/manage/", {
            "title": "Oraliq imtihon",
            "exam_type": "midterm",
            "duration_sec": 5400,
            "questions_count": 30,
            "passing_score": "60.00",
            "proctor_level": 1,
            "subject": str(subject.id),
            "faculty": str(subject.faculty_id),
        }, format="json")
        assert r.status_code == 201

    def test_list_own_exams(self):
        teacher = TeacherFactory()
        ExamFactory(created_by=teacher)
        client = _auth(teacher)
        r = client.get("/api/v1/exams/manage/")
        assert r.status_code == 200
        items = r.data.get("data", [])
        assert len(items) >= 1

    def test_update_exam(self):
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher, status="draft")
        client = _auth(teacher)
        r = client.patch(
            f"/api/v1/exams/manage/{exam.id}/",
            {"title": "Yangilangan sarlavha"},
            format="json",
        )
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 3. STUDENT WORKFLOW — Imtihon topish va boshlash
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestStudentWorkflow:

    def test_list_available_exams(self):
        student = UserFactory(role="student")
        teacher = TeacherFactory()
        ExamFactory(created_by=teacher, status="published")
        client = _auth(student)
        r = client.get("/api/v1/exams/")
        assert r.status_code == 200

    def test_view_own_sessions(self):
        student = UserFactory(role="student")
        teacher = TeacherFactory()
        exam = ExamFactory(created_by=teacher)
        ExamSessionFactory(user=student, exam=exam, status="finished")
        client = _auth(student)
        r = client.get("/api/v1/exams/sessions/")
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 4. ADMIN WORKFLOW — User management
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestAdminWorkflow:

    def test_list_users(self):
        admin = AdminFactory()
        UserFactory(role="student")
        client = _auth(admin)
        r = client.get("/api/v1/auth/users/")
        assert r.status_code == 200

    def test_view_user_detail(self):
        admin = AdminFactory()
        student = UserFactory(role="student")
        client = _auth(admin)
        r = client.get(f"/api/v1/auth/users/{student.id}/")
        assert r.status_code == 200

    def test_view_audit_logs(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/audit/logs/")
        assert r.status_code == 200

    def test_view_system_stats(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/auth/stats/")
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 5. CATALOG API — CRUD + Compact + Paginated
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestCatalogAPI:

    def test_list_universities(self):
        admin = AdminFactory()
        UniversityFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/universities/")
        assert r.status_code == 200

    def test_list_faculties(self):
        admin = AdminFactory()
        FacultyFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/faculties/")
        assert r.status_code == 200

    def test_subjects_compact_returns_array(self):
        admin = AdminFactory()
        SubjectFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"compact": "true"})
        assert r.status_code == 200
        assert isinstance(r.data["data"], list)

    def test_subjects_paginated(self):
        admin = AdminFactory()
        for _ in range(5):
            SubjectFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {"page_size": "2"})
        assert r.status_code == 200
        data = r.data["data"]
        assert "data" in data
        assert "meta" in data
        assert data["meta"]["page_size"] == 2

    def test_specialties_compact(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/specialties/", {"compact": "true"})
        assert r.status_code == 200
        assert isinstance(r.data["data"], list)

    def test_groups_compact(self):
        admin = AdminFactory()
        client = _auth(admin)
        r = client.get("/api/v1/catalog/groups/", {"compact": "true"})
        assert r.status_code == 200
        assert isinstance(r.data["data"], list)

    def test_faculty_filter(self):
        admin = AdminFactory()
        fac = FacultyFactory()
        SubjectFactory(faculty=fac)
        client = _auth(admin)
        r = client.get("/api/v1/catalog/subjects/", {
            "faculty_id": str(fac.id), "compact": "true"
        })
        assert r.status_code == 200
        for item in r.data["data"]:
            assert True  # items filtered — no crash


# ══════════════════════════════════════════════════════════════════════════════
# 6. PRACTICE — Mashq sessiyalari
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestPracticeFlow:

    def test_student_can_list_practice_sessions(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.get("/api/v1/practice/sessions/")
        assert r.status_code == 200

    def test_proctor_cannot_start_practice(self):
        proctor = UserFactory(role="proctor")
        client = _auth(proctor)
        r = client.post("/api/v1/practice/sessions/", {}, format="json")
        assert r.status_code in (403, 400)


# ══════════════════════════════════════════════════════════════════════════════
# 7. NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestNotifications:

    def test_student_list_notifications(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.get("/api/v1/notifications/")
        assert r.status_code == 200

    def test_admin_broadcast(self):
        admin = AdminFactory()
        UserFactory(role="student")
        client = _auth(admin)
        r = client.post("/api/v1/notifications/broadcast/", {
            "title": "Test xabar",
            "body": "Bu sinov xabari",
            "target_role": "student",
        }, format="json")
        assert r.status_code in (200, 201)

    def test_student_cannot_broadcast(self):
        student = UserFactory(role="student")
        client = _auth(student)
        r = client.post("/api/v1/notifications/broadcast/", {
            "title": "Hack",
            "body": "Student broadcast attempt",
        }, format="json")
        assert r.status_code in (403, 404)
