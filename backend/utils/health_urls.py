"""
Health & readiness endpoints.
  /api/v1/health/        — liveness
  /api/v1/health/ready/  — readiness (database)
"""
import logging
import time

from django.db import connections
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.cache import never_cache

logger = logging.getLogger("auth_starter")


def _check_database() -> tuple[bool, dict]:
    t0 = time.monotonic()
    try:
        conn = connections["default"]
        conn.ensure_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True, {"latency_ms": round((time.monotonic() - t0) * 1000, 2)}
    except Exception as e:
        return False, {"error": str(e)[:200]}


@never_cache
def health_live(request):
    return JsonResponse({"status": "alive", "service": "auth-starter"})


@never_cache
def health_ready(request):
    db_ok, db_detail = _check_database()
    body = {
        "status":  "ready" if db_ok else "degraded",
        "service": "auth-starter",
        "checks":  {"database": {"ok": db_ok, **db_detail}},
    }
    return JsonResponse(body, status=200 if db_ok else 503)


urlpatterns = [
    path("",       health_live,  name="health"),
    path("ready/", health_ready, name="health-ready"),
]
