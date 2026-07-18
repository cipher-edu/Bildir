"""
OsiyoNigohi — Core Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import University, Faculty, Specialty, StudyGroup, Subject


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display   = ["short_name", "name", "code", "city", "faculty_count", "is_active"]
    list_filter    = ["is_active", "city"]
    search_fields  = ["name", "short_name", "code", "domain"]
    ordering       = ["name"]
    list_per_page  = 20

    @admin.display(description="Fakultetlar")
    def faculty_count(self, obj):
        return obj.faculties.count()


class SpecialtyInline(admin.TabularInline):
    model  = Specialty
    extra  = 0
    fields = ["name", "code", "hemis_specialty_id", "is_active"]
    show_change_link = True


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display   = ["name", "code", "university", "specialty_count", "is_active"]
    list_filter    = ["university", "is_active"]
    search_fields  = ["name", "code"]
    ordering       = ["university__name", "name"]
    list_per_page  = 20
    inlines        = [SpecialtyInline]

    @admin.display(description="Yo'nalishlar")
    def specialty_count(self, obj):
        return obj.specialties.count()


class StudyGroupInline(admin.TabularInline):
    model  = StudyGroup
    extra  = 0
    fields = ["name", "study_year", "degree", "is_active"]
    show_change_link = True


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display   = ["name", "code", "faculty", "group_count", "hemis_specialty_id", "is_active"]
    list_filter    = ["faculty__university", "faculty", "is_active"]
    search_fields  = ["name", "code", "hemis_specialty_id"]
    list_per_page  = 30
    inlines        = [StudyGroupInline]

    @admin.display(description="Guruhlar")
    def group_count(self, obj):
        return obj.groups.count()


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display   = ["name", "specialty", "degree_badge", "study_year", "is_active"]
    list_filter    = ["specialty__faculty__university", "specialty__faculty", "study_year", "degree", "is_active"]
    search_fields  = ["name"]
    ordering       = ["study_year", "name"]
    list_per_page  = 50

    @admin.display(description="Daraja")
    def degree_badge(self, obj):
        colors = {
            "bachelor": "#28a745",
            "master":   "#007bff",
            "phd":      "#6f42c1",
        }
        color = colors.get(obj.degree, "#6c757d")
        label = obj.get_degree_display()
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, label
        )


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display   = ["name", "code", "faculty", "credit_hours", "hemis_course_id", "is_active"]
    list_filter    = ["faculty__university", "faculty", "is_active"]
    search_fields  = ["name", "code", "hemis_course_id"]
    ordering       = ["name"]
    list_per_page  = 30
