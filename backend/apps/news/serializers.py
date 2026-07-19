from __future__ import annotations

import json

from rest_framework import serializers

from utils.i18n_fields import (
    NEWS_CATEGORY_I18N,
    NEWS_STATUS_I18N,
    label_i18n,
    locale_from_request,
    merge_i18n_payload,
    pick_i18n,
)

from .models import NewsArticle

ALLOWED_COVER_EXT = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_COVER_BYTES = 8 * 1024 * 1024

I18N_TEXT_FIELDS = ("title", "summary", "body", "meta_title", "meta_description")


class NewsArticleSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True, use_url=False)
    cover_url = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    title_i18n = serializers.JSONField(required=False)
    summary_i18n = serializers.JSONField(required=False)
    body_i18n = serializers.JSONField(required=False)
    meta_title_i18n = serializers.JSONField(required=False)
    meta_description_i18n = serializers.JSONField(required=False)

    class Meta:
        model = NewsArticle
        fields = [
            "id",
            "title",
            "title_i18n",
            "slug",
            "summary",
            "summary_i18n",
            "body",
            "body_i18n",
            "cover",
            "cover_url",
            "category",
            "category_label",
            "status",
            "status_label",
            "is_featured",
            "is_pinned",
            "published_at",
            "author",
            "author_name",
            "meta_title",
            "meta_title_i18n",
            "meta_description",
            "meta_description_i18n",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "author",
            "created_at",
            "updated_at",
            "cover_url",
            "author_name",
            "category_label",
            "status_label",
        ]

    def _locale(self) -> str:
        req = self.context.get("request")
        if req is not None:
            return locale_from_request(req)
        return self.context.get("locale") or "uz"

    def _relative_media(self, obj: NewsArticle) -> str | None:
        if not obj.cover:
            return None
        try:
            url = obj.cover.url
        except Exception:
            return None
        if url.startswith("http://") or url.startswith("https://"):
            from urllib.parse import urlparse

            return urlparse(url).path or url
        if not url.startswith("/"):
            return f"/media/{url.lstrip('/')}"
        return url

    def get_cover_url(self, obj: NewsArticle):
        return self._relative_media(obj)

    def get_category_label(self, obj: NewsArticle) -> str:
        return label_i18n(
            NEWS_CATEGORY_I18N,
            obj.category,
            self._locale(),
            obj.get_category_display(),
        )

    def get_status_label(self, obj: NewsArticle) -> str:
        return label_i18n(
            NEWS_STATUS_I18N,
            obj.status,
            self._locale(),
            obj.get_status_display(),
        )

    def get_author_name(self, obj: NewsArticle):
        u = obj.author
        if not u:
            return None
        name = getattr(u, "full_name", None) or ""
        if name:
            return name
        return f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or u.email

    def to_internal_value(self, data):
        if hasattr(data, "items"):
            mutable = {}
            for k, v in data.items():
                mutable[k] = v
            data = mutable
            for field in I18N_TEXT_FIELDS:
                data = merge_i18n_payload(data, field)
                raw = data.get(f"{field}_i18n")
                if isinstance(raw, str) and raw.strip().startswith("{"):
                    try:
                        data[f"{field}_i18n"] = json.loads(raw)
                    except Exception:
                        pass
        return super().to_internal_value(data)

    def _with_base_locale(self, base: str, i18n) -> dict:
        """Admin tahrir uchun: base maydon → uz kaliti."""
        out = dict(i18n) if isinstance(i18n, dict) else {}
        if base and not (isinstance(out.get("uz"), str) and out["uz"].strip()):
            out["uz"] = base
        return out

    def to_representation(self, instance):
        data = super().to_representation(instance)
        loc = self._locale()
        # Localized display fields (API consumer gets translated title/summary/body)
        data["title"] = pick_i18n(instance.title, instance.title_i18n, loc)
        data["summary"] = pick_i18n(instance.summary, instance.summary_i18n, loc)
        data["body"] = pick_i18n(instance.body, instance.body_i18n, loc)
        data["meta_title"] = pick_i18n(instance.meta_title, instance.meta_title_i18n, loc)
        data["meta_description"] = pick_i18n(
            instance.meta_description, instance.meta_description_i18n, loc
        )
        data["title_i18n"] = self._with_base_locale(instance.title, instance.title_i18n)
        data["summary_i18n"] = self._with_base_locale(instance.summary, instance.summary_i18n)
        data["body_i18n"] = self._with_base_locale(instance.body, instance.body_i18n)
        data["meta_title_i18n"] = self._with_base_locale(
            instance.meta_title, instance.meta_title_i18n
        )
        data["meta_description_i18n"] = self._with_base_locale(
            instance.meta_description, instance.meta_description_i18n
        )
        rel = self._relative_media(instance)
        data["cover"] = rel
        data["cover_url"] = rel
        data["locale"] = loc
        return data

    def validate_cover(self, f):
        if not f:
            return f
        name = getattr(f, "name", "") or "file"
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext not in ALLOWED_COVER_EXT:
            raise serializers.ValidationError(
                f"Ruxsat etilmagan format: .{ext}. Ruxsat: {', '.join(sorted(ALLOWED_COVER_EXT))}"
            )
        size = getattr(f, "size", 0) or 0
        if size > MAX_COVER_BYTES:
            raise serializers.ValidationError("Muqova rasm 8 MB dan oshmasin.")
        return f

    def validate_body(self, value: str):
        if not (value or "").strip():
            # allow if body_i18n has content
            return value or ""
        if len(value) > 500_000:
            raise serializers.ValidationError("Matn juda uzun.")
        return value

    def validate_title(self, value: str):
        v = (value or "").strip()
        if v and len(v) < 3:
            raise serializers.ValidationError("Sarlavha kamida 3 belgi.")
        return v


class NewsArticleListSerializer(NewsArticleSerializer):
    class Meta(NewsArticleSerializer.Meta):
        fields = [f for f in NewsArticleSerializer.Meta.fields if f != "body" and f != "body_i18n"]
