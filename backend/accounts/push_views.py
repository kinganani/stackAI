from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from .models import PushSubscription


class VapidPublicView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"public_key": settings.VAPID_PUBLIC_KEY or ""})


class PushSubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        keys = data.get("keys") if isinstance(data.get("keys"), dict) else {}
        endpoint = str(data.get("endpoint") or "").strip()
        p256dh = str(keys.get("p256dh") or "").strip()
        auth = str(keys.get("auth") or "").strip()
        if not endpoint or not p256dh or not auth:
            return Response({"detail": "Abonnement push incomplet."}, status=400)
        agent = (request.META.get("HTTP_USER_AGENT") or "")[:240]
        row, _created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": p256dh,
                "auth": auth,
                "user_agent": agent,
            },
        )
        return Response({"ok": True})

    def delete(self, request):
        endpoint = str(request.data.get("endpoint") or "").strip()
        if not endpoint:
            return Response({"detail": "Endpoint manquant."}, status=400)
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response({"ok": True})
