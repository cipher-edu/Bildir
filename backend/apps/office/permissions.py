from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN_ROLES = {"admin", "superadmin"}
READ_ADMIN_ROLES = {"admin", "superadmin", "audit_inspector"}


class IsOfficeAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in ADMIN_ROLES)


class IsOfficeAdminOrReadAuth(BasePermission):
    """GET: ochiq (landing); yozish: admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in ADMIN_ROLES)


class IsAppealAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and getattr(u, "role", None) in READ_ADMIN_ROLES
        )
