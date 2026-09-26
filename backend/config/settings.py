import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
ON_VERCEL = bool(os.getenv("VERCEL"))
DEBUG = False if ON_VERCEL else os.getenv("DEBUG", "True") == "True"
DEMO_MODE = os.getenv("DEMO_MODE", "False" if ON_VERCEL else "True") == "True"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "accounts",
    "stocks",
    "reservations",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
AUTH_USER_MODEL = "accounts.Profile"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or os.getenv("POSTGRES_PRISMA_URL")
    or os.getenv("POSTGRES_URL_NON_POOLING")
    or ""
).strip().strip('"').strip("'")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")
DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024


if DATABASE_URL and os.getenv("DJANGO_USE_SQLITE") != "1":
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=0,
            ssl_require=os.getenv("DATABASE_SSL", "true").lower() == "true",
        )
    }
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://.*\.vercel\.app$"]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", ",".join(CORS_ALLOWED_ORIGINS)).split(",")
    if origin.strip()
]


def _vercel_hosts():
    hosts = [".vercel.app"]
    for raw in (
        os.getenv("VERCEL_URL"),
        os.getenv("VERCEL_PROJECT_PRODUCTION_URL"),
        os.getenv("VERCEL_BRANCH_URL"),
    ):
        if not raw:
            continue
        host = raw.replace("https://", "").replace("http://", "").split("/")[0].strip()
        if host:
            hosts.append(host)
    return hosts


def _vercel_origins():
    origins = []
    for host in _vercel_hosts():
        if host.startswith("."):
            continue
        origins.append(f"https://{host}")
    return origins


if os.getenv("VERCEL"):
    ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *_vercel_hosts(), "localhost", "127.0.0.1"]))
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys([*CORS_ALLOWED_ORIGINS, *_vercel_origins()]))
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([*CSRF_TRUSTED_ORIGINS, *_vercel_origins()]))
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_RATES": {"login": "5/min"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

REFRESH_COOKIE = "lm_refresh"
REFRESH_COOKIE_SECURE = os.getenv("REFRESH_COOKIE_SECURE", "false" if DEBUG else "true").lower() == "true"
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "Lax" if DEBUG else "None")

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:localmatch@localhost")

if os.getenv("VERCEL"):
    if not os.getenv("REFRESH_COOKIE_SECURE"):
        REFRESH_COOKIE_SECURE = True
    if not os.getenv("REFRESH_COOKIE_SAMESITE"):
        REFRESH_COOKIE_SAMESITE = "Lax"
    if not os.getenv("VAPID_SUBJECT"):
        prod = os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or os.getenv("VERCEL_URL") or ""
        host = prod.replace("https://", "").replace("http://", "").split("/")[0]
        if host:
            VAPID_SUBJECT = f"mailto:localmatch@{host}"
