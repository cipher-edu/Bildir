"""Surveys API ruxsatlari."""
from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN_ROLES = {"admin", "superadmin"}
READ_RESULTS_ROLES = {"admin", "superadmin", "audit_inspector"}
MANAGE_ROLES = {"admin", "superadmin"}


class IsSurveyAdmin(BasePermission):
    """So'rovnoma yaratish / nashr / yopish."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in MANAGE_ROLES
        )


class IsSurveyResultsReader(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in READ_RESULTS_ROLES
        )


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
