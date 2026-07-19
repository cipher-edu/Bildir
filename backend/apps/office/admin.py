from django.contrib import admin

from .models import Appeal, AppealAttachment, ResponsiblePerson


@admin.register(ResponsiblePerson)
class ResponsiblePersonAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "position", "department", "order", "is_active")
    list_filter = ("is_active", "is_public")
    search_fields = ("first_name", "last_name", "position", "email")


class AppealAttachmentInline(admin.TabularInline):
    model = AppealAttachment
    extra = 0
    readonly_fields = ("original_name", "size", "content_type", "created_at")


@admin.register(Appeal)
class AppealAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "user",
        "status",
        "category",
        "answered_late",
        "created_at",
        "answered_at",
    )
    list_filter = ("status", "category", "answered_late")
    search_fields = ("subject", "body", "user__email")
    inlines = [AppealAttachmentInline]
