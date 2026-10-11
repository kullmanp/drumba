import type { Bruch } from "../model/bruch";
import { alsZahl, bruch, dividiere, vergleiche } from "../model/bruch";
import type { Hand, Marsch, Pause, Schlag, Takt, Taktart, Vers } from "../model/marsch";
import { FIGURMERKMALE, folgeschlag, pruefeMarsch, taktLaenge, zaehlzeit } from "../model/marsch";

/**
 * Das Zuendstoff-Layout: eine reine Funktion vom Marsch zu platzierten Glyphen.
 * Sie besitzt die ganze Geometrie und kennt weder React noch SVG. Alle Masse
 * sind abstrakte Einheiten; erst der Renderer skaliert sie.
 *
 * Die Glyphen sind eine flache, von links nach rechts und von oben nach unten
 * geordnete Liste — Malreihenfolge zugleich Leserichtung.
 *
 * Die Notenlinie laeuft *durch* die Notation, nicht darunter: ein Notenkopf
 * steht rechts ueber der Linie und links darunter, und daran liest man die
 * Hand. Deshalb gehoert die Hoehe eines Kopfes hierher und nicht in den
 * Renderer — sie traegt Bedeutung und muss pruefbar sein.
 */

/** Abstrakte Einheiten je ganzer Note — der Massstab der horizontalen Zeit. */
const EINHEITEN_PRO_GANZE = 192;
const RAND = 16;
const TITEL_HOEHE = 44;
const VERS_HOEHE = 96;
/** Abstand der Notenlinie von der Oberkante des Vers-Blocks. */
const NOTENLINIE_ABSTAND = 40;
/**
 * Die Masse des Notenkopfes und was sich an ihm ausrichtet.
 *
 * Ausgemessen am `2006Trommelfont`, der Schrift, in der der Schweizerische
 * Tambouren- und Pfeiferverband seine eigenen Dokumente setzt: die Umrisse
 * seiner Notenglyphen sind die Vorlage, nicht der allgemeine Notenstich. Die
 * Zahlen dort sind auf die Kopfhoehe bezogen und hier mit einer frei gewaehlten
 * Kopfhoehe von 8 Einheiten wieder ausmultipliziert — die Schrift ist eine
 * Textschrift mit festen Vorschubbreiten und sagt darum nichts ueber den
 * waagrechten Abstand zweier Schlaege; der kommt weiter aus dem Rhythmus.
 * Nachmessen: `python3 scripts/trommelfont.py l u`.
 *
 * Die Groesse des Kopfes steht hier und nicht im Renderer, weil sich fremde
 * Zeichen an seinen Raendern ausrichten: der Vorschlag ueber seiner Oberkante,
 * der Hals an seiner linken Flanke, der Punkt rechts neben ihm. Dem Renderer
 * bleibt die Form — dass diese Huellbox eine gekippte Ellipse fuellt.
 */
const KOPF_HOEHE = 8;
const KOPF_BREITE = 9.19;
/**
 * Abstand der Kopfmitte von der Notenlinie. Der Kopf beruehrt die Linie nicht:
 * zwischen Linienkante und Kopfunterkante bleibt eine gute halbe Kopfhoehe
 * Luft. Erst dieser Abstand macht die Hand auf einen Blick lesbar — sie ist
 * die einzige Bedeutung, die die Hoehe eines Kopfes traegt.
 */
const KOPF_ABSTAND = 8.37;
/**
 * Wie weit links der Kopfmitte der Hals steht. Er laeuft nicht durch die Mitte
 * des Kopfes, sondern an seiner linken Flanke — buendig mit dessen linkem
 * Rand, wie in der Vorlage.
 */
const HALS_VERSATZ = 4.02;
/**
 * Wie tief die Halsenden unter der Notenlinie liegen — und damit die Balken.
 * Alle Haelse eines Taktes enden gleich tief, gleich auf welcher Seite der
 * Linie ihr Kopf steht; sonst traefen sie ihren gemeinsamen Balken nicht.
 */
const HALS_TIEFE = 35.74;
/** Luft zwischen Taktstrich und erstem Schlag des Taktes. */
const TAKT_INNENABSTAND = 14;
/**
 * Der halbe Taktstrich: er steht symmetrisch um die Notenlinie, gleich weit
 * darueber wie darunter, und reicht weder an die Koepfe noch an die Balken.
 *
 * Auch das ist am `2006Trommelfont` ausgemessen. Der Taktstrich ist dort ein
 * kurzer Strich quer ueber die Linie — er umschliesst die Noten nicht, sondern
 * markiert nur die Stelle auf der Linie, an der der Takt wechselt.
 */
const TAKTSTRICH_HALBLAENGE = 8.71;
/**
 * Die Masse der Wiederholungsklammer. Fuer sie gibt es noch keine Vorlage: die
 * Schrift hat Wiederholungszeichen, aber der ausgewertete Auszug enthaelt
 * keines. Die Werte stehen darum nur im Verhaeltnis zum Taktstrich, bis ein
 * echtes Muster sie ersetzt.
 */
const KLAMMER_STRICH_ABSTAND = 3;
const KLAMMER_PUNKT_ABSTAND = 3;
const KLAMMER_PUNKT_HOEHE = 5;
/** Breite der Vers-Nummer und der Taktart links vor dem ersten Taktstrich. */
const VERS_NUMMER_BREITE = 26;
const TAKTART_BREITE = 26;
const VERS_KOPF_BREITE = VERS_NUMMER_BREITE + TAKTART_BREITE;
/** Laenge der senkrechten Linie, die einen Schlepp ueber seinem Notenkopf anzeigt. */
const VORSCHLAG_LAENGE = 12;
/** Abstand des Punktes rechts neben dem Notenkopf. */
const PUNKT_ABSTAND = 7;
/**
 * Der Bogen eines Rufs: wie weit seine Enden von der Kopfmitte zur Mitte des
 * Bogens hin ruecken — weg vom Vorschlag-Strich des Rufs —, wie viel Luft sie
 * ueber dem Kopf lassen und wie hoch der Bogen sich darueber woelbt. Noch ohne
 * Vorlage, nach Augenmass.
 */
const BOGEN_EINZUG = KOPF_BREITE / 4;
const BOGEN_LUFT = 2;
const BOGEN_HOEHE = 8;
/** Luft zwischen dem Scheitel des Bogens und der Grundlinie der Ruf-Zahl. */
const ZAHL_LUFT = 2;
/**
 * Wie weit ein Balkenstummel vom Hals in seine Gruppe reicht — etwa eine
 * Kopfbreite, nach Augenmass an ZicZac.
 */
const STUMMEL_LAENGE = 7;

/**
 * Wie viele Striche des Wirbels den Hals eines Rufs queren. Vorerst fuer jeden
 * Ruf zwei, wie beim Fuenferruf in ZicZac; ob die Zahl mit dem Ruf waechst, ist
 * noch nicht ausgemessen. Was eine Figur sonst ausmacht — Vorschlag, Ruf —
 * steht in `FIGURMERKMALE` im Modell.
 */
const WIRBEL_STRICHE = 2;
/**
 * Ein Ruf, der nicht auf einer Zaehlzeit beginnt, fuehrt auf eine hin und steht
 * darum frei vor ihr: ungebalkt und kleiner, wie ein Vorschlag. Am Original
 * (ZicZac) ausgemessen: der Kopf rund zwei Drittel so gross, naeher an der
 * Linie, der Hals etwa halb so tief.
 */
const FREIER_RUF_KOPF = 0.65;
const FREIER_RUF_KOPF_ABSTAND = 0.6 * KOPF_ABSTAND;
const FREIER_RUF_HALS_TIEFE = 0.45 * HALS_TIEFE;

/**
 * Die Pausen. Alle stehen auf einer Hoehe unter der Notenlinie, etwa auf
 * Balkenhoehe und gleich, auf welcher Seite die Koepfe daneben stehen — eine
 * Pause hat keine Hand. `PAUSE_TIEFE` ist ihr unteres Ende; wie weit sie nach
 * oben reicht, ist ihre innere Form und gehoert dem Renderer. Nach Augenmass an
 * ZicZac (Vers 1, Takt 2 und das Ende von Vers 3); eine Schriftvorlage fehlt.
 */
const PAUSE_TIEFE = 0.9 * HALS_TIEFE;
/**
 * Der Punkt einer punktierten Pause: rechts neben ihr, zwischen Notenlinie und
 * Pausenfuss, fuer jede Pause gleich hoch. Nach Augenmass; eine punktierte
 * Pause zeigt ZicZac nicht.
 */
const PAUSE_PUNKT_ABSTAND = 6;
const PAUSE_PUNKT_HOEHE = 0.6 * HALS_TIEFE;

/** Die Pausen, die gezeichnet werden koennen — Halbe und Ganze noch nicht. */
export type Pausenart = "Sechzehntelpause" | "Achtelpause" | "Viertelpause";

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
      /** Ueber der Notenlinie fuer rechts, darunter fuer links. */
      readonly y: number;
      readonly hand: Hand;
      /** Die Huellmasse des Kopfes. Welche Form sie fuellt, waehlt der Renderer. */
      readonly breite: number;
      readonly hoehe: number;
    }
  | {
      readonly typ: "hals";
      /** Am Notenkopf. */
      readonly yOben: number;
      /** Auf Balkenhoehe, unter der Notenlinie. */
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
      /** Der Schlepp-Strich steht ueber dem Notenkopf. */
      readonly x: number;
      readonly yOben: number;
      readonly yUnten: number;
    }
  | {
      readonly typ: "wirbelstriche";
      /** Auf dem Hals des Rufs; Neigung und Abstand der Striche waehlt der Renderer. */
      readonly x: number;
      readonly y: number;
      /** Wie viele Striche den Hals queren. */
      readonly anzahl: number;
    }
  | { readonly typ: "punkt"; readonly x: number; readonly y: number }
  | {
      readonly typ: "pause";
      /** Die rhythmische Stelle; die Pause steht mittig darauf. */
      readonly x: number;
      /** Ihr unteres Ende, fuer jede Pause gleich tief unter der Notenlinie. */
      readonly y: number;
      readonly art: Pausenart;
    }
  | {
      readonly typ: "rufZahl";
      /** Die Mitte der Zahl, ueber dem Bogen. */
      readonly x: number;
      /** Die Grundlinie der Zahl. */
      readonly y: number;
      readonly text: string;
    }
  | {
      readonly typ: "bogen";
      /** Ueber dem Kopf des Rufs. */
      readonly x1: number;
      readonly y1: number;
      /** Ueber dem Kopf der Landung — auch jenseits des Taktstrichs. */
      readonly x2: number;
      readonly y2: number;
      /** Die Hoehe, bis zu der sich der Bogen zwischen seinen Enden woelbt. */
      readonly scheitelY: number;
    }
  | {
      readonly typ: "balken";
      readonly x1: number;
      readonly x2: number;
      /** An den Halsenden; hoehere Ebenen stapelt der Renderer darueber. */
      readonly y: number;
      /** Die wievielte Balkenlinie: 1 fuer die Achtel, 2 fuer die Sechzehntel, … */
      readonly ebene: number;
    }
  | {
      readonly typ: "balkenstummel";
      /** Am Hals, an dem der Stummel haengt. */
      readonly x1: number;
      /** In die Gruppe hinein: am ersten Schlag rechts des Halses, sonst links. */
      readonly x2: number;
      readonly y: number;
      readonly ebene: number;
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
 * Eine Pause, deren Wert das Layout nicht zeichnen kann — bisher alles ausser
 * Sechzehntel, Achtel und Viertel, je auch punktiert. Sie faellt auf, statt
 * still falsch gezeichnet zu werden.
 */
export class UnzeichenbarePauseError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    readonly pause: Pause,
  ) {
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: Pause auf ` +
        `${pause.position.zaehler}/${pause.position.nenner} mit Wert ` +
        `${pause.wert.zaehler}/${pause.wert.nenner} kann noch nicht gezeichnet werden`,
    );
    this.name = "UnzeichenbarePauseError";
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
  const yOben = linieY - TAKTSTRICH_HALBLAENGE;
  const yUnten = linieY + TAKTSTRICH_HALBLAENGE;
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
            // Strich reicht bis zu den Balken hinunter, die Punkte gehoeren
            // dorthin, wo gelesen wird.
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY - KLAMMER_PUNKT_HOEHE },
            { x: x + innen * KLAMMER_PUNKT_ABSTAND, y: linieY + KLAMMER_PUNKT_HOEHE },
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
  /** Die Kopfmitte: auf der Seite der Linie, die die Hand sagt. */
  readonly kopfY: number;
  /** Die Huellmasse des Kopfes. */
  readonly kopfBreite: number;
  readonly kopfHoehe: number;
  /** Wo der Hals endet — auf Balkenhoehe oder, beim freien Ruf, kuerzer. */
  readonly halsEnde: number;
  /** Ein Ruf, der frei vor seiner Zaehlzeit steht und nicht gebalkt wird. */
  readonly frei: boolean;
}

/** Die Hoehe des Notenkopfes: rechts ueber der Notenlinie, links darunter. */
const kopfHoehe = (hand: Hand, linieY: number, abstand = KOPF_ABSTAND): number =>
  hand === "rechts" ? linieY - abstand : linieY + abstand;

/**
 * Ob ein Schlag ein freier Ruf ist: ein Ruf, der nicht auf einer Zaehlzeit
 * beginnt. Er fuehrt auf die naechste hin und wird nicht mit den Schlaegen vor
 * ihm gebalkt. Beginnt er auf der Zaehlzeit, balkt er wie jeder Schlag.
 */
const istFreierRuf = (schlag: Schlag, taktart: Taktart): boolean =>
  FIGURMERKMALE[schlag.figur].ruf !== undefined &&
  dividiere(schlag.position, zaehlzeit(taktart)).nenner !== 1;

/**
 * Wie viele Fahnen ein notierter Wert traegt — Achtel eine, Sechzehntel zwei,
 * ab der Viertel keine. Punktierungen zaehlen wie ihr ungepunkteter Grundwert:
 * eine punktierte Achtel traegt eine Fahne. Dieselbe Zahl bestimmt, wie viele
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
 * punktierte Achtel. Da `bruch` kuerzt, ist ein Zaehler von 3 ueber einer
 * Zweierpotenz das sichere Kennzeichen.
 */
const istPunktiert = (wert: Bruch): boolean => wert.zaehler === 3 && istZweierpotenz(wert.nenner);

/**
 * Welche Pause einen Wert zeichnet, punktiert wie unpunktiert. `undefined` fuer
 * Werte ohne Zeichen, ab der Halben und unter der Sechzehntel.
 */
const pausenart = (wert: Bruch): Pausenart | undefined => {
  const grund = istPunktiert(wert) ? bruch(2 * wert.zaehler, 3 * wert.nenner) : wert;
  if (grund.zaehler !== 1) return undefined;
  if (grund.nenner === 4) return "Viertelpause";
  if (grund.nenner === 8) return "Achtelpause";
  if (grund.nenner === 16) return "Sechzehntelpause";
  return undefined;
};

/** Auf welche Zaehlzeit des Taktes eine Position faellt — exakt, ohne Fliesskomma. */
const zaehlzeitIndex = (position: Bruch, zeit: Bruch): number =>
  Math.floor((position.zaehler * zeit.nenner) / (position.nenner * zeit.zaehler));

/**
 * Die Balkengruppen eines Taktes: aufeinanderfolgende balkenfaehige Schlaege auf
 * derselben Zaehlzeit. Ein Schlag allein auf seiner Zaehlzeit bekommt keinen
 * Balken, und ueber den Taktstrich reicht keine Gruppe — sie entstehen je Takt.
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
    if (!istBalkenfaehig(platzierter.schlag.wert) || platzierter.frei) {
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

/**
 * Die Balken einer Gruppe, Ebene um Ebene. Die erste spannt die ganze Gruppe;
 * jede weitere spannt jeden Lauf aufeinanderfolgender Schlaege, die so kurz
 * sind, dass sie sie brauchen — die Sechzehntel neben einer Achtel bekommen
 * ihren zweiten Balken unter sich, die Achtel nicht. Ein Lauf aus einem
 * einzigen Schlag bekommt statt eines Balkens einen Stummel, der in die Gruppe
 * hineinzeigt: vom ersten Schlag nach rechts, von jedem anderen nach links.
 */
const legeBalken = (
  gruppe: readonly PlatzierterSchlag[],
  balkenY: number,
  glyphen: Glyph[],
): void => {
  const tiefsteEbene = Math.max(...gruppe.map((p) => fahnenAnzahl(p.schlag.wert)));
  for (let ebene = 1; ebene <= tiefsteEbene; ebene++) {
    let lauf: PlatzierterSchlag[] = [];
    const schliesse = () => {
      const [erster] = lauf;
      if (lauf.length === 1) {
        const vorzeichen = erster === gruppe[0] ? 1 : -1;
        glyphen.push({
          typ: "balkenstummel",
          x1: erster!.halsX,
          x2: erster!.halsX + vorzeichen * STUMMEL_LAENGE,
          y: balkenY,
          ebene,
        });
      } else if (lauf.length > 1) {
        glyphen.push({
          typ: "balken",
          x1: erster!.halsX,
          x2: lauf.at(-1)!.halsX,
          y: balkenY,
          ebene,
        });
      }
      lauf = [];
    };
    for (const platzierter of gruppe) {
      if (fahnenAnzahl(platzierter.schlag.wert) >= ebene) lauf.push(platzierter);
      else schliesse();
    }
    schliesse();
  }
};

/**
 * Die Pausen eines Taktes. Sie nehmen an keiner Balkengruppe teil: die Balken
 * beginnen und enden an Schlaegen, und eine Pause mitten in einer Zaehlzeit
 * laesst den Balken ueber sich hinweglaufen. Das Letzte ist an keinem Original
 * bestaetigt — ZicZac hat keine Pause mitten in einer Zaehlzeit.
 */
const legePausen = (
  takt: Takt,
  inhaltX: number,
  linieY: number,
  versNummer: number,
  taktNummer: number,
  glyphen: Glyph[],
): void => {
  for (const pause of takt.pausen) {
    const art = pausenart(pause.wert);
    if (!art) throw new UnzeichenbarePauseError(versNummer, taktNummer, pause);
    const x = inhaltX + alsZahl(pause.position) * EINHEITEN_PRO_GANZE;
    glyphen.push({ typ: "pause", x, y: linieY + PAUSE_TIEFE, art });
    if (istPunktiert(pause.wert)) {
      glyphen.push({ typ: "punkt", x: x + PAUSE_PUNKT_ABSTAND, y: linieY + PAUSE_PUNKT_HOEHE });
    }
  }
};

const legeTakt = (
  takt: Takt,
  taktX: number,
  linieY: number,
  versTaktart: Taktart,
  versNummer: number,
  taktNummer: number,
  glyphen: Glyph[],
): PlatzierterSchlag[] => {
  const inhaltX = taktX + TAKT_INNENABSTAND;
  const balkenY = linieY + HALS_TIEFE;
  const platzierte = takt.schlaege.map((schlag): PlatzierterSchlag => {
    const x = inhaltX + alsZahl(schlag.position) * EINHEITEN_PRO_GANZE;
    const frei = istFreierRuf(schlag, versTaktart);
    const kopf = frei ? FREIER_RUF_KOPF : 1;
    return {
      schlag,
      x,
      halsX: x - HALS_VERSATZ * kopf,
      kopfY: kopfHoehe(schlag.hand, linieY, frei ? FREIER_RUF_KOPF_ABSTAND : KOPF_ABSTAND),
      kopfBreite: KOPF_BREITE * kopf,
      kopfHoehe: KOPF_HOEHE * kopf,
      halsEnde: frei ? linieY + FREIER_RUF_HALS_TIEFE : balkenY,
      frei,
    };
  });
  const gruppen = balkenGruppen(platzierte, versTaktart);
  const gebalkt = new Set(gruppen.flat());

  for (const platzierter of platzierte) {
    const { schlag, x, halsX, kopfY, halsEnde } = platzierter;

    glyphen.push({ typ: "hals", x: halsX, yOben: kopfY, yUnten: halsEnde });
    glyphen.push({
      typ: "notenkopf",
      x,
      y: kopfY,
      hand: schlag.hand,
      breite: platzierter.kopfBreite,
      hoehe: platzierter.kopfHoehe,
    });

    // Der Schlepp-Strich sitzt ueber dem Kopf, nicht neben ihm: er haengt am
    // Schlag und traegt darum keine eigene Handhoehe. Er beginnt am oberen Rand
    // des Kopfes, nicht in dessen Mitte — sonst steckte seine halbe Laenge in
    // der Tinte des Kopfes und laese sich als durchgeschobener Hals.
    const merkmale = FIGURMERKMALE[schlag.figur];
    if (merkmale.vorschlag) {
      const kopfRand = kopfY - platzierter.kopfHoehe / 2;
      glyphen.push({
        typ: "vorschlag",
        x,
        yOben: kopfRand - VORSCHLAG_LAENGE * (platzierter.kopfHoehe / KOPF_HOEHE),
        yUnten: kopfRand,
      });
    }
    // Der Wirbel quert den Hals zwischen Notenlinie und Halsende — dort, wo jeder
    // Hals verlaeuft, gleich auf welcher Seite der Linie sein Kopf steht.
    if (merkmale.ruf) {
      glyphen.push({
        typ: "wirbelstriche",
        x: halsX,
        y: (linieY + halsEnde) / 2,
        anzahl: WIRBEL_STRICHE,
      });
    }
    if (istPunktiert(schlag.wert)) {
      glyphen.push({ typ: "punkt", x: x + PUNKT_ABSTAND, y: kopfY });
    }

    // Was kein Balken traegt, traegt seine Fahnen selbst — sonst laese sich eine
    // einzelne Achtel wie eine Viertel.
    const fahnen = fahnenAnzahl(schlag.wert);
    if (fahnen > 0 && !gebalkt.has(platzierter)) {
      glyphen.push({ typ: "fahne", x: halsX, y: halsEnde, anzahl: fahnen });
    }
  }

  for (const gruppe of gruppen) legeBalken(gruppe, balkenY, glyphen);
  legePausen(takt, inhaltX, linieY, versNummer, taktNummer, glyphen);

  return platzierte;
};

/**
 * Die Boegen der Rufe eines Verses, je vom Ruf zu seiner Landung — dem Schlag,
 * den das Modell mit `folgeschlag` nennt, auch ueber den Taktstrich. Dass es ihn
 * gibt und er passt, hat `pruefeMarsch` schon sichergestellt. Ein Vers ist eine
 * Zeile, also bricht kein Bogen um.
 *
 * `platzierte` haelt die platzierten Schlaege je Takt, in der Reihenfolge des
 * Modells, damit die Landung des Modells ihren platzierten Schlag findet.
 */
const legeBoegen = (
  vers: Vers,
  platzierte: readonly (readonly PlatzierterSchlag[])[],
  glyphen: Glyph[],
): void => {
  const ueberKopf = (p: PlatzierterSchlag): number => p.kopfY - p.kopfHoehe / 2 - BOGEN_LUFT;

  platzierte.forEach((takt, taktIndex) => {
    takt.forEach((ruf, index) => {
      const merkmale = FIGURMERKMALE[ruf.schlag.figur].ruf;
      if (!merkmale) return;
      const ziel = folgeschlag(vers, taktIndex, index)!;
      const landung = platzierte[ziel.taktIndex]![ziel.index]!;
      const x1 = ruf.x + BOGEN_EINZUG * (ruf.kopfBreite / KOPF_BREITE);
      const x2 = landung.x - BOGEN_EINZUG;
      const y1 = ueberKopf(ruf);
      const y2 = ueberKopf(landung);
      const scheitelY = Math.min(y1, y2) - BOGEN_HOEHE;
      glyphen.push({ typ: "bogen", x1, y1, x2, y2, scheitelY });
      glyphen.push({
        typ: "rufZahl",
        x: (x1 + x2) / 2,
        y: scheitelY - ZAHL_LUFT,
        text: String(merkmale.schlaege),
      });
    });
  });
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
  const platzierte = vers.takte.map((takt, index) => {
    const taktX = inhaltX + index * taktBreite(vers.taktart);
    glyphen.push(
      taktstrich(taktX, linieY, strichartFuer(index, strichAnzahl, vers.wiederholungen)),
    );
    return legeTakt(takt, taktX, linieY, vers.taktart, nummer, index + 1, glyphen);
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
  legeBoegen(vers, platzierte, glyphen);

  return inhaltX + breite;
};

export const layout = (marsch: Marsch): Layout => {
  // Ein ueberlaufender Takt oder ein Ruf ohne Landung wird nicht still gezeichnet.
  pruefeMarsch(marsch);

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
