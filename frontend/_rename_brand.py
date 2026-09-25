from pathlib import Path

root = Path(r"c:\Users\kinga\OneDrive\Desktop\stackAi\stackAI\frontend")
svg = '<img alt="LocalMatch" className="h-8 w-8" src="/logo.svg" />'
marker = '<img alt="LocalMatch Logo"'

for p in list(root.rglob("*.jsx")) + list(root.rglob("*.html")):
    t = p.read_text(encoding="utf-8")
    n = t.replace("FraisHeure", "LocalMatch").replace("fraisheure.tg", "localmatch.tg")
    while marker in n:
        a = n.find(marker)
        b = n.find("/>", a)
        n = n[:a] + svg + n[b + 2 :]
    if n != t:
        p.write_text(n, encoding="utf-8")
        print(p.name)
