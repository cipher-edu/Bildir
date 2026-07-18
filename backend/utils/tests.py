"""
Utils testlari — health check, request ID middleware, scoring.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.test import RequestFactory
from rest_framework.test import APIClient


# ── Health endpoints ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestHealthEndpoints:
    def test_liveness_returns_200(self, api_client):
        r = api_client.get("/api/v1/health/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "alive"
        assert data["service"] == "exam_core"

    def test_readiness_returns_200_or_503(self, api_client):
        r = api_client.get("/api/v1/health/ready/")
        assert r.status_code in (200, 503)
        data = r.json()
        assert "status" in data
        assert "checks" in data

    def test_readiness_database_check_present(self, api_client):
        r = api_client.get("/api/v1/health/ready/")
        data = r.json()
        assert "database" in data["checks"]

    def test_liveness_no_auth_required(self, api_client):
        r = api_client.get("/api/v1/health/")
        assert r.status_code == 200


# ── RequestID middleware ──────────────────────────────────────────────────────

class TestRequestIDMiddleware:
    def _get_response(self, request):
        from django.http import HttpResponse
        return HttpResponse("ok")

    def test_sets_request_id_attribute(self):
        from utils.request_id_middleware import RequestIDMiddleware
        mw = RequestIDMiddleware(self._get_response)
        rf = RequestFactory()
        request = rf.get("/")
        mw(request)
        assert hasattr(request, "request_id")
        assert len(request.request_id) <= 64

    def test_propagates_incoming_request_id(self):
        from utils.request_id_middleware import RequestIDMiddleware
        mw = RequestIDMiddleware(self._get_response)
        rf = RequestFactory()
        request = rf.get("/", HTTP_X_REQUEST_ID="my-custom-id-12345")
        mw(request)
        assert request.request_id == "my-custom-id-12345"

    def test_generates_request_id_if_absent(self):
        from utils.request_id_middleware import RequestIDMiddleware
        mw = RequestIDMiddleware(self._get_response)
        rf = RequestFactory()
        request = rf.get("/")
        mw(request)
        assert request.request_id != ""

    def test_response_has_request_id_header(self):
        from utils.request_id_middleware import RequestIDMiddleware
        mw = RequestIDMiddleware(self._get_response)
        rf = RequestFactory()
        request = rf.get("/")
        response = mw(request)
        assert "X-Request-ID" in response or response.has_header("X-Request-ID")

    def test_truncates_long_request_id(self):
        from utils.request_id_middleware import RequestIDMiddleware
        mw = RequestIDMiddleware(self._get_response)
        rf = RequestFactory()
        long_id = "x" * 100
        request = rf.get("/", HTTP_X_REQUEST_ID=long_id)
        mw(request)
        assert len(request.request_id) <= 64


# ── Vault Client ──────────────────────────────────────────────────────────────

class TestVaultClient:
    def test_get_returns_default_when_disabled(self):
        from utils.vault_client import VaultClient
        import os
        with pytest.MonkeyPatch().context() as mp:
            mp.delenv("VAULT_ROLE_ID", raising=False)
            mp.delenv("VAULT_SECRET_ID", raising=False)
            vc = VaultClient()
            assert vc.enabled is False
            result = vc.get("test/path", "key")
            assert result is None

    def test_vault_client_does_not_crash_import(self):
        from utils.vault_client import VaultClient
        assert VaultClient is not None

    def test_vault_singleton_exists(self):
        from utils.vault_client import vault
        assert vault is not None


# ── JWT Keys ──────────────────────────────────────────────────────────────────

class TestJWTKeys:
    def test_get_private_key_raises_without_config(self):
        from utils.jwt_keys import get_private_key
        import pytest
        with pytest.raises(Exception):
            get_private_key()

    def test_get_private_key_from_env(self):
        from utils.jwt_keys import get_private_key
        import utils.jwt_keys as jk
        jk._PRIVATE_KEY_CACHE = None
        with pytest.MonkeyPatch().context() as mp:
            mp.setenv("JWT_PRIVATE_KEY", "test-private-key")
            result = get_private_key()
        jk._PRIVATE_KEY_CACHE = None
        assert result == "test-private-key"


# ── Telemetry ─────────────────────────────────────────────────────────────────

class TestTelemetry:
    def test_setup_otel_does_not_crash_without_endpoint(self):
        from utils.telemetry import setup_otel
        try:
            setup_otel()
        except Exception as e:
            pytest.fail(f"setup_otel crashed: {e}")

    def test_get_tracer_from_opentelemetry(self):
        from opentelemetry import trace
        tracer = trace.get_tracer("test")
        assert tracer is not None


# ── Tenant Middleware ─────────────────────────────────────────────────────────

class TestTenantMiddleware:
    def test_tenant_not_crash_on_import(self):
        from utils.tenant import TenantMiddleware
        assert TenantMiddleware is not None

    def test_tenant_middleware_processes_request(self):
        from utils.tenant import TenantMiddleware
        from django.http import HttpResponse

        def get_response(request):
            return HttpResponse("ok")

        mw = TenantMiddleware(get_response)
        rf = RequestFactory()
        request = rf.get("/")
        response = mw(request)
        assert response.status_code == 200


# ── Scoring: finalize_session_totals ──────────────────────────────────────────

@pytest.mark.django_db
class TestFinalizeSessionTotals:
    def _build(self, subject_name, student, n_questions=5, n_correct=3):
        from decimal import Decimal
        from django.utils import timezone
        from conftest import SubjectFactory, ExamFactory, ExamSessionFactory, QuestionFactory, TeacherFactory
        from apps.exams.models import UserAnswer

        teacher = TeacherFactory()
        subject = SubjectFactory(name=subject_name)
        exam = ExamFactory(subject=subject, created_by=teacher, passing_score=Decimal("55.00"))
        questions = [
            QuestionFactory(created_by=teacher, points=Decimal("1.00"))
            for _ in range(n_questions)
        ]
        session = ExamSessionFactory(
            user=student, exam=exam,
            question_order=[str(q.id) for q in questions],
        )
        for i, q in enumerate(questions):
            is_correct = i < n_correct
            UserAnswer.objects.create(
                session=session, question=q,
                answer={"selected": "0"},
                is_correct=is_correct,
                points_earned=Decimal("1.00") if is_correct else Decimal("0.00"),
            )
        return session, timezone.now()

    def test_regular_subject_uses_raw_points_sum(self, student):
        from utils.scoring import finalize_session_totals
        session, now = self._build("Matematika", student, n_questions=5, n_correct=3)
        finalize_session_totals(session, now)
        assert session.max_score == 5.0
        assert session.score == 3.0
        assert session.percentage == 60.0

    def test_149_subject_rescales_to_fixed_max(self, student):
        from utils.scoring import finalize_session_totals
        session, now = self._build("VM 149 — Adabiyot testi", student, n_questions=5, n_correct=3)
        finalize_session_totals(session, now)
        assert session.max_score == 20.0
        assert session.score == 12.0   # 3/5 * 20
        assert session.percentage == 60.0

    def test_149_subject_50_questions_each_worth_point_four(self, student):
        from utils.scoring import finalize_session_totals
        session, now = self._build("VM 149 — Adabiyot testi", student, n_questions=50, n_correct=50)
        finalize_session_totals(session, now)
        assert session.max_score == 20.0
        assert session.score == 20.0
        assert session.percentage == 100.0

    def test_149_rescale_preserves_pass_fail_outcome(self, student):
        from utils.scoring import finalize_session_totals
        session, now = self._build("VM 149 — Adabiyot testi", student, n_questions=5, n_correct=2)
        finalize_session_totals(session, now)
        # 2/5 = 40% < passing_score 55% -> should still fail after rescale
        assert session.percentage == 40.0
        assert session.passed is False
