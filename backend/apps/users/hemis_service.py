"""
OsiyoNigohi — HEMIS API Service

HEMIS tizimi bilan integratsiya:
  - Student login (SSO — /v1/auth/login)
  - Tutor login  (SSO — /ver1/tutor/auth/login)
  - OAuth2 flow  (Authorization Code — /oauth/authorize → /oauth/access-token)
  - Student/Tutor profil ma'lumotlarini olish
  - User modelni HEMIS ma'lumotlari bilan sinxronlash
"""
import base64
import json as _json
import logging
import secrets
import urllib.parse
import requests
from django.conf import settings
from django.utils import timezone as dj_tz

_log = logging.getLogger("eduverify.hemis")


def _email_taken_by_other(user, email):
    """HEMIS ba'zan turli foydalanuvchilar uchun bir xil email qaytaradi —
    email unique bo'lgani uchun bunday holda o'ziga tegishli bo'lmagan
    emailni yozib qo'yishga urinish IntegrityError bilan tugaydi."""
    return user.__class__.objects.exclude(pk=user.pk).filter(email=email).exists()


HEMIS_BASE  = settings.HEMIS_API_BASE_URL          # https://student.nspi.uz/rest
BACKEND_HDR = {"Authorization": f"Bearer {settings.HEMIS_BACKEND_TOKEN}"}

# OAuth2 base — hemis.nspi.uz (talaba/hodim akkaunti portali)
HEMIS_OAUTH_BASE = settings.HEMIS_OAUTH_BASE_URL   # https://hemis.nspi.uz

# HEMIS level.code → o'qish kursi
LEVEL_TO_YEAR = {
    "11": 1, "12": 2, "13": 3, "14": 4,  # bakalavr
    "21": 1, "22": 2,                      # magistr
    "31": 1, "32": 2, "33": 3,             # doktorantura
}

# HEMIS educationType.code → degree
EDU_TYPE_TO_DEGREE = {
    "11": "bachelor",
    "12": "master",
    "13": "phd",
}

# HEMIS gender.code → User.Gender
GENDER_CODE_TO_USER = {
    "11": "M",
    "12": "F",
}


class HemisAuthError(Exception):
    """HEMIS login/parol xato yoki hisobdan bloklangan."""
    pass


class HemisAPIError(Exception):
    """HEMIS API texnik xatosi."""
    pass


class HemisRateLimitError(Exception):
    """HEMIS server IP ni rate-limit qilgan (429 / CAPTCHA_REQUIRED)."""
    pass


def _extract_hemis_id_from_token(token: str) -> str | None:
    """
    HEMIS tokenidan hemis_id ni olish (JWT payload decode).

    ESLATMA: Bu funksiya JWT imzosini TEKSHIRMAYDI — HEMIS o'z serveridan
    qaytargan tokendan payload o'qiladi (ya'ni transport xavfsizligi HTTPS
    orqali ta'minlangan). Ushbu token foydalanuvchi tomonidan berilmagan,
    balki HEMIS API javobidan kelib chiqqan.

    Returns: hemis_id string yoki None (format noto'g'ri bo'lsa).
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            _log.warning("HEMIS token JWT formatida emas (parts=%d)", len(parts))
            return None
        payload_b64 = parts[1]
        # Base64 padding normalizatsiyasi
        remainder = len(payload_b64) % 4
        if remainder:
            payload_b64 += "=" * (4 - remainder)
        payload = _json.loads(base64.b64decode(payload_b64))
        hemis_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
        if not hemis_id:
            _log.warning("HEMIS JWT payload'da hemis_id topilmadi. keys=%s", list(payload.keys()))
        return str(hemis_id) if hemis_id else None
    except Exception as exc:
        _log.warning("HEMIS token payload decode xatosi: %s", exc)
        return None


def student_login(login: str, password: str) -> dict:
    """
    HEMIS SSO orqali student autentifikatsiyasi.

    Returns:
        {
          "token": "<hemis_student_token>",
          "hemis_id": 41447,
          "full_name": "...",
        }
    Raises:
        HemisAuthError — login/parol noto'g'ri
        HemisAPIError  — API muammosi
    """
    try:
        resp = requests.post(
            f"{HEMIS_BASE}/v1/auth/login",
            json={"login": login, "password": password},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS serverga ulanib bo'lmadi: {e}")

    data = resp.json()

    if not data.get("success"):
        code = data.get("code", 0)
        if code == 401:
            raise HemisAuthError("Login yoki parol xato.")
        inner = (data.get("data") or {}).get("error", "")
        if code == 429 or resp.status_code == 429 or inner == "CAPTCHA_REQUIRED":
            _log.warning("HEMIS rate-limit (student_login): %s", data.get("error"))
            raise HemisRateLimitError(
                "HEMIS parol bilan kirishni vaqtincha chekladi. "
                "Iltimos \"HEMIS OAuth\" tugmasi orqali kiring."
            )
        msg = data.get("error") or "Noma'lum xato"
        raise HemisAPIError(f"HEMIS xatosi: {msg}")

    token_data = data.get("data", {})
    token = token_data.get("token") or token_data.get("access_token", "")

    # hemis_id — avval API response'dan olamiz, bo'lmasa JWT payload'dan
    hemis_id = token_data.get("id") or token_data.get("user_id")
    if not hemis_id and token:
        hemis_id = _extract_hemis_id_from_token(token)

    if not hemis_id:
        _log.error("HEMIS student_login: hemis_id aniqlanmadi. token=%s...", token[:20] if token else "")
        raise HemisAuthError("HEMIS foydalanuvchi identifikatori aniqlanmadi.")

    return {"token": token, "hemis_id": hemis_id}


def get_student_me(hemis_token: str) -> dict:
    """
    HEMIS /v1/account/me — student to'liq profil ma'lumotlari.
    """
    try:
        resp = requests.get(
            f"{HEMIS_BASE}/v1/account/me",
            headers={"Authorization": f"Bearer {hemis_token}"},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS /account/me ga ulanib bo'lmadi: {e}")

    data = resp.json()
    if not data.get("success"):
        raise HemisAPIError(f"HEMIS /me xatosi: {data.get('error')}")
    return data["data"]


def get_student_by_login(login: str) -> dict | None:
    """
    Backend token bilan talabani login (student_id_number) bo'yicha izlash.
    HEMIS student loginida /account/me ishlamasa, bu fallback sifatida ishlatiladi.
    """
    try:
        resp = requests.get(
            f"{HEMIS_BASE}/v1/data/student-list",
            headers=BACKEND_HDR,
            params={"search": login, "limit": 1},
            timeout=15,
        )
        data = resp.json()
        if data.get("success") and data["data"]["items"]:
            return data["data"]["items"][0]
    except Exception:
        pass
    return None


def tutor_login(login: str, password: str) -> dict:
    """
    HEMIS Tutor API orqali o'qituvchi/hodim autentifikatsiyasi.

    Returns:
        {
          "token": "<hemis_tutor_token>",
          "refresh_token": "<refresh_token>",
          "hemis_id": ...,
        }
    Raises:
        HemisAuthError — login/parol noto'g'ri
        HemisAPIError  — API muammosi
    """
    try:
        resp = requests.post(
            f"{HEMIS_BASE}/ver1/tutor/auth/login",
            json={"login": login, "password": password},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS serverga ulanib bo'lmadi: {e}")

    data = resp.json()

    # Tutor API response format: {"ok": bool, "status_code": int, "description": str}
    if not data.get("ok"):
        status_code = data.get("status_code", 0)
        if status_code == 401 or resp.status_code == 401:
            raise HemisAuthError("Login yoki parol xato.")
        if status_code == 429 or resp.status_code == 429:
            _log.warning("HEMIS rate-limit (tutor_login): %s", data.get("description"))
            raise HemisRateLimitError(
                "HEMIS parol bilan kirishni vaqtincha chekladi. "
                "Iltimos \"HEMIS OAuth\" tugmasi orqali kiring."
            )
        msg = data.get("description") or data.get("message") or "Noma'lum xato"
        raise HemisAPIError(f"HEMIS xatosi: {msg}")

    token_data = data.get("data", {})
    token         = token_data.get("token", "")
    refresh_token = token_data.get("refresh_token", "")

    # hemis_id — JWT payload "sub" yoki "id" maydonidan
    hemis_id = None
    if token:
        try:
            payload_b64 = token.split(".")[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = _json.loads(base64.b64decode(payload_b64))
            hemis_id = payload.get("sub") or payload.get("id")
        except Exception:
            pass

    return {"token": token, "refresh_token": refresh_token, "hemis_id": hemis_id}


def get_tutor_profile(tutor_token: str) -> dict:
    """
    HEMIS /ver1/tutor/profile/index — o'qituvchi profil ma'lumotlari.

    Returns:
        {
          "tutor": {"id", "full_name", "email", "telephone"},
          "groups": [...],
          "statistics": {...}
        }
    """
    try:
        resp = requests.get(
            f"{HEMIS_BASE}/ver1/tutor/profile/index",
            headers={"Authorization": f"Bearer {tutor_token}"},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS /tutor/profile ga ulanib bo'lmadi: {e}")

    data = resp.json()
    # Tutor API response format: {"ok": bool, "status_code": int, "data": {...}}
    if not data.get("ok"):
        msg = data.get("description") or data.get("message") or "Noma'lum xato"
        raise HemisAPIError(f"HEMIS tutor profil xatosi: {msg}")

    return data.get("data") or data.get("result") or {}


def sync_user_from_tutor(user, tutor_profile: dict) -> None:
    """
    HEMIS Tutor profil ma'lumotlari bilan User modelini yangilash.

    tutor_profile — HEMIS /ver1/tutor/profile/index dan kelgan dict.
    Tarkibida: {"tutor": {...}, "groups": [...]}
    """
    from apps.core.models import Faculty

    tutor_data = tutor_profile.get("tutor") or tutor_profile

    update_fields = []

    # ── To'liq ism ────────────────────────────────────────────
    full_name = (tutor_data.get("full_name") or "").strip()
    if full_name:
        parts = full_name.split()
        last_name  = parts[0].title() if len(parts) > 0 else ""
        first_name = " ".join(parts[1:]).title() if len(parts) > 1 else ""

        if last_name and user.last_name != last_name:
            user.last_name = last_name
            update_fields.append("last_name")
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            update_fields.append("first_name")

    # ── Telefon ───────────────────────────────────────────────
    phone = (tutor_data.get("telephone") or "").strip()
    if phone and user.phone != phone:
        user.phone = phone
        update_fields.append("phone")

    # ── Email ─────────────────────────────────────────────────
    email = (tutor_data.get("email") or "").strip()
    if email and user.email.endswith("@hemis.local") and not _email_taken_by_other(user, email):
        user.email = email
        update_fields.append("email")

    # ── Fakultet (department orqali) ──────────────────────────
    # Guruhlardan birinchisining department ini olamiz
    groups = tutor_profile.get("groups") or []
    if groups:
        dept = (groups[0].get("department") or {})
        dept_code = str(dept.get("code", "")).strip()
        if dept_code:
            fac = Faculty.objects.filter(code=dept_code).first()
            if fac:
                if user.faculty_id != fac.id:
                    user.faculty    = fac
                    user.university = fac.university
                    update_fields  += ["faculty", "university"]

    # ── Vaqt tamg'asi ─────────────────────────────────────────
    from django.utils import timezone as dj_tz
    user.last_hemis_sync = dj_tz.now()
    update_fields.append("last_hemis_sync")

    if update_fields:
        user.save(update_fields=list(set(update_fields)))


def sync_user_from_hemis(user, student_data: dict) -> None:
    """
    HEMIS talaba ma'lumotlari bilan User modelini yangilash.

    student_data — HEMIS /v1/data/student-list yoki /v1/account/me dan kelgan dict.
    """
    from apps.core.models import Faculty, Specialty, StudyGroup

    update_fields = []

    # ── Shaxsiy ma'lumot ──────────────────────────────────────
    first_name = (student_data.get("first_name") or "").strip().title()
    last_name  = (student_data.get("second_name") or "").strip().title()

    if first_name and user.first_name != first_name:
        user.first_name = first_name
        update_fields.append("first_name")

    if last_name and user.last_name != last_name:
        user.last_name = last_name
        update_fields.append("last_name")

    # student_id_number
    sid = student_data.get("student_id_number", "")
    if sid and user.student_id != sid:
        user.student_id = sid
        update_fields.append("student_id")

    # email (HEMIS da ko'p hollarda bo'sh)
    hemis_email = student_data.get("email", "").strip()
    if hemis_email and user.email.endswith("@hemis.local") and not _email_taken_by_other(user, hemis_email):
        user.email = hemis_email
        update_fields.append("email")

    # ── O'quv ma'lumotlar ─────────────────────────────────────
    # Specialty — avval code, keyin integer hemis_id bilan izlash
    spec_data = student_data.get("specialty") or {}
    spec_code = str(spec_data.get("code", "")).strip()
    spec_hemis_id = str(spec_data.get("id", "")).strip()

    spec = None
    if spec_hemis_id:
        spec = Specialty.objects.filter(hemis_specialty_id=spec_hemis_id).first()
    if not spec and spec_code:
        spec = Specialty.objects.filter(code=spec_code).first()

    if spec and user.specialty_id != spec.id:
        user.specialty  = spec
        user.faculty    = spec.faculty
        user.university = spec.faculty.university
        update_fields  += ["specialty", "faculty", "university"]

    # Faculty — department.code orqali (spec topilmasa fallback)
    if not spec:
        dept = student_data.get("department") or {}
        dept_code = dept.get("code", "")
        if dept_code:
            fac = Faculty.objects.filter(code=dept_code).first()
            if fac and user.faculty_id != fac.id:
                user.faculty    = fac
                user.university = fac.university
                update_fields  += ["faculty", "university"]

    # StudyGroup — guruh nomi + specialty orqali
    grp_data = student_data.get("group") or {}
    grp_name = grp_data.get("name") or ""
    active_spec = user.specialty or spec
    if grp_name and active_spec:
        # Avval aniq moslik, so'ng stripped moslik
        grp = (
            StudyGroup.objects.filter(specialty=active_spec, name=grp_name).first()
            or StudyGroup.objects.filter(specialty=active_spec, name=grp_name.strip()).first()
        )
        if grp and user.group_id != grp.id:
            user.group = grp
            update_fields.append("group")

    # Study year (level.code)
    level_code = str((student_data.get("level") or {}).get("code", ""))
    year = LEVEL_TO_YEAR.get(level_code)
    if year and user.study_year != year:
        user.study_year = year
        update_fields.append("study_year")

    # ── Rasm (picture) ────────────────────────────────────────
    image = (student_data.get("image_full") or student_data.get("image") or "").strip()
    if image and user.picture != image:
        user.picture = image
        update_fields.append("picture")

    # ── Jinsi (gender) ────────────────────────────────────────
    gender_code = str((student_data.get("gender") or {}).get("code", ""))
    gender = GENDER_CODE_TO_USER.get(gender_code)
    if gender and user.gender != gender:
        user.gender = gender
        update_fields.append("gender")

    # ── Vaqt tamg'asi ─────────────────────────────────────────
    user.last_hemis_sync = dj_tz.now()
    update_fields.append("last_hemis_sync")

    if update_fields:
        user.save(update_fields=list(set(update_fields)))


# ═══════════════════════════════════════════════════════════════
# HEMIS OAuth2 — Authorization Code Flow
# ═══════════════════════════════════════════════════════════════
# HEMIS da ikkita mustaqil oAuth server bor:
#   employee — hemis.nspi.uz   (hodim/rahbariyat akkauntlari)
#   student  — student.nspi.uz (talaba akkauntlari)
# Endpointlar bir xil (/oauth/authorize, /oauth/access-token,
# /oauth/api/user), lekin client ro'yxatlari alohida.

def _oauth_conf(portal: str) -> tuple[str, str, str]:
    """portal ("employee"|"student") uchun (base_url, client_id, client_secret)."""
    if portal == "student":
        return (
            settings.HEMIS_STUDENT_OAUTH_BASE_URL,
            settings.HEMIS_STUDENT_OAUTH_CLIENT_ID or settings.HEMIS_OAUTH_CLIENT_ID,
            settings.HEMIS_STUDENT_OAUTH_CLIENT_SECRET or settings.HEMIS_OAUTH_CLIENT_SECRET,
        )
    return (
        HEMIS_OAUTH_BASE,
        settings.HEMIS_OAUTH_CLIENT_ID,
        settings.HEMIS_OAUTH_CLIENT_SECRET,
    )


def build_hemis_oauth_url(redirect_uri: str, state: str, portal: str = "employee") -> str:
    """
    HEMIS OAuth2 authorize URL yaratadi.

    Foydalanuvchi shu URL ga yo'naltiriladi:
      https://hemis.nspi.uz/oauth/authorize?response_type=code
        &client_id=...&redirect_uri=...&state=...&scope=basic
    """
    base, client_id, _ = _oauth_conf(portal)
    params = {
        "response_type": "code",
        "client_id":     client_id,
        "redirect_uri":  redirect_uri,
        "state":         state,
    }
    # scope faqat HEMIS_OAUTH_SCOPE aniq belgilangan bo'lsa qo'shiladi
    scope = getattr(settings, "HEMIS_OAUTH_SCOPE", "")
    if scope:
        params["scope"] = scope
    return f"{base}/oauth/authorize?" + urllib.parse.urlencode(params)


def generate_oauth_state() -> str:
    """Kriptografik xavfsiz tasodifiy state string (CSRF himoyasi)."""
    return secrets.token_urlsafe(32)


def hemis_oauth_exchange_code(code: str, redirect_uri: str, portal: str = "employee") -> dict:
    """
    Authorization code → access token almashtirish.

    POST https://hemis.nspi.uz/oauth/access-token
    {
      "grant_type": "authorization_code",
      "client_id": ..., "client_secret": ...,
      "code": ..., "redirect_uri": ...
    }

    Returns:
        {"access_token": "...", "token_type": "Bearer", ...}
    Raises:
        HemisAuthError — code yaroqsiz yoki muddati o'tgan
        HemisAPIError  — texnik xato
    """
    base, client_id, client_secret = _oauth_conf(portal)
    try:
        resp = requests.post(
            f"{base}/oauth/access-token",
            data={                                   # form-urlencoded, JSON emas!
                "grant_type":    "authorization_code",
                "client_id":     client_id,
                "client_secret": client_secret,
                "code":          code,
                "redirect_uri":  redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS OAuth token serverga ulanib bo'lmadi: {e}")

    if resp.status_code == 401:
        raise HemisAuthError("OAuth code yaroqsiz yoki muddati o'tgan.")

    if not resp.ok:
        try:
            msg = resp.json().get("message") or resp.json().get("error") or resp.text
        except Exception:
            msg = resp.text
        raise HemisAPIError(f"HEMIS OAuth token xatosi ({resp.status_code}): {msg}")

    data = resp.json()
    # Ba'zi HEMIS serverlarda {"access_token": ...} to'g'ridan qaytadi
    # Ba'zida {"data": {"access_token": ...}} formatida
    if "access_token" not in data and "data" in data:
        data = data["data"]

    if not data.get("access_token"):
        raise HemisAPIError("HEMIS OAuth: access_token olinmadi.")

    return data


def hemis_oauth_userinfo(access_token: str, portal: str = "employee") -> dict:
    """
    HEMIS OAuth2 user info endpoint.

    GET https://hemis.nspi.uz/oauth/api/user
    Authorization: Bearer <access_token>

    Returns:
        {
          "id": 12345,
          "uuid": "...",
          "type": "student" | "employee",
          "name": "Familiya Ism",
          "login": "...",
          "picture": "...",
          "email": "...",
          "university_id": 5,
          "phone": "...",
          "student_api_token": "..."   (faqat student uchun)
        }
    Raises:
        HemisAPIError
    """
    base, _, _ = _oauth_conf(portal)
    try:
        resp = requests.get(
            f"{base}/oauth/api/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
    except requests.RequestException as e:
        raise HemisAPIError(f"HEMIS OAuth userinfo serverga ulanib bo'lmadi: {e}")

    if not resp.ok:
        raise HemisAPIError(f"HEMIS OAuth userinfo xatosi ({resp.status_code})")

    data = resp.json()
    # Ba'zan {"data": {...}} ichida keladi
    if "id" not in data and "data" in data:
        data = data["data"]

    return data


def get_employee_by_hemis_id(hemis_id: str) -> dict | None:
    """
    Backend API orqali xodim ma'lumotlarini HEMIS ID bo'yicha olish.

    GET /v1/data/employee-list?search=<hemis_id>&type=all&limit=1

    Returns:
        EmployeeMeta dict yoki None
    """
    try:
        resp = requests.get(
            f"{HEMIS_BASE}/v1/data/employee-list",
            headers=BACKEND_HDR,
            params={"search": hemis_id, "type": "all", "limit": 5},
            timeout=15,
        )
        data = resp.json()
        if data.get("success"):
            items = (data.get("data") or {}).get("items") or []
            # hemis_id ga mos kelganini topamiz
            for emp in items:
                if str(emp.get("id")) == str(hemis_id) or str(emp.get("meta_id")) == str(hemis_id):
                    return emp
            if items:
                return items[0]
    except Exception:
        pass
    return None


def sync_user_from_employee(user, emp: dict) -> None:
    """
    HEMIS employee-list ma'lumotlari bilan User modelini yangilash.

    emp — EmployeeMeta dict:
      {"id", "full_name", "image", "image_full", "department",
       "staffPosition", "academicDegree", "academicRank", ...}
    """
    from apps.core.models import Faculty

    update_fields = []

    # ── Rasm ─────────────────────────────────────────────────
    image = (emp.get("image_full") or emp.get("image") or "").strip()
    if image and user.picture != image:
        user.picture = image
        update_fields.append("picture")

    # ── Lavozim (staffPosition) ───────────────────────────────
    position = (emp.get("staffPosition") or {}).get("name", "").strip()
    if position and user.position != position:
        user.position = position
        update_fields.append("position")

    # ── Akademik daraja ───────────────────────────────────────
    degree = (emp.get("academicDegree") or {}).get("name", "").strip()
    if degree and user.academic_degree != degree:
        user.academic_degree = degree
        update_fields.append("academic_degree")

    # ── Akademik unvon ────────────────────────────────────────
    rank = (emp.get("academicRank") or {}).get("name", "").strip()
    if rank and user.academic_rank != rank:
        user.academic_rank = rank
        update_fields.append("academic_rank")

    # ── Fakultet (department.code) ────────────────────────────
    dept_code = str((emp.get("department") or {}).get("code", "")).strip()
    if dept_code:
        fac = Faculty.objects.filter(code=dept_code).first()
        if fac and user.faculty_id != fac.id:
            user.faculty    = fac
            user.university = fac.university
            update_fields  += ["faculty", "university"]

    if update_fields:
        user.save(update_fields=list(set(update_fields)))


def sync_user_from_oauth(user, oauth_user: dict) -> None:
    """
    HEMIS OAuth2 foydalanuvchi ma'lumotlari bilan User modelini yangilash.

    oauth_user — /oauth/api/user dan kelgan dict:
      {"id", "type", "name", "login", "picture", "email", "phone", ...}
    """
    update_fields = []

    # ── To'liq ism ────────────────────────────────────────────
    full_name  = (oauth_user.get("name") or "").strip()
    if full_name:
        parts      = full_name.split()
        last_name  = parts[0].title() if len(parts) > 0 else ""
        first_name = " ".join(parts[1:]).title() if len(parts) > 1 else ""

        if last_name and user.last_name != last_name:
            user.last_name = last_name
            update_fields.append("last_name")
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            update_fields.append("first_name")

    # ── Email ─────────────────────────────────────────────────
    email = (oauth_user.get("email") or "").strip()
    if email and user.email.endswith("@hemis.local") and not _email_taken_by_other(user, email):
        user.email = email
        update_fields.append("email")

    # ── Telefon ───────────────────────────────────────────────
    phone = (oauth_user.get("phone") or "").strip()
    if phone and user.phone != phone:
        user.phone = phone
        update_fields.append("phone")

    # ── Rasm (picture) ────────────────────────────────────────
    picture = (oauth_user.get("picture") or "").strip()
    if picture and user.picture != picture:
        user.picture = picture
        update_fields.append("picture")

    # ── Vaqt tamg'asi ─────────────────────────────────────────
    user.last_hemis_sync = dj_tz.now()
    update_fields.append("last_hemis_sync")

    if update_fields:
        user.save(update_fields=list(set(update_fields)))
