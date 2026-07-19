"""
auth-starter — Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from utils.media_views import safe_media_serve

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
    # Media: X-Content-Type-Options nosniff + user upload attachment
    re_path(r"^media/(?P<path>.*)$", safe_media_serve),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
