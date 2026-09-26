from django.conf import settings
from django.http import JsonResponse


class RequireDatabaseUrlMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            getattr(settings, "ON_VERCEL", False)
            and not getattr(settings, "DATABASE_URL", "")
            and request.path.startswith("/api/")
        ):
            return JsonResponse(
                {
                    "detail": "DATABASE_URL est absent sur Vercel. "
                    "Ajoute l’URI Supabase (port 5432, sslmode=require) "
                    "dans Settings → Environment Variables, Production + Preview, puis redéploie.",
                },
                status=503,
            )
        return self.get_response(request)
