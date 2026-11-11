"""Rebuild the static hero assets: python tools/build-layered-hero.py [bold-italic.ttf]."""

import base64
import io
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/design/layered-hero/source"
OUTPUT = ROOT / "apps/web/public/brand/hero-layered-v1"


def build(font_path):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scenery = Image.open(SOURCE / "ha-long-clean.png").convert("RGB")
    ImageOps.fit(scenery, (2560, 1440), Image.Resampling.LANCZOS).save(
        OUTPUT / "ha-long-clean.webp", quality=94, method=6
    )
    boat = Image.open(SOURCE / "boat-wake.png")
    assert boat.mode == "RGBA" and boat.getchannel("A").getextrema() == (0, 255)
    assert all(boat.getpixel(p)[3] == 0 for p in [(0, 0), (boat.width - 1, 0), (0, boat.height - 1)])
    boat.save(OUTPUT / "boat-wake.png")
    boat.save(OUTPUT / "boat-wake.webp", quality=94, method=6)

    atlas = Image.open(SOURCE / "destinations-atlas.png").convert("RGB")
    font = TTFont(font_path)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    advances = [font["hmtx"][cmap[ord(c)]][0] for c in "TRIPFLIX"]
    sx, sy = 2240 / sum(advances), 410 / font["OS/2"].sCapHeight
    definitions, faces, edges = [], [], []
    cursor = 48
    for i, (char, advance) in enumerate(zip("TRIPFLIX", advances)):
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(TransformPen(pen, (sx, 0, 0, -sy, cursor, 450)))
        path = pen.getCommands()
        bounds = BoundsPen(glyphs)
        glyph.draw(TransformPen(bounds, (sx, 0, 0, -sy, cursor, 450)))
        x0, y0, x1, y1 = bounds.bounds
        tile = atlas.crop((round(i * atlas.width / 8), 0, round((i + 1) * atlas.width / 8), atlas.height))
        data = io.BytesIO()
        tile.save(data, format="WEBP", quality=96, method=6)
        encoded = base64.b64encode(data.getvalue()).decode()
        definitions.append(f'<path id="letter-{i}" d="{path}"/><clipPath id="clip-{i}"><use href="#letter-{i}"/></clipPath>')
        edges.append(f'<use href="#letter-{i}"/>')
        faces.append(
            f'<g clip-path="url(#clip-{i})"><image x="{x0:.2f}" y="{y0:.2f}" width="{x1-x0:.2f}" height="{y1-y0:.2f}" '
            f'preserveAspectRatio="xMidYMid slice" href="data:image/webp;base64,{encoded}"/></g>'
            f'<use href="#letter-{i}" fill="url(#glass)" stroke="#bafffa" stroke-width="3"/>'
        )
        cursor += advance * sx

    outlines, fronts = "".join(edges), "".join(faces)
    # shortcut: SVG extrusion has no live refraction, replace with WebGL when true 3D rotation is required.
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 660" fill="none">
<title>TRIPFLIX — Sa Pa, Hạ Long, Tràng An, Huế, Phú Quốc, Cao Bằng, Cầu Vàng, Hội An</title>
<defs>{"".join(definitions)}
<linearGradient id="depth" x2=".4" y2="1"><stop stop-color="#0a9da9"/><stop offset=".5" stop-color="#036178"/><stop offset="1" stop-color="#27c9d5"/></linearGradient>
<linearGradient id="glass" x2=".25" y2="1"><stop stop-color="#eeffff" stop-opacity=".5"/><stop offset=".2" stop-color="#aaf8ff" stop-opacity=".12"/><stop offset=".65" stop-color="#29bbc3" stop-opacity=".05"/><stop offset="1" stop-color="#e0ffff" stop-opacity=".36"/></linearGradient>
<linearGradient id="fade" x2="0" y2="1"><stop stop-color="white" stop-opacity=".4"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
<mask id="reflection"><path d="M0 466H2400V660H0Z" fill="url(#fade)"/></mask>
<filter id="glow" x="-10%" y="-20%" width="120%" height="150%"><feGaussianBlur stdDeviation="5"/></filter>
<g id="front">{fronts}</g>
</defs>
<g fill="#6efff1" stroke="#81fff2" stroke-width="9" opacity=".65" filter="url(#glow)">{outlines}</g>
<g fill="url(#depth)" stroke="#62e9e6" stroke-width="3" stroke-linejoin="round" transform="translate(22 16)">{outlines}</g>
<g fill="url(#depth)" stroke="#249fae" stroke-width="11" stroke-linejoin="round" transform="translate(10 8)">{outlines}</g>
<use href="#front"/>
<g fill="none" stroke="#f2ffff" stroke-width="1.3" opacity=".85" transform="translate(-1 -2)">{outlines}</g>
<g mask="url(#reflection)"><use href="#front" transform="translate(0 758) scale(1 -.64)"/></g>
</svg>'''
    (OUTPUT / "tripflix-crystal.svg").write_text(svg, encoding="utf-8")
    document = ET.fromstring(svg)
    ns = {"s": "http://www.w3.org/2000/svg"}
    assert len(document.findall(".//s:clipPath", ns)) == 8
    assert len(document.findall(".//s:image", ns)) == 8
    assert all(img.get("href", "").startswith("data:image/webp;base64,") for img in document.findall(".//s:image", ns))
    assert Image.open(OUTPUT / "ha-long-clean.webp").size == (2560, 1440)
    assert Image.open(OUTPUT / "boat-wake.webp").getchannel("A").getextrema() == (0, 255)
    print("PASS: 2560x1440 scenery, transparent PNG/WebP boat, eight vector letter paths and embedded destination textures.")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "C:/Windows/Fonts/arialbi.ttf")
