import os
import sys
from pathlib import Path

from django.core.wsgi import get_wsgi_application

BACKEND = Path(__file__).resolve().parent.parent
ROOT = BACKEND.parent
for path in (str(ROOT), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
app = application
