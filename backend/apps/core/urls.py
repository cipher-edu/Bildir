from django.urls import path
from . import views

urlpatterns = [
    path("universities/",           views.UniversityListView.as_view(),    name="university-list"),
    path("universities/<uuid:pk>/", views.UniversityDetailView.as_view(),  name="university-detail"),
    path("faculties/",              views.FacultyListView.as_view(),        name="faculty-list"),
    path("faculties/<uuid:pk>/",    views.FacultyDetailView.as_view(),      name="faculty-detail"),
    path("specialties/",            views.SpecialtyListView.as_view(),      name="specialty-list"),
    path("specialties/<uuid:pk>/",  views.SpecialtyDetailView.as_view(),    name="specialty-detail"),
    path("groups/",                 views.StudyGroupListView.as_view(),     name="group-list"),
    path("groups/<int:pk>/",        views.StudyGroupDetailView.as_view(),   name="group-detail"),
    path("subjects/",               views.SubjectListView.as_view(),        name="subject-list"),
    path("subjects/<int:pk>/",      views.SubjectDetailView.as_view(),      name="subject-detail"),
    path("sync/",                   views.HemisSyncView.as_view(),          name="hemis-sync"),
    path("sync/status/",            views.HemisSyncStatusView.as_view(),    name="hemis-sync-status"),
    path("sync/users/",             views.HemisUserSyncView.as_view(),      name="hemis-user-sync"),
    path("sync/history/",           views.HemisSyncHistoryView.as_view(),   name="hemis-sync-history"),
]
