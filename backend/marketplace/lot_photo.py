"""Enregistre la photo du producteur pour l’afficher telle quelle sur le lot."""

import base64
import io
from pathlib import Path

from django.conf import settings


def save_lot_photo(image_base64: str, stock_id) -> str | None:
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
        img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    except Exception:
        return None
    img.thumbnail((960, 960))
    dest = Path(settings.MEDIA_ROOT) / "lots"
    dest.mkdir(parents=True, exist_ok=True)
    path = dest / f"{stock_id}.jpg"
    img.save(path, "JPEG", quality=86, optimize=True)
    return f"{settings.MEDIA_URL}lots/{stock_id}.jpg"
