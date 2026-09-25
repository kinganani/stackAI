from django.conf import settings
from django.db import models


class Profile(models.Model):
    class Role(models.TextChoices):
        SELLER = "seller", "Vendeur"
        BUYER = "buyer", "Acheteur"

    class BuyerType(models.TextChoices):
        RESTAURANT = "restaurant", "Restaurateur / Maquis"
        PROCESSOR = "processor", "Transformateur"
        HOUSEHOLD = "household", "Famille"
        CANTEEN = "canteen", "Cantine"
        OTHER = "other", "Autre"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=16, choices=Role.choices)
    display_name = models.CharField(max_length=120)
    quartier = models.CharField(max_length=80, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    radius_km = models.FloatField(default=5)
    buyer_type = models.CharField(max_length=24, choices=BuyerType.choices, blank=True)
    momo_alias = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=16, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.display_name} ({self.role})"
