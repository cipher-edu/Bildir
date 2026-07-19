"""
auth-starter — Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as media_serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/v1/", include([
        path("auth/",    include("apps.users.urls")),
        path("catalog/", include("apps.core.urls")),
        path("surveys/", include("apps.surveys.urls")),
        path("office/",  include("apps.office.urls")),
        path("news/",    include("apps.news.urls")),
        path("compliance/", include("apps.compliance.urls")),
        path("health/",  include("utils.health_urls")),
        path("schema/",  SpectacularAPIView.as_view(), name="schema"),
        path("docs/",    SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ])),
    # Media doim (DEBUG=False da ham) — Next.js /media proxy va to'g'ridan-to'g'ri so'rovlar
    re_path(
        r"^media/(?P<path>.*)$",
        media_serve,
        {"document_root": settings.MEDIA_ROOT},
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
