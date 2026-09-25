from pathlib import Path
import os
from datetime import timedelta

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

_raw_secret = os.getenv("DJANGO_SECRET_KEY", "localmatch-dev-secret-key-min-32-bytes!!")
SECRET_KEY = _raw_secret if len(_raw_secret.encode()) >= 32 else f"{_raw_secret}-pad-localmatch-hmac-32b"
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if h.strip()]

AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailOrUsernameBackend",
    "django.contrib.auth.backends.ModelBackend",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "accounts",
    "marketplace",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "fraislink.urls"
WSGI_APPLICATION = "fraislink.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": dj_database_url.parse(
        os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000")
_default_cors = "http://127.0.0.1:5173,http://localhost:5173"
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", _default_cors).split(",") if o.strip()]
if FRONTEND_ORIGIN and FRONTEND_ORIGIN not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(FRONTEND_ORIGIN)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "False").lower() == "true"
DEMO_MODE = os.getenv("DEMO_MODE", "True").lower() == "true"

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = COOKIE_SECURE
    CSRF_COOKIE_SECURE = COOKIE_SECURE
    X_FRAME_OPTIONS = "DENY"
    SECURE_REFERRER_POLICY = "same-origin"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_RATES": {"login": "60/min"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
}

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
