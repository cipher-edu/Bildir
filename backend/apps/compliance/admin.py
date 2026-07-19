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
