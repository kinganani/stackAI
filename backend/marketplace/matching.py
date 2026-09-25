from math import asin, ceil, cos, floor, radians, sin, sqrt

HOURS_REF = {
    "tomate": 72,
    "plantain": 96,
    "mangue": 72,
    "fruit": 72,
    "legume": 48,
    "autre": 48,
}

HOURS_MAX = dict(HOURS_REF)

REF_PRICE = {
    "tomate": 350,
    "plantain": 400,
    "mangue": 500,
    "fruit": 500,
    "legume": 300,
    "autre": 400,
}


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * asin(sqrt(a))


def hours_left(expires_at, now):
    delta = (expires_at - now).total_seconds() / 3600
    return max(0.0, delta)


def bound_hours(hours, category):
    cap = HOURS_MAX.get(category, 48)
    return round(clamp(float(hours), 1.0, cap), 1)


def freshness_score(hours, category):
    ref = HOURS_REF.get(category, 48)
    return int(max(0, min(100, round(100 * min(hours / ref, 1)))))


QUALITY_BY_RIPENESS = {
    1: ("Peu mûr / encore ferme", 0.88),
    2: ("Frais", 0.96),
    3: ("Bonne qualité, mûr à point", 1.0),
    4: ("Très mûr — à écouler vite", 0.72),
    5: ("Qualité basse — risque de perte", 0.50),
}

PRICE_MARGIN = 0.20


def degressive_price(market_price, hours, category):
    ref = HOURS_REF.get(category, 48)
    factor = clamp(hours / max(ref, 0.1), 0.35, 1.0)
    return int(round(int(market_price) * factor)), round(factor, 3)


def price_from_maturity(category, ripeness=3):
    """Prix IA selon la fraîcheur / maturité, interpolé (pas un palier figé)."""
    try:
        r = float(ripeness)
    except (TypeError, ValueError):
        r = 3.0
    r = clamp(r, 1.0, 5.0)
    lo = int(floor(r))
    hi = int(ceil(r))
    lo = int(clamp(lo, 1, 5))
    hi = int(clamp(hi, 1, 5))
    label_lo, f_lo = QUALITY_BY_RIPENESS[lo]
    _, f_hi = QUALITY_BY_RIPENESS[hi]
    t = 0 if lo == hi else r - lo
    factor = f_lo + (f_hi - f_lo) * t
    label = label_lo if t < 0.5 else QUALITY_BY_RIPENESS[hi][0]
    ref = REF_PRICE.get(category, 400)
    suggested = int(round(ref * factor / 10.0) * 10)
    min_price = int(round(suggested * (1 - PRICE_MARGIN)))
    max_price = int(round(suggested * (1 + PRICE_MARGIN)))
    return {
        "ripeness": round(r, 2),
        "quality_label": label,
        "quality_factor": round(factor, 3),
        "ref_price": ref,
        "suggested_price": suggested,
        "min_price": max(1, min_price),
        "max_price": max_price,
    }


def suggest_listing(category, qty=1, hours=None, ripeness=3):
    band = price_from_maturity(category, ripeness)
    h = bound_hours(hours if hours is not None else HOURS_REF.get(category, 48), category)
    return {
        "conservation_hours": h,
        "market_price": band["suggested_price"],
        "suggested_price": band["suggested_price"],
        "published_price": band["suggested_price"],
        "min_price": band["min_price"],
        "max_price": band["max_price"],
        "quality_label": band["quality_label"],
        "quality_factor": band["quality_factor"],
        "ref_price": band["ref_price"],
        "note": (
            f"{band['quality_label']} : l’IA propose {band['suggested_price']} FCFA / unité. "
            f"Vous pouvez ajuster entre {band['min_price']} et {band['max_price']} FCFA."
        ),
    }


def match_score(*, distance_km, radius_km, hours, category, qty_available, buyer_type):
    prox = 1 - min(distance_km / max(radius_km, 0.1), 1)
    ref = HOURS_REF.get(category, 48)
    urgency = 1 - min(hours / ref, 1)
    qty_fit = 1.0 if 5 <= qty_available <= 200 else 0.6
    profile = {
        "restaurant": 1.0 if qty_available >= 10 else 0.5,
        "processor": 1.0 if qty_available >= 20 else 0.6,
        "household": 1.0 if qty_available <= 40 else 0.5,
        "canteen": 0.9,
        "family": 1.0 if qty_available <= 40 else 0.5,
        "other": 0.7,
    }.get(buyer_type or "other", 0.7)
    return round(0.45 * prox + 0.25 * urgency + 0.20 * qty_fit + 0.10 * profile, 3)


def match_reason(score, distance_km, hours):
    bits = [f"{distance_km:.1f} km"]
    if hours < 8:
        bits.append("très urgent")
    elif hours < 18:
        bits.append("fenêtre courte")
    bits.append(f"score {int(score * 100)}")
    return " · ".join(bits)
