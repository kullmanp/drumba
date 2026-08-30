import { describe, expect, it } from "vitest";
import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Vers } from "../model/marsch";
import type { Glyph, GlyphTyp } from "./layout";
import { layout, UngültigerTaktError } from "./layout";

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
  taktart: { zaehler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  takte,
});

const marsch = (titel: string, ...verse: Vers[]): Marsch => ({ titel, verse });

type GlyphVom<T extends GlyphTyp> = Extract<Glyph, { typ: T }>;

const glyphen = <T extends GlyphTyp>(m: Marsch, typ: T): GlyphVom<T>[] =>
  layout(m).glyphen.filter((g): g is GlyphVom<T> => g.typ === typ);

/** Die Abstände zwischen aufeinanderfolgenden Werten. */
const abstaende = (werte: number[]): number[] =>
  werte.slice(1).map((wert, i) => wert - werte[i]!);

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
    const haelse = glyphen(m, "hals");

    expect(linie.x1).toBeLessThan(haelse[0]!.x);
    expect(linie.x2).toBeGreaterThan(haelse.at(-1)!.x);
  });
});

describe("Schläge im Takt", () => {
  it("zeichnet einen Hals je Schlag, von links nach rechts", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const haelse = glyphen(m, "hals");

    expect(haelse).toHaveLength(6);
    expect(abstaende(haelse.map((h) => h.x)).every((d) => d > 0)).toBe(true);
  });

  it("setzt gleich lange Schläge in gleiche Abstände", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const [erster, ...weitere] = abstaende(glyphen(m, "hals").map((h) => h.x));

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
    const [a, b, c] = abstaende(glyphen(m, "hals").map((h) => h.x));

    expect(b).toBeCloseTo(a!, 10);
    expect(c).toBeCloseTo(a! * 3, 10);
  });

  it("zeichnet Hälse nach oben, auf der Notenlinie stehend", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 2, dupfenTakt(6, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;

    for (const hals of glyphen(m, "hals")) {
      expect(hals.yUnten).toBeCloseTo(linie.y, 10);
      expect(hals.yOben).toBeLessThan(hals.yUnten);
    }
  });

  it("trägt Figur und Hand jedes Schlages am Hals", () => {
    const m = marsch("Zwei", vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Schlepp", "links", [1, 8], [1, 8]),
      ],
    }));
    const haelse = glyphen(m, "hals");

    expect(haelse.map((h) => [h.figur, h.hand])).toEqual([
      ["Dupfe", "rechts"],
      ["Schlepp", "links"],
    ]);
  });
});

describe("Hand", () => {
  it("zeigt die Hand jedes Schlages an, unter der Notenlinie", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const linie = glyphen(m, "notenlinie")[0]!;
    const haende = glyphen(m, "hand");

    expect(haende.map((h) => h.hand)).toEqual(["rechts", "links", "rechts", "links"]);
    for (const hand of haende) expect(hand.y).toBeGreaterThan(linie.y);
  });

  it("richtet die Handangabe am Hals ihres Schlages aus", () => {
    const m = marsch("Vier Achtel", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    const haelse = glyphen(m, "hals");
    const haende = glyphen(m, "hand");

    expect(haende.map((h) => h.x)).toEqual(haelse.map((h) => h.x));
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

  it("umschliesst die Schläge des Verses", () => {
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
    const versVon = (g: Glyph) => (g.typ === "hals" && g.yUnten === linien[1]!.y ? 2 : 1);
    const haelse = alle.filter((g) => g.typ === "hals");

    expect(haelse.map(versVon)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
  });
});

describe("Schlepp", () => {
  const m = marsch("Schlepp", vers([6, 8], 1, {
    schlaege: [
      schlag("Schlepp", "rechts", [0, 1], [1, 8]),
      schlag("Dupfe", "links", [1, 8], [1, 8]),
      schlag("Dupfe", "rechts", [2, 8], [1, 8]),
    ],
  }));

  it("setzt den Vorschlag vor den Hals seines Schlages", () => {
    const [vorschlag, ...weitere] = glyphen(m, "vorschlag");
    const haelse = glyphen(m, "hals");
    const achtelAbstand = haelse[2]!.x - haelse[1]!.x;

    expect(weitere).toEqual([]);
    expect(vorschlag!.x).toBeLessThan(haelse[0]!.x);
    expect(haelse[0]!.x - vorschlag!.x).toBeLessThan(achtelAbstand);
  });

  it("spielt den Vorschlag mit der anderen Hand", () => {
    expect(glyphen(m, "vorschlag")[0]!.hand).toBe("links");
  });

  it("zeichnet den Vorschlag kürzer als den Hauptschlag", () => {
    const vorschlag = glyphen(m, "vorschlag")[0]!;
    const hauptschlag = glyphen(m, "hals")[0]!;

    expect(vorschlag.yUnten).toBeCloseTo(hauptschlag.yUnten, 10);
    expect(vorschlag.yOben).toBeGreaterThan(hauptschlag.yOben);
  });

  it("gibt einer Dupfe keinen Vorschlag", () => {
    const nurDupfen = marsch("Dupfen", vers([2, 4], 1, dupfenTakt(4, [1, 8])));
    expect(glyphen(nurDupfen, "vorschlag")).toEqual([]);
  });
});

describe("Fünferruf", () => {
  const m = marsch("Rufe", vers([6, 8], 1, {
    schlaege: [
      schlag("Fünferruf", "rechts", [0, 1], [3, 8]),
      schlag("Dupfe", "links", [3, 8], [1, 8]),
      schlag("Dupfe", "rechts", [4, 8], [1, 8]),
      schlag("Fünferruf", "links", [5, 8], [1, 8]),
    ],
  }));

  it("spannt den Wirbel über den notierten Wert des Rufes", () => {
    const haelse = glyphen(m, "hals");
    const achtelAbstand = haelse[2]!.x - haelse[1]!.x;
    const [lang, kurz] = glyphen(m, "wirbel");

    expect(kurz!.x2 - kurz!.x1).toBeCloseTo(achtelAbstand, 10);
    expect(lang!.x2 - lang!.x1).toBeCloseTo(achtelAbstand * 3, 10);
  });

  it("beginnt den Wirbel am Hals seines Schlages", () => {
    const haelse = glyphen(m, "hals");
    const wirbel = glyphen(m, "wirbel");

    expect(wirbel[0]!.x1).toBeCloseTo(haelse[0]!.x, 10);
    expect(wirbel[1]!.x1).toBeCloseTo(haelse[3]!.x, 10);
  });

  it("zeichnet den Wirbel über den Hälsen", () => {
    const hals = glyphen(m, "hals")[0]!;
    expect(glyphen(m, "wirbel")[0]!.y).toBeLessThanOrEqual(hals.yOben);
  });

  it("gibt einer Dupfe und einem Schlepp keinen Wirbel", () => {
    const ohneRuf = marsch("Ohne Ruf", vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Schlepp", "links", [1, 8], [1, 8]),
      ],
    }));
    expect(glyphen(ohneRuf, "wirbel")).toEqual([]);
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
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(2);
    expect(balken[0]!.x2).toBeCloseTo(haelse[3]!.x, 10);
    expect(balken[1]!.x1).toBeCloseTo(haelse[4]!.x, 10);
  });

  it("zieht keinen Balken über den Taktstrich", () => {
    const m = marsch(
      "Zwei Takte",
      vers([6, 8], 1, dupfenTakt(6, [1, 8]), dupfenTakt(6, [1, 8])),
    );
    expect(glyphen(m, "balken")).toHaveLength(4);
  });

  it("balkt keine Werte ab der Viertel", () => {
    const m = marsch("Punktierte Viertel", vers([6, 8], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [3, 8]),
        schlag("Dupfe", "links", [3, 8], [3, 8]),
      ],
    }));
    expect(glyphen(m, "balken")).toEqual([]);
  });

  it("lässt einen einzelnen Schlag auf einem Schlagwert unverbalkt", () => {
    const m = marsch("Gemischt", vers([6, 8], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 8], [1, 4]),
        schlag("Dupfe", "rechts", [3, 8], [1, 8]),
        schlag("Dupfe", "links", [4, 8], [1, 8]),
        schlag("Dupfe", "rechts", [5, 8], [1, 8]),
      ],
    }));
    const haelse = glyphen(m, "hals");
    const balken = glyphen(m, "balken");

    expect(balken).toHaveLength(1);
    expect(balken[0]!.x1).toBeCloseTo(haelse[2]!.x, 10);
    expect(balken[0]!.x2).toBeCloseTo(haelse[4]!.x, 10);
  });

  it("legt den Balken an die Halsenden", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    const hals = glyphen(m, "hals")[0]!;

    expect(glyphen(m, "balken")[0]!.y).toBeCloseTo(hals.yOben, 10);
  });
});

describe("Ungültiger Takt", () => {
  const ueberlaufender = marsch(
    "Zu voll",
    vers([6, 8], 1, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(6, [1, 8])),
  );

  it("zeichnet einen überlaufenden Takt nicht still, sondern wirft", () => {
    expect(() => layout(ueberlaufender)).toThrow(UngültigerTaktError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => layout(ueberlaufender)).toThrow(/Vers 2.*Takt 1/);
  });

  it("nennt die Taktart, die überschritten wurde", () => {
    expect(() => layout(ueberlaufender)).toThrow(/2\/4/);
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
    const haelse = glyphen(wiederholt, "hals");

    expect(anfang!.punkte).toHaveLength(2);
    for (const punkt of anfang!.punkte) {
      expect(punkt.x).toBeGreaterThan(anfang!.x);
      expect(punkt.x).toBeLessThan(haelse[0]!.x);
    }
  });

  it("verteilt die zwei Punkte um die Mitte des Striches", () => {
    const [anfang] = glyphen(wiederholt, "taktstrich");
    const mitte = (anfang!.yOben + anfang!.yUnten) / 2;
    const [oben, unten] = anfang!.punkte;

    expect(oben!.y).toBeLessThan(mitte);
    expect(unten!.y).toBeGreaterThan(mitte);
    expect(mitte - oben!.y).toBeCloseTo(unten!.y - mitte, 10);
  });
});

describe("Fahne", () => {
  it("gibt einem unverbalkten Achtel eine Fahne", () => {
    const m = marsch("Einzelnes Achtel", vers([6, 8], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 8], [1, 4]),
        schlag("Dupfe", "rechts", [3, 8], [3, 8]),
      ],
    }));
    const [fahne, ...weitere] = glyphen(m, "fahne");
    const haelse = glyphen(m, "hals");

    expect(weitere).toEqual([]);
    expect(fahne!.x).toBeCloseTo(haelse[0]!.x, 10);
    expect(fahne!.anzahl).toBe(1);
  });

  it("gibt einem Sechzehntel zwei Fahnen", () => {
    const m = marsch("Sechzehntel allein", vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 16]),
        schlag("Dupfe", "links", [1, 4], [1, 4]),
      ],
    }));
    expect(glyphen(m, "fahne").map((f) => f.anzahl)).toEqual([2]);
  });

  it("gibt Werten ab der Viertel keine Fahne", () => {
    const m = marsch("Punktierte Viertel", vers([6, 8], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [3, 8]),
        schlag("Dupfe", "links", [3, 8], [3, 8]),
      ],
    }));
    expect(glyphen(m, "fahne")).toEqual([]);
  });

  it("gibt verbalkten Schlägen keine Fahne — der Balken sagt es schon", () => {
    const m = marsch("Sechs Achtel", vers([6, 8], 1, dupfenTakt(6, [1, 8])));
    expect(glyphen(m, "fahne")).toEqual([]);
  });

  it("setzt die Fahne ans obere Ende des Halses", () => {
    const m = marsch("Einzelnes Achtel", vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 4], [1, 4]),
      ],
    }));
    expect(glyphen(m, "fahne")[0]!.y).toBeCloseTo(glyphen(m, "hals")[0]!.yOben, 10);
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

  it("zieht über eine gemischte Gruppe nur die durchgehenden Balken", () => {
    const m = marsch("Gemischt", vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 8]),
        schlag("Dupfe", "links", [1, 8], [1, 16]),
        schlag("Dupfe", "rechts", [3, 16], [1, 16]),
        schlag("Dupfe", "links", [1, 4], [1, 4]),
      ],
    }));
    expect(glyphen(m, "balken").map((b) => b.anzahl)).toEqual([1]);
  });
});
