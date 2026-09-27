from django.contrib import admin

from .models import ComplianceRisk, WhistleReport


@admin.register(ComplianceRisk)
class ComplianceRiskAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "status", "owner_name", "due_date", "created_at")
    list_filter = ("level", "status")


@admin.register(WhistleReport)
class WhistleReportAdmin(admin.ModelAdmin):
    list_display = ("tracking_code", "status", "created_at")
    list_filter = ("status",)
    readonly_fields = ("tracking_code", "created_at")

    def get_object(self, request, object_id, from_field=None):
        from utils.at_rest import open_text

        obj = super().get_object(request, object_id, from_field)
        if obj is not None:
            obj.message = open_text(obj.message, purpose="whistle-message")
            obj.context = open_text(obj.context, purpose="whistle-context")
        return obj
