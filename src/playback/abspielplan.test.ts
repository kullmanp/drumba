import { describe, expect, it } from "vitest";
import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt, Vers } from "../model/marsch";
import { UngueltigerRufError, UngueltigerTaktError } from "../model/marsch";
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
});

/** Ein Takt, wie ihn ein Test hinschreibt: Pausen nur, wo es welche gibt. */
interface Taktentwurf {
  readonly schlaege: readonly Schlag[];
  readonly pausen?: readonly Pause[];
}

const vers = (taktart: [number, number], wiederholungen: 1 | 2, ...takte: Taktentwurf[]): Vers => ({
  taktart: { zaehler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  takte: takte.map((takt): Takt => ({ pausen: [], ...takt })),
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
    auftakt: { schlaege: auftakt, pausen: [] },
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
