"""Classifieur entraîné : fruit / légume — rechargé à chaque nouveau modèle."""

from __future__ import annotations

import json
import math
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "ml" / "produce_detector.json"

from .photo_rules import CATEGORY_MAP, LABEL_FR, TYPE_OF, photo_produce

_bundle = None
_mtime = None


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


def _z(vec, mean, std):
    out = []
    for i, x in enumerate(vec):
        s = std[i] if std[i] else 1.0
        out.append((x - mean[i]) / s)
    return out


def predict_produce(metrics: dict) -> dict:
    from .vision import features_vector

    vec = features_vector(metrics)
    bundle = _load()
    photo = photo_produce(metrics)
    if not bundle:
        if photo:
            return {
                "label": photo["label"],
                "label_fr": LABEL_FR.get(photo["label"], photo["label"]),
                "produce_type": photo["produce_type"],
                "category": CATEGORY_MAP.get(photo["label"], "autre"),
                "confidence": photo["confidence"],
                "scores": {},
                "type_scores": photo.get("votes") or {},
                "trained": False,
            }
        return {
            "label": "inconnu",
            "label_fr": "Non identifié",
            "produce_type": "inconnu",
            "category": "autre",
            "confidence": 0.0,
            "scores": {},
            "type_scores": {},
            "trained": False,
        }
    mean, std = bundle["mean"], bundle["std"]
    zvec = _z(vec, mean, std)
    scores = {}
    for clf in bundle["classifiers"]:
        if clf.get("label") == "poisson":
            continue
        z = clf["bias"] + sum(clf["weights"][j] * zvec[j] for j in range(len(zvec)))
        scores[clf["label"]] = sigmoid(z)
    type_scores = {"fruit": 0.0, "legume": 0.0}
    tmean = bundle.get("type_mean") or mean
    tstd = bundle.get("type_std") or std
    for clf in bundle.get("type_classifiers") or []:
        if clf.get("label") not in type_scores:
            continue
        zm = clf.get("mean") or tmean
        zs = clf.get("std") or tstd
        zv = _z(vec, zm, zs)
        z = clf["bias"] + sum(clf["weights"][j] * zv[j] for j in range(len(zv)))
        type_scores[clf["label"]] = sigmoid(z)
    if photo:
        t = photo["produce_type"]
        if t in type_scores:
            type_scores[t] = 0.55 * type_scores[t] + 0.45 * photo["confidence"]
    produce_type = max(type_scores, key=type_scores.get) if any(type_scores.values()) else "inconnu"
    type_conf = type_scores.get(produce_type, 0)
    candidates = {k: v for k, v in scores.items() if TYPE_OF.get(k) == produce_type} or scores
    best = max(candidates, key=candidates.get) if candidates else "autre"
    if photo and TYPE_OF.get(photo["label"]) == produce_type:
        best = photo["label"]
    conf = min(1.0, 0.5 * type_conf + 0.5 * candidates.get(best, 0.4))
    return {
        "label": best,
        "label_fr": LABEL_FR.get(best, best),
        "produce_type": produce_type,
        "category": CATEGORY_MAP.get(best, "autre"),
        "confidence": round(conf, 3),
        "scores": {k: round(v, 3) for k, v in scores.items()},
        "type_scores": {k: round(v, 3) for k, v in type_scores.items()},
        "trained": True,
    }
