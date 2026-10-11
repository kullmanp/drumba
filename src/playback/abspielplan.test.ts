import { describe, expect, it } from "vitest";
import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Vers } from "../model/marsch";
import { UngültigerTaktError } from "../model/marsch";
import { abspielplan, VORSCHLAG_VORLAUF } from "./abspielplan";

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

const marsch = (...verse: Vers[]): Marsch => ({ titel: "Test", verse });

const zeiten = (m: Marsch, tempo: number): number[] => abspielplan(m, tempo).map((a) => a.zeit);

// --- Tests -----------------------------------------------------------------

describe("Dupfen", () => {
  it("setzt jede Dupfe auf ihre Position im Takt", () => {
    // 2/4 bei Tempo 120: eine Viertel dauert 0.5 s, eine Achtel 0.25 s.
    const m = marsch(vers([2, 4], 1, dupfenTakt(4, [1, 8])));

    expect(zeiten(m, 120)).toEqual([0, 0.25, 0.5, 0.75]);
  });
});

describe("Takte", () => {
  it("lässt den nächsten Takt nach der Länge des vorigen beginnen", () => {
    // 6/8 zählt zwei punktierte Viertel; bei Tempo 100 dauert der Takt 1.2 s.
    const m = marsch(vers([6, 8], 1, dupfenTakt(2, [3, 8]), dupfenTakt(2, [3, 8])));

    expect(zeiten(m, 100)).toEqual([0, 0.6, 1.2, 1.8]);
  });
});

describe("Wiederholungen", () => {
  it("spielt einen Vers mit Wiederholungen 2 zweimal hintereinander", () => {
    // 2/4 bei Tempo 60: der Takt dauert 2 s.
    const m = marsch(vers([2, 4], 2, dupfenTakt(2, [1, 4])));

    expect(zeiten(m, 60)).toEqual([0, 1, 2, 3]);
  });

  it("spielt einen Vers mit Wiederholungen 1 einmal", () => {
    const m = marsch(vers([2, 4], 1, dupfenTakt(2, [1, 4])));

    expect(zeiten(m, 60)).toEqual([0, 1]);
  });

  it("lässt den nächsten Vers ohne Lücke auf den wiederholten folgen", () => {
    const m = marsch(
      vers([2, 4], 2, dupfenTakt(1, [2, 4])),
      vers([2, 4], 1, dupfenTakt(1, [2, 4])),
    );

    expect(zeiten(m, 60)).toEqual([0, 2, 4]);
  });
});

describe("Tempo", () => {
  it("halbiert jede Zeit, wenn das Tempo sich verdoppelt", () => {
    const m = marsch(
      vers([6, 8], 2, dupfenTakt(6, [1, 8])),
      vers([2, 4], 1, dupfenTakt(8, [1, 16])),
    );
    const langsam = zeiten(m, 80);
    const schnell = zeiten(m, 160);

    expect(schnell).toEqual(langsam.map((zeit) => zeit / 2));
  });

  it("hält den Puls über einen Wechsel der Taktart: 6/8 und 2/4 dauern gleich lang", () => {
    // Je ein Takt, gefolgt von einer Dupfe, die den Beginn des nächsten Verses markiert.
    const danach = vers([2, 4], 1, dupfenTakt(1, [2, 4]));
    const achtel = marsch(vers([6, 8], 1, dupfenTakt(6, [1, 8])), danach);
    const viertel = marsch(vers([2, 4], 1, dupfenTakt(2, [1, 4])), danach);

    expect(zeiten(achtel, 100).at(-1)).toBe(1.2);
    expect(zeiten(viertel, 100).at(-1)).toBe(1.2);
  });
});

describe("Schlepp", () => {
  // Ein Dupfe vorweg, damit der Vorschlag nicht vor den Anfang fällt.
  const mitSchlepp = marsch(
    vers([2, 4], 1, {
      schlaege: [
        schlag("Dupfe", "rechts", [0, 1], [1, 4]),
        schlag("Schlepp", "links", [1, 4], [1, 4]),
      ],
    }),
  );

  it("spielt den Hauptschlag auf der Position, in der Hand und voll", () => {
    // Tempo 60: die zweite Viertel liegt bei 1 s.
    const [, , hauptschlag] = abspielplan(mitSchlepp, 60);

    expect(hauptschlag).toEqual({ zeit: 1, hand: "links", lautstärke: 1 });
  });

  it("setzt einen leiseren Vorschlag in der anderen Hand kurz davor", () => {
    const [dupfe, vorschlag, hauptschlag] = abspielplan(mitSchlepp, 60);

    expect(vorschlag!.hand).toBe("rechts");
    expect(vorschlag!.zeit).toBeLessThan(hauptschlag!.zeit);
    expect(vorschlag!.zeit).toBeGreaterThan(dupfe!.zeit);
    expect(vorschlag!.lautstärke).toBeLessThan(hauptschlag!.lautstärke);
    expect(vorschlag!.lautstärke).toBeGreaterThan(0);
  });

  it("hält den Abstand des Vorschlags bei jedem Tempo gleich", () => {
    const abstand = (tempo: number): number => {
      const [, vorschlag, hauptschlag] = abspielplan(mitSchlepp, tempo);
      return hauptschlag!.zeit - vorschlag!.zeit;
    };

    expect(abstand(50)).toBeCloseTo(abstand(150), 9);
  });

  it("lässt den Vorschlag eines Schlepps am Anfang vor die Zeit null fallen", () => {
    const m = marsch(vers([2, 4], 1, { schlaege: [schlag("Schlepp", "rechts", [0, 1], [2, 4])] }));
    const [vorschlag, hauptschlag] = abspielplan(m, 100);

    expect(vorschlag!.zeit).toBeLessThan(0);
    expect(hauptschlag!.zeit).toBe(0);
  });
});

describe("Reihenfolge", () => {
  it("ordnet nach der Zeit, auch wenn ein Vorschlag vor den vorigen Schlag fällt", () => {
    // So schnell, dass eine Sechzehntel nur halb so lang dauert wie der Vorlauf.
    const tempo = 30 / VORSCHLAG_VORLAUF;
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 16]),
          schlag("Schlepp", "links", [1, 16], [1, 16]),
        ],
      }),
    );
    const plan = zeiten(m, tempo);

    expect(plan).toHaveLength(3);
    expect(plan).toEqual([...plan].sort((a, b) => a - b));
  });
});

describe("Ungültige Takte", () => {
  // Fünf Achtel in einem 2/4-Takt, im zweiten Vers.
  const überlaufender = marsch(
    vers([6, 8], 1, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(5, [1, 8])),
  );

  it("spielt einen überlaufenden Takt nicht still, sondern wirft", () => {
    expect(() => abspielplan(überlaufender, 100)).toThrow(UngültigerTaktError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => abspielplan(überlaufender, 100)).toThrow(/Vers 2.*Takt 1/);
  });
});
