"""Règles photo : fruits et légumes uniquement (filière agricole).

Version corrigée : logique par CANDIDATS (label, produce_type, score) au lieu
de deux dicts (votes / labels) mis à jour indépendamment — c'était la source
du bug "tomate jamais détectée" et "dernier if qui écrase le label".
"""

LABEL_FR = {
    "tomate": "Tomate (légume-fruit)",
    "legume": "Légume",
    "plantain": "Banane / plantain (fruit)",
    "mangue": "Mangue (fruit)",
    "fruit": "Fruit de saison",
}

CATEGORY_MAP = {k: k for k in LABEL_FR}

TYPE_OF = {
    "tomate": "legume",
    "legume": "legume",
    "plantain": "fruit",
    "mangue": "fruit",
    "fruit": "fruit",
}


def _f(metrics, key, default=0.0):
    return float(metrics.get(key) or default)


def looks_like_banana(metrics) -> bool:
    y = _f(metrics, "yellow_ratio")
    r = _f(metrics, "red_ratio")
    br = _f(metrics, "brown_ratio")
    mr, mg, mb = _f(metrics, "mean_r"), _f(metrics, "mean_g"), _f(metrics, "mean_b")
    if r >= y:
        return False
    if mr > mg + 22:
        return False
    if y >= 0.14 and mg >= mr * 0.78 and mb < min(mr, mg) * 0.72:
        return True
    if y >= 0.18 and br >= 0.06 and mb < mr * 0.7:
        return True
    return False


def looks_like_mangue(metrics) -> bool:
    """Mangue mûre : dominante jaune-orangé + un peu de rouge, peu de vert."""
    y = _f(metrics, "yellow_ratio")
    r = _f(metrics, "red_ratio")
    g = _f(metrics, "green_ratio")
    return y >= 0.20 and r >= 0.08 and g < 0.10 and y >= r


def photo_produce(metrics: dict) -> dict | None:
    y = _f(metrics, "yellow_ratio")
    g = _f(metrics, "green_ratio")
    r = _f(metrics, "red_ratio")

    # Chaque règle produit un candidat explicite (label + type + score).
    # On ne mélange plus deux structures : le score ET le label naissent
    # ensemble, et à la fin on prend juste le meilleur candidat.
    candidates: list[tuple[str, str, float]] = []  # (label, produce_type, score)

    if looks_like_mangue(metrics):
        candidates.append(("mangue", "fruit", 0.55))

    if looks_like_banana(metrics) and g < 0.12:
        candidates.append(("plantain", "fruit", 0.5))

    # Tomate : règle spécifique, DOIT primer sur "fruit rouge" générique
    # (avant : les deux se déclenchaient ensemble et "fruit" gagnait
    # toujours car son poids était plus haut, même quand la condition
    # tomate — plus stricte — était vraie).
    if r >= 0.22 and r >= y + 0.1 and g < 0.12:
        candidates.append(("tomate", "legume", 0.5))
    elif r >= 0.14 and r >= y:
        candidates.append(("fruit", "fruit", 0.4))

    if y >= 0.12 and g >= 0.12:
        candidates.append(("fruit", "fruit", 0.35))
    elif y >= 0.12:
        candidates.append(("fruit", "fruit", 0.3))

    if g >= 0.16 and y < 0.10 and r < 0.12:
        candidates.append(("legume", "legume", 0.45))

    if not candidates:
        return None

    label, produce_type, score = max(candidates, key=lambda c: c[2])
    if score < 0.28:
        return None

    return {
        "label": label,
        "produce_type": produce_type,
        "confidence": round(min(0.92, score), 3),
        "candidates": candidates,  # utile pour debug/logs
    }


def photo_rot_proba(metrics: dict, produce_type: str | None = None) -> float:
    y = _f(metrics, "yellow_ratio")
    br = _f(metrics, "brown_ratio")
    dark = _f(metrics, "dark_ratio")
    g = _f(metrics, "green_ratio")
    mold = _f(metrics, "mold_ratio")

    is_banana_like = produce_type == "fruit" and looks_like_banana(metrics)

    if is_banana_like:
        # Le brun est NORMAL sur une banane/plantain mûr (mûrissement),
        # seulement suspect s'il devient dominant ET que la surface fonce
        # vraiment (dark_ratio) — pas juste tacheté.
        proba = br * 0.7 + dark * 1.6 + mold * 1.3
    elif produce_type == "legume":
        proba = br * 1.8 + dark * 1.4 + mold * 1.1
    else:
        proba = br * 1.5 + dark * 1.1 + mold * 1.2

    if mold >= 0.035:
        proba = max(proba, min(0.95, 0.7 + mold))

    if br >= 0.25 and br >= y and br >= g and not is_banana_like:
        proba = max(proba, min(0.9, 0.48 + br))

    return round(min(0.99, max(0.01, proba)), 3)