"""Scan IA — vision par ordinateur (couleurs, texture, défauts) pour maturité / fraîcheur."""

from __future__ import annotations

import base64
import colorsys
import io
import uuid
import statistics

from .matching import HOURS_REF, bound_hours, price_from_maturity, suggest_listing

RIPENESS_LABELS = {
    1: "très vert / très ferme",
    2: "peu mûr",
    3: "mûr à point",
    4: "bien mûr, à écouler vite",
    5: "surmaturité / risque de perte",
}


def _decode_image(image_base64: str):
    raw = (image_base64 or "").strip()
    if not raw:
        return None
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        data = base64.b64decode(raw)
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img.thumbnail((320, 320))
        return img
    except Exception:
        return None


def _pixel_flags(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360
    red = s > 0.22 and v > 0.18 and (hue < 28 or hue >= 345)
    yellow = s > 0.16 and 38 <= hue < 75 and v > 0.38
    green = s > 0.18 and 78 <= hue < 165 and v > 0.18
    brown = s > 0.18 and 10 <= hue < 40 and v < 0.60
    dark = v < 0.20
    backdrop = v > 0.93 and s < 0.10
    chroma = max(r, g, b) - min(r, g, b)
    mold = False
    return h, s, v, red, yellow, green, brown, dark, mold, backdrop


def _pixel_kind(r, g, b):
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    _h, s, v = colorsys.rgb_to_hsv(rf, gf, bf)
    chroma = max(rf, gf, bf) - min(rf, gf, bf)
    if v > 0.91 and s < 0.12:
        return "bg"
    if s >= 0.28 and v > 0.18:
        return "fruit"
    if chroma < 0.18 and s < 0.30 and 0.36 <= v <= 0.91:
        return "fluff"
    return "other"


def _contact_mold_ratio(img) -> float:
    """Duvet gris collé à la denrée (ignore le fond blanc du studio)."""
    small = img.copy()
    small.thumbnail((96, 96))
    w, h = small.size
    kinds = [_pixel_kind(*p[:3]) for p in small.getdata()]
    mold = 0
    fruit_n = 0
    for i, k in enumerate(kinds):
        if k == "fruit":
            fruit_n += 1
            continue
        if k != "fluff":
            continue
        x, y = i % w, i // w
        fruit_nb = bg_nb = 0
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                kk = kinds[ny * w + nx]
                if kk == "fruit":
                    fruit_nb += 1
                elif kk == "bg":
                    bg_nb += 1
        if fruit_nb >= 4 and fruit_nb >= bg_nb:
            mold += 1
    return mold / max(fruit_n + mold, 1)


def _stats_from_rgb(pixels):
    n = max(len(pixels), 1)
    rs = [p[0] / 255 for p in pixels]
    gs = [p[1] / 255 for p in pixels]
    bs = [p[2] / 255 for p in pixels]
    mean_r, mean_g, mean_b = sum(rs) / n, sum(gs) / n, sum(bs) / n
    brightness = [(r + g + b) / 3 for r, g, b in zip(rs, gs, bs)]
    mean_v = sum(brightness) / n
    contrast = statistics.pstdev(brightness) if n > 1 else 0.0
    sats = []
    red_px = yellow_px = green_px = brown_px = dark_px = mold_px = 0
    for r, g, b in zip(rs, gs, bs):
        _h, s, v, red, yellow, green, brown, dark, mold, backdrop = _pixel_flags(r, g, b)
        sats.append(s)
        if backdrop:
            continue
        if mold:
            mold_px += 1
        elif dark:
            dark_px += 1
        elif brown:
            brown_px += 1
        elif yellow:
            yellow_px += 1
        elif red:
            red_px += 1
        elif green:
            green_px += 1
    return {
        "mean_r": round(mean_r * 255, 1),
        "mean_g": round(mean_g * 255, 1),
        "mean_b": round(mean_b * 255, 1),
        "brightness": round(mean_v, 3),
        "contrast": round(contrast, 3),
        "saturation": round(sum(sats) / n, 3),
        "red_ratio": round(red_px / n, 3),
        "yellow_ratio": round(yellow_px / n, 3),
        "green_ratio": round(green_px / n, 3),
        "brown_ratio": round(brown_px / n, 3),
        "dark_ratio": round(dark_px / n, 3),
        "mold_ratio": round(mold_px / n, 3),
        "pixels": n,
    }


def _extract_features(img) -> dict:
    pixels = list(img.getdata())
    subject = []
    for p in pixels:
        r, g, b = p[0] / 255, p[1] / 255, p[2] / 255
        _h, s, v, red, yellow, green, brown, dark, mold, backdrop = _pixel_flags(r, g, b)
        if backdrop:
            continue
        subject.append(p)
    use = subject if len(subject) >= max(80, int(0.05 * len(pixels))) else pixels
    metrics = _stats_from_rgb(use)
    metrics["size"] = list(img.size)
    metrics["subject_ratio"] = round(len(subject) / max(len(pixels), 1), 3)
    contact = _contact_mold_ratio(img)
    metrics["mold_ratio"] = round(contact, 3)
    metrics["mold_contact"] = round(contact, 3)
    return metrics


FEATURE_KEYS = (
    "mean_r",
    "mean_g",
    "mean_b",
    "brightness",
    "contrast",
    "saturation",
    "red_ratio",
    "yellow_ratio",
    "green_ratio",
    "brown_ratio",
    "dark_ratio",
)


def features_vector(metrics: dict) -> list[float]:
    return [float(metrics.get(k, 0) or 0) for k in FEATURE_KEYS]


def _score_ripeness(category: str, f: dict) -> tuple[float, list[str]]:
    notes = []
    live = (
        1.2
        + 2.3 * f["brown_ratio"]
        + 2.0 * f["dark_ratio"]
        + 1.2 * f["yellow_ratio"]
        + 0.9 * f["red_ratio"]
        - 1.0 * f["green_ratio"]
    )
    notes.append(
        f"Photo : R{f['mean_r']:.0f} G{f['mean_g']:.0f} B{f['mean_b']:.0f} · "
        f"jaune {f['yellow_ratio']*100:.0f}% · brun {f['brown_ratio']*100:.0f}% · "
        f"vert {f['green_ratio']*100:.0f}% · sombre {f['dark_ratio']*100:.0f}%"
    )
    prior = live
    if category == "tomate":
        prior = 1.2 + 3.6 * f["red_ratio"] - 2.2 * f["green_ratio"] + 2.4 * f["brown_ratio"] + 1.5 * f["dark_ratio"]
    elif category == "plantain":
        prior = 1.1 + 3.4 * f["yellow_ratio"] + 2.8 * f["brown_ratio"] + 1.6 * f["dark_ratio"] - 1.8 * f["green_ratio"]
    elif category in ("mangue", "fruit"):
        prior = 1.15 + 2.8 * f["yellow_ratio"] + 1.6 * f["red_ratio"] + 2.2 * f["brown_ratio"] - 1.5 * f["green_ratio"]
    elif category == "legume":
        prior = 1.4 + 2.0 * f["brown_ratio"] + 1.8 * f["yellow_ratio"] + 1.2 * f["dark_ratio"] - 0.6 * f["green_ratio"]
    raw = 0.65 * live + 0.35 * prior
    if f["contrast"] < 0.06:
        notes.append("Image peu contrastée : confiance réduite.")
        raw = 0.75 * raw + 0.25 * 3
    ripeness = max(1.0, min(5.0, raw))
    return ripeness, notes


def hours_from_ripeness(category: str, ripeness: float) -> float:
    ref = HOURS_REF.get(category, 48)
    t = (ripeness - 1) / 4
    factor = 0.95 - t * 0.80
    return bound_hours(ref * factor, category)


def _confidence(f: dict, photo_ok: bool) -> float:
    if not photo_ok:
        return 0.25
    c = 0.55 + min(0.25, f["contrast"] * 1.8) + min(0.15, f["saturation"] * 0.4)
    if f["pixels"] < 4000:
        c -= 0.12
    return round(max(0.2, min(0.93, c)), 2)


def analyze_lot(*, category: str, qty: int = 1, image_base64: str | None = None, hours_override=None):
    category = category or "autre"
    vision = {
        "engine": "cv-localmatch-v2",
        "product_guess": category,
        "ripeness": 3.0,
        "confidence": 0.25,
        "defects": [],
        "rationale": "Aucune photo : le scan IA ne peut pas estimer la maturité.",
        "photo_used": False,
        "metrics": {},
    }
    if image_base64:
        img = _decode_image(image_base64)
        if img is None:
            vision["rationale"] = "Photo illisible. Reprenez le cliché (lumière du jour, lot net)."
            vision["engine"] = "cv-echec"
        else:
            metrics = _extract_features(img)
            from .produce_detect import predict_produce
            from .rot_detect import predict_rot

            produce = predict_produce(metrics)
            user_type = {
                "tomate": "legume",
                "legume": "legume",
                "plantain": "fruit",
                "mangue": "fruit",
                "fruit": "fruit",
            }.get(category)
            if produce.get("trained") and produce.get("confidence", 0) >= 0.45:
                category = produce["category"]
            elif produce.get("produce_type") in ("fruit", "legume"):
                category = produce.get("category") or category
            rot = predict_rot(metrics, produce.get("produce_type") or user_type)
            ripeness, notes = _score_ripeness(category, metrics)
            type_fr = {"fruit": "fruit", "legume": "légume"}.get(
                produce.get("produce_type"), "lot"
            )
            name = produce.get("label_fr") or type_fr
            if produce.get("trained") or produce.get("confidence"):
                notes = [
                    f"Identifié : {name} · {type_fr} ({int((produce.get('confidence') or 0) * 100)} %)"
                ] + notes
            defects = []
            rot_p = float(rot["rotten_proba"] or 0)
            ripeness = max(1.0, min(5.0, ripeness + 1.8 * rot_p))
            if rot["rotten"]:
                defects.append(f"{type_fr} pourri")
                notes = [f"{rot.get('verdict')} ({name}) · {int(rot_p*100)} %"] + notes
            elif rot_p >= 0.35:
                defects.append("début de dégradation possible")
                notes = [f"Risque de pourriture : {int(rot_p*100)} %"] + notes
            else:
                notes = [f"{rot.get('verdict')} ({name}) · {int((1-rot_p)*100)} % sain"] + notes
            if metrics.get("mold_ratio", 0) > 0.05:
                defects.append("moisissure")
            if metrics["brown_ratio"] > 0.18:
                defects.append("brunissement")
            if metrics["contrast"] < 0.05:
                defects.append("flou ou contre-jour")
            risk = "high" if rot["rotten"] else "medium" if rot["rotten_proba"] >= 0.35 or ripeness >= 3.6 else "low"
            vision.update(
                {
                    "ripeness": round(ripeness, 2),
                    "ripeness_label": RIPENESS_LABELS[int(round(min(5, ripeness)))],
                    "rationale": " · ".join(notes),
                    "confidence": max(_confidence(metrics, True), rot["rotten_proba"] if rot["rotten"] else _confidence(metrics, True)),
                    "photo_used": True,
                    "engine": rot["model"],
                    "scan_id": str(uuid.uuid4()),
                    "metrics": metrics,
                    "defects": defects,
                    "spoilage_risk": risk,
                    "rotten": rot["rotten"],
                    "rotten_proba": rot["rotten_proba"],
                    "rotten_label": rot["label"],
                    "rot_trained": rot["trained"],
                    "verdict": rot.get("verdict")
                    or (f"Ce {type_fr} est pourri" if rot["rotten"] else f"Ce {type_fr} est sain"),
                    "product_guess": produce.get("label") or category,
                    "produce_type": produce.get("produce_type"),
                    "produce_label": produce.get("label_fr"),
                    "produce_confidence": produce.get("confidence"),
                    "category_guess": produce.get("category") or category,
                    "produce_trained": produce.get("trained"),
                }
            )

    if vision["photo_used"]:
        hours = hours_from_ripeness(category, vision["ripeness"])
    elif hours_override not in (None, ""):
        try:
            hours = bound_hours(hours_override, category)
        except (TypeError, ValueError):
            hours = HOURS_REF.get(category, 48)
    else:
        hours = HOURS_REF.get(category, 48)

    hours = bound_hours(hours, category)
    hint = suggest_listing(category, qty, hours=hours, ripeness=vision["ripeness"])
    hint["conservation_hours"] = hours
    hint["freshness"] = int(max(0, min(100, round(100 * (1.12 - 0.2 * float(vision["ripeness"]))))))
    hint["vision"] = vision
    hint["ripeness"] = vision["ripeness"]
    hint["ripeness_label"] = RIPENESS_LABELS[int(round(float(vision["ripeness"])))]
    hint["hours_left"] = hours
    hint["comment"] = f"{vision.get('rationale', '')} {hint.get('note', '')}".strip()
    hint["scan_ok"] = bool(vision.get("photo_used"))
    hint["rotten"] = bool(vision.get("rotten"))
    hint["rotten_label"] = vision.get("rotten_label") or "inconnu"
    hint["rotten_proba"] = vision.get("rotten_proba") or 0
    hint["category"] = category
    hint["category_guess"] = vision.get("category_guess") or category
    hint["produce_type"] = vision.get("produce_type") or "inconnu"
    hint["produce_label"] = vision.get("produce_label") or category
    hint["produce_confidence"] = vision.get("produce_confidence") or 0
    hint["scan_id"] = vision.get("scan_id") or str(uuid.uuid4())
    type_fr = {"fruit": "fruit", "legume": "légume"}.get(hint["produce_type"], "lot")
    name = hint["produce_label"]
    if hint["rotten"]:
        hint["verdict"] = vision.get("verdict") or f"Ce {type_fr} ({name}) est pourri"
    else:
        hint["verdict"] = vision.get("verdict") or f"Ce {type_fr} ({name}) est sain"
    if hint["rotten"] and name and name not in hint["verdict"]:
        hint["verdict"] = f"{hint['verdict']} ({name})"
    return hint
