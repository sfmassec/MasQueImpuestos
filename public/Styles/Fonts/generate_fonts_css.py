
import os, re, sys
from pathlib import Path
from collections import defaultdict

# Usage: python generate_fonts_css.py "C:\Users\Nicolas\Documents\Trabajo\SFMasQue\public\Fonts" > all-fonts.css
# If no argument is given, it defaults to the path above.
DEFAULT_PATH = r"C:\Users\Nicolas\Documents\Trabajo\SFMasQue\public\Fonts"
root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(DEFAULT_PATH)

if not root.exists():
    print(f"// La carpeta {root} no existe. Ajustá la ruta o montá las fuentes allí.", file=sys.stderr)
    sys.exit(1)

FONT_EXTS = {".woff2": "woff2", ".woff": "woff", ".ttf": "truetype", ".otf": "opentype", ".eot": "embedded-opentype", ".svg": "svg"}

def parse_weight_style(name):
    base = name.lower()
    weight = 400
    style = "normal"
    if "italic" in base or base.endswith("it") or "-it" in base or "oblique" in base:
        style = "italic"
    pairs = [
        ("thin", 100), ("extralight", 200), ("ultralight", 200),
        ("light", 300), ("book", 350), ("normal", 400), ("regular", 400),
        ("medium", 500), ("semibold", 600), ("demibold", 600),
        ("bold", 700), ("extrabold", 800), ("ultrabold", 800),
        ("black", 900), ("heavy", 900),
    ]
    for key, val in pairs:
        if key in base:
            weight = val
    m = re.search(r"(?<!\d)(100|200|300|400|500|600|700|800|900)(?!\d)", base)
    if m:
        weight = int(m.group(1))
    return weight, style

def guess_family(fname):
    stem = Path(fname).stem
    cleaned = re.sub(r"[-_](Thin|ExtraLight|UltraLight|Light|Book|Regular|Normal|Medium|SemiBold|DemiBold|Bold|ExtraBold|UltraBold|Black|Heavy|Italic|Oblique|It|[1-9]00)$", "", stem, flags=re.IGNORECASE)
    cleaned = re.sub(r"[-_](Italic|Oblique|It)$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.replace("-", " ").replace("_", " ").strip()

entries = []
for p in root.rglob("*"):
    if p.is_file() and p.suffix.lower() in FONT_EXTS:
        rel = p.relative_to(root).as_posix()
        family = guess_family(p.name) or p.parent.name
        weight, style = parse_weight_style(p.name)
        fmt = FONT_EXTS[p.suffix.lower()]
        entries.append({"family": family, "weight": weight, "style": style, "rel": rel, "format": fmt})

grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
for e in entries:
    grouped[e["family"]][e["weight"]][e["style"]].append(e)

fmt_order = {"woff2": 0, "woff": 1, "truetype": 2, "opentype": 3, "embedded-opentype": 4, "svg": 5}

print("/* Auto-generated font registry. Colocá este CSS en tu proyecto y asegurate que /Fonts apunte a", root, "*/\n")
for family, by_weight in sorted(grouped.items()):
    for weight, by_style in sorted(by_weight.items()):
        for style, items in sorted(by_style.items()):
            items.sort(key=lambda x: fmt_order.get(x["format"], 99))
            src_parts = []
            eot_url = None
            for it in items:
                url = f"/Fonts/{it['rel']}"
                if it["format"] == "embedded-opentype":
                    eot_url = url
                else:
                    src_parts.append(f"url('{url}') format('{it['format']}')")
            print("@font-face {")
            print(f"  font-family: '{family}';")
            print(f"  font-style: {style};")
            print(f"  font-weight: {weight};")
            print("  font-display: swap;")
            if eot_url:
                print(f"  src: url('{eot_url}');")
            if src_parts:
                print("  src: " + ",\n       ".join(src_parts) + ";")
            print("}\n")
