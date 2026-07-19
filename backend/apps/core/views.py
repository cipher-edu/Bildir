"""
OsiyoNigohi — Core Views
Katalog ma'lumotlarini o'qish + HEMIS sinxronlash + CRUD.
"""
import threading
import uuid as _uuid
import json as _json
from datetime import datetime as _dt
from io import StringIO
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.management import call_command
from django.core.cache import cache
from .models import University, Faculty, Specialty, StudyGroup, Subject
from .serializers import (
    UniversitySerializer, FacultySerializer,
    SpecialtySerializer, StudyGroupSerializer, SubjectSerializer,
)

# ── HEMIS Sync cache keys ─────────────────────────────────────
_SYNC_ACTIVE_KEY  = "hemis_sync:active"
_SYNC_LOG_KEY     = "hemis_sync:log:{sid}"
_SYNC_STATUS_KEY  = "hemis_sync:status:{sid}"
_SYNC_HISTORY_KEY = "hemis_sync:history"
_SYNC_TTL         = 3600  # 1 soat

ADMIN_ROLES = {"admin", "superadmin"}
READ_ROLES  = {"admin", "superadmin", "audit_inspector", "methodist", "department_head", "proctor", "teacher"}


def _ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)


def _err(detail, code=400):
    return Response({"success": False, "detail": detail}, status=code)


from utils import safe_int as _safe_int, clean_search as _clean_search


class UniversityListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = University.objects.all()
        return Response({"success": True, "data": UniversitySerializer(qs, many=True).data})

    def post(self, request):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        s = UniversitySerializer(data=request.data)
        if s.is_valid():
            s.save()
            return _ok(s.data, 201)
        return _err(s.errors, 400)


class UniversityDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return University.objects.get(pk=pk)
        except University.DoesNotExist:
            return None

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        s = UniversitySerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return _ok(s.data)
        return _err(s.errors, 400)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=204)


class FacultyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        university_id = request.query_params.get("university_id")
        qs = Faculty.objects.filter(is_active=True, is_archived=False).select_related("university")
        if university_id:
            qs = qs.filter(university_id=university_id)
        return Response({"success": True, "data": FacultySerializer(qs, many=True).data})

    def post(self, request):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        s = FacultySerializer(data=request.data)
        if s.is_valid():
            s.save()
            return _ok(s.data, 201)
        return _err(s.errors, 400)


class FacultyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Faculty.objects.get(pk=pk)
        except Faculty.DoesNotExist:
            return None

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        s = FacultySerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return _ok(s.data)
        return _err(s.errors, 400)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=204)


class SpecialtyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        faculty_id = request.query_params.get("faculty_id")
        search     = _clean_search(request.query_params.get("search", ""))
        qs = Specialty.objects.filter(is_active=True, is_archived=False).select_related("faculty")
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        if search:
            qs = qs.filter(name__icontains=search)

        if request.query_params.get("compact") == "true":
            items = qs.values("id", "name", "code")[:1000]
            return Response({"success": True, "data": list(items)})

        page      = _safe_int(request.query_params.get("page"), 1, minimum=1)
        page_size = _safe_int(request.query_params.get("page_size"), 50, minimum=1, maximum=200)
        total     = qs.count()
        offset    = (page - 1) * page_size
        items     = qs[offset:offset + page_size]

        return Response({"success": True, "data": {
            "data": SpecialtySerializer(items, many=True).data,
            "meta": {"total": total, "page": page, "page_size": page_size},
        }})

    def post(self, request):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        s = SpecialtySerializer(data=request.data)
        if s.is_valid():
            s.save()
            return _ok(s.data, 201)
        return _err(s.errors, 400)


class SpecialtyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Specialty.objects.get(pk=pk)
        except Specialty.DoesNotExist:
            return None

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        s = SpecialtySerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return _ok(s.data)
        return _err(s.errors, 400)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=204)


class StudyGroupListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        specialty_id = request.query_params.get("specialty_id")
        faculty_id   = request.query_params.get("faculty_id")
        faculty_ids_raw = request.query_params.get("faculty_ids", "")
        faculty_id_list = [x.strip() for x in faculty_ids_raw.split(",") if x.strip()]
        search       = _clean_search(request.query_params.get("search", ""))
        qs = StudyGroup.objects.filter(is_active=True, is_archived=False).select_related(
            "specialty", "specialty__faculty"
        )
        if specialty_id:
            qs = qs.filter(specialty_id=specialty_id)
        elif faculty_id_list:
            qs = qs.filter(specialty__faculty_id__in=faculty_id_list)
        elif faculty_id:
            qs = qs.filter(specialty__faculty_id=faculty_id)
        if search:
            qs = qs.filter(name__icontains=search)

        if request.query_params.get("compact") == "true":
            # So'rovnoma targetlash UI: fakultet → guruh zanjiri
            items = []
            for g in qs.order_by("study_year", "name")[:3000]:
                items.append({
                    "id": str(g.id),
                    "name": g.name,
                    "study_year": g.study_year,
                    "specialty_id": str(g.specialty_id) if g.specialty_id else None,
                    "specialty_name": g.specialty.name if g.specialty_id else None,
                    "faculty_id": str(g.specialty.faculty_id) if g.specialty_id else None,
                })
            return Response({"success": True, "data": items})

        page      = _safe_int(request.query_params.get("page"), 1, minimum=1)
        page_size = _safe_int(request.query_params.get("page_size"), 50, minimum=1, maximum=200)
        total     = qs.count()
        offset    = (page - 1) * page_size
        items     = qs[offset:offset + page_size]

        return Response({"success": True, "data": {
            "data": StudyGroupSerializer(items, many=True).data,
            "meta": {"total": total, "page": page, "page_size": page_size},
        }})

    def post(self, request):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        s = StudyGroupSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return _ok(s.data, 201)
        return _err(s.errors, 400)


class StudyGroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return StudyGroup.objects.get(pk=pk)
        except StudyGroup.DoesNotExist:
            return None

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        s = StudyGroupSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return _ok(s.data)
        return _err(s.errors, 400)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.delete()
        return Response(status=204)


class SubjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        faculty_id = request.query_params.get("faculty_id")
        search     = _clean_search(request.query_params.get("search", ""))
        qs = Subject.objects.filter(is_active=True, is_archived=False).select_related("faculty")
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        if search:
            qs = qs.filter(name__icontains=search)

        if request.query_params.get("compact") == "true":
            items = qs.values("id", "name", "code")[:1000]
            return Response({"success": True, "data": list(items)})

        page      = _safe_int(request.query_params.get("page"), 1, minimum=1)
        page_size = _safe_int(request.query_params.get("page_size"), 50, minimum=1, maximum=200)
        total     = qs.count()
        offset    = (page - 1) * page_size
        items     = qs[offset:offset + page_size]

        return Response({"success": True, "data": {
            "data": SubjectSerializer(items, many=True).data,
            "meta": {"total": total, "page": page, "page_size": page_size},
        }})

    def post(self, request):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        s = SubjectSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return _ok(s.data, 201)
        return _err(s.errors, 400)


class SubjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Subject.objects.get(pk=pk)
        except Subject.DoesNotExist:
            return None

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        s = SubjectSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return _ok(s.data)
        return _err(s.errors, 400)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ADMIN_ROLES:
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=204)


def _catalog_stats():
    return {
        "universities": University.objects.filter(is_active=True).count(),
        "faculties":    Faculty.objects.filter(is_active=True, is_archived=False).count(),
        "specialties":  Specialty.objects.filter(is_active=True, is_archived=False).count(),
        "groups":       StudyGroup.objects.filter(is_active=True, is_archived=False).count(),
        "subjects":     Subject.objects.filter(is_active=True, is_archived=False).count(),
    }


class HemisSyncView(APIView):
    """
    GET  /api/v1/catalog/sync/  — statistika + so'nggi sync holati
    POST /api/v1/catalog/sync/  — sinxronlashni boshlash (async)

    Body:
      {
        "university_code": "NDU",
        "university_name": "...",
        "sync_faculties":  true,
        "sync_specialties": true,
        "sync_groups":     true,
        "sync_subjects":   true,
        "mock":            true
      }
    """
    permission_classes = [IsAuthenticated]
    SYNC_ALLOWED = {"admin", "superadmin", "audit_inspector"}

    def get(self, request):
        if getattr(request.user, "role", None) not in self.SYNC_ALLOWED:
            return Response({"success": False, "detail": "Ruxsat yo'q."}, status=403)

        active_sid = cache.get(_SYNC_ACTIVE_KEY)
        active_status = None
        if active_sid:
            active_status = cache.get(_SYNC_STATUS_KEY.format(sid=active_sid))

        return Response({"success": True, "data": {
            "stats":         _catalog_stats(),
            "active_sync_id": active_sid,
            "active_status":  active_status,
        }})

    def post(self, request):
        if getattr(request.user, "role", None) not in self.SYNC_ALLOWED:
            return Response({"success": False, "detail": "Ruxsat yo'q."}, status=403)

        # Avvalgi sync hali davom etayotgan bo'lsa — rad etamiz
        active_sid = cache.get(_SYNC_ACTIVE_KEY)
        if active_sid:
            active_status = cache.get(_SYNC_STATUS_KEY.format(sid=active_sid)) or {}
            if active_status.get("running"):
                return Response({
                    "success": False,
                    "detail": "Sinxronlash allaqachon davom etmoqda.",
                    "data": {"sync_id": active_sid}
                }, status=409)

        uni_code      = (request.data.get("university_code") or "NDU").strip().upper() or "NDU"
        uni_name      = (request.data.get("university_name") or
                         "Navoiy davlat universiteti").strip()
        from django.conf import settings as _dj_settings
        _env_mock = getattr(_dj_settings, "HEMIS_MOCK_MODE", False)
        # Frontend "mock" yuborsa — faqat aniq True/False
        if "mock" in request.data:
            use_mock = bool(request.data.get("mock"))
        else:
            use_mock = bool(_env_mock)
        # Mock demo ma'lumot real universitet (NDU) ga aralashmasin
        if use_mock:
            if uni_code in ("", "NSPI", "NDU") or not uni_code.startswith("DEMO"):
                uni_code = "DEMO"
            if not uni_name or "Nukus" in uni_name or "Navoiy" in uni_name:
                uni_name = "DEMO (Mock katalog)"
        sync_fac      = bool(request.data.get("sync_faculties", True))
        sync_spec     = bool(request.data.get("sync_specialties", True))
        sync_grp      = bool(request.data.get("sync_groups", True))
        sync_subj     = bool(request.data.get("sync_subjects", True))
        only_subjects = not (sync_fac or sync_spec or sync_grp) and sync_subj

        sid = str(_uuid.uuid4())[:8]
        log_key    = _SYNC_LOG_KEY.format(sid=sid)
        status_key = _SYNC_STATUS_KEY.format(sid=sid)

        # Dastlabki holat
        started_at = _dt.now().isoformat()
        cache.set(_SYNC_ACTIVE_KEY, sid, _SYNC_TTL)
        cache.set(status_key, {
            "sync_id":    sid,
            "running":    True,
            "started_at": started_at,
            "started_by": request.user.full_name,
            "options": {
                "university_code": uni_code,
                "university_name": uni_name,
                "mock":            use_mock,
                "sync_faculties":  sync_fac,
                "sync_specialties":sync_spec,
                "sync_groups":     sync_grp,
                "sync_subjects":   sync_subj,
            }
        }, _SYNC_TTL)

        out = StringIO()

        def _run():
            try:
                kwargs = {
                    "university_code": uni_code,
                    "university_name": uni_name,
                    "only_subjects":   only_subjects,
                    "mock":            use_mock,
                    "stdout":          out,
                    "stderr":          out,
                    "no_color":        True,
                }
                call_command("sync_hemis_catalog", **kwargs)
                # Real mode da barcha specialty+guruhlarni to'liq sinxronlash
                if not use_mock and sync_grp:
                    call_command(
                        "sync_hemis_groups",
                        skip_specialties=False,
                        active_only=False,
                        stdout=out, stderr=out, no_color=True,
                    )
            except Exception as e:
                out.write(f"\n❌ XATO: {e}")
            finally:
                # Log va status yangilash
                log_text = out.getvalue()
                finished_at = _dt.now().isoformat()
                cache.set(log_key, log_text[-8000:], _SYNC_TTL)
                cache.set(status_key, {
                    "sync_id":     sid,
                    "running":     False,
                    "started_at":  started_at,
                    "finished_at": finished_at,
                    "started_by":  request.data.get("_user", ""),
                    "stats":       _catalog_stats(),
                    "options": {
                        "university_code": uni_code,
                        "university_name": uni_name,
                        "mock":            use_mock,
                    },
                    "success":     "XATO" not in log_text,
                }, _SYNC_TTL)
                # Active'ni tozalash
                if cache.get(_SYNC_ACTIVE_KEY) == sid:
                    cache.delete(_SYNC_ACTIVE_KEY)

                # Tarixga qo'shish
                history = cache.get(_SYNC_HISTORY_KEY) or []
                history.insert(0, {
                    "sync_id":     sid,
                    "started_at":  started_at,
                    "finished_at": finished_at,
                    "mock":        use_mock,
                    "success":     "XATO" not in log_text,
                    "stats":       _catalog_stats(),
                })
                cache.set(_SYNC_HISTORY_KEY, history[:20], _SYNC_TTL * 24)

        t = threading.Thread(target=_run, daemon=True)
        t.start()

        # Bir oz kutamiz — tez tugatilishi mumkin
        t.join(timeout=3)

        return Response({
            "success": True,
            "data": {
                "sync_id":    sid,
                "running":    t.is_alive(),
                "started_at": started_at,
            }
        }, status=202)


class HemisSyncStatusView(APIView):
    """
    GET /api/v1/catalog/sync/status/?sync_id=<sid>
    Sync jarayoni holati va log'ini qaytaradi.
    """
    permission_classes = [IsAuthenticated]
    SYNC_ALLOWED = {"admin", "superadmin", "audit_inspector"}

    def get(self, request):
        if getattr(request.user, "role", None) not in self.SYNC_ALLOWED:
            return Response({"success": False, "detail": "Ruxsat yo'q."}, status=403)

        sid = request.query_params.get("sync_id", "").strip()
        if not sid:
            # Aktiv sync bormi?
            sid = cache.get(_SYNC_ACTIVE_KEY) or ""

        if not sid:
            return Response({"success": True, "data": {"running": False, "log": ""}})

        status_data = cache.get(_SYNC_STATUS_KEY.format(sid=sid)) or {}
        log_text    = cache.get(_SYNC_LOG_KEY.format(sid=sid)) or ""

        return Response({"success": True, "data": {
            **status_data,
            "sync_id": sid,
            "log":     log_text,
            "stats":   _catalog_stats(),
        }})


class HemisSyncHistoryView(APIView):
    """
    GET /api/v1/catalog/sync/history/
    So'nggi 20 ta sync tarixi.
    """
    permission_classes = [IsAuthenticated]
    SYNC_ALLOWED = {"admin", "superadmin", "audit_inspector"}

    def get(self, request):
        if getattr(request.user, "role", None) not in self.SYNC_ALLOWED:
            return Response({"success": False, "detail": "Ruxsat yo'q."}, status=403)
        history = cache.get(_SYNC_HISTORY_KEY) or []
        return Response({"success": True, "data": history})


class HemisUserSyncView(APIView):
    """
    POST /api/v1/catalog/sync/users/
    HEMIS dan foydalanuvchilar profilini yangilash.

    Body: { "role": "student" | "teacher" | "all", "limit": 100 }
    """
    permission_classes = [IsAuthenticated]
    SYNC_ALLOWED = {"admin", "superadmin"}

    def post(self, request):
        if getattr(request.user, "role", None) not in self.SYNC_ALLOWED:
            return Response({"success": False, "detail": "Ruxsat yo'q."}, status=403)

        from apps.users.models import User
        from apps.users.hemis_service import (
            get_student_by_login, sync_user_from_hemis,
            HemisAuthError, HemisAPIError
        )
        from django.conf import settings as _s

        role_filter = request.data.get("role", "all")
        limit       = _safe_int(request.data.get("limit"), 50, minimum=1, maximum=500)

        qs = User.objects.filter(is_active=True).exclude(hemis_id=None)
        if role_filter == "student":
            qs = qs.filter(role=User.Role.STUDENT)
        elif role_filter == "teacher":
            qs = qs.filter(role=User.Role.TEACHER)
        qs = qs[:limit]

        synced = 0
        skipped = 0
        errors = []
        use_mock = getattr(_s, "HEMIS_MOCK_MODE", True)

        for user in qs:
            if use_mock:
                # Mock mode: faqat last_hemis_sync yangilaymiz
                from django.utils import timezone
                user.last_hemis_sync = timezone.now()
                user.save(update_fields=["last_hemis_sync"])
                synced += 1
                continue
            try:
                data = get_student_by_login(user.hemis_id)
                if data:
                    sync_user_from_hemis(user, data)
                    synced += 1
                else:
                    skipped += 1
            except (HemisAuthError, HemisAPIError) as e:
                errors.append({"user": user.email, "error": str(e)})
                skipped += 1

        return Response({"success": True, "data": {
            "synced":  synced,
            "skipped": skipped,
            "errors":  errors[:20],
            "mock":    use_mock,
        }})
