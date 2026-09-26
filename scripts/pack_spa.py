from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "dist"
DST = ROOT / "backend" / "spa"

if not SRC.is_dir():
    raise SystemExit("frontend/dist introuvable. Lance d’abord : npm run build --prefix frontend")

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST)
print(f"SPA copiée vers {DST}")
