from rest_framework.permissions import SAFE_METHODS, BasePermission

ADMIN_ROLES = {"admin", "superadmin"}
READ_ADMIN_ROLES = {"admin", "superadmin", "audit_inspector"}


class IsNewsAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in ADMIN_ROLES)


class IsNewsAdminOrPublicRead(BasePermission):
    """GET: ochiq; yozish: admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in ADMIN_ROLES)


class IsNewsStaffRead(BasePermission):
    """Admin ro'yxat (draftlar) — staff."""

    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and getattr(u, "role", None) in READ_ADMIN_ROLES
        )
