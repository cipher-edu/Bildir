from django.urls import path
from . import views

urlpatterns = [
    # User — available (admin list dan oldin aniq path)
    path("available/", views.SurveyAvailableView.as_view(), name="survey-available"),

    # Admin + general list/create
    path("", views.SurveyListCreateView.as_view(), name="survey-list"),
    path("<uuid:pk>/", views.SurveyDetailView.as_view(), name="survey-detail"),

    # Questions
    path(
        "<uuid:pk>/questions/",
        views.SurveyQuestionListCreateView.as_view(),
        name="survey-questions",
    ),
    path(
        "<uuid:pk>/questions/<uuid:qid>/",
        views.SurveyQuestionDetailView.as_view(),
        name="survey-question-detail",
    ),

    # Lifecycle
    path("<uuid:pk>/publish/", views.SurveyPublishView.as_view(), name="survey-publish"),
    path("<uuid:pk>/close/", views.SurveyCloseView.as_view(), name="survey-close"),
    path("<uuid:pk>/qr/", views.SurveyQRView.as_view(), name="survey-qr"),

    # Analytics
    path("<uuid:pk>/results/", views.SurveyResultsView.as_view(), name="survey-results"),
    path(
        "<uuid:pk>/results/export/",
        views.SurveyResultsExportView.as_view(),
        name="survey-results-export",
    ),
    path(
        "<uuid:pk>/results/export/verify/",
        views.SurveyResultsExportVerifyView.as_view(),
        name="survey-results-export-verify",
    ),
    path(
        "<uuid:pk>/participations/",
        views.SurveyParticipationsView.as_view(),
        name="survey-participations",
    ),
    path(
        "<uuid:pk>/responses/",
        views.SurveyOpenResponsesView.as_view(),
        name="survey-open-responses",
    ),

    # User take flow
    path("<uuid:pk>/take/", views.SurveyTakeView.as_view(), name="survey-take"),
    path("<uuid:pk>/start/", views.SurveyStartView.as_view(), name="survey-start"),
    path("<uuid:pk>/submit/", views.SurveySubmitView.as_view(), name="survey-submit"),
]
