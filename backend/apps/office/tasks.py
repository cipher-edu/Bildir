"""Celery tasks — murojaat QR va HEMIS profil sinxron."""
from __future__ import annotations

import logging

logger = logging.getLogger("auth_starter.office.tasks")

try:
    from celery import shared_task
except ImportError:
    # Celery o'rnatilmagan bo'lsa — sync decorator
    def shared_task(*args, **kwargs):
        def deco(fn):
            fn.delay = lambda *a, **k: fn(*a, **k)
            return fn
        if args and callable(args[0]):
            return deco(args[0])
        return deco


@shared_task(name="office.generate_appeal_qr_code", bind=True, max_retries=3)
def generate_appeal_qr_code(self, appeal_id: str):
    from apps.office.models import Appeal
    from apps.office.services import ensure_appeal_qr

    try:
        appeal = Appeal.objects.get(pk=appeal_id)
    except Appeal.DoesNotExist:
        logger.warning("appeal not found for QR: %s", appeal_id)
        return {"ok": False, "reason": "not_found"}
    try:
        ensure_appeal_qr(appeal)
        return {"ok": True, "id": str(appeal_id), "code": appeal.unique_code}
    except Exception as exc:
        logger.exception("QR generate failed appeal=%s", appeal_id)
        raise self.retry(exc=exc, countdown=10)


@shared_task(name="users.sync_hemis_profile", bind=True, max_retries=2)
def sync_hemis_profile(self, user_id: str, access_token: str = "", portal: str = "student"):
    """
    HEMIS dan foydalanuvchi profilini yangilash (Survey NSPI Celery analog).
    access_token — HEMIS student/tutor API token (ixtiyoriy, sessiya/cache dan).
    """
    from django.contrib.auth import get_user_model
    from apps.users import hemis_service as hs

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return {"ok": False, "reason": "user_not_found"}

    if not access_token:
        return {"ok": False, "reason": "no_token"}

    try:
        if portal == "employee" or portal == "tutor":
            profile = hs.get_tutor_profile(access_token) if hasattr(hs, "get_tutor_profile") else None
            if profile and hasattr(hs, "sync_user_from_tutor"):
                hs.sync_user_from_tutor(user, profile)
                return {"ok": True, "user_id": str(user_id), "portal": "tutor"}
        else:
            # Student /account/me
            me = None
            if hasattr(hs, "get_student_me"):
                me = hs.get_student_me(access_token)
            elif hasattr(hs, "student_me"):
                me = hs.student_me(access_token)
            if me and hasattr(hs, "sync_user_from_hemis"):
                hs.sync_user_from_hemis(user, me)
                return {"ok": True, "user_id": str(user_id), "portal": "student"}
        return {"ok": False, "reason": "profile_empty"}
    except Exception as exc:
        logger.exception("HEMIS sync failed user=%s", user_id)
        try:
            raise self.retry(exc=exc, countdown=30)
        except Exception:
            return {"ok": False, "reason": str(exc)[:200]}
