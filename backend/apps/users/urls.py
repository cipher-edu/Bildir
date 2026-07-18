from django.urls import path
from . import views

urlpatterns = [
    # ── Email/parol kirish ───────────────────────────────────────
    path("login/",               views.LoginView.as_view(),           name="auth-login"),

    # ── HEMIS SSO kirish ─────────────────────────────────────────
    path("login/hemis/",         views.HemisLoginView.as_view(),      name="auth-hemis-login"),
    path("login/hemis/tutor/",   views.HemisTutorLoginView.as_view(), name="auth-hemis-tutor-login"),

    # ── HEMIS OAuth2 kirish ──────────────────────────────────────
    path("oauth/hemis/",         views.HemisOAuthInitView.as_view(),     name="auth-oauth-hemis-init"),
    path("oauth/callback/",      views.HemisOAuthCallbackView.as_view(), name="auth-oauth-hemis-callback"),

    # ── Chiqish ─────────────────────────────────────────────────
    path("logout/",              views.LogoutView.as_view(),           name="auth-logout"),

    # ── Token ───────────────────────────────────────────────────
    path("token/refresh/",       views.ThrottledTokenRefreshView.as_view(), name="token-refresh"),

    # ── Profil ──────────────────────────────────────────────────
    path("me/",                  views.MeView.as_view(),               name="auth-me"),
    path("me/password/",         views.ChangePasswordView.as_view(),   name="auth-change-password"),
    path("me/hemis-sync/",       views.HemisSyncView.as_view(),        name="auth-hemis-sync"),

    # ── Parolni tiklash ─────────────────────────────────────────
    path("forgot-password/",     views.ForgotPasswordView.as_view(),   name="auth-forgot-password"),
    path("reset-password/",      views.ResetPasswordView.as_view(),    name="auth-reset-password"),

    # ── Dev only ────────────────────────────────────────────────
    path("register/",            views.RegisterView.as_view(),         name="auth-register"),

    # ── Admin — Foydalanuvchilar boshqaruvi ─────────────────────
    path("users/",               views.AdminUserListView.as_view(),    name="admin-user-list"),
    path("users/<uuid:pk>/",     views.AdminUserDetailView.as_view(),  name="admin-user-detail"),

    # ── Admin — Tizim statistikasi ───────────────────────────────
    path("stats/",               views.SystemStatsView.as_view(),      name="system-stats"),
]
