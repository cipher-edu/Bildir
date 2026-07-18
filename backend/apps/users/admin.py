"""
OsiyoNigohi — User Admin
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = [
        "email", "full_name", "role_badge",
        "university", "faculty", "is_active",
    ]
    list_filter   = [
        "role", "is_active", "language",
        "university", "faculty",
    ]
    search_fields = ["email", "first_name", "last_name", "hemis_id", "student_id", "phone"]
    ordering      = ["-created_at"]
    readonly_fields = ["last_hemis_sync", "created_at", "updated_at"]
    list_per_page  = 30

    ROLE_COLORS = {
        "superadmin":      "#6f42c1",
        "admin":           "#dc3545",
        "proctor":         "#fd7e14",
        "department_head": "#20c997",
        "methodist":       "#0dcaf0",
        "teacher":         "#0d6efd",
        "student":         "#198754",
        "audit_inspector": "#6c757d",
    }

    @admin.display(description="Rol")
    def role_badge(self, obj):
        color = self.ROLE_COLORS.get(obj.role, "#6c757d")
        label = obj.get_role_display() if hasattr(obj, "get_role_display") else obj.role
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, label
        )

    fieldsets = (
        (None, {
            "fields": ("email", "password")
        }),
        ("Shaxsiy ma'lumot", {
            "fields": ("first_name", "last_name", "phone", "language", "role")
        }),
        ("Tashkiliy bog'lanishlar", {
            "fields": ("university", "faculty", "specialty", "group", "study_year")
        }),
        ("HEMIS", {
            "fields": ("hemis_id", "student_id", "last_hemis_sync"),
            "classes": ("collapse",),
        }),
        ("Huquqlar", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            "classes": ("collapse",),
        }),
        ("Vaqtlar", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email", "first_name", "last_name",
                "role", "password1", "password2",
            ),
        }),
    )
