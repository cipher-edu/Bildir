"""
auth-starter — Base Settings
"""
from datetime import timedelta
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="dev-secret-key-please-change-in-production")

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Apps (domen/mikroservis chegaralari)
    "apps.core",
    "apps.users",
    "apps.surveys",
    "apps.office",
    "apps.news",
    "apps.compliance",
]

# ---- Surveys (xavfsizlik kalitlari — production da Vault/env) ----
# SURVEY_ENCRYPTION_KEY / SURVEY_HMAC_KEY / SURVEY_TOKEN_KEY — base64 yoki raw
# Berilmasa SECRET_KEY dan hosila qilinadi (faqat dev).

MIDDLEWARE = [
    "utils.request_id_middleware.RequestIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---- Database -----------------------------------------------
# POSTGRES_HOST berilsa → PostgreSQL (Docker/production)
# aks holda → SQLite (faqat lokal tezkor dev)
POSTGRES_HOST = config("POSTGRES_HOST", default="")

if POSTGRES_HOST:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("POSTGRES_DB", default="auth_starter"),
            "USER": config("POSTGRES_USER", default="auth"),
            "PASSWORD": config("POSTGRES_PASSWORD", default="auth"),
            "HOST": POSTGRES_HOST,
            "PORT": config("POSTGRES_PORT", default="5432"),
            "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
            "OPTIONS": {
                "connect_timeout": 10,
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {"timeout": 60},
            "ATOMIC_REQUESTS": False,
        }
    }

# ---- Cache --------------------------------------------------
REDIS_URL = config("REDIS_URL", default="")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

REDIS_TIMER_URL = config("REDIS_TIMER_URL", default=REDIS_URL or "redis://127.0.0.1:6379/5")

# ---- Auth ---------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---- REST Framework -----------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "token_refresh": "6/min",
    },
}

# ---- JWT (RS256 default, HS256 fallback) --------------------
JWT_ALGORITHM = config("JWT_ALGORITHM", default="RS256")

if JWT_ALGORITHM in ("RS256", "RS384", "RS512", "ES256", "ES384", "ES512"):
    try:
        from utils.jwt_keys import get_private_key, get_public_key, get_kid
        _JWT_SIGNING_KEY = get_private_key()
        _JWT_VERIFY_KEY  = get_public_key()
        _JWT_KID         = get_kid()
    except Exception as e:
        import sys
        sys.stderr.write(f"[WARN] JWT RS256 kalitlari topilmadi ({e}), HS256 ga fallback\n")
        JWT_ALGORITHM    = "HS256"
        _JWT_SIGNING_KEY = config("JWT_SECRET_KEY", default="dev-jwt-secret-change-in-production")
        _JWT_VERIFY_KEY  = _JWT_SIGNING_KEY
        _JWT_KID         = "fallback"
else:
    _JWT_SIGNING_KEY = config("JWT_SECRET_KEY", default="dev-jwt-secret-change-in-production")
    _JWT_VERIFY_KEY  = _JWT_SIGNING_KEY
    _JWT_KID         = "primary"

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":    timedelta(minutes=config("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", default=120, cast=int)),
    "REFRESH_TOKEN_LIFETIME":   timedelta(days=config("JWT_REFRESH_TOKEN_EXPIRE_DAYS", default=7, cast=int)),
    "ROTATE_REFRESH_TOKENS":    True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM":                JWT_ALGORITHM,
    "SIGNING_KEY":              _JWT_SIGNING_KEY,
    "VERIFYING_KEY":            _JWT_VERIFY_KEY,
    "AUDIENCE":                 None,
    "ISSUER":                   "auth-starter",
    "AUTH_HEADER_TYPES":        ("Bearer",),
    "USER_ID_FIELD":            "id",
    "USER_ID_CLAIM":            "user_id",
    "JTI_CLAIM":                "jti",
    "TOKEN_TYPE_CLAIM":         "token_type",
    "JWK_URL":                  None,
    "LEEWAY":                   0,
}

# ---- API Documentation --------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "auth-starter API",
    "DESCRIPTION": "Login va autentifikatsiya tizimi REST API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ---- Storage ------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# ---- Internationalization -----------------------------------
LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

# ---- Security Headers ---------------------------------------
X_FRAME_OPTIONS = "SAMEORIGIN"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

TRUSTED_PROXY_DEPTH = config("TRUSTED_PROXY_DEPTH", default=0, cast=int)

# ---- HEMIS Backend API --------------------------------------
HEMIS_API_BASE_URL   = config("HEMIS_API_BASE_URL",   default="https://student.nspi.uz/rest")
HEMIS_BACKEND_TOKEN  = config("HEMIS_BACKEND_TOKEN",  default="")
HEMIS_MOCK_MODE      = config("HEMIS_MOCK_MODE",       default=True, cast=bool)

HEMIS_ENDPOINTS = {
    "student_list":    "/v1/data/student-list",
    "employee_list":   "/v1/data/employee-list",
    "group_list":      "/v1/data/group-list",
    "department_list": "/v1/data/department-list",
    "specialty_list":  "/v1/data/specialty-list",
    "subject_list":    "/v1/data/subject-list",
    "student_login":   "/v1/auth/login",
    "student_me":      "/v1/account/me",
}

# ---- HEMIS OAuth2 -------------------------------------------
HEMIS_OAUTH_BASE_URL      = config("HEMIS_OAUTH_BASE_URL",      default="https://hemis.nspi.uz")
HEMIS_OAUTH_CLIENT_ID     = config("HEMIS_OAUTH_CLIENT_ID",     default="6")
HEMIS_OAUTH_CLIENT_SECRET = config("HEMIS_OAUTH_CLIENT_SECRET", default="")
HEMIS_OAUTH_REDIRECT_URI  = config(
    "HEMIS_OAUTH_REDIRECT_URI",
    default="http://127.0.0.1:8000/api/v1/auth/oauth/callback/"
)

HEMIS_STUDENT_OAUTH_BASE_URL      = config("HEMIS_STUDENT_OAUTH_BASE_URL",      default="https://student.nspi.uz")
HEMIS_STUDENT_OAUTH_CLIENT_ID     = config("HEMIS_STUDENT_OAUTH_CLIENT_ID",     default="")
HEMIS_STUDENT_OAUTH_CLIENT_SECRET = config("HEMIS_STUDENT_OAUTH_CLIENT_SECRET", default="")

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# ---- Logging ------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "auth_starter.security": {"handlers": ["console"], "level": "INFO",    "propagate": False},
        "auth_starter.hemis":    {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.security":       {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}

# ---- Jazzmin Admin UI ---------------------------------------
JAZZMIN_SETTINGS = {
    "site_title":        "auth-starter Admin",
    "site_header":       "auth-starter",
    "site_brand":        "auth-starter",
    "site_logo":         None,
    "site_logo_classes": "img-circle",
    "site_icon":         None,
    "welcome_sign":      "auth-starter — Boshqaruv paneli",
    "copyright":         "auth-starter © 2026",
    "search_model": ["users.User", "core.Faculty"],
    "topmenu_links": [
        {"name": "API Docs", "url": "/api/v1/docs/", "new_window": True},
        {"name": "Sog'liq",  "url": "/api/v1/health/", "new_window": True},
    ],
    "usermenu_links": [
        {"name": "API Hujjatlar", "url": "/api/v1/docs/", "new_window": True},
    ],
    "show_sidebar":            True,
    "navigation_expanded":     True,
    "hide_apps":               [],
    "hide_models":             [],
    "order_with_respect_to":   ["users", "core", "auth", "token_blacklist"],
    "icons": {
        "auth":              "fas fa-users-cog",
        "auth.user":         "fas fa-user",
        "auth.Group":        "fas fa-users",
        "users.User":        "fas fa-user-graduate",
        "core.University":   "fas fa-university",
        "core.Faculty":      "fas fa-building",
        "core.Specialty":    "fas fa-graduation-cap",
        "core.StudyGroup":   "fas fa-users",
        "core.Subject":      "fas fa-book",
    },
    "default_icon_parents":  "fas fa-folder",
    "default_icon_children": "fas fa-dot-circle",
    "related_modal_active":  True,
    "custom_css":            None,
    "custom_js":             None,
    "use_google_fonts_cdn":  False,
    "show_ui_builder":       False,
    "changeform_format":     "horizontal_tabs",
    "language_chooser":      False,
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text":       False,
    "footer_small_text":       False,
    "body_small_text":         False,
    "brand_small_text":        False,
    "brand_colour":            "navbar-primary",
    "accent":                  "accent-primary",
    "navbar":                  "navbar-dark",
    "no_navbar_border":        True,
    "navbar_fixed":            True,
    "layout_boxed":            False,
    "footer_fixed":            False,
    "sidebar_fixed":           True,
    "sidebar":                 "sidebar-dark-primary",
    "sidebar_nav_small_text":  False,
    "sidebar_disable_expand":  False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style":  False,
    "theme":                   "default",
    "dark_mode_theme":         None,
    "button_classes": {
        "primary":   "btn-primary",
        "secondary": "btn-secondary",
        "info":      "btn-info",
        "warning":   "btn-warning",
        "danger":    "btn-danger",
        "success":   "btn-success",
    },
}
