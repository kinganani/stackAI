from django.conf import settings
from django.urls import include, path
from django.views.generic import RedirectView


def _app_home():
    origins = settings.CORS_ALLOWED_ORIGINS or ["http://127.0.0.1:5173"]
    chosen = next((origin for origin in origins if "127.0.0.1" in origin), origins[0])
    return chosen.rstrip("/") + "/"


urlpatterns = [
    path("", RedirectView.as_view(url=_app_home(), permanent=False)),
    path("api/", include("accounts.urls")),
    path("api/", include("stocks.urls")),
    path("api/", include("reservations.urls")),
]
