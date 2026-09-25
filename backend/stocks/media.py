import base64
import hashlib
import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode, urlparse

from django.conf import settings


class MediaError(Exception):
    def __init__(self, detail, status=400):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def cloudinary_parts():
    parsed = urlparse(settings.CLOUDINARY_URL or "")
    if parsed.scheme != "cloudinary" or not parsed.hostname or not parsed.username or not parsed.password:
        raise MediaError("Le stockage photo n'est pas configuré.", 500)
    return parsed.username, parsed.password, parsed.hostname


def _sign(params, secret):
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params))
    return hashlib.sha1(f"{payload}{secret}".encode()).hexdigest()


def _multipart(fields, filename, content, mime):
    boundary = "----LocalMatchUpload"
    chunks = []
    for key, value in fields.items():
        chunks.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
        )
    chunks.append(
        (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {mime}\r\n\r\n"
        ).encode()
        + content
        + b"\r\n"
    )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), boundary


def _post(url, body, headers, timeout=40):
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        error = MediaError("Service externe indisponible.", 502)
        error.upstream = detail
        error.http_status = exc.code
        raise error from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise MediaError("Service externe injoignable.", 502) from exc


def upload_image(content, mime):
    api_key, api_secret, cloud = cloudinary_parts()
    timestamp = str(int(time.time()))
    signed = {"folder": "localmatch/lots", "timestamp": timestamp}
    fields = {
        **signed,
        "api_key": api_key,
        "signature": _sign(signed, api_secret),
    }
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(mime, "jpg")
    body, boundary = _multipart(fields, f"lot.{extension}", content, mime)
    data = _post(
        f"https://api.cloudinary.com/v1_1/{cloud}/image/upload",
        body,
        {"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    secure_url = str(data.get("secure_url") or "")
    public_id = str(data.get("public_id") or "")
    if not secure_url.startswith(f"https://res.cloudinary.com/{cloud}/") or not public_id:
        raise MediaError("La photo n'a pas été enregistrée.", 502)
    return secure_url, public_id


def destroy_image(public_id):
    if not public_id:
        return
    try:
        api_key, api_secret, cloud = cloudinary_parts()
    except MediaError:
        return
    timestamp = str(int(time.time()))
    signed = {"public_id": public_id, "timestamp": timestamp}
    body = urlencode({
        **signed,
        "api_key": api_key,
        "signature": _sign(signed, api_secret),
    }).encode()
    try:
        _post(
            f"https://api.cloudinary.com/v1_1/{cloud}/image/destroy",
            body,
            {"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
    except MediaError:
        return


PROMPT = """Tu examines une photo de denrée agricole destinée à un marché à Lomé.
Réponds uniquement avec un objet JSON, sans texte autour.
Ne te base pas sur un seul coup d'œil. Croise ces critères, chacun noté de 0 à 100 (100 = bon pour la vente) :
- couleur : teinte attendue pour ce produit, taches brunes ou noires
- moisissure : duvet, points blancs, verts ou noirs
- fermete : flétrissement, rides, affaissement visibles
- humidite : jus, suintement, chair liquéfiée
- chocs : blessures, écrasement, insectes
- maturite : trop vert pour être vendu, ou trop avancé pour tenir
- part_vendable : part du lot qui paraît encore commercialisable
Tiens aussi compte du type de produit et de sa durée habituelle à température ambiante à Lomé. Une date lisible sur l'image compte si elle est passée.
Règles :
- is_produce est true seulement si la photo montre clairement un produit agricole alimentaire.
- N'invente pas une date. printed_date_visible est true seulement si une date est lisible. Sinon false et printed_expiry null.
- hours_left est le temps encore raisonnable avant que le produit ne soit plus bon à vendre, en heures. Ce n'est pas une mesure de laboratoire.
- category est l'une de : tomate, poisson, banane, autre. banane couvre le plantain.
- confidence est entre 0 et 1. Baisse-la si la photo est floue ou partielle.
- quality_percent est la synthèse des critères, de 0 à 100. 100 = lot sain. En cas de doute, prends le critère le plus faible, pas la moyenne optimiste.
- spoilage_percent est la part qui paraît pourrie, moisie ou avariée, de 0 à 100.
- reason cite en français les critères qui tirent la note vers le bas.
Format :
{"is_produce":true,"product":"","category":"autre","confidence":0.5,"aspects":{"couleur":80,"moisissure":90,"fermete":70,"humidite":80,"chocs":85,"maturite":75,"part_vendable":80},"quality_percent":75,"spoilage_percent":20,"printed_date_visible":false,"printed_expiry":null,"visual_freshness":"moyenne","hours_left":24,"reason":""}
"""


def _models():
    # Les anciens noms renvoient 404 ou ont épuisé le quota. Celui-ci répond encore.
    names = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        settings.GEMINI_MODEL,
    ]
    ordered = []
    for name in names:
        if name and name not in ordered:
            ordered.append(name)
    return ordered


def estimate_produce(content, mime):
    if not settings.GEMINI_API_KEY:
        raise MediaError("L'analyse photo n'est pas configurée.", 500)
    body = json.dumps({
        "contents": [{
            "parts": [
                {"text": PROMPT},
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(content).decode()}},
            ]
        }],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }).encode()
    headers = {"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY}
    last = None
    saturated = False
    for round_index in range(2):
        if round_index:
            if not saturated:
                break
            time.sleep(1.5)
        for model in _models():
            try:
                data = _post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    body,
                    headers,
                    timeout=18,
                )
                return _read_estimate(data)
            except MediaError as exc:
                last = exc
                code = getattr(exc, "http_status", 0)
                if code in (429, 503):
                    saturated = True
                    continue
                if code in (404, 0):
                    continue
                raise
    if saturated:
        raise MediaError("L'analyse photo est saturée pour le moment. Réessaie dans une minute.", 503) from last
    raise last or MediaError("La photo n'a pas pu être analysée.", 502)


def _read_estimate(data):
    text = ""
    for candidate in data.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if part.get("text"):
                text += part["text"]
    if not text:
        raise MediaError("La photo n'a pas pu être analysée.", 502)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise MediaError("La photo n'a pas pu être analysée.", 502) from exc
    return parsed
