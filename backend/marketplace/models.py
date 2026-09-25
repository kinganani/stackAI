import uuid

from django.conf import settings
from django.db import models


class Stock(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        LIVE = "live"
        PARTIAL = "partial"
        EXHAUSTED = "exhausted"
        EXPIRED = "expired"
        CANCELLED = "cancelled"

    class Category(models.TextChoices):
        TOMATE = "tomate", "Tomates"
        PLANTAIN = "plantain", "Plantains"
        MANGUE = "mangue", "Mangues"
        LEGUME = "legume", "Légumes"
        FRUIT = "fruit", "Fruits"
        AUTRE = "autre", "Autre"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stocks")
    product_name = models.CharField(max_length=160)
    category = models.CharField(max_length=24, choices=Category.choices, default=Category.AUTRE, db_index=True)
    qty_initial = models.PositiveIntegerField()
    qty_available = models.PositiveIntegerField()
    unit = models.CharField(max_length=32, default="kg")
    quartier = models.CharField(max_length=80, db_index=True)
    lat = models.FloatField()
    lng = models.FloatField()
    adresse_collecte = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    expires_at = models.DateTimeField(db_index=True)
    market_price = models.PositiveIntegerField(help_text="FCFA / unité")
    published_price = models.PositiveIntegerField()
    image_url = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.LIVE, db_index=True)
    freshness_analysis = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["expires_at"]
        constraints = [
            # Empêche qty_available > qty_initial ou négatif au niveau DB,
            # même si deux requêtes concurrentes contournent la logique applicative.
            models.CheckConstraint(
                check=models.Q(qty_available__lte=models.F("qty_initial")),
                name="stock_qty_available_lte_initial",
            ),
        ]

    def maps_url(self):
        return f"https://maps.google.com/?q={self.lat},{self.lng}"

    def maps_embed_url(self):
        return f"https://maps.google.com/maps?q={self.lat},{self.lng}&hl=fr&z=16&output=embed"

    def maps_dir_url(self, origin_lat=None, origin_lng=None):
        from urllib.parse import quote_plus

        dest = quote_plus(f"{self.adresse_collecte}, {self.quartier}, Lomé")
        if origin_lat is not None and origin_lng is not None:
            from .matching import haversine_km

            if haversine_km(origin_lat, origin_lng, self.lat, self.lng) >= 0.25:
                return (
                    "https://www.google.com/maps/dir/?api=1"
                    f"&origin={origin_lat},{origin_lng}&destination={dest}&travelmode=driving"
                )
        return f"https://www.google.com/maps/dir/?api=1&destination={dest}&travelmode=driving"


class Reservation(models.Model):
    class Status(models.TextChoices):
        PENDING_SELLER = "pending_seller"
        PENDING_PRIORITY = "pending_priority"
        PENDING_PAYMENT = "pending_payment"
        ACCEPTED = "accepted"
        EXPIRED = "expired"
        CANCELLED = "cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="reservations")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    qty = models.PositiveIntegerField()
    unit_price_snapshot = models.PositiveIntegerField()
    amount_due = models.PositiveIntegerField()
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_SELLER, db_index=True)
    reserved_until = models.DateTimeField()
    match_score = models.FloatField()
    pickup_code = models.CharField(max_length=12)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Un seul acheteur ne peut avoir qu'une réservation active (pending)
            # à la fois sur un même lot — évite les doublons par double-clic
            # ou requêtes concurrentes.
            models.UniqueConstraint(
                fields=["stock", "buyer"],
                condition=models.Q(
                    status__in=["pending_seller", "pending_priority", "pending_payment"]
                ),
                name="unique_active_reservation_per_buyer_stock",
            ),
        ]

    def save(self, *args, **kwargs):
        # Garantit que amount_due reste cohérent avec qty * unit_price_snapshot,
        # même si l'appelant oublie de le recalculer avant de sauvegarder.
        self.amount_due = self.qty * self.unit_price_snapshot
        super().save(*args, **kwargs)


class BuyerAlert(models.Model):
    class Kind(models.TextChoices):
        MATCH = "match", "Nouveau lot"
        ACCEPTED = "accepted", "Commande acceptée"

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alerts")
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="alerts")
    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="alerts", null=True, blank=True
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.MATCH)
    score = models.FloatField()
    distance_km = models.FloatField()
    priority = models.BooleanField(default=False)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("buyer", "stock", "kind")