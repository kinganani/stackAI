from accounts.quarters import HOURS_REF

from .freshness import format_span
from .matching import price_ratio, stepped_price

KEEP = {
    "tomate": {
        "ok": [
            "Garde les cageots à l’ombre, aérés, sans les empiler trop haut.",
            "Écarte déjà les fruits fendus pour qu’ils n’abîment pas le reste.",
        ],
        "surveiller": [
            "Trie ce matin : ce qui ramollit part en vente prioritaire.",
            "Évite l’eau stagnante. Un linge sec sous les cageots suffit à Lomé.",
        ],
        "urgent": [
            "Propose le lot aux maquis et transformateurs de sauce, pas seulement aux ménages.",
            "Sépare le trop mûr : il part aujourd’hui, le ferme tient encore.",
        ],
        "critique": [
            "Le délai visuel est presque fini : vends ou transforme dans la journée.",
            "Un coulis ou une sauce valorise encore le lot avant qu’il ne soit perdu.",
        ],
    },
    "poisson": {
        "ok": [
            "Garde le poisson à l’ombre, sur glace ou eau très froide, jamais au soleil.",
            "Vends le plus tôt possible : la fenêtre est courte à Lomé.",
        ],
        "surveiller": [
            "Renouvelle la glace. Le poisson qui ramollit part en premier.",
            "Évite de refermer un sac chaud : l’humidité accélère l’odeur.",
        ],
        "urgent": [
            "Vide le stock aujourd’hui. Cible les maquis et les friteries du quartier.",
            "Ne reclasse pas le poisson : baisse le prix et sors-le.",
        ],
        "critique": [
            "Plus que quelques heures : prix de sauvetage et vente immédiate.",
            "Ce qui n’est plus ferme ne se remet pas. Ne le laisse pas jusqu’au soir.",
        ],
    },
    "banane": {
        "ok": [
            "Sépare les régimes trop jaunes des encore verts.",
            "À l’ombre, sans les coincer : la chaleur de Lomé mûrit vite.",
        ],
        "surveiller": [
            "Les doigts tachés partent en aloco ou en pâte, pas en fruit de table.",
            "Aère les régimes. Un tas compact mûrit tout le lot d’un coup.",
        ],
        "urgent": [
            "Cible les friteries et les cantines : elles prennent le plantain mûr.",
            "Baisse le prix avant que les doigts noircissent.",
        ],
        "critique": [
            "Dernières heures : aloco, chips ou don, plutôt que de tout perdre.",
            "Sors le lot aujourd’hui, même en dessous du prix frais.",
        ],
    },
    "autre": {
        "ok": [
            "Ombre sèche, aération, tri des pièces abîmées.",
            "Garde le lot hors du soleil direct du marché.",
        ],
        "surveiller": [
            "Retire ce qui tache ou ramollit pour protéger le reste.",
            "Vends d’abord le plus avancé.",
        ],
        "urgent": [
            "Le délai se resserre : baisse le prix et vise les clients de volume.",
            "Ne remets pas le lot au lendemain si le produit est déjà mou.",
        ],
        "critique": [
            "Dernières heures avant perte : prix de sauvetage pour vider le stock.",
            "Transformateurs et maquis prennent encore ce que le ménage refuse.",
        ],
    },
}

BUYERS = {
    "ok": "Ménages et détaillants du quartier",
    "surveiller": "Détaillants et cantines, lot encore présentable",
    "urgent": "Maquis, cantines et transformateurs",
    "critique": "Transformateurs et ventes de volume, aujourd’hui",
}


def _level(hours, ref):
    if ref <= 0 or hours <= 0:
        return "critique"
    fraction = hours / ref
    if hours >= 24:
        if fraction < 0.25:
            return "critique"
        if fraction < 0.5:
            return "urgent"
        if fraction < 0.75:
            return "surveiller"
        return "ok"
    if hours <= 4 or fraction < 0.25:
        return "critique"
    if hours <= 8 or fraction < 0.5:
        return "urgent"
    if fraction < 0.75:
        return "surveiller"
    return "ok"


def _next_drop(hours, ref, market):
    if ref <= 0 or market < 1:
        return None
    fraction = hours / ref
    for threshold, ratio, label in (
        (0.75, 0.85, "À surveiller"),
        (0.50, 0.70, "Proche de la limite"),
        (0.25, 0.50, "Dernières heures"),
    ):
        if fraction > threshold:
            hours_at = round(ref * threshold, 1)
            wait = round(max(0.0, hours - hours_at), 1)
            return {
                "in_hours": wait,
                "in_label": format_span(wait),
                "at_hours": hours_at,
                "at_label": format_span(hours_at),
                "price": max(1, int(round(market * ratio))),
                "ratio": ratio,
                "label": label,
            }
    return None


def plan(hours_left, category, qty, market_price, spoilage=0, quality=None, unit="kg", window_hours=None, weather=None):
    hours = max(0.0, float(hours_left or 0))
    if window_hours is not None:
        ref = max(1.0, float(window_hours))
    else:
        ref = float(HOURS_REF.get(category, 48))
    market = max(0, int(market_price or 0))
    quantity = max(0, int(qty or 0))
    spoil = max(0.0, min(100.0, float(spoilage or 0)))
    level = _level(hours, ref)
    ratio = price_ratio(hours, ref)
    published = stepped_price(market, hours, ref) if market else 0
    extra = 0.0
    if level == "critique":
        extra = 0.20 if quantity >= 15 else 0.12
    elif level == "urgent":
        extra = 0.12 if quantity >= 20 else 0.08
    elif level == "surveiller" and quantity >= 40:
        extra = 0.05
    if spoil >= 30:
        extra = min(0.25, extra + 0.05)
    dump_price = published
    if extra and published:
        dump_price = max(1, int(round(published * (1 - extra))))
    dump_market = market
    if dump_price and ratio:
        dump_market = max(1, int(round(dump_price / ratio)))
    cut = 0
    if market and dump_price:
        cut = max(0, int(round((1 - dump_price / market) * 100)))
    gestures = list(KEEP.get(category, KEEP["autre"]).get(level, KEEP["autre"]["ok"]))
    if quality is not None and quality < 65:
        gestures.append("La photo a déjà montré un lot fragile : accélère la vente plutôt que de stocker.")
    temp = (weather or {}).get("temp_c")
    humidity = (weather or {}).get("humidity")
    if temp is not None and float(temp) >= 32:
        gestures.append("Chaleur actuelle à Lomé : le décompte suit l’heure réelle, mais sors le lot de plein soleil.")
    elif humidity is not None and float(humidity) >= 85:
        gestures.append("Air très humide : aère le lot, le délai affiché reste calé sur l’heure de Lomé.")
    mode = "décompte par jours de 24 h, heure de Lomé" if hours >= 24 else "décompte à l’heure, heure de Lomé"
    why = (
        f"{format_span(hours)} restantes sur {format_span(ref)} estimées à la photo ({mode})"
        f"{f', altération {spoil:.0f} %' if spoil else ''}."
    )
    return {
        "level": level,
        "hours_left": round(hours, 2),
        "hours_ref": round(ref, 2),
        "remaining_label": format_span(hours),
        "window_label": format_span(ref),
        "clock_mode": "day" if hours >= 24 else "hour",
        "keep": gestures,
        "why": why,
        "buyers": BUYERS[level],
        "current_price": published,
        "dump_price": dump_price,
        "dump_market_price": dump_market,
        "cut_percent": cut,
        "extra_cut": extra,
        "apply": dump_market != market and dump_price < published,
        "next_drop": _next_drop(hours, ref, market),
        "unit": unit or "kg",
    }
