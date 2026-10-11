import { describe, expect, it } from "vitest";
import { layout } from "../layout/layout";
import { taktUeberlauf } from "../model/marsch";
import { uebungsmarsch } from "./uebungsmarsch";

describe("Uebungsmarsch", () => {
  it("fuellt jeden Takt gueltig", () => {
    for (const vers of uebungsmarsch.verse) {
      for (const takt of vers.takte) {
        expect(taktUeberlauf(takt, vers.taktart)).toBeUndefined();
      }
    }
  });

  it("zeigt beide Figuren dieser Iteration", () => {
    const figuren = new Set(
      uebungsmarsch.verse.flatMap((v) => v.takte.flatMap((t) => t.schlaege.map((s) => s.figur))),
    );
    expect(figuren).toEqual(new Set(["Dupfe", "Schlepp"]));
  });

  it("zeigt beide Haende — die Notenkoepfe liegen ueber und unter der Linie", () => {
    const glyphen = layout(uebungsmarsch).glyphen;
    const linie = glyphen.find((g) => g.typ === "notenlinie")!;
    const koepfe = glyphen.filter((g) => g.typ === "notenkopf");

    expect(koepfe.some((k) => k.y < linie.y)).toBe(true);
    expect(koepfe.some((k) => k.y > linie.y)).toBe(true);
  });

  it("zeigt einen Schlepp auf jeder Hand", () => {
    const schlepps = uebungsmarsch.verse.flatMap((v) =>
      v.takte.flatMap((t) => t.schlaege.filter((s) => s.figur === "Schlepp").map((s) => s.hand)),
    );
    expect(new Set(schlepps)).toEqual(new Set(["rechts", "links"]));
  });

  it("haelt jede Balkengruppe gleichwertig — Balkenstummel gibt es noch nicht", () => {
    expect(() => layout(uebungsmarsch)).not.toThrow();
  });

  it("hat einen wiederholten und einen einmal gespielten Vers", () => {
    expect(uebungsmarsch.verse.map((v) => v.wiederholungen)).toEqual([2, 1]);
  });

  it("hat einen 6/8-Vers mit Balkengruppen", () => {
    const sechsAchtel = uebungsmarsch.verse.find((v) => v.taktart.nenner === 8);
    expect(sechsAchtel?.taktart.zaehler).toBe(6);
    expect(layout(uebungsmarsch).glyphen.some((g) => g.typ === "balken")).toBe(true);
  });

  it("laesst sich vollstaendig setzen", () => {
    const gesetzt = layout(uebungsmarsch);
    expect(gesetzt.breite).toBeGreaterThan(0);
    expect(gesetzt.hoehe).toBeGreaterThan(0);
  });
});
