import json
import logging

from django.conf import settings
from pywebpush import webpush

from .models import PushSubscription

logger = logging.getLogger(__name__)


def notify_user(user, title, body, url="/"):
    if user is None or not getattr(settings, "VAPID_PRIVATE_KEY", ""):
        return
    payload = json.dumps({"title": title, "body": body or "", "url": url}, ensure_ascii=False)
    claims = {"sub": settings.VAPID_SUBJECT}
    for row in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={
                    "endpoint": row.endpoint,
                    "keys": {"p256dh": row.p256dh, "auth": row.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=claims,
            )
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                row.delete()
            else:
                logger.warning("Push échoué: %s", exc)
