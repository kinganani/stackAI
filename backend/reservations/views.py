from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBuyer, IsSeller
from stocks.freshness import sync_lot
from stocks.models import Stock

from .guide import guide_route
from .models import Reservation
from .services import release_expired, reservation_payload


class ReservationCreateView(APIView):
    permission_classes = [IsBuyer]

    def post(self, request):
        release_expired()
        stock_id = request.data.get("stock_id")
        try:
            qty = int(request.data.get("qty"))
        except (TypeError, ValueError):
            return Response({"detail": "Quantité invalide."}, status=400)
        if qty < 1:
            return Response({"detail": "Quantité invalide."}, status=400)
        try:
            with transaction.atomic():
                stock = Stock.objects.select_for_update().get(id=stock_id)
                sync_lot(stock)
                if stock.status not in ("live", "partial") or stock.expires_at <= timezone.now():
                    return Response({"detail": "Offre indisponible."}, status=409)
                if qty > stock.qty_available:
                    return Response({"detail": "Quantité plus disponible."}, status=409)
                stock.qty_available -= qty
                stock.status = "exhausted" if stock.qty_available == 0 else "partial"
                stock.save(update_fields=["qty_available", "status"])
                reservation = Reservation.objects.create(
                    stock=stock,
                    buyer=request.user,
                    qty=qty,
                    unit_price_snapshot=stock.published_price,
                    amount_due=qty * stock.published_price,
                    status="pending_payment",
                    reserved_until=timezone.now() + timedelta(minutes=20),
                )
        except Stock.DoesNotExist:
            return Response({"detail": "Offre introuvable."}, status=404)
        return Response(reservation_payload(reservation, request.user), status=201)


def _live_point(data):
    try:
        lat = float(data.get("lat"))
        lng = float(data.get("lng"))
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return lat, lng


class ReservationDetailView(APIView):
    def get(self, request, reservation_id):
        release_expired()
        reservation = Reservation.objects.select_related("stock", "buyer").filter(id=reservation_id).first()
        if reservation is None:
            return Response({"detail": "Réservation introuvable."}, status=404)
        user = request.user
        if user.role == "buyer" and reservation.buyer_id != user.id:
            return Response({"detail": "Réservation introuvable."}, status=404)
        if user.role == "seller" and reservation.stock.seller_id != user.id:
            return Response({"detail": "Réservation introuvable."}, status=404)
        return Response(reservation_payload(reservation, user))


class MyReservationsView(APIView):
    def get(self, request):
        release_expired()
        if request.user.role == "buyer":
            rows = Reservation.objects.select_related("stock", "buyer").filter(buyer=request.user)
        else:
            rows = Reservation.objects.select_related("stock", "buyer").filter(stock__seller=request.user)
        return Response([reservation_payload(row, request.user) for row in rows.order_by("-created_at")])


class ReservationAcceptView(APIView):
    permission_classes = [IsSeller]

    def post(self, request, reservation_id):
        release_expired()
        point = _live_point(request.data)
        with transaction.atomic():
            reservation = Reservation.objects.select_for_update().select_related("stock", "buyer").filter(
                id=reservation_id, stock__seller=request.user
            ).first()
            if reservation is None:
                return Response({"detail": "Demande introuvable."}, status=404)
            if reservation.status not in ("pending_payment", "pending_priority"):
                return Response({"detail": "Cette demande n’est plus à valider."}, status=400)
            stock = reservation.stock
            lat, lng = point or (stock.lat, stock.lng)
            reservation.status = "accepted"
            reservation.pickup_lat = lat
            reservation.pickup_lng = lng
            reservation.pickup_address = stock.adresse_collecte
            reservation.save(update_fields=["status", "pickup_lat", "pickup_lng", "pickup_address"])
        return Response(reservation_payload(reservation, request.user))


class RouteGuideView(APIView):
    def post(self, request):
        return Response(guide_route(request.data))
