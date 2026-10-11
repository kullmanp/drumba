import { describe, expect, it } from "vitest";
import { addiere, bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt, Tole, Vers } from "../model/marsch";
import type { Glyph, GlyphTyp } from "./layout";
import { UngueltigerRufError, UngueltigerTaktError } from "../model/marsch";
import { layout, UnzeichenbarePauseError } from "./layout";

// --- Halterungen -----------------------------------------------------------

const schlag = (
  figur: Figur,
  hand: Hand,
  position: [number, number],
  wert: [number, number],
): Schlag => ({ figur, hand, position: bruch(...position), wert: bruch(...wert) });

/** Ein Takt aus gleich langen Dupfen, abwechselnd rechts/links ab position 0. */
const dupfenTakt = (anzahl: number, wert: [number, number]): Takt => ({
  schlaege: Array.from({ length: anzahl }, (_, i) =>
    schlag("Dupfe", i % 2 === 0 ? "rechts" : "links", [i * wert[0], wert[1]], wert),
  ),
  pausen: [],
  tolen: [],
});

/** Ein Takt, wie ihn ein Test hinschreibt: Pausen und Tolen nur, wo es welche gibt. */
interface Taktentwurf {
  readonly schlaege: readonly Schlag[];
  readonly pausen?: readonly Pause[];
  readonly tolen?: readonly Tole[];
}

const vers = (taktart: [number, number], wiederholungen: 1 | 2, ...takte: Taktentwurf[]): Vers => ({
  taktart: { zaehler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  takte: takte.map((takt): Takt => ({ pausen: [], tolen: [], ...takt })),
});

const marsch = (titel: string, ...verse: Vers[]): Marsch => ({ titel, verse });

const pause = (position: [number, number], wert: [number, number]): Pause => ({
  position: bruch(...position),
  wert: bruch(...wert),
});

/** Ein Vers mit Auftakt vor seinen Takten. */
const mitAuftakt = (
  taktart: [number, number],
  wiederholungen: 1 | 2,
  auftakt: Taktentwurf,
  ...takte: Taktentwurf[]
): Vers => ({
  ...vers(taktart, wiederholungen, ...takte),
  auftakt: { pausen: [], tolen: [], ...auftakt },
});

/** Ein 2/4-Takt aus Dupfen der gegebenen Werte, ab Position 0 lueckenlos gereiht. */
const reihe = (...werte: [number, number][]): Marsch => {
  let position = bruch(0, 1);
  const schlaege = werte.map((wert, i) => {
    const s: Schlag = {
      figur: "Dupfe",
      hand: i % 2 === 0 ? "rechts" : "links",
      position,
      wert: bruch(...wert),
    };
    position = addiere(position, s.wert);
    return s;
  });
  return marsch("Gemischt", vers([2, 4], 1, { schlaege }));
};

type GlyphVom<T extends GlyphTyp> = Extract<Glyph, { typ: T }>;

const glyphen = <T extends GlyphTyp>(m: Marsch, typ: T): GlyphVom<T>[] =>
  layout(m).glyphen.filter((g): g is GlyphVom<T> => g.typ === typ);

/** Die Abstaende zwischen aufeinanderfolgenden Werten. */
const abstaende = (werte: number[]): number[] => werte.slice(1).map((wert, i) => wert - werte[i]!);

// --- Tests -----------------------------------------------------------------

describe("Titel", () => {
  it("zeichnet den Titel des Marsches ueber den Noten", () => {
    const m = marsch("Arabi", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const [titel, ...weitere] = glyphen(m, "titel");

    expect(weitere).toEqual([]);
    expect(titel!.text).toBe("Arabi");
    expect(titel!.y).toBeLessThan(glyphen(m, "notenlinie")[0]!.y);
  });
});

describe("Notenlinie", () => {
  it("gibt jedem Vers eine Linie, von oben nach unten geordnet", () => {
    const m = marsch(
      "Zwei Verse",
      vers([6, 8], 2, dupfenTakt(6, [1, 8])),
      vers([2, 4], 1, dupfenTakt(4, [1, 8])),
    );
    const linien = glyphen(m, "notenlinie");

    expect(linien).toHaveLength(2);
    expect(linien[0]!.y).toBeLessThan(linien[1]!.y);
  });

  it("spannt die Linie ueber alle Takte des Verses", () => {
    const m = marsch("Zwei Takte", vers([6, 8], 2, dupfenTakt(6, [1, 8]), dupfenTakt(6, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;
    const haelse = glyphen(m, "hals");

    expect(linie.x1).toBeLessThan(haelse[0]!.x);
    expect(linie.x2).toBeGreaterThan(haelse.at(-1)!.x);
  });
});

describe("Schlaege im Takt", () => {
  it("zeichnet einen Hals je Schlag, von links nach rechts", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const haelse = glyphen(m, "hals");

    expect(haelse).toHaveLength(6);
    expect(abstaende(haelse.map((h) => h.x)).every((d) => d > 0)).toBe(true);
  });

  it("setzt gleich lange Schlaege in gleiche Abstaende", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const [erster, ...weitere] = abstaende(glyphen(m, "hals").map((h) => h.x));

    for (const abstand of weitere) expect(abstand).toBeCloseTo(erster!, 10);
  });

  it("setzt die Abstaende proportional zum rhythmischen Abstand", () => {
    // Achtel, Achtel, punktierte Viertel: die Luecken verhalten sich wie 1 : 1 : 3.
    const m = marsch(
      "Ungleich",
      vers([6, 8], 2, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 8]),
          schlag("Dupfe", "rechts", [2, 8], [3, 8]),
          schlag("Dupfe", "links", [5, 8], [1, 8]),
        ],
      }),
    );
    const [a, b, c] = abstaende(glyphen(m, "hals").map((h) => h.x));

    expect(b).toBeCloseTo(a!, 10);
    expect(c).toBeCloseTo(a! * 3, 10);
  });

  it("haengt die Haelse nach unten, unter die Notenlinie", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const hals of glyphen(m, "hals")) {
      expect(hals.yUnten).toBeGreaterThan(linie.y);
      expect(hals.yOben).toBeLessThan(hals.yUnten);
    }
  });

  it("fuehrt jeden Hals bis auf die Hoehe seines Notenkopfes", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const haelse = glyphen(m, "hals");
    const koepfe = glyphen(m, "notenkopf");

    expect(haelse.map((h) => h.yOben)).toEqual(koepfe.map((k) => k.y));
  });

  it("setzt den Hals an die linke Flanke des Kopfes, nicht durch dessen Mitte", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const haelse = glyphen(m, "hals");
    const koepfe = glyphen(m, "notenkopf");

    for (const [hals, kopf] of haelse.map((h, i) => [h, koepfe[i]!] as const)) {
      const versatz = kopf.x - hals.x;
      // Links der Mitte, aber innerhalb des Kopfes: er steht an dessen Rand.
      expect(versatz).toBeGreaterThan(kopf.breite / 4);
      expect(versatz).toBeLessThan(kopf.breite / 2);
    }
  });

  it("haelt den Kopf frei von der Notenlinie, statt sie zu beruehren", () => {
    const m = marsch(
      "Zwei",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 8]),
        ],
        pausen: [pause([1, 4], [1, 4])],
      }),
    );
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const kopf of glyphen(m, "notenkopf")) {
      const spalt = Math.abs(kopf.y - linie.y) - kopf.hoehe / 2;
      expect(spalt).toBeGreaterThan(0);
    }
  });

  it("endet mit allen Haelsen eines Taktes gleich tief — sie teilen den Balken", () => {
    // Rechts und links wechseln, die Koepfe liegen also verschieden hoch.
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const [erster, ...weitere] = glyphen(m, "hals");

    expect(new Set(weitere.map((h) => h.yOben)).size).toBe(2);
    for (const hals of weitere) expect(hals.yUnten).toBeCloseTo(erster!.yUnten, 10);
  });
});

describe("Notenkopf", () => {
  const gemischt = marsch(
    "Zwei",
    vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Schlepp", "links", [1, 8], [1, 8]),
      ],
      pausen: [pause([1, 4], [1, 4])],
    }),
  );

  it("gibt jedem Schlag genau einen Kopf, von links nach rechts", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const koepfe = glyphen(m, "notenkopf");

    expect(koepfe).toHaveLength(6);
    expect(abstaende(koepfe.map((k) => k.x)).every((d) => d > 0)).toBe(true);
  });

  it("setzt einen rechten Schlag ueber die Notenlinie und einen linken darunter", () => {
    const linie = glyphen(gemischt, "notenlinie")[0]!;
    const [rechts, links] = glyphen(gemischt, "notenkopf");

    expect(rechts!.hand).toBe("rechts");
    expect(rechts!.y).toBeLessThan(linie.y);
    expect(links!.hand).toBe("links");
    expect(links!.y).toBeGreaterThan(linie.y);
  });

  it("haelt beide Hoehen gleich weit von der Linie entfernt", () => {
    const linie = glyphen(gemischt, "notenlinie")[0]!;
    const [rechts, links] = glyphen(gemischt, "notenkopf");

    expect(linie.y - rechts!.y).toBeCloseTo(links!.y - linie.y, 10);
  });

  it("schreibt die Hand nirgends sonst hin — die Hoehe sagt sie", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const traeger = layout(m).glyphen.filter((g) => "hand" in g);

    expect(traeger.map((g) => g.typ)).toEqual(Array(4).fill("notenkopf"));
  });
});

describe("Taktstriche", () => {
  const zweiTakte = (wiederholungen: 1 | 2) =>
    marsch(
      "Zwei Takte",
      vers([6, 8], wiederholungen, dupfenTakt(6, [1, 8]), dupfenTakt(6, [1, 8])),
    );

  it("setzt einen Strich vor jeden Takt und einen am Versende", () => {
    const striche = glyphen(zweiTakte(1), "taktstrich");

    expect(striche).toHaveLength(3);
    expect(abstaende(striche.map((s) => s.x)).every((d) => d > 0)).toBe(true);
  });

  it("umschliesst die Schlaege des Verses", () => {
    const m = zweiTakte(1);
    const striche = glyphen(m, "taktstrich");
    const haelse = glyphen(m, "hals");

    expect(striche[0]!.x).toBeLessThan(haelse[0]!.x);
    expect(striche.at(-1)!.x).toBeGreaterThan(haelse.at(-1)!.x);
    expect(striche[1]!.x).toBeGreaterThan(haelse[5]!.x);
    expect(striche[1]!.x).toBeLessThan(haelse[6]!.x);
  });

  it("kreuzt die Notenlinie", () => {
    const m = zweiTakte(1);
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const strich of glyphen(m, "taktstrich")) {
      expect(strich.yOben).toBeLessThan(linie.y);
      expect(strich.yUnten).toBeGreaterThan(linie.y);
    }
  });

  it("klammert einen wiederholten Vers in Wiederholungsstriche", () => {
    expect(glyphen(zweiTakte(2), "taktstrich").map((s) => s.strichart)).toEqual([
      "wiederholungAnfang",
      "einfach",
      "wiederholungEnde",
    ]);
  });

  it("zeichnet einfache Striche, wenn der Vers nur einmal gespielt wird", () => {
    expect(glyphen(zweiTakte(1), "taktstrich").map((s) => s.strichart)).toEqual([
      "einfach",
      "einfach",
      "einfach",
    ]);
  });
});

describe("Vers-Kopf", () => {
  const zweiVerse = marsch(
    "Zwei Verse",
    vers([6, 8], 2, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(4, [1, 8])),
  );

  it("zeigt die Taktart jedes Verses", () => {
    expect(glyphen(zweiVerse, "taktart").map((t) => [t.zaehler, t.nenner])).toEqual([
      [6, 8],
      [2, 4],
    ]);
  });

  it("setzt die Taktart vor den ersten Taktstrich ihres Verses", () => {
    const taktarten = glyphen(zweiVerse, "taktart");
    const striche = glyphen(zweiVerse, "taktstrich");

    expect(taktarten[0]!.x).toBeLessThan(striche[0]!.x);
  });

  it("nummeriert die Verse ab eins", () => {
    expect(glyphen(zweiVerse, "versNummer").map((v) => v.nummer)).toEqual([1, 2]);
  });

  it("setzt die Vers-Nummer links der Taktart", () => {
    const nummern = glyphen(zweiVerse, "versNummer");
    const taktarten = glyphen(zweiVerse, "taktart");

    expect(nummern[0]!.x).toBeLessThan(taktarten[0]!.x);
    expect(nummern[1]!.x).toBeLessThan(taktarten[1]!.x);
  });

  it("haelt Kopf und Noten eines Verses auf derselben Hoehe wie seine Linie", () => {
    const linien = glyphen(zweiVerse, "notenlinie");
    const nummern = glyphen(zweiVerse, "versNummer");

    expect(nummern[0]!.y).toBeCloseTo(linien[0]!.y, 10);
    expect(nummern[1]!.y).toBeCloseTo(linien[1]!.y, 10);
  });
});

describe("Reihenfolge der Verse", () => {
  it("gibt die Glyphen eines Verses vor denen des naechsten aus", () => {
    const m = marsch(
      "Zwei Verse",
      vers([6, 8], 2, dupfenTakt(6, [1, 8])),
      vers([2, 4], 1, dupfenTakt(4, [1, 8])),
    );
    const alle = layout(m).glyphen;
    const linien = glyphen(m, "notenlinie");
    const grenze = (linien[0]!.y + linien[1]!.y) / 2;
    const versVon = (g: Glyph) => (g.typ === "hals" && g.yUnten > grenze ? 2 : 1);
    const haelse = alle.filter((g) => g.typ === "hals");

    expect(haelse.map(versVon)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
  });
});

describe("Schlepp", () => {
  const m = marsch(
    "Schlepp",
    vers([6, 8], 1, {
      schlaege: [
        schlag("Schlepp", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 8], [1, 8]),
        schlag("Dupfe", "rechts", [2, 8], [1, 8]),
      ],
      pausen: [pause([3, 8], [3, 8])],
    }),
  );

  it("stellt den Vorschlag senkrecht ueber den Notenkopf seines Schlages", () => {
    const [vorschlag, ...weitere] = glyphen(m, "vorschlag");
    const kopf = glyphen(m, "notenkopf")[0]!;

    expect(weitere).toEqual([]);
    expect(vorschlag!.x).toBeCloseTo(kopf.x, 10);
    expect(vorschlag!.yUnten).toBeLessThan(kopf.y);
    expect(vorschlag!.yOben).toBeLessThan(vorschlag!.yUnten);
  });

  it("setzt den Vorschlag an den Kopf an, statt ueber ihm zu schweben", () => {
    const vorschlag = glyphen(m, "vorschlag")[0]!;
    const kopf = glyphen(m, "notenkopf")[0]!;
    const laenge = vorschlag.yUnten - vorschlag.yOben;

    expect(kopf.y - vorschlag.yUnten).toBeLessThan(laenge);
  });

  it("zeichnet den Strich auch ueber einem linken Notenkopf nach oben", () => {
    const linkerSchlepp = marsch(
      "Links",
      vers([2, 4], 1, {
        schlaege: [schlag("Schlepp", "links", [0, 1], [1, 4])],
        pausen: [pause([1, 4], [1, 4])],
      }),
    );
    const vorschlag = glyphen(linkerSchlepp, "vorschlag")[0]!;
    const kopf = glyphen(linkerSchlepp, "notenkopf")[0]!;
    const linie = glyphen(linkerSchlepp, "notenlinie")[0]!;

    expect(kopf.y).toBeGreaterThan(linie.y);
    expect(vorschlag.yUnten).toBeLessThan(kopf.y);
    expect(vorschlag.yOben).toBeLessThan(linie.y);
  });

  it("haelt den Vorschlag kuerzer als den Hals, an dem er haengt", () => {
    const vorschlag = glyphen(m, "vorschlag")[0]!;
    const hals = glyphen(m, "hals")[0]!;

    expect(vorschlag.yUnten - vorschlag.yOben).toBeLessThan(hals.yUnten - hals.yOben);
  });

  it("gibt einer Dupfe keinen Vorschlag", () => {
    const nurDupfen = marsch("Dupfen", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    expect(glyphen(nurDupfen, "vorschlag")).toEqual([]);
  });
});

describe("Double", () => {
  /** Ein 2/4-Takt: `figur` in `hand` als freie Achtel, dann Achtelpause und Viertel. */
  const anStelle = (figur: Figur, hand: Hand = "rechts"): Marsch =>
    marsch(
      "Figur",
      vers([2, 4], 1, {
        schlaege: [schlag(figur, hand, [0, 1], [1, 8]), schlag("Dupfe", "links", [1, 4], [1, 4])],
        pausen: [pause([1, 8], [1, 8])],
      }),
    );

  const fahnenAmVorschlag = (m: Marsch): GlyphVom<"fahne">[] =>
    glyphen(m, "fahne").filter((f) => f.haengtAn === "vorschlag");

  it("zeichnet alles, was ein Schlepp an derselben Stelle hat, und eine Fahne dazu", () => {
    const schlepp = layout(anStelle("Schlepp")).glyphen;
    const double = layout(anStelle("Double")).glyphen;

    expect(double).toEqual(expect.arrayContaining([...schlepp]));
    expect(double).toHaveLength(schlepp.length + 1);
    expect(fahnenAmVorschlag(anStelle("Double"))).toHaveLength(1);
  });

  it("haengt die Fahne an das obere Ende des Vorschlags, auf beiden Haenden", () => {
    for (const hand of ["rechts", "links"] as const) {
      const m = anStelle("Double", hand);
      const [fahne] = fahnenAmVorschlag(m);
      const vorschlag = glyphen(m, "vorschlag")[0]!;

      expect(fahne!.x).toBeCloseTo(vorschlag.x, 10);
      expect(fahne!.y).toBeCloseTo(vorschlag.yOben, 10);
      expect(fahne!.anzahl).toBe(1);
    }
  });

  it("gibt einem Schlepp und einer Dupfe keine Fahne am Vorschlag", () => {
    expect(fahnenAmVorschlag(anStelle("Schlepp"))).toEqual([]);
    expect(fahnenAmVorschlag(anStelle("Dupfe"))).toEqual([]);
  });

  it("traegt die Fahne als Achtel, als Sechzehntel und gebalkt gleich", () => {
    const sechzehntel = marsch(
      "Sechzehntel",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Double", "rechts", [0, 1], [1, 16]),
          schlag("Dupfe", "links", [1, 4], [1, 4]),
        ],
        pausen: [pause([1, 16], [1, 16]), pause([1, 8], [1, 8])],
      }),
    );
    const gebalkt = marsch(
      "Gebalkt",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Double", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 8]),
          schlag("Dupfe", "rechts", [1, 4], [1, 4]),
        ],
      }),
    );

    expect(glyphen(gebalkt, "balken")).not.toEqual([]);
    for (const m of [anStelle("Double"), sechzehntel, gebalkt]) {
      expect(fahnenAmVorschlag(m).map((f) => f.anzahl)).toEqual([1]);
    }
  });
});

describe("Punkt", () => {
  const punktiert = marsch(
    "Punktiert",
    vers([6, 8], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [3, 8]),
        schlag("Dupfe", "links", [3, 8], [3, 8]),
      ],
    }),
  );

  it("gibt jedem punktierten Wert einen Punkt", () => {
    expect(glyphen(punktiert, "punkt")).toHaveLength(2);
  });

  it("setzt den Punkt rechts neben den Notenkopf, auf dessen Hoehe", () => {
    const koepfe = glyphen(punktiert, "notenkopf");
    const punkte = glyphen(punktiert, "punkt");

    punkte.forEach((punkt, i) => {
      expect(punkt.x).toBeGreaterThan(koepfe[i]!.x);
      expect(punkt.y).toBeCloseTo(koepfe[i]!.y, 10);
    });
  });

  it("haelt den Punkt naeher am Kopf als der naechste Schlag steht", () => {
    const koepfe = glyphen(punktiert, "notenkopf");
    const punkt = glyphen(punktiert, "punkt")[0]!;

    expect(punkt.x - koepfe[0]!.x).toBeLessThan(koepfe[1]!.x - koepfe[0]!.x);
  });

  it("gibt einem unpunktierten Wert keinen Punkt", () => {
    const glatt = marsch("Glatt", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    expect(glyphen(glatt, "punkt")).toEqual([]);
  });

  it("erkennt auch die punktierte Achtel", () => {
    const m = marsch(
      "Punktierte Achtel",
      vers([3, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [3, 16]),
          schlag("Dupfe", "links", [3, 16], [1, 16]),
          schlag("Dupfe", "rechts", [1, 4], [1, 8]),
        ],
      }),
    );
    expect(glyphen(m, "punkt")).toHaveLength(1);
  });
});

describe("Balken", () => {
  it("fasst die drei Achtel eines 6/8-Schlages unter einem Balken zusammen", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(2);
    expect(balken[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(haelse[3]!.x, 10);
    expect(balken[1]!.x2).toBeCloseTo(haelse[5]!.x, 10);
  });

  it("fasst die Sechzehntel eines 2/4-Taktes je Viertel zusammen", () => {
    const m = marsch("Acht Sechzehntel", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken").filter((b) => b.ebene === 1);

    expect(balken).toHaveLength(2);
    expect(balken[0]!.x2).toBeCloseTo(haelse[3]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(haelse[4]!.x, 10);
  });

  it("zieht keinen Balken ueber den Taktstrich", () => {
    const m = marsch("Zwei Takte", vers([6, 8], 1, dupfenTakt(6, [1, 8]), dupfenTakt(6, [1, 8])));
    expect(glyphen(m, "balken")).toHaveLength(4);
  });

  it("balkt keine Werte ab der Viertel", () => {
    const m = marsch(
      "Punktierte Viertel",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [3, 8]),
          schlag("Dupfe", "links", [3, 8], [3, 8]),
        ],
      }),
    );
    expect(glyphen(m, "balken")).toEqual([]);
  });

  it("laesst einen einzelnen Schlag auf einem Schlagwert unverbalkt", () => {
    const m = marsch(
      "Gemischt",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 4]),
          schlag("Dupfe", "rechts", [3, 8], [1, 8]),
          schlag("Dupfe", "links", [4, 8], [1, 8]),
          schlag("Dupfe", "rechts", [5, 8], [1, 8]),
        ],
      }),
    );
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(1);
    expect(balken[0]!.x1).toBeCloseTo(haelse[2]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[4]!.x, 10);
  });

  it("legt den Balken an die unteren Halsenden, unter die Notenlinie", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    const hals = glyphen(m, "hals")[0]!;
    const linie = glyphen(m, "notenlinie")[0]!;
    const balken = glyphen(m, "balken")[0]!;

    expect(balken.y).toBeCloseTo(hals.yUnten, 10);
    expect(balken.y).toBeGreaterThan(linie.y);
  });
});

describe("Ungueltiger Takt", () => {
  const ueberlaufender = marsch(
    "Zu voll",
    vers([6, 8], 1, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(6, [1, 8])),
  );

  it("zeichnet einen ueberlaufenden Takt nicht still, sondern wirft", () => {
    expect(() => layout(ueberlaufender)).toThrow(UngueltigerTaktError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => layout(ueberlaufender)).toThrow(/Vers 2.*Takt 1/);
  });

  it("nennt die Taktart, die ueberschritten wurde", () => {
    expect(() => layout(ueberlaufender)).toThrow(/2\/4/);
  });

  it("laesst einen exakt gefuellten Takt durch", () => {
    expect(() => layout(marsch("Voll", vers([6, 8], 1, dupfenTakt(6, [1, 8]))))).not.toThrow();
  });
});

describe("Wiederholungsklammer", () => {
  const wiederholt = marsch("Wiederholt", vers([2, 4], 2, dupfenTakt(4, [1, 8])));
  const einmal = marsch("Einmal", vers([2, 4], 1, dupfenTakt(4, [1, 8])));

  it("gibt dem einfachen Strich genau eine Linie und keine Punkte", () => {
    const [strich] = glyphen(einmal, "taktstrich");

    expect(strich!.striche).toEqual([strich!.x]);
    expect(strich!.punkte).toEqual([]);
  });

  it("stellt die schwere Linie der Klammer nach aussen", () => {
    const [anfang] = glyphen(wiederholt, "taktstrich");
    const ende = glyphen(wiederholt, "taktstrich").at(-1)!;

    expect(anfang!.striche).toHaveLength(2);
    expect(anfang!.striche[1]).toBeLessThan(anfang!.x);
    expect(ende.striche[1]).toBeGreaterThan(ende.x);
  });

  it("setzt die Punkte nach innen, zwischen Strich und Noten", () => {
    const [anfang] = glyphen(wiederholt, "taktstrich");
    const haelse = glyphen(wiederholt, "hals");

    expect(anfang!.punkte).toHaveLength(2);
    for (const punkt of anfang!.punkte) {
      expect(punkt.x).toBeGreaterThan(anfang!.x);
      expect(punkt.x).toBeLessThan(haelse[0]!.x);
    }
  });

  it("verteilt die zwei Punkte um die Notenlinie", () => {
    const [anfang] = glyphen(wiederholt, "taktstrich");
    const linie = glyphen(wiederholt, "notenlinie")[0]!;
    const [oben, unten] = anfang!.punkte;

    expect(oben!.y).toBeLessThan(linie.y);
    expect(unten!.y).toBeGreaterThan(linie.y);
    expect(linie.y - oben!.y).toBeCloseTo(unten!.y - linie.y, 10);
  });
});

describe("Fahne", () => {
  it("gibt einem unverbalkten Achtel eine Fahne", () => {
    const m = marsch(
      "Einzelnes Achtel",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 4]),
          schlag("Dupfe", "rechts", [3, 8], [3, 8]),
        ],
      }),
    );
    const [fahne, ...weitere] = glyphen(m, "fahne");
    const haelse = glyphen(m, "hals");

    expect(weitere).toEqual([]);
    expect(fahne!.x).toBeCloseTo(haelse[0]!.x, 10);
    expect(fahne!.anzahl).toBe(1);
  });

  it("gibt einem Sechzehntel zwei Fahnen", () => {
    const m = marsch(
      "Sechzehntel allein",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 16]),
          schlag("Dupfe", "links", [1, 4], [1, 4]),
        ],
        pausen: [pause([1, 16], [1, 16]), pause([1, 8], [1, 8])],
      }),
    );
    expect(glyphen(m, "fahne").map((f) => f.anzahl)).toEqual([2]);
  });

  it("gibt Werten ab der Viertel keine Fahne", () => {
    const m = marsch(
      "Punktierte Viertel",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [3, 8]),
          schlag("Dupfe", "links", [3, 8], [3, 8]),
        ],
      }),
    );
    expect(glyphen(m, "fahne")).toEqual([]);
  });

  it("gibt verbalkten Schlaegen keine Fahne — der Balken sagt es schon", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    expect(glyphen(m, "fahne")).toEqual([]);
  });

  it("setzt die Fahne ans untere Ende des Halses", () => {
    const m = marsch(
      "Einzelnes Achtel",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 4], [1, 4]),
        ],
        pausen: [pause([1, 8], [1, 8])],
      }),
    );
    expect(glyphen(m, "fahne")[0]!.y).toBeCloseTo(glyphen(m, "hals")[0]!.yUnten, 10);
  });
});

describe("Balkenzahl", () => {
  it("balkt Achtel einfach", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    expect(glyphen(m, "balken").map((b) => b.ebene)).toEqual([1, 1]);
  });

  it("balkt Sechzehntel doppelt, beide Balken ueber die ganze Gruppe", () => {
    const m = marsch("Acht Sechzehntel", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1, 2, 1, 2]);
    balken.forEach((b, i) => {
      const erster = i < 2 ? 0 : 4;
      expect(b.x1).toBeCloseTo(haelse[erster]!.x, 10);
      expect(b.x2).toBeCloseTo(haelse[erster + 3]!.x, 10);
    });
  });
});

describe("Gemischte Balkengruppe", () => {
  it("spannt bei Achtel, Sechzehntel, Sechzehntel den zweiten Balken nur ueber die Sechzehntel", () => {
    const m = reihe([1, 8], [1, 16], [1, 16], [1, 4]);
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1, 2]);
    expect(balken[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(haelse[1]!.x, 10);
    expect(balken[1]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(glyphen(m, "balkenstummel")).toEqual([]);
  });

  it("gibt bei Sechzehntel, Achtel, Sechzehntel beiden Sechzehnteln einen Stummel nach innen", () => {
    const m = reihe([1, 16], [1, 8], [1, 16], [1, 4]);
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");
    const stummel = glyphen(m, "balkenstummel");

    expect(balken.map((b) => b.ebene)).toEqual([1]);
    expect(balken[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(stummel).toHaveLength(2);
    expect(stummel[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(stummel[0]!.x2).toBeGreaterThan(haelse[0]!.x);
    expect(stummel[1]!.x1).toBeCloseTo(haelse[2]!.x, 10);
    expect(stummel[1]!.x2).toBeLessThan(haelse[2]!.x);
    expect(stummel.map((s) => s.ebene)).toEqual([2, 2]);
    expect(stummel[0]!.y).toBeCloseTo(balken[0]!.y, 10);
  });

  it("gibt der Sechzehntel nach einer punktierten Achtel einen Stummel nach links", () => {
    const m = reihe([3, 16], [1, 16], [1, 4]);
    const haelse = glyphen(m, "hals");
    const stummel = glyphen(m, "balkenstummel");

    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1]);
    expect(balken[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[1]!.x, 10);
    expect(stummel).toHaveLength(1);
    expect(stummel[0]!.x1).toBeCloseTo(haelse[1]!.x, 10);
    expect(stummel[0]!.x2).toBeLessThan(haelse[1]!.x);
    expect(stummel[0]!.ebene).toBe(2);
  });

  it("haelt jeden Stummel innerhalb seiner Gruppe, zwischen erstem und letztem Hals", () => {
    for (const m of [reihe([1, 16], [1, 8], [1, 16], [1, 4]), reihe([3, 16], [1, 16], [1, 4])]) {
      const balken = glyphen(m, "balken").find((b) => b.ebene === 1)!;
      for (const s of glyphen(m, "balkenstummel")) {
        for (const x of [s.x1, s.x2]) {
          expect(x).toBeGreaterThanOrEqual(balken.x1);
          expect(x).toBeLessThanOrEqual(balken.x2);
        }
      }
    }
  });

  it("balkt einen Fuenferruf auf der Zaehlzeit mit den Sechzehnteln danach", () => {
    const m = marsch(
      "Ruf mit Sechzehnteln",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "rechts", [1, 8], [1, 16]),
          schlag("Dupfe", "links", [3, 16], [1, 16]),
          schlag("Dupfe", "rechts", [1, 4], [1, 4]),
        ],
      }),
    );
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1, 2]);
    expect(balken[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(haelse[1]!.x, 10);
    expect(balken[1]!.x2).toBeCloseTo(haelse[2]!.x, 10);
    expect(glyphen(m, "balkenstummel")).toEqual([]);
    expect(glyphen(m, "wirbelstriche")[0]!.x).toBeCloseTo(haelse[0]!.x, 10);

    const koepfe = glyphen(m, "notenkopf");
    const [bogen, ...weitere] = glyphen(m, "bogen");
    expect(weitere).toEqual([]);
    expect(bogen!.x1).toBeGreaterThan(koepfe[0]!.x - koepfe[0]!.breite / 2);
    expect(bogen!.x1).toBeLessThan(koepfe[0]!.x + koepfe[0]!.breite / 2);
    expect(bogen!.x2).toBeGreaterThan(koepfe[1]!.x - koepfe[1]!.breite / 2);
    expect(bogen!.x2).toBeLessThan(koepfe[1]!.x + koepfe[1]!.breite / 2);
  });
});

describe("Pause", () => {
  /** 2/4: Achtelpause, links, rechts, links | rechts, Achtelpause, Viertelpause. */
  const mitPausen = marsch(
    "Pausen",
    vers(
      [2, 4],
      1,
      {
        schlaege: [
          schlag("Dupfe", "links", [1, 8], [1, 8]),
          schlag("Dupfe", "rechts", [1, 4], [1, 8]),
          schlag("Dupfe", "links", [3, 8], [1, 8]),
        ],
        pausen: [pause([0, 1], [1, 8])],
      },
      {
        schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 8])],
        pausen: [pause([1, 8], [1, 8]), pause([1, 4], [1, 4])],
      },
    ),
  );

  it("zeichnet jede Pause mit ihrer Art", () => {
    expect(glyphen(mitPausen, "pause").map((p) => p.art)).toEqual([
      "Achtelpause",
      "Achtelpause",
      "Viertelpause",
    ]);
  });

  it("setzt jede Pause gleich tief unter die Notenlinie, gleich welche Hand daneben spielt", () => {
    const linie = glyphen(mitPausen, "notenlinie")[0]!;
    const [erste, ...weitere] = glyphen(mitPausen, "pause");

    expect(erste!.y).toBeGreaterThan(linie.y);
    for (const p of weitere) expect(p.y).toBeCloseTo(erste!.y, 10);
  });

  it("reiht die Pausen nach ihrer Position zwischen die Schlaege", () => {
    const koepfe = glyphen(mitPausen, "notenkopf");
    const pausen = glyphen(mitPausen, "pause");

    expect(pausen[0]!.x).toBeLessThan(koepfe[0]!.x);
    expect(pausen[1]!.x).toBeGreaterThan(koepfe[3]!.x);
    expect(pausen[2]!.x).toBeGreaterThan(pausen[1]!.x);
    // Gleicher Zeitabstand, gleicher Weg: die Pause steht auf der Zeitachse der Schlaege.
    expect(koepfe[0]!.x - pausen[0]!.x).toBeCloseTo(koepfe[1]!.x - koepfe[0]!.x, 10);
  });

  it("laesst eine Pause am Beginn der Zaehlzeit ausserhalb des Balkens", () => {
    const m = marsch(
      "Pause vor Sechzehnteln",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [1, 16], [1, 16]),
          schlag("Dupfe", "links", [1, 8], [1, 16]),
          schlag("Dupfe", "rechts", [3, 16], [1, 16]),
          schlag("Dupfe", "links", [1, 4], [1, 4]),
        ],
        pausen: [pause([0, 1], [1, 16])],
      }),
    );
    const haelse = glyphen(m, "hals");
    const vorne = glyphen(m, "pause")[0]!;
    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1, 2]);
    for (const b of balken) {
      expect(b.x1).toBeCloseTo(haelse[0]!.x, 10);
      expect(b.x1).toBeGreaterThan(vorne.x);
    }
  });

  it("laesst den Balken ueber eine Pause mitten in der Zaehlzeit laufen", () => {
    const m = marsch(
      "Pause in der Mitte",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 4], [1, 8]),
          schlag("Dupfe", "rechts", [3, 8], [3, 8]),
        ],
        pausen: [pause([1, 8], [1, 8])],
      }),
    );
    const haelse = glyphen(m, "hals");
    const [balken, ...weitere] = glyphen(m, "balken");
    const mitte = glyphen(m, "pause")[0]!;

    expect(weitere).toEqual([]);
    expect(balken!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(balken!.x2).toBeCloseTo(haelse[1]!.x, 10);
    expect(mitte.x).toBeGreaterThan(balken!.x1);
    expect(mitte.x).toBeLessThan(balken!.x2);
  });

  it("gibt einer punktierten Pause einen Punkt rechts neben sich", () => {
    const m = marsch(
      "Punktierte Pause",
      vers([6, 8], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [3, 8], [1, 8]),
          schlag("Dupfe", "links", [1, 2], [1, 8]),
          schlag("Dupfe", "rechts", [5, 8], [1, 8]),
        ],
        pausen: [pause([0, 1], [3, 8])],
      }),
    );
    const [p] = glyphen(m, "pause");
    const [punkt, ...weitere] = glyphen(m, "punkt");
    const kopf = glyphen(m, "notenkopf")[0]!;
    const linie = glyphen(m, "notenlinie")[0]!;

    expect(p!.art).toBe("Viertelpause");
    expect(weitere).toEqual([]);
    expect(punkt!.x).toBeGreaterThan(p!.x);
    expect(punkt!.x).toBeLessThan(kopf.x);
    expect(punkt!.y).toBeGreaterThan(linie.y);
    expect(punkt!.y).toBeLessThan(p!.y);
  });

  it("erkennt die Sechzehntelpause", () => {
    const m = marsch(
      "Sechzehntelpause",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [1, 16], [3, 16]),
          schlag("Dupfe", "links", [1, 4], [1, 4]),
        ],
        pausen: [pause([0, 1], [1, 16])],
      }),
    );
    expect(glyphen(m, "pause").map((p) => p.art)).toEqual(["Sechzehntelpause"]);
  });

  it("zeichnet eine halbe Pause nicht still, sondern wirft und nennt Vers und Takt", () => {
    const m = marsch(
      "Halbe Pause",
      vers([2, 4], 1, { schlaege: [], pausen: [pause([0, 1], [1, 2])] }),
    );

    expect(() => layout(m)).toThrow(UnzeichenbarePauseError);
    expect(() => layout(m)).toThrow(/Vers 1, Takt 1/);
  });
});

describe("Fuenferruf", () => {
  it("zeichnet einen Fuenferruf ohne Landung nicht, sondern wirft", () => {
    const m = marsch(
      "Ohne Landung",
      vers([2, 4], 1, {
        schlaege: [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
        pausen: [pause([0, 1], [3, 8])],
      }),
    );
    expect(() => layout(m)).toThrow(UngueltigerRufError);
  });

  /** 2/4: Fuenferruf rechts auf der ersten Achtel, Landung auf der zweiten, dann eine Viertel. */
  const imTakt = marsch(
    "Ruf im Takt",
    vers([2, 4], 1, {
      schlaege: [
        schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "rechts", [1, 8], [1, 8]),
        schlag("Dupfe", "links", [1, 4], [1, 4]),
      ],
    }),
  );

  it("zeichnet den Ruf als Schlepp, mit Vorschlag ueber seinem Kopf", () => {
    const [vorschlag, ...weitere] = glyphen(imTakt, "vorschlag");
    const rufKopf = glyphen(imTakt, "notenkopf")[0]!;

    expect(weitere).toEqual([]);
    expect(vorschlag!.x).toBe(rufKopf.x);
  });

  it("setzt einen Wirbel aus zwei Strichen auf den Hals des Rufs", () => {
    const [striche, ...weitere] = glyphen(imTakt, "wirbelstriche");
    const rufHals = glyphen(imTakt, "hals")[0]!;

    expect(weitere).toEqual([]);
    expect(striche!.anzahl).toBe(2);
    expect(striche!.x).toBe(rufHals.x);
    expect(striche!.y).toBeGreaterThan(rufHals.yOben);
    expect(striche!.y).toBeLessThan(rufHals.yUnten);
  });

  /** 2/4: Fuenferruf auf der letzten Achtel, Landung auf dem naechsten Taktbeginn. */
  const ueberDenTaktstrich = marsch(
    "Ruf ueber den Taktstrich",
    vers(
      [2, 4],
      1,
      {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 4]),
          schlag("Dupfe", "links", [1, 4], [1, 8]),
          schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
        ],
      },
      { schlaege: [schlag("Dupfe", "rechts", [0, 1], [2, 4])] },
    ),
  );

  /** Ob ein Punkt ueber dem Kopf steht, waagrecht innerhalb seiner Breite. */
  const ueberKopf = (x: number, y: number, kopf: GlyphVom<"notenkopf">): boolean =>
    Math.abs(x - kopf.x) <= kopf.breite / 2 && y < kopf.y - kopf.hoehe / 2;

  it("schlaegt einen Bogen vom Kopf des Rufs zum Kopf der Landung", () => {
    const [bogen, ...weitere] = glyphen(imTakt, "bogen");
    const [rufKopf, landungKopf] = glyphen(imTakt, "notenkopf");

    expect(weitere).toEqual([]);
    expect(ueberKopf(bogen!.x1, bogen!.y1, rufKopf!)).toBe(true);
    expect(ueberKopf(bogen!.x2, bogen!.y2, landungKopf!)).toBe(true);
    expect(bogen!.scheitelY).toBeLessThan(Math.min(bogen!.y1, bogen!.y2));
  });

  it("fuehrt den Bogen ueber den Taktstrich zur Landung im naechsten Takt", () => {
    const [bogen] = glyphen(ueberDenTaktstrich, "bogen");
    const koepfe = glyphen(ueberDenTaktstrich, "notenkopf");
    const zwischen = glyphen(ueberDenTaktstrich, "taktstrich")[1]!;

    expect(ueberKopf(bogen!.x1, bogen!.y1, koepfe[2]!)).toBe(true);
    expect(ueberKopf(bogen!.x2, bogen!.y2, koepfe[3]!)).toBe(true);
    expect(bogen!.x1).toBeLessThan(zwischen.x);
    expect(bogen!.x2).toBeGreaterThan(zwischen.x);
  });

  it("schreibt die 5 ueber den Bogen, zwischen seine Enden", () => {
    const [zahl, ...weitere] = glyphen(imTakt, "rufZahl");
    const [bogen] = glyphen(imTakt, "bogen");

    expect(weitere).toEqual([]);
    expect(zahl!.text).toBe("5");
    expect(zahl!.x).toBeGreaterThan(bogen!.x1);
    expect(zahl!.x).toBeLessThan(bogen!.x2);
    expect(zahl!.y).toBeLessThan(bogen!.scheitelY);
  });

  describe("der auf eine Zaehlzeit fuehrt", () => {
    // In `ueberDenTaktstrich` steht der Ruf auf der letzten Achtel, hinter einer
    // Achtel-Dupfe auf derselben Zaehlzeit, und landet auf dem naechsten Taktbeginn.
    const ruf = () => ({
      kopf: glyphen(ueberDenTaktstrich, "notenkopf")[2]!,
      hals: glyphen(ueberDenTaktstrich, "hals")[2]!,
    });

    it("wird nicht mit der Achtel davor gebalkt, sondern traegt seine Fahne", () => {
      const { hals } = ruf();
      const balken = glyphen(ueberDenTaktstrich, "balken");
      const fahnen = glyphen(ueberDenTaktstrich, "fahne");

      expect(balken.some((b) => b.x1 <= hals.x && hals.x <= b.x2)).toBe(false);
      expect(fahnen.filter((f) => f.x === hals.x).map((f) => f.anzahl)).toEqual([1]);
    });

    it("ist kleiner als ein gewoehnlicher Schlag, mit kuerzerem Hals", () => {
      const { kopf, hals } = ruf();
      const landung = glyphen(ueberDenTaktstrich, "notenkopf")[3]!;
      const davor = glyphen(ueberDenTaktstrich, "hals")[1]!;

      expect(kopf.hoehe).toBeLessThan(landung.hoehe);
      expect(kopf.breite).toBeLessThan(landung.breite);
      expect(hals.yUnten).toBeLessThan(davor.yUnten);
      expect(glyphen(ueberDenTaktstrich, "fahne").find((f) => f.x === hals.x)!.y).toBe(hals.yUnten);
    });

    it("bleibt auf der Seite der Linie, die seine Hand sagt", () => {
      const { kopf } = ruf();
      const linie = glyphen(ueberDenTaktstrich, "notenlinie")[0]!;

      expect(kopf.y + kopf.hoehe / 2).toBeLessThan(linie.y);
    });

    it("traegt den Wirbel weiter auf seinem kurzen Hals", () => {
      const { hals } = ruf();
      const [striche] = glyphen(ueberDenTaktstrich, "wirbelstriche");

      expect(striche!.x).toBe(hals.x);
      expect(striche!.y).toBeGreaterThan(hals.yOben);
      expect(striche!.y).toBeLessThan(hals.yUnten);
    });
  });

  it("balkt einen Ruf, der auf einer Zaehlzeit beginnt, wie gewohnt in seiner Gruppe", () => {
    const rufHals = glyphen(imTakt, "hals")[0]!;
    const balken = glyphen(imTakt, "balken");

    expect(balken.some((b) => b.x1 === rufHals.x)).toBe(true);
    expect(glyphen(imTakt, "notenkopf")[0]!.hoehe).toBe(glyphen(imTakt, "notenkopf")[1]!.hoehe);
  });
});

describe("Auftakt", () => {
  /** Viertel und Viertelpause: Platz, ueber den der Auftakt bei der Wiederholung faellt. */
  const schluss: Taktentwurf = {
    schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4])],
    pausen: [pause([1, 4], [1, 4])],
  };
  /** ZicZac, Vers 1: freier Fuenferruf auf der letzten Achtel, Landung auf Takt 1. */
  const rufAuftakt = marsch(
    "Ruf-Auftakt",
    mitAuftakt(
      [2, 4],
      2,
      { schlaege: [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])] },
      dupfenTakt(4, [1, 8]),
      schluss,
    ),
  );

  it("setzt den Auftakt zwischen Taktart und ersten Taktstrich", () => {
    const taktart = glyphen(rufAuftakt, "taktart")[0]!;
    const linie = glyphen(rufAuftakt, "notenlinie")[0]!;
    const erster = glyphen(rufAuftakt, "taktstrich")[0]!;
    const koepfe = glyphen(rufAuftakt, "notenkopf");
    const bogen = glyphen(rufAuftakt, "bogen")[0]!;
    const vorDemStrich = layout(rufAuftakt).glyphen.filter(
      (g): g is Extract<Glyph, { x: number }> =>
        "x" in g && !["titel", "versNummer", "taktart"].includes(g.typ) && g.x < erster.x,
    );

    expect(new Set(vorDemStrich.map((g) => g.typ))).toEqual(
      new Set(["hals", "notenkopf", "vorschlag", "wirbelstriche", "fahne", "rufZahl"]),
    );
    for (const g of [...vorDemStrich, { x: bogen.x1 }]) {
      expect(g.x).toBeGreaterThan(taktart.x);
      expect(g.x).toBeGreaterThanOrEqual(linie.x1);
    }
    for (const k of koepfe.slice(1)) expect(k.x).toBeGreaterThan(erster.x);
  });

  it("nennt den Auftakt, wenn eine Pause darin nicht gezeichnet werden kann", () => {
    const m = marsch(
      "Halbe Pause im Auftakt",
      mitAuftakt(
        [3, 4],
        1,
        {
          schlaege: [schlag("Dupfe", "rechts", [1, 16], [3, 16])],
          pausen: [pause([1, 4], [1, 2])],
        },
        { schlaege: [schlag("Dupfe", "rechts", [0, 1], [3, 4])] },
      ),
    );
    expect(() => layout(m)).toThrow(UnzeichenbarePauseError);
    expect(() => layout(m)).toThrow(/Vers 1, Auftakt/);
  });

  it("laesst die Notenlinie am Auftakt beginnen, ohne Taktstrich davor", () => {
    const linie = glyphen(rufAuftakt, "notenlinie")[0]!;
    const striche = glyphen(rufAuftakt, "taktstrich");
    const kopf = glyphen(rufAuftakt, "notenkopf")[0]!;

    expect(linie.x1).toBeLessThan(kopf.x);
    expect(striche.every((s) => s.x > kopf.x)).toBe(true);
  });

  it("stellt das Wiederholungszeichen nach den Auftakt, an Takt 1", () => {
    const [erster] = glyphen(rufAuftakt, "taktstrich");
    expect(erster!.strichart).toBe("wiederholungAnfang");
  });

  it("macht den Auftakt so breit, wie er dauert", () => {
    const sechzehntel = marsch(
      "Kurz",
      mitAuftakt([2, 4], 1, { schlaege: [schlag("Dupfe", "rechts", [7, 16], [1, 16])] }, schluss),
    );
    const achtel = marsch(
      "Lang",
      mitAuftakt([2, 4], 1, { schlaege: [schlag("Dupfe", "rechts", [3, 8], [1, 8])] }, schluss),
    );
    const strichX = (m: Marsch) => glyphen(m, "taktstrich")[0]!.x;
    const [erste, zweite] = glyphen(
      marsch("Zwei Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8]))),
      "hals",
    );

    // Eine Sechzehntel mehr Auftakt schiebt den Taktstrich um eine halbe Achtel weiter.
    expect(strichX(achtel) - strichX(sechzehntel)).toBeCloseTo((zweite!.x - erste!.x) / 2, 10);
  });

  it("zeichnet einen Fuenferruf im Auftakt frei: ungebalkt, kleiner, mit Fahne", () => {
    const koepfe = glyphen(rufAuftakt, "notenkopf");
    const erster = glyphen(rufAuftakt, "taktstrich")[0]!;
    const balken = glyphen(rufAuftakt, "balken");

    expect(koepfe[0]!.hoehe).toBeLessThan(koepfe[1]!.hoehe);
    expect(balken.every((b) => b.x1 > erster.x)).toBe(true);
    expect(glyphen(rufAuftakt, "fahne")[0]!.x).toBeLessThan(erster.x);
  });

  it("schlaegt den Bogen vom Ruf im Auftakt ueber den Taktstrich zum ersten Kopf in Takt 1", () => {
    const koepfe = glyphen(rufAuftakt, "notenkopf");
    const erster = glyphen(rufAuftakt, "taktstrich")[0]!;
    const [bogen, ...weitere] = glyphen(rufAuftakt, "bogen");

    expect(weitere).toEqual([]);
    expect(bogen!.x1).toBeLessThan(erster.x);
    expect(bogen!.x2).toBeGreaterThan(koepfe[1]!.x - koepfe[1]!.breite / 2);
    expect(bogen!.x2).toBeLessThan(koepfe[1]!.x + koepfe[1]!.breite / 2);
    expect(glyphen(rufAuftakt, "rufZahl")).toHaveLength(1);
  });

  it("balkt zwei Sechzehntel im Auftakt zusammen, mit zwei Balken (ZicZac, Vers 6)", () => {
    const m = marsch(
      "Sechzehntel-Auftakt",
      mitAuftakt(
        [2, 4],
        1,
        {
          schlaege: [
            schlag("Dupfe", "links", [3, 8], [1, 16]),
            schlag("Dupfe", "links", [7, 16], [1, 16]),
          ],
        },
        schluss,
      ),
    );
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken.map((b) => b.ebene)).toEqual([1, 2]);
    for (const b of balken) {
      expect(b.x1).toBeCloseTo(haelse[0]!.x, 10);
      expect(b.x2).toBeCloseTo(haelse[1]!.x, 10);
    }
  });

  it("setzt in einem Vers ohne Auftakt den ersten Taktstrich an den Linienanfang", () => {
    const ohne = marsch("Ohne", vers([2, 4], 2, dupfenTakt(4, [1, 8]), schluss));
    const linie = glyphen(ohne, "notenlinie")[0]!;
    const erster = glyphen(ohne, "taktstrich")[0]!;

    expect(erster.x).toBeCloseTo(linie.x1, 10);
    expect(erster.strichart).toBe("wiederholungAnfang");
  });
});

describe("Tole", () => {
  /** ZicZac, Vers 1, Takt 3: vier Sechzehntel, dann eine Quintole aus Achtel, Sechzehntel, Achtel. */
  const quintolenTakt = (): Taktentwurf => ({
    schlaege: [
      schlag("Double", "rechts", [0, 1], [1, 16]),
      schlag("Dupfe", "links", [1, 16], [1, 16]),
      schlag("Dupfe", "rechts", [1, 8], [1, 16]),
      schlag("Dupfe", "rechts", [3, 16], [1, 16]),
      schlag("Dupfe", "links", [1, 4], [1, 8]),
      schlag("Dupfe", "links", [7, 20], [1, 16]),
      schlag("Dupfe", "rechts", [2, 5], [1, 8]),
    ],
    tolen: [{ position: bruch(1, 4), anzahl: 5, statt: 4, einheit: bruch(1, 16) }],
  });
  const quintole = () => marsch("Quintole", vers([2, 4], 1, quintolenTakt()));

  it("zeichnet die Zahl der Tole mittig zwischen dem ersten und letzten Hals ihrer Schlaege", () => {
    const haelse = glyphen(quintole(), "hals");
    const [zahl] = glyphen(quintole(), "toleZahl");

    expect(zahl!.text).toBe("5");
    expect(zahl!.x).toBeCloseTo((haelse[4]!.x + haelse[6]!.x) / 2, 10);
  });

  it("legt die Zahl unter die Balken ihrer Schlaege", () => {
    const [zahl] = glyphen(quintole(), "toleZahl");
    const balken = [...glyphen(quintole(), "balken"), ...glyphen(quintole(), "balkenstummel")];

    expect(balken.length).toBeGreaterThan(0);
    for (const b of balken) expect(zahl!.y).toBeGreaterThan(b.y);
  });

  it("zeichnet in einem Takt ohne Tole keine Zahl", () => {
    const m = marsch("Ohne", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    expect(glyphen(m, "toleZahl")).toEqual([]);
  });

  it("gibt der Sechzehntel der Quintole einen Balkenstummel nach links", () => {
    const haelse = glyphen(quintole(), "hals");
    const stummel = glyphen(quintole(), "balkenstummel");

    expect(stummel).toHaveLength(1);
    expect(stummel[0]!.x1).toBeCloseTo(haelse[5]!.x, 10);
    expect(stummel[0]!.x2).toBeLessThan(stummel[0]!.x1);
  });
});

describe("Dreierruf", () => {
  /** Zwei 2/4-Takte: Viertel, dann `figur` links auf der zweiten Viertel | `figur` rechts. */
  const zweiTakte = (figur: Figur) =>
    marsch(
      "Dreierruf",
      vers(
        [2, 4],
        1,
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [1, 4]),
            schlag(figur, "links", [1, 4], [1, 4]),
          ],
        },
        { schlaege: [schlag(figur, "rechts", [0, 1], [2, 4])] },
      ),
    );

  it("zeichnet alles, was eine Dupfe an derselben Stelle hat, und dazu je ein Zeichen", () => {
    const ohneZeichen = layout(zweiTakte("Dreierruf")).glyphen.filter(
      (g) => g.typ !== "gerollteDupfe" && g.typ !== "titel",
    );
    const dupfen = layout(zweiTakte("Dupfe")).glyphen.filter((g) => g.typ !== "titel");

    expect(ohneZeichen).toEqual(dupfen);
    expect(glyphen(zweiTakte("Dreierruf"), "gerollteDupfe")).toHaveLength(2);
  });

  it("setzt das Zeichen mittig zwischen den vorigen Notenkopf und den der Landung", () => {
    const koepfe = glyphen(zweiTakte("Dreierruf"), "notenkopf");
    const [zeichen] = glyphen(zweiTakte("Dreierruf"), "gerollteDupfe");

    expect(zeichen!.x).toBeCloseTo((koepfe[0]!.x + koepfe[1]!.x) / 2, 10);
  });

  it("setzt das Zeichen einer Landung am Taktbeginn mittig vor den Taktstrich", () => {
    const koepfe = glyphen(zweiTakte("Dreierruf"), "notenkopf");
    const strich = glyphen(zweiTakte("Dreierruf"), "taktstrich")[1]!;
    const zeichen = glyphen(zweiTakte("Dreierruf"), "gerollteDupfe")[1]!;

    expect(zeichen.x).toBeLessThan(strich.x);
    expect(zeichen.x).toBeCloseTo((koepfe[1]!.x + strich.x) / 2, 10);
  });

  it("setzt das Zeichen auf die Seite der anderen Hand, naeher an die Linie als ihr Kopf", () => {
    const linie = glyphen(zweiTakte("Dreierruf"), "notenlinie")[0]!;
    const [rechts, links] = glyphen(zweiTakte("Dreierruf"), "notenkopf");
    const [vorLinks, vorRechts] = glyphen(zweiTakte("Dreierruf"), "gerollteDupfe");

    expect(vorLinks!.hand).toBe("rechts");
    expect(vorLinks!.y).toBeLessThan(linie.y);
    expect(vorLinks!.y).toBeGreaterThan(rechts!.y);
    expect(vorRechts!.hand).toBe("links");
    expect(vorRechts!.y).toBeGreaterThan(linie.y);
    expect(vorRechts!.y).toBeLessThan(links!.y);
  });

  it("setzt das Zeichen eines Dreierrufs auf Takt 1 hinter den Auftakt", () => {
    const m = marsch(
      "Aus dem Auftakt",
      mitAuftakt(
        [2, 4],
        1,
        { schlaege: [schlag("Dupfe", "links", [1, 4], [1, 4])] },
        { schlaege: [schlag("Dreierruf", "rechts", [0, 1], [2, 4])] },
      ),
    );
    const [auftakt] = glyphen(m, "notenkopf");
    const [strich] = glyphen(m, "taktstrich");
    const [zeichen] = glyphen(m, "gerollteDupfe");

    expect(zeichen!.x).toBeCloseTo((auftakt!.x + strich!.x) / 2, 10);
  });
});
