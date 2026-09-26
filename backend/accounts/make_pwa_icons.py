"""Génère les icônes PWA à partir de public/logo.png, sans l’écraser."""
from pathlib import Path

from PIL import Image


def fit_square(source, size, pad=0.0, background=(247, 251, 248, 255)):
    canvas = Image.new("RGBA", (size, size), background)
    inner = max(1, int(size * (1 - 2 * pad)))
    copy = source.convert("RGBA")
    copy.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - copy.width) // 2
    y = (size - copy.height) // 2
    canvas.paste(copy, (x, y), copy)
    return canvas


def main():
    root = Path(__file__).resolve().parents[2] / "frontend" / "public"
    source = Image.open(root / "logo.png")
    icons = root / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    fit_square(source, 192).save(icons / "icon-192.png")
    fit_square(source, 512).save(icons / "icon-512.png")
    fit_square(source, 512, pad=0.12).save(icons / "icon-512-maskable.png")
    fit_square(source, 180).save(icons / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
