import { describe, expect, it } from "vitest";
import { addiere, alsZahl, bruch, dividiere, vergleiche } from "./bruch";

describe("bruch", () => {
  it("kürzt auf kleinste Form", () => {
    expect(bruch(6, 8)).toEqual({ zähler: 3, nenner: 4 });
  });

  it("normalisiert ein negatives Vorzeichen auf den Zähler", () => {
    expect(bruch(1, -2)).toEqual({ zähler: -1, nenner: 2 });
  });

  it("stellt null als 0/1 dar", () => {
    expect(bruch(0, 5)).toEqual({ zähler: 0, nenner: 1 });
  });

  it("weist den Nenner null zurück", () => {
    expect(() => bruch(1, 0)).toThrow();
  });

  it("weist nicht-ganzzahlige Bestandteile zurück", () => {
    expect(() => bruch(1.5, 2)).toThrow();
  });
});

describe("Arithmetik", () => {
  it("dividiert exakt: ein 6/8-Takt misst zwei punktierte Viertel", () => {
    expect(dividiere(bruch(3, 4), bruch(3, 8))).toEqual({ zähler: 2, nenner: 1 });
  });

  it("dividiert mit negativem Ergebnis", () => {
    expect(dividiere(bruch(-1, 8), bruch(1, 4))).toEqual({ zähler: -1, nenner: 2 });
  });

  it("addiert über verschiedene Nenner exakt", () => {
    // Ein 6/8-Takt: fünf Achtel plus ein Sechzehntel = 11/16.
    expect(addiere(bruch(5, 8), bruch(1, 16))).toEqual({ zähler: 11, nenner: 16 });
  });

  it("addiert die sechs Achtel eines 6/8-Taktes ohne Drift", () => {
    const achtel = bruch(1, 8);
    let summe = bruch(0, 1);
    for (let i = 0; i < 6; i++) summe = addiere(summe, achtel);
    expect(summe).toEqual({ zähler: 3, nenner: 4 });
  });

  it("addiert die fünf Achtel eines 5/8-Taktes ohne Drift", () => {
    const achtel = bruch(1, 8);
    let summe = bruch(0, 1);
    for (let i = 0; i < 5; i++) summe = addiere(summe, achtel);
    expect(summe).toEqual({ zähler: 5, nenner: 8 });
  });
});

describe("Vergleich", () => {
  it("ordnet über verschiedene Nenner", () => {
    expect(vergleiche(bruch(1, 3), bruch(1, 2))).toBe(-1);
    expect(vergleiche(bruch(1, 2), bruch(1, 3))).toBe(1);
    expect(vergleiche(bruch(2, 4), bruch(1, 2))).toBe(0);
  });

  it("erkennt Gleichheit unabhängig von der Schreibweise", () => {
    expect(vergleiche(bruch(2, 16), bruch(1, 8))).toBe(0);
  });
});

describe("alsZahl", () => {
  it("gibt den Dezimalwert für die Geometrie zurück", () => {
    expect(alsZahl(bruch(3, 4))).toBe(0.75);
  });
});
