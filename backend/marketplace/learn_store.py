"""Photos soumises + images réelles pour l’entraînement."""

from __future__ import annotations

import json
import random
import uuid
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ML_DIR = Path(__file__).resolve().parent / "ml"
REAL_DIR = ML_DIR / "real"
SUBMIT_DIR = ML_DIR / "submitted"
KIND_TO_TYPE = {
    "tomate": "legume",
    "legume": "legume",
    "plantain": "fruit",
    "mangue": "fruit",
    "fruit": "fruit",
}

REAL_URLS = [
    ("plantain", 0, "https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg"),
    ("plantain", 0, "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bananas.jpg"),
    ("plantain", 0, "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=640&q=70"),
    ("plantain", 0, "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=640&q=70"),
    ("plantain", 1, "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=640&q=70"),
    ("plantain", 1, "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=640&q=40&sat=-50"),
    ("tomate", 0, "https://upload.wikimedia.org/wikipedia/commons/8/88/Bright_red_tomato_and_cross_section02.jpg"),
    ("tomate", 0, "https://images.unsplash.com/photo-1546470427-227c7b05af23?auto=format&fit=crop&w=640&q=70"),
    ("tomate", 1, "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=640&q=70"),
    ("legume", 0, "https://upload.wikimedia.org/wikipedia/commons/d/da/Iceberg_lettuce_in_SB.jpg"),
    ("legume", 0, "https://images.unsplash.com/photo-1540420822315-1ac2c3c0e0e0?auto=format&fit=crop&w=640&q=70"),
    ("mangue", 0, "https://upload.wikimedia.org/wikipedia/commons/4/40/Mango_and_cross_section.jpg"),
    ("mangue", 0, "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=640&q=70"),
    ("fruit", 0, "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=640&q=70"),
    ("fruit", 0, "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=640&q=70"),
    ("legume", 0, "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=640&q=70"),
    ("legume", 0, "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=70"),
    ("legume", 1, "https://images.unsplash.com/photo-1597362925123-77861d3bbd94?auto=format&fit=crop&w=640&q=70"),
    ("tomate", 0, "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=640&q=50"),
]


def _open_rgb(path):
    img = Image.open(path).convert("RGB")
    img.thumbnail((240, 240))
    return img


def augment(img, rng):
    out = img.copy()
    if rng.random() < 0.7:
        out = ImageEnhance.Brightness(out).enhance(rng.uniform(0.7, 1.3))
    if rng.random() < 0.5:
        out = ImageEnhance.Color(out).enhance(rng.uniform(0.65, 1.3))
    if rng.random() < 0.4:
        out = out.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.2, 1.4)))
    w, h = out.size
    if w > 40 and h > 40 and rng.random() < 0.65:
        m = rng.uniform(0.72, 0.95)
        nw, nh = int(w * m), int(h * m)
        x = rng.randint(0, max(0, w - nw))
        y = rng.randint(0, max(0, h - nh))
        out = out.crop((x, y, x + nw, y + nh))
    if rng.random() < 0.5:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    out.thumbnail((160, 160))
    return out


def remember_submission(*, image_base64: str, kind: str, rotten: bool, source: str = "scan"):
    kind = kind if kind in KIND_TO_TYPE else "fruit"
    SUBMIT_DIR.mkdir(parents=True, exist_ok=True)
    raw = (image_base64 or "").strip()
    if not raw:
        return
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    import base64
    import io

    try:
        img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    except Exception:
        return
    img.thumbnail((180, 180))
    sid = uuid.uuid4().hex[:12]
    jpg = SUBMIT_DIR / f"{sid}.jpg"
    meta = SUBMIT_DIR / f"{sid}.json"
    img.save(jpg, "JPEG", quality=80)
    meta.write_text(
        json.dumps({"kind": kind, "rotten": bool(rotten), "source": source, "type": KIND_TO_TYPE[kind]}, indent=2)
    )


def iter_labeled_images(rng, extra_aug=8):
    """Yield (pil_image, kind, rotten) including real + submitted, with augmentations."""
    for folder, default_rot in ((REAL_DIR, None), (SUBMIT_DIR, None)):
        if not folder.exists():
            continue
        for jpg in sorted(folder.glob("*.jpg")):
            meta_path = jpg.with_suffix(".json")
            kind, rotten = None, None
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    kind = meta.get("kind")
                    rotten = bool(meta.get("rotten"))
                except Exception:
                    kind = None
            if kind is None:
                # real/plantain_fresh_0.jpg
                name = jpg.stem.lower()
                for k in KIND_TO_TYPE:
                    if name.startswith(k) or f"_{k}_" in f"_{name}_":
                        kind = k
                        break
                rotten = "rot" in name or "pourri" in name
            if kind not in KIND_TO_TYPE:
                continue
            try:
                base = _open_rgb(jpg)
            except Exception:
                continue
            yield base, kind, bool(rotten)
            for _ in range(extra_aug):
                yield augment(base, rng), kind, bool(rotten)


def download_real_photos(log=None):
    import urllib.request

    REAL_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    ua = "LocalMatch/1.0 (TechArena vision training)"
    for i, (kind, rotten, url) in enumerate(REAL_URLS):
        dest = REAL_DIR / f"{kind}_{'rot' if rotten else 'fresh'}_{i}.jpg"
        meta = dest.with_suffix(".json")
        if dest.exists() and dest.stat().st_size > 2000:
            ok += 1
            continue
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            import io

            img = Image.open(io.BytesIO(data)).convert("RGB")
            img.thumbnail((320, 320))
            img.save(dest, "JPEG", quality=82)
            meta.write_text(json.dumps({"kind": kind, "rotten": bool(rotten), "source": "web"}, indent=2))
            ok += 1
            if log:
                log(f"OK {dest.name}")
        except Exception as exc:
            if dest.exists():
                dest.unlink()
            if log:
                log(f"skip {kind}: {exc}")
    return ok
