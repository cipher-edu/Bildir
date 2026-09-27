"""
OsiyoNigohi — Auth & User Views

Endpointlar:
  POST /api/v1/auth/login/              — email + parol bilan kirish
  POST /api/v1/auth/login/hemis/        — HEMIS SSO bilan student kirish
  POST /api/v1/auth/login/hemis/tutor/  — HEMIS SSO bilan o'qituvchi kirish
  GET  /api/v1/auth/oauth/hemis/        — HEMIS OAuth2 authorize URL olish
  GET  /api/v1/auth/oauth/callback/     — HEMIS OAuth2 callback (code → JWT)
  POST /api/v1/auth/logout/             — refresh tokenni blacklistga qo'shish
  POST /api/v1/auth/token/refresh/      — access tokenni yangilash (SimpleJWT)
  GET  /api/v1/auth/me/                 — joriy foydalanuvchi profili
  PATCH /api/v1/auth/me/               — profilni yangilash
  POST /api/v1/auth/me/password/        — parol o'zgartirish
  POST /api/v1/auth/register/           — ro'yxatdan o'tish (faqat dev/test)
"""
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, AuditLog
from .throttles import (
    ForgotPasswordThrottle,
    LoginAccountThrottle,
    LoginIPThrottle,
    RefreshTokenThrottle,
)
from .serializers import (
    UserSerializer, UserUpdateSerializer,
    RegisterSerializer, AdminCreateUserSerializer, ChangePasswordSerializer,
    HemisLoginSerializer, HemisTutorLoginSerializer,
)
from .hemis_service import (
    student_login as hemis_student_login,
    get_student_me,
    get_student_by_login,
    sync_user_from_hemis,
    tutor_login as hemis_tutor_login,
    get_tutor_profile,
    sync_user_from_tutor,
    build_hemis_oauth_url,
    generate_oauth_state,
    hemis_oauth_exchange_code,
    hemis_oauth_userinfo,
    sync_user_from_oauth,
    get_employee_by_hemis_id,
    sync_user_from_employee,
    HemisAuthError, HemisAPIError, HemisRateLimitError,
)
from utils.jwt_security import (
    blacklist_refresh,
    clear_jwt_cookies,
    denylist_access_token,
    extract_access_from_request,
    extract_refresh_from_request,
    set_jwt_cookies,
)
from utils.session_epoch import bump_epoch, current_epoch, token_epoch_ok


def _tokens(user):
    """User uchun access + refresh. Epoch parol almashganda sessiyani uzadi."""
    refresh = RefreshToken.for_user(user)
    refresh["epoch"] = current_epoch(user.pk)
    access = refresh.access_token
    return {"access": str(access), "refresh": str(refresh)}


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _auth_success(user, *, extra=None, status_code=status.HTTP_200_OK, created=None):
    """
    JWT faqat httpOnly cookie da.
    JSON javobda access/refresh qaytarilmaydi — sahifa skripti o‘qiy olmasin.
    """
    tokens = _tokens(user)
    payload = {
        "user": UserSerializer(user).data,
        "auth_mode": "cookie",
    }
    if created is not None:
        payload["created"] = created
    if extra:
        payload.update(extra)
    response = Response({"success": True, "data": payload}, status=status_code)
    set_jwt_cookies(response, tokens["access"], tokens["refresh"])
    return response


def _error(detail, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "detail": detail}, status=status_code)


def _get_or_create_hemis_user(hemis_id, defaults):
    """hemis_id bo'yicha User topadi yoki yaratadi.

    HEMIS ba'zan turli foydalanuvchilar uchun bir xil email qaytaradi
    (email ustunda unique constraint bor) — bunday to'qnashuvda boshqa
    hemis_id egallab qo'ygan email o'rniga hemis_id asosidagi zaxira
    email bilan yaratiladi, shu talaba abadiy 500 xatolik olmasligi uchun.
    """
    try:
        with transaction.atomic():
            return User.objects.get_or_create(hemis_id=hemis_id, defaults=defaults)
    except IntegrityError:
        user = User.objects.filter(hemis_id=hemis_id).first()
        if user is not None:
            return user, False
        fallback_defaults = {**defaults, "email": f"hemis_{hemis_id}@hemis.local"}
        return User.objects.get_or_create(hemis_id=hemis_id, defaults=fallback_defaults)


class ThrottledTokenRefreshView(APIView):
    """
    Access token yangilash.
    Body {refresh} yoki httpOnly bildir_refresh cookie.
    Yangi tokenlar yana cookie ga yoziladi.
    """
    permission_classes = [AllowAny]
    throttle_classes = [RefreshTokenThrottle]

    def post(self, request):
        raw = extract_refresh_from_request(request)
        if not raw:
            return _error("refresh token yo'q (body yoki cookie).", status.HTTP_401_UNAUTHORIZED)
        try:
            old = RefreshToken(raw)
            # rotate
            user_id = old.payload.get("user_id") or old.payload.get("user")
            try:
                old.blacklist()
            except Exception:
                pass
            from django.contrib.auth import get_user_model

            if not token_epoch_ok(user_id, old.payload.get("epoch")):
                return _error("Refresh token yaroqsiz.", status.HTTP_401_UNAUTHORIZED)
            UserModel = get_user_model()
            user = UserModel.objects.get(pk=user_id)
            tokens = _tokens(user)
            response = _success({"auth_mode": "cookie"})
            set_jwt_cookies(response, tokens["access"], tokens["refresh"])
            return response
        except Exception:
            return _error("Refresh token yaroqsiz.", status.HTTP_401_UNAUTHORIZED)


# ═══════════════════════════════════════════════════════════════
# Email + Parol login
# ═══════════════════════════════════════════════════════════════
class LoginView(APIView):
    """
    Email va parol bilan kirish.

        POST /api/v1/auth/login/
        { "email": "...", "password": "..." }
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginIPThrottle, LoginAccountThrottle]

    def post(self, request):
        email    = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return _error("Email va parol majburiy.", status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)
        if not user:
            AuditLog.log(AuditLog.Action.LOGIN_FAIL, target_email=email,
                         success=False, request=request,
                         extra={"reason": "wrong_credentials"})
            return _error("Email yoki parol noto'g'ri.", status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            AuditLog.log(AuditLog.Action.LOGIN_FAIL, target=user,
                         success=False, request=request,
                         extra={"reason": "inactive"})
            return _error("Hisob faol emas. Administrator bilan bog'laning.", status.HTTP_403_FORBIDDEN)

        AuditLog.log(AuditLog.Action.LOGIN_OK, target=user, request=request)
        return _auth_success(user)


# ═══════════════════════════════════════════════════════════════
# HEMIS SSO — Student login
# ═══════════════════════════════════════════════════════════════
class HemisLoginView(APIView):
    """
    HEMIS tizimi orqali talaba kirishi.

        POST /api/v1/auth/login/hemis/
        { "login": "22060100700600", "password": "hemis_parol" }

    Jarayon:
      1. HEMIS /v1/auth/login → hemis_token olish
      2. HEMIS /v1/account/me → to'liq student ma'lumoti
      3. User DB da topish yoki yaratish (hemis_id bo'yicha)
      4. Profil ma'lumotlarini sinxronlash (fakultet, yo'nalish, guruh)
      5. OsiyoNigohi JWT tokenlarini qaytarish
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginIPThrottle, LoginAccountThrottle]

    def post(self, request):
        serializer = HemisLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login    = serializer.validated_data["login"].strip()
        password = serializer.validated_data["password"]

        # ── 1. HEMIS login ────────────────────────────────────
        try:
            hemis_auth = hemis_student_login(login, password)
        except HemisAuthError as e:
            return _error(str(e), status.HTTP_401_UNAUTHORIZED)
        except HemisRateLimitError as e:
            return _error(str(e), status.HTTP_429_TOO_MANY_REQUESTS)
        except HemisAPIError as e:
            return _error(str(e), status.HTTP_502_BAD_GATEWAY)

        hemis_token = hemis_auth.get("token", "")
        hemis_id    = hemis_auth.get("hemis_id")

        # ── 2. Student profil ma'lumoti ───────────────────────
        student_data = None

        if hemis_token:
            try:
                student_data = get_student_me(hemis_token)
            except HemisAPIError:
                pass  # fallback quyida

        # /account/me ishlamasa — backend token bilan student-list dan izlaymiz
        if not student_data:
            student_data = get_student_by_login(login)

        if not student_data:
            return _error(
                "HEMIS tizimidan ma'lumot olishda xatolik. Qayta urinib ko'ring.",
                status.HTTP_502_BAD_GATEWAY,
            )

        # ── 3. hemis_id aniqlash ──────────────────────────────
        hemis_id = hemis_id or student_data.get("id")
        if not hemis_id:
            return _error("HEMIS dan talaba ID si olinmadi.", status.HTTP_502_BAD_GATEWAY)

        hemis_id = str(hemis_id)

        # ── 4. User topish yoki yaratish ──────────────────────
        # Email: HEMIS da ko'pincha bo'sh → fallback sifatida hemis.local ishlatamiz
        email = (student_data.get("email") or "").strip()
        if not email:
            sid   = student_data.get("student_id_number", "")
            email = f"{sid or hemis_id}@hemis.local"

        user, created = _get_or_create_hemis_user(
            hemis_id,
            defaults={
                "email":      email,
                "first_name": (student_data.get("first_name") or "").strip().title(),
                "last_name":  (student_data.get("second_name") or "").strip().title(),
                "role":       User.Role.STUDENT,
                "student_id": student_data.get("student_id_number", ""),
            },
        )

        if not user.is_active:
            return _error("Hisob faol emas. Administrator bilan bog'laning.", status.HTTP_403_FORBIDDEN)

        # ── 5. Profil sinxronlash ─────────────────────────────
        sync_user_from_hemis(user, student_data)

        # ── 6. OsiyoNigohi JWT tokenlar (+ httpOnly cookie) ─────
        return _auth_success(user, created=created)


# ═══════════════════════════════════════════════════════════════
# HEMIS SSO — Tutor (o'qituvchi/hodim) login
# ═══════════════════════════════════════════════════════════════
class HemisTutorLoginView(APIView):
    """
    HEMIS Tutor API orqali o'qituvchi/hodim kirishi.

        POST /api/v1/auth/login/hemis/tutor/
        { "login": "familiya.ism", "password": "hemis_parol" }

    Jarayon:
      1. HEMIS /ver1/tutor/auth/login → tutor_token olish
      2. HEMIS /ver1/tutor/profile/index → to'liq profil ma'lumoti
      3. User DB da topish yoki yaratish (hemis_id bo'yicha)
      4. Profil ma'lumotlarini sinxronlash (fakultet, universitet)
      5. OsiyoNigohi JWT tokenlarini qaytarish
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginIPThrottle, LoginAccountThrottle]

    def post(self, request):
        serializer = HemisTutorLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login    = serializer.validated_data["login"].strip()
        password = serializer.validated_data["password"]

        # ── 1. HEMIS Tutor login ───────────────────────────────
        try:
            hemis_auth = hemis_tutor_login(login, password)
        except HemisAuthError as e:
            return _error(str(e), status.HTTP_401_UNAUTHORIZED)
        except HemisRateLimitError as e:
            return _error(str(e), status.HTTP_429_TOO_MANY_REQUESTS)
        except HemisAPIError as e:
            return _error(str(e), status.HTTP_502_BAD_GATEWAY)

        tutor_token = hemis_auth.get("token", "")
        hemis_id    = hemis_auth.get("hemis_id")

        # ── 2. Tutor profil ma'lumotlari ──────────────────────
        tutor_profile = {}
        if tutor_token:
            try:
                tutor_profile = get_tutor_profile(tutor_token)
            except HemisAPIError as e:
                return _error(
                    f"HEMIS profilni olishda xatolik: {e}",
                    status.HTTP_502_BAD_GATEWAY,
                )

        tutor_data = tutor_profile.get("tutor") or tutor_profile

        # ── 3. hemis_id aniqlash ──────────────────────────────
        hemis_id = hemis_id or tutor_data.get("id")
        if not hemis_id:
            return _error("HEMIS dan tutor ID si olinmadi.", status.HTTP_502_BAD_GATEWAY)

        hemis_id = str(hemis_id)

        # ── 4. Email yaratish ─────────────────────────────────
        email = (tutor_data.get("email") or "").strip()
        if not email:
            email = f"tutor_{hemis_id}@hemis.local"

        # ── 5. To'liq ism ajratish ────────────────────────────
        full_name  = (tutor_data.get("full_name") or "").strip()
        name_parts = full_name.split() if full_name else []
        last_name  = name_parts[0].title() if len(name_parts) > 0 else login.title()
        first_name = " ".join(name_parts[1:]).title() if len(name_parts) > 1 else ""

        # ── 6. User topish yoki yaratish ──────────────────────
        user, created = _get_or_create_hemis_user(
            hemis_id,
            defaults={
                "email":      email,
                "first_name": first_name,
                "last_name":  last_name,
                "role":       User.Role.TEACHER,
            },
        )

        if not user.is_active:
            return _error("Hisob faol emas. Administrator bilan bog'laning.", status.HTTP_403_FORBIDDEN)

        # ── 7. Profil sinxronlash ─────────────────────────────
        sync_user_from_tutor(user, tutor_profile)

        # ── 8. OsiyoNigohi JWT tokenlar (+ httpOnly cookie) ─────
        return _auth_success(user, created=created)


# ═══════════════════════════════════════════════════════════════
# HEMIS OAuth2 — 1-qadam: Authorize URL yaratish
# ═══════════════════════════════════════════════════════════════
class HemisOAuthInitView(APIView):
    """
    HEMIS OAuth2 login uchun redirect URL va state qaytaradi.

        GET /api/v1/auth/oauth/hemis/

    Frontend bu URL ga foydalanuvchini yo'naltiradi.
    HEMIS da login qilingandan so'ng callback URL ga qaytadi.

    Response:
        {
          "success": true,
          "data": {
            "redirect_url": "https://hemis.nspi.uz/oauth/authorize?...",
            "state": "abc123..."
          }
        }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # ?portal=student — talaba portali (student.nspi.uz) oAuth serveri,
        # aks holda hodimlar portali (hemis.nspi.uz)
        portal       = "student" if request.query_params.get("portal") == "student" else "employee"
        state        = generate_oauth_state()
        redirect_uri = settings.HEMIS_OAUTH_REDIRECT_URI

        # State ni Redis cache da 10 daqiqa saqlaymiz (CSRF himoyasi).
        # Qiymat sifatida portal saqlanadi — callback qaysi oAuth serverdan
        # token almashtirishni shu orqali biladi.
        cache.set(f"hemis_oauth_state:{state}", portal, timeout=600)

        authorize_url = build_hemis_oauth_url(redirect_uri, state, portal=portal)

        return _success({
            "redirect_url": authorize_url,
            "state":        state,
            "portal":       portal,
        })


# ═══════════════════════════════════════════════════════════════
# HEMIS OAuth2 — 2-qadam: Callback (code → OsiyoNigohi JWT)
# ═══════════════════════════════════════════════════════════════
class HemisOAuthCallbackView(APIView):
    """
    HEMIS OAuth2 callback.

        GET /api/v1/auth/oauth/callback/?code=...&state=...

    HEMIS foydalanuvchi tasdiqlagan keyin shu URL ga yo'naltiradi.

    Jarayon:
      1. State tekshirish (CSRF himoyasi)
      2. Code → access_token almashtirish (HEMIS /oauth/access-token)
      3. User info olish (HEMIS /oauth/api/user)
      4. User yaratish yoki topish (type: student/employee)
      5. OsiyoNigohi JWT tokenlar qaytarish

    Frontendga qaytarish usuli:
      - Agar to'g'ridan API (SPA) → JSON response
      - Agar traditional redirect kerak → ?frontend_redirect parametr
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code  = request.query_params.get("code", "").strip()
        state = request.query_params.get("state", "").strip()

        # ── 1. Parametrlarni tekshirish ────────────────────────
        if not code or not state:
            return _error("code va state parametrlari majburiy.", status.HTTP_400_BAD_REQUEST)

        # ── 2. State validatsiya (CSRF) ────────────────────────
        cache_key = f"hemis_oauth_state:{state}"
        cached    = cache.get(cache_key)
        if not cached:
            return _error("OAuth state yaroqsiz yoki muddati o'tgan. Qaytadan urinib ko'ring.", status.HTTP_400_BAD_REQUEST)
        cache.delete(cache_key)  # bir martalik

        # Init bosqichida saqlangan portal ("student"|"employee");
        # eski format (True) uchun employee deb olamiz
        portal = cached if cached in ("student", "employee") else "employee"

        # ── 3. Code → Access token ─────────────────────────────
        redirect_uri = settings.HEMIS_OAUTH_REDIRECT_URI
        try:
            token_data = hemis_oauth_exchange_code(code, redirect_uri, portal=portal)
        except HemisAuthError as e:
            return _error(str(e), status.HTTP_401_UNAUTHORIZED)
        except HemisAPIError as e:
            return _error(str(e), status.HTTP_502_BAD_GATEWAY)

        access_token = token_data["access_token"]

        # ── 4. User ma'lumotlari ───────────────────────────────
        try:
            oauth_user = hemis_oauth_userinfo(access_token, portal=portal)
        except HemisAPIError as e:
            return _error(str(e), status.HTTP_502_BAD_GATEWAY)

        hemis_id  = str(oauth_user.get("id", "")).strip()
        user_type = (oauth_user.get("type") or "student").lower()  # "student" | "employee"

        if not hemis_id:
            return _error("HEMIS OAuth: foydalanuvchi ID si olinmadi.", status.HTTP_502_BAD_GATEWAY)

        # ── 5. Email va ism ────────────────────────────────────
        email = (oauth_user.get("email") or "").strip()
        if not email:
            email = f"oauth_{hemis_id}@hemis.local"

        full_name  = (oauth_user.get("name") or "").strip()
        parts      = full_name.split() if full_name else []
        last_name  = parts[0].title() if len(parts) > 0 else f"User{hemis_id}"
        first_name = " ".join(parts[1:]).title() if len(parts) > 1 else ""

        # ── 6. Rol aniqlash ────────────────────────────────────
        role = User.Role.STUDENT if user_type == "student" else User.Role.TEACHER

        # ── 7. User topish yoki yaratish ──────────────────────
        user, created = _get_or_create_hemis_user(
            hemis_id,
            defaults={
                "email":      email,
                "first_name": first_name,
                "last_name":  last_name,
                "role":       role,
            },
        )

        if not user.is_active:
            return _error("Hisob faol emas. Administrator bilan bog'laning.", status.HTTP_403_FORBIDDEN)

        # ── 8. OAuth asosiy profil sinxronlash (ism, email, telefon, rasm)
        sync_user_from_oauth(user, oauth_user)

        # ── 9. Qo'shimcha sinxronlash turiga qarab ────────────
        if user_type == "student":
            # Student: student_api_token bilan to'liq profil (fakultet, guruh, yo'nalish)
            student_api_token = oauth_user.get("student_api_token", "")
            student_data = None
            if student_api_token:
                try:
                    student_data = get_student_me(student_api_token)
                except HemisAPIError:
                    student_data = None

            # HEMIS OAuth userinfo javobida student_api_token ko'pincha
            # kelmaydi (rasmiy hujjatda kafolatlanmagan) — bunday holda
            # backend token bilan login (login/student_id) orqali izlaymiz,
            # aks holda fakultet/specialty/guruh hech qachon sinxronlanmay
            # qoladi va talaba barcha fakultetlar imtihonini ko'rib qoladi.
            if not student_data:
                oauth_login = (oauth_user.get("login") or "").strip()
                if oauth_login:
                    student_data = get_student_by_login(oauth_login)

            if student_data:
                sync_user_from_hemis(user, student_data)
        else:
            # Employee: Backend API dan lavozim, daraja, unvon, rasm
            try:
                emp_data = get_employee_by_hemis_id(hemis_id)
                if emp_data:
                    sync_user_from_employee(user, emp_data)
            except Exception:
                pass

        # ── 10. JWT cookie + callback (token URL da emas — XSS riski) ─
        tokens = _tokens(user)
        frontend_callback = f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback?ok=1"
        response = HttpResponseRedirect(frontend_callback)
        set_jwt_cookies(response, tokens["access"], tokens["refresh"])
        return response


# ═══════════════════════════════════════════════════════════════
# Logout
# ═══════════════════════════════════════════════════════════════
class LogoutView(APIView):
    """
    To'liq logout:
    - access jti denylist (muddat tugaguncha)
    - refresh blacklist
    - httpOnly cookie tozalash

        POST /api/v1/auth/logout/
        Body ixtiyoriy: { "refresh", "access" } — cookie ham o'qiladi
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        access = request.data.get("access") or extract_access_from_request(request)
        refresh = extract_refresh_from_request(request)

        denylist_access_token(access)
        blacklist_refresh(refresh)

        if request.user and request.user.is_authenticated:
            AuditLog.log(
                AuditLog.Action.LOGOUT,
                actor=request.user,
                target=request.user,
                request=request,
            )
        response = _success({"detail": "Muvaffaqiyatli chiqildi.", "revoked": True})
        clear_jwt_cookies(response)
        return response


# ═══════════════════════════════════════════════════════════════
# Me — joriy foydalanuvchi
# ═══════════════════════════════════════════════════════════════
class MeView(APIView):
    """
    Joriy foydalanuvchi profili.

        GET   /api/v1/auth/me/   — profil o'qish
        PATCH /api/v1/auth/me/   — profilni yangilash
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = User.objects.select_related(
            "university", "faculty", "specialty", "group"
        ).get(pk=request.user.pk)
        return _success(UserSerializer(user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return _success(UserSerializer(request.user).data)
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ═══════════════════════════════════════════════════════════════
# Parol o'zgartirish
# ═══════════════════════════════════════════════════════════════
class ChangePasswordView(APIView):
    """
    Parol o'zgartirish (faqat email login foydalanuvchilar uchun).

        POST /api/v1/auth/me/password/
        { "old_password": "...", "new_password": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data["new_password"])
            request.user.save()
            bump_epoch(request.user.pk)
            denylist_access_token(extract_access_from_request(request))
            return _success({"detail": "Parol muvaffaqiyatli o'zgartirildi."})
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ═══════════════════════════════════════════════════════════════
# HEMIS profil sinxronlash
# ═══════════════════════════════════════════════════════════════
class HemisSyncView(APIView):
    """
    Joriy student profilini HEMIS dan qayta sinxronlash.

        POST /api/v1/auth/me/hemis-sync/

    Faqat HEMIS orqali kirgan (hemis_id mavjud) foydalanuvchilar uchun.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.hemis_id:
            return _error("Siz HEMIS orqali kirmadingiz. Sinxronlash mumkin emas.")

        student_data = get_student_by_login(
            user.student_id or user.hemis_id
        )
        if not student_data:
            return _error("HEMIS tizimidan ma'lumot olishda xatolik.", status.HTTP_502_BAD_GATEWAY)

        sync_user_from_hemis(user, student_data)
        return _success({
            "user":   UserSerializer(user).data,
            "detail": "Profil HEMIS dan yangilandi.",
        })


# ═══════════════════════════════════════════════════════════════
# Ro'yxatdan o'tish (faqat dev/test)
# ═══════════════════════════════════════════════════════════════
class RegisterView(APIView):
    """
    Email + parol bilan ro'yxatdan o'tish.
    FAQAT development/test muhiti uchun.
    Production da talabalar HEMIS orqali kiradi.

        POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not getattr(settings, "ALLOW_OPEN_REGISTRATION", False):
            return _error("Ro'yxatdan o'tish yopiq.", status.HTTP_404_NOT_FOUND)
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return _auth_success(user, status_code=status.HTTP_201_CREATED)
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ═══════════════════════════════════════════════════════════════
# Admin — Foydalanuvchilar boshqaruvi
# ═══════════════════════════════════════════════════════════════
ADMIN_ROLES = {
    User.Role.ADMIN, User.Role.SUPERADMIN, User.Role.AUDIT_INSPECTOR,
}


class AdminUserListView(APIView):
    """
    Barcha foydalanuvchilar ro'yxati (admin/superadmin/audit_inspector uchun).

        GET  /api/v1/auth/users/          — filtrlar: role, is_active, search
        POST /api/v1/auth/users/          — yangi foydalanuvchi yaratish (faqat superadmin)
    """
    permission_classes = [IsAuthenticated]

    def _check_permission(self, user, write=False):
        if write:
            return user.role == User.Role.SUPERADMIN
        return user.role in ADMIN_ROLES

    def get(self, request):
        if not self._check_permission(request.user):
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)

        qs = User.objects.select_related("university", "faculty").order_by("-created_at")

        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == "true"))

        from utils import safe_int, clean_search
        search = clean_search(request.query_params.get("search", ""))
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(student_id__icontains=search)
            )


        page      = safe_int(request.query_params.get("page"), 1, minimum=1)
        page_size = safe_int(request.query_params.get("page_size"), 50, minimum=1, maximum=200)
        total     = qs.count()
        offset    = (page - 1) * page_size
        users     = qs[offset: offset + page_size]

        return _success({
            "data": UserSerializer(users, many=True).data,
            "meta": {"total": total, "page": page, "page_size": page_size},
        })

    def post(self, request):
        if not self._check_permission(request.user, write=True):
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)

        serializer = AdminCreateUserSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.save()
            AuditLog.log(AuditLog.Action.USER_CREATE, actor=request.user,
                         target=user, request=request)
            return _success(UserSerializer(user).data, status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)


class AdminUserDetailView(APIView):
    """
    Foydalanuvchi tafsiloti va yangilash.

        GET   /api/v1/auth/users/<id>/    — profil
        PATCH /api/v1/auth/users/<id>/    — rol, is_active yangilash
        DELETE /api/v1/auth/users/<id>/   — deaktivatsiya (faqat superadmin)
    """
    permission_classes = [IsAuthenticated]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        if request.user.role not in ADMIN_ROLES:
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)
        user = self._get_user(pk)
        if not user:
            return _error("Foydalanuvchi topilmadi.", status.HTTP_404_NOT_FOUND)
        return _success(UserSerializer(user).data)

    def patch(self, request, pk):
        if request.user.role == User.Role.AUDIT_INSPECTOR:
            return _error("Audit inspektor faqat o'qiy oladi.", status.HTTP_403_FORBIDDEN)
        if request.user.role not in ADMIN_ROLES:
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)

        user = self._get_user(pk)
        if not user:
            return _error("Foydalanuvchi topilmadi.", status.HTTP_404_NOT_FOUND)

        allowed_fields = {"is_active", "phone", "first_name", "last_name", "language", "gender"}
        if request.user.role == User.Role.SUPERADMIN:
            allowed_fields.add("role")

        old_role = user.role
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        for field, value in data.items():
            setattr(user, field, value)
        user.save(update_fields=list(data.keys()))

        # Audit logging
        if "role" in data and data["role"] != old_role:
            AuditLog.log(AuditLog.Action.ROLE_CHANGE, actor=request.user,
                         target=user, request=request,
                         extra={"old_role": old_role, "new_role": data["role"]})
        elif "is_active" in data:
            action = (AuditLog.Action.USER_ACTIVATE
                      if data["is_active"] else AuditLog.Action.USER_DEACTIVATE)
            AuditLog.log(action, actor=request.user, target=user, request=request)
        else:
            AuditLog.log(AuditLog.Action.USER_UPDATE, actor=request.user,
                         target=user, request=request)

        return _success(UserSerializer(user).data)

    def delete(self, request, pk):
        if request.user.role != User.Role.SUPERADMIN:
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)
        user = self._get_user(pk)
        if not user:
            return _error("Foydalanuvchi topilmadi.", status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return _error("O'zingizni o'chira olmaysiz.", status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=["is_active"])
        AuditLog.log(AuditLog.Action.USER_DEACTIVATE, actor=request.user,
                     target=user, request=request)
        return _success({"detail": "Foydalanuvchi deaktiv qilindi."})


# ═══════════════════════════════════════════════════════════════
# Admin — Tizim statistikasi
# ═══════════════════════════════════════════════════════════════
class SystemStatsView(APIView):
    """
    Tizim bo'yicha umumiy statistika.

        GET /api/v1/auth/stats/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ADMIN_ROLES:
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)

        from django.db.models import Count

        role_counts = dict(
            User.objects.values_list("role").annotate(cnt=Count("id"))
        )
        active_users   = User.objects.filter(is_active=True).count()
        inactive_users = User.objects.filter(is_active=False).count()

        return _success({
            "users": {
                "total":    User.objects.count(),
                "active":   active_users,
                "inactive": inactive_users,
                "by_role":  role_counts,
            },
        })


# ═══════════════════════════════════════════════════════════════
# Admin — Audit loglar
# ═══════════════════════════════════════════════════════════════
class AuditLogListView(APIView):
    """
    Tizim audit loglari (admin/superadmin/audit_inspector uchun).

        GET /api/v1/auth/audit/
        ?action=login_ok|login_fail|logout|user_create|...
        &success=true|false
        &actor_id=<uuid>
        &date_from=2024-01-01T00:00:00
        &date_to=2024-12-31T23:59:59
        &page=1&page_size=50
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ADMIN_ROLES:
            return _error("Ruxsat yo'q.", status.HTTP_403_FORBIDDEN)

        qs = AuditLog.objects.select_related("actor", "target").order_by("-created_at")

        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        success_param = request.query_params.get("success")
        if success_param is not None:
            qs = qs.filter(success=(success_param.lower() == "true"))

        actor_id = request.query_params.get("actor_id")
        if actor_id:
            qs = qs.filter(actor_id=actor_id)

        date_from = request.query_params.get("date_from")
        if date_from:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(date_from)
            if dt:
                qs = qs.filter(created_at__gte=dt)

        date_to = request.query_params.get("date_to")
        if date_to:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(date_to)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        from utils import safe_int
        page      = safe_int(request.query_params.get("page"), 1, minimum=1)
        page_size = safe_int(request.query_params.get("page_size"), 50, minimum=1, maximum=200)
        total     = qs.count()
        offset    = (page - 1) * page_size
        logs      = qs[offset: offset + page_size]

        def _name(u):
            if not u:
                return None
            return f"{u.last_name} {u.first_name}".strip() or u.email

        return _success({
            "data": [
                {
                    "id":           log.pk,
                    "action":       log.action,
                    "actor_email":  log.actor.email if log.actor else None,
                    "actor_name":   _name(log.actor),
                    "target_email": log.target_email or (log.target.email if log.target else None),
                    "target_name":  _name(log.target),
                    "success":      log.success,
                    "ip_address":   log.ip_address,
                    "user_agent":   log.user_agent,
                    "extra":        log.extra,
                    "created_at":   log.created_at.isoformat(),
                }
                for log in logs
            ],
            "meta": {"total": total, "page": page, "page_size": page_size},
        })


# ═══════════════════════════════════════════════════════════════
# Parolni tiklash (Forgot / Reset Password)
# ═══════════════════════════════════════════════════════════════
import secrets
import hashlib
from datetime import timedelta

RESET_TOKEN_TTL = 3600  # 1 soat (soniya)
RESET_CACHE_PREFIX = "pwd_reset:"
_RESET_DETAIL = "Agar email ro'yxatdan o'tgan bo'lsa, ko'rsatmalar yuborildi."


def _send_reset_email(user, raw_token: str) -> None:
    """Tokenni javobga yozmaydi. Pochta sozlanmagan bo'lsa logga token tushmaydi."""
    import logging

    from django.core.mail import send_mail

    logger = logging.getLogger("apps.users")
    front = str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    link = f"{front}/auth/reset-password?token={raw_token}" if front else ""
    body = (
        "Bildir parolini tiklash uchun havola (1 soat):\n"
        f"{link}\n\n"
        "Agar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring."
    )
    if not (settings.DEBUG or getattr(settings, "EMAIL_HOST", "")):
        logger.error("Parol tiklash pochtasi yuborilmadi: EMAIL_HOST bo'sh")
        return
    try:
        send_mail(
            subject="Bildir — parolni tiklash",
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@localhost",
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Parol tiklash pochtasi yuborilmadi")


class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/
    { "email": "..." }

    Token faqat pochtada. Javobda token yo'q, email mavjudligi oshkor qilinmaydi.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return _error("Email majburiy.")

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Xavfsizlik: email mavjud bo'lmasa ham xuddi shunday javob
            return _success({"detail": _RESET_DETAIL})

        # Token yaratish
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        cache.set(f"{RESET_CACHE_PREFIX}{token_hash}", str(user.id), RESET_TOKEN_TTL)

        _send_reset_email(user, raw_token)
        return _success({"detail": _RESET_DETAIL})


class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/
    { "token": "...", "new_password": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw_token   = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")

        if not raw_token or not new_password:
            return _error("token va new_password majburiy.")

        if len(new_password) < 8:
            return _error("Parol kamida 8 belgidan iborat bo'lishi kerak.")

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        user_id    = cache.get(f"{RESET_CACHE_PREFIX}{token_hash}")

        if not user_id:
            return _error("Token yaroqsiz yoki muddati tugagan.", 400)

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return _error("Foydalanuvchi topilmadi.", 404)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        bump_epoch(user.pk)

        # Tokenni o'chirib tashlash (bir martalik)
        cache.delete(f"{RESET_CACHE_PREFIX}{token_hash}")

        return _success({"detail": "Parol muvaffaqiyatli yangilandi."})
