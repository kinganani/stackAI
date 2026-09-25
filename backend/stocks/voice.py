import json
import urllib.error
import urllib.request

from django.conf import settings


def _models():
    names = ["gemini-3.5-flash-lite", "gemini-3.5-flash", settings.GEMINI_MODEL]
    ordered = []
    for name in names:
        if name and name not in ordered:
            ordered.append(name)
    return ordered


def extract_voice(transcript):
    text = str(transcript or "").strip()[:800]
    if len(text) < 4 or not settings.GEMINI_API_KEY:
        return {"product": "", "qty": None, "unit": "kg"}
    prompt = (
        "Déclaration vocale d'un producteur agricole à Lomé. "
        "Extrais uniquement ce qui est dit. N'invente pas.\n"
        f"Texte : {text}\n"
        'JSON : {"product":"nom du produit ou vide","qty":nombre entier ou null,"unit":"kg"}'
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
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
            parsed = json.loads(_text(data) or "{}")
            product = str(parsed.get("product") or "").strip()[:120]
            try:
                qty = int(parsed.get("qty")) if parsed.get("qty") is not None else None
            except (TypeError, ValueError):
                qty = None
            if qty is not None and qty < 1:
                qty = None
            unit = str(parsed.get("unit") or "kg").strip()[:20] or "kg"
            return {"product": product, "qty": qty, "unit": unit}
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, TypeError, KeyError):
            continue
    return {"product": "", "qty": None, "unit": "kg"}


def _text(data):
    chunks = []
    for candidate in data.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if part.get("text"):
                chunks.append(part["text"])
    return "".join(chunks).strip()
