import json
import time
import urllib.error
import urllib.request

_CACHE = {"at": 0, "data": None}

LOME = (6.1378, 1.2227)


def lome_weather():
    now = time.time()
    if _CACHE["data"] and now - _CACHE["at"] < 900:
        return _CACHE["data"]
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LOME[0]}&longitude={LOME[1]}"
        "&current=temperature_2m,relative_humidity_2m"
        "&timezone=Africa%2FLome"
    )
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "LocalMatch/1.0"})
        with urllib.request.urlopen(request, timeout=5) as response:
            raw = json.loads(response.read().decode())
        current = raw.get("current") or {}
        temp = float(current.get("temperature_2m"))
        humidity = float(current.get("relative_humidity_2m"))
        data = {
            "temp_c": round(temp, 1),
            "humidity": round(humidity),
            "stress": _stress(temp, humidity),
        }
    except (urllib.error.URLError, TimeoutError, ValueError, TypeError, json.JSONDecodeError, KeyError):
        data = {"temp_c": None, "humidity": None, "stress": 1.0}
    _CACHE["at"] = now
    _CACHE["data"] = data
    return data


def _stress(temp, humidity):
    heat = max(0.0, (float(temp) - 28.0) / 14.0)
    wet = max(0.0, (float(humidity) - 70.0) / 50.0)
    return round(min(1.8, 1.0 + 0.55 * heat + 0.25 * wet), 2)
