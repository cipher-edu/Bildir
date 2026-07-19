from django.urls import path

from . import views

urlpatterns = [
    # Mas'ul shaxslar
    path("persons/", views.PersonListCreateView.as_view(), name="office-persons"),
    path("persons/<uuid:pk>/", views.PersonDetailView.as_view(), name="office-person-detail"),
    # Foydalanuvchi murojaatlari
    path("appeals/", views.MyAppealsView.as_view(), name="office-my-appeals"),
    path("appeals/<uuid:pk>/", views.MyAppealDetailView.as_view(), name="office-my-appeal"),
    # Admin murojaatlar
    path("admin/appeals/", views.AdminAppealsView.as_view(), name="office-admin-appeals"),
    path(
        "admin/appeals/<uuid:pk>/",
        views.AdminAppealDetailView.as_view(),
        name="office-admin-appeal",
    ),
    path(
        "admin/appeals/<uuid:pk>/answer/",
        views.AdminAppealAnswerView.as_view(),
        name="office-admin-answer",
    ),
    path(
        "admin/appeals/<uuid:pk>/status/",
        views.AdminAppealStatusView.as_view(),
        name="office-admin-status",
    ),
]
