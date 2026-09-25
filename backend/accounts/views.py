from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer


REFRESH_COOKIE = "refresh_token"


def set_refresh_cookie(response, refresh: RefreshToken):
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="Lax",
        max_age=7 * 24 * 3600,
        path="/api/auth/",
    )


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth/")


def ensure_profile(user):
    profile = getattr(user, "profile", None)
    if profile:
        return profile
    return Profile.objects.create(
        user=user,
        role=Profile.Role.BUYER,
        display_name=user.get_full_name() or user.username,
        quartier="",
    )


def auth_payload(user):
    refresh = RefreshToken.for_user(user)
    profile = ensure_profile(user)
    body = {
        "access": str(refresh.access_token),
        "profile": ProfileSerializer(profile).data,
    }
    return refresh, body


class LoginThrottle(AnonRateThrottle):
    scope = "login"

    def allow_request(self, request, view):
        if settings.DEBUG:
            return True
        return super().allow_request(request, view)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]
    authentication_classes = []

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            user = ser.save()
        refresh, body = auth_payload(user)
        resp = Response(body, status=status.HTTP_201_CREATED)
        set_refresh_cookie(resp, refresh)
        return resp


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or request.data.get("username") or "").strip().lower()
        password = request.data.get("password") or ""
        if not email or not password:
            return Response({"detail": "Email et mot de passe obligatoires."}, status=400)

        found = User.objects.filter(username__iexact=email).first() or User.objects.filter(email__iexact=email).first()
        user = authenticate(request, username=found.username, password=password) if found else None
        if not user:
            return Response({"detail": "Email ou mot de passe incorrect."}, status=400)

        ensure_profile(user)
        expected = request.data.get("role")
        if expected in ("buyer", "seller") and user.profile.role != expected:
            # On connecte quand même : le front redirige vers le bon espace.
            pass

        refresh, body = auth_payload(user)
        resp = Response(body)
        set_refresh_cookie(resp, refresh)
        return resp


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.COOKIES.get(REFRESH_COOKIE)
        if not raw:
            return Response({"detail": "Session expirée."}, status=401)
        try:
            old = RefreshToken(raw)
            user_id = old.get("user_id")
        except Exception:
            return Response({"detail": "Refresh invalide."}, status=401)
        user = User.objects.filter(id=user_id).first()
        if not user or not user.is_active:
            return Response({"detail": "Utilisateur introuvable."}, status=401)
        refresh, body = auth_payload(user)
        resp = Response(body)
        set_refresh_cookie(resp, refresh)
        return resp


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        resp = Response({"ok": True})
        clear_refresh_cookie(resp)
        return resp


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(ensure_profile(request.user)).data)

    def patch(self, request):
        ser = ProfileSerializer(ensure_profile(request.user), data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
