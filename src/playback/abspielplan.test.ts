import { describe, expect, it } from "vitest";
import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt, Tole, Vers } from "../model/marsch";
import { UngueltigerRufError, UngueltigerTaktError } from "../model/marsch";
import type { Starttakt } from "../model/starttakt";
import { UnbekannterStarttaktError } from "../model/starttakt";
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

const marsch = (...verse: Vers[]): Marsch => ({ titel: "Test", verse });

const pause = (position: [number, number], wert: [number, number]): Pause => ({
  position: bruch(...position),
  wert: bruch(...wert),
});

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
  it("laesst den naechsten Takt nach der Laenge des vorigen beginnen", () => {
    // 6/8 zaehlt zwei punktierte Viertel; bei Tempo 100 dauert der Takt 1.2 s.
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

  it("laesst den naechsten Vers ohne Luecke auf den wiederholten folgen", () => {
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

  it("haelt den Puls ueber einen Wechsel der Taktart: 6/8 und 2/4 dauern gleich lang", () => {
    // Je ein Takt, gefolgt von einer Dupfe, die den Beginn des naechsten Verses markiert.
    const danach = vers([2, 4], 1, dupfenTakt(1, [2, 4]));
    const achtel = marsch(vers([6, 8], 1, dupfenTakt(6, [1, 8])), danach);
    const viertel = marsch(vers([2, 4], 1, dupfenTakt(2, [1, 4])), danach);

    expect(zeiten(achtel, 100).at(-1)).toBe(1.2);
    expect(zeiten(viertel, 100).at(-1)).toBe(1.2);
  });
});

describe("Schlepp", () => {
  // Ein Dupfe vorweg, damit der Vorschlag nicht vor den Anfang faellt.
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

    expect(hauptschlag).toEqual({ zeit: 1, hand: "links", lautstaerke: 1 });
  });

  it("setzt einen leiseren Vorschlag in der anderen Hand kurz davor", () => {
    const [dupfe, vorschlag, hauptschlag] = abspielplan(mitSchlepp, 60);

    expect(vorschlag!.hand).toBe("rechts");
    expect(vorschlag!.zeit).toBeLessThan(hauptschlag!.zeit);
    expect(vorschlag!.zeit).toBeGreaterThan(dupfe!.zeit);
    expect(vorschlag!.lautstaerke).toBeLessThan(hauptschlag!.lautstaerke);
    expect(vorschlag!.lautstaerke).toBeGreaterThan(0);
  });

  it("haelt den Abstand des Vorschlags bei jedem Tempo gleich", () => {
    const abstand = (tempo: number): number => {
      const [, vorschlag, hauptschlag] = abspielplan(mitSchlepp, tempo);
      return hauptschlag!.zeit - vorschlag!.zeit;
    };

    expect(abstand(50)).toBeCloseTo(abstand(150), 9);
  });

  it("laesst den Vorschlag eines Schlepps am Anfang vor die Zeit null fallen", () => {
    const m = marsch(vers([2, 4], 1, { schlaege: [schlag("Schlepp", "rechts", [0, 1], [2, 4])] }));
    const [vorschlag, hauptschlag] = abspielplan(m, 100);

    expect(vorschlag!.zeit).toBeLessThan(0);
    expect(hauptschlag!.zeit).toBe(0);
  });
});

describe("Double", () => {
  /**
   * Ein Takt in `taktart`: eine Viertel Dupfe vorweg, damit die leise Dupfe
   * nicht vor den Anfang faellt, dann ein Double links auf der zweiten Viertel.
   */
  const mitDouble = (taktart: [number, number], pausen: Pause[] = []): Marsch =>
    marsch(
      vers(taktart, 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 4]),
          schlag("Double", "links", [1, 4], [1, 8]),
        ],
        pausen: [pause([3, 8], [1, 8]), ...pausen],
      }),
    );

  it("spielt eine leise Dupfe, einen Vorschlag und den Hauptschlag", () => {
    const [, leiseDupfe, vorschlag, hauptschlag] = abspielplan(mitDouble([2, 4]), 60);

    expect(hauptschlag).toEqual({ zeit: 1, hand: "links", lautstaerke: 1 });
    expect(vorschlag!.hand).toBe("rechts");
    expect(leiseDupfe!.hand).toBe("links");
  });

  it("setzt die leise Dupfe genau eine Sechzehntel vor den Hauptschlag, in 2/4", () => {
    // Tempo 60 in 2/4: eine Viertel dauert 1 s, eine Sechzehntel also 0.25 s.
    const [, leiseDupfe, , hauptschlag] = abspielplan(mitDouble([2, 4]), 60);

    expect(hauptschlag!.zeit - leiseDupfe!.zeit).toBeCloseTo(0.25, 9);
  });

  it("setzt die leise Dupfe genau eine Sechzehntel vor den Hauptschlag, in 6/8", () => {
    // Tempo 60 in 6/8: eine punktierte Viertel dauert 1 s, eine Sechzehntel 1/6 s.
    const m = mitDouble([6, 8], [pause([1, 2], [1, 4])]);
    const [, leiseDupfe, , hauptschlag] = abspielplan(m, 60);

    expect(hauptschlag!.zeit - leiseDupfe!.zeit).toBeCloseTo(1 / 6, 9);
  });

  it("laesst die leise Dupfe lauter klingen als den Vorschlag und leiser als den Hauptschlag", () => {
    const [, leiseDupfe, vorschlag, hauptschlag] = abspielplan(mitDouble([2, 4]), 60);

    expect(leiseDupfe!.lautstaerke).toBeGreaterThan(vorschlag!.lautstaerke);
    expect(leiseDupfe!.lautstaerke).toBeLessThan(hauptschlag!.lautstaerke);
  });

  it("laesst die leise Dupfe eines Doubles am Anfang vor die Zeit null fallen", () => {
    const m = marsch(vers([2, 4], 1, { schlaege: [schlag("Double", "rechts", [0, 1], [2, 4])] }));
    const [leiseDupfe, , hauptschlag] = abspielplan(m, 100);

    expect(leiseDupfe!.zeit).toBeLessThan(0);
    expect(leiseDupfe!.hand).toBe("rechts");
    expect(hauptschlag!.zeit).toBe(0);
  });

  it("gibt einem Schlepp keine leise Dupfe", () => {
    const m = marsch(vers([2, 4], 1, { schlaege: [schlag("Schlepp", "rechts", [0, 1], [2, 4])] }));

    expect(abspielplan(m, 100)).toHaveLength(2);
  });
});

describe("Dreierruf", () => {
  /** Die zwei gerollten Dupfe vor einem Dreierruf: alles, was leiser klingt als voll. */
  const gerollte = (m: Marsch, tempo: number) =>
    abspielplan(m, tempo).filter((a) => a.lautstaerke < 1);
  /** Die Zeiten der vollen Schlaege, ohne die gerollten Dupfe. */
  const volle = (m: Marsch, tempo: number) =>
    abspielplan(m, tempo)
      .filter((a) => a.lautstaerke === 1)
      .map((a) => a.zeit);

  /** Ein Takt in `taktart`: Viertel rechts, dann ein Dreierruf links auf der zweiten Viertel. */
  const imTakt = (taktart: [number, number], pausen: Pause[] = []): Marsch =>
    marsch(
      vers(taktart, 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 4]),
          schlag("Dreierruf", "links", [1, 4], [1, 8]),
        ],
        pausen: [pause([3, 8], [1, 8]), ...pausen],
      }),
    );

  /** Erwartet die gerollten Dupfe genau auf 1/3 und 2/3 der Strecke von `von` bis `bis`. */
  const erwarteDrittel = (m: Marsch, tempo: number, von: number, bis: number) => {
    const [erste, zweite] = gerollte(m, tempo);
    expect(erste!.zeit).toBeCloseTo(von + (bis - von) / 3, 10);
    expect(zweite!.zeit).toBeCloseTo(von + (2 * (bis - von)) / 3, 10);
  };

  it("spielt zwei gerollte Dupfe in der anderen Hand vor der Landung", () => {
    const [, erste, zweite, landung] = abspielplan(imTakt([2, 4]), 60);

    expect(erste!.hand).toBe("rechts");
    expect(zweite!.hand).toBe("rechts");
    expect(landung).toEqual({ zeit: 1, hand: "links", lautstaerke: 1 });
  });

  it("teilt die Strecke vom vorigen Schlag genau in Drittel, in 2/4", () => {
    erwarteDrittel(imTakt([2, 4]), 60, 0, 1);
  });

  it("teilt die Strecke vom vorigen Schlag genau in Drittel, in 6/8", () => {
    // Tempo 60 in 6/8: eine Viertel dauert 2/3 s.
    erwarteDrittel(imTakt([6, 8], [pause([1, 2], [1, 4])]), 60, 0, 2 / 3);
  });

  it("teilt die Strecke ueber den Taktstrich", () => {
    // 2/4 bei Tempo 60: der vorige Schlag auf 1.5 s, die Landung auf 2 s.
    const m = marsch(
      vers([2, 4], 1, dupfenTakt(2, [1, 4]), {
        schlaege: [schlag("Dreierruf", "rechts", [0, 1], [2, 4])],
      }),
    );
    erwarteDrittel(m, 60, 1, 2);
    expect(gerollte(m, 60).map((a) => a.hand)).toEqual(["links", "links"]);
  });

  it("teilt die gespielte Strecke in einer Quintole", () => {
    // 2/4 bei Tempo 60: die Quintole beginnt auf 1 s, ein Fuenftel davon dauert 0.2 s.
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 4]),
          schlag("Dupfe", "links", [1, 4], [1, 8]),
          schlag("Dreierruf", "links", [7, 20], [1, 16]),
          schlag("Dupfe", "rechts", [2, 5], [1, 8]),
        ],
        tolen: [{ position: bruch(1, 4), anzahl: 5, statt: 4, einheit: bruch(1, 16) }],
      }),
    );
    erwarteDrittel(m, 60, 1, 1.4);
  });

  it("nimmt bei der Wiederholung den Auftakt, der vor Takt 1 wieder erklingt", () => {
    // 2/4 bei Tempo 60: Takt 1 beginnt auf 1 s und dauert 2 s; der Auftakt
    // erklingt auf 0 s und wieder auf 2 s, eine Viertel vor dem zweiten Takt 1.
    const m = marsch({
      ...vers([2, 4], 2, {
        schlaege: [schlag("Dreierruf", "rechts", [0, 1], [1, 4])],
        pausen: [pause([1, 4], [1, 4])],
      }),
      auftakt: { schlaege: [schlag("Dupfe", "links", [1, 4], [1, 4])], pausen: [], tolen: [] },
    });
    const [, , erneut] = volle(m, 60);
    const zweiterDurchgang = gerollte(m, 60).slice(2);

    expect(erneut).toBeCloseTo(2, 10);
    expect(zweiterDurchgang[0]!.zeit).toBeCloseTo(2 + 1 / 3, 10);
    expect(zweiterDurchgang[1]!.zeit).toBeCloseTo(2 + 2 / 3, 10);
  });

  it("laesst die gerollten Dupfe leiser klingen als die Landung", () => {
    const [, erste, zweite, landung] = abspielplan(imTakt([2, 4]), 60);

    expect(erste!.lautstaerke).toBeLessThan(landung!.lautstaerke);
    expect(zweite!.lautstaerke).toBeLessThan(landung!.lautstaerke);
  });

  it("gibt einer Dupfe keine gerollten Dupfe", () => {
    const m = marsch(vers([2, 4], 1, dupfenTakt(2, [1, 4])));
    expect(abspielplan(m, 60)).toHaveLength(2);
  });
});

describe("Fuenferruf", () => {
  /** Ein 2/4-Takt: Fuenferruf in `hand` auf der ersten Achtel, Landung auf der zweiten. */
  const mitRuf = (hand: Hand): Marsch =>
    marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Fuenferruf", hand, [0, 1], [1, 8]),
          schlag("Dupfe", hand, [1, 8], [3, 8]),
        ],
      }),
    );

  it("spielt vier gleichmaessige Schlaege rechts, rechts, links, links und dann die Landung", () => {
    // Tempo 60 in 2/4: eine Achtel dauert 0.5 s, eine Zweiunddreissigstel 0.125 s.
    const [, ...schlaege] = abspielplan(mitRuf("rechts"), 60);

    expect(schlaege.map((a) => [a.zeit, a.hand])).toEqual([
      [0, "rechts"],
      [0.125, "rechts"],
      [0.25, "links"],
      [0.375, "links"],
      [0.5, "rechts"],
    ]);
  });

  it("beginnt mit dem leiseren Vorschlag des Schlepps in der anderen Hand", () => {
    const [vorschlag, erster] = abspielplan(mitRuf("rechts"), 60);

    expect(vorschlag!.hand).toBe("links");
    expect(vorschlag!.zeit).toBeLessThan(erster!.zeit);
    expect(vorschlag!.lautstaerke).toBeLessThan(erster!.lautstaerke);
  });

  it("spielt die vier Schlaege und die Landung voll", () => {
    const [, ...schlaege] = abspielplan(mitRuf("rechts"), 60);

    expect(schlaege.every((a) => a.lautstaerke === 1)).toBe(true);
  });

  it("spiegelt den Ruf links", () => {
    const [vorschlag, ...schlaege] = abspielplan(mitRuf("links"), 60);

    expect(vorschlag!.hand).toBe("rechts");
    expect(schlaege.map((a) => a.hand)).toEqual(["links", "links", "rechts", "rechts", "links"]);
  });

  it("spielt in 6/8 schneller als in 2/4, weil er immer eine Achtel fuellt", () => {
    const abstand = (taktart: [number, number], pausen: Pause[]): number => {
      const m = marsch(
        vers(taktart, 1, {
          schlaege: [
            schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
            schlag("Dupfe", "rechts", [1, 8], [1, 8]),
          ],
          pausen,
        }),
      );
      const [, erster, zweiter] = abspielplan(m, 100);
      return zweiter!.zeit - erster!.zeit;
    };

    const sechsAchtel = abstand([6, 8], [pause([1, 4], [1, 8]), pause([3, 8], [3, 8])]);
    const zweiViertel = abstand([2, 4], [pause([1, 4], [1, 4])]);

    expect(sechsAchtel).toBeLessThan(zweiViertel);
  });
});

describe("Pausen", () => {
  it("laesst eine Pause still: nur die Schlaege klingen, zu denselben Zeiten", () => {
    // 2/4 bei Tempo 120: eine Achtel dauert 0.25 s.
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [1, 8], [1, 8]),
          schlag("Dupfe", "links", [1, 4], [1, 8]),
          schlag("Dupfe", "rechts", [3, 8], [1, 8]),
        ],
        pausen: [pause([0, 1], [1, 8])],
      }),
    );

    expect(zeiten(m, 120)).toEqual([0.25, 0.5, 0.75]);
  });

  it("laesst den naechsten Takt nach einer Pause am Taktende nicht frueher beginnen", () => {
    const m = marsch(
      vers(
        [2, 4],
        1,
        { schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4])], pausen: [pause([1, 4], [1, 4])] },
        dupfenTakt(2, [1, 4]),
      ),
    );

    expect(zeiten(m, 120)).toEqual([0, 1, 1.5]);
  });
});

describe("Tole", () => {
  it("spielt die Quintole am Beginn ihrer Zaehlzeit und auf 2/5 und 3/5 davon", () => {
    // 2/4 bei Tempo 120: eine Zaehlzeit dauert 0.5 s, ein Fuenftel davon 0.1 s.
    const quintole: Tole = { position: bruch(1, 4), anzahl: 5, statt: 4, einheit: bruch(1, 16) };
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 4]),
          schlag("Dupfe", "links", [1, 4], [1, 8]),
          schlag("Dupfe", "links", [7, 20], [1, 16]),
          schlag("Dupfe", "rechts", [2, 5], [1, 8]),
        ],
        tolen: [quintole],
      }),
    );

    const [, ...quintolenZeiten] = zeiten(m, 120);
    expect(quintolenZeiten[0]).toBeCloseTo(0.5, 10);
    expect(quintolenZeiten[1]).toBeCloseTo(0.5 + (2 / 5) * 0.5, 10);
    expect(quintolenZeiten[2]).toBeCloseTo(0.5 + (3 / 5) * 0.5, 10);
  });
});

describe("Reihenfolge", () => {
  it("ordnet nach der Zeit, auch wenn ein Vorschlag vor den vorigen Schlag faellt", () => {
    // So schnell, dass eine Sechzehntel nur halb so lang dauert wie der Vorlauf.
    const tempo = 30 / VORSCHLAG_VORLAUF;
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [
          schlag("Dupfe", "rechts", [0, 1], [1, 16]),
          schlag("Schlepp", "links", [1, 16], [1, 16]),
        ],
        pausen: [pause([1, 8], [1, 8]), pause([1, 4], [1, 4])],
      }),
    );
    const plan = zeiten(m, tempo);

    expect(plan).toHaveLength(3);
    expect(plan).toEqual([...plan].sort((a, b) => a - b));
  });
});

describe("Ungueltige Takte", () => {
  // Fuenf Achtel in einem 2/4-Takt, im zweiten Vers.
  const ueberlaufender = marsch(
    vers([6, 8], 1, dupfenTakt(6, [1, 8])),
    vers([2, 4], 1, dupfenTakt(5, [1, 8])),
  );

  it("spielt einen ueberlaufenden Takt nicht still, sondern wirft", () => {
    expect(() => abspielplan(ueberlaufender, 100)).toThrow(UngueltigerTaktError);
  });

  it("benennt Vers und Takt des Fehlers", () => {
    expect(() => abspielplan(ueberlaufender, 100)).toThrow(/Vers 2.*Takt 1/);
  });
});

describe("Ungueltige Rufe", () => {
  it("spielt einen Fuenferruf ohne Landung nicht, sondern wirft", () => {
    const m = marsch(
      vers([2, 4], 1, {
        schlaege: [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
        pausen: [pause([0, 1], [3, 8])],
      }),
    );
    expect(() => abspielplan(m, 100)).toThrow(UngueltigerRufError);
  });
});

describe("Auftakt", () => {
  /** Viertel und Viertelpause: das Ende, ueber das der Auftakt wiederkehrt. */
  const schluss: Taktentwurf = {
    schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4])],
    pausen: [pause([1, 4], [1, 4])],
  };
  const mitAuftakt = (
    taktart: [number, number],
    wiederholungen: 1 | 2,
    auftakt: Schlag[],
    ...takte: Taktentwurf[]
  ): Vers => ({
    ...vers(taktart, wiederholungen, ...takte),
    auftakt: { schlaege: auftakt, pausen: [], tolen: [] },
  });

  it("beginnt den Marsch mit dem Auftakt; Takt 1 folgt eine Auftaktlaenge spaeter", () => {
    // 2/4 bei Tempo 60: eine Achtel Auftakt dauert eine halbe Zaehlzeit, 0.5 s.
    const m = marsch(mitAuftakt([2, 4], 1, [schlag("Dupfe", "links", [3, 8], [1, 8])], schluss));
    const plan = abspielplan(m, 60);

    expect(plan.map((a) => [a.zeit, a.hand])).toEqual([
      [0, "links"],
      [0.5, "rechts"],
    ]);
  });

  it("laesst einen Fuenferruf im Auftakt mit seinem Vorschlag vor allem anderen beginnen", () => {
    const m = marsch(
      mitAuftakt([2, 4], 1, [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])], schluss),
    );
    const [vorschlag, erster, ...rest] = abspielplan(m, 60);

    expect(vorschlag!.zeit).toBeLessThan(0);
    expect(erster!.zeit).toBe(0);
    // Die Landung ist der erste Schlag von Takt 1, eine Achtel spaeter.
    expect(rest.at(-1)!.zeit).toBe(0.5);
  });

  it("spielt den Auftakt bei der Wiederholung ueber das Ende des letzten Taktes", () => {
    // 2/4 bei Tempo 60: der Auftakt 0.5 s, jeder Takt 2 s.
    const m = marsch(mitAuftakt([2, 4], 2, [schlag("Dupfe", "links", [3, 8], [1, 8])], schluss));

    // Auftakt, Takt 1; Auftakt in der letzten Achtel von Takt 1, endet an dessen Ende; Takt 1.
    expect(zeiten(m, 60)).toEqual([0, 0.5, 2, 2.5]);
  });

  it("spielt den Auftakt des naechsten Verses ueber das Ende des vorigen, auch in anderer Taktart", () => {
    // 6/8 bei Tempo 60: ein Takt dauert 2 s. Der 2/4-Auftakt von einer Achtel ist eine halbe
    // Zaehlzeit, 0.5 s, und endet am Ende des 6/8-Taktes.
    const m = marsch(
      vers([6, 8], 1, {
        schlaege: [schlag("Dupfe", "rechts", [0, 1], [3, 8])],
        pausen: [pause([3, 8], [3, 8])],
      }),
      mitAuftakt([2, 4], 1, [schlag("Dupfe", "links", [3, 8], [1, 8])], schluss),
    );

    expect(zeiten(m, 60)).toEqual([0, 1.5, 2]);
  });

  it("spielt einen Vers ohne Auftakt wie bisher", () => {
    const m = marsch(vers([2, 4], 2, dupfenTakt(2, [1, 4])));
    expect(zeiten(m, 60)).toEqual([0, 1, 2, 3]);
  });
});

describe("Starttakt", () => {
  const ab = (versIndex: number, taktIndex: number): Starttakt => ({ versIndex, taktIndex });

  /** Die Zeiten ab einem Starttakt, bei Tempo 60. */
  const zeitenAb = (m: Marsch, starttakt: Starttakt): number[] =>
    abspielplan(m, 60, starttakt).map((a) => a.zeit);

  /** Viertel und Viertelpause: das Ende, ueber das ein Auftakt wiederkehrt. */
  const schluss: Taktentwurf = {
    schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4])],
    pausen: [pause([1, 4], [1, 4])],
  };

  /** Ein 2/4-Takt: der Schlag `figur` auf der zweiten Viertel, eine Viertel Dupfe davor. */
  const mitFigur = (figur: Figur): Taktentwurf => ({
    schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4]), schlag(figur, "links", [1, 4], [1, 4])],
  });

  /** Ein 2/4-Takt, der mit `figur` links auf der ersten Viertel beginnt. */
  const beginntMit = (figur: Figur): Taktentwurf => ({
    schlaege: [schlag(figur, "links", [0, 1], [1, 4]), schlag("Dupfe", "rechts", [1, 4], [1, 4])],
  });

  // Drei Takte zu je 2 s bei Tempo 60, dann ein zweiter Vers.
  const dreiTakte = marsch(
    vers([2, 4], 1, dupfenTakt(2, [1, 4]), dupfenTakt(4, [1, 8]), dupfenTakt(2, [1, 4])),
    vers([2, 4], 1, dupfenTakt(2, [1, 4])),
  );

  it("spielt ohne Starttakt den ganzen Marsch wie bisher", () => {
    expect(abspielplan(dreiTakte, 60, undefined)).toEqual(abspielplan(dreiTakte, 60));
  });

  it("beginnt mit dem ersten Schlag des Starttakts auf der Zeit 0", () => {
    const [erster] = abspielplan(dreiTakte, 60, ab(0, 1));

    expect(erster).toEqual({ zeit: 0, hand: "rechts", lautstaerke: 1 });
  });

  it("spielt ab dem Starttakt das Ende des ganzen Plans, um dessen Beginn verschoben", () => {
    // Takt 2 beginnt bei Tempo 60 nach 2 s; vor ihm stehen zwei Schlaege.
    const ganz = abspielplan(dreiTakte, 60);
    const ab2 = abspielplan(dreiTakte, 60, ab(0, 1));

    expect(ab2).toEqual(ganz.slice(2).map((a) => ({ ...a, zeit: a.zeit - 2 })));
  });

  it("beginnt im ersten Durchgang und spielt danach die Wiederholung ganz", () => {
    // Takt 1 mit zwei Vierteln, Takt 2 mit einer Halben; je 2 s bei Tempo 60.
    const m = marsch(vers([2, 4], 2, dupfenTakt(2, [1, 4]), dupfenTakt(1, [2, 4])));

    expect(zeitenAb(m, ab(0, 1))).toEqual([0, 2, 3, 4]);
  });

  it("spielt ab Takt 1 eines Verses mit Auftakt zuerst den Auftakt", () => {
    // Vers 2 hat einen Auftakt von einer Achtel, 0.5 s, ueber die Pause am Ende von Vers 1.
    const m = marsch(vers([2, 4], 1, dupfenTakt(2, [1, 4]), schluss), {
      ...vers([2, 4], 1, dupfenTakt(2, [1, 4])),
      auftakt: { schlaege: [schlag("Dupfe", "links", [3, 8], [1, 8])], pausen: [], tolen: [] },
    });
    const plan = abspielplan(m, 60, ab(1, 0));

    expect(plan.map((a) => [a.zeit, a.hand])).toEqual([
      [0, "links"],
      [0.5, "rechts"],
      [1.5, "links"],
    ]);
  });

  it("behaelt die leise Dupfe eines Doubles auf dem ersten Schlag, vor der Zeit 0", () => {
    const m = marsch(vers([2, 4], 1, mitFigur("Dupfe"), beginntMit("Double")));
    const [leiseDupfe, vorschlag, hauptschlag] = abspielplan(m, 60, ab(0, 1));

    expect(leiseDupfe!.zeit).toBeLessThan(0);
    expect(leiseDupfe!.hand).toBe("links");
    expect(vorschlag!.zeit).toBeLessThan(0);
    expect(hauptschlag).toEqual({ zeit: 0, hand: "links", lautstaerke: 1 });
  });

  it("behaelt die gerollten Dupfe eines Dreierrufs auf dem ersten Schlag, wie im ganzen Plan", () => {
    // Takt 2 beginnt bei Tempo 60 nach 2 s.
    const m = marsch(vers([2, 4], 1, mitFigur("Dupfe"), beginntMit("Dreierruf")));
    const ganz = abspielplan(m, 60).slice(2);
    const ab2 = abspielplan(m, 60, ab(0, 1));

    expect(ab2).toHaveLength(ganz.length);
    ab2.forEach((a, i) => expect(a.zeit).toBeCloseTo(ganz[i]!.zeit - 2, 10));
    expect(ab2.filter((a) => a.zeit < 0)).toHaveLength(2);
  });

  it("laesst einen Fuenferruf vor dem Starttakt weg und spielt seine Landung allein", () => {
    // Takt 1 endet mit einem Fuenferruf rechts auf der letzten Achtel; er landet auf Takt 2.
    const m = marsch(
      vers(
        [2, 4],
        1,
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [3, 8]),
            schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
          ],
        },
        dupfenTakt(2, [1, 4]),
      ),
    );

    expect(abspielplan(m, 60, ab(0, 1))).toEqual([
      { zeit: 0, hand: "rechts", lautstaerke: 1 },
      { zeit: 1, hand: "links", lautstaerke: 1 },
    ]);
  });

  it("behaelt eine Pause am Beginn des Starttakts: der erste Schlag kommt nach der Zeit 0", () => {
    // Eine Viertelpause, dann eine Viertel: bei Tempo 60 nach 1 s.
    const m = marsch(
      vers([2, 4], 1, dupfenTakt(2, [1, 4]), {
        schlaege: [schlag("Dupfe", "links", [1, 4], [1, 4])],
        pausen: [pause([0, 1], [1, 4])],
      }),
    );

    expect(zeitenAb(m, ab(0, 1))).toEqual([1]);
  });

  it("verwirft einen Starttakt, den es im Marsch nicht gibt", () => {
    expect(() => abspielplan(dreiTakte, 60, ab(0, 3))).toThrow(UnbekannterStarttaktError);
    expect(() => abspielplan(dreiTakte, 60, ab(2, 0))).toThrow(/Vers 3, Takt 1/);
  });
});
