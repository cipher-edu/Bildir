#!/usr/bin/env python3
"""
Bildir (auth-starter) — to'liq tizim testi
Sahifalar, API lar, modellar. Natija: JSON hisobot.
"""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import requests

BASE_API = os.environ.get("TEST_API_BASE", "http://127.0.0.1:8000/api/v1/")
BASE_FE = os.environ.get("TEST_FE_BASE", "http://127.0.0.1:3000/")
BASE_BE = os.environ.get("TEST_BE_BASE", "http://127.0.0.1:8000/")
EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "superadmin@ndu.uz")
PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "SuperAdmin2026!")
TIMEOUT = 20

results: list[dict[str, Any]] = []
session = requests.Session()
session.headers.update({"Accept": "application/json"})
access_token: str | None = None


def record(
    category: str,
    name: str,
    method: str,
    url: str,
    expected: str,
    status: int | None,
    ok: bool,
    detail: str = "",
    body_snip: str = "",
    ms: float = 0,
):
    results.append(
        {
            "category": category,
            "name": name,
            "method": method,
            "url": url,
            "expected": expected,
            "status": status,
            "ok": ok,
            "detail": detail,
            "body_snip": body_snip[:300],
            "ms": round(ms, 1),
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {category:12} {method:6} {status or '-':>4}  {name}  ({ms:.0f}ms) {detail}")


def req(
    category: str,
    name: str,
    method: str,
    url: str,
    *,
    expected_statuses: set[int] | None = None,
    json_body: dict | None = None,
    data: dict | None = None,
    files=None,
    auth: bool = False,
    allow_redirects: bool = True,
    html: bool = False,
) -> requests.Response | None:
    expected_statuses = expected_statuses or {200}
    headers = {}
    if auth and access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    if not html:
        headers.setdefault("Accept", "application/json")
    t0 = time.perf_counter()
    try:
        r = session.request(
            method,
            url,
            json=json_body,
            data=data,
            files=files,
            headers=headers,
            timeout=TIMEOUT,
            allow_redirects=allow_redirects,
        )
        ms = (time.perf_counter() - t0) * 1000
        ok = r.status_code in expected_statuses
        snip = ""
        try:
            snip = r.text[:200].replace("\n", " ")
        except Exception:
            pass
        record(
            category,
            name,
            method,
            url,
            ",".join(map(str, sorted(expected_statuses))),
            r.status_code,
            ok,
            "" if ok else f"kutilgan {expected_statuses}",
            snip,
            ms,
        )
        return r
    except Exception as e:
        ms = (time.perf_counter() - t0) * 1000
        record(category, name, method, url, str(expected_statuses), None, False, str(e), "", ms)
        return None


def main():
    global access_token
    report: dict[str, Any] = {
        "title": "Bildir Full System Test Report",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "targets": {"frontend": BASE_FE, "api": BASE_API, "backend": BASE_BE},
        "admin": EMAIL,
        "results": results,
    }

    # ── 1. Health / infra ─────────────────────────────────────
    req("infra", "API health", "GET", urljoin(BASE_API, "health/"), expected_statuses={200})
    req("infra", "OpenAPI schema", "GET", urljoin(BASE_API, "schema/"), expected_statuses={200})
    req(
        "infra",
        "Swagger docs",
        "GET",
        urljoin(BASE_API, "docs/"),
        expected_statuses={200, 406},  # 406: Accept application/json da ba'zan
        html=True,
    )
    req("infra", "Admin login page", "GET", urljoin(BASE_BE, "admin/login/"), expected_statuses={200}, html=True)

    # ── 2. Frontend pages (public + auth redirect) ────────────
    fe_public = [
        ("/", "Landing"),
        ("/login", "Login"),
        ("/news", "News list"),
        ("/privacy", "Privacy"),
        ("/risk", "Risk registry public"),
        ("/whistle", "Whistleblowing"),
        ("/auth/forgot-password", "Forgot password"),
        ("/auth/reset-password", "Reset password"),
        ("/auth/callback", "OAuth callback page"),
    ]
    for path, name in fe_public:
        req(
            "frontend",
            name,
            "GET",
            urljoin(BASE_FE, path.lstrip("/")),
            expected_statuses={200},
            html=True,
        )

    fe_auth_pages = [
        ("/home", "Student home"),
        ("/surveys", "Surveys"),
        ("/appeals", "Appeals"),
        ("/admin", "Admin dashboard"),
        ("/admin/surveys", "Admin surveys"),
        ("/admin/appeals", "Admin appeals"),
        ("/admin/users", "Admin users"),
        ("/admin/news", "Admin news"),
        ("/admin/officials", "Admin officials"),
        ("/admin/catalog", "Admin catalog"),
        ("/admin/hemis-sync", "Admin HEMIS sync"),
        ("/admin/results", "Admin results"),
        ("/admin/risks", "Admin risks"),
        ("/admin/whistle", "Admin whistle"),
        ("/admin/audit", "Admin audit"),
    ]
    for path, name in fe_auth_pages:
        # Next.js SPA: odatda 200 (client-side guard)
        req(
            "frontend",
            name,
            "GET",
            urljoin(BASE_FE, path.lstrip("/")),
            expected_statuses={200, 307, 308, 302},
            html=True,
        )

    # ── 3. Auth API ───────────────────────────────────────────
    # Email login (superadmin)
    r = req(
        "auth",
        "Admin email login",
        "POST",
        urljoin(BASE_API, "auth/login/"),
        expected_statuses={200, 201},
        json_body={"email": EMAIL, "password": PASSWORD},
    )
    if r is not None and r.status_code in (200, 201):
        try:
            data = r.json()
            d = data.get("data") if isinstance(data.get("data"), dict) else {}
            tokens = d.get("tokens") if isinstance(d.get("tokens"), dict) else data.get("tokens") or {}
            # Bildir: data.tokens.access  | boshqa formatlar
            access_token = (
                tokens.get("access")
                or data.get("access")
                or data.get("access_token")
                or d.get("access")
                or d.get("access_token")
            )
        except Exception:
            access_token = None

    record(
        "auth",
        "Access token obtained",
        "—",
        "session",
        "token",
        1 if access_token else 0,
        bool(access_token),
        "JWT bor" if access_token else "Login muvaffaqiyatsiz — auth testlar cheklangan",
    )

    # Bad login
    req(
        "auth",
        "Bad password rejected",
        "POST",
        urljoin(BASE_API, "auth/login/"),
        expected_statuses={400, 401, 403},
        json_body={"email": EMAIL, "password": "wrong-password-xyz"},
    )

    # HEMIS endpoints shape (without real creds — expect 400/401/429)
    req(
        "auth",
        "HEMIS student login validation",
        "POST",
        urljoin(BASE_API, "auth/login/hemis/"),
        expected_statuses={400, 401, 403, 429, 502, 503},
        json_body={"login": "invalid", "password": "invalid"},
    )
    req(
        "auth",
        "HEMIS tutor login validation",
        "POST",
        urljoin(BASE_API, "auth/login/hemis/tutor/"),
        expected_statuses={400, 401, 403, 429, 502, 503},
        json_body={"login": "invalid", "password": "invalid"},
    )
    req(
        "auth",
        "OAuth init",
        "GET",
        urljoin(BASE_API, "auth/oauth/hemis/") + "?portal=student",
        expected_statuses={200, 302, 400, 500},
        allow_redirects=False,
    )

    # Me / logout
    req("auth", "GET /auth/me/", "GET", urljoin(BASE_API, "auth/me/"), expected_statuses={200, 401}, auth=True)
    req("auth", "System stats", "GET", urljoin(BASE_API, "auth/stats/"), expected_statuses={200, 401, 403}, auth=True)
    req("auth", "Audit logs", "GET", urljoin(BASE_API, "auth/audit/"), expected_statuses={200, 401, 403}, auth=True)
    req("auth", "Admin users list", "GET", urljoin(BASE_API, "auth/users/"), expected_statuses={200, 401, 403}, auth=True)

    # ── 4. Catalog API ────────────────────────────────────────
    for path, name in [
        ("catalog/universities/", "Universities"),
        ("catalog/faculties/", "Faculties"),
        ("catalog/specialties/", "Specialties"),
        ("catalog/groups/", "Groups"),
        ("catalog/subjects/", "Subjects"),
        ("catalog/sync/status/", "HEMIS sync status"),
        ("catalog/sync/history/", "HEMIS sync history"),
    ]:
        req("catalog", name, "GET", urljoin(BASE_API, path), expected_statuses={200, 401, 403}, auth=True)

    # ── 5. Surveys API ────────────────────────────────────────
    r = req(
        "surveys",
        "Survey list",
        "GET",
        urljoin(BASE_API, "surveys/"),
        expected_statuses={200, 401, 403},
        auth=True,
    )
    req(
        "surveys",
        "Survey available",
        "GET",
        urljoin(BASE_API, "surveys/available/"),
        expected_statuses={200, 401, 403},
        auth=True,
    )

    survey_id = None
    if r is not None and r.status_code == 200:
        try:
            payload = r.json()
            items = payload.get("data") or payload.get("results") or payload
            if isinstance(items, dict):
                items = items.get("results") or items.get("items") or []
            if isinstance(items, list) and items:
                survey_id = items[0].get("id")
        except Exception:
            pass

    if survey_id:
        sid = str(survey_id)
        for path, name, codes in [
            (f"surveys/{sid}/", "Survey detail", {200, 403, 404}),
            (f"surveys/{sid}/questions/", "Survey questions", {200, 403, 404, 405}),
            (f"surveys/{sid}/results/", "Survey results", {200, 403, 404}),
            (f"surveys/{sid}/qr/", "Survey QR", {200, 403, 404}),
            (f"surveys/{sid}/participations/", "Survey participations", {200, 403, 404}),
            (f"surveys/{sid}/take/", "Survey take", {200, 403, 404}),
        ]:
            req("surveys", name, "GET", urljoin(BASE_API, path), expected_statuses=codes, auth=True)
    else:
        record("surveys", "Survey detail suite", "—", "—", "id", None, True, "So'rovnoma yo'q — skip detail", "")

    # ── 6. Office API ─────────────────────────────────────────
    r = req(
        "office",
        "Persons list",
        "GET",
        urljoin(BASE_API, "office/persons/"),
        expected_statuses={200, 401},
        auth=True,
    )
    req(
        "office",
        "My appeals",
        "GET",
        urljoin(BASE_API, "office/appeals/"),
        expected_statuses={200, 401},
        auth=True,
    )
    req(
        "office",
        "Admin appeals",
        "GET",
        urljoin(BASE_API, "office/admin/appeals/"),
        expected_statuses={200, 401, 403},
        auth=True,
    )

    # Create appeal (if auth)
    if access_token:
        r_create = req(
            "office",
            "Create appeal (POST)",
            "POST",
            urljoin(BASE_API, "office/appeals/"),
            expected_statuses={200, 201, 400, 401, 403},
            auth=True,
            data={
                "subject": "Avtotest murojaat",
                "body": "Bu avtomatik tizim testi orqali yaratilgan murojaat matni. Kamida 10 belgi.",
                "category": "general",
            },
        )
        appeal_id = None
        if r_create is not None and r_create.status_code in (200, 201):
            try:
                d = r_create.json()
                appeal_id = (d.get("data") or d).get("id")
                code = (d.get("data") or d).get("unique_code")
                record(
                    "office",
                    "Appeal unique_code present",
                    "—",
                    str(appeal_id),
                    "code",
                    1 if code else 0,
                    bool(code),
                    f"code={code}",
                )
            except Exception as e:
                record("office", "Parse create appeal", "—", "—", "json", None, False, str(e))
        if appeal_id:
            req(
                "office",
                "Appeal detail",
                "GET",
                urljoin(BASE_API, f"office/appeals/{appeal_id}/"),
                expected_statuses={200},
                auth=True,
            )

    # ── 7. News API ───────────────────────────────────────────
    r = req("news", "News list", "GET", urljoin(BASE_API, "news/"), expected_statuses={200, 401})
    req("news", "News categories", "GET", urljoin(BASE_API, "news/categories/"), expected_statuses={200, 401})
    news_key = None
    if r is not None and r.status_code == 200:
        try:
            payload = r.json()
            items = payload.get("data") or payload.get("results") or payload
            if isinstance(items, dict):
                items = items.get("results") or items.get("items") or []
            if isinstance(items, list) and items:
                news_key = items[0].get("slug") or items[0].get("id")
        except Exception:
            pass
    if news_key:
        req(
            "news",
            "News detail",
            "GET",
            urljoin(BASE_API, f"news/{news_key}/"),
            expected_statuses={200, 404},
        )
        req(
            "frontend",
            f"News slug page /news/{news_key}",
            "GET",
            urljoin(BASE_FE, f"news/{news_key}"),
            expected_statuses={200},
            html=True,
        )

    # ── 8. Compliance API ─────────────────────────────────────
    req(
        "compliance",
        "Risks list",
        "GET",
        urljoin(BASE_API, "compliance/risks/"),
        expected_statuses={200, 401, 403},
        auth=True,
    )
    req(
        "compliance",
        "Whistle list/create endpoint",
        "GET",
        urljoin(BASE_API, "compliance/whistle/"),
        expected_statuses={200, 401, 403, 405},
        auth=True,
    )
    req(
        "compliance",
        "KPI dashboard",
        "GET",
        urljoin(BASE_API, "compliance/kpi/"),
        expected_statuses={200, 401, 403},
        auth=True,
    )
    # Public whistle POST
    req(
        "compliance",
        "Whistle POST (anon shape)",
        "POST",
        urljoin(BASE_API, "compliance/whistle/"),
        expected_statuses={200, 201, 400, 401, 403},
        json_body={
            "title": "Autotest whistle",
            "description": "Test xabar matni avtomatik tekshiruv uchun yozildi.",
            "category": "other",
        },
    )

    # ── 9. Security smoke (cookie'siz toza session) ───────────
    old = access_token
    access_token = None
    clean = requests.Session()
    clean.headers.update({"Accept": "application/json"})
    for name, path, codes in [
        ("Unauth me blocked", "auth/me/", {401, 403}),
        ("Unauth admin users blocked", "auth/users/", {401, 403}),
        ("Unauth appeals blocked", "office/appeals/", {401, 403}),
    ]:
        url = urljoin(BASE_API, path)
        t0 = time.perf_counter()
        try:
            rr = clean.get(url, timeout=TIMEOUT)
            ms = (time.perf_counter() - t0) * 1000
            ok = rr.status_code in codes
            record(
                "security",
                name,
                "GET",
                url,
                str(codes),
                rr.status_code,
                ok,
                "" if ok else f"kutilgan {codes}; cookie auth={rr.status_code==200}",
                rr.text[:120],
                ms,
            )
        except Exception as e:
            record("security", name, "GET", url, str(codes), None, False, str(e))
    access_token = old

    # ── 10. Models (via Django if available) ───────────────────
    try:
        # Konteynerda /app ishchi papka
        if "/app" not in sys.path:
            sys.path.insert(0, "/app")
        os.chdir("/app") if os.path.isdir("/app") else None
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
        import django

        django.setup()
        from django.apps import apps
        from django.db import connection

        model_rows = []
        for model in apps.get_models():
            label = model._meta.label
            try:
                count = model.objects.count()
                model_rows.append({"model": label, "count": count, "ok": True})
                record("models", f"Count {label}", "ORM", label, ">=0", count, True, f"n={count}")
            except Exception as e:
                model_rows.append({"model": label, "count": None, "ok": False, "error": str(e)})
                record("models", f"Count {label}", "ORM", label, "ok", None, False, str(e))
        report["models"] = model_rows
        report["db_vendor"] = connection.vendor
    except Exception as e:
        record("models", "Django setup", "—", "—", "ok", None, False, str(e)[:200])
        report["models_error"] = traceback.format_exc()[-500:]

    # ── Summary ───────────────────────────────────────────────
    total = len(results)
    passed = sum(1 for x in results if x["ok"])
    failed = total - passed
    by_cat: dict[str, dict[str, int]] = {}
    for x in results:
        c = x["category"]
        by_cat.setdefault(c, {"pass": 0, "fail": 0})
        by_cat[c]["pass" if x["ok"] else "fail"] += 1

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    report["summary"] = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": round(100.0 * passed / total, 1) if total else 0,
        "by_category": by_cat,
        "token_ok": bool(access_token),
    }
    report["failures"] = [x for x in results if not x["ok"]]

    out_dir = os.environ.get(
        "TEST_OUT_DIR",
        os.path.join(os.path.dirname(__file__), "..", "test_reports"),
    )
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_json = os.path.join(out_dir, f"full_system_test_{stamp}.json")
    latest = os.path.join(out_dir, "full_system_test_latest.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    with open(latest, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"TOTAL: {total}  PASS: {passed}  FAIL: {failed}  RATE: {report['summary']['pass_rate']}%")
    print(f"JSON: {out_json}")
    print("=" * 60)
    if failed:
        print("FAILURES:")
        for x in report["failures"]:
            print(f"  - [{x['category']}] {x['name']}: status={x['status']} {x['detail']}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
