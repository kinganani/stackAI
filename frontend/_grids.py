import re
from pathlib import Path
root = Path(r"c:\Users\kinga\OneDrive\Desktop\stackAi\stackAI\frontend\src\pages")
pat = re.compile(r"grid(?:-[^\s\"]+)+")
found = set()
for p in root.glob("*.jsx"):
    for m in pat.findall(p.read_text(encoding="utf-8")):
        if "grid-cols" in m:
            found.add(m)
for item in sorted(found):
    print(item)
