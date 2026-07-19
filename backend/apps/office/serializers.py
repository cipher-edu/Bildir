from __future__ import annotations

from rest_framework import serializers

from .models import Appeal, AppealAttachment, ResponsiblePerson, SLA_HOURS

ALLOWED_EXT = {
    "pdf", "png", "jpg", "jpeg", "webp", "gif", "doc", "docx", "txt", "zip",
}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class ResponsiblePersonSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    photo_url = serializers.SerializerMethodField()
    position_i18n = serializers.JSONField(required=False)
    department_i18n = serializers.JSONField(required=False)
    academic_title_i18n = serializers.JSONField(required=False)
    reception_hours_i18n = serializers.JSONField(required=False)
    biography_i18n = serializers.JSONField(required=False)
    responsibilities_i18n = serializers.JSONField(required=False)
    extra_info_i18n = serializers.JSONField(required=False)

    class Meta:
        model = ResponsiblePerson
        fields = [
            "id",
            "photo",
            "photo_url",
            "first_name",
            "last_name",
            "middle_name",
            "full_name",
            "position",
            "position_i18n",
            "department",
            "department_i18n",
            "academic_title",
            "academic_title_i18n",
            "phone",
            "email",
            "office_room",
            "reception_hours",
            "reception_hours_i18n",
            "biography",
            "biography_i18n",
            "responsibilities",
            "responsibilities_i18n",
            "extra_info",
            "extra_info_i18n",
            "order",
            "is_active",
            "is_public",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "full_name", "photo_url"]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        try:
            return obj.photo.url
        except Exception:
            return None

    def to_representation(self, instance):
        from utils.i18n_fields import ensure_i18n_bucket, locale_from_request, pick_i18n

        data = super().to_representation(instance)
        req = self.context.get("request")
        loc = locale_from_request(req) if req is not None else "uz"
        for field in (
            "position",
            "department",
            "academic_title",
            "reception_hours",
            "biography",
            "responsibilities",
            "extra_info",
        ):
            base = getattr(instance, field, "") or ""
            i18n = getattr(instance, f"{field}_i18n", None)
            data[field] = pick_i18n(base, i18n, loc)
            data[f"{field}_i18n"] = ensure_i18n_bucket(base, i18n)
        data["locale"] = loc
        return data


class AppealAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = AppealAttachment
        fields = [
            "id",
            "kind",
            "original_name",
            "size",
            "content_type",
            "file_url",
            "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        if not obj.file:
            return None
        try:
            return obj.file.url
        except Exception:
            return None


class AppealSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField()
    answer_attachments = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    answered_late_flag = serializers.SerializerMethodField()
    hours_left = serializers.SerializerMethodField()
    sla_deadline = serializers.SerializerMethodField()
    sla_hours = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    answered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Appeal
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "subject",
            "body",
            "category",
            "category_display",
            "status",
            "status_display",
            "answer_text",
            "answered_at",
            "answered_by",
            "answered_by_name",
            "answered_late",
            "answered_late_flag",
            "is_overdue",
            "hours_left",
            "sla_deadline",
            "sla_hours",
            "admin_note",
            "attachments",
            "answer_attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "status",
            "answer_text",
            "answered_at",
            "answered_by",
            "answered_late",
            "admin_note",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        u = obj.user
        if not u:
            return ""
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return name or u.email

    def get_answered_by_name(self, obj):
        u = obj.answered_by
        if not u:
            return None
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return name or u.email

    def get_attachments(self, obj):
        qs = obj.attachments.filter(kind=AppealAttachment.Kind.USER)
        return AppealAttachmentSerializer(qs, many=True).data

    def get_answer_attachments(self, obj):
        qs = obj.attachments.filter(kind=AppealAttachment.Kind.ADMIN)
        return AppealAttachmentSerializer(qs, many=True).data

    def get_is_overdue(self, obj):
        return obj.is_overdue

    def get_answered_late_flag(self, obj):
        """Javob berilgan va kechikkan YOKI hali javob yo'q va muddat o'tgan."""
        if obj.answered_late:
            return True
        return obj.is_overdue

    def get_hours_left(self, obj):
        return obj.hours_left

    def get_sla_deadline(self, obj):
        return obj.sla_deadline.isoformat() if obj.created_at else None

    def get_sla_hours(self, obj):
        return SLA_HOURS


class AppealCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=300)
    body = serializers.CharField(min_length=10, max_length=10000)
    category = serializers.ChoiceField(
        choices=Appeal.Category.choices, default=Appeal.Category.GENERAL
    )


class AppealAnswerSerializer(serializers.Serializer):
    answer_text = serializers.CharField(min_length=2, max_length=10000)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
