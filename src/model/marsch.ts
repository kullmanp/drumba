import type { Bruch } from "./bruch";
import { addiere, bruch, NULL, vergleiche } from "./bruch";

/**
 * Das kanonische Modell (ADR-0001). Es hält alles, was Zündstoffnoten sagen
 * können, und weiss nichts vom Zeichnen.
 */

/** Welche Hand den Schlag spielt. Immer explizit, nie abgeleitet. */
export type Hand = "links" | "rechts";

export const andereHand = (hand: Hand): Hand => (hand === "links" ? "rechts" : "links");

/**
 * Die Art eines Schlags aus dem Basler Figurenvokabular. Flache Menge: ein
 * Schlepp ist eine eigene Figur, keine verzierte Dupfe. Das volle Vokabular
 * kommt später — erweitern heisst hier eintragen und in `figurZeichnung`
 * (siehe Layout) die Geometrie ergänzen.
 *
 * Die Ruf-Familie fehlt bewusst: wie ein Wirbel geschrieben wird, ist noch
 * nicht geklärt (siehe `GLOSSARY.md`), und eine Figur, die wir nicht zeichnen
 * können, soll das Modell nicht behaupten.
 */
export type Figur = "Dupfe" | "Schlepp";

/** Ein Schlag: das atomare Ereignis des Modells. */
export interface Schlag {
  readonly figur: Figur;
  /** Die primäre Hand. Ein Vorschlag liegt in der anderen. */
  readonly hand: Hand;
  /** Exakte Position im Takt, gemessen in Ganzen ab Taktbeginn. */
  readonly position: Bruch;
  /** Der notierte Wert, in Ganzen: 1/8 = Achtel, 3/8 = punktierte Viertel. */
  readonly wert: Bruch;
}

/** Ein Takt: die geordneten Schläge eines Taktes. */
export interface Takt {
  readonly schlaege: readonly Schlag[];
}

/**
 * Die Taktart, mit beliebigem Zähler und Nenner — 6/8, 2/4, 5/8.
 *
 * Bewusst kein `Bruch`: ein Bruch kürzt, und 6/8 zu 3/4 zu kürzen zerstörte
 * die Taktart. 6/8 und 3/4 messen gleich lang und zählen doch verschieden.
 */
export interface Taktart {
  readonly zaehler: number;
  readonly nenner: number;
}

/** Ein Vers: ein Abschnitt des Marsches mit eigener Wiederholungszahl. */
export interface Vers {
  readonly taktart: Taktart;
  /** Wie oft der Vers gespielt wird: 2 (wiederholt) oder 1. */
  readonly wiederholungen: 1 | 2;
  readonly takte: readonly Takt[];
}

/** Ein Marsch: das Werk, das der Benutzer schreibt und in seiner Bibliothek hält. */
export interface Marsch {
  readonly titel: string;
  readonly verse: readonly Vers[];
}

/** Die Länge eines Taktes in Ganzen: 6/8 misst 3/4. */
export const taktLaenge = (taktart: Taktart): Bruch => bruch(taktart.zaehler, taktart.nenner);

/**
 * Der erste Schlag, der nicht in den Takt passt — vor dem Beginn oder über das
 * Ende hinaus. `undefined`, wenn der Takt gültig ist. Ein überlaufender Takt
 * ist ein Datenfehler und darf nicht still gezeichnet werden.
 */
export const taktUeberlauf = (takt: Takt, taktart: Taktart): Schlag | undefined => {
  const laenge = taktLaenge(taktart);
  return takt.schlaege.find(
    (schlag) =>
      vergleiche(schlag.position, NULL) < 0 ||
      vergleiche(addiere(schlag.position, schlag.wert), laenge) > 0,
  );
};

/**
 * Ein Takt, dessen Schläge nicht in seine Taktart passen. Solche Daten werden
 * weder gezeichnet noch gespielt — falsch gesetzte Schläge sollen auffallen,
 * nicht still über den Taktstrich hinauslaufen.
 */
export class UngültigerTaktError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    readonly schlag: Schlag,
    taktart: Taktart,
  ) {
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: ${schlag.figur} auf ` +
        `${schlag.position.zaehler}/${schlag.position.nenner} mit Wert ` +
        `${schlag.wert.zaehler}/${schlag.wert.nenner} passt nicht in ` +
        `${taktart.zaehler}/${taktart.nenner}`,
    );
    this.name = "UngültigerTaktError";
  }
}

/**
 * Ob die Taktart zusammengesetzt ist — 6/8 und 9/8 zählen in punktierten
 * Vierteln, 2/4 und 3/8 nicht.
 */
const istZusammengesetzt = (taktart: Taktart): boolean =>
  taktart.nenner >= 8 && taktart.zaehler > 3 && taktart.zaehler % 3 === 0;

/**
 * Die Zählzeit einer Taktart: der Grundschlag, nach dem gruppiert und gebalkt
 * wird. Ungerade Taktarten wie 5/8 gruppieren in der Praxis 3+2 oder 2+3; bis
 * die Gruppierung im Modell steht, zählen sie hier schlicht in Achteln.
 */
export const zaehlzeit = (taktart: Taktart): Bruch =>
  istZusammengesetzt(taktart) ? bruch(3, taktart.nenner) : bruch(1, taktart.nenner);
