import math


def haversine_km(lat1, lng1, lat2, lng2):
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


# Paliers sur la durée de référence de la catégorie.
# Au-dessus de 75 % : prix du producteur. Puis 85 %, 70 %, 50 %.
PRICE_STEPS = (
    (0.75, 1.00, "Encore large"),
    (0.50, 0.85, "À surveiller"),
    (0.25, 0.70, "Proche de la limite"),
    (0.00, 0.50, "Dernières heures"),
)


def price_ratio(hours_left, hours_ref):
    if hours_ref <= 0:
        return 0.50
    fraction = float(hours_left) / float(hours_ref)
    for threshold, ratio, _label in PRICE_STEPS:
        if fraction >= threshold:
            return ratio
    return 0.50


def stepped_price(market_price, hours_left, hours_ref):
    amount = int(round(int(market_price) * price_ratio(hours_left, hours_ref)))
    return max(amount, 1) if int(market_price) > 0 else 0


def price_bands(hours_ref):
    bands = []
    for threshold, ratio, label in PRICE_STEPS:
        bands.append({
            "min_hours": round(float(hours_ref) * threshold, 1),
            "ratio": ratio,
            "label": label,
        })
    return bands


def published_price(market_price, hours_left, hours_ref):
    return stepped_price(market_price, hours_left, hours_ref)


def score_offer(distance_km, radius_km, hours_left, hours_ref, qty_available, buyer_type, category):
    proximity = max(0.0, 1.0 - (distance_km / radius_km))
    urgency = max(0.0, 1.0 - min(1.0, float(hours_left) / hours_ref))
    qty_fit = 1.0 if qty_available > 0 else 0.0
    fit_map = {
        "cooperative": {"tomate", "banane", "autre"},
        "transformateur": {"tomate", "banane", "poisson", "autre"},
        "marche": {"tomate", "banane", "autre"},
        "menage": {"tomate", "banane"},
    }
    if not buyer_type:
        profile_fit = 1.0
    else:
        profile_fit = 1.0 if category in fit_map.get(buyer_type, set()) else 0.45
    score = 0.45 * proximity + 0.25 * urgency + 0.20 * qty_fit + 0.10 * profile_fit
    phrase = (
        f"{int(round(proximity * 100))} % de proximité, "
        f"{int(round(urgency * 100))} % d’urgence, "
        f"quantité {'adaptée' if qty_fit else 'épuisée'}, "
        f"profil {'aligné' if profile_fit >= 1 else 'partiel'}."
    )
    return round(score, 4), phrase
