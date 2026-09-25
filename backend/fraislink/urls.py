from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from accounts.views import MeView


def health(_request):
    return JsonResponse(
        {
            "ok": True,
            "service": "LocalMatch",
            "defi": "ESIG Tech Arena — Défi 1 denrées périssables",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("accounts.urls")),
    path("api/me/", MeView.as_view()),
    path("api/", include("marketplace.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
