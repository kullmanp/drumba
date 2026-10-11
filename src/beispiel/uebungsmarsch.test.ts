import { describe, expect, it } from "vitest";
import { layout } from "../layout/layout";
import { taktÜberlauf } from "../model/marsch";
import { übungsmarsch } from "./uebungsmarsch";

describe("Übungsmarsch", () => {
  it("füllt jeden Takt gültig", () => {
    for (const vers of übungsmarsch.verse) {
      for (const takt of vers.takte) {
        expect(taktÜberlauf(takt, vers.taktart)).toBeUndefined();
      }
    }
  });

  it("zeigt beide Figuren dieser Iteration", () => {
    const figuren = new Set(
      übungsmarsch.verse.flatMap((v) => v.takte.flatMap((t) => t.schlaege.map((s) => s.figur))),
    );
    expect(figuren).toEqual(new Set(["Dupfe", "Schlepp"]));
  });

  it("zeigt beide Hände — die Notenköpfe liegen über und unter der Linie", () => {
    const glyphen = layout(übungsmarsch).glyphen;
    const linie = glyphen.find((g) => g.typ === "notenlinie")!;
    const köpfe = glyphen.filter((g) => g.typ === "notenkopf");

    expect(köpfe.some((k) => k.y < linie.y)).toBe(true);
    expect(köpfe.some((k) => k.y > linie.y)).toBe(true);
  });

  it("zeigt einen Schlepp auf jeder Hand", () => {
    const schlepps = übungsmarsch.verse.flatMap((v) =>
      v.takte.flatMap((t) => t.schlaege.filter((s) => s.figur === "Schlepp").map((s) => s.hand)),
    );
    expect(new Set(schlepps)).toEqual(new Set(["rechts", "links"]));
  });

  it("hält jede Balkengruppe gleichwertig — Balkenstummel gibt es noch nicht", () => {
    expect(() => layout(übungsmarsch)).not.toThrow();
  });

  it("hat einen wiederholten und einen einmal gespielten Vers", () => {
    expect(übungsmarsch.verse.map((v) => v.wiederholungen)).toEqual([2, 1]);
  });

  it("hat einen 6/8-Vers mit Balkengruppen", () => {
    const sechsAchtel = übungsmarsch.verse.find((v) => v.taktart.nenner === 8);
    expect(sechsAchtel?.taktart.zähler).toBe(6);
    expect(layout(übungsmarsch).glyphen.some((g) => g.typ === "balken")).toBe(true);
  });

  it("lässt sich vollständig setzen", () => {
    const gesetzt = layout(übungsmarsch);
    expect(gesetzt.breite).toBeGreaterThan(0);
    expect(gesetzt.höhe).toBeGreaterThan(0);
  });
});
