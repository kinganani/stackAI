import uuid
from django.db import models


class Reservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock = models.ForeignKey("stocks.Stock", on_delete=models.CASCADE, db_column="stock_id")
    buyer = models.ForeignKey("accounts.Profile", on_delete=models.CASCADE, db_column="buyer_id")
    qty = models.IntegerField()
    unit_price_snapshot = models.IntegerField()
    amount_due = models.IntegerField()
    status = models.CharField(max_length=24, default="pending_payment")
    reserved_until = models.DateTimeField()
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    pickup_address = models.CharField(max_length=240, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reservations"
        managed = False
