"""Rebuild the hero assets using the original Tripflix logo outlines."""

import base64
import io
from pathlib import Path
import xml.etree.ElementTree as ET

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/design/layered-hero/source"
OUTPUT = ROOT / "apps/web/public/brand/hero-layered-v1"


def build():
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
    foam = Image.open(SOURCE / "letter-contact-foam.png")
    assert foam.mode == "RGBA" and foam.getchannel("A").getextrema()[0] == 0
    assert foam.getchannel("A").getextrema()[1] > 128
    foam_data = io.BytesIO()
    foam.save(foam_data, format="WEBP", quality=94, method=6)
    (OUTPUT / "letter-contact-foam.webp").write_bytes(foam_data.getvalue())
    foam_encoded = base64.b64encode(foam_data.getvalue()).decode()
    logo = ET.parse(OUTPUT.parent / "tripflix-logo.svg").getroot()
    wordmark = logo.find("{http://www.w3.org/2000/svg}path").get("d")
    letters = [part if part.startswith("M") else "M" + part for part in wordmark.split(" M")]
    assert len(letters) == 8
    logo_bounds = BoundsPen(None)
    parse_path(wordmark, logo_bounds)
    left, top, right, bottom = logo_bounds.bounds
    scale = 410 / (bottom - top)
    word_width = (right - left) * scale
    word_left = (2400 - word_width) / 2
    transform = (scale, 0, 0, scale, word_left - left * scale, 40 - top * scale)
    baseline = 100 * scale + transform[5]
    definitions, faces, edges, ripples, droplets = [], [], [], [], []
    for i, (char, letter) in enumerate(zip("Tripflix", letters)):
        pen = SVGPathPen(None)
        parse_path(letter, TransformPen(pen, transform))
        path = pen.getCommands()
        bounds = BoundsPen(None)
        parse_path(letter, TransformPen(bounds, transform))
        x0, y0, x1, y1 = bounds.bounds
        assert 0 <= x0 < x1 < 2400 and 0 <= y0 < y1 < 460, (char, bounds.bounds)
        tile = atlas.crop((round(i * atlas.width / 8), 0, round((i + 1) * atlas.width / 8), atlas.height))
        data = io.BytesIO()
        tile.save(data, format="WEBP", quality=96, method=6)
        encoded = base64.b64encode(data.getvalue()).decode()
        definitions.append(f'<path id="letter-{i}" d="{path}"/><clipPath id="clip-{i}"><use href="#letter-{i}"/></clipPath>')
        edges.append(f'<use href="#letter-{i}"/>')
        faces.append(
            f'<g clip-path="url(#clip-{i})"><image x="{x0:.2f}" y="{y0:.2f}" width="{x1-x0:.2f}" height="{y1-y0:.2f}" '
            f'preserveAspectRatio="xMidYMid slice" href="data:image/webp;base64,{encoded}"/></g>'
            f'<use href="#letter-{i}" fill="url(#glass)" stroke="#edfffc" stroke-width="2" stroke-linejoin="round"/>'
        )
        cx, contact, span = (x0 + x1) / 2, y1 + 10, x1 - x0
        ripples.append(f'<g class="ripple" style="animation-delay:-{i * .65}s;transform-origin:{cx:.1f}px {contact:.1f}px">'
                       f'<ellipse cx="{cx:.1f}" cy="{contact:.1f}" rx="{span*.55:.1f}" ry="6"/>'
                       f'<ellipse cx="{cx:.1f}" cy="{contact+6:.1f}" rx="{span*.7:.1f}" ry="10" opacity=".35"/></g>')
        if i in (0, 1, 3, 5, 7):
            droplets.append(f'<g class="spray" opacity=".6" style="animation-delay:-{i*.7}s" transform="translate({cx:.1f} {y1-450:.1f})">'
                            '<path d="M-15 451Q-16 432-28 426Q-20 435-21 451Z M8 451Q10 440 17 438Q12 445 13 451Z"/>'
                            '<ellipse cx="-31" cy="418" rx="1.7" ry="3.5" transform="rotate(-22 -31 418)"/>'
                            '<ellipse cx="-17" cy="428" rx="1.5" ry="2.8"/>'
                            '<ellipse cx="19" cy="432" rx="1.3" ry="2"/></g>')

    outlines, fronts = "".join(edges), "".join(faces)
    # shortcut: SVG extrusion has no live refraction, replace with WebGL when true 3D rotation is required.
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 660" fill="none">
<title>Tripflix — Sa Pa, Hạ Long, Tràng An, Huế, Phú Quốc, Cao Bằng, Cầu Vàng, Hội An</title>
<defs>{"".join(definitions)}
<linearGradient id="depth" x2=".4" y2="1"><stop stop-color="#bbf7ef"/><stop offset=".5" stop-color="#318b9b" stop-opacity=".8"/><stop offset="1" stop-color="#a0f4e9"/></linearGradient>
<linearGradient id="glass" x2=".25" y2="1"><stop stop-color="#eeffff" stop-opacity=".32"/><stop offset=".2" stop-color="#aaf8ff" stop-opacity=".08"/><stop offset=".65" stop-color="#29bbc3" stop-opacity=".04"/><stop offset="1" stop-color="#e0ffff" stop-opacity=".25"/></linearGradient>
<linearGradient id="fade" x2="0" y2="1"><stop stop-color="white" stop-opacity=".26"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
<mask id="reflection"><path d="M0 {baseline+16:.2f}H2400V660H0Z" fill="url(#fade)"/></mask>
<filter id="glow" x="-10%" y="-20%" width="120%" height="150%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="water-reflection" x="-2%" y="-5%" width="104%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".008 .09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>
<g id="front">{fronts}</g>
</defs>
<style>
@media(prefers-reduced-motion:no-preference) {{
  .ripple {{ animation:ripple-breathe 5s ease-in-out infinite; }}
  .contact-foam {{ animation:foam-breathe 5.5s ease-in-out infinite; }}
  .spray {{ animation:spray-shimmer 4.5s ease-in-out infinite; }}
}}
@keyframes ripple-breathe {{ 0%,100% {{ opacity:.3;transform:scaleX(.97); }} 50% {{ opacity:.65;transform:scaleX(1.04); }} }}
@keyframes foam-breathe {{ 0%,100% {{ opacity:.7;transform:translateY(0); }} 50% {{ opacity:.9;transform:translateY(-1.5px); }} }}
@keyframes spray-shimmer {{ 0%,100% {{ opacity:.25; }} 50% {{ opacity:.8; }} }}
</style>
<g mask="url(#reflection)"><use href="#front" transform="translate(0 {baseline*1.64+16:.2f}) scale(1 -.64)" filter="url(#water-reflection)"/></g>
<g fill="none" stroke="#d5fff9" stroke-width="1.8" opacity=".5">{"".join(ripples)}</g>
<g fill="#c2fff5" stroke="#b9fff3" stroke-width="5" opacity=".32" filter="url(#glow)">{outlines}</g>
<g fill="url(#depth)" stroke="#c5fff5" stroke-width="2" stroke-linejoin="round" transform="translate(9 7)">{outlines}</g>
<g fill="url(#depth)" stroke="#78cfcf" stroke-width="5" stroke-linejoin="round" transform="translate(4 3)">{outlines}</g>
<use href="#front"/>
<g fill="none" stroke="#f2ffff" stroke-width="1" opacity=".7" transform="translate(-.5 -1)">{outlines}</g>
<image class="contact-foam" x="{word_left:.2f}" y="{baseline-94:.2f}" width="{word_width:.2f}" height="180" opacity=".8" preserveAspectRatio="none" href="data:image/webp;base64,{foam_encoded}"/>
<g fill="#e2fffc">{"".join(droplets)}</g>
</svg>'''
    (OUTPUT / "tripflix-logo-crystal.svg").write_text(svg, encoding="utf-8", newline="\n")
    document = ET.fromstring(svg)
    ns = {"s": "http://www.w3.org/2000/svg"}
    assert len(document.findall(".//s:clipPath", ns)) == 8
    assert len(document.findall(".//s:image", ns)) == 9
    assert len(document.findall(".//s:g[@class='ripple']", ns)) == 8
    assert len(document.findall(".//s:g[@class='spray']", ns)) == 5
    assert all(img.get("href", "").startswith("data:image/webp;base64,") for img in document.findall(".//s:image", ns))
    assert Image.open(OUTPUT / "ha-long-clean.webp").size == (2560, 1440)
    assert Image.open(OUTPUT / "boat-wake.webp").getchannel("A").getextrema() == (0, 255)
    print("PASS: scenery, transparent boat/foam, eight bounded vector letters and ripples, five light sprays, nine embedded textures.")


if __name__ == "__main__":
    build()
