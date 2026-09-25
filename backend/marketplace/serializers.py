from django.utils import timezone
from rest_framework import serializers

from accounts.phone import local_display
from .matching import freshness_score, hours_left
from .models import BuyerAlert, Reservation, Stock


class StockSerializer(serializers.ModelSerializer):
    hours_left = serializers.SerializerMethodField()
    freshness = serializers.SerializerMethodField()
    maps_url = serializers.SerializerMethodField()
    maps_dir_url = serializers.SerializerMethodField()
    maps_embed_url = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="seller.profile.display_name", read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)
    match_score = serializers.FloatField(read_only=True, required=False)
    match_reason = serializers.CharField(read_only=True, required=False)
    vision = serializers.JSONField(source="freshness_analysis", read_only=True)
    image_url = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = (
            "id",
            "product_name",
            "category",
            "qty_initial",
            "qty_available",
            "unit",
            "quartier",
            "adresse_collecte",
            "description",
            "expires_at",
            "market_price",
            "published_price",
            "image_url",
            "status",
            "hours_left",
            "freshness",
            "maps_url",
            "maps_dir_url",
            "maps_embed_url",
            "seller_name",
            "distance_km",
            "match_score",
            "match_reason",
            "vision",
            "available",
            "created_at",
        )
        read_only_fields = ("qty_available", "status", "seller_name", "image_url", "available")

    def get_image_url(self, obj):
        url = (obj.image_url or "").strip()
        if not url:
            return ""
        if url.startswith("http://") or url.startswith("https://"):
            return url
        from django.conf import settings

        origin = getattr(settings, "BACKEND_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")
        if not url.startswith("/"):
            url = "/" + url
        return origin + url

    def get_available(self, obj):
        return (
            obj.qty_available > 0
            and obj.status in (Stock.Status.LIVE, Stock.Status.PARTIAL)
            and obj.expires_at > timezone.now()
        )

    def _hours(self, obj):
        return hours_left(obj.expires_at, timezone.now())

    def get_hours_left(self, obj):
        return round(self._hours(obj), 1)

    def get_freshness(self, obj):
        return freshness_score(self._hours(obj), obj.category)

    def get_maps_url(self, obj):
        return obj.maps_url()

    def get_maps_embed_url(self, obj):
        return obj.maps_embed_url()

    def get_maps_dir_url(self, obj):
        origin_lat = origin_lng = None
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)
            if profile and profile.lat is not None:
                origin_lat, origin_lng = profile.lat, profile.lng
        return obj.maps_dir_url(origin_lat, origin_lng)


class StockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = (
            "product_name",
            "category",
            "qty_initial",
            "unit",
            "quartier",
            "lat",
            "lng",
            "adresse_collecte",
            "description",
            "expires_at",
            "market_price",
            "published_price",
            "image_url",
            "freshness_analysis",
        )
        extra_kwargs = {
            "published_price": {"required": False},
            "freshness_analysis": {"required": False},
            "market_price": {"required": False},
            "image_url": {"required": False},
        }

    def validate_adresse_collecte(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse de collecte est obligatoire.")
        return value.strip()

    def validate_product_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom du produit est obligatoire.")
        return value.strip()

    def validate(self, data):
        from .matching import hours_left, suggest_listing
        from django.utils import timezone

        cat = data.get("category") or "autre"
        analysis = data.get("freshness_analysis") or {}
        if analysis.get("rotten") or (isinstance(analysis.get("vision"), dict) and analysis["vision"].get("rotten")):
            raise serializers.ValidationError("Lot classé pourri par le scan IA : publication refusée.")
        ripeness = analysis.get("ripeness", 3)
        hours = hours_left(data["expires_at"], timezone.now())
        hint = suggest_listing(cat, hours=hours, ripeness=ripeness)
        price = data.get("published_price") or data.get("market_price") or hint["suggested_price"]
        if price < hint["min_price"] or price > hint["max_price"]:
            raise serializers.ValidationError(
                f"Prix hors marge IA ({hint['min_price']}–{hint['max_price']} FCFA). "
                f"Proposition selon la maturité : {hint['suggested_price']} FCFA."
            )
        data["market_price"] = hint["suggested_price"]
        data["published_price"] = int(price)
        if data.get("qty_initial", 0) < 1:
            raise serializers.ValidationError("La quantité disponible est obligatoire.")
        return data


class ReservationSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    maps_url = serializers.SerializerMethodField()
    maps_dir_url = serializers.SerializerMethodField()
    maps_embed_url = serializers.SerializerMethodField()
    adresse_collecte = serializers.CharField(source="stock.adresse_collecte", read_only=True)
    buyer_name = serializers.SerializerMethodField()
    buyer_phone = serializers.SerializerMethodField()
    buyer_phone_display = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    seller_phone_display = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="stock.seller.profile.display_name", read_only=True)
    quartier = serializers.CharField(source="stock.quartier", read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id",
            "qty",
            "unit_price_snapshot",
            "amount_due",
            "status",
            "reserved_until",
            "match_score",
            "pickup_code",
            "created_at",
            "stock",
            "maps_url",
            "maps_dir_url",
            "maps_embed_url",
            "adresse_collecte",
            "quartier",
            "buyer_name",
            "buyer_phone",
            "buyer_phone_display",
            "seller_name",
            "seller_phone",
            "seller_phone_display",
        )

    def get_maps_url(self, obj):
        return obj.stock.maps_url()

    def get_maps_dir_url(self, obj):
        request = self.context.get("request")
        origin_lat = origin_lng = None
        if request and request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)
            if profile and profile.lat is not None:
                origin_lat, origin_lng = profile.lat, profile.lng
        return obj.stock.maps_dir_url(origin_lat, origin_lng)

    def get_maps_embed_url(self, obj):
        return obj.stock.maps_embed_url()

    def _contact_unlocked(self, obj):
        return obj.status == Reservation.Status.ACCEPTED

    def _seller_can_see_buyer(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.stock.seller_id == request.user.id and self._contact_unlocked(obj)

    def _buyer_can_see_seller(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.buyer_id == request.user.id and self._contact_unlocked(obj)

    def get_buyer_name(self, obj):
        request = self.context.get("request")
        if request and request.user.id in (obj.buyer_id, obj.stock.seller_id):
            return obj.buyer.profile.display_name
        return None

    def get_buyer_phone(self, obj):
        if not self._seller_can_see_buyer(obj):
            return None
        return obj.buyer.profile.phone

    def get_buyer_phone_display(self, obj):
        if not self._seller_can_see_buyer(obj):
            return None
        return local_display(obj.buyer.profile.phone)

    def get_seller_phone(self, obj):
        if not self._buyer_can_see_seller(obj):
            return None
        return obj.stock.seller.profile.phone

    def get_seller_phone_display(self, obj):
        if not self._buyer_can_see_seller(obj):
            return None
        return local_display(obj.stock.seller.profile.phone)


class BuyerAlertSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    reservation_id = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="stock.seller.profile.display_name", read_only=True)
    adresse_collecte = serializers.CharField(source="stock.adresse_collecte", read_only=True)
    quartier = serializers.CharField(source="stock.quartier", read_only=True)
    maps_url = serializers.SerializerMethodField()
    maps_dir_url = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    seller_phone_display = serializers.SerializerMethodField()

    class Meta:
        model = BuyerAlert
        fields = (
            "id",
            "kind",
            "score",
            "distance_km",
            "priority",
            "read",
            "created_at",
            "stock",
            "reservation_id",
            "seller_name",
            "adresse_collecte",
            "quartier",
            "maps_url",
            "maps_dir_url",
            "seller_phone",
            "seller_phone_display",
        )

    def get_reservation_id(self, obj):
        return str(obj.reservation_id) if obj.reservation_id else None

    def get_maps_url(self, obj):
        return obj.stock.maps_url()

    def get_maps_dir_url(self, obj):
        request = self.context.get("request")
        origin_lat = origin_lng = None
        if request and request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)
            if profile and profile.lat is not None:
                origin_lat, origin_lng = profile.lat, profile.lng
        return obj.stock.maps_dir_url(origin_lat, origin_lng)

    def get_seller_phone(self, obj):
        if obj.kind != BuyerAlert.Kind.ACCEPTED:
            return None
        return obj.stock.seller.profile.phone

    def get_seller_phone_display(self, obj):
        if obj.kind != BuyerAlert.Kind.ACCEPTED:
            return None
        return local_display(obj.stock.seller.profile.phone)
