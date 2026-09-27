from __future__ import annotations

from rest_framework.parsers import FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.throttles import WhistleCreateThrottle

from .models import ComplianceRisk, WhistleReport
from .permissions import (
    IsComplianceAdmin,
    IsComplianceStaff,
    IsRiskStaff,
    IsWhistlePublicCreate,
)
from .serializers import (
    ComplianceRiskSerializer,
    WhistleCreateSerializer,
    WhistleReportSerializer,
)


def _ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)


def _err(detail, code=400):
    return Response({"success": False, "detail": detail}, status=code)


class RiskListCreateView(APIView):
    permission_classes = [IsRiskStaff]
    parser_classes = [JSONParser, FormParser]

    def get(self, request):
        qs = ComplianceRisk.objects.all()
        # Public: faqat yopilmagan risklar; staff hammasi
        role = getattr(request.user, "role", None) if request.user.is_authenticated else None
        if role not in ("admin", "superadmin", "audit_inspector"):
            qs = qs.exclude(status="closed")
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return _ok(ComplianceRiskSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        ser = ComplianceRiskSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return _err(ser.errors, 400)
        obj = ser.save(created_by=request.user)
        return _ok(ComplianceRiskSerializer(obj, context={"request": request}).data, 201)


class RiskDetailView(APIView):
    permission_classes = [IsComplianceAdmin]
    parser_classes = [JSONParser, FormParser]

    def patch(self, request, pk):
        try:
            obj = ComplianceRisk.objects.get(pk=pk)
        except ComplianceRisk.DoesNotExist:
            return _err("Topilmadi.", 404)
        ser = ComplianceRiskSerializer(
            obj, data=request.data, partial=True, context={"request": request}
        )
        if not ser.is_valid():
            return _err(ser.errors, 400)
        obj = ser.save()
        return _ok(ComplianceRiskSerializer(obj, context={"request": request}).data)

    def delete(self, request, pk):
        try:
            obj = ComplianceRisk.objects.get(pk=pk)
        except ComplianceRisk.DoesNotExist:
            return _err("Topilmadi.", 404)
        obj.delete()
        return _ok({"deleted": True})


class WhistleListCreateView(APIView):
    permission_classes = [IsWhistlePublicCreate]
    throttle_classes = [WhistleCreateThrottle]
    parser_classes = [JSONParser, FormParser]

    def get(self, request):
        qs = WhistleReport.objects.all()
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return _ok(WhistleReportSerializer(qs, many=True).data)

    def post(self, request):
        ser = WhistleCreateSerializer(data=request.data)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        code = WhistleReport.generate_code()
        while WhistleReport.objects.filter(tracking_code=code).exists():
            code = WhistleReport.generate_code()
        obj = WhistleReport.objects.create(
            tracking_code=code,
            message=ser.validated_data["message"],
            context=ser.validated_data.get("context") or "",
        )
        return _ok(
            {
                "tracking_code": obj.tracking_code,
                "id": str(obj.id),
                "created_at": obj.created_at,
            },
            201,
        )


class WhistleDetailView(APIView):
    permission_classes = [IsComplianceStaff]
    parser_classes = [JSONParser, FormParser]

    def patch(self, request, pk):
        try:
            obj = WhistleReport.objects.get(pk=pk)
        except WhistleReport.DoesNotExist:
            return _err("Topilmadi.", 404)
        status = request.data.get("status")
        note = request.data.get("admin_note")
        if status in dict(WhistleReport.Status.choices):
            obj.status = status
        if note is not None:
            obj.admin_note = str(note)
        obj.save()
        return _ok(WhistleReportSerializer(obj).data)


class DashboardKpiView(APIView):
    """Admin KPI — email/Telegram yo'q, faqat dashboard."""

    permission_classes = [IsComplianceStaff]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        from apps.news.models import NewsArticle
        from apps.office.models import Appeal, SLA_HOURS
        from apps.surveys.models import Survey

        now = timezone.now()
        open_appeals = Appeal.objects.exclude(status__in=["answered", "closed"]).count()
        late = 0
        for a in Appeal.objects.exclude(status__in=["answered", "closed"]).only(
            "created_at", "status"
        ):
            if a.created_at and (now - a.created_at) > timedelta(hours=SLA_HOURS):
                late += 1

        data = {
            "open_appeals": open_appeals,
            "late_appeals": late,
            "active_surveys": Survey.objects.filter(status="published").count(),
            "published_news": NewsArticle.objects.filter(status="published").count(),
            "risks_open": ComplianceRisk.objects.exclude(status="closed").count(),
            "whistle_open": WhistleReport.objects.exclude(status="closed").count(),
        }
        return _ok(data)
