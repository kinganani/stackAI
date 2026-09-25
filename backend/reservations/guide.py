import json
import urllib.error
import urllib.request

from django.conf import settings

MODES = {
    "driving": "voiture ou moto",
    "walking": "à pied",
    "bicycling": "vélo",
    "transit": "transport suivant les rues",
}


def _models():
    names = ["gemini-3.5-flash-lite", "gemini-3.5-flash", settings.GEMINI_MODEL]
    ordered = []
    for name in names:
        if name and name not in ordered:
            ordered.append(name)
    return ordered


def _point(value):
    if not isinstance(value, dict):
        return None
    try:
        lat = float(value.get("lat"))
        lng = float(value.get("lng"))
    except (TypeError, ValueError):
        return None
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        return None
    return lat, lng


def _steps(raw):
    if not isinstance(raw, list):
        return []
    rows = []
    for item in raw[:8]:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()[:160]
        if not text:
            continue
        try:
            meters = max(0, int(float(item.get("meters") or 0)))
        except (TypeError, ValueError):
            meters = 0
        rows.append(f"- {text} ({meters} m)")
    return rows


def guide_route(payload):
    origin = _point(payload.get("origin"))
    destination = _point(payload.get("destination"))
    steps = _steps(payload.get("steps"))
    mode = MODES.get(payload.get("mode"), "voiture ou moto")
    if origin is None or destination is None or not steps or not settings.GEMINI_API_KEY:
        return {"guidance": "", "next": ""}
    try:
        distance_m = max(0, int(float(payload.get("distance_m") or 0)))
    except (TypeError, ValueError):
        distance_m = 0
    prompt = (
        "Tu guides une collecte à Lomé. Tu ne connais que les données géographiques ci-dessous. "
        "N'invente aucune rue, aucun quartier et aucune distance.\n"
        f"Moyen : {mode}.\n"
        f"Départ : {origin[0]:.5f}, {origin[1]:.5f}.\n"
        f"Arrivée : {destination[0]:.5f}, {destination[1]:.5f}.\n"
        f"Longueur du tracé : {distance_m} m.\n"
        "Étapes du tracé :\n"
        + "\n".join(steps)
        + '\nRéponds uniquement en JSON : {"guidance":"une phrase utile pour la suite du trajet","next":"la prochaine action, courte"}'
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }).encode()
    headers = {"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY}
    for model in _models():
        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=body,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                data = json.loads(response.read().decode())
            text = _candidate_text(data)
            parsed = json.loads(text) if text else {}
            guidance = str(parsed.get("guidance") or "").strip()[:240]
            nxt = str(parsed.get("next") or "").strip()[:120]
            return {"guidance": guidance, "next": nxt}
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, TypeError):
            continue
    return {"guidance": "", "next": ""}


def _candidate_text(data):
    chunks = []
    for candidate in data.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if part.get("text"):
                chunks.append(part["text"])
    return "".join(chunks).strip()
