import type { Bruch } from "../model/bruch";
import { alsZahl, bruch, vergleiche } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt, Taktart, Vers } from "../model/marsch";
import { taktLänge, taktÜberlauf, UngültigerTaktError, zählzeit } from "../model/marsch";

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
const TITEL_HÖHE = 44;
const VERS_HÖHE = 96;
/** Abstand der Notenlinie von der Oberkante des Vers-Blocks. */
const NOTENLINIE_ABSTAND = 40;
/**
 * Die Masse des Notenkopfes und was sich an ihm ausrichtet.
 *
 * Ausgemessen am `2006Trommelfont`, der Schrift, in der der Schweizerische
 * Tambouren- und Pfeiferverband seine eigenen Dokumente setzt: die Umrisse
 * seiner Notenglyphen sind die Vorlage, nicht der allgemeine Notenstich. Die
 * Zahlen dort sind auf die Kopfhöhe bezogen und hier mit einer frei gewählten
 * Kopfhöhe von 8 Einheiten wieder ausmultipliziert — die Schrift ist eine
 * Textschrift mit festen Vorschubbreiten und sagt darum nichts über den
 * waagrechten Abstand zweier Schläge; der kommt weiter aus dem Rhythmus.
 *
 * Die Grösse des Kopfes steht hier und nicht im Renderer, weil sich fremde
 * Zeichen an seinen Rändern ausrichten: der Vorschlag über seiner Oberkante,
 * der Hals an seiner linken Flanke, der Punkt rechts neben ihm. Dem Renderer
 * bleibt die Form — dass diese Hüllbox eine gekippte Ellipse füllt.
 */
const KOPF_HÖHE = 8;
const KOPF_BREITE = 9.19;
/**
 * Abstand der Kopfmitte von der Notenlinie. Der Kopf berührt die Linie nicht:
 * zwischen Linienkante und Kopfunterkante bleibt eine gute halbe Kopfhöhe
 * Luft. Erst dieser Abstand macht die Hand auf einen Blick lesbar — sie ist
 * die einzige Bedeutung, die die Höhe eines Kopfes trägt.
 */
const KOPF_ABSTAND = 8.37;
/**
 * Wie weit links der Kopfmitte der Hals steht. Er läuft nicht durch die Mitte
 * des Kopfes, sondern an seiner linken Flanke — bündig mit dessen linkem
 * Rand, wie in der Vorlage.
 */
const HALS_VERSATZ = 4.02;
/**
 * Wie tief die Halsenden unter der Notenlinie liegen — und damit die Balken.
 * Alle Hälse eines Taktes enden gleich tief, gleich auf welcher Seite der
 * Linie ihr Kopf steht; sonst träfen sie ihren gemeinsamen Balken nicht.
 */
const HALS_TIEFE = 35.74;
/** Luft zwischen Taktstrich und erstem Schlag des Taktes. */
const TAKT_INNENABSTAND = 14;
/**
 * Der halbe Taktstrich: er steht symmetrisch um die Notenlinie, gleich weit
 * darüber wie darunter, und reicht weder an die Köpfe noch an die Balken.
 *
 * Auch das ist am `2006Trommelfont` ausgemessen. Der Taktstrich ist dort ein
 * kurzer Strich quer über die Linie — er umschliesst die Noten nicht, sondern
 * markiert nur die Stelle auf der Linie, an der der Takt wechselt.
 */
const TAKTSTRICH_HALBLÄNGE = 8.71;
/**
 * Die Masse der Wiederholungsklammer. Für sie gibt es noch keine Vorlage: die
 * Schrift hat Wiederholungszeichen, aber der ausgewertete Auszug enthält
 * keines. Die Werte stehen darum nur im Verhältnis zum Taktstrich, bis ein
 * echtes Muster sie ersetzt.
 */
const KLAMMER_STRICH_ABSTAND = 3;
const KLAMMER_PUNKT_ABSTAND = 3;
const KLAMMER_PUNKT_HÖHE = 5;
/** Breite der Vers-Nummer und der Taktart links vor dem ersten Taktstrich. */
const VERS_NUMMER_BREITE = 26;
const TAKTART_BREITE = 26;
const VERS_KOPF_BREITE = VERS_NUMMER_BREITE + TAKTART_BREITE;
/** Länge der senkrechten Linie, die einen Schlepp über seinem Notenkopf anzeigt. */
const VORSCHLAG_LÄNGE = 12;
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
      /** Die Hüllmasse des Kopfes. Welche Form sie füllt, wählt der Renderer. */
      readonly breite: number;
      readonly höhe: number;
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
      readonly zähler: number;
      readonly nenner: number;
    };

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
    const gelistet = werte.map((w) => `${w.zähler}/${w.nenner}`).join(", ");
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: Balkengruppe aus ungleichen ` +
        `Werten (${gelistet}) — Balkenstummel sind noch nicht gebaut`,
    );
    this.name = "UngleicheBalkengruppeError";
  }
}

export interface Layout {
  readonly breite: number;
  readonly höhe: number;
  readonly glyphen: readonly Glyph[];
}

/** Die Breite eines Taktes in abstrakten Einheiten, inklusive Innenabstand. */
const taktBreite = (taktart: Taktart): number =>
  TAKT_INNENABSTAND + alsZahl(taktLänge(taktart)) * EINHEITEN_PRO_GANZE;

/** Die Art des Striches an Position `index` unter `anzahl` Strichen des Verses. */
const strichartFür = (index: number, anzahl: number, wiederholungen: 1 | 2): Strichart => {
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
  const yOben = linieY - TAKTSTRICH_HALBLÄNGE;
  const yUnten = linieY + TAKTSTRICH_HALBLÄNGE;
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
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY - KLAMMER_PUNKT_HÖHE },
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY + KLAMMER_PUNKT_HÖHE },
          ],
  };
};

/** Ein Schlag mit seiner Stelle auf der Zeitachse. */
interface PlatzierterSchlag {
  readonly schlag: Schlag;
  /** Die rhythmische Stelle. Der Notenkopf steht mittig darauf. */
  readonly x: number;
  /** Wo der Hals steht — an der linken Flanke des Kopfes. */
  readonly halsX: number;
}

/** Die Höhe des Notenkopfes: rechts über der Notenlinie, links darunter. */
const kopfHöhe = (hand: Hand, linieY: number): number =>
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
    grenze = bruch(grenze.zähler, grenze.nenner * 2);
  }
  return anzahl;
};

/** Ab der Viertel wird nicht mehr gebalkt. */
const istBalkenfähig = (wert: Bruch): boolean => fahnenAnzahl(wert) > 0;

const istZweierpotenz = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

/**
 * Ob der Wert punktiert ist — 3/8 ist die punktierte Viertel, 3/16 die
 * punktierte Achtel. Da `bruch` kürzt, ist ein Zähler von 3 über einer
 * Zweierpotenz das sichere Kennzeichen.
 */
const istPunktiert = (wert: Bruch): boolean => wert.zähler === 3 && istZweierpotenz(wert.nenner);

/** Auf welche Zählzeit des Taktes eine Position fällt — exakt, ohne Fliesskomma. */
const zählzeitIndex = (position: Bruch, zeit: Bruch): number =>
  Math.floor((position.zähler * zeit.nenner) / (position.nenner * zeit.zähler));

/**
 * Die Balkengruppen eines Taktes: aufeinanderfolgende balkenfähige Schläge auf
 * derselben Zählzeit. Ein Schlag allein auf seiner Zählzeit bekommt keinen
 * Balken, und über den Taktstrich reicht keine Gruppe — sie entstehen je Takt.
 */
const balkenGruppen = (
  platzierte: readonly PlatzierterSchlag[],
  taktart: Taktart,
): PlatzierterSchlag[][] => {
  const zeit = zählzeit(taktart);
  const gruppen: PlatzierterSchlag[][] = [];
  let laufende: PlatzierterSchlag[] = [];
  let laufendeZeit: number | undefined;

  const schliesse = () => {
    if (laufende.length > 1) gruppen.push(laufende);
    laufende = [];
    laufendeZeit = undefined;
  };

  for (const platzierter of platzierte) {
    if (!istBalkenfähig(platzierter.schlag.wert)) {
      schliesse();
      continue;
    }
    const index = zählzeitIndex(platzierter.schlag.position, zeit);
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
  const platzierte = takt.schlaege.map((schlag) => {
    const x = inhaltX + alsZahl(schlag.position) * EINHEITEN_PRO_GANZE;
    return { schlag, x, halsX: x - HALS_VERSATZ };
  });
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
    const { schlag, x, halsX } = platzierter;
    const kopfY = kopfHöhe(schlag.hand, linieY);

    glyphen.push({ typ: "hals", x: halsX, yOben: kopfY, yUnten: balkenY });
    glyphen.push({
      typ: "notenkopf",
      x,
      y: kopfY,
      hand: schlag.hand,
      breite: KOPF_BREITE,
      höhe: KOPF_HÖHE,
    });

    // Der Schlepp-Strich sitzt über dem Kopf, nicht neben ihm: er hängt am
    // Schlag und trägt darum keine eigene Handhöhe. Er beginnt am oberen Rand
    // des Kopfes, nicht in dessen Mitte — sonst steckte seine halbe Länge in
    // der Tinte des Kopfes und läse sich als durchgeschobener Hals.
    if (figurZeichnung[schlag.figur] === "mitVorschlag") {
      const kopfRand = kopfY - KOPF_HÖHE / 2;
      glyphen.push({
        typ: "vorschlag",
        x,
        yOben: kopfRand - VORSCHLAG_LÄNGE,
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
      glyphen.push({ typ: "fahne", x: halsX, y: balkenY, anzahl: fahnen });
    }
  }

  for (const gruppe of gruppen) {
    glyphen.push({
      typ: "balken",
      x1: gruppe[0]!.halsX,
      x2: gruppe.at(-1)!.halsX,
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
    zähler: vers.taktart.zähler,
    nenner: vers.taktart.nenner,
  });
  glyphen.push({ typ: "notenlinie", x1: inhaltX, x2: inhaltX + breite, y: linieY });

  const strichAnzahl = vers.takte.length + 1;
  vers.takte.forEach((takt, index) => {
    const überlauf = taktÜberlauf(takt, vers.taktart);
    if (überlauf) throw new UngültigerTaktError(nummer, index + 1, überlauf, vers.taktart);

    const taktX = inhaltX + index * taktBreite(vers.taktart);
    glyphen.push(taktstrich(taktX, linieY, strichartFür(index, strichAnzahl, vers.wiederholungen)));
    legeTakt(takt, taktX, linieY, vers.taktart, nummer, index + 1, glyphen);
  });

  if (vers.takte.length > 0) {
    glyphen.push(
      taktstrich(
        inhaltX + breite,
        linieY,
        strichartFür(strichAnzahl - 1, strichAnzahl, vers.wiederholungen),
      ),
    );
  }

  return inhaltX + breite;
};

export const layout = (marsch: Marsch): Layout => {
  const glyphen: Glyph[] = [];
  glyphen.push({ typ: "titel", x: RAND, y: RAND + TITEL_HÖHE / 2, text: marsch.titel });

  let breite = 0;
  marsch.verse.forEach((vers, versIndex) => {
    const linieY = RAND + TITEL_HÖHE + versIndex * VERS_HÖHE + NOTENLINIE_ABSTAND;
    breite = Math.max(breite, legeVers(vers, versIndex + 1, linieY, glyphen));
  });

  return {
    breite: breite + RAND,
    höhe: RAND + TITEL_HÖHE + marsch.verse.length * VERS_HÖHE,
    glyphen,
  };
};
