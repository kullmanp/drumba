import type { Bruch } from "./bruch";
import { addiere, bruch, NULL, subtrahiere, vergleiche } from "./bruch";

/**
 * Das kanonische Modell (ADR-0001). Es haelt alles, was Zuendstoffnoten sagen
 * koennen, und weiss nichts vom Zeichnen.
 */

/** Welche Hand den Schlag spielt. Immer explizit, nie abgeleitet. */
export type Hand = "links" | "rechts";

export const andereHand = (hand: Hand): Hand => (hand === "links" ? "rechts" : "links");

/**
 * Die Art eines Schlags aus dem Basler Figurenvokabular. Flache Menge: ein
 * Schlepp ist eine eigene Figur, keine verzierte Dupfe. Das volle Vokabular
 * kommt spaeter — erweitern heisst hier eintragen und in `FIGURMERKMALE` sagen,
 * was die Figur ausmacht; der Compiler erzwingt beides. Wie ein Ruf klingt,
 * steht im Abspielplan.
 *
 * Von der Ruf-Familie steht erst der Fuenferruf (mit Schlepp) hier. Er fuellt
 * genau eine Achtel; seine Landung ist nicht Teil von ihm, sondern der naechste
 * Schlag (ADR-0002) — `pruefeMarsch` stellt sicher, dass sie da ist.
 */
export type Figur = "Dupfe" | "Schlepp" | "Fuenferruf";

/** Was eine Figur ausmacht, an einer Stelle — Layout und Wiedergabe lesen beide hier. */
export interface Figurmerkmale {
  /** Ob ein Vorschlag in der anderen Hand kurz vor dem Schlag liegt. */
  readonly vorschlag: boolean;
  /** Bei einem Ruf: wie viele Schlaege er zaehlt, die Landung eingerechnet. */
  readonly ruf?: { readonly schlaege: number };
}

export const FIGURMERKMALE: Record<Figur, Figurmerkmale> = {
  Dupfe: { vorschlag: false },
  Schlepp: { vorschlag: true },
  // Der Fuenferruf beginnt mit einem Schlepp und hat darum dessen Vorschlag.
  Fuenferruf: { vorschlag: true, ruf: { schlaege: 5 } },
};

/** Ein Schlag: das atomare Ereignis des Modells. */
export interface Schlag {
  readonly figur: Figur;
  /** Die primaere Hand. Ein Vorschlag liegt in der anderen. */
  readonly hand: Hand;
  /** Exakte Position im Takt, gemessen in Ganzen ab Taktbeginn. */
  readonly position: Bruch;
  /** Der notierte Wert, in Ganzen: 1/8 = Achtel, 3/8 = punktierte Viertel. */
  readonly wert: Bruch;
}

/** Ein Takt: die geordneten Schlaege eines Taktes. */
export interface Takt {
  readonly schlaege: readonly Schlag[];
}

/**
 * Die Taktart, mit beliebigem Zaehler und Nenner — 6/8, 2/4, 5/8.
 *
 * Bewusst kein `Bruch`: ein Bruch kuerzt, und 6/8 zu 3/4 zu kuerzen zerstoerte
 * die Taktart. 6/8 und 3/4 messen gleich lang und zaehlen doch verschieden.
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

/** Ein Marsch: das Werk, das der Benutzer schreibt und in seiner Bibliothek haelt. */
export interface Marsch {
  readonly titel: string;
  readonly verse: readonly Vers[];
}

/** Die Laenge eines Taktes in Ganzen: 6/8 misst 3/4. */
export const taktLaenge = (taktart: Taktart): Bruch => bruch(taktart.zaehler, taktart.nenner);

/**
 * Der erste Schlag, der nicht in den Takt passt — vor dem Beginn oder ueber das
 * Ende hinaus. `undefined`, wenn der Takt gueltig ist. Ein ueberlaufender Takt
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
 * Ein Takt, dessen Schlaege nicht in seine Taktart passen. Solche Daten werden
 * weder gezeichnet noch gespielt — falsch gesetzte Schlaege sollen auffallen,
 * nicht still ueber den Taktstrich hinauslaufen.
 */
export class UngueltigerTaktError extends Error {
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
    this.name = "UngueltigerTaktError";
  }
}

/**
 * Ob die Taktart zusammengesetzt ist — 6/8 und 9/8 zaehlen in punktierten
 * Vierteln, 2/4 und 3/8 nicht.
 */
const istZusammengesetzt = (taktart: Taktart): boolean =>
  taktart.nenner >= 8 && taktart.zaehler > 3 && taktart.zaehler % 3 === 0;

/**
 * Die Zaehlzeit einer Taktart: der Grundschlag, nach dem gruppiert und gebalkt
 * wird. Ungerade Taktarten wie 5/8 gruppieren in der Praxis 3+2 oder 2+3; bis
 * die Gruppierung im Modell steht, zaehlen sie hier schlicht in Achteln.
 */
export const zaehlzeit = (taktart: Taktart): Bruch =>
  istZusammengesetzt(taktart) ? bruch(3, taktart.nenner) : bruch(1, taktart.nenner);

/**
 * Ein Ruf ohne gueltige Landung: kein Schlag danach, keiner genau eine Achtel
 * spaeter oder einer in der falschen Hand. Ein Ruf, der nirgends landet, wird
 * weder gezeichnet noch gespielt.
 */
export class UngueltigerRufError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    readonly schlag: Schlag,
  ) {
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: ${schlag.figur} ${schlag.hand} auf ` +
        `${schlag.position.zaehler}/${schlag.position.nenner} hat keine Landung ` +
        `eine Achtel spaeter in derselben Hand`,
    );
    this.name = "UngueltigerRufError";
  }
}

/** Wie lange ein Fuenferruf von seinem Schlepp bis zur Landung dauert. */
export const FUENFERRUF_DAUER = bruch(1, 8);

/**
 * Der Schlag nach einem anderen, mit seinem Abstand in Ganzen — auch ueber den
 * Taktstrich. `taktIndex` und `index` sagen, wo er im Vers steht, damit das
 * Layout ihn bei sich wiederfindet, statt selbst weiterzuzaehlen.
 */
export interface Folgeschlag {
  readonly schlag: Schlag;
  readonly abstand: Bruch;
  readonly taktIndex: number;
  readonly index: number;
}

/**
 * Der Schlag nach dem `index`-ten des Taktes `taktIndex` — im selben Takt oder
 * als erster des naechsten. Ueber das Ende des Verses hinaus sucht er nicht:
 * eine Landung im naechsten Vers oder in der Wiederholung gibt es noch nicht.
 *
 * Die eine Stelle, die sagt, wo ein Ruf landet: `pruefeMarsch` prueft daran die
 * Landung, das Layout zieht den Bogen dorthin.
 */
export const folgeschlag = (
  vers: Vers,
  taktIndex: number,
  index: number,
): Folgeschlag | undefined => {
  const schlaege = vers.takte[taktIndex]!.schlaege;
  const schlag = schlaege[index]!;
  const imTakt = schlaege[index + 1];
  if (imTakt) {
    return {
      schlag: imTakt,
      abstand: subtrahiere(imTakt.position, schlag.position),
      taktIndex,
      index: index + 1,
    };
  }

  const imNaechsten = vers.takte[taktIndex + 1]?.schlaege[0];
  if (!imNaechsten) return undefined;
  const bisTaktende = subtrahiere(taktLaenge(vers.taktart), schlag.position);
  return {
    schlag: imNaechsten,
    abstand: addiere(bisTaktende, imNaechsten.position),
    taktIndex: taktIndex + 1,
    index: 0,
  };
};

/**
 * Prueft einen Marsch, bevor er gezeichnet oder gespielt wird: jeder Takt passt
 * in seine Taktart, und jeder Ruf hat seine Landung. Wirft beim ersten Fehler.
 */
export const pruefeMarsch = (marsch: Marsch): void => {
  marsch.verse.forEach((vers, versIndex) => {
    vers.takte.forEach((takt, taktIndex) => {
      const ueberlauf = taktUeberlauf(takt, vers.taktart);
      if (ueberlauf) {
        throw new UngueltigerTaktError(versIndex + 1, taktIndex + 1, ueberlauf, vers.taktart);
      }
      takt.schlaege.forEach((schlag, index) => {
        if (!FIGURMERKMALE[schlag.figur].ruf) return;
        const landung = folgeschlag(vers, taktIndex, index);
        if (
          !landung ||
          vergleiche(landung.abstand, FUENFERRUF_DAUER) !== 0 ||
          landung.schlag.hand !== schlag.hand
        ) {
          throw new UngueltigerRufError(versIndex + 1, taktIndex + 1, schlag);
        }
      });
    });
  });
};
