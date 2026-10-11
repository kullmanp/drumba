import { describe, expect, it } from "vitest";
import { bruch } from "./bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt } from "./marsch";
import {
  andereHand,
  folgeschlag,
  LueckenhafterTaktError,
  pruefeMarsch,
  taktLaenge,
  taktUeberlauf,
  UngueltigerRufError,
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

/** Ein Takt aus Schlaegen und Pausen, in beliebiger Mischung hingeschrieben. */
const takt = (elemente: (Schlag | Pause)[]): Takt => ({
  schlaege: elemente.filter((e): e is Schlag => "figur" in e),
  pausen: elemente.filter((e): e is Pause => !("figur" in e)),
});

/** Ein 2/4-Vers aus den gegebenen Takten. */
const zweiViertel = (...takte: (Schlag | Pause)[][]): Marsch => ({
  titel: "Test",
  verse: [{ taktart: { zaehler: 2, nenner: 4 }, wiederholungen: 1, takte: takte.map(takt) }],
});

const dupfe = (position: [number, number], wert: [number, number]): Schlag => ({
  figur: "Dupfe",
  hand: "rechts",
  position: bruch(...position),
  wert: bruch(...wert),
});

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
    const takt: Takt = { schlaege: [dupfe([5, 8], [1, 8])], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  // Nur der Ueberlauf: dass der halbleere Takt eine Luecke hat, meldet pruefeMarsch.
  it("meldet keinen Ueberlauf fuer einen halbleeren Takt", () => {
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8])], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet den Schlag, dessen Wert ueber den Takt hinausragt", () => {
    const zuLang = dupfe([5, 8], [1, 4]);
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8]), zuLang], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet den Schlag, der jenseits des Taktendes beginnt", () => {
    const zuSpaet = dupfe([7, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuSpaet], pausen: [] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuSpaet);
  });

  it("meldet auch eine Pause, die ueber das Taktende hinausragt", () => {
    const zuLang = pause([1, 2], [3, 8]);
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 2])], pausen: [zuLang] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet einen Schlag vor dem Taktbeginn", () => {
    const zuFrueh = dupfe([-1, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuFrueh], pausen: [] };
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
