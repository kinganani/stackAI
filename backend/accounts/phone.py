import re

from rest_framework import serializers


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00228"):
        digits = digits[5:]
    if digits.startswith("228"):
        digits = digits[3:]
    if len(digits) != 8:
        raise serializers.ValidationError("Numéro togolais à 8 chiffres (ex. 90 11 12 13).")
    return "228" + digits


def local_display(e164: str) -> str:
    d = (e164 or "").replace("228", "", 1)
    if len(d) == 8:
        return f"{d[0:2]} {d[2:4]} {d[4:6]} {d[6:8]}"
    return e164 or ""
