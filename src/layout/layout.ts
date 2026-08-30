import type { Bruch } from "../model/bruch";
import { alsZahl, bruch, vergleiche } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Taktart, Vers } from "../model/marsch";
import { andereHand, taktLaenge, taktUeberlauf, zaehlzeit } from "../model/marsch";

/**
 * Das Zündstoff-Layout: eine reine Funktion vom Marsch zu platzierten Glyphen.
 * Sie besitzt die ganze Geometrie und kennt weder React noch SVG. Alle Masse
 * sind abstrakte Einheiten; erst der Renderer skaliert sie.
 *
 * Die Glyphen sind eine flache, von links nach rechts und von oben nach unten
 * geordnete Liste — Malreihenfolge zugleich Leserichtung.
 */

/** Abstrakte Einheiten je ganzer Note — der Massstab der horizontalen Zeit. */
const EINHEITEN_PRO_GANZE = 192;
const RAND = 16;
const TITEL_HOEHE = 44;
const VERS_HOEHE = 96;
/** Abstand der Notenlinie von der Oberkante des Vers-Blocks. */
const NOTENLINIE_ABSTAND = 56;
const HALSLAENGE = 34;
/** Luft zwischen Taktstrich und erstem Schlag des Taktes. */
const TAKT_INNENABSTAND = 14;
/** Abstand der Handangabe unter der Notenlinie. */
const HAND_ABSTAND = 18;
/** Wie weit ein Taktstrich unter die Notenlinie ragt. */
const TAKTSTRICH_UEBERSTAND = 8;
/** Abstand der schweren zweiten Linie einer Wiederholungsklammer. */
const KLAMMER_STRICH_ABSTAND = 5;
/** Abstand der Klammerpunkte vom Taktstrich, waagrecht und von der Mitte aus. */
const KLAMMER_PUNKT_ABSTAND = 5;
const KLAMMER_PUNKT_HOEHE = 5;
/** Breite der Vers-Nummer und der Taktart links vor dem ersten Taktstrich. */
const VERS_NUMMER_BREITE = 26;
const TAKTART_BREITE = 26;
const VERS_KOPF_BREITE = VERS_NUMMER_BREITE + TAKTART_BREITE;
/** Wie weit der Vorschlag eines Schlepps links vor seinem Hauptschlag steht. */
const VORSCHLAG_ABSTAND = 9;
const VORSCHLAG_HALSLAENGE = 20;
/** Abstand des Wirbelbogens über den Halsenden. */
const WIRBEL_ABSTAND = 7;

/**
 * Wie eine Figur gezeichnet wird. Eine neue Basler Figur einzuführen heisst,
 * sie in `Figur` einzutragen und hier ihre Zeichnung zu wählen — der Compiler
 * erzwingt beides. Das Modell bleibt unangetastet.
 */
type Zeichnung = "einfach" | "mitVorschlag" | "mitWirbel";

const figurZeichnung: Record<Figur, Zeichnung> = {
  Dupfe: "einfach",
  Schlepp: "mitVorschlag",
  Fünferruf: "mitWirbel",
};

export type GlyphTyp = Glyph["typ"];

/** Einfacher Strich oder Wiederholungsklammer. */
export type Strichart = "einfach" | "wiederholungAnfang" | "wiederholungEnde";

export interface Punkt {
  readonly x: number;
  readonly y: number;
}

export type Glyph =
  | { readonly typ: "titel"; readonly x: number; readonly y: number; readonly text: string }
  | { readonly typ: "notenlinie"; readonly x1: number; readonly x2: number; readonly y: number }
  | {
      readonly typ: "taktstrich";
      /** Wo die Taktgrenze liegt — die musikalische Stelle, nicht die Tinte. */
      readonly x: number;
      readonly yOben: number;
      readonly yUnten: number;
      readonly strichart: Strichart;
      /** x jeder senkrechten Linie, Hauptstrich zuerst. */
      readonly striche: readonly number[];
      /** Die Punkte einer Wiederholungsklammer; bei einfachem Strich leer. */
      readonly punkte: readonly Punkt[];
    }
  | {
      readonly typ: "hals";
      readonly x: number;
      readonly yOben: number;
      readonly yUnten: number;
      readonly figur: Figur;
      readonly hand: Hand;
    }
  | {
      readonly typ: "fahne";
      readonly x: number;
      readonly y: number;
      /** Achtel eine, Sechzehntel zwei. */
      readonly anzahl: number;
    }
  | {
      readonly typ: "vorschlag";
      readonly x: number;
      readonly yOben: number;
      readonly yUnten: number;
      readonly hand: Hand;
    }
  | { readonly typ: "wirbel"; readonly x1: number; readonly x2: number; readonly y: number }
  | {
      readonly typ: "balken";
      readonly x1: number;
      readonly x2: number;
      readonly y: number;
      /** Wie viele Balkenlinien durchgehen. */
      readonly anzahl: number;
    }
  | { readonly typ: "hand"; readonly x: number; readonly y: number; readonly hand: Hand }
  | { readonly typ: "versNummer"; readonly x: number; readonly y: number; readonly nummer: number }
  | {
      readonly typ: "taktart";
      readonly x: number;
      readonly y: number;
      readonly zaehler: number;
      readonly nenner: number;
    };

/**
 * Ein Takt, dessen Schläge nicht in seine Taktart passen. Solche Daten werden
 * nicht gezeichnet — falsch gesetzte Schläge sollen auffallen, nicht still
 * über den Taktstrich hinauslaufen.
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

export interface Layout {
  readonly breite: number;
  readonly hoehe: number;
  readonly glyphen: readonly Glyph[];
}

/** Die Breite eines Taktes in abstrakten Einheiten, inklusive Innenabstand. */
const taktBreite = (taktart: Taktart): number =>
  TAKT_INNENABSTAND + alsZahl(taktLaenge(taktart)) * EINHEITEN_PRO_GANZE;

/** Die Art des Striches an Position `index` unter `anzahl` Strichen des Verses. */
const strichartFuer = (index: number, anzahl: number, wiederholungen: 1 | 2): Strichart => {
  if (wiederholungen === 1) return "einfach";
  if (index === 0) return "wiederholungAnfang";
  if (index === anzahl - 1) return "wiederholungEnde";
  return "einfach";
};

/**
 * Ein Taktstrich mit aller Tinte, die er braucht: die schwere zweite Linie
 * einer Wiederholungsklammer steht nach aussen, ihre Punkte nach innen zu den
 * Noten hin. Der Renderer zeichnet nur noch, was hier steht.
 */
const taktstrich = (
  x: number,
  linieY: number,
  strichart: Strichart,
): Extract<Glyph, { typ: "taktstrich" }> => {
  const yOben = linieY - HALSLAENGE;
  const yUnten = linieY + TAKTSTRICH_UEBERSTAND;
  const mitte = (yOben + yUnten) / 2;
  const innen = strichart === "wiederholungAnfang" ? 1 : -1;

  return {
    typ: "taktstrich",
    x,
    yOben,
    yUnten,
    strichart,
    striche: strichart === "einfach" ? [x] : [x, x - innen * KLAMMER_STRICH_ABSTAND],
    punkte:
      strichart === "einfach"
        ? []
        : [
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: mitte - KLAMMER_PUNKT_HOEHE },
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: mitte + KLAMMER_PUNKT_HOEHE },
          ],
  };
};

/** Ein Schlag mit seiner Stelle auf der Zeitachse. */
interface PlatzierterSchlag {
  readonly schlag: Schlag;
  readonly x: number;
}

/**
 * Wie viele Fahnen ein notierter Wert trägt — Achtel eine, Sechzehntel zwei,
 * ab der Viertel keine. Punktierungen zählen wie ihr ungepunkteter Grundwert:
 * eine punktierte Achtel trägt eine Fahne. Dieselbe Zahl bestimmt, wie viele
 * Balkenlinien eine Gruppe bekommt.
 */
const fahnenAnzahl = (wert: Bruch): number => {
  let anzahl = 0;
  let grenze = bruch(1, 4);
  while (vergleiche(wert, grenze) < 0) {
    anzahl += 1;
    grenze = bruch(grenze.zaehler, grenze.nenner * 2);
  }
  return anzahl;
};

/** Ab der Viertel wird nicht mehr gebalkt. */
const istBalkenfaehig = (wert: Bruch): boolean => fahnenAnzahl(wert) > 0;

/** Auf welche Zählzeit des Taktes eine Position fällt — exakt, ohne Fliesskomma. */
const zaehlzeitIndex = (position: Bruch, zeit: Bruch): number =>
  Math.floor((position.zaehler * zeit.nenner) / (position.nenner * zeit.zaehler));

/**
 * Die Balkengruppen eines Taktes: aufeinanderfolgende balkenfähige Schläge auf
 * derselben Zählzeit. Ein Schlag allein auf seiner Zählzeit bekommt keinen
 * Balken, und über den Taktstrich reicht keine Gruppe — sie entstehen je Takt.
 */
const balkenGruppen = (
  platzierte: readonly PlatzierterSchlag[],
  taktart: Taktart,
): PlatzierterSchlag[][] => {
  const zeit = zaehlzeit(taktart);
  const gruppen: PlatzierterSchlag[][] = [];
  let laufende: PlatzierterSchlag[] = [];
  let laufendeZeit: number | undefined;

  const schliesse = () => {
    if (laufende.length > 1) gruppen.push(laufende);
    laufende = [];
    laufendeZeit = undefined;
  };

  for (const platzierter of platzierte) {
    if (!istBalkenfaehig(platzierter.schlag.wert)) {
      schliesse();
      continue;
    }
    const index = zaehlzeitIndex(platzierter.schlag.position, zeit);
    if (index !== laufendeZeit) schliesse();
    laufendeZeit = index;
    laufende.push(platzierter);
  }
  schliesse();

  return gruppen;
};

const legeTakt = (
  takt: Takt,
  taktX: number,
  linieY: number,
  versTaktart: Taktart,
  glyphen: Glyph[],
): void => {
  const inhaltX = taktX + TAKT_INNENABSTAND;
  const platzierte = takt.schlaege.map((schlag) => ({
    schlag,
    x: inhaltX + alsZahl(schlag.position) * EINHEITEN_PRO_GANZE,
  }));
  const gruppen = balkenGruppen(platzierte, versTaktart);
  const gebalkt = new Set(gruppen.flat());

  for (const platzierter of platzierte) {
    const { schlag, x } = platzierter;
    const zeichnung = figurZeichnung[schlag.figur];

    if (zeichnung === "mitVorschlag") {
      glyphen.push({
        typ: "vorschlag",
        x: x - VORSCHLAG_ABSTAND,
        yOben: linieY - VORSCHLAG_HALSLAENGE,
        yUnten: linieY,
        hand: andereHand(schlag.hand),
      });
    }

    glyphen.push({
      typ: "hals",
      x,
      yOben: linieY - HALSLAENGE,
      yUnten: linieY,
      figur: schlag.figur,
      hand: schlag.hand,
    });

    // Was kein Balken trägt, trägt seine Fahnen selbst — sonst läse sich eine
    // einzelne Achtel wie eine Viertel.
    const fahnen = fahnenAnzahl(schlag.wert);
    if (fahnen > 0 && !gebalkt.has(platzierter)) {
      glyphen.push({ typ: "fahne", x, y: linieY - HALSLAENGE, anzahl: fahnen });
    }
    if (zeichnung === "mitWirbel") {
      glyphen.push({
        typ: "wirbel",
        x1: x,
        x2: x + alsZahl(schlag.wert) * EINHEITEN_PRO_GANZE,
        y: linieY - HALSLAENGE - WIRBEL_ABSTAND,
      });
    }

    glyphen.push({ typ: "hand", x, y: linieY + HAND_ABSTAND, hand: schlag.hand });
  }

  for (const gruppe of gruppen) {
    glyphen.push({
      typ: "balken",
      x1: gruppe[0]!.x,
      x2: gruppe.at(-1)!.x,
      y: linieY - HALSLAENGE,
      // Nur die Balken, die über die ganze Gruppe durchgehen.
      anzahl: Math.min(...gruppe.map((p) => fahnenAnzahl(p.schlag.wert))),
    });
  }
};

const legeVers = (vers: Vers, nummer: number, linieY: number, glyphen: Glyph[]): number => {
  const inhaltX = RAND + VERS_KOPF_BREITE;
  const breite = vers.takte.length * taktBreite(vers.taktart);

  glyphen.push({ typ: "versNummer", x: RAND, y: linieY, nummer });
  glyphen.push({
    typ: "taktart",
    x: RAND + VERS_NUMMER_BREITE,
    y: linieY,
    zaehler: vers.taktart.zaehler,
    nenner: vers.taktart.nenner,
  });
  glyphen.push({ typ: "notenlinie", x1: inhaltX, x2: inhaltX + breite, y: linieY });

  const strichAnzahl = vers.takte.length + 1;
  vers.takte.forEach((takt, index) => {
    const ueberlauf = taktUeberlauf(takt, vers.taktart);
    if (ueberlauf) throw new UngültigerTaktError(nummer, index + 1, ueberlauf, vers.taktart);

    const taktX = inhaltX + index * taktBreite(vers.taktart);
    glyphen.push(
      taktstrich(taktX, linieY, strichartFuer(index, strichAnzahl, vers.wiederholungen)),
    );
    legeTakt(takt, taktX, linieY, vers.taktart, glyphen);
  });

  if (vers.takte.length > 0) {
    glyphen.push(
      taktstrich(
        inhaltX + breite,
        linieY,
        strichartFuer(strichAnzahl - 1, strichAnzahl, vers.wiederholungen),
      ),
    );
  }

  return inhaltX + breite;
};

export const layout = (marsch: Marsch): Layout => {
  const glyphen: Glyph[] = [];
  glyphen.push({ typ: "titel", x: RAND, y: RAND + TITEL_HOEHE / 2, text: marsch.titel });

  let breite = 0;
  marsch.verse.forEach((vers, versIndex) => {
    const linieY = RAND + TITEL_HOEHE + versIndex * VERS_HOEHE + NOTENLINIE_ABSTAND;
    breite = Math.max(breite, legeVers(vers, versIndex + 1, linieY, glyphen));
  });

  return {
    breite: breite + RAND,
    hoehe: RAND + TITEL_HOEHE + marsch.verse.length * VERS_HOEHE,
    glyphen,
  };
};
