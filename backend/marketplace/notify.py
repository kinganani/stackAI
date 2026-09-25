from accounts.models import Profile
from .matching import haversine_km, hours_left, match_score
from .models import BuyerAlert


PRIORITY_WINDOW_MINUTES = 8


def notify_buyers_in_radius(stock, now):
    h = hours_left(stock.expires_at, now)
    scored = []
    for profile in Profile.objects.filter(role="buyer").select_related("user"):
        if profile.lat is None or profile.lng is None:
            continue
        radius = profile.radius_km or 5
        dist = haversine_km(profile.lat, profile.lng, stock.lat, stock.lng)
        if dist > radius:
            continue
        score = match_score(
            distance_km=dist,
            radius_km=radius,
            hours=h,
            category=stock.category,
            qty_available=stock.qty_available,
            buyer_type=profile.buyer_type,
        )
        scored.append((score, dist, profile.user_id))
    scored.sort(key=lambda x: -x[0])
    alerts = []
    for i, (score, dist, user_id) in enumerate(scored):
        alerts.append(
            BuyerAlert(
                buyer_id=user_id,
                stock=stock,
                score=score,
                distance_km=round(dist, 2),
                priority=i < 3,
            )
        )
    if alerts:
        BuyerAlert.objects.bulk_create(alerts, ignore_conflicts=True)
    return alerts


def notify_order_accepted(reservation):
    stock = reservation.stock
    buyer = reservation.buyer
    profile = getattr(buyer, "profile", None)
    dist = reservation.match_score or 0
    if profile and profile.lat is not None and profile.lng is not None:
        dist = round(haversine_km(profile.lat, profile.lng, stock.lat, stock.lng), 2)
    BuyerAlert.objects.update_or_create(
        buyer=buyer,
        stock=stock,
        kind=BuyerAlert.Kind.ACCEPTED,
        defaults={
            "reservation": reservation,
            "score": reservation.match_score or 0,
            "distance_km": dist,
            "priority": True,
            "read": False,
        },
    )
