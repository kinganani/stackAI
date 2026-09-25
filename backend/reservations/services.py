from django.utils import timezone

from .models import Reservation


def release_expired():
    now = timezone.now()
    due = Reservation.objects.filter(
        status__in=("pending_priority", "pending_payment"),
        reserved_until__lte=now,
    ).select_related("stock")
    for reservation in due:
        stock = reservation.stock
        stock.qty_available = min(stock.qty_initial, stock.qty_available + reservation.qty)
        if stock.status not in ("cancelled", "expired"):
            stock.status = "live" if stock.qty_available == stock.qty_initial else "partial"
        stock.save(update_fields=["qty_available", "status"])
        reservation.status = "expired"
        reservation.save(update_fields=["status"])


def _pickup(reservation):
    stock = reservation.stock
    lat = reservation.pickup_lat if reservation.pickup_lat is not None else stock.lat
    lng = reservation.pickup_lng if reservation.pickup_lng is not None else stock.lng
    address = reservation.pickup_address or stock.adresse_collecte
    return float(lat), float(lng), address


def reservation_payload(reservation, viewer=None):
    stock = reservation.stock
    accepted = reservation.status == "accepted"
    is_seller = getattr(viewer, "role", None) == "seller"
    payload = {
        "id": str(reservation.id),
        "stock_id": str(stock.id),
        "product": stock.product,
        "qty": reservation.qty,
        "unit": stock.unit,
        "unit_price_snapshot": reservation.unit_price_snapshot,
        "amount_due": reservation.amount_due,
        "status": reservation.status,
        "reserved_until": reservation.reserved_until.isoformat(),
        "quarter": stock.quarter,
        "image_url": stock.image_url or "",
        "pickup_ready": accepted,
        "adresse_collecte": stock.adresse_collecte if is_seller or accepted else stock.quarter,
    }
    if accepted:
        lat, lng, address = _pickup(reservation)
        payload["adresse_collecte"] = address
        payload["lat"] = lat
        payload["lng"] = lng
        payload["maps_url"] = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"
        buyer = reservation.buyer
        payload["buyer_name"] = buyer.full_name
        if is_seller:
            payload["buyer_phone"] = buyer.phone
    return payload
