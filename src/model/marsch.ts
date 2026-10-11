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
 * Von der Ruf-Familie stehen der Fuenferruf (mit Schlepp) und der Siebnerruf
 * hier. Jeder fuellt genau seine Dauer — eine Achtel, eine punktierte Achtel;
 * seine Landung ist nicht Teil von ihm, sondern der naechste Schlag (ADR-0002) —
 * `pruefeMarsch` stellt sicher, dass sie da ist.
 *
 * Der Dreierruf steht anders: auf seiner Landung (ADR-0004). Der Schlag ist die
 * Landung; die beiden gerollten Dupfe davor gehoeren zur Figur.
 *
 * `Double` ist das Double des Glossars, in ASCII geschrieben.
 */
export type Figur = "Dupfe" | "Schlepp" | "Double" | "Fuenferruf" | "Siebnerruf" | "Dreierruf";

/** Was eine Figur ausmacht, an einer Stelle — Layout und Wiedergabe lesen beide hier. */
export interface Figurmerkmale {
  /** Ob ein Vorschlag in der anderen Hand kurz vor dem Schlag liegt. */
  readonly vorschlag: boolean;
  /**
   * Bei einem Ruf: wie viele Schlaege er zaehlt, die Landung eingerechnet; die
   * Dauer, die er bis zur Landung fuellt — zugleich sein notierter Wert —, und
   * in welcher Hand er landet, gemessen an seiner eigenen.
   */
  readonly ruf?: {
    readonly schlaege: number;
    readonly dauer: Bruch;
    readonly landung: "gleicheHand" | "andereHand";
  };
  /**
   * Bei einem Double: die leise Dupfe in der Hand des Schlags, `vorlauf` (in
   * Ganzen) vor ihm. Ein Notenwert, keine Geste — sie waechst mit dem Tempo. Wie
   * der Vorschlag gehoert sie zur Figur und nimmt im Takt keinen Platz ein; sie
   * darf vor den vorigen Schlag, in den vorigen Takt oder vor den Marsch fallen.
   */
  readonly leiseDupfe?: { readonly vorlauf: Bruch };
  /**
   * Bei einem Dreierruf: wie viele gerollte Dupfe in der anderen Hand vor dem
   * Schlag liegen. Sie nehmen im Takt keinen Platz ein, sondern teilen die
   * Strecke vom vorigen Schlag bis zu diesem in gleiche Teile. Kein `ruf`: der
   * Dreierruf ist selbst seine Landung und braucht keine nach sich.
   */
  readonly gerollteDupfe?: { readonly anzahl: number };
}

export const FIGURMERKMALE: Record<Figur, Figurmerkmale> = {
  Dupfe: { vorschlag: false },
  Schlepp: { vorschlag: true },
  // Ein Schlepp mit einer leisen Dupfe eine Sechzehntel davor.
  Double: { vorschlag: true, leiseDupfe: { vorlauf: bruch(1, 16) } },
  // Der Fuenferruf beginnt mit einem Schlepp und hat darum dessen Vorschlag.
  Fuenferruf: {
    vorschlag: true,
    ruf: { schlaege: 5, dauer: bruch(1, 8), landung: "gleicheHand" },
  },
  // Sechs gerollte Schlaege ohne Schlepp, dann die Landung in der anderen Hand.
  Siebnerruf: {
    vorschlag: false,
    ruf: { schlaege: 7, dauer: bruch(3, 16), landung: "andereHand" },
  },
  // Zwei gerollte Dupfe in der anderen Hand, dann der Schlag als Landung.
  Dreierruf: { vorschlag: false, gerollteDupfe: { anzahl: 2 } },
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
 * Eine Tole: `anzahl` Schlaege des Wertes `einheit` in der Zeit von `statt` —
 * die Quintole sind fuenf Sechzehntel statt vier. Sie dauert `statt` mal
 * `einheit`.
 *
 * Die Schlaege und Pausen in ihr behalten ihren notierten Wert, stehen aber auf
 * ihrer gespielten Position; so lesen Layout und Wiedergabe Positionen wie
 * ueberall. Zu ihr gehoert, was auf einer Position in ihrer Spanne steht.
 */
export interface Tole {
  /** Wo sie beginnt, gespielt, in Ganzen ab Taktbeginn. */
  readonly position: Bruch;
  readonly anzahl: number;
  readonly statt: number;
  /** Der notierte Wert, der gezaehlt wird: 1/16 bei der Quintole. */
  readonly einheit: Bruch;
}

/**
 * Ein Takt: seine geordneten Schlaege und, als eigene Listen daneben, seine
 * Pausen und Tolen. Schlaege und Pausen zusammen fuellen ihn lueckenlos.
 */
export interface Takt {
  readonly schlaege: readonly Schlag[];
  readonly pausen: readonly Pause[];
  readonly tolen: readonly Tole[];
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

/** Wie lange eine Tole gespielt dauert: `statt` mal ihre Einheit. */
export const toleDauer = (tole: Tole): Bruch => multipliziere(bruch(tole.statt, 1), tole.einheit);

const toleEnde = (tole: Tole): Bruch => addiere(tole.position, toleDauer(tole));

/** Ob eine Position in der Spanne einer Tole liegt — ihr Ende gehoert nicht dazu. */
const liegtIn = (position: Bruch, tole: Tole): boolean =>
  vergleiche(position, tole.position) >= 0 && vergleiche(position, toleEnde(tole)) < 0;

/** Die Tole eines Taktes, zu der eine Position gehoert, falls es eine gibt. */
export const toleAn = (takt: Takt, position: Bruch): Tole | undefined =>
  takt.tolen.find((tole) => liegtIn(position, tole));

/**
 * Wie lange ein Schlag oder eine Pause gespielt dauert: der notierte Wert, in
 * einer Tole mit `statt / anzahl` gestreckt oder gestaucht.
 */
const gespielteDauer = (takt: Takt, element: Schlag | Pause): Bruch => {
  const tole = toleAn(takt, element.position);
  return tole ? multipliziere(element.wert, bruch(tole.statt, tole.anzahl)) : element.wert;
};

/**
 * Der erste Schlag oder die erste Pause, die nicht in den Takt passt — vor dem
 * Beginn oder mit ihrer gespielten Dauer ueber das Ende hinaus. `undefined`,
 * wenn der Takt gueltig ist. Ein ueberlaufender Takt ist ein Datenfehler und
 * darf nicht still gezeichnet werden.
 */
export const taktUeberlauf = (takt: Takt, taktart: Taktart): Schlag | Pause | undefined => {
  const laenge = taktLaenge(taktart);
  return elemente(takt).find(
    (element) =>
      vergleiche(element.position, NULL) < 0 ||
      vergleiche(addiere(element.position, gespielteDauer(takt, element)), laenge) > 0,
  );
};

const alsText = (b: Bruch): string => `${b.zaehler}/${b.nenner}`;

const istSchlag = (element: Schlag | Pause): element is Schlag => "figur" in element;

/** Wie ein Schlag oder eine Pause in einer Fehlermeldung heisst. */
const benenne = (element: Schlag | Pause): string => (istSchlag(element) ? element.figur : "Pause");

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
 * Wo die gegebenen Schlaege und Pausen eines Taktes, nach Position geordnet und
 * mit ihrer gespielten Dauer, die Strecke von `beginn` bis `ende` nicht genau
 * fuellen. `undefined`, wenn sie es tun. Der Beginn ist ein Parameter, weil
 * nicht jeder Takt bei 0 anfaengt und eine Tole mitten im Takt; was vor ihm
 * steht, ist eine Ueberlappung.
 *
 * Was ueber `ende` hinausragt, meldet sie nicht: das ist ein Ueberlauf, und
 * `taktUeberlauf` muss vorher gelaufen sein.
 */
const fuellfehler = (
  takt: Takt,
  inhalt: readonly (Schlag | Pause)[],
  beginn: Bruch,
  ende: Bruch,
): Fuellfehler | undefined => {
  const geordnet = [...inhalt].sort((a, b) => vergleiche(a.position, b.position));
  let bisher = beginn;
  for (const element of geordnet) {
    const lage = vergleiche(element.position, bisher);
    if (lage > 0) return { art: "Luecke", stelle: bisher };
    if (lage < 0) return { art: "Ueberlappung", stelle: element.position };
    bisher = addiere(element.position, gespielteDauer(takt, element));
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
 * Eine Tole, die nicht gezeichnet oder gespielt werden kann: eine, die ueber
 * ihren Takt hinausreicht, eine andere ueberlappt oder von ihren Schlaegen und
 * Pausen nicht genau gefuellt wird.
 */
export class UngueltigeToleError extends Error {
  constructor(
    readonly versNummer: number,
    /** Ab 1 gezaehlt; 0 ist der Auftakt. */
    readonly taktNummer: number,
    readonly tole: Tole,
    grund: string,
  ) {
    super(
      `${ort(versNummer, taktNummer)}: ${tole.anzahl}er-Tole auf ` +
        `${alsText(tole.position)} ${grund}`,
    );
    this.name = "UngueltigeToleError";
  }
}

/**
 * Prueft die Tolen eines Taktes: jede liegt in ihm, keine ueberlappt die
 * naechste, und jede fuellen ihre Schlaege und Pausen mit ihrer gespielten
 * Dauer genau von ihrem Beginn bis zu ihrem Ende.
 */
const pruefeTolen = (
  takt: Takt,
  taktart: Taktart,
  versNummer: number,
  taktNummer: number,
): void => {
  const geordnet = [...takt.tolen].sort((a, b) => vergleiche(a.position, b.position));
  let bisher = NULL;
  for (const tole of geordnet) {
    const fehler = (grund: string) => new UngueltigeToleError(versNummer, taktNummer, tole, grund);
    const ende = toleEnde(tole);
    if (vergleiche(tole.position, NULL) < 0 || vergleiche(ende, taktLaenge(taktart)) > 0) {
      throw fehler("reicht ueber den Takt hinaus");
    }
    if (vergleiche(tole.position, bisher) < 0) throw fehler("ueberlappt die Tole davor");
    bisher = ende;

    const inhalt = elemente(takt).filter((e) => liegtIn(e.position, tole));
    const zuLang = inhalt.find(
      (e) => vergleiche(addiere(e.position, gespielteDauer(takt, e)), ende) > 0,
    );
    if (zuLang) throw fehler(`ist zu lang: ${benenne(zuLang)} auf ${alsText(zuLang.position)}`);
    const luecke = fuellfehler(takt, inhalt, tole.position, ende);
    if (luecke) throw fehler(`ist nicht gefuellt: ${luecke.art} auf ${alsText(luecke.stelle)}`);
  }
};

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
 * Ein Ruf, der nicht gezeichnet oder gespielt werden kann: einer ohne gueltige
 * Landung — kein Schlag danach, keiner genau seine Dauer spaeter, einer in der
 * falschen Hand oder einer, der keine Dupfe ist —, oder einer, dessen Wert
 * nicht seine Dauer ist.
 */
export class UngueltigerRufError extends Error {
  constructor(
    readonly versNummer: number,
    /** Ab 1 gezaehlt; 0 ist der Auftakt. */
    readonly taktNummer: number,
    readonly schlag: Schlag,
    grund: string,
  ) {
    super(
      `${ort(versNummer, taktNummer)}: ${schlag.figur} ${schlag.hand} auf ` +
        `${alsText(schlag.position)} ${grund}`,
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
  const luecke = fuellfehler(auftakt, elemente(auftakt), beginn, taktLaenge(taktart));
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
      (schlag) => vergleiche(addiere(schlag.position, gespielteDauer(letzter, schlag)), beginn) > 0,
    );
    if (klingend) {
      throw new UngueltigerAuftaktError(
        versIndex + 1,
        `faellt ${wo} ab ${alsText(beginn)} ueber den Schlag auf ${alsText(klingend.position)}`,
      );
    }
  }
};

/**
 * Ein Schlag mit der Stelle, an der er im Vers steht: `taktIndex` und `index`
 * in dessen Schlaegen, damit das Layout ihn bei sich wiederfindet, statt
 * selbst weiterzuzaehlen.
 */
export interface Schlagstelle {
  readonly schlag: Schlag;
  readonly taktIndex: number;
  readonly index: number;
}

/** Der Schlag nach einem anderen, mit seinem Abstand in Ganzen — auch ueber den Taktstrich. */
export interface Folgeschlag extends Schlagstelle {
  readonly abstand: Bruch;
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

/**
 * Wirft, wenn der Ruf an dieser Stelle nicht seine Dauer als Wert oder keine
 * gueltige Landung hat: den naechsten Schlag, genau seine Dauer spaeter, in der
 * Hand, die er verlangt. Jeder Ruf landet auf einer Dupfe (ADR-0004).
 */
const pruefeLandung = (vers: Vers, versIndex: number, taktIndex: number, index: number): void => {
  const schlag = taktAn(vers, taktIndex)!.schlaege[index]!;
  const ruf = FIGURMERKMALE[schlag.figur].ruf;
  if (!ruf) return;
  const fehler = (grund: string) =>
    new UngueltigerRufError(versIndex + 1, taktIndex + 1, schlag, grund);
  if (vergleiche(schlag.wert, ruf.dauer) !== 0) {
    throw fehler(`hat den Wert ${alsText(schlag.wert)} statt ${alsText(ruf.dauer)}`);
  }
  const hand = ruf.landung === "andereHand" ? andereHand(schlag.hand) : schlag.hand;
  const landung = folgeschlag(vers, taktIndex, index);
  if (
    !landung ||
    vergleiche(landung.abstand, ruf.dauer) !== 0 ||
    landung.schlag.hand !== hand ||
    landung.schlag.figur !== "Dupfe"
  ) {
    const welche = hand === schlag.hand ? "derselben" : "der anderen";
    throw fehler(
      `hat keine Landung auf einer Dupfe ${alsText(ruf.dauer)} spaeter in ${welche} Hand`,
    );
  }
};

/**
 * Was im Vers unmittelbar vor dem `index`-ten Schlag des Taktes `taktIndex`
 * steht, ein Schlag oder eine Pause — im selben Takt oder als letztes des
 * vorigen, vor Takt 1 also im Auftakt. Weiter zurueck muss nicht gesucht
 * werden: jeder Takt ist lueckenlos gefuellt, und ein Auftakt hat Schlaege.
 * `undefined` am Anfang des Verses.
 */
const vorigesElement = (
  vers: Vers,
  taktIndex: number,
  index: number,
): { readonly element: Schlag | Pause; readonly taktIndex: number } | undefined => {
  const takt = taktAn(vers, taktIndex)!;
  const position = takt.schlaege[index]!.position;
  const letztes = (elemente: (Schlag | Pause)[]) =>
    elemente.reduce<Schlag | Pause | undefined>(
      (bisher, e) => (!bisher || vergleiche(e.position, bisher.position) > 0 ? e : bisher),
      undefined,
    );

  const imTakt = letztes(elemente(takt).filter((e) => vergleiche(e.position, position) < 0));
  if (imTakt) return { element: imTakt, taktIndex };
  if (taktIndex === AUFTAKT) return undefined;
  const vorher = taktAn(vers, taktIndex - 1);
  const imVorigen = vorher && letztes(elemente(vorher));
  return imVorigen && { element: imVorigen, taktIndex: taktIndex - 1 };
};

/**
 * Der Schlag unmittelbar vor dem `index`-ten des Taktes `taktIndex`, in
 * geschriebener Reihenfolge — auch im vorigen Takt oder im Auftakt.
 * `undefined`, wenn davor nichts oder eine Pause steht.
 *
 * Die eine Stelle, die sagt, von wo das Zeichen eines Dreierrufs gesetzt wird:
 * `pruefeMarsch` prueft, dass es ihn gibt, das Layout setzt das Zeichen
 * zwischen ihn und die Landung. Die Wiedergabe nimmt stattdessen den Schlag,
 * der zuletzt erklungen ist — bei der Wiederholung ist das der wiederkehrende
 * Auftakt, nicht der geschriebene.
 */
export const vorigerSchlag = (
  vers: Vers,
  taktIndex: number,
  index: number,
): Schlagstelle | undefined => {
  const vorher = vorigesElement(vers, taktIndex, index);
  if (!vorher || !istSchlag(vorher.element)) return undefined;
  const schlag = vorher.element;
  return {
    schlag,
    taktIndex: vorher.taktIndex,
    index: taktAn(vers, vorher.taktIndex)!.schlaege.indexOf(schlag),
  };
};

/**
 * Ein Dreierruf, dessen gerollte Dupfe keinen Anfang haben: kein Schlag vor
 * ihm im Vers, oder eine Pause. Kein Original zeigt einen solchen; wenn eines
 * es tut, wird die Regel gelockert.
 */
export class UngueltigerDreierrufError extends Error {
  constructor(
    readonly versNummer: number,
    /** Ab 1 gezaehlt; 0 ist der Auftakt. */
    readonly taktNummer: number,
    readonly schlag: Schlag,
    grund: string,
  ) {
    super(
      `${ort(versNummer, taktNummer)}: Dreierruf ${schlag.hand} auf ` +
        `${alsText(schlag.position)} ${grund}`,
    );
    this.name = "UngueltigerDreierrufError";
  }
}

/** Wirft, wenn ein Schlag mit gerollten Dupfe keinen Schlag vor sich hat. */
const pruefeGerollteDupfe = (
  vers: Vers,
  versIndex: number,
  taktIndex: number,
  index: number,
): void => {
  const schlag = taktAn(vers, taktIndex)!.schlaege[index]!;
  if (!FIGURMERKMALE[schlag.figur].gerollteDupfe) return;
  const vorher = vorigesElement(vers, taktIndex, index);
  const fehler = (grund: string) =>
    new UngueltigerDreierrufError(versIndex + 1, taktIndex + 1, schlag, grund);
  if (!vorher) throw fehler("hat keinen Schlag vor sich im Vers");
  if (!istSchlag(vorher.element)) throw fehler("folgt auf eine Pause");
};

/**
 * Prueft einen Marsch, bevor er gezeichnet oder gespielt wird: jede Tole liegt
 * in ihrem Takt und ist genau gefuellt, jeder Takt passt in seine Taktart und
 * wird von seinen Schlaegen und Pausen genau gefuellt, ein
 * Auftakt hat seine Form und faellt beim Wiedererklingen nur ueber Pausen,
 * jeder Ruf hat seine Landung auf einer Dupfe, und jeder Dreierruf hat einen
 * Schlag vor sich. Wirft beim ersten Fehler.
 */
export const pruefeMarsch = (marsch: Marsch): void => {
  marsch.verse.forEach((vers, versIndex) => {
    if (vers.auftakt) {
      pruefeTolen(vers.auftakt, vers.taktart, versIndex + 1, 0);
      pruefeAuftaktForm(vers.auftakt, vers.taktart, versIndex + 1);
    }
    vers.takte.forEach((takt, taktIndex) => {
      // Die Tolen zuerst: eine falsch gefuellte Tole soll als solche auffallen,
      // nicht als Luecke oder Ueberlauf des Taktes.
      pruefeTolen(takt, vers.taktart, versIndex + 1, taktIndex + 1);
      const ueberlauf = taktUeberlauf(takt, vers.taktart);
      if (ueberlauf) {
        throw new UngueltigerTaktError(versIndex + 1, taktIndex + 1, ueberlauf, vers.taktart);
      }
      const fehler = fuellfehler(takt, elemente(takt), NULL, taktLaenge(vers.taktart));
      if (fehler) throw new LueckenhafterTaktError(versIndex + 1, taktIndex + 1, fehler);
    });
    // Erst wenn alle Takte stehen: der Auftakt kehrt ueber den letzten Takt
    // wieder, und ein Ruf im Auftakt landet in Takt 1.
    if (vers.auftakt) pruefeAuftaktWiederkehr(marsch, versIndex);
    [AUFTAKT, ...vers.takte.keys()].forEach((taktIndex) =>
      taktAn(vers, taktIndex)?.schlaege.forEach((_, index) => {
        pruefeLandung(vers, versIndex, taktIndex, index);
        pruefeGerollteDupfe(vers, versIndex, taktIndex, index);
      }),
    );
  });
};
