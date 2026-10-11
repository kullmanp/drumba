import type { Bruch } from "../model/bruch";
import { addiere, alsZahl, bruch, dividiere, multipliziere, NULL } from "../model/bruch";
import type { Hand, Marsch, Schlag } from "../model/marsch";
import {
  andereHand,
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
const VORSCHLAG_LAUTSTAERKE = 0.5;

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
 */
export const abspielplan = (marsch: Marsch, tempo: number): Anschlag[] => {
  // Ein ueberlaufender Takt oder ein Ruf ohne Landung wird nicht still gespielt.
  pruefeMarsch(marsch);

  const sekunden = (zaehlzeiten: Bruch): number => (alsZahl(zaehlzeiten) * 60) / tempo;
  const anschlaege: Anschlag[] = [];
  let taktbeginn = NULL;
  for (const vers of marsch.verse) {
    const zaehlzeitLaenge = zaehlzeit(vers.taktart);
    // Wiederholungen werden ausgerollt; Voltas und Schluss gibt es noch nicht.
    const takte = Array.from({ length: vers.wiederholungen }, () => vers.takte).flat();
    for (const takt of takte) {
      for (const schlag of takt.schlaege) {
        const zeitpunkt = (versatz: Bruch): number =>
          sekunden(
            addiere(taktbeginn, dividiere(addiere(schlag.position, versatz), zaehlzeitLaenge)),
          );
        if (FIGURMERKMALE[schlag.figur].vorschlag) {
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
      taktbeginn = addiere(taktbeginn, dividiere(taktLaenge(vers.taktart), zaehlzeitLaenge));
    }
  }
  // Bei hohem Tempo faellt ein Vorschlag vor den vorigen Schlag.
  return anschlaege.sort((a, b) => a.zeit - b.zeit);
};
