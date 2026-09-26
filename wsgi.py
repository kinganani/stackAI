import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from config.wsgi import application, app

__all__ = ["application", "app"]
