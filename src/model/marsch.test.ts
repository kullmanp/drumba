import { describe, expect, it } from "vitest";
import { bruch } from "./bruch";
import type { Schlag, Takt } from "./marsch";
import { andereHand, taktLänge, taktÜberlauf, zählzeit } from "./marsch";

const dupfe = (position: [number, number], wert: [number, number]): Schlag => ({
  figur: "Dupfe",
  hand: "rechts",
  position: bruch(...position),
  wert: bruch(...wert),
});

describe("taktLänge", () => {
  it("misst einen 6/8-Takt als 6/8 einer Ganzen", () => {
    expect(taktLänge({ zähler: 6, nenner: 8 })).toEqual({ zähler: 3, nenner: 4 });
  });

  it("misst einen 5/8-Takt exakt", () => {
    expect(taktLänge({ zähler: 5, nenner: 8 })).toEqual({ zähler: 5, nenner: 8 });
  });
});

describe("taktÜberlauf", () => {
  const sechsAchtel = { zähler: 6, nenner: 8 };

  it("meldet keinen Überlauf für einen exakt gefüllten Takt", () => {
    const takt: Takt = {
      schlaege: [dupfe([5, 8], [1, 8])],
    };
    expect(taktÜberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet keinen Überlauf für einen halbleeren Takt", () => {
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8])] };
    expect(taktÜberlauf(takt, sechsAchtel)).toBeUndefined();
  });

  it("meldet den Schlag, dessen Wert über den Takt hinausragt", () => {
    const zuLang = dupfe([5, 8], [1, 4]);
    const takt: Takt = { schlaege: [dupfe([0, 1], [1, 8]), zuLang] };
    expect(taktÜberlauf(takt, sechsAchtel)).toBe(zuLang);
  });

  it("meldet den Schlag, der jenseits des Taktendes beginnt", () => {
    const zuSpät = dupfe([7, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuSpät] };
    expect(taktÜberlauf(takt, sechsAchtel)).toBe(zuSpät);
  });

  it("meldet einen Schlag vor dem Taktbeginn", () => {
    const zuFrüh = dupfe([-1, 8], [1, 8]);
    const takt: Takt = { schlaege: [zuFrüh] };
    expect(taktÜberlauf(takt, sechsAchtel)).toBe(zuFrüh);
  });
});

describe("andereHand", () => {
  it("spiegelt die Hand — der Vorschlag eines Schlepps liegt in der anderen", () => {
    expect(andereHand("links")).toBe("rechts");
    expect(andereHand("rechts")).toBe("links");
  });
});

describe("zählzeit", () => {
  it("gibt 6/8 die punktierte Viertel als Zählzeit", () => {
    expect(zählzeit({ zähler: 6, nenner: 8 })).toEqual({ zähler: 3, nenner: 8 });
  });

  it("gibt 9/8 ebenfalls die punktierte Viertel", () => {
    expect(zählzeit({ zähler: 9, nenner: 8 })).toEqual({ zähler: 3, nenner: 8 });
  });

  it("gibt 2/4 die Viertel", () => {
    expect(zählzeit({ zähler: 2, nenner: 4 })).toEqual({ zähler: 1, nenner: 4 });
  });

  it("behandelt 3/8 als einfache Taktart", () => {
    expect(zählzeit({ zähler: 3, nenner: 8 })).toEqual({ zähler: 1, nenner: 8 });
  });

  it("behandelt das ungerade 5/8 als einfache Taktart", () => {
    expect(zählzeit({ zähler: 5, nenner: 8 })).toEqual({ zähler: 1, nenner: 8 });
  });
});
