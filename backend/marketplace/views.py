import secrets
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsBuyer, IsSeller
from .matching import haversine_km, hours_left, match_reason, match_score
from .models import BuyerAlert, Reservation, Stock
from .notify import PRIORITY_WINDOW_MINUTES, notify_buyers_in_radius, notify_order_accepted
from .serializers import BuyerAlertSerializer, ReservationSerializer, StockCreateSerializer, StockSerializer
from .learn_store import remember_submission
from .lot_photo import save_lot_photo
from .vision import analyze_lot


def _pickup_code():
    return "LM-" + secrets.token_hex(2).upper()


class StockCreateView(APIView):
    permission_classes = [IsSeller]

    def post(self, request):
        b64 = request.data.get("image_base64")
        if not b64:
            return Response(
                {"detail": "Photographiez le lot : la fiche affiche cette photo, pas une image générique."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = StockCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        data.pop("image_url", None)
        now = timezone.now()
        stock = Stock.objects.create(
            seller=request.user,
            qty_available=data["qty_initial"],
            status=Stock.Status.LIVE,
            **data,
        )
        photo = save_lot_photo(b64, stock.id)
        if not photo:
            stock.delete()
            return Response(
                {"detail": "La photo n’a pas pu être enregistrée. Reprenez un cliché net."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stock.image_url = photo
        stock.save(update_fields=["image_url"])
        notify_buyers_in_radius(stock, now)
        remember_submission(
            image_base64=b64,
            kind=stock.category if stock.category != "autre" else "fruit",
            rotten=False,
            source="publish",
        )
        return Response(StockSerializer(stock, context={"request": request}).data, status=201)


class StockMineView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        qs = Stock.objects.filter(seller=request.user).exclude(status=Stock.Status.CANCELLED)
        return Response(StockSerializer(qs, many=True, context={"request": request}).data)


class StockCancelView(APIView):
    permission_classes = [IsSeller]

    def post(self, request, pk):
        stock = get_object_or_404(Stock, pk=pk, seller=request.user)
        stock.status = Stock.Status.CANCELLED
        stock.save(update_fields=["status"])
        Reservation.objects.filter(
            stock=stock,
            status__in=["pending_priority", "pending_payment", "pending_seller"],
        ).update(status=Reservation.Status.CANCELLED)
        return Response(StockSerializer(stock).data)


class StockNearbyView(APIView):
    permission_classes = [IsBuyer]

    def get(self, request):
        profile = request.user.profile
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        try:
            lat = float(lat) if lat is not None else profile.lat
            lng = float(lng) if lng is not None else profile.lng
        except (TypeError, ValueError):
            lat = profile.lat
            lng = profile.lng
        if lat is None or lng is None:
            return Response({"detail": "Position requise (GPS ou quartier)."}, status=400)

        radius = float(request.query_params.get("radius_km") or profile.radius_km or 15)
        q = (request.query_params.get("q") or "").strip().lower()
        quartier = (request.query_params.get("quartier") or "").strip()
        sort = (request.query_params.get("sort") or "").strip()
        now = timezone.now()
        qs = Stock.objects.filter(
            status__in=[Stock.Status.LIVE, Stock.Status.PARTIAL, Stock.Status.EXHAUSTED],
            expires_at__gt=now,
        )
        if quartier:
            qs = qs.filter(quartier__icontains=quartier)
        if q:
            from django.db.models import Q

            qs = qs.filter(Q(product_name__icontains=q) | Q(description__icontains=q) | Q(category__icontains=q))

        results = []
        for stock in qs:
            dist = haversine_km(lat, lng, stock.lat, stock.lng)
            if dist > radius:
                continue
            h = hours_left(stock.expires_at, now)
            score = match_score(
                distance_km=dist,
                radius_km=radius,
                hours=h,
                category=stock.category,
                qty_available=stock.qty_available,
                buyer_type=profile.buyer_type,
            )
            stock.distance_km = round(dist, 2)
            stock.match_score = score
            stock.match_reason = match_reason(score, dist, h)
            results.append(stock)
        if q or sort == "score":
            results.sort(key=lambda s: (-s.match_score, s.distance_km))
        else:
            results.sort(key=lambda s: (s.distance_km, -s.match_score))
        return Response(StockSerializer(results, many=True, context={"request": request}).data)


class StockDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        stock = get_object_or_404(Stock, pk=pk)
        profile = request.user.profile
        lat, lng = profile.lat, profile.lng
        if lat is not None and lng is not None:
            dist = haversine_km(lat, lng, stock.lat, stock.lng)
            stock.distance_km = round(dist, 2)
            h = hours_left(stock.expires_at, timezone.now())
            stock.match_score = match_score(
                distance_km=dist,
                radius_km=profile.radius_km or 5,
                hours=h,
                category=stock.category,
                qty_available=stock.qty_available,
                buyer_type=profile.buyer_type,
            )
            stock.match_reason = match_reason(stock.match_score, dist, h)
        return Response(StockSerializer(stock, context={"request": request}).data)


class ReserveView(APIView):
    permission_classes = [IsBuyer]

    def post(self, request):
        stock_id = request.data.get("stock_id")
        try:
            qty = int(request.data.get("qty") or 0)
        except (TypeError, ValueError):
            return Response({"detail": "Quantité invalide."}, status=400)
        if qty < 1:
            return Response({"detail": "Quantité minimale : 1."}, status=400)

        now = timezone.now()
        with transaction.atomic():
            try:
                stock = Stock.objects.select_for_update().get(pk=stock_id)
            except Stock.DoesNotExist:
                return Response({"detail": "Lot introuvable."}, status=404)
            if stock.status not in (Stock.Status.LIVE, Stock.Status.PARTIAL) or stock.expires_at <= now:
                return Response(
                    {"detail": "Le produit est indisponible.", "qty_available": stock.qty_available, "available": False},
                    status=409,
                )
            if stock.qty_available < 1:
                return Response(
                    {"detail": "Le produit est indisponible.", "qty_available": 0, "available": False},
                    status=409,
                )
            if stock.qty_available < qty:
                return Response(
                    {
                        "detail": f"Il ne reste que {stock.qty_available} {stock.unit}.",
                        "qty_available": stock.qty_available,
                        "available": True,
                    },
                    status=409,
                )

            window_end = stock.created_at + timedelta(minutes=PRIORITY_WINDOW_MINUTES)
            in_priority = now < window_end
            priority_ids = list(
                BuyerAlert.objects.filter(stock=stock, priority=True).values_list("buyer_id", flat=True)
            )
            if in_priority and priority_ids and request.user.id not in priority_ids:
                remaining = int((window_end - now).total_seconds() // 60) + 1
                return Response(
                    {
                        "detail": (
                            f"Réservation prioritaire : les 3 meilleurs matchs du rayon ont encore "
                            f"{remaining} min. Réessayez ensuite."
                        )
                    },
                    status=409,
                )

            stock.qty_available -= qty
            stock.status = Stock.Status.EXHAUSTED if stock.qty_available == 0 else Stock.Status.PARTIAL
            stock.save(update_fields=["qty_available", "status"])

            profile = request.user.profile
            dist = 0.0
            if profile.lat is not None and profile.lng is not None:
                dist = haversine_km(profile.lat, profile.lng, stock.lat, stock.lng)
            h = hours_left(stock.expires_at, now)
            score = match_score(
                distance_km=dist,
                radius_km=profile.radius_km or 5,
                hours=h,
                category=stock.category,
                qty_available=stock.qty_available + qty,
                buyer_type=profile.buyer_type,
            )
            unit = stock.published_price
            if in_priority and request.user.id in priority_ids:
                status_resa = Reservation.Status.PENDING_PRIORITY
                until = min(window_end + timedelta(hours=5), now + timedelta(hours=6))
            else:
                status_resa = Reservation.Status.PENDING_SELLER
                until = now + timedelta(hours=6)
            resa = Reservation.objects.create(
                stock=stock,
                buyer=request.user,
                qty=qty,
                unit_price_snapshot=unit,
                amount_due=qty * unit,
                status=status_resa,
                reserved_until=until,
                match_score=score,
                pickup_code=_pickup_code(),
            )
        return Response(ReservationSerializer(resa, context={"request": request}).data, status=201)


class ReservationDetailView(APIView):
    def get(self, request, pk):
        resa = get_object_or_404(Reservation, pk=pk)
        if resa.buyer_id != request.user.id and resa.stock.seller_id != request.user.id:
            return Response({"detail": "Accès refusé."}, status=403)
        if resa.reserved_until < timezone.now() and resa.status.startswith("pending"):
            with transaction.atomic():
                locked = Reservation.objects.select_for_update().get(pk=resa.pk)
                if locked.status.startswith("pending"):
                    locked.status = Reservation.Status.EXPIRED
                    locked.save(update_fields=["status"])
                    stock = Stock.objects.select_for_update().get(pk=locked.stock_id)
                    stock.qty_available += locked.qty
                    if stock.status == Stock.Status.EXHAUSTED:
                        stock.status = Stock.Status.PARTIAL
                    stock.save(update_fields=["qty_available", "status"])
                    resa = locked
        return Response(ReservationSerializer(resa, context={"request": request}).data)


class ReservationAcceptView(APIView):
    permission_classes = [IsSeller]

    def post(self, request, pk):
        with transaction.atomic():
            resa = get_object_or_404(
                Reservation.objects.select_for_update().select_related(
                    "stock", "stock__seller__profile", "buyer__profile"
                ),
                pk=pk,
            )
            if resa.stock.seller_id != request.user.id:
                return Response({"detail": "Accès refusé."}, status=403)
            if resa.status not in (
                Reservation.Status.PENDING_SELLER,
                Reservation.Status.PENDING_PRIORITY,
                Reservation.Status.PENDING_PAYMENT,
            ):
                return Response({"detail": "Cette demande n'est plus en attente."}, status=409)
            resa.status = Reservation.Status.ACCEPTED
            resa.save(update_fields=["status"])
        notify_order_accepted(resa)
        return Response(ReservationSerializer(resa, context={"request": request}).data)


class AnalyzeLotView(APIView):
    permission_classes = [IsSeller]

    def post(self, request):
        category = request.data.get("category") or "autre"
        qty = request.data.get("qty_initial") or 1
        try:
            qty = int(qty)
        except (TypeError, ValueError):
            qty = 1
        hint = analyze_lot(
            category=category,
            qty=qty,
            image_base64=request.data.get("image_base64") or None,
            hours_override=None if request.data.get("image_base64") else request.data.get("hours"),
        )
        if request.data.get("image_base64") and not hint.get("scan_ok"):
            return Response(hint, status=422)
        b64 = request.data.get("image_base64")
        if b64 and hint.get("scan_ok"):
            guessed = hint.get("category_guess") or "fruit"
            user_cat = category if category not in (None, "", "autre") else guessed
            remember_submission(
                image_base64=b64,
                kind=user_cat,
                rotten=bool(hint.get("rotten")),
                source="scan",
            )
        return Response(hint)


class MyReservationsView(APIView):
    def get(self, request):
        if request.user.profile.role == "buyer":
            qs = Reservation.objects.filter(buyer=request.user).select_related("stock", "stock__seller__profile")
        else:
            qs = Reservation.objects.filter(stock__seller=request.user).select_related("stock", "buyer__profile")
        return Response(ReservationSerializer(qs, many=True, context={"request": request}).data)


class BuyerAlertListView(APIView):
    permission_classes = [IsBuyer]

    def get(self, request):
        qs = (
            BuyerAlert.objects.filter(buyer=request.user)
            .select_related("stock", "stock__seller__profile", "reservation")
            .order_by("-created_at")[:40]
        )
        unread = BuyerAlert.objects.filter(buyer=request.user, read=False).count()
        return Response({"unread": unread, "results": BuyerAlertSerializer(qs, many=True, context={"request": request}).data})


class BuyerAlertReadView(APIView):
    permission_classes = [IsBuyer]

    def post(self, request, pk=None):
        if pk:
            BuyerAlert.objects.filter(buyer=request.user, pk=pk).update(read=True)
        else:
            BuyerAlert.objects.filter(buyer=request.user, read=False).update(read=True)
        unread = BuyerAlert.objects.filter(buyer=request.user, read=False).count()
        return Response({"unread": unread})
