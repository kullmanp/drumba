import { describe, expect, it } from "vitest";
import { bruch } from "./bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt, Tole, Vers } from "./marsch";
import {
  andereHand,
  AUFTAKT,
  folgeschlag,
  LueckenhafterTaktError,
  pruefeMarsch,
  taktLaenge,
  taktUeberlauf,
  UngueltigerAuftaktError,
  UngueltigerRufError,
  UngueltigerTaktError,
  UngueltigeToleError,
  zaehlzeit,
} from "./marsch";

// --- Halterungen -----------------------------------------------------------

const schlag = (
  figur: Figur,
  hand: Hand,
  position: [number, number],
  wert: [number, number],
): Schlag => ({ figur, hand, position: bruch(...position), wert: bruch(...wert) });

const pause = (position: [number, number], wert: [number, number]): Pause => ({
  position: bruch(...position),
  wert: bruch(...wert),
});

type Taktinhalt = Schlag | Pause | Tole;

/** Ein Takt aus Schlaegen, Pausen und Tolen, in beliebiger Mischung hingeschrieben. */
const takt = (elemente: Taktinhalt[]): Takt => ({
  schlaege: elemente.filter((e): e is Schlag => "figur" in e),
  pausen: elemente.filter((e): e is Pause => !("figur" in e) && !("anzahl" in e)),
  tolen: elemente.filter((e): e is Tole => "anzahl" in e),
});

/** Eine Tole: `anzahl` Schlaege des Wertes `einheit` in der Zeit von `statt`. */
const tole = (
  position: [number, number],
  anzahl: number,
  statt: number,
  einheit: [number, number],
): Tole => ({ position: bruch(...position), anzahl, statt, einheit: bruch(...einheit) });

/** Ein 2/4-Vers aus den gegebenen Takten. */
const zweiViertel = (...takte: Taktinhalt[][]): Marsch => ({
  titel: "Test",
  verse: [{ taktart: { zaehler: 2, nenner: 4 }, wiederholungen: 1, takte: takte.map(takt) }],
});

const dupfe = (position: [number, number], wert: [number, number]): Schlag => ({
  figur: "Dupfe",
  hand: "rechts",
  position: bruch(...position),
  wert: bruch(...wert),
});

/** Ein Vers mit Auftakt; `auftakt` und jeder Takt als gemischte Liste hingeschrieben. */
const versMitAuftakt = (
  taktart: [number, number],
  wiederholungen: 1 | 2,
  auftakt: (Schlag | Pause)[],
  ...takte: (Schlag | Pause)[][]
): Vers => ({
  taktart: { zaehler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  auftakt: takt(auftakt),
  takte: takte.map(takt),
});

/** Ein Vers ohne Auftakt, in beliebiger Taktart. */
const ohneAuftakt = (
  taktart: [number, number],
  wiederholungen: 1 | 2,
  ...takte: (Schlag | Pause)[][]
): Vers => ({
  taktart: { zaehler: taktart[0], nenner: taktart[1] },
  wiederholungen,
  takte: takte.map(takt),
});

const marschAus = (...verse: Vers[]): Marsch => ({ titel: "Test", verse });

/** Ein 2/4-Takt, der auf Viertel und Viertelpause endet — Platz fuer einen Auftakt. */
const endetMitPause = (): (Schlag | Pause)[] => [dupfe([0, 1], [1, 4]), pause([1, 4], [1, 4])];

/** Ein 2/4-Takt aus zwei klingenden Vierteln — kein Platz fuer einen Auftakt. */
const endetKlingend = (): (Schlag | Pause)[] => [dupfe([0, 1], [1, 4]), dupfe([1, 4], [1, 4])];

/** Der Auftakt aus ZicZac, Vers 1: ein freier Fuenferruf rechts auf der letzten Achtel. */
const rufAuftakt = (): (Schlag | Pause)[] => [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])];

// --- Tests -----------------------------------------------------------------

describe("taktLaenge", () => {
  it("misst einen 6/8-Takt als 6/8 einer Ganzen", () => {
    expect(taktLaenge({ zaehler: 6, nenner: 8 })).toEqual({ zaehler: 3, nenner: 4 });
  });

  it("misst einen 5/8-Takt exakt", () => {
    expect(taktLaenge({ zaehler: 5, nenner: 8 })).toEqual({ zaehler: 5, nenner: 8 });
  });
});

describe("taktUeberlauf", () => {
  const sechsAchtel = { zaehler: 6, nenner: 8 };

  it("meldet keinen Ueberlauf fuer einen exakt gefuellten Takt", () => {
    const takt: Takt = { tolen: [], schlaege: [dupfe([5, 8], [1, 8])], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  // Nur der Ueberlauf: dass der halbleere Takt eine Luecke hat, meldet pruefeMarsch.
  it("meldet keinen Ueberlauf fuer einen halbleeren Takt", () => {
    const takt: Takt = { tolen: [], schlaege: [dupfe([0, 1], [1, 8])], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet den Schlag, dessen Wert ueber den Takt hinausragt", () => {
    const zuLang = dupfe([5, 8], [1, 4]);
    const takt: Takt = { tolen: [], schlaege: [dupfe([0, 1], [1, 8]), zuLang], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet den Schlag, der jenseits des Taktendes beginnt", () => {
    const zuSpaet = dupfe([7, 8], [1, 8]);
    const takt: Takt = { tolen: [], schlaege: [zuSpaet], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuSpaet);
  });

  it("meldet auch eine Pause, die ueber das Taktende hinausragt", () => {
    const zuLang = pause([1, 2], [3, 8]);
    const takt: Takt = { tolen: [], schlaege: [dupfe([0, 1], [1, 2])], pausen: [zuLang] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet einen Schlag vor dem Taktbeginn", () => {
    const zuFrueh = dupfe([-1, 8], [1, 8]);
    const takt: Takt = { tolen: [], schlaege: [zuFrueh], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuFrueh);
  });
});

describe("pruefeMarsch: lueckenlos gefuellter Takt", () => {
  it("laesst einen Takt gelten, den Schlaege und Pausen genau fuellen", () => {
    const m = zweiViertel([pause([0, 1], [1, 8]), dupfe([1, 8], [1, 8]), dupfe([1, 4], [1, 4])]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("laesst einen Takt gelten, der nur aus Pausen besteht", () => {
    const m = zweiViertel([pause([0, 1], [1, 4]), pause([1, 4], [1, 4])]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft eine Luecke zwischen zwei Schlaegen und nennt ihre Stelle", () => {
    const m = zweiViertel([dupfe([0, 1], [1, 8]), dupfe([1, 4], [1, 4])]);
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Luecke auf 1\/8/);
  });

  it("verwirft eine Luecke am Taktende", () => {
    const m = zweiViertel([dupfe([0, 1], [1, 4])]);
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Luecke auf 1\/4/);
  });

  it("verwirft einen leeren Takt", () => {
    const m = zweiViertel([]);
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
  });

  it("verwirft eine Pause, die einen Schlag ueberlappt, und nennt die Stelle", () => {
    const m = zweiViertel([dupfe([0, 1], [1, 4]), pause([1, 8], [1, 8]), dupfe([1, 4], [1, 4])]);
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Ueberlappung auf 1\/8/);
  });

  it("benennt Vers und Takt der Luecke", () => {
    const m = zweiViertel([dupfe([0, 1], [2, 4])], [dupfe([0, 1], [1, 4])]);
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Takt 2/);
  });
});

describe("andereHand", () => {
  it("spiegelt die Hand — der Vorschlag eines Schlepps liegt in der anderen", () => {
    expect(andereHand("links")).toBe("rechts");
    expect(andereHand("rechts")).toBe("links");
  });
});

describe("zaehlzeit", () => {
  it("gibt 6/8 die punktierte Viertel als Zaehlzeit", () => {
    expect(zaehlzeit({ zaehler: 6, nenner: 8 })).toEqual({ zaehler: 3, nenner: 8 });
  });

  it("gibt 9/8 ebenfalls die punktierte Viertel", () => {
    expect(zaehlzeit({ zaehler: 9, nenner: 8 })).toEqual({ zaehler: 3, nenner: 8 });
  });

  it("gibt 2/4 die Viertel", () => {
    expect(zaehlzeit({ zaehler: 2, nenner: 4 })).toEqual({ zaehler: 1, nenner: 4 });
  });

  it("behandelt 3/8 als einfache Taktart", () => {
    expect(zaehlzeit({ zaehler: 3, nenner: 8 })).toEqual({ zaehler: 1, nenner: 8 });
  });

  it("behandelt das ungerade 5/8 als einfache Taktart", () => {
    expect(zaehlzeit({ zaehler: 5, nenner: 8 })).toEqual({ zaehler: 1, nenner: 8 });
  });
});

describe("folgeschlag", () => {
  it("findet den naechsten Schlag im selben Takt, mit seinem Abstand", () => {
    const landung = schlag("Dupfe", "rechts", [1, 8], [1, 8]);
    const [vers] = zweiViertel([schlag("Fuenferruf", "rechts", [0, 1], [1, 8]), landung]).verse;

    expect(folgeschlag(vers!, 0, 0)).toEqual({
      schlag: landung,
      abstand: bruch(1, 8),
      taktIndex: 0,
      index: 1,
    });
  });

  it("findet den ersten Schlag des naechsten Taktes, ueber den Taktstrich gemessen", () => {
    const landung = schlag("Dupfe", "rechts", [0, 1], [2, 4]);
    const [vers] = zweiViertel(
      [schlag("Dupfe", "rechts", [0, 1], [3, 8]), schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
      [landung],
    ).verse;

    expect(folgeschlag(vers!, 0, 1)).toEqual({
      schlag: landung,
      abstand: bruch(1, 8),
      taktIndex: 1,
      index: 0,
    });
  });

  it("findet keinen Schlag ueber das Ende des Verses hinaus", () => {
    const [vers] = zweiViertel([schlag("Fuenferruf", "rechts", [3, 8], [1, 8])]).verse;

    expect(folgeschlag(vers!, 0, 0)).toBeUndefined();
  });
});

describe("pruefeMarsch: Fuenferruf und Landung", () => {
  it("laesst einen Ruf mit Landung eine Achtel spaeter in derselben Hand gelten", () => {
    const m = zweiViertel([
      schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
      schlag("Dupfe", "rechts", [1, 8], [1, 8]),
      pause([1, 4], [1, 4]),
    ]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft einen Ruf, auf den kein Schlag mehr folgt", () => {
    const m = zweiViertel([pause([0, 1], [3, 8]), schlag("Fuenferruf", "rechts", [3, 8], [1, 8])]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
  });

  it("verwirft eine Landung, die nicht genau eine Achtel nach dem Ruf liegt", () => {
    const m = zweiViertel([
      schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
      pause([1, 8], [1, 8]),
      schlag("Dupfe", "rechts", [1, 4], [1, 8]),
      pause([3, 8], [1, 8]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
  });

  it("verwirft eine Landung in der anderen Hand", () => {
    const m = zweiViertel([
      schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
      schlag("Dupfe", "links", [1, 8], [1, 8]),
      pause([1, 4], [1, 4]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
  });

  it("laesst eine Landung auf dem naechsten Taktbeginn gelten, ueber den Taktstrich", () => {
    const m = zweiViertel(
      [schlag("Dupfe", "rechts", [0, 1], [3, 8]), schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
      [schlag("Dupfe", "rechts", [0, 1], [2, 4])],
    );
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("misst den Abstand ueber den Taktstrich hinweg", () => {
    // Der Ruf liegt eine Viertel vor dem Taktende, die Landung also zu spaet.
    const m = zweiViertel(
      [
        pause([0, 1], [1, 4]),
        schlag("Fuenferruf", "rechts", [1, 4], [1, 8]),
        pause([3, 8], [1, 8]),
      ],
      [schlag("Dupfe", "rechts", [0, 1], [2, 4])],
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
  });

  it("sucht die Landung nicht im naechsten Vers", () => {
    const [vers] = zweiViertel([
      schlag("Dupfe", "rechts", [0, 1], [3, 8]),
      schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
    ]).verse;
    const [naechster] = zweiViertel([schlag("Dupfe", "rechts", [0, 1], [2, 4])]).verse;
    const m: Marsch = { titel: "Test", verse: [vers!, naechster!] };

    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
  });

  it("laesst den gespiegelten Ruf links mit Landung links gelten", () => {
    const m = zweiViertel([
      schlag("Fuenferruf", "links", [0, 1], [1, 8]),
      schlag("Dupfe", "links", [1, 8], [1, 8]),
      pause([1, 4], [1, 4]),
    ]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("benennt Vers und Takt des Rufs", () => {
    const m = zweiViertel(
      [schlag("Dupfe", "rechts", [0, 1], [2, 4])],
      [pause([0, 1], [3, 8]), schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1.*Takt 2/);
  });
});

describe("pruefeMarsch: Auftakt", () => {
  it("laesst einen Ruf-Auftakt gelten, der in Takt 1 landet und bei der Wiederholung ueber eine Pause faellt", () => {
    const m = marschAus(versMitAuftakt([2, 4], 2, rufAuftakt(), endetMitPause()));
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft einen Auftakt ohne Schlag", () => {
    const m = marschAus(versMitAuftakt([2, 4], 1, [pause([3, 8], [1, 8])], endetMitPause()));
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
  });

  it("verwirft einen Auftakt, der mit einer Pause beginnt", () => {
    const m = marschAus(
      versMitAuftakt([2, 4], 1, [pause([1, 4], [1, 8]), dupfe([3, 8], [1, 8])], endetMitPause()),
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
  });

  it("verwirft einen Auftakt, der so lang ist wie ein ganzer Takt", () => {
    const m = marschAus(versMitAuftakt([2, 4], 1, endetKlingend(), endetMitPause()));
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
  });

  it("verwirft einen Auftakt, der nicht lueckenlos bis zum Taktende reicht", () => {
    const m = marschAus(versMitAuftakt([2, 4], 1, [dupfe([1, 4], [1, 16])], endetMitPause()));
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Luecke auf 5\/16/);
  });

  it("verwirft einen Auftakt, der bei der Wiederholung ueber einen klingenden Schlag fiele", () => {
    const m = marschAus(versMitAuftakt([2, 4], 2, [dupfe([3, 8], [1, 8])], endetKlingend()));
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
  });

  it("prueft den eigenen letzten Takt nicht, wenn der Vers nicht wiederholt wird", () => {
    const m = marschAus(versMitAuftakt([2, 4], 1, [dupfe([3, 8], [1, 8])], endetKlingend()));
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft einen Auftakt, der ueber den klingenden Schluss des vorigen Verses fiele", () => {
    const m = marschAus(
      ohneAuftakt([2, 4], 1, endetKlingend()),
      versMitAuftakt([2, 4], 1, [dupfe([3, 8], [1, 8])], endetMitPause()),
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 2, Auftakt.*Vers 1/);
  });

  it("laesst einen Auftakt ueber die Schlusspause des vorigen Verses gelten", () => {
    const m = marschAus(
      ohneAuftakt([2, 4], 1, endetMitPause()),
      versMitAuftakt([2, 4], 1, [dupfe([3, 8], [1, 8])], endetMitPause()),
    );
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft einen Auftakt, der laenger ist als der letzte Takt des vorigen Verses", () => {
    // Anderthalb Zaehlzeiten Auftakt nach einem 1/4-Takt von einer einzigen.
    const m = marschAus(
      ohneAuftakt([1, 4], 1, [pause([0, 1], [1, 4])]),
      versMitAuftakt([2, 4], 1, [dupfe([1, 8], [3, 8])], endetMitPause()),
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
    expect(() => pruefeMarsch(m)).toThrow(/laenger/);
  });

  it("meldet einen kaputten letzten Takt als solchen, nicht als Fehler des Auftakts", () => {
    const m = marschAus(
      versMitAuftakt([2, 4], 2, [dupfe([3, 8], [1, 8])], [dupfe([0, 1], [1, 4])]),
    );
    expect(() => pruefeMarsch(m)).toThrow(LueckenhafterTaktError);
  });

  describe("ueber einen Wechsel der Taktart, in Zaehlzeiten gemessen", () => {
    // Eine Achtel in 2/4 ist eine halbe Zaehlzeit; in 6/8 sind das 3/16, mehr als eine Achtel.
    const nachSechsAchtel = (schluss: (Schlag | Pause)[]): Marsch =>
      marschAus(
        ohneAuftakt([6, 8], 1, schluss),
        versMitAuftakt([2, 4], 1, [dupfe([3, 8], [1, 8])], endetMitPause()),
      );

    it("verwirft ihn, wenn die Schlusspause kuerzer ist als seine Zaehlzeiten", () => {
      const m = nachSechsAchtel([
        dupfe([0, 1], [3, 8]),
        dupfe([3, 8], [1, 4]),
        pause([5, 8], [1, 8]),
      ]);
      expect(() => pruefeMarsch(m)).toThrow(UngueltigerAuftaktError);
    });

    it("laesst ihn gelten, wenn die Schlusspause seine Zaehlzeiten deckt", () => {
      const m = nachSechsAchtel([dupfe([0, 1], [3, 8]), pause([3, 8], [3, 8])]);
      expect(() => pruefeMarsch(m)).not.toThrow();
    });
  });

  it("verwirft einen Ruf im Auftakt, dessen Landung in Takt 1 in der falschen Hand liegt", () => {
    const takt1: (Schlag | Pause)[] = [
      schlag("Dupfe", "links", [0, 1], [1, 4]),
      pause([1, 4], [1, 4]),
    ];
    const m = marschAus(versMitAuftakt([2, 4], 1, rufAuftakt(), takt1));
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Auftakt/);
  });

  it("verwirft einen Ruf im Auftakt, der nicht eine Achtel vor Takt 1 steht", () => {
    const m = marschAus(
      versMitAuftakt(
        [2, 4],
        1,
        [schlag("Fuenferruf", "rechts", [1, 4], [1, 8]), pause([3, 8], [1, 8])],
        endetMitPause(),
      ),
    );
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerRufError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Auftakt/);
  });
});

describe("folgeschlag aus dem Auftakt", () => {
  it("findet den ersten Schlag von Takt 1, ueber den Taktstrich gemessen", () => {
    const vers = versMitAuftakt([2, 4], 1, rufAuftakt(), endetMitPause());

    expect(folgeschlag(vers, AUFTAKT, 0)).toEqual({
      schlag: vers.takte[0]!.schlaege[0],
      abstand: bruch(1, 8),
      taktIndex: 0,
      index: 0,
    });
  });
});

describe("pruefeMarsch: Double", () => {
  it("laesst einen Takt gelten, den Doubles mit ihren Werten fuellen", () => {
    const m = zweiViertel([
      pause([0, 1], [1, 8]),
      schlag("Double", "links", [1, 8], [1, 8]),
      schlag("Double", "rechts", [1, 4], [1, 8]),
      schlag("Double", "links", [3, 8], [1, 8]),
    ]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("laesst ein Double auf dem Beginn von Takt 1 gelten, obwohl seine Dupfe davor faellt", () => {
    const m = zweiViertel([schlag("Double", "rechts", [0, 1], [2, 4])]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });
});

describe("pruefeMarsch: Tole", () => {
  /** Die erste Zaehlzeit von ZicZac, Vers 1, Takt 3: vier Sechzehntel. */
  const ersteZaehlzeit = (): Schlag[] => [
    schlag("Double", "rechts", [0, 1], [1, 16]),
    schlag("Dupfe", "links", [1, 16], [1, 16]),
    schlag("Dupfe", "rechts", [1, 8], [1, 16]),
    schlag("Dupfe", "rechts", [3, 16], [1, 16]),
  ];
  /** Die Quintole der zweiten Zaehlzeit: Achtel, Sechzehntel, Achtel. */
  const quintole = (): Taktinhalt[] => [
    tole([1, 4], 5, 4, [1, 16]),
    schlag("Dupfe", "links", [1, 4], [1, 8]),
    schlag("Dupfe", "links", [7, 20], [1, 16]),
    schlag("Dupfe", "rechts", [2, 5], [1, 8]),
  ];

  it("laesst ZicZac, Vers 1, Takt 3 mit seiner Quintole gelten", () => {
    const m = zweiViertel([...ersteZaehlzeit(), ...quintole()]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("laesst eine Triole aus drei Achteln statt zwei gelten", () => {
    const m = zweiViertel([
      tole([0, 1], 3, 2, [1, 8]),
      dupfe([0, 1], [1, 8]),
      dupfe([1, 12], [1, 8]),
      dupfe([1, 6], [1, 8]),
      dupfe([1, 4], [1, 4]),
    ]);
    expect(() => pruefeMarsch(m)).not.toThrow();
  });

  it("verwirft eine Quintole, der eine Sechzehntel fehlt", () => {
    const m = zweiViertel([
      ...ersteZaehlzeit(),
      tole([1, 4], 5, 4, [1, 16]),
      schlag("Dupfe", "links", [1, 4], [1, 8]),
      schlag("Dupfe", "links", [7, 20], [1, 16]),
      schlag("Dupfe", "rechts", [2, 5], [1, 16]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigeToleError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Takt 1/);
  });

  it("verwirft eine Quintole, die eine Sechzehntel zu lang ist", () => {
    const m = zweiViertel([
      ...ersteZaehlzeit(),
      tole([1, 4], 5, 4, [1, 16]),
      schlag("Dupfe", "links", [1, 4], [1, 8]),
      schlag("Dupfe", "links", [7, 20], [1, 16]),
      schlag("Dupfe", "rechts", [2, 5], [3, 16]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigeToleError);
  });

  // Mit ihren notierten Werten laeuft die letzte Achtel ueber das Taktende.
  it("verwirft dieselben Schlaege ohne Tole", () => {
    const m = zweiViertel([...ersteZaehlzeit(), ...quintole().slice(1)]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigerTaktError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Takt 1/);
  });

  it("verwirft eine Tole, die ueber das Taktende hinausreicht", () => {
    const m = zweiViertel([
      dupfe([0, 1], [1, 4]),
      dupfe([1, 4], [1, 8]),
      tole([3, 8], 5, 4, [1, 16]),
      dupfe([3, 8], [1, 16]),
      dupfe([17, 40], [1, 16]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigeToleError);
    expect(() => pruefeMarsch(m)).toThrow(/Vers 1, Takt 1/);
  });

  it("verwirft zwei Tolen, die sich ueberlappen", () => {
    const m = zweiViertel([
      tole([0, 1], 3, 2, [1, 8]),
      tole([1, 6], 3, 2, [1, 8]),
      dupfe([0, 1], [1, 8]),
      dupfe([1, 12], [1, 8]),
      dupfe([1, 6], [1, 8]),
      dupfe([1, 4], [1, 4]),
    ]);
    expect(() => pruefeMarsch(m)).toThrow(UngueltigeToleError);
  });
});
