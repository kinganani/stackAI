import hashlib
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction

from accounts.permissions import IsBuyer, IsSeller
from accounts.quarters import HOURS_MAX, HOURS_REF, QUARTERS
from reservations.services import release_expired

from .conservation import plan as conserve_plan
from .freshness import climate_state, sync_lot
from .matching import haversine_km, price_bands, price_ratio, score_offer, stepped_price
from .media import MediaError, destroy_image, estimate_produce, upload_image
from .models import AiAnalysis, Stock
from .voice import extract_voice


def stock_payload(stock, extra=None, analysis=None, include_plan=True):
    found = (analysis.payload if analysis is not None else None) or {}
    data = {
        "id": str(stock.id),
        "product": stock.product,
        "category": stock.category,
        "qty_initial": stock.qty_initial,
        "qty_available": stock.qty_available,
        "unit": stock.unit,
        "quarter": stock.quarter,
        "lat": stock.lat,
        "lng": stock.lng,
        "hours_left": float(stock.hours_left),
        "hours_ref": HOURS_REF.get(stock.category, 48),
        "market_price": stock.market_price,
        "published_price": stock.published_price,
        "adresse_collecte": stock.adresse_collecte,
        "image_url": stock.image_url or "",
        "status": stock.status,
        "expires_at": stock.expires_at.isoformat(),
    }
    if include_plan:
        data["conservation"] = conserve_plan(
            stock.hours_left,
            stock.category,
            stock.qty_available,
            stock.market_price,
            spoilage=found.get("spoilage_percent") or 0,
            quality=found.get("quality_percent"),
            unit=stock.unit,
        )
    if extra:
        data.update(extra)
    state = climate_state(stock, analysis=analysis)
    data["hours_effective"] = state["hours_effective"]
    data["freshness_now"] = state["freshness_now"]
    data["channel"] = state["channel"]
    data["weather"] = state["weather"]
    data["published_price"] = state["published_price"]
    return data


ALLOWED_IMAGES = {"image/jpeg": "image/jpeg", "image/jpg": "image/jpeg", "image/png": "image/png", "image/webp": "image/webp"}
ASPECT_KEYS = ("couleur", "moisissure", "fermete", "humidite", "chocs", "maturite", "part_vendable")
ASPECT_LABELS = {
    "couleur": "Couleur",
    "moisissure": "Moisissure",
    "fermete": "Fermeté",
    "humidite": "Humidité",
    "chocs": "Chocs",
    "maturite": "Maturité",
    "part_vendable": "Part vendable",
}
QUALITY_FLOOR = 50


def _number(value, caster):
    try:
        return caster(value)
    except (TypeError, ValueError):
        return None


def lot_quality(raw):
    aspects = raw.get("aspects") if isinstance(raw.get("aspects"), dict) else {}
    scores = []
    clean = []
    for key in ASPECT_KEYS:
        value = _number(aspects.get(key), float)
        if value is None:
            continue
        value = min(max(value, 0), 100)
        scores.append(value)
        clean.append({"key": key, "label": ASPECT_LABELS[key], "score": round(value)})
    headline = _number(raw.get("quality_percent"), float)
    if headline is not None:
        headline = min(max(headline, 0), 100)
    if scores and headline is not None:
        quality = min(sum(scores) / len(scores), headline)
    elif scores:
        quality = sum(scores) / len(scores)
    elif headline is not None:
        quality = headline
    else:
        spoilage = _number(raw.get("spoilage_percent"), float) or 0
        quality = 100 - min(max(spoilage, 0), 100)
    return round(quality), clean


class AnalyzeLotView(APIView):
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get("image")
        if image is None:
            return Response({"detail": "Ajoute une photo du produit, prise ou importée."}, status=400)
        if image.size > 6 * 1024 * 1024:
            return Response({"detail": "La photo dépasse 6 Mo."}, status=400)
        mime = ALLOWED_IMAGES.get((image.content_type or "").lower())
        if mime is None:
            return Response({"detail": "Utilise une photo JPEG, PNG ou WebP."}, status=400)
        content = image.read()
        digest = hashlib.sha256(content).hexdigest()
        recent = AiAnalysis.objects.filter(
            seller=request.user,
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).count()
        if recent >= 20:
            return Response({"detail": "Trop d'analyses pour le moment. Réessaie dans une heure."}, status=429)
        cached = None
        for stale in AiAnalysis.objects.filter(seller=request.user, stock__isnull=True):
            payload = stale.payload or {}
            same_photo = payload.get("image_sha") == digest and stale.created_at >= timezone.now() - timedelta(hours=2)
            if same_photo and cached is None:
                cached = stale
                continue
            destroy_image(payload.get("image_public_id"))
            stale.delete()
        if cached is not None:
            return Response({"id": str(cached.id), **(cached.payload or {})})
        public_id = ""
        try:
            image_url, public_id = upload_image(content, mime)
            raw = estimate_produce(content, mime)
        except MediaError as exc:
            destroy_image(public_id)
            return Response({"detail": exc.detail}, status=exc.status)
        if not raw.get("is_produce"):
            destroy_image(public_id)
            reason = str(raw.get("reason") or "La photo ne montre pas un produit agricole.").strip()
            return Response({"detail": reason}, status=422)
        category = raw.get("category") if raw.get("category") in HOURS_REF else "autre"
        hours = _number(raw.get("hours_left"), float)
        if hours is None:
            hours = float(HOURS_REF[category])
        hours = min(max(hours, 1), float(HOURS_MAX[category]))
        confidence = _number(raw.get("confidence"), float)
        confidence = 0 if confidence is None else min(max(confidence, 0), 1)
        product = str(raw.get("product") or "Produit agricole").strip()[:120]
        reason = str(raw.get("reason") or "Estimation visuelle, sans date lue sur une étiquette.").strip()[:400]
        printed = str(raw.get("printed_expiry") or "").strip()[:40]
        if not raw.get("printed_date_visible"):
            printed = ""
        spoilage = _number(raw.get("spoilage_percent"), float)
        if spoilage is None:
            spoilage = 0
        spoilage = min(max(spoilage, 0), 100)
        quality, aspects = lot_quality(raw)
        weak = [item["label"].lower() for item in aspects if item["score"] < QUALITY_FLOOR]
        if quality < QUALITY_FLOOR:
            destroy_image(public_id)
            weak_text = f" Points faibles : {', '.join(weak)}." if weak else ""
            return Response({
                "detail": (
                    f"Publication refusée. La qualité estimée est de {quality} %, sous le seuil de {QUALITY_FLOOR} %. "
                    f"Le lot n’est pas mis en ligne.{weak_text}"
                ),
                "refused": True,
                "quality_percent": quality,
                "spoilage_percent": round(spoilage),
                "aspects": aspects,
                "reason": reason,
            }, status=422)
        hours_ref = HOURS_REF[category]
        payload = {
            "image_url": image_url,
            "image_public_id": public_id,
            "image_sha": digest,
            "product": product,
            "category": category,
            "hours_left": round(hours, 1),
            "hours_ref": hours_ref,
            "confidence": round(confidence, 2),
            "reason": reason,
            "printed_expiry": printed or None,
            "visual_freshness": str(raw.get("visual_freshness") or "")[:40],
            "spoilage_percent": round(spoilage),
            "quality_percent": quality,
            "aspects": aspects,
            "ratio": price_ratio(hours, hours_ref),
            "bands": price_bands(hours_ref),
            "disclaimer": "Note croisée : couleur, moisissure, fermeté, humidité, chocs, maturité et part vendable. Ce n’est pas une mesure de laboratoire.",
            "conservation": conserve_plan(hours, category, 10, 0, spoilage=spoilage, quality=quality, unit="kg"),
        }
        analysis = AiAnalysis.objects.create(kind="freshness", payload=payload, seller=request.user)
        return Response({"id": str(analysis.id), **payload})


class VoiceDeclareView(APIView):
    permission_classes = [IsSeller]

    def post(self, request):
        transcript = str(request.data.get("transcript") or "").strip()
        if len(transcript) < 4:
            return Response({"detail": "Parle un peu plus longtemps, produit et quantité."}, status=400)
        return Response(extract_voice(transcript))


class StockListCreateView(APIView):
    permission_classes = [IsSeller]

    def post(self, request):
        data = request.data
        analysis = AiAnalysis.objects.filter(
            id=data.get("analysis_id"),
            seller=request.user,
            stock__isnull=True,
        ).first()
        if analysis is None:
            return Response({"detail": "Analyse une photo du produit avant de le publier."}, status=400)
        if analysis.created_at < timezone.now() - timedelta(hours=2):
            return Response({"detail": "Cette analyse est trop ancienne. Reprends la photo."}, status=400)
        found = analysis.payload or {}
        quality = found.get("quality_percent")
        if quality is None:
            quality = 100 - float(found.get("spoilage_percent") or 0)
        if float(quality) < QUALITY_FLOOR:
            return Response({
                "detail": f"Publication refusée. La qualité estimée est sous {QUALITY_FLOOR} %.",
                "refused": True,
            }, status=422)
        product = (data.get("product") or found.get("product") or "").strip()
        category = found.get("category") if found.get("category") in HOURS_REF else "autre"
        quarter = str(data.get("quarter") or "").strip()
        address = (data.get("adresse_collecte") or "").strip()
        unit = (data.get("unit") or "kg").strip()
        qty = _number(data.get("qty"), int)
        market = _number(data.get("market_price"), int)
        hours = _number(found.get("hours_left"), float)
        if not product or not address or not quarter or not qty or qty < 1:
            return Response({"detail": "Produit, quantité, quartier et adresse de collecte sont requis."}, status=400)
        if market is None or market < 1:
            return Response({"detail": "Indique le prix du produit encore frais, en FCFA."}, status=400)
        try:
            lat = float(data.get("lat"))
            lng = float(data.get("lng"))
        except (TypeError, ValueError):
            return Response({"detail": "La localisation en temps réel est obligatoire."}, status=400)
        if hours is None:
            return Response({"detail": "L'estimation de conservation est absente. Reprends la photo."}, status=400)
        hours = min(max(hours, 1), float(HOURS_MAX[category]))
        price = stepped_price(market, hours, HOURS_REF[category])
        now = timezone.now()
        stock = Stock.objects.create(
            seller=request.user,
            product=product,
            category=category,
            qty_initial=qty,
            qty_available=qty,
            unit=unit,
            quarter=quarter,
            lat=lat,
            lng=lng,
            hours_left=hours,
            market_price=market,
            published_price=price,
            adresse_collecte=address,
            image_url=found.get("image_url") or "",
            image_public_id=found.get("image_public_id") or "",
            status="live",
            expires_at=now + timedelta(hours=hours),
        )
        analysis.stock = stock
        analysis.save(update_fields=["stock"])
        return Response(stock_payload(stock, analysis=analysis), status=201)


class MyStocksView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        rows = list(Stock.objects.filter(seller=request.user).order_by("-created_at"))
        linked = {
            item.stock_id: item
            for item in AiAnalysis.objects.filter(stock_id__in=[row.id for row in rows])
        }
        for row in rows:
            sync_lot(row, analysis=linked.get(row.id))
        return Response([stock_payload(row, analysis=linked.get(row.id)) for row in rows])


class UpdateStockView(APIView):
    permission_classes = [IsSeller]

    def patch(self, request, stock_id):
        data = request.data
        product = (data.get("product") or "").strip()
        quarter = str(data.get("quarter") or "").strip()
        description = str(data.get("description") or "").strip()
        category = data.get("category") if data.get("category") in HOURS_REF else None
        qty = _number(data.get("qty"), int)
        market = _number(data.get("market_price"), int)
        if not product or len(product) > 120:
            return Response({"detail": "Indique le nom du produit."}, status=400)
        if category is None:
            return Response({"detail": "Choisis une catégorie du lot."}, status=400)
        if not quarter or len(quarter) > 80:
            return Response({"detail": "Indique le quartier de collecte."}, status=400)
        if qty is None or qty < 1:
            return Response({"detail": "La quantité restante doit être d'au moins 1 kg."}, status=400)
        if market is None or market < 1:
            return Response({"detail": "Indique le prix du produit encore frais, en FCFA."}, status=400)
        address = f"{quarter}, Lomé — {description}" if description else f"{quarter}, Lomé"
        if len(address) > 240:
            return Response({"detail": "La description est trop longue."}, status=400)

        with transaction.atomic():
            stock = Stock.objects.select_for_update().filter(id=stock_id, seller=request.user).first()
            if stock is None:
                return Response({"detail": "Offre introuvable."}, status=404)
            sync_lot(stock)
            if stock.status not in ("live", "partial"):
                return Response({"detail": "Ce lot ne peut plus être modifié."}, status=400)
            new_initial = stock.qty_initial + (qty - stock.qty_available)
            if new_initial < qty:
                new_initial = qty
            if quarter in QUARTERS:
                lat, lng = QUARTERS[quarter]
            else:
                lat, lng = stock.lat, stock.lng
            stock.product = product
            stock.category = category
            stock.quarter = quarter
            stock.lat = lat
            stock.lng = lng
            stock.adresse_collecte = address
            stock.qty_available = qty
            stock.qty_initial = new_initial
            stock.market_price = market
            stock.published_price = stepped_price(market, stock.hours_left, HOURS_REF[category])
            stock.status = "live" if new_initial == qty else "partial"
            stock.save(update_fields=[
                "product", "category", "quarter", "lat", "lng", "adresse_collecte",
                "qty_available", "qty_initial", "market_price", "published_price", "status",
            ])
        analysis = AiAnalysis.objects.filter(stock=stock).first()
        sync_lot(stock, analysis=analysis)
        return Response(stock_payload(stock, analysis=analysis))


class CancelStockView(APIView):
    permission_classes = [IsSeller]

    def post(self, request, stock_id):
        stock = Stock.objects.filter(id=stock_id, seller=request.user).first()
        if stock is None:
            return Response({"detail": "Offre introuvable."}, status=404)
        if stock.status not in ("live", "partial"):
            return Response({"detail": "Cette offre ne peut plus être annulée."}, status=400)
        from reservations.models import Reservation
        pending = Reservation.objects.filter(
            stock=stock, status__in=("pending_priority", "pending_payment")
        )
        locked = sum(row.qty for row in pending)
        pending.update(status="expired")
        stock.qty_available = min(stock.qty_initial, stock.qty_available + locked)
        stock.status = "cancelled"
        stock.save(update_fields=["status", "qty_available"])
        return Response(stock_payload(stock))


class PublicCatalogView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        release_expired()
        visible = []
        rows = list(Stock.objects.filter(status__in=("live", "partial")).order_by("expires_at"))
        linked = {
            item.stock_id: item
            for item in AiAnalysis.objects.filter(stock_id__in=[row.id for row in rows])
        }
        for stock in rows:
            analysis = linked.get(stock.id)
            sync_lot(stock, analysis=analysis)
            if stock.status not in ("live", "partial"):
                continue
            state = climate_state(stock, analysis=analysis)
            if state["channel"] != "classic":
                continue
            visible.append({
                "id": str(stock.id),
                "product": stock.product,
                "category": stock.category,
                "qty_initial": stock.qty_initial,
                "qty_available": stock.qty_available,
                "unit": stock.unit,
                "quarter": stock.quarter,
                "hours_left": float(stock.hours_left),
                "hours_ref": HOURS_REF.get(stock.category, 48),
                "market_price": stock.market_price,
                "published_price": state["published_price"],
                "expires_at": stock.expires_at.isoformat(),
                "adresse_collecte": stock.adresse_collecte,
                "image_url": stock.image_url or "",
                "status": stock.status,
                "freshness_now": state["freshness_now"],
                "channel": state["channel"],
                "weather": state["weather"],
            })
        return Response(visible)


class NearbyView(APIView):
    permission_classes = [IsBuyer]

    def get(self, request):
        release_expired()
        buyer = request.user
        radius = float(buyer.radius_km)
        visible = []
        candidates = list(Stock.objects.filter(status__in=("live", "partial")))
        linked = {
            item.stock_id: item
            for item in AiAnalysis.objects.filter(stock_id__in=[row.id for row in candidates])
        }
        now = timezone.now()
        for stock in candidates:
            analysis = linked.get(stock.id)
            sync_lot(stock, analysis=analysis)
            if stock.status not in ("live", "partial"):
                continue
            state = climate_state(stock, analysis=analysis)
            if state["channel"] == "rotten":
                continue
            distance = haversine_km(buyer.lat, buyer.lng, stock.lat, stock.lng)
            if distance > radius:
                continue
            hours_ref = HOURS_REF.get(stock.category, 48)
            score, phrase = score_offer(
                distance, radius, state["hours_effective"], hours_ref,
                stock.qty_available, buyer.buyer_type, stock.category,
            )
            if state["channel"] == "transform":
                score = min(1.0, score + 0.08)
            if stock.published_at and now < stock.published_at + timedelta(minutes=8):
                ranked = _top_buyers(stock, hours_ref)
                if str(buyer.id) not in ranked[:3]:
                    continue
                window = "pending_priority"
            else:
                window = "open"
            visible.append(stock_payload(stock, {
                "distance_km": round(distance, 2),
                "score": score,
                "phrase": phrase,
                "window": window,
            }, analysis=analysis, include_plan=False))
        visible.sort(key=lambda row: (0 if row.get("channel") == "transform" else 1, -row["score"]))
        return Response(visible)


def _top_buyers(stock, hours_ref):
    from accounts.models import Profile
    ranked = []
    for buyer in Profile.objects.filter(role="buyer", is_active=True):
        distance = haversine_km(buyer.lat, buyer.lng, stock.lat, stock.lng)
        if distance > float(buyer.radius_km):
            continue
        score, _ = score_offer(
            distance, float(buyer.radius_km), stock.hours_left, hours_ref,
            stock.qty_available, buyer.buyer_type, stock.category,
        )
        ranked.append((score, str(buyer.id)))
    ranked.sort(reverse=True)
    return [buyer_id for _, buyer_id in ranked]
