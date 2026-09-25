"""Détecteur pourri / sain : fruits et légumes."""

from __future__ import annotations

import json
import math
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "ml" / "rot_detector.json"

_bundle = None
_mtime = None

from .photo_rules import photo_rot_proba


def sigmoid(z: float) -> float:
    z = max(-40.0, min(40.0, z))
    return 1.0 / (1.0 + math.exp(-z))


def _load():
    global _bundle, _mtime
    if not MODEL_PATH.exists():
        _bundle = False
        _mtime = None
        return False
    mt = MODEL_PATH.stat().st_mtime
    if _bundle and _mtime == mt:
        return _bundle
    _bundle = json.loads(MODEL_PATH.read_text())
    _mtime = mt
    return _bundle


def _score(vec, clf, thresh):
    mean, std = clf["mean"], clf["std"]
    z = clf["bias"]
    for i, x in enumerate(vec):
        s = std[i] if std[i] else 1.0
        z += clf["weights"][i] * ((x - mean[i]) / s)
    proba = sigmoid(z)
    return proba, proba >= thresh


def predict_rot(metrics: dict, produce_type: str | None = None) -> dict:
    from .vision import features_vector

    vec = features_vector(metrics)
    bundle = _load()
    ptype = produce_type if produce_type in ("fruit", "legume") else None
    type_fr = {"fruit": "fruit", "legume": "légume"}.get(ptype or "", "lot")
    photo_p = photo_rot_proba(metrics, ptype)
    ml_p = None
    used = "photo-rot"
    if bundle:
        thresh = float(bundle.get("threshold") or 0.5)
        clf = None
        if ptype and isinstance(bundle.get("by_type"), dict):
            clf = bundle["by_type"].get(ptype)
        used = "logreg-rot-type" if clf else "logreg-rot-v2"
        if not clf:
            clf = bundle
        ml_p, _rotten = _score(vec, clf, thresh)
        if ptype and bundle is not clf:
            gproba, _g = _score(vec, bundle, thresh)
            ml_p = max(ml_p, gproba)
    if ml_p is None:
        proba = photo_p
        used = "photo-rot"
    else:
        proba = 0.55 * ml_p + 0.45 * photo_p
        used = "live-logreg+photo"
    mold = float((metrics or {}).get("mold_ratio") or 0)
    if mold >= 0.035:
        proba = max(proba, min(0.97, 0.72 + mold))
        used = "mold-contact"
    rotten = proba >= 0.5
    label = "pourri" if rotten else "sain"
    return {
        "rotten": rotten,
        "rotten_proba": round(min(0.99, proba), 3),
        "label": label,
        "model": used,
        "trained": bool(bundle),
        "produce_type": ptype,
        "verdict": f"Ce {type_fr} est pourri" if rotten else f"Ce {type_fr} est sain",
    }
