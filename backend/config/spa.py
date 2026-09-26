import mimetypes
from pathlib import Path

from django.http import FileResponse, Http404, HttpResponseRedirect

SPA_DIR = Path(__file__).resolve().parent.parent / "spa"


def spa(request, rel=""):
    if not SPA_DIR.is_dir():
        if not rel:
            return HttpResponseRedirect("http://127.0.0.1:5173/")
        raise Http404()
    rel = (rel or "").lstrip("/")
    if rel.startswith("api/"):
        raise Http404()
    root = SPA_DIR.resolve()
    target = (SPA_DIR / rel).resolve() if rel else root / "index.html"
    if not rel or not str(target).startswith(str(root)) or not target.is_file():
        target = root / "index.html"
    if not target.is_file():
        raise Http404()
    content_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(target.open("rb"), content_type=content_type or "application/octet-stream")
