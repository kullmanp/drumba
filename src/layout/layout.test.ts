import { describe, expect, it } from "vitest";
import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Vers } from "../model/marsch";
import type { Glyph, GlyphTyp } from "./layout";
import { UngültigerTaktError } from "../model/marsch";
import { layout, UngleicheBalkengruppeError } from "./layout";

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
});

const vers = (taktart: [number, number], wiederholungen: 1 | 2, ...takte: Takt[]): Vers => ({
  taktart: { zähler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  takte,
});

const marsch = (titel: string, ...verse: Vers[]): Marsch => ({ titel, verse });

type GlyphVom<T extends GlyphTyp> = Extract<Glyph, { typ: T }>;

const glyphen = <T extends GlyphTyp>(m: Marsch, typ: T): GlyphVom<T>[] =>
  layout(m).glyphen.filter((g): g is GlyphVom<T> => g.typ === typ);

/** Die Abstände zwischen aufeinanderfolgenden Werten. */
const abstände = (werte: number[]): number[] => werte.slice(1).map((wert, i) => wert - werte[i]!);

// --- Tests -----------------------------------------------------------------

describe("Titel", () => {
  it("zeichnet den Titel des Marsches über den Noten", () => {
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

  it("spannt die Linie über alle Takte des Verses", () => {
    const m = marsch("Zwei Takte", vers([6, 8], 2, dupfenTakt(6, [1, 8]), dupfenTakt(6, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;
    const hälse = glyphen(m, "hals");

    expect(linie.x1).toBeLessThan(hälse[0]!.x);
    expect(linie.x2).toBeGreaterThan(hälse.at(-1)!.x);
  });
});

describe("Schläge im Takt", () => {
  it("zeichnet einen Hals je Schlag, von links nach rechts", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const hälse = glyphen(m, "hals");

    expect(hälse).toHaveLength(6);
    expect(abstände(hälse.map((h) => h.x)).every((d) => d > 0)).toBe(true);
  });

  it("setzt gleich lange Schläge in gleiche Abstände", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const [erster, ...weitere] = abstände(glyphen(m, "hals").map((h) => h.x));

    for (const abstand of weitere) expect(abstand).toBeCloseTo(erster!, 10);
  });

  it("setzt die Abstände proportional zum rhythmischen Abstand", () => {
    // Achtel, Achtel, punktierte Viertel: die Lücken verhalten sich wie 1 : 1 : 3.
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
    const [a, b, c] = abstände(glyphen(m, "hals").map((h) => h.x));

    expect(b).toBeCloseTo(a!, 10);
    expect(c).toBeCloseTo(a! * 3, 10);
  });

  it("hängt die Hälse nach unten, unter die Notenlinie", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const hals of glyphen(m, "hals")) {
      expect(hals.yUnten).toBeGreaterThan(linie.y);
      expect(hals.yOben).toBeLessThan(hals.yUnten);
    }
  });

  it("führt jeden Hals bis auf die Höhe seines Notenkopfes", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const hälse = glyphen(m, "hals");
    const köpfe = glyphen(m, "notenkopf");

    expect(hälse.map((h) => h.yOben)).toEqual(köpfe.map((k) => k.y));
  });

  it("setzt den Hals an die linke Flanke des Kopfes, nicht durch dessen Mitte", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const hälse = glyphen(m, "hals");
    const köpfe = glyphen(m, "notenkopf");

    for (const [hals, kopf] of hälse.map((h, i) => [h, köpfe[i]!] as const)) {
      const versatz = kopf.x - hals.x;
      // Links der Mitte, aber innerhalb des Kopfes: er steht an dessen Rand.
      expect(versatz).toBeGreaterThan(kopf.breite / 4);
      expect(versatz).toBeLessThan(kopf.breite / 2);
    }
  });

  it("hält den Kopf frei von der Notenlinie, statt sie zu berühren", () => {
    const m = marsch(
      "Zwei",
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 8]),
          schlag("Dupfe", "links", [1, 8], [1, 8]),
        ],
      }),
    );
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const kopf of glyphen(m, "notenkopf")) {
      const spalt = Math.abs(kopf.y - linie.y) - kopf.höhe / 2;
      expect(spalt).toBeGreaterThan(0);
    }
  });

  it("endet mit allen Hälsen eines Taktes gleich tief — sie teilen den Balken", () => {
    // Rechts und links wechseln, die Köpfe liegen also verschieden hoch.
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
    }),
  );

  it("gibt jedem Schlag genau einen Kopf, von links nach rechts", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const köpfe = glyphen(m, "notenkopf");

    expect(köpfe).toHaveLength(6);
    expect(abstände(köpfe.map((k) => k.x)).every((d) => d > 0)).toBe(true);
  });

  it("setzt einen rechten Schlag über die Notenlinie und einen linken darunter", () => {
    const linie = glyphen(gemischt, "notenlinie")[0]!;
    const [rechts, links] = glyphen(gemischt, "notenkopf");

    expect(rechts!.hand).toBe("rechts");
    expect(rechts!.y).toBeLessThan(linie.y);
    expect(links!.hand).toBe("links");
    expect(links!.y).toBeGreaterThan(linie.y);
  });

  it("hält beide Höhen gleich weit von der Linie entfernt", () => {
    const linie = glyphen(gemischt, "notenlinie")[0]!;
    const [rechts, links] = glyphen(gemischt, "notenkopf");

    expect(linie.y - rechts!.y).toBeCloseTo(links!.y - linie.y, 10);
  });

  it("schreibt die Hand nirgends sonst hin — die Höhe sagt sie", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const träger = layout(m).glyphen.filter((g) => "hand" in g);

    expect(träger.map((g) => g.typ)).toEqual(Array(4).fill("notenkopf"));
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
    expect(abstände(striche.map((s) => s.x)).every((d) => d > 0)).toBe(true);
  });

  it("umschliesst die Schläge des Verses", () => {
    const m = zweiTakte(1);
    const striche = glyphen(m, "taktstrich");
    const hälse = glyphen(m, "hals");

    expect(striche[0]!.x).toBeLessThan(hälse[0]!.x);
    expect(striche.at(-1)!.x).toBeGreaterThan(hälse.at(-1)!.x);
    expect(striche[1]!.x).toBeGreaterThan(hälse[5]!.x);
    expect(striche[1]!.x).toBeLessThan(hälse[6]!.x);
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
    expect(glyphen(zweiVerse, "taktart").map((t) => [t.zähler, t.nenner])).toEqual([
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

  it("hält Kopf und Noten eines Verses auf derselben Höhe wie seine Linie", () => {
    const linien = glyphen(zweiVerse, "notenlinie");
    const nummern = glyphen(zweiVerse, "versNummer");

    expect(nummern[0]!.y).toBeCloseTo(linien[0]!.y, 10);
    expect(nummern[1]!.y).toBeCloseTo(linien[1]!.y, 10);
  });
});

describe("Reihenfolge der Verse", () => {
  it("gibt die Glyphen eines Verses vor denen des nächsten aus", () => {
    const m = marsch(
      "Zwei Verse",
      vers([6, 8], 2, dupfenTakt(6, [1, 8])),
      vers([2, 4], 1, dupfenTakt(4, [1, 8])),
    );
    const alle = layout(m).glyphen;
    const linien = glyphen(m, "notenlinie");
    const grenze = (linien[0]!.y + linien[1]!.y) / 2;
    const versVon = (g: Glyph) => (g.typ === "hals" && g.yUnten > grenze ? 2 : 1);
    const hälse = alle.filter((g) => g.typ === "hals");

    expect(hälse.map(versVon)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
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
    }),
  );

  it("stellt den Vorschlag senkrecht über den Notenkopf seines Schlages", () => {
    const [vorschlag, ...weitere] = glyphen(m, "vorschlag");
    const kopf = glyphen(m, "notenkopf")[0]!;

    expect(weitere).toEqual([]);
    expect(vorschlag!.x).toBeCloseTo(kopf.x, 10);
    expect(vorschlag!.yUnten).toBeLessThan(kopf.y);
    expect(vorschlag!.yOben).toBeLessThan(vorschlag!.yUnten);
  });

  it("setzt den Vorschlag an den Kopf an, statt über ihm zu schweben", () => {
    const vorschlag = glyphen(m, "vorschlag")[0]!;
    const kopf = glyphen(m, "notenkopf")[0]!;
    const länge = vorschlag.yUnten - vorschlag.yOben;

    expect(kopf.y - vorschlag.yUnten).toBeLessThan(länge);
  });

  it("zeichnet den Strich auch über einem linken Notenkopf nach oben", () => {
    const linkerSchlepp = marsch(
      "Links",
      vers([2, 4], 1, {
        schlaege: [schlag("Schlepp", "links", [0, 1], [1, 4])],
      }),
    );
    const vorschlag = glyphen(linkerSchlepp, "vorschlag")[0]!;
    const kopf = glyphen(linkerSchlepp, "notenkopf")[0]!;
    const linie = glyphen(linkerSchlepp, "notenlinie")[0]!;

    expect(kopf.y).toBeGreaterThan(linie.y);
    expect(vorschlag.yUnten).toBeLessThan(kopf.y);
    expect(vorschlag.yOben).toBeLessThan(linie.y);
  });

  it("hält den Vorschlag kürzer als den Hals, an dem er hängt", () => {
    const vorschlag = glyphen(m, "vorschlag")[0]!;
    const hals = glyphen(m, "hals")[0]!;

    expect(vorschlag.yUnten - vorschlag.yOben).toBeLessThan(hals.yUnten - hals.yOben);
  });

  it("gibt einer Dupfe keinen Vorschlag", () => {
    const nurDupfen = marsch("Dupfen", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    expect(glyphen(nurDupfen, "vorschlag")).toEqual([]);
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

  it("setzt den Punkt rechts neben den Notenkopf, auf dessen Höhe", () => {
    const köpfe = glyphen(punktiert, "notenkopf");
    const punkte = glyphen(punktiert, "punkt");

    punkte.forEach((punkt, i) => {
      expect(punkt.x).toBeGreaterThan(köpfe[i]!.x);
      expect(punkt.y).toBeCloseTo(köpfe[i]!.y, 10);
    });
  });

  it("hält den Punkt näher am Kopf als der nächste Schlag steht", () => {
    const köpfe = glyphen(punktiert, "notenkopf");
    const punkt = glyphen(punktiert, "punkt")[0]!;

    expect(punkt.x - köpfe[0]!.x).toBeLessThan(köpfe[1]!.x - köpfe[0]!.x);
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
    const hälse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(2);
    expect(balken[0]!.x1).toBeCloseTo(hälse[0]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(hälse[2]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(hälse[3]!.x, 10);
    expect(balken[1]!.x2).toBeCloseTo(hälse[5]!.x, 10);
  });

  it("fasst die Sechzehntel eines 2/4-Taktes je Viertel zusammen", () => {
    const m = marsch("Acht Sechzehntel", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    const hälse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(2);
    expect(balken[0]!.x2).toBeCloseTo(hälse[3]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(hälse[4]!.x, 10);
  });

  it("zieht keinen Balken über den Taktstrich", () => {
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

  it("lässt einen einzelnen Schlag auf einem Schlagwert unverbalkt", () => {
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
    const hälse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(1);
    expect(balken[0]!.x1).toBeCloseTo(hälse[2]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(hälse[4]!.x, 10);
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

describe("Ungültiger Takt", () => {
  const überlaufender = marsch(
    "Zu voll",
    vers([6, 8], 1, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(6, [1, 8])),
  );

  it("zeichnet einen überlaufenden Takt nicht still, sondern wirft", () => {
    expect(() => layout(überlaufender)).toThrow(UngültigerTaktError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => layout(überlaufender)).toThrow(/Vers 2.*Takt 1/);
  });

  it("nennt die Taktart, die überschritten wurde", () => {
    expect(() => layout(überlaufender)).toThrow(/2\/4/);
  });

  it("lässt einen exakt gefüllten Takt durch", () => {
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
    const hälse = glyphen(wiederholt, "hals");

    expect(anfang!.punkte).toHaveLength(2);
    for (const punkt of anfang!.punkte) {
      expect(punkt.x).toBeGreaterThan(anfang!.x);
      expect(punkt.x).toBeLessThan(hälse[0]!.x);
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
    const hälse = glyphen(m, "hals");

    expect(weitere).toEqual([]);
    expect(fahne!.x).toBeCloseTo(hälse[0]!.x, 10);
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

  it("gibt verbalkten Schlägen keine Fahne — der Balken sagt es schon", () => {
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
      }),
    );
    expect(glyphen(m, "fahne")[0]!.y).toBeCloseTo(glyphen(m, "hals")[0]!.yUnten, 10);
  });
});

describe("Balkenzahl", () => {
  it("balkt Achtel einfach", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    expect(glyphen(m, "balken").map((b) => b.anzahl)).toEqual([1, 1]);
  });

  it("balkt Sechzehntel doppelt", () => {
    const m = marsch("Acht Sechzehntel", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    expect(glyphen(m, "balken").map((b) => b.anzahl)).toEqual([2, 2]);
  });
});

describe("Gemischte Balkengruppe", () => {
  // Achtel und Sechzehntel unter einem Balken: die Sechzehntel bräuchte einen
  // Balkenstummel. Den gibt es noch nicht, also wird geworfen statt gelogen.
  const gemischt = marsch(
    "Gemischt",
    vers([2, 4], 1, dupfenTakt(4, [1, 8])),
    vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 8], [1, 16]),
        schlag("Dupfe", "rechts", [3, 16], [1, 16]),
        schlag("Dupfe", "links", [1, 4], [1, 4]),
      ],
    }),
  );

  it("zeichnet die Gruppe nicht still falsch, sondern wirft", () => {
    expect(() => layout(gemischt)).toThrow(UngleicheBalkengruppeError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => layout(gemischt)).toThrow(/Vers 2.*Takt 1/);
  });

  it("nennt die Werte, die nicht zusammenpassen", () => {
    expect(() => layout(gemischt)).toThrow(/1\/8.*1\/16/);
  });

  it("lässt eine Gruppe aus gleichen Werten durch", () => {
    const gleich = marsch("Gleich", vers([2, 4], 1, dupfenTakt(8, [1, 16])));
    expect(() => layout(gleich)).not.toThrow();
  });
});
