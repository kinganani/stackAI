import uuid
from django.db import models


class Stock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("accounts.Profile", on_delete=models.CASCADE, db_column="seller_id")
    product = models.CharField(max_length=120)
    category = models.CharField(max_length=40)
    qty_initial = models.IntegerField()
    qty_available = models.IntegerField()
    unit = models.CharField(max_length=20)
    quarter = models.CharField(max_length=80)
    lat = models.FloatField()
    lng = models.FloatField()
    hours_left = models.DecimalField(max_digits=6, decimal_places=2)
    market_price = models.IntegerField()
    published_price = models.IntegerField()
    adresse_collecte = models.CharField(max_length=240)
    image_url = models.TextField(null=True, blank=True)
    image_public_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, default="live")
    published_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    promo_applied_at = models.DateTimeField(null=True, blank=True)
    promo_from_price = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stocks"
        managed = False


class AiAnalysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20)
    payload = models.JSONField()
    stock = models.ForeignKey(Stock, null=True, blank=True, on_delete=models.CASCADE, db_column="stock_id")
    seller = models.ForeignKey("accounts.Profile", null=True, blank=True, on_delete=models.CASCADE, db_column="seller_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_analyses"
        managed = False
