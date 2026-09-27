from rest_framework.permissions import SAFE_METHODS, BasePermission

ADMIN_ROLES = {"admin", "superadmin"}
STAFF_ROLES = {"admin", "superadmin", "audit_inspector"}


class IsComplianceAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in ADMIN_ROLES)


class IsComplianceStaff(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in STAFF_ROLES)


class IsRiskStaff(BasePermission):
    """Xavf reestri ichki hujjat: o'qish — komplayens xodimi, yozish — admin."""

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        role = getattr(u, "role", None)
        if request.method in SAFE_METHODS:
            return role in STAFF_ROLES
        return role in ADMIN_ROLES


class IsWhistlePublicCreate(BasePermission):
    """POST ochiq (anonim); GET/PATCH — staff. Email/Telegram talab qilinmaydi."""

    def has_permission(self, request, view):
        if request.method == "POST":
            return True
        if request.method in SAFE_METHODS or request.method in ("PATCH", "PUT"):
            u = request.user
            return bool(u and u.is_authenticated and getattr(u, "role", None) in STAFF_ROLES)
        return False
