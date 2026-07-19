"""
Surveys API — admin va ishtirokchi oqimlari.

Admin:
  GET/POST   /api/v1/surveys/
  GET/PATCH/DELETE /api/v1/surveys/{id}/
  POST       /api/v1/surveys/{id}/questions/
  PATCH/DELETE /api/v1/surveys/{id}/questions/{qid}/
  POST       /api/v1/surveys/{id}/publish/
  POST       /api/v1/surveys/{id}/close/
  GET        /api/v1/surveys/{id}/qr/
  GET        /api/v1/surveys/{id}/results/
  GET        /api/v1/surveys/{id}/participations/
  GET        /api/v1/surveys/{id}/responses/   (faqat open)

User:
  GET  /api/v1/surveys/available/
  GET  /api/v1/surveys/{id}/take/
  POST /api/v1/surveys/{id}/start/
  POST /api/v1/surveys/{id}/submit/
"""
from __future__ import annotations

import io
import logging

from django.db.models import Count, Prefetch, Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Survey, SurveyQuestion, SurveyParticipation, SurveyResponse
from .permissions import IsSurveyAdmin, IsSurveyResultsReader
from .serializers import (
    SurveyListSerializer,
    SurveyDetailSerializer,
    SurveyQuestionWriteSerializer,
    SurveyTakeSerializer,
    SubmitAnswersSerializer,
    ParticipationSerializer,
)
from . import services
from .export_results import build_results_xlsx, verify_results_xlsx
from .services import SurveyServiceError, user_can_take, decrypt_and_verify

logger = logging.getLogger("auth_starter.surveys")


def _ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)


def _err(detail, code=400):
    return Response({"success": False, "detail": detail}, status=code)


def _svc_err(exc: SurveyServiceError):
    return _err(exc.detail, exc.code)


# ── Admin list / create ───────────────────────────────────────

class SurveyListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsSurveyAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        """Admin: barcha; user: faqat available redirect emas — list filter."""
        role = getattr(request.user, "role", None)
        qs = Survey.objects.annotate(
            question_count=Count("questions", distinct=True),
            response_count=Count("responses", distinct=True),
        )
        if role in ("admin", "superadmin", "audit_inspector"):
            status_f = request.query_params.get("status")
            if status_f:
                qs = qs.filter(status=status_f)
            if request.user.university_id and role != "superadmin":
                qs = qs.filter(
                    Q(university_id=request.user.university_id)
                    | Q(university__isnull=True)
                )
        else:
            # Oddiy foydalanuvchi — faqat o'ziga ochiq published
            qs = qs.filter(status=Survey.Status.PUBLISHED)
            # server-side filter keyin available da to'liq
        qs = qs.order_by("-created_at")
        return _ok(SurveyListSerializer(qs[:100], many=True).data)

    def post(self, request):
        ser = SurveyDetailSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return _err(ser.errors, 400)
        survey = ser.save()
        survey = Survey.objects.annotate(
            question_count=Count("questions"),
            response_count=Count("responses"),
        ).get(pk=survey.pk)
        return _ok(SurveyDetailSerializer(survey).data, 201)


class SurveyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Survey.objects.annotate(
                question_count=Count("questions", distinct=True),
                response_count=Count("responses", distinct=True),
            ).prefetch_related(
                Prefetch(
                    "questions",
                    queryset=SurveyQuestion.objects.order_by("order", "created_at"),
                ),
                "faculties",
                "specialties",
                "groups",
            ).get(pk=pk)
        except Survey.DoesNotExist:
            return None

    def get(self, request, pk):
        survey = self._get(pk)
        if not survey:
            return _err("Topilmadi.", 404)
        role = getattr(request.user, "role", None)
        if role not in ("admin", "superadmin", "audit_inspector"):
            ok, reason = user_can_take(survey, request.user)
            if survey.status != Survey.Status.PUBLISHED and not ok:
                return _err("Ruxsat yo'q.", 403)
        return _ok(SurveyDetailSerializer(survey).data)

    def patch(self, request, pk):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        survey = self._get(pk)
        if not survey:
            return _err("Topilmadi.", 404)
        ser = SurveyDetailSerializer(
            survey, data=request.data, partial=True, context={"request": request}
        )
        if not ser.is_valid():
            return _err(ser.errors, 400)
        try:
            survey = ser.save()
        except Exception as e:
            return _err(str(e), 400)
        survey = self._get(pk)
        return _ok(SurveyDetailSerializer(survey).data)

    def delete(self, request, pk):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        survey = self._get(pk)
        if not survey:
            return _err("Topilmadi.", 404)
        if survey.status != Survey.Status.DRAFT:
            return _err("Faqat qoralama o'chiriladi. Avval yoping yoki arxivlang.", 400)
        survey.delete()
        return _ok({"deleted": True})


# ── Questions CRUD (admin, draft) ─────────────────────────────

class SurveyQuestionListCreateView(APIView):
    permission_classes = [IsSurveyAdmin]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        if survey.status != Survey.Status.DRAFT:
            return _err("Savol faqat qoralamada qo'shiladi.", 400)
        ser = SurveyQuestionWriteSerializer(data=request.data)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        data = dict(ser.validated_data)
        if "order" not in data:
            last = survey.questions.order_by("-order").first()
            data["order"] = (last.order + 1) if last else 0
        q = SurveyQuestion.objects.create(survey=survey, **data)
        return _ok(SurveyQuestionWriteSerializer(q).data, 201)


class SurveyQuestionDetailView(APIView):
    permission_classes = [IsSurveyAdmin]

    def _get(self, pk, qid):
        try:
            return SurveyQuestion.objects.select_related("survey").get(
                pk=qid, survey_id=pk
            )
        except SurveyQuestion.DoesNotExist:
            return None

    def patch(self, request, pk, qid):
        q = self._get(pk, qid)
        if not q:
            return _err("Topilmadi.", 404)
        if q.survey.status != Survey.Status.DRAFT:
            return _err("Savol faqat qoralamada tahrirlanadi.", 400)
        ser = SurveyQuestionWriteSerializer(q, data=request.data, partial=True)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        ser.save()
        return _ok(SurveyQuestionWriteSerializer(q).data)

    def delete(self, request, pk, qid):
        q = self._get(pk, qid)
        if not q:
            return _err("Topilmadi.", 404)
        if q.survey.status != Survey.Status.DRAFT:
            return _err("Savol faqat qoralamada o'chiriladi.", 400)
        q.delete()
        return _ok({"deleted": True})


# ── Publish / Close / QR ──────────────────────────────────────

class SurveyPublishView(APIView):
    permission_classes = [IsSurveyAdmin]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        try:
            survey = services.publish_survey(survey)
        except SurveyServiceError as e:
            return _svc_err(e)
        survey = Survey.objects.annotate(
            question_count=Count("questions"),
            response_count=Count("responses"),
        ).prefetch_related("questions").get(pk=survey.pk)
        return _ok(SurveyDetailSerializer(survey).data)


class SurveyCloseView(APIView):
    permission_classes = [IsSurveyAdmin]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        try:
            survey = services.close_survey(survey)
        except SurveyServiceError as e:
            return _svc_err(e)
        return _ok(SurveyListSerializer(survey).data)


class SurveyQRView(APIView):
    permission_classes = [IsSurveyAdmin]

    def get(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        data = {
            "public_url": survey.public_url,
            "qr_url": request.build_absolute_uri(survey.qr_image.url) if survey.qr_image else None,
        }
        if request.query_params.get("download") and survey.qr_image:
            try:
                return FileResponse(
                    survey.qr_image.open("rb"),
                    as_attachment=True,
                    filename=f"survey-{survey.id}.png",
                    content_type="image/png",
                )
            except Exception:
                raise Http404
        return _ok(data)


# ── Results / Participations ──────────────────────────────────

class SurveyResultsView(APIView):
    permission_classes = [IsSurveyResultsReader]

    def get(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        try:
            data = services.aggregate_results(survey)
        except SurveyServiceError as e:
            return _svc_err(e)
        return _ok(data)


class SurveyResultsExportView(APIView):
    """Natijalarni himoyalangan Excel (XLSX) ko'rinishida yuklab olish."""
    permission_classes = [IsSurveyResultsReader]

    def get(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        try:
            data, meta = build_results_xlsx(survey, exporter=request.user)
        except SurveyServiceError as e:
            return _svc_err(e)
        except Exception:
            logger.exception("results export failed survey=%s", pk)
            return _err("Excel eksport muvaffaqiyatsiz.", 500)

        logger.info(
            "results export survey=%s export_id=%s by=%s responses=%s",
            pk,
            meta.get("export_id"),
            getattr(request.user, "email", None),
            meta.get("response_count"),
        )
        resp = FileResponse(
            io.BytesIO(data),
            as_attachment=True,
            filename=meta["filename"],
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
        resp["X-Export-Id"] = meta["export_id"]
        resp["X-Content-SHA256"] = meta["content_hash"]
        resp["X-Content-Signature"] = meta["signature"]
        return resp


class SurveyResultsExportVerifyView(APIView):
    """Yuklangan Excel fayl muhri (HMAC) ni tekshirish."""
    permission_classes = [IsSurveyResultsReader]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        f = request.FILES.get("file")
        if not f:
            return _err("file maydoni kerak (multipart).", 400)
        if f.size > 25 * 1024 * 1024:
            return _err("Fayl juda katta (max 25 MB).", 400)
        raw = f.read()
        try:
            result = verify_results_xlsx(survey, raw)
        except SurveyServiceError as e:
            return _svc_err(e)
        except Exception:
            logger.exception("export verify failed survey=%s", pk)
            return _err("Tekshirish muvaffaqiyatsiz.", 500)
        return _ok(result)


class SurveyParticipationsView(APIView):
    """Kim ishtirok etgan — javob matni yo'q."""
    permission_classes = [IsSurveyResultsReader]

    def get(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        if not survey.track_participation:
            return _err("Bu so'rovnomada ishtirok kuzatish o'chirilgan.", 403)
        qs = (
            SurveyParticipation.objects.filter(survey=survey)
            .select_related("user")
            .order_by("-started_at")[:500]
        )
        return _ok(ParticipationSerializer(qs, many=True).data)


class SurveyOpenResponsesView(APIView):
    """Faqat open rejim — individual javoblar (shaxs bilan)."""
    permission_classes = [IsSurveyAdmin]

    def get(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        if survey.privacy_mode != Survey.PrivacyMode.OPEN:
            return _err(
                "Anonim so'rovnomada individual javoblar ochilmaydi.",
                403,
            )
        out = []
        for resp in survey.responses.select_related("respondent").order_by("-created_at")[:200]:
            try:
                answers = decrypt_and_verify(resp)
            except SurveyServiceError:
                answers = None
            out.append({
                "id": str(resp.id),
                "respondent_id": str(resp.respondent_id) if resp.respondent_id else None,
                "respondent_email": resp.respondent.email if resp.respondent_id else None,
                "submitted_bucket": resp.submitted_bucket.isoformat(),
                "content_hash": resp.content_hash,
                "answers": answers,
                "seal_ok": answers is not None,
            })
        return _ok(out)


# ── User flow ─────────────────────────────────────────────────

class SurveyAvailableView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        qs = (
            Survey.objects.filter(status=Survey.Status.PUBLISHED)
            .annotate(
                question_count=Count("questions", distinct=True),
                response_count=Count("responses", distinct=True),
            )
            .filter(
                Q(start_at__isnull=True) | Q(start_at__lte=now),
                Q(end_at__isnull=True) | Q(end_at__gte=now),
            )
            .order_by("-created_at")
        )
        available = []
        for s in qs.prefetch_related("faculties", "specialties", "groups")[:200]:
            ok, _ = user_can_take(s, user)
            if ok:
                row = SurveyListSerializer(s, context={"request": request}).data
                row["already_submitted"] = services.user_already_submitted(s, user)
                available.append(row)
        return _ok(available)


class SurveyTakeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            survey = Survey.objects.prefetch_related(
                Prefetch("questions", queryset=SurveyQuestion.objects.order_by("order"))
            ).get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        ok, reason = user_can_take(survey, request.user)
        # Allaqachon topshirgan bo'lsa ham savollarni ko'rsatmaslik mumkin
        already = services.user_already_submitted(survey, request.user)
        if not ok and not already:
            return _err(reason, 403)
        return _ok(SurveyTakeSerializer(survey, context={"request": request}).data)


class SurveyStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        try:
            part, token = services.start_participation(survey, request.user)
        except SurveyServiceError as e:
            return _svc_err(e)
        return _ok({
            "participation_id": str(part.id),
            "token": token,
            "expires_at": part.token_expires_at.isoformat() if part.token_expires_at else None,
            "privacy_mode": survey.privacy_mode,
            "message": (
                "Javoblaringiz shaxsingizga bog'lanmaydi."
                if survey.privacy_mode == Survey.PrivacyMode.ANONYMOUS
                else "Javoblaringiz profilingiz bilan bog'lanadi."
            ),
        })


class SurveySubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            survey = Survey.objects.prefetch_related("questions").get(pk=pk)
        except Survey.DoesNotExist:
            return _err("Topilmadi.", 404)
        ser = SubmitAnswersSerializer(data=request.data)
        if not ser.is_valid():
            return _err(ser.errors, 400)
        try:
            resp = services.submit_response(
                survey,
                request.user,
                ser.validated_data["token"],
                ser.validated_data["answers"],
            )
        except SurveyServiceError as e:
            return _svc_err(e)

        # Anonim: response id qaytariladi, lekin user bog'lanishi yo'q
        return _ok({
            "submitted": True,
            "response_id": str(resp.id),
            "privacy_mode": survey.privacy_mode,
            "content_hash": resp.content_hash,
            "submitted_bucket": resp.submitted_bucket.isoformat(),
        }, 201)
