import type { Bruch } from "./bruch";
import { addiere, bruch, dividiere, multipliziere, NULL, subtrahiere, vergleiche } from "./bruch";

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
 *
 * `Double` ist das Double des Glossars, in ASCII geschrieben.
 */
export type Figur = "Dupfe" | "Schlepp" | "Double" | "Fuenferruf";

/** Was eine Figur ausmacht, an einer Stelle — Layout und Wiedergabe lesen beide hier. */
export interface Figurmerkmale {
  /** Ob ein Vorschlag in der anderen Hand kurz vor dem Schlag liegt. */
  readonly vorschlag: boolean;
  /** Bei einem Ruf: wie viele Schlaege er zaehlt, die Landung eingerechnet. */
  readonly ruf?: { readonly schlaege: number };
  /**
   * Bei einem Double: die leise Dupfe in der Hand des Schlags, `vorlauf` (in
   * Ganzen) vor ihm. Ein Notenwert, keine Geste — sie waechst mit dem Tempo. Wie
   * der Vorschlag gehoert sie zur Figur und nimmt im Takt keinen Platz ein; sie
   * darf vor den vorigen Schlag, in den vorigen Takt oder vor den Marsch fallen.
   */
  readonly leiseDupfe?: { readonly vorlauf: Bruch };
}

export const FIGURMERKMALE: Record<Figur, Figurmerkmale> = {
  Dupfe: { vorschlag: false },
  Schlepp: { vorschlag: true },
  // Ein Schlepp mit einer leisen Dupfe eine Sechzehntel davor.
  Double: { vorschlag: true, leiseDupfe: { vorlauf: bruch(1, 16) } },
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

/**
 * Eine Pause: notierte Stille. Wie ein Schlag eine Position und ein Wert im
 * Takt, aber ohne Figur und ohne Hand. Sie wird ausgeschrieben, nie aus einer
 * Luecke erschlossen — erst so faellt ein halb leerer Takt als Fehler auf.
 */
export interface Pause {
  /** Exakte Position im Takt, gemessen in Ganzen ab Taktbeginn. */
  readonly position: Bruch;
  /** Der notierte Wert, in Ganzen: 1/8 = Achtelpause. */
  readonly wert: Bruch;
}

/**
 * Ein Takt: seine geordneten Schlaege und, als eigene Liste daneben, seine
 * Pausen. Beide zusammen fuellen ihn lueckenlos.
 */
export interface Takt {
  readonly schlaege: readonly Schlag[];
  readonly pausen: readonly Pause[];
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
  /**
   * Der Auftakt vor dem ersten Takt, falls es einen gibt — das Ende eines Taktes
   * der Taktart des Verses (ADR-0003): seine Schlaege und Pausen stehen auf den
   * Positionen, die sie in einem vollen Takt haetten.
   */
  readonly auftakt?: Takt;
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
 * Der Taktindex, unter dem der Auftakt eines Verses steht: einer vor dem ersten
 * Takt. So fuehrt der Schritt zum naechsten Takt aus dem Auftakt in Takt 1, wie
 * aus jedem Takt in den folgenden.
 *
 * Nur ueber `taktAn` aufloesen: `vers.takte[AUFTAKT]` ist `undefined`, und
 * `vers.takte.at(AUFTAKT)` gaebe still den letzten Takt. Wer platzierte oder
 * gespielte Takte in einer eigenen Liste haelt, braucht fuer den Auftakt einen
 * eigenen Platz daneben.
 */
export const AUFTAKT = -1;

/** Der Takt unter einem Taktindex — der Auftakt unter `AUFTAKT`. */
export const taktAn = (vers: Vers, taktIndex: number): Takt | undefined =>
  taktIndex === AUFTAKT ? vers.auftakt : vers.takte[taktIndex];

/**
 * Wo der Auftakt beginnt: bei seinem ersten Schlag, auf dessen Position in einem
 * vollen Takt. Er dauert von dort bis zum Taktende. Wie in jedem Takt sind die
 * Schlaege nach Position geordnet; stehen sie es nicht, faellt das als
 * Ueberlappung in der Pruefung auf.
 */
export const auftaktBeginn = (auftakt: Takt): Bruch => auftakt.schlaege[0]?.position ?? NULL;

/** Was einen Takt fuellt: seine Schlaege und seine Pausen, in einer Liste. */
const elemente = (takt: Takt): (Schlag | Pause)[] => [...takt.schlaege, ...takt.pausen];

/**
 * Der erste Schlag oder die erste Pause, die nicht in den Takt passt — vor dem
 * Beginn oder ueber das Ende hinaus. `undefined`, wenn der Takt gueltig ist. Ein
 * ueberlaufender Takt ist ein Datenfehler und darf nicht still gezeichnet werden.
 */
export const taktUeberlauf = (takt: Takt, taktart: Taktart): Schlag | Pause | undefined => {
  const laenge = taktLaenge(taktart);
  return elemente(takt).find(
    (element) =>
      vergleiche(element.position, NULL) < 0 ||
      vergleiche(addiere(element.position, element.wert), laenge) > 0,
  );
};

/** Wie ein Schlag oder eine Pause in einer Fehlermeldung heisst. */
const benenne = (element: Schlag | Pause): string => ("figur" in element ? element.figur : "Pause");

/**
 * Ein Takt, dessen Schlaege oder Pausen nicht in seine Taktart passen. Solche
 * Daten werden weder gezeichnet noch gespielt — falsch Gesetztes soll auffallen,
 * nicht still ueber den Taktstrich hinauslaufen.
 */
export class UngueltigerTaktError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    readonly element: Schlag | Pause,
    taktart: Taktart,
  ) {
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: ${benenne(element)} auf ` +
        `${element.position.zaehler}/${element.position.nenner} mit Wert ` +
        `${element.wert.zaehler}/${element.wert.nenner} passt nicht in ` +
        `${taktart.zaehler}/${taktart.nenner}`,
    );
    this.name = "UngueltigerTaktError";
  }
}

/** Wo ein Takt nicht lueckenlos gefuellt ist: eine Luecke oder eine Ueberlappung. */
export interface Fuellfehler {
  readonly art: "Luecke" | "Ueberlappung";
  /** Wo im Takt, in Ganzen ab Taktbeginn. */
  readonly stelle: Bruch;
}

/**
 * Wo die Schlaege und Pausen eines Taktes, nach Position geordnet, die Strecke
 * von `beginn` bis `ende` nicht genau fuellen. `undefined`, wenn sie es tun. Der
 * Beginn ist ein Parameter, weil nicht jeder Takt bei 0 anfaengt.
 *
 * Was ueber `ende` hinausragt, meldet sie nicht: das ist ein Ueberlauf, und
 * `taktUeberlauf` muss vorher gelaufen sein.
 */
const fuellfehler = (takt: Takt, beginn: Bruch, ende: Bruch): Fuellfehler | undefined => {
  const geordnet = elemente(takt).sort((a, b) => vergleiche(a.position, b.position));
  let bisher = beginn;
  for (const element of geordnet) {
    const lage = vergleiche(element.position, bisher);
    if (lage > 0) return { art: "Luecke", stelle: bisher };
    if (lage < 0) return { art: "Ueberlappung", stelle: element.position };
    bisher = addiere(element.position, element.wert);
  }
  return vergleiche(bisher, ende) < 0 ? { art: "Luecke", stelle: bisher } : undefined;
};

/**
 * Ein Takt, den seine Schlaege und Pausen nicht genau fuellen. Eine Luecke ist
 * kein stilles Schweigen — wer schweigen will, schreibt eine Pause.
 */
export class LueckenhafterTaktError extends Error {
  constructor(
    readonly versNummer: number,
    readonly taktNummer: number,
    readonly fehler: Fuellfehler,
  ) {
    super(
      `Vers ${versNummer}, Takt ${taktNummer}: ${fehler.art} auf ` +
        `${fehler.stelle.zaehler}/${fehler.stelle.nenner} — Schlaege und Pausen ` +
        `muessen den Takt lueckenlos fuellen`,
    );
    this.name = "LueckenhafterTaktError";
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

/** Wo im Marsch etwas steht, fuer Fehlermeldungen: Takt 0 ist der Auftakt. */
export const ort = (versNummer: number, taktNummer: number): string =>
  taktNummer === 0 ? `Vers ${versNummer}, Auftakt` : `Vers ${versNummer}, Takt ${taktNummer}`;

/**
 * Ein Ruf ohne gueltige Landung: kein Schlag danach, keiner genau eine Achtel
 * spaeter oder einer in der falschen Hand. Ein Ruf, der nirgends landet, wird
 * weder gezeichnet noch gespielt.
 */
export class UngueltigerRufError extends Error {
  constructor(
    readonly versNummer: number,
    /** Ab 1 gezaehlt; 0 ist der Auftakt. */
    readonly taktNummer: number,
    readonly schlag: Schlag,
  ) {
    super(
      `${ort(versNummer, taktNummer)}: ${schlag.figur} ${schlag.hand} auf ` +
        `${schlag.position.zaehler}/${schlag.position.nenner} hat keine Landung ` +
        `eine Achtel spaeter in derselben Hand`,
    );
    this.name = "UngueltigerRufError";
  }
}

/**
 * Ein Auftakt, der nicht gezeichnet oder gespielt werden kann: leer, mit einer
 * Pause vorne, so lang wie ein ganzer Takt, nicht lueckenlos — oder einer, der
 * bei der Rueckkehr zu Takt 1 ueber einen klingenden Schlag gespielt wuerde.
 */
export class UngueltigerAuftaktError extends Error {
  constructor(
    readonly versNummer: number,
    grund: string,
  ) {
    super(`Vers ${versNummer}, Auftakt: ${grund}`);
    this.name = "UngueltigerAuftaktError";
  }
}

const alsText = (b: Bruch): string => `${b.zaehler}/${b.nenner}`;

/**
 * Prueft den Auftakt eines Verses fuer sich: er hat Schlaege, beginnt mit einem,
 * ist kuerzer als ein Takt und fuellt die Strecke von seinem Beginn bis zum
 * Taktende lueckenlos.
 */
const pruefeAuftaktForm = (auftakt: Takt, taktart: Taktart, versNummer: number): void => {
  const fehler = (grund: string) => new UngueltigerAuftaktError(versNummer, grund);
  if (auftakt.schlaege.length === 0) throw fehler("hat keinen Schlag");
  const beginn = auftaktBeginn(auftakt);
  if (auftakt.pausen.some((pause) => vergleiche(pause.position, beginn) < 0)) {
    throw fehler("beginnt mit einer Pause statt mit einem Schlag");
  }
  if (vergleiche(beginn, NULL) <= 0) throw fehler("ist so lang wie ein ganzer Takt");
  const ueberlauf = taktUeberlauf(auftakt, taktart);
  if (ueberlauf) {
    throw fehler(
      `${benenne(ueberlauf)} auf ${alsText(ueberlauf.position)} passt nicht in den Takt`,
    );
  }
  const luecke = fuellfehler(auftakt, beginn, taktLaenge(taktart));
  if (luecke) throw fehler(`${luecke.art} auf ${alsText(luecke.stelle)}`);
};

/**
 * Prueft, dass der Auftakt eines Verses ueberall, wo er wieder erklingt, nur
 * ueber Pausen faellt (ADR-0003): ueber das Ende des eigenen letzten Taktes bei
 * der Wiederholung, und ueber das Ende des letzten Taktes des vorigen Verses.
 *
 * Gemessen wird in Zaehlzeiten, denn das Tempo haelt den Puls ueber einen
 * Wechsel der Taktart: ein Auftakt von einer halben Zaehlzeit in 2/4 deckt die
 * letzte halbe Zaehlzeit eines 6/8-Taktes, also 3/16.
 */
const pruefeAuftaktWiederkehr = (marsch: Marsch, versIndex: number): void => {
  const vers = marsch.verse[versIndex]!;
  const auftakt = vers.auftakt!;
  const zaehlzeiten = dividiere(
    subtrahiere(taktLaenge(vers.taktart), auftaktBeginn(auftakt)),
    zaehlzeit(vers.taktart),
  );
  const wiederkehrIn = [
    ...(vers.wiederholungen === 2 ? [versIndex] : []),
    ...(versIndex > 0 ? [versIndex - 1] : []),
  ];
  for (const zielIndex of wiederkehrIn) {
    const ziel = marsch.verse[zielIndex]!;
    const letzter = ziel.takte.at(-1);
    // Ein Vers ohne Takte hat keinen Schluss, ueber den der Auftakt fallen koennte.
    if (!letzter) continue;
    const ende = taktLaenge(ziel.taktart);
    const beginn = subtrahiere(ende, multipliziere(zaehlzeiten, zaehlzeit(ziel.taktart)));
    const wo = `im letzten Takt von Vers ${zielIndex + 1}`;
    if (vergleiche(beginn, NULL) < 0) {
      throw new UngueltigerAuftaktError(versIndex + 1, `ist laenger als der letzte Takt ${wo}`);
    }
    const klingend = letzter.schlaege.find(
      (schlag) => vergleiche(addiere(schlag.position, schlag.wert), beginn) > 0,
    );
    if (klingend) {
      throw new UngueltigerAuftaktError(
        versIndex + 1,
        `faellt ${wo} ab ${alsText(beginn)} ueber den Schlag auf ${alsText(klingend.position)}`,
      );
    }
  }
};

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
 * als erster des naechsten, aus dem Auftakt (`AUFTAKT`) also in Takt 1. Ueber
 * das Ende des Verses hinaus sucht er nicht: eine Landung im naechsten Vers
 * oder in der Wiederholung gibt es noch nicht.
 *
 * Der Abstand ueber den Taktstrich geht bis zum Taktende und von dort weiter;
 * das gilt auch fuer den Auftakt, dessen Positionen die eines vollen Taktes sind.
 *
 * Die eine Stelle, die sagt, wo ein Ruf landet: `pruefeMarsch` prueft daran die
 * Landung, das Layout zieht den Bogen dorthin.
 */
export const folgeschlag = (
  vers: Vers,
  taktIndex: number,
  index: number,
): Folgeschlag | undefined => {
  const schlaege = taktAn(vers, taktIndex)!.schlaege;
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

  const imNaechsten = taktAn(vers, taktIndex + 1)?.schlaege[0];
  if (!imNaechsten) return undefined;
  const bisTaktende = subtrahiere(taktLaenge(vers.taktart), schlag.position);
  return {
    schlag: imNaechsten,
    abstand: addiere(bisTaktende, imNaechsten.position),
    taktIndex: taktIndex + 1,
    index: 0,
  };
};

/** Wirft, wenn der Ruf an dieser Stelle keine gueltige Landung hat. */
const pruefeLandung = (vers: Vers, versIndex: number, taktIndex: number, index: number): void => {
  const schlag = taktAn(vers, taktIndex)!.schlaege[index]!;
  if (!FIGURMERKMALE[schlag.figur].ruf) return;
  const landung = folgeschlag(vers, taktIndex, index);
  if (
    !landung ||
    vergleiche(landung.abstand, FUENFERRUF_DAUER) !== 0 ||
    landung.schlag.hand !== schlag.hand
  ) {
    throw new UngueltigerRufError(versIndex + 1, taktIndex + 1, schlag);
  }
};

/**
 * Prueft einen Marsch, bevor er gezeichnet oder gespielt wird: jeder Takt passt
 * in seine Taktart und wird von seinen Schlaegen und Pausen genau gefuellt, ein
 * Auftakt hat seine Form und faellt beim Wiedererklingen nur ueber Pausen, und
 * jeder Ruf hat seine Landung. Wirft beim ersten Fehler.
 */
export const pruefeMarsch = (marsch: Marsch): void => {
  marsch.verse.forEach((vers, versIndex) => {
    if (vers.auftakt) pruefeAuftaktForm(vers.auftakt, vers.taktart, versIndex + 1);
    vers.takte.forEach((takt, taktIndex) => {
      const ueberlauf = taktUeberlauf(takt, vers.taktart);
      if (ueberlauf) {
        throw new UngueltigerTaktError(versIndex + 1, taktIndex + 1, ueberlauf, vers.taktart);
      }
      const fehler = fuellfehler(takt, NULL, taktLaenge(vers.taktart));
      if (fehler) throw new LueckenhafterTaktError(versIndex + 1, taktIndex + 1, fehler);
    });
    // Erst wenn alle Takte stehen: der Auftakt kehrt ueber den letzten Takt
    // wieder, und ein Ruf im Auftakt landet in Takt 1.
    if (vers.auftakt) pruefeAuftaktWiederkehr(marsch, versIndex);
    vers.auftakt?.schlaege.forEach((_, index) => pruefeLandung(vers, versIndex, AUFTAKT, index));
    vers.takte.forEach((takt, taktIndex) =>
      takt.schlaege.forEach((_, index) => pruefeLandung(vers, versIndex, taktIndex, index)),
    );
  });
};
