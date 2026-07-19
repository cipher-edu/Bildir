from django.urls import path

from . import views

urlpatterns = [
    path("risks/", views.RiskListCreateView.as_view(), name="compliance-risks"),
    path("risks/<uuid:pk>/", views.RiskDetailView.as_view(), name="compliance-risk-detail"),
    path("whistle/", views.WhistleListCreateView.as_view(), name="compliance-whistle"),
    path("whistle/<uuid:pk>/", views.WhistleDetailView.as_view(), name="compliance-whistle-detail"),
    path("kpi/", views.DashboardKpiView.as_view(), name="compliance-kpi"),
]
