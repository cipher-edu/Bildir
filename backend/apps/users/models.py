"""
OsiyoNigohi — User Model
Talaba, O'qituvchi, Admin va boshqa rollarni boshqaradi.
core app modellari (University, Faculty, Specialty, StudyGroup) ga FK orqali bog'langan.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email majburiy")
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPERADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT         = "student",         "Talaba"
        TEACHER         = "teacher",         "O'qituvchi"
        METHODIST       = "methodist",       "Metodist"
        DEPARTMENT_HEAD = "department_head", "Kafedra mudiri"
        PROCTOR         = "proctor",         "Proktor"
        ADMIN           = "admin",           "Admin"
        SUPERADMIN      = "superadmin",      "Superadmin"
        AUDIT_INSPECTOR = "audit_inspector", "Audit inspektor"

    class Language(models.TextChoices):
        UZ = "uz", "O'zbek"
        RU = "ru", "Rus"

    class Gender(models.TextChoices):
        MALE   = "M", "Erkak"
        FEMALE = "F", "Ayol"

    # --- Asosiy maydonlar ---
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True, verbose_name="Email")
    first_name = models.CharField(max_length=100, verbose_name="Ism")
    last_name  = models.CharField(max_length=100, verbose_name="Familiya")
    role       = models.CharField(
        max_length=30, choices=Role.choices,
        default=Role.STUDENT, verbose_name="Rol"
    )

    # --- HEMIS integratsiya ---
    hemis_id        = models.CharField(
        max_length=50, unique=True, null=True, blank=True,
        verbose_name="HEMIS ID"
    )
    student_id      = models.CharField(
        max_length=50, null=True, blank=True,
        verbose_name="Talaba guvohnomasi raqami"
    )
    last_hemis_sync = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Oxirgi HEMIS sinxronlash",
        help_text="HEMIS dan oxirgi marta ma'lumotlar yangilangan vaqt"
    )

    # --- Tashkiliy bog'lanishlar (FK — string emas!) ---
    university = models.ForeignKey(
        "core.University", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="users", verbose_name="Universitet"
    )
    faculty = models.ForeignKey(
        "core.Faculty", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="users", verbose_name="Fakultet"
    )
    specialty = models.ForeignKey(
        "core.Specialty", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="users", verbose_name="Yo'nalish"
    )
    group = models.ForeignKey(
        "core.StudyGroup", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students", verbose_name="Guruh"
    )
    study_year = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="O'qish kursi",
        help_text="1, 2, 3, 4 — o'qish yili (talabalar uchun)"
    )
    gender = models.CharField(
        max_length=1, choices=Gender.choices, null=True, blank=True,
        verbose_name="Jinsi",
        help_text="HEMIS orqali kelmaydi — qo'lda to'ldiriladi",
    )

    # --- Rasm ---
    picture = models.CharField(
        max_length=500, blank=True,
        verbose_name="Profil rasmi URL",
        help_text="HEMIS dan olingan rasm manzili"
    )

    # --- Xodim (teacher/staff) ma'lumotlari ---
    position = models.CharField(
        max_length=200, blank=True,
        verbose_name="Lavozim",
        help_text="staffPosition.name — masalan: Katta o'qituvchi"
    )
    academic_degree = models.CharField(
        max_length=100, blank=True,
        verbose_name="Akademik daraja",
        help_text="Masalan: Fan nomzodi, Fan doktori"
    )
    academic_rank = models.CharField(
        max_length=100, blank=True,
        verbose_name="Akademik unvon",
        help_text="Masalan: Dotsent, Professor"
    )

    # --- Aloqa ---
    phone = models.CharField(
        max_length=20, blank=True,
        verbose_name="Telefon raqami",
        help_text="SMS xabarnomalar uchun. Format: +998901234567"
    )

    # --- Sozlamalar ---
    language = models.CharField(
        max_length=5, choices=Language.choices,
        default=Language.UZ, verbose_name="Interfeys tili"
    )

    # --- Holat ---
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"
        indexes = [
            models.Index(fields=["hemis_id"]),
            models.Index(fields=["role"]),
            models.Index(fields=["university", "faculty"]),
            models.Index(fields=["group"]),
        ]

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name}"

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    @property
    def is_proctor(self):
        return self.role == self.Role.PROCTOR


def _get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN_OK        = "login_ok",        "Login (muvaffaqiyatli)"
        LOGIN_FAIL      = "login_fail",      "Login (muvaffaqiyatsiz)"
        LOGOUT          = "logout",          "Chiqish"
        USER_CREATE     = "user_create",     "Foydalanuvchi yaratildi"
        USER_UPDATE     = "user_update",     "Foydalanuvchi yangilandi"
        USER_DEACTIVATE = "user_deactivate", "Foydalanuvchi bloklandi"
        USER_ACTIVATE   = "user_activate",   "Foydalanuvchi faollashtirildi"
        ROLE_CHANGE     = "role_change",     "Rol o'zgartirildi"
        PWD_RESET       = "pwd_reset",       "Parol tiklash"
        HEMIS_SYNC      = "hemis_sync",      "HEMIS sinxronlash"

    actor        = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
    )
    target       = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
    )
    target_email = models.CharField(max_length=255, blank=True)
    action       = models.CharField(max_length=30, choices=Action.choices, db_index=True)
    success      = models.BooleanField(default=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.CharField(max_length=500, blank=True)
    extra        = models.JSONField(default=dict, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_log"
        ordering = ["-created_at"]
        verbose_name = "Audit log"
        verbose_name_plural = "Audit loglar"

    def __str__(self):
        return f"{self.action} — {self.target_email} ({self.created_at:%Y-%m-%d %H:%M})"

    @classmethod
    def log(cls, action, *, actor=None, target=None, target_email="",
            success=True, request=None, extra=None):
        ip = ua = ""
        if request:
            ip = _get_client_ip(request)
            ua = request.META.get("HTTP_USER_AGENT", "")[:500]
        email = target_email or (target.email if target else "")
        cls.objects.create(
            actor=actor,
            target=target,
            target_email=email,
            action=action,
            success=success,
            ip_address=ip or None,
            user_agent=ua,
            extra=extra or {},
        )
