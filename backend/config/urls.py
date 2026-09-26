from django.urls import include, path, re_path

from .spa import spa

urlpatterns = [
    path("api/", include("accounts.urls")),
    path("api/", include("stocks.urls")),
    path("api/", include("reservations.urls")),
    re_path(r"^(?P<rel>.*)$", spa),
]
