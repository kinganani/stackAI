from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .quarters import QUARTERS


def clean_email(raw):
    email = str(raw or "").strip().lower()
    if not email:
        return ""
    try:
        validate_email(email)
    except ValidationError:
        return None
    return email


def normalize_phone(raw):
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    if digits.startswith("00228"):
        digits = digits[5:]
    elif digits.startswith("228") and len(digits) > 8:
        digits = digits[3:]
    return digits


def profile_payload(user):
    return {
        "id": str(user.id),
        "phone": user.phone,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "quarter": user.quarter,
        "lat": user.lat,
        "lng": user.lng,
        "radius_km": float(user.radius_km),
        "buyer_type": user.buyer_type,
        "momo_alias": user.momo_alias,
    }


def set_refresh_cookie(response, refresh):
    response.set_cookie(
        settings.REFRESH_COOKIE,
        str(refresh),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=7 * 24 * 3600,
        path="/api/auth/",
    )


class LoginThrottle(AnonRateThrottle):
    scope = "login"


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data
        role = data.get("role")
        phone = normalize_phone(data.get("phone") or "")
        email = clean_email(data.get("email"))
        password = data.get("password") or ""
        quarter = str(data.get("quarter") or "").strip()
        if email is None:
            return Response({"detail": "Indique une adresse e-mail valide."}, status=400)
        if not email:
            return Response({"detail": "L’e-mail est requis."}, status=400)
        if role not in ("seller", "buyer") or len(password) < 8:
            return Response({"detail": "Choisis producteur ou client, et un code d’au moins 8 caractères."}, status=400)
        if len(phone) != 8:
            return Response({"detail": "Indique un numéro togolais à 8 chiffres, avec ou sans +228."}, status=400)
        if not quarter:
            return Response({"detail": "Le quartier est requis."}, status=400)
        try:
            lat = float(data.get("lat"))
            lng = float(data.get("lng"))
        except (TypeError, ValueError):
            return Response({"detail": "La localisation en temps réel est obligatoire."}, status=400)
        if Profile.objects.filter(phone=phone).exists():
            return Response({"detail": "Ce numéro est déjà utilisé."}, status=400)
        if Profile.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Cet e-mail est déjà utilisé."}, status=400)
        try:
            user = Profile.objects.create_user(
                phone=phone,
                password=password,
                email=email,
                full_name=(data.get("full_name") or "").strip() or phone,
                role=role,
                quarter=quarter,
                lat=lat,
                lng=lng,
                buyer_type=None,
                momo_alias=None,
            )
        except IntegrityError:
            return Response({"detail": "Ce numéro ou cet e-mail est déjà utilisé."}, status=400)
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token), "user": profile_payload(user)}, status=201)
        set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginThrottle]

    def post(self, request):
        identifiant = str(request.data.get("identifiant") or request.data.get("email") or request.data.get("phone") or "").strip()
        password = request.data.get("password") or ""
        if "@" in identifiant:
            user = Profile.objects.filter(email__iexact=identifiant).first()
        else:
            user = Profile.objects.filter(phone=normalize_phone(identifiant)).first()
        if user is None or not user.check_password(password) or not user.is_active:
            return Response({"detail": "E-mail, numéro ou code incorrect."}, status=401)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token), "user": profile_payload(user)})
        set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE)
        if not raw:
            return Response({"detail": "Session expirée."}, status=401)
        try:
            old = RefreshToken(raw)
            user_id = old.get("user_id")
        except TokenError:
            return Response({"detail": "Session expirée."}, status=401)
        user = Profile.objects.filter(id=user_id, is_active=True).first()
        if user is None:
            return Response({"detail": "Session expirée."}, status=401)
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token), "user": profile_payload(user)})
        set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        response = Response({"detail": "Déconnecté."})
        response.delete_cookie(
            settings.REFRESH_COOKIE,
            path="/api/auth/",
            samesite=settings.REFRESH_COOKIE_SAMESITE,
        )
        return response


class MeView(APIView):
    def get(self, request):
        return Response(profile_payload(request.user))

    def patch(self, request):
        user = request.user
        quarter = request.data.get("quarter")
        if quarter:
            if quarter not in QUARTERS:
                return Response({"detail": "Quartier inconnu."}, status=400)
            user.quarter = quarter
            user.lat, user.lng = QUARTERS[quarter]
        if request.data.get("full_name"):
            user.full_name = str(request.data["full_name"]).strip()
        if "radius_km" in request.data:
            radius = float(request.data["radius_km"])
            if not 1 <= radius <= 30:
                return Response({"detail": "Rayon entre 1 et 30 km."}, status=400)
            user.radius_km = radius
        if user.role == "seller" and "momo_alias" in request.data:
            user.momo_alias = str(request.data["momo_alias"]).strip() or None
        user.save(update_fields=["full_name", "quarter", "lat", "lng", "radius_km", "momo_alias"])
        return Response(profile_payload(user))
