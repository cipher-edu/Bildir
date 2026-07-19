from django.contrib import admin
from .models import Survey, SurveyQuestion, SurveyParticipation, SurveyResponse


class SurveyQuestionInline(admin.TabularInline):
    model = SurveyQuestion
    extra = 0
    readonly_fields = ("id",)


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = (
        "title", "status", "audience", "privacy_mode",
        "start_at", "end_at", "created_at",
    )
    list_filter = ("status", "audience", "privacy_mode")
    search_fields = ("title", "description")
    readonly_fields = (
        "id", "published_at", "closed_at", "created_at", "updated_at", "qr_image",
    )
    filter_horizontal = ("faculties", "specialties", "groups")
    inlines = [SurveyQuestionInline]


@admin.register(SurveyQuestion)
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ("survey", "order", "q_type", "text", "required")
    list_filter = ("q_type",)
    search_fields = ("text",)


@admin.register(SurveyParticipation)
class SurveyParticipationAdmin(admin.ModelAdmin):
    list_display = ("survey", "user", "status", "started_at", "submitted_day")
    list_filter = ("status",)
    readonly_fields = (
        "id", "token_hash", "token_used", "token_expires_at",
        "started_at", "submitted_day",
    )
    search_fields = ("user__email",)


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    """
    Muhrlangan javoblar — admin orqali tahrirlanmasin.
    answers_encrypted o'qilishi mumkin, lekin o'zgartirish model.save da blok.
    """
    list_display = (
        "id", "survey", "respondent", "is_sealed",
        "submitted_bucket", "content_hash",
    )
    list_filter = ("is_sealed",)
    readonly_fields = (
        "id", "survey", "respondent", "meta",
        "answers_encrypted", "content_hash", "signature",
        "is_sealed", "seal_version", "submitted_bucket", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # faqat ko'rish

    def has_delete_permission(self, request, obj=None):
        # Superadmin o'chirishni xohlasa — audit; default yo'q
        return request.user.is_superuser
