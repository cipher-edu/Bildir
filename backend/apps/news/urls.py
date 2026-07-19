from django.urls import path

from . import views

urlpatterns = [
    path("", views.NewsListCreateView.as_view(), name="news-list"),
    path("categories/", views.NewsCategoriesView.as_view(), name="news-categories"),
    path("media/upload/", views.NewsMediaUploadView.as_view(), name="news-media-upload"),
    path("<str:key>/", views.NewsDetailView.as_view(), name="news-detail"),
]
