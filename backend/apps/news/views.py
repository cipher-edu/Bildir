from __future__ import annotations

import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NewsArticle
from .permissions import IsNewsAdmin, IsNewsAdminOrPublicRead  # noqa: F401
from .serializers import NewsArticleListSerializer, NewsArticleSerializer

logger = logging.getLogger("auth_starter.news")


def _ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)


def _err(detail, code=400):
    return Response({"success": False, "detail": detail}, status=code)


def _is_admin(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "role", None) in ("admin", "superadmin", "audit_inspector")
    )


class NewsListCreateView(APIView):
    permission_classes = [IsNewsAdminOrPublicRead]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = NewsArticle.objects.all()
        admin = _is_admin(request.user)
        status_q = request.query_params.get("status")
        category = request.query_params.get("category")
        q = (request.query_params.get("q") or "").strip()
        featured = request.query_params.get("featured")
        limit = request.query_params.get("limit")
        page = request.query_params.get("page")
        page_size = request.query_params.get("page_size")

        if admin and request.query_params.get("all") == "1":
            if status_q:
                qs = qs.filter(status=status_q)
        else:
            # Public: faqat nashr qilingan
            qs = qs.filter(status=NewsArticle.Status.PUBLISHED)

        if category:
            qs = qs.filter(category=category)
        if featured in ("1", "true", "yes"):
            qs = qs.filter(is_featured=True)
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(summary__icontains=q)
                | Q(body__icontains=q)
            )

        # Eng yangi avval (pin + published_at model Meta ordering)

        # Paginatsiya: page + page_size (default 8)
        if page is not None or page_size is not None:
            try:
                page_n = max(1, int(page or 1))
            except ValueError:
                page_n = 1
            try:
                size = int(page_size or 8)
            except ValueError:
                size = 8
            size = max(1, min(size, 50))
            total = qs.count()
            total_pages = max(1, (total + size - 1) // size)
            if page_n > total_pages:
                page_n = total_pages
            start = (page_n - 1) * size
            chunk = qs[start : start + size]
            ser = NewsArticleListSerializer(
                chunk, many=True, context={"request": request}
            )
            return _ok(
                {
                    "results": ser.data,
                    "count": total,
                    "page": page_n,
                    "page_size": size,
                    "total_pages": total_pages,
                }
            )

        try:
            n = int(limit) if limit else 0
        except ValueError:
            n = 0
        if n > 0:
            qs = qs[: min(n, 100)]

        ser = NewsArticleListSerializer(qs, many=True, context={"request": request})
        return _ok(ser.data)

    def post(self, request):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        ser = NewsArticleSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return _err(ser.errors, 400)
        article = ser.save(author=request.user)
        return _ok(
            NewsArticleSerializer(article, context={"request": request}).data,
            201,
        )


class NewsDetailView(APIView):
    """Public: slug yoki uuid; admin: patch/delete."""

    permission_classes = [IsNewsAdminOrPublicRead]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, key: str):
        """UUID yoki slug bo'yicha topish (noto'g'ri UUID → slug ga o'tadi)."""
        qs = NewsArticle.objects.all()
        # UUID ko'rinishida bo'lsa avval shu bo'yicha
        if len(key) == 36 and key.count("-") == 4:
            try:
                return qs.get(pk=key)
            except (NewsArticle.DoesNotExist, ValueError, DjangoValidationError, TypeError):
                pass
        try:
            return qs.get(slug=key)
        except NewsArticle.DoesNotExist:
            return None
        except (ValueError, DjangoValidationError, TypeError):
            return None

    def get(self, request, key):
        obj = self._get(key)
        if not obj:
            return _err("Topilmadi.", 404)
        admin = _is_admin(request.user)
        if obj.status != NewsArticle.Status.PUBLISHED and not admin:
            return _err("Topilmadi.", 404)

        return _ok(NewsArticleSerializer(obj, context={"request": request}).data)

    def patch(self, request, key):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(key)
        if not obj:
            return _err("Topilmadi.", 404)
        data = request.data.copy() if hasattr(request.data, "copy") else request.data
        # bo'sh cover yuborilsa o'zgartirmaslik
        if hasattr(data, "get") and data.get("cover") in ("", "null", None):
            if hasattr(data, "_mutable"):
                mutable = data._mutable
                data._mutable = True
                data.pop("cover", None)
                data._mutable = mutable
            elif isinstance(data, dict):
                data.pop("cover", None)

        ser = NewsArticleSerializer(
            obj, data=data, partial=True, context={"request": request}
        )
        if not ser.is_valid():
            return _err(ser.errors, 400)
        article = ser.save()
        return _ok(NewsArticleSerializer(article, context={"request": request}).data)

    def delete(self, request, key):
        if getattr(request.user, "role", None) not in ("admin", "superadmin"):
            return _err("Ruxsat yo'q.", 403)
        obj = self._get(key)
        if not obj:
            return _err("Topilmadi.", 404)
        obj.delete()
        return _ok({"deleted": True})


class NewsCategoriesView(APIView):
    permission_classes = [IsNewsAdminOrPublicRead]

    def get(self, request):
        data = [
            {"value": c.value, "label": c.label}
            for c in NewsArticle.Category
        ]
        return _ok(data)


class NewsMediaUploadView(APIView):
    """
    Rich-text / tahrirchi uchun media yuklash.
    POST multipart: file → { url: "/media/news/inline/..." }
    """

    permission_classes = [IsNewsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED = {"jpg", "jpeg", "png", "webp", "gif", "pdf", "mp4", "webm"}
    MAX_BYTES = 12 * 1024 * 1024  # 12 MB

    def post(self, request):
        f = request.FILES.get("file") or request.FILES.get("image")
        if not f:
            return _err("Fayl yuborilmadi (file).", 400)

        name = getattr(f, "name", "") or "file"
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext not in self.ALLOWED:
            return _err(
                f"Ruxsat etilmagan format: .{ext}. "
                f"Ruxsat: {', '.join(sorted(self.ALLOWED))}",
                400,
            )
        size = getattr(f, "size", 0) or 0
        if size <= 0:
            return _err("Bo'sh fayl.", 400)
        if size > self.MAX_BYTES:
            return _err("Fayl 12 MB dan oshmasin.", 400)

        from django.core.files.storage import default_storage
        import uuid as _uuid

        safe = f"news/inline/{_uuid.uuid4().hex}.{ext}"
        saved = default_storage.save(safe, f)
        url = default_storage.url(saved)
        # nisbiy path
        if url.startswith("http://") or url.startswith("https://"):
            from urllib.parse import urlparse

            url = urlparse(url).path or url
        if not url.startswith("/"):
            url = f"/media/{url.lstrip('/')}"

        return _ok(
            {
                "url": url,
                "path": saved,
                "name": name,
                "size": size,
                "content_type": getattr(f, "content_type", "") or "",
            },
            201,
        )
