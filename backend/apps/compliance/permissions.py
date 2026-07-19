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


class IsRiskPublicReadOrStaffWrite(BasePermission):
    """GET ochiq (shaffoflik); yozish — admin/staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) in STAFF_ROLES)


class IsWhistlePublicCreate(BasePermission):
    """POST ochiq (anonim); GET/PATCH — staff. Email/Telegram talab qilinmaydi."""

    def has_permission(self, request, view):
        if request.method == "POST":
            return True
        if request.method in SAFE_METHODS or request.method in ("PATCH", "PUT"):
            u = request.user
            return bool(u and u.is_authenticated and getattr(u, "role", None) in STAFF_ROLES)
        return False
