import type { Bruch } from "../model/bruch";
import {
  addiere,
  alsZahl,
  bruch,
  dividiere,
  multipliziere,
  NULL,
  subtrahiere,
} from "../model/bruch";
import type { Hand, Marsch, Schlag, Takt, Taktart } from "../model/marsch";
import {
  andereHand,
  auftaktBeginn,
  FIGURMERKMALE,
  FUENFERRUF_DAUER,
  pruefeMarsch,
  taktLaenge,
  zaehlzeit,
} from "../model/marsch";

/**
 * Der Abspielplan: ein Marsch als flache, zeitlich geordnete Liste von
 * Anschlaegen. Hier steckt alles Timing der Wiedergabe; der Audio-Adapter legt
 * die Zeiten nur noch auf seine Startzeit.
 */

/**
 * Ein Anschlag: ein Ton der Wiedergabe. Kein Schlag — ein Schlepp ergibt zwei.
 * Ein Begriff der Implementierung, nicht der Tradition, daher nicht im Glossar.
 */
export interface Anschlag {
  /** Sekunden ab Beginn des Marsches. Ein Vorschlag am Anfang liegt davor. */
  readonly zeit: number;
  readonly hand: Hand;
  /** 1 ist volle Lautstaerke. */
  readonly lautstaerke: number;
}

/**
 * Wie lange der Vorschlag vor seinem Hauptschlag klingt, in Sekunden. Eine
 * Geste, kein Notenwert: der Abstand waechst und schrumpft nicht mit dem Tempo.
 * Nach Gehoer gewaehlt.
 */
export const VORSCHLAG_VORLAUF = 0.03;

/** Der Vorschlag klingt deutlich leiser als der Hauptschlag. Nach Gehoer gewaehlt. */
const VORSCHLAG_LAUTSTAERKE = 0.3;

/**
 * Die leise Dupfe eines Doubles: lauter als der Vorschlag, leiser als der
 * Hauptschlag. Nach Gehoer gewaehlt.
 */
const LEISE_DUPFE_LAUTSTAERKE = 0.5;

/**
 * Die Schlaege, die eine Figur klingen laesst: Hand und Versatz in Ganzen ab
 * ihrer Position. Der Vorschlag eines Schlepps gehoert nicht dazu — sein Abstand
 * ist eine Geste in Sekunden, kein Notenwert.
 *
 * Der Fuenferruf spielt hier nur seine ersten vier Schlaege, gleichmaessig ueber
 * seine Achtel verteilt; der fuenfte ist die Landung, ein eigener Schlag.
 */
const figurSchlaege = (schlag: Schlag): { hand: Hand; versatz: Bruch }[] => {
  if (schlag.figur !== "Fuenferruf") return [{ hand: schlag.hand, versatz: NULL }];
  const andere = andereHand(schlag.hand);
  return [schlag.hand, schlag.hand, andere, andere].map((hand, i) => ({
    hand,
    versatz: multipliziere(FUENFERRUF_DAUER, bruch(i, 4)),
  }));
};

/**
 * Der Abspielplan eines Marsches. `tempo` zaehlt Zaehlzeiten pro Minute, in jeder
 * Taktart: eine punktierte Viertel in 6/8 dauert so lang wie eine Viertel in
 * 2/4. Gerechnet wird in exakten Zaehlzeiten, erst ganz am Ende in Sekunden.
 *
 * Ein Auftakt ist das Ende eines Taktes (ADR-0003) und erklingt bei jeder
 * Ankunft in Takt 1 seines Verses, so dass er genau dort endet, wo Takt 1
 * beginnt: am Anfang des Marsches vor allem anderen — der Marsch beginnt mit
 * ihm —, bei der Wiederholung und beim Wechsel aus dem vorigen Vers ueber das
 * Ende von dessen letztem Takt, das dort nur Pausen haelt.
 */
export const abspielplan = (marsch: Marsch, tempo: number): Anschlag[] => {
  // Ein ueberlaufender Takt oder ein Ruf ohne Landung wird nicht still gespielt.
  pruefeMarsch(marsch);

  const sekunden = (zaehlzeiten: Bruch): number => (alsZahl(zaehlzeiten) * 60) / tempo;
  const anschlaege: Anschlag[] = [];

  /** Spielt die Schlaege eines Taktes, der zur Zeit `beginn` (in Zaehlzeiten) beginnt. */
  const spieleTakt = (takt: Takt, taktart: Taktart, beginn: Bruch): void => {
    const zaehlzeitLaenge = zaehlzeit(taktart);
    for (const schlag of takt.schlaege) {
      const zeitpunkt = (versatz: Bruch): number =>
        sekunden(addiere(beginn, dividiere(addiere(schlag.position, versatz), zaehlzeitLaenge)));
      const merkmale = FIGURMERKMALE[schlag.figur];
      if (merkmale.leiseDupfe) {
        anschlaege.push({
          zeit: zeitpunkt(subtrahiere(NULL, merkmale.leiseDupfe.vorlauf)),
          hand: schlag.hand,
          lautstaerke: LEISE_DUPFE_LAUTSTAERKE,
        });
      }
      if (merkmale.vorschlag) {
        anschlaege.push({
          zeit: zeitpunkt(NULL) - VORSCHLAG_VORLAUF,
          hand: andereHand(schlag.hand),
          lautstaerke: VORSCHLAG_LAUTSTAERKE,
        });
      }
      for (const { hand, versatz } of figurSchlaege(schlag)) {
        anschlaege.push({ zeit: zeitpunkt(versatz), hand, lautstaerke: 1 });
      }
    }
  };

  // Die Zeit 0 ist der Beginn des ersten Auftakts, falls der erste Vers einen hat.
  const ersterVers = marsch.verse[0];
  let taktbeginn =
    ersterVers?.auftakt === undefined
      ? NULL
      : dividiere(
          subtrahiere(taktLaenge(ersterVers.taktart), auftaktBeginn(ersterVers.auftakt)),
          zaehlzeit(ersterVers.taktart),
        );
  for (const vers of marsch.verse) {
    const taktZaehlzeiten = dividiere(taktLaenge(vers.taktart), zaehlzeit(vers.taktart));
    // Wiederholungen werden ausgerollt; Voltas und Schluss gibt es noch nicht.
    for (let durchgang = 0; durchgang < vers.wiederholungen; durchgang++) {
      // Der Auftakt steht auf den Positionen eines vollen Taktes, der genau dort
      // endet, wo Takt 1 beginnt.
      if (vers.auftakt) {
        spieleTakt(vers.auftakt, vers.taktart, subtrahiere(taktbeginn, taktZaehlzeiten));
      }
      for (const takt of vers.takte) {
        spieleTakt(takt, vers.taktart, taktbeginn);
        taktbeginn = addiere(taktbeginn, taktZaehlzeiten);
      }
    }
  }
  // Bei hohem Tempo faellt ein Vorschlag vor den vorigen Schlag.
  return anschlaege.sort((a, b) => a.zeit - b.zeit);
};
