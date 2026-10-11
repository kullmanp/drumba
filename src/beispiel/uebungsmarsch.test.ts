import { describe, expect, it } from "vitest";
import { layout } from "../layout/layout";
import { pruefeMarsch } from "../model/marsch";
import { uebungsmarsch } from "./uebungsmarsch";

describe("Uebungsmarsch", () => {
  it("ist gueltig: jeder Takt passt, jeder Ruf landet", () => {
    expect(() => pruefeMarsch(uebungsmarsch)).not.toThrow();
  });

  it("zeigt alle Figuren des Modells", () => {
    const figuren = new Set(
      uebungsmarsch.verse.flatMap((v) => v.takte.flatMap((t) => t.schlaege.map((s) => s.figur))),
    );
    expect(figuren).toEqual(new Set(["Dupfe", "Schlepp", "Fuenferruf"]));
  });

  it("zeigt einen Fuenferruf im Takt und einen, der ueber den Taktstrich landet", () => {
    const glyphen = layout(uebungsmarsch).glyphen;
    const striche = glyphen.filter((g) => g.typ === "taktstrich").map((g) => g.x);
    const boegen = glyphen.filter((g) => g.typ === "bogen");
    const ueberquert = (b: (typeof boegen)[number]) => striche.some((x) => b.x1 < x && x < b.x2);

    expect(boegen.some((b) => !ueberquert(b))).toBe(true);
    expect(boegen.some(ueberquert)).toBe(true);
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

  it("zeigt Balkenstummel in beide Richtungen", () => {
    const stummel = layout(uebungsmarsch).glyphen.filter((g) => g.typ === "balkenstummel");
    expect(new Set(stummel.map((s) => Math.sign(s.x2 - s.x1)))).toEqual(new Set([1, -1]));
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
