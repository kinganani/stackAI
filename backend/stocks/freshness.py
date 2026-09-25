from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from accounts.quarters import HOURS_REF

from .climate import lome_weather
from .matching import stepped_price


def remaining_hours(stock, now=None):
    now = now or timezone.now()
    seconds = (stock.expires_at - now).total_seconds()
    if seconds <= 0:
        return Decimal("0")
    return Decimal(str(seconds / 3600)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def climate_state(stock, analysis=None, weather=None):
    weather = weather or lome_weather()
    clock = float(remaining_hours(stock))
    stress = float(weather.get("stress") or 1.0)
    effective = clock / stress if stress else clock
    found = (analysis.payload if analysis is not None else None) or {}
    quality = found.get("quality_percent")
    try:
        quality = float(quality) if quality is not None else 75.0
    except (TypeError, ValueError):
        quality = 75.0
    start = (stock.expires_at - stock.published_at).total_seconds() / 3600 if stock.published_at else float(HOURS_REF.get(stock.category, 48))
    start = max(start, 1.0)
    freshness = max(0, min(100, round(quality * effective / start)))
    rotten = freshness < 8
    salvage = (not rotten) and (freshness < 30 or effective <= 2 or clock <= 2)
    hours_ref = HOURS_REF.get(stock.category, 48)
    price = stepped_price(stock.market_price, effective, hours_ref) if stock.market_price else stock.published_price
    if salvage and price:
        price = max(1, int(round(price * 0.70)))
    return {
        "hours_left": round(clock, 2),
        "hours_effective": round(effective, 2),
        "freshness_now": freshness,
        "channel": "rotten" if rotten else ("transform" if salvage else "classic"),
        "published_price": price,
        "weather": weather,
    }


def sync_lot(stock, analysis=None):
    """Aligne heures, prix météo et fil (classique / transformateurs)."""
    if stock.status not in ("live", "partial"):
        return stock
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
