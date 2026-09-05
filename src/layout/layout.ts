import type { Bruch } from "../model/bruch";
import { alsZahl, bruch, vergleiche } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Taktart, Vers } from "../model/marsch";
import { taktLaenge, taktUeberlauf, zaehlzeit } from "../model/marsch";

/**
 * Das Zündstoff-Layout: eine reine Funktion vom Marsch zu platzierten Glyphen.
 * Sie besitzt die ganze Geometrie und kennt weder React noch SVG. Alle Masse
 * sind abstrakte Einheiten; erst der Renderer skaliert sie.
 *
 * Die Glyphen sind eine flache, von links nach rechts und von oben nach unten
 * geordnete Liste — Malreihenfolge zugleich Leserichtung.
 *
 * Die Notenlinie läuft *durch* die Notation, nicht darunter: ein Notenkopf
 * steht rechts über der Linie und links darunter, und daran liest man die
 * Hand. Deshalb gehört die Höhe eines Kopfes hierher und nicht in den
 * Renderer — sie trägt Bedeutung und muss prüfbar sein.
 */

/** Abstrakte Einheiten je ganzer Note — der Massstab der horizontalen Zeit. */
const EINHEITEN_PRO_GANZE = 192;
const RAND = 16;
const TITEL_HOEHE = 44;
const VERS_HOEHE = 96;
/** Abstand der Notenlinie von der Oberkante des Vers-Blocks. */
const NOTENLINIE_ABSTAND = 40;
/**
 * Wie weit die Mitte eines Notenkopfes neben der Notenlinie liegt. Weil der
 * Kopf die Linie berührt statt über ihr zu schweben, ist dieser Abstand
 * zugleich sein Halbmesser — daran hängt, wo sein oberer Rand liegt.
 */
const KOPF_ABSTAND = 4;
/**
 * Wie tief die Halsenden unter der Notenlinie liegen — und damit die Balken.
 * Alle Hälse eines Taktes enden gleich tief, gleich auf welcher Seite der
 * Linie ihr Kopf steht; sonst träfen sie ihren gemeinsamen Balken nicht.
 */
const HALS_TIEFE = 30;
/** Luft zwischen Taktstrich und erstem Schlag des Taktes. */
const TAKT_INNENABSTAND = 14;
/** Wie weit ein Taktstrich über die Notenlinie ragt; unten endet er am Balken. */
const TAKTSTRICH_UEBERSTAND = 13;
/** Abstand der schweren zweiten Linie einer Wiederholungsklammer. */
const KLAMMER_STRICH_ABSTAND = 5;
/** Abstand der Klammerpunkte vom Taktstrich, waagrecht und von der Notenlinie aus. */
const KLAMMER_PUNKT_ABSTAND = 5;
const KLAMMER_PUNKT_HOEHE = 5;
/** Breite der Vers-Nummer und der Taktart links vor dem ersten Taktstrich. */
const VERS_NUMMER_BREITE = 26;
const TAKTART_BREITE = 26;
const VERS_KOPF_BREITE = VERS_NUMMER_BREITE + TAKTART_BREITE;
/** Länge der senkrechten Linie, die einen Schlepp über seinem Notenkopf anzeigt. */
const VORSCHLAG_LAENGE = 12;
/** Abstand des Punktes rechts neben dem Notenkopf. */
const PUNKT_ABSTAND = 7;

/**
 * Wie eine Figur gezeichnet wird. Eine neue Basler Figur einzuführen heisst,
 * sie in `Figur` einzutragen und hier ihre Zeichnung zu wählen — der Compiler
 * erzwingt beides. Das Modell bleibt unangetastet.
 */
type Zeichnung = "einfach" | "mitVorschlag";

const figurZeichnung: Record<Figur, Zeichnung> = {
  Dupfe: "einfach",
  Schlepp: "mitVorschlag",
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
      readonly typ: "notenkopf";
      readonly x: number;
      /** Über der Notenlinie für rechts, darunter für links. */
      readonly y: number;
      readonly hand: Hand;
    }
  | {
      readonly typ: "hals";
      /** Am Notenkopf. */
      readonly yOben: number;
      /** Auf Balkenhöhe, unter der Notenlinie. */
      readonly yUnten: number;
      readonly x: number;
    }
  | {
      readonly typ: "fahne";
      readonly x: number;
      /** Am unteren Ende des Halses. */
      readonly y: number;
      /** Achtel eine, Sechzehntel zwei. */
      readonly anzahl: number;
    }
  | {
      readonly typ: "vorschlag";
      /** Der Schlepp-Strich steht über dem Notenkopf. */
      readonly x: number;
      readonly yOben: number;
      readonly yUnten: number;
    }
  | { readonly typ: "punkt"; readonly x: number; readonly y: number }
  | {
      readonly typ: "balken";
      readonly x1: number;
      readonly x2: number;
      readonly y: number;
      /** Wie viele Balkenlinien durchgehen. */
      readonly anzahl: number;
    }
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

/**
 * Eine Balkengruppe aus ungleich langen Schlägen. Eine punktierte Achtel neben
 * einer Sechzehntel bräuchte einen Balkenstummel am einzelnen Hals; den bauen
 * wir noch nicht. Bis dahin wird lieber geworfen als falsch gezeichnet: mit
 * nur den durchgehenden Balken sähe die Sechzehntel wie eine Achtel aus, und
 * ein falscher Rhythmus fällt niemandem auf.
 */
export class UngleicheBalkengruppeError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    werte: readonly Bruch[],
  ) {
    const gelistet = werte.map((w) => `${w.zaehler}/${w.nenner}`).join(", ");
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: Balkengruppe aus ungleichen ` +
        `Werten (${gelistet}) — Balkenstummel sind noch nicht gebaut`,
    );
    this.name = "UngleicheBalkengruppeError";
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
  const yOben = linieY - TAKTSTRICH_UEBERSTAND;
  const yUnten = linieY + HALS_TIEFE;
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
            // Um die Notenlinie herum, nicht um die Mitte des Striches: der
            // Strich reicht bis zu den Balken hinunter, die Punkte gehören
            // dorthin, wo gelesen wird.
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY - KLAMMER_PUNKT_HOEHE },
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY + KLAMMER_PUNKT_HOEHE },
          ],
  };
};

/** Ein Schlag mit seiner Stelle auf der Zeitachse. */
interface PlatzierterSchlag {
  readonly schlag: Schlag;
  readonly x: number;
}

/** Die Höhe des Notenkopfes: rechts über der Notenlinie, links darunter. */
const kopfHoehe = (hand: Hand, linieY: number): number =>
  hand === "rechts" ? linieY - KOPF_ABSTAND : linieY + KOPF_ABSTAND;

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

const istZweierpotenz = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

/**
 * Ob der Wert punktiert ist — 3/8 ist die punktierte Viertel, 3/16 die
 * punktierte Achtel. Da `bruch` kürzt, ist ein Zähler von 3 über einer
 * Zweierpotenz das sichere Kennzeichen.
 */
const istPunktiert = (wert: Bruch): boolean =>
  wert.zaehler === 3 && istZweierpotenz(wert.nenner);

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
  versNummer: number,
  taktNummer: number,
  glyphen: Glyph[],
): void => {
  const inhaltX = taktX + TAKT_INNENABSTAND;
  const platzierte = takt.schlaege.map((schlag) => ({
    schlag,
    x: inhaltX + alsZahl(schlag.position) * EINHEITEN_PRO_GANZE,
  }));
  const gruppen = balkenGruppen(platzierte, versTaktart);
  const gebalkt = new Set(gruppen.flat());
  const balkenY = linieY + HALS_TIEFE;

  for (const gruppe of gruppen) {
    const balken = new Set(gruppe.map((p) => fahnenAnzahl(p.schlag.wert)));
    if (balken.size > 1) {
      throw new UngleicheBalkengruppeError(
        versNummer,
        taktNummer,
        gruppe.map((p) => p.schlag.wert),
      );
    }
  }

  for (const platzierter of platzierte) {
    const { schlag, x } = platzierter;
    const kopfY = kopfHoehe(schlag.hand, linieY);

    glyphen.push({ typ: "hals", x, yOben: kopfY, yUnten: balkenY });
    glyphen.push({ typ: "notenkopf", x, y: kopfY, hand: schlag.hand });

    // Der Schlepp-Strich sitzt über dem Kopf, nicht neben ihm: er hängt am
    // Schlag und trägt darum keine eigene Handhöhe. Er beginnt am oberen Rand
    // des Kopfes, nicht in dessen Mitte — sonst steckte seine halbe Länge in
    // der Tinte des Kopfes und läse sich als durchgeschobener Hals.
    if (figurZeichnung[schlag.figur] === "mitVorschlag") {
      const kopfRand = kopfY - KOPF_ABSTAND;
      glyphen.push({
        typ: "vorschlag",
        x,
        yOben: kopfRand - VORSCHLAG_LAENGE,
        yUnten: kopfRand,
      });
    }
    if (istPunktiert(schlag.wert)) {
      glyphen.push({ typ: "punkt", x: x + PUNKT_ABSTAND, y: kopfY });
    }

    // Was kein Balken trägt, trägt seine Fahnen selbst — sonst läse sich eine
    // einzelne Achtel wie eine Viertel.
    const fahnen = fahnenAnzahl(schlag.wert);
    if (fahnen > 0 && !gebalkt.has(platzierter)) {
      glyphen.push({ typ: "fahne", x, y: balkenY, anzahl: fahnen });
    }
  }

  for (const gruppe of gruppen) {
    glyphen.push({
      typ: "balken",
      x1: gruppe[0]!.x,
      x2: gruppe.at(-1)!.x,
      y: balkenY,
      anzahl: fahnenAnzahl(gruppe[0]!.schlag.wert),
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
    legeTakt(takt, taktX, linieY, vers.taktart, nummer, index + 1, glyphen);
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
