"""Convert Stitch HTML screens into React page components."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(r"c:\Users\kinga\OneDrive\Desktop\stackAi\stitch_fraislink_west_africa_food_marketplace")
OUT = Path(r"c:\Users\kinga\OneDrive\Desktop\stackAi\stackAI\frontend\src\pages")

SCREENS = {
    "marche": ("march_flux_d_urgence", "MarchePage"),
    "scan": ("scan_ia_publication_vendeur", "ScanPage"),
    "reservation": ("d_tail_du_lot_r_servation_express", "ReservationPage"),
    "impact": ("tableau_de_bord_impact_anti_gaspi", "ImpactPage"),
}

PATHS = {
    "marche-urgence": "/marche",
    "market": "/marche",
    "scan-ia-vendeur": "/scan",
    "scan": "/scan",
    "detail-reservations": "/reservation",
    "detail": "/reservation",
    "impact-historique": "/impact",
    "impact": "/impact",
}

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "source", "track", "wbr",
}

ATTR_MAP = {
    "class": "className",
    "for": "htmlFor",
    "tabindex": "tabIndex",
    "colspan": "colSpan",
    "rowspan": "rowSpan",
    "readonly": "readOnly",
    "maxlength": "maxLength",
    "autocomplete": "autoComplete",
    "crossorigin": "crossOrigin",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
    "viewbox": "viewBox",
}


def jsx_attr(name, value):
    name = ATTR_MAP.get(name, name)
    if value is None:
        return name
    escaped = (
        value.replace("\\", "\\\\")
        .replace('"', "&quot;")
        .replace("{", "&#123;")
        .replace("}", "&#125;")
    )
    if name == "style":
        if not value.strip():
            return None
        parts = []
        for chunk in value.split(";"):
            if ":" not in chunk:
                continue
            k, v = chunk.split(":", 1)
            k = k.strip()
            v = v.strip().replace("\\", "\\\\").replace("'", "\\'")
            if not k:
                continue
            ck = "".join(p.capitalize() if i else p for i, p in enumerate(k.split("-")))
            parts.append(f"{ck}: '{v}'")
        if parts:
            return "style={{ " + ", ".join(parts) + " }}"
        return None
    if name.lower().startswith("on"):
        return None
    return f'{name}="{escaped}"'


class ToJsx(HTMLParser):
    def __init__(self, active):
        super().__init__(convert_charrefs=True)
        self.active = active
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if self.skip:
            return
        ad = dict(attrs)
        if tag == "input" and "value" in ad:
            ad["readOnly"] = ""
        path = ad.get("data-path")
        if tag == "a" and path in PATHS:
            href = PATHS[path]
            ad["href"] = href
            if path in ("marche-urgence", "market") and self.active == "marche":
                ad["class"] = "font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs"
            elif path in ("scan-ia-vendeur", "scan") and self.active == "scan":
                ad["class"] = "font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs"
            elif path in ("detail-reservations", "detail") and self.active == "reservation":
                ad["class"] = "font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs"
            elif path in ("impact-historique", "impact") and self.active == "impact":
                ad["class"] = "font-label-lg text-label-lg bg-primary-container text-on-primary-container font-semibold rounded-lg px-space-md py-space-xs"
        rendered = []
        for k, v in ad.items():
            piece = jsx_attr(k, v if v is not None else "")
            if piece:
                rendered.append(piece)
        attr = (" " + " ".join(rendered)) if rendered else ""
        if tag in VOID:
            self.out.append(f"<{tag}{attr} />")
        else:
            self.out.append(f"<{tag}{attr}>")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            if self.skip:
                self.skip -= 1
            return
        if self.skip or tag in VOID:
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if self.skip:
            return
        text = (
            data.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("{", "&#123;")
            .replace("}", "&#125;")
        )
        if text.strip() == "" and "\n" in text:
            return
        self.out.append(text)

    def handle_entityref(self, name):
        self.out.append(f"&{name};")

    def handle_charref(self, name):
        self.out.append(f"&#{name};")


def body_inner(html):
    start = html.lower().find("<body")
    start = html.find(">", start) + 1
    end = html.lower().rfind("</body>")
    return html[start:end]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (folder, comp) in SCREENS.items():
        html = (ROOT / folder / "code.html").read_text(encoding="utf-8")
        parser = ToJsx(key)
        parser.feed(body_inner(html))
        jsx = "".join(parser.out)
        file = OUT / f"{comp}.jsx"
        file.write_text(
            f"export default function {comp}() {{\n  return (\n    <>\n      {jsx}\n    </>\n  );\n}}\n",
            encoding="utf-8",
        )
        print(comp, file.stat().st_size)


if __name__ == "__main__":
    main()
