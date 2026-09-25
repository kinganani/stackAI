from django.contrib import admin
from .models import Reservation, Stock

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("product_name", "quartier", "qty_available", "status")

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("pickup_code", "stock", "qty", "status")
