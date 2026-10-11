import { describe, expect, it } from "vitest";
import { bruch } from "./bruch";
import type { Schlag, Takt } from "./marsch";
import { andereHand, taktLaenge, taktUeberlauf, zaehlzeit } from "./marsch";

const dupfe = (position: [number, number], wert: [number, number]): Schlag => ({
  figur: "Dupfe",
  hand: "rechts",
  position: bruch(...position),
  wert: bruch(...wert),
});

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
    const takt: Takt = {
      schlaege: [dupfe([5, 8], [1, 8])],
    };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet keinen Ueberlauf fuer einen halbleeren Takt", () => {
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8])] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet den Schlag, dessen Wert ueber den Takt hinausragt", () => {
    const zuLang = dupfe([5, 8], [1, 4]);
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8]), zuLang] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet den Schlag, der jenseits des Taktendes beginnt", () => {
    const zuSpaet = dupfe([7, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuSpaet] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuSpaet);
  });

  it("meldet einen Schlag vor dem Taktbeginn", () => {
    const zuFrueh = dupfe([-1, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuFrueh] };
    expect(taktUeberlauf(takt, sechsAchtel)).toBe(zuFrueh);
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
