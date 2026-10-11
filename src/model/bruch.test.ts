import { describe, expect, it } from "vitest";
import { addiere, alsZahl, bruch, dividiere, vergleiche } from "./bruch";

describe("bruch", () => {
  it("kuerzt auf kleinste Form", () => {
    expect(bruch(6, 8)).toEqual({ zaehler: 3, nenner: 4 });
  });

  it("normalisiert ein negatives Vorzeichen auf den Zaehler", () => {
    expect(bruch(1, -2)).toEqual({ zaehler: -1, nenner: 2 });
  });

  it("stellt null als 0/1 dar", () => {
    expect(bruch(0, 5)).toEqual({ zaehler: 0, nenner: 1 });
  });

  it("weist den Nenner null zurueck", () => {
    expect(() => bruch(1, 0)).toThrow();
  });

  it("weist nicht-ganzzahlige Bestandteile zurueck", () => {
    expect(() => bruch(1.5, 2)).toThrow();
  });
});

describe("Arithmetik", () => {
  it("dividiert exakt: ein 6/8-Takt misst zwei punktierte Viertel", () => {
    expect(dividiere(bruch(3, 4), bruch(3, 8))).toEqual({ zaehler: 2, nenner: 1 });
  });

  it("dividiert mit negativem Ergebnis", () => {
    expect(dividiere(bruch(-1, 8), bruch(1, 4))).toEqual({ zaehler: -1, nenner: 2 });
  });

  it("addiert ueber verschiedene Nenner exakt", () => {
    // Ein 6/8-Takt: fuenf Achtel plus ein Sechzehntel = 11/16.
    expect(addiere(bruch(5, 8), bruch(1, 16))).toEqual({ zaehler: 11, nenner: 16 });
  });

  it("addiert die sechs Achtel eines 6/8-Taktes ohne Drift", () => {
    const achtel = bruch(1, 8);
    let summe = bruch(0, 1);
    for (let i = 0; i < 6; i++) summe = addiere(summe, achtel);
    expect(summe).toEqual({ zaehler: 3, nenner: 4 });
  });

  it("addiert die fuenf Achtel eines 5/8-Taktes ohne Drift", () => {
    const achtel = bruch(1, 8);
    let summe = bruch(0, 1);
    for (let i = 0; i < 5; i++) summe = addiere(summe, achtel);
    expect(summe).toEqual({ zaehler: 5, nenner: 8 });
  });
});

describe("Vergleich", () => {
  it("ordnet ueber verschiedene Nenner", () => {
    expect(vergleiche(bruch(1, 3), bruch(1, 2))).toBe(-1);
    expect(vergleiche(bruch(1, 2), bruch(1, 3))).toBe(1);
    expect(vergleiche(bruch(2, 4), bruch(1, 2))).toBe(0);
  });

  it("erkennt Gleichheit unabhaengig von der Schreibweise", () => {
    expect(vergleiche(bruch(2, 16), bruch(1, 8))).toBe(0);
  });
});

describe("alsZahl", () => {
  it("gibt den Dezimalwert fuer die Geometrie zurueck", () => {
    expect(alsZahl(bruch(3, 4))).toBe(0.75);
  });
});
