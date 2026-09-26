from django.urls import path

from .push_views import PushSubscribeView, VapidPublicView
from .views import LoginView, LogoutView, MeView, RefreshView, RegisterView

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/refresh/", RefreshView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("me/", MeView.as_view()),
    path("push/vapid/", VapidPublicView.as_view()),
    path("push/subscribe/", PushSubscribeView.as_view()),
]
