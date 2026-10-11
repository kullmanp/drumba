#!/usr/bin/env python3
"""Misst Glyphen des `2006Trommelfont`, der Schrift des STPV.

Die Schrift steckt als TrueType-Teilmenge in einem PDF des Verbands. Das
Skript holt sie dort heraus und druckt fuer jedes verlangte Zeichen die
Umrisse in Schrifteinheiten: je Kontur die Punkte, `*` fuer Punkte auf der
Kurve, `~` fuer Kontrollpunkte quadratischer Bezier-Kurven, dazu die Huellbox.

Die Schrift ist eine Textschrift mit festen Vorschubbreiten: sie ist Vorlage
fuer Formen und senkrechte Masse, nicht fuer waagrechte Abstaende. Das PDF
bettet nur die Glyphen ein, die es selbst setzt (`--alle` zeigt sie): `l` Kopf
mit Hals, `u` Kopf mit Hals und Balken, `1` Linie mit Balken, `'` Taktstrich.
Keinen Vorschlag, keinen Wirbel, keinen Bogen, kein Wiederholungszeichen —
dafuer braucht es eine andere Quelle.

    python3 scripts/trommelfont.py l u        # Zeichen 'l' und 'u'
    python3 scripts/trommelfont.py --alle     # jede Glyphe mit Zeichen
    python3 scripts/trommelfont.py --pdf datei.pdf l

Ohne --pdf wird das PDF geladen und unter /tmp zwischengespeichert. Nur
Standardbibliothek.
"""

import argparse
import os
import re
import struct
import sys
import tempfile
import urllib.request
import zlib

PDF_URL = (
    "https://stpv-astf.ch/wp-content/uploads/2018/10/"
    "Glossar_zu_Taxationstabelle_TPer.pdf"
)
SCHRIFT = b"2006Trommelfont"


def lade_pdf(pfad):
    if pfad:
        with open(pfad, "rb") as f:
            return f.read()
    zwischen = os.path.join(tempfile.gettempdir(), "trommelfont-glossar.pdf")
    if not os.path.exists(zwischen):
        urllib.request.urlretrieve(PDF_URL, zwischen)
    with open(zwischen, "rb") as f:
        return f.read()


def schrift_aus_pdf(pdf):
    """Der entpackte FontFile2-Strom der Schrift (der normale Schnitt, nicht Bold)."""
    beschreibung = re.search(
        rb"/FontFile2 (\d+) 0 R[^>]*?/FontName/[A-Z]{6}\+" + SCHRIFT + rb"/", pdf
    )
    if not beschreibung:
        sys.exit("Keine FontFile2 fuer 2006Trommelfont im PDF gefunden")
    nummer = beschreibung.group(1)
    objekt = re.search(rb"(?<![0-9])" + nummer + rb" 0 obj\s*<<(.*?)>>\s*stream\r?\n", pdf, re.S)
    laenge = int(re.search(rb"/Length (\d+)", objekt.group(1)).group(1))
    return zlib.decompress(pdf[objekt.end() : objekt.end() + laenge])


def tabellen(ttf):
    anzahl = struct.unpack(">H", ttf[4:6])[0]
    verzeichnis = {}
    for i in range(anzahl):
        name, _, start, laenge = struct.unpack(">4sIII", ttf[12 + 16 * i : 28 + 16 * i])
        verzeichnis[name.decode()] = ttf[start : start + laenge]
    return verzeichnis


def zeichenzuordnung(cmap):
    """Zeichencode -> Glyphennummer, aus der ersten Format-4-Untertabelle."""
    anzahl = struct.unpack(">H", cmap[2:4])[0]
    for i in range(anzahl):
        _, _, versatz = struct.unpack(">HHI", cmap[4 + 8 * i : 12 + 8 * i])
        t = cmap[versatz:]
        if struct.unpack(">H", t[:2])[0] != 4:
            continue
        segmente = struct.unpack(">H", t[6:8])[0] // 2
        feld = lambda n: struct.unpack(f">{segmente}H", t[n : n + 2 * segmente])
        enden = feld(14)
        anfaenge = feld(16 + 2 * segmente)
        deltas = struct.unpack(f">{segmente}h", t[16 + 4 * segmente : 16 + 6 * segmente])
        bereich_start = 16 + 6 * segmente
        bereiche = feld(bereich_start)
        zuordnung = {}
        for s in range(segmente):
            for code in range(anfaenge[s], enden[s] + 1):
                if code == 0xFFFF:
                    continue
                if bereiche[s] == 0:
                    glyphe = (code + deltas[s]) & 0xFFFF
                else:
                    stelle = bereich_start + 2 * s + bereiche[s] + 2 * (code - anfaenge[s])
                    glyphe = struct.unpack(">H", t[stelle : stelle + 2])[0]
                    if glyphe:
                        glyphe = (glyphe + deltas[s]) & 0xFFFF
                if glyphe:
                    # Symbolschriften legen ihre Zeichen oft nach 0xF000.
                    zuordnung[code & 0xFF if code >= 0xF000 else code] = glyphe
        return zuordnung
    return {}


def umriss(t, glyphe):
    """Die Konturen einer Glyphe als Listen von (x, y, auf_kurve), dazu ihre Huellbox."""
    lang = struct.unpack(">h", t["head"][50:52])[0] == 1
    loca = t["loca"]
    if lang:
        start, ende = struct.unpack(">II", loca[4 * glyphe : 4 * glyphe + 8])
    else:
        start, ende = (2 * v for v in struct.unpack(">HH", loca[2 * glyphe : 2 * glyphe + 4]))
    g = t["glyf"][start:ende]
    if not g:
        return [], None
    konturen, *box = struct.unpack(">hhhhh", g[:10])
    if konturen < 0:
        sys.exit(f"Glyphe {glyphe} ist zusammengesetzt; das kann das Skript noch nicht")
    enden = struct.unpack(f">{konturen}H", g[10 : 10 + 2 * konturen])
    punkte = enden[-1] + 1
    stelle = 10 + 2 * konturen
    stelle += 2 + struct.unpack(">H", g[stelle : stelle + 2])[0]

    flaggen = []
    while len(flaggen) < punkte:
        flagge = g[stelle]
        stelle += 1
        flaggen.append(flagge)
        if flagge & 8:
            flaggen.extend([flagge] * g[stelle])
            stelle += 1

    def koordinaten(kurz, gleich):
        nonlocal stelle
        werte, wert = [], 0
        for flagge in flaggen:
            if flagge & kurz:
                d = g[stelle]
                stelle += 1
                wert += d if flagge & gleich else -d
            elif not flagge & gleich:
                wert += struct.unpack(">h", g[stelle : stelle + 2])[0]
                stelle += 2
            werte.append(wert)
        return werte

    xs = koordinaten(2, 16)
    ys = koordinaten(4, 32)
    ergebnis, anfang = [], 0
    for ende in enden:
        ergebnis.append([(xs[i], ys[i], bool(flaggen[i] & 1)) for i in range(anfang, ende + 1)])
        anfang = ende + 1
    return ergebnis, box


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("zeichen", nargs="*", help="Zeichen, deren Glyphen gedruckt werden")
    parser.add_argument("--alle", action="store_true", help="jede Glyphe mit Zeichen drucken")
    parser.add_argument("--pdf", help="lokales PDF statt des Downloads")
    args = parser.parse_args()

    t = tabellen(schrift_aus_pdf(lade_pdf(args.pdf)))
    einheiten = struct.unpack(">H", t["head"][18:20])[0]
    zuordnung = zeichenzuordnung(t["cmap"])
    zeichen = sorted(zuordnung) if args.alle else [ord(z) for z in "".join(args.zeichen)]
    if not zeichen:
        parser.error("Zeichen angeben oder --alle")

    print(f"unitsPerEm {einheiten}")
    for code in zeichen:
        glyphe = zuordnung.get(code)
        if glyphe is None:
            print(f"\n{chr(code)!r}: keine Glyphe")
            continue
        konturen, box = umriss(t, glyphe)
        print(f"\n{chr(code)!r} -> Glyphe {glyphe}, Huellbox {box}")
        for i, kontur in enumerate(konturen):
            punkte = " ".join(f"{'*' if auf else '~'}{x},{y}" for x, y, auf in kontur)
            print(f"  Kontur {i}: {punkte}")


if __name__ == "__main__":
    main()
