from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from django.utils import timezone

from accounts.quarters import HOURS_REF

from .climate import lome_weather
from .matching import stepped_price

LOME = ZoneInfo("Africa/Lome")


def lome_now():
    return timezone.now().astimezone(LOME)


def remaining_hours(stock, now=None):
    now = now or timezone.now()
    seconds = (stock.expires_at - now).total_seconds()
    if seconds <= 0:
        return Decimal("0")
    return Decimal(str(seconds / 3600)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def window_hours(stock):
    """Durée estimée de CE lot à la photo : expires_at − published_at (pas la moyenne de catégorie)."""
    start = stock.published_at
    if start and stock.expires_at:
        hours = (stock.expires_at - start).total_seconds() / 3600
        if hours >= 1:
            return hours
    return float(HOURS_REF.get(stock.category, 48))


def format_span(hours):
    """≥ 24 h : jours de 24 h. En dessous : heures (puis minutes)."""
    hours = max(0.0, float(hours or 0))
    if hours <= 0:
        return "0 h"
    if hours >= 24:
        days = int(hours // 24)
        rest = hours - days * 24
        if rest >= 0.5:
            return f"{days} j {int(round(rest))} h"
        return f"{days} j"
    if hours >= 1:
        whole = int(hours)
        minutes = int(round((hours - whole) * 60))
        if minutes == 60:
            whole += 1
            minutes = 0
        if whole >= 24:
            return format_span(float(whole) + minutes / 60)
        if minutes:
            return f"{whole} h {minutes} min"
        return f"{whole} h"
    return f"{max(1, int(round(hours * 60)))} min"


def climate_state(stock, analysis=None, weather=None):
    weather = weather or lome_weather()
    clock = float(remaining_hours(stock))
    found = (analysis.payload if analysis is not None else None) or {}
    quality = found.get("quality_percent")
    try:
        quality = float(quality) if quality is not None else 75.0
    except (TypeError, ValueError):
        quality = 75.0
    start = window_hours(stock)
    freshness = max(0, min(100, round(quality * clock / start)))
    rotten = freshness < 8
    salvage = (not rotten) and (freshness < 30 or clock <= 2)
    price = stepped_price(stock.market_price, clock, start) if stock.market_price else stock.published_price
    if salvage and price:
        price = max(1, int(round(price * 0.70)))
    return {
        "hours_left": round(clock, 2),
        "hours_effective": round(clock, 2),
        "hours_window": round(start, 2),
        "freshness_now": freshness,
        "channel": "rotten" if rotten else ("transform" if salvage else "classic"),
        "published_price": price,
        "weather": weather,
        "remaining_label": format_span(clock),
        "window_label": format_span(start),
    }


def _restore_typical_window(stock, analysis=None):
    """Corrige les lots sains dont Gemini a collé l’exemple 24 h au lieu de la durée habituelle."""
    start = window_hours(stock)
    typical = float(HOURS_REF.get(stock.category, 48))
    if start >= typical * 0.85 or not stock.published_at:
        return
    found = (analysis.payload if analysis is not None else None) or {}
    try:
        quality = float(found.get("quality_percent") if found.get("quality_percent") is not None else 75)
    except (TypeError, ValueError):
        quality = 75.0
    spoilage = float(found.get("spoilage_percent") or 0)
    look = str(found.get("visual_freshness") or "").lower()
    advanced = any(word in look for word in ("avanc", "mûr", "mur", "faible", "critique", "pourri", "avari"))
    if quality < 70 or spoilage > 20 or advanced:
        return
    if start > 24.5:
        return
    stock.expires_at = stock.published_at + timedelta(hours=typical)
    stock.save(update_fields=["expires_at"])


def sync_lot(stock, analysis=None):
    """Aligne le reste réel (Lomé), le prix et le fil (classique / transformateurs)."""
    if stock.status not in ("live", "partial"):
        return stock
    _restore_typical_window(stock, analysis)
    now = timezone.now()
    remaining = remaining_hours(stock, now)
    if remaining <= 0 or stock.expires_at <= now:
        stock.hours_left = Decimal("0")
        stock.status = "expired"
        stock.save(update_fields=["hours_left", "status"])
        return stock
    state = climate_state(stock, analysis=analysis)
    hours = Decimal(str(state["hours_left"]))
    price = state["published_price"]
    if stock.hours_left != hours or stock.published_price != price:
        stock.hours_left = hours
        stock.published_price = price
        stock.save(update_fields=["hours_left", "published_price"])
    return stock
