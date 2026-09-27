from rest_framework import serializers

from utils.i18n_fields import locale_from_request, pick_i18n

from .models import ComplianceRisk, WhistleReport


class ComplianceRiskSerializer(serializers.ModelSerializer):
    title_i18n = serializers.JSONField(required=False)
    description_i18n = serializers.JSONField(required=False)
    level_label = serializers.CharField(source="get_level_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ComplianceRisk
        fields = [
            "id",
            "title",
            "title_i18n",
            "description",
            "description_i18n",
            "level",
            "level_label",
            "status",
            "status_label",
            "owner_name",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "level_label", "status_label"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        req = self.context.get("request")
        loc = locale_from_request(req) if req is not None else "uz"
        data["title"] = pick_i18n(instance.title, instance.title_i18n, loc)
        data["description"] = pick_i18n(instance.description, instance.description_i18n, loc)
        data["locale"] = loc
        return data


class WhistleReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhistleReport
        fields = [
            "id",
            "tracking_code",
            "message",
            "context",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tracking_code", "created_at", "updated_at"]

    def to_representation(self, instance):
        from utils.at_rest import open_text

        data = super().to_representation(instance)
        data["message"] = open_text(instance.message, purpose="whistle-message")
        data["context"] = open_text(instance.context, purpose="whistle-context")
        return data


class WhistleCreateSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=10, max_length=5000)
    context = serializers.CharField(required=False, allow_blank=True, max_length=200)
