"""
Multi-tenancy (university-based isolation) — SCAFFOLD

Strategiyalar:
1. **Shared schema, tenant_id kolonkasi** (eng oddiy) — har modelda tenant_id FK
2. **Schema-per-tenant** (django-tenants) — RDBMS schema isolation
3. **Database-per-tenant** (router) — to'liq fizik ajratish

Hozir scaffold = shared schema + Row-Level Security (PostgreSQL RLS).

Production'da quyidagi qadamlar bajariladi:
- Barcha asosiy modellarga `tenant_id` (= University) kolonkasi qo'shish
- TenantMiddleware: JWT'dan tenant_id'ni o'qib, request.tenant_id sifatida qo'yish
- Manager: queryset = self.filter(tenant_id=current_tenant_id)
- Migration: PostgreSQL RLS policy qo'shish:
    CREATE POLICY tenant_isolation ON exams_exam
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
"""
from contextvars import ContextVar
from django.db import connection

_current_tenant: ContextVar[str] = ContextVar("current_tenant", default="")


def set_current_tenant(tenant_id: str) -> None:
    _current_tenant.set(tenant_id)
    # PostgreSQL session variable — RLS uchun
    with connection.cursor() as cur:
        cur.execute("SET app.tenant_id = %s", [tenant_id])


def get_current_tenant() -> str:
    return _current_tenant.get()


class TenantMiddleware:
    """JWT claim'idan tenant_id'ni o'qib, request kontekstiga qo'yadi."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            tenant_id = str(getattr(user, "university_id", "") or "")
            if tenant_id:
                set_current_tenant(tenant_id)
                request.tenant_id = tenant_id
        return self.get_response(request)


class TenantManager:
    """
    Model.objects = TenantManager() — avtomatik filterlash.
    Faqat current_tenant ko'rgan ma'lumotlarni qaytaradi.
    """

    def get_queryset(self):
        from django.db.models import Manager
        qs = Manager().get_queryset()
        tenant_id = get_current_tenant()
        if tenant_id and hasattr(qs.model, "tenant_id"):
            qs = qs.filter(tenant_id=tenant_id)
        return qs
