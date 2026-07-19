from __future__ import annotations

import logging

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appeal, AppealAttachment, ResponsiblePerson, SLA_HOURS
from .permissions import IsAppealAdmin, IsOfficeAdmin, IsOfficeAdminOrReadAuth
from .serializers import (
    ALLOWED_EXT,
    MAX_FILE_BYTES,
    AppealAnswerSerializer,
    AppealCreateSerializer,
    AppealSerializer,
    ResponsiblePersonSerializer,
)

logger = logging.getLogger("auth_starter.office")


def _ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)


def _err(detail, code=400):
    return Response({"success": False, "detail": detail}, status=code)


def _validate_upload(f):
    name = getattr(f, "name", "") or "file"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXT:
        return f"Ruxsat etilmagan format: .{ext}. Ruxsat: {', '.join(sorted(ALLOWED_EXT))}"
    size = getattr(f, "size", 0) or 0
    if size > MAX_FILE_BYTES:
        return f"Fayl juda katta ({size // (1024*1024)} MB). Maksimal 10 MB."
    if size == 0:
        return "Bo'sh fayl."
    return None


# ── Mas'ul shaxslar ───────────────────────────────────────────

class PersonListCreateView(APIView):
    permission_classes = [IsOfficeAdminOrReadAuth]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = ResponsiblePerson.objects.all()
        role = getattr(request.user, "role", None) if request.user and request.user.is_authenticated else None
        if role not in ("admin", "superadmin", "audit_inspector"):
            # Landing / oddiy foydalanuvchi: faqat ochiq va faol
            qs = qs.filter(is_active=True, is_public=True)
        elif request.query_params.get("all") != "1":
            if request.query_params.get("inactive") != "1":
                qs = qs.filter(is_active=True)
        ser = ResponsiblePersonSerializer(qs, many=True, context={"request": request})
        return _ok(ser.data)

    def post(self, request):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        ser = ResponsiblePersonSerializer(data=request.data)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        person = ser.save()
        return _ok(
            ResponsiblePersonSerializer(person, context={"request": request}).data,
            201,
        )


class PersonDetailView(APIView):
    permission_classes = [IsOfficeAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_obj(self, pk):
        try:
            return ResponsiblePerson.objects.get(pk=pk)
        except ResponsiblePerson.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_obj(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        return _ok(ResponsiblePersonSerializer(obj, context={"request": request}).data)

    def patch(self, request, pk):
        obj = self.get_obj(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        ser = ResponsiblePersonSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        person = ser.save()
        return _ok(ResponsiblePersonSerializer(person, context={"request": request}).data)

    def delete(self, request, pk):
        obj = self.get_obj(pk)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.delete()
        return _ok({"deleted": True})


# ── Murojaatlar (foydalanuvchi) ───────────────────────────────

class MyAppealsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        qs = (
            Appeal.objects.filter(user=request.user)
            .prefetch_related("attachments")
            .select_related("answered_by")
        )
        return _ok(AppealSerializer(qs, many=True).data)

    def post(self, request):
        ser = AppealCreateSerializer(data=request.data)
        if not ser.is_valid():
            return _err(ser.errors, 400)

        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        if len(files) > 5:
            return _err("Maksimal 5 ta fayl biriktirish mumkin.", 400)

        for f in files:
            err = _validate_upload(f)
            if err:
                return _err(err, 400)

        appeal = Appeal.objects.create(
            user=request.user,
            subject=ser.validated_data["subject"].strip(),
            body=ser.validated_data["body"].strip(),
            category=ser.validated_data.get("category") or Appeal.Category.GENERAL,
            status=Appeal.Status.PENDING,
        )
        for f in files:
            AppealAttachment.objects.create(
                appeal=appeal,
                kind=AppealAttachment.Kind.USER,
                file=f,
                original_name=getattr(f, "name", "file")[:255],
                size=getattr(f, "size", 0) or 0,
                content_type=getattr(f, "content_type", "") or "",
            )

        logger.info(
            "appeal created id=%s user=%s files=%s",
            appeal.id,
            request.user.email,
            len(files),
        )
        appeal = (
            Appeal.objects.filter(pk=appeal.pk)
            .prefetch_related("attachments")
            .select_related("answered_by")
            .first()
        )
        return _ok(AppealSerializer(appeal).data, 201)


class MyAppealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            appeal = (
                Appeal.objects.filter(user=request.user)
                .prefetch_related("attachments")
                .select_related("answered_by")
                .get(pk=pk)
            )
        except Appeal.DoesNotExist:
            return _err("Topilmadi.", 404)
        return _ok(AppealSerializer(appeal).data)


# ── Murojaatlar (admin) ───────────────────────────────────────

class AdminAppealsView(APIView):
    permission_classes = [IsAppealAdmin]

    def get(self, request):
        qs = (
            Appeal.objects.all()
            .select_related("user", "answered_by")
            .prefetch_related("attachments")
        )
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        late = request.query_params.get("late")
        if late in ("1", "true", "yes"):
            # kechikkan: javob yo'q va muddat o'tgan YOKI answered_late
            deadline = timezone.now() - timedelta(hours=SLA_HOURS)
            qs = qs.filter(
                Q(answered_late=True)
                | (
                    ~Q(status__in=[Appeal.Status.ANSWERED, Appeal.Status.CLOSED])
                    & Q(created_at__lt=deadline)
                )
            )
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(subject__icontains=q)
                | Q(body__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
            )
        return _ok(AppealSerializer(qs[:300], many=True).data)


class AdminAppealDetailView(APIView):
    permission_classes = [IsAppealAdmin]

    def get(self, request, pk):
        try:
            appeal = (
                Appeal.objects.select_related("user", "answered_by")
                .prefetch_related("attachments")
                .get(pk=pk)
            )
        except Appeal.DoesNotExist:
            return _err("Topilmadi.", 404)
        return _ok(AppealSerializer(appeal).data)


class AdminAppealAnswerView(APIView):
    permission_classes = [IsOfficeAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        try:
            appeal = Appeal.objects.get(pk=pk)
        except Appeal.DoesNotExist:
            return _err("Topilmadi.", 404)

        # Multipart yoki JSON
        data = request.data
        ser = AppealAnswerSerializer(data={
            "answer_text": data.get("answer_text") or data.get("answer") or "",
            "admin_note": data.get("admin_note") or "",
        })
        if not ser.is_valid():
            return _err(ser.errors, 400)

        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        if len(files) > 5:
            return _err("Maksimal 5 ta fayl biriktirish mumkin.", 400)
        for f in files:
            err = _validate_upload(f)
            if err:
                return _err(err, 400)

        note = ser.validated_data.get("admin_note") or ""
        if note:
            appeal.admin_note = note
            appeal.save(update_fields=["admin_note", "updated_at"])
        appeal.mark_answered(request.user, ser.validated_data["answer_text"].strip())

        for f in files:
            AppealAttachment.objects.create(
                appeal=appeal,
                kind=AppealAttachment.Kind.ADMIN,
                file=f,
                original_name=getattr(f, "name", "file")[:255],
                size=getattr(f, "size", 0) or 0,
                content_type=getattr(f, "content_type", "") or "",
            )

        appeal = (
            Appeal.objects.select_related("user", "answered_by")
            .prefetch_related("attachments")
            .get(pk=appeal.pk)
        )
        return _ok(AppealSerializer(appeal).data)


class AdminAppealStatusView(APIView):
    permission_classes = [IsOfficeAdmin]

    def post(self, request, pk):
        try:
            appeal = Appeal.objects.get(pk=pk)
        except Appeal.DoesNotExist:
            return _err("Topilmadi.", 404)
        status = request.data.get("status")
        allowed = {c.value for c in Appeal.Status}
        if status not in allowed:
            return _err(f"status: {', '.join(sorted(allowed))}", 400)
        appeal.status = status
        appeal.save(update_fields=["status", "updated_at"])
        return _ok(AppealSerializer(appeal).data)
