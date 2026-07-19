from django.contrib import admin

from .models import NewsArticle


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "status",
        "is_featured",
        "is_pinned",
        "published_at",
    )
    list_filter = ("status", "category", "is_featured", "is_pinned")
    search_fields = ("title", "summary", "slug")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
