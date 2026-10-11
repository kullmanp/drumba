import type { Bruch } from "../model/bruch";
import { addiere, alsZahl, dividiere, NULL } from "../model/bruch";
import type { Hand, Marsch } from "../model/marsch";
import {
  andereHand,
  taktLänge,
  taktÜberlauf,
  UngültigerTaktError,
  zählzeit,
} from "../model/marsch";

/**
 * Der Abspielplan: ein Marsch als flache, zeitlich geordnete Liste von
 * Anschlägen. Hier steckt alles Timing der Wiedergabe; der Audio-Adapter legt
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
  /** 1 ist volle Lautstärke. */
  readonly lautstärke: number;
}

/**
 * Wie lange der Vorschlag vor seinem Hauptschlag klingt, in Sekunden. Eine
 * Geste, kein Notenwert: der Abstand wächst und schrumpft nicht mit dem Tempo.
 * Nach Gehör gewählt.
 */
export const VORSCHLAG_VORLAUF = 0.03;

/** Der Vorschlag klingt deutlich leiser als der Hauptschlag. Nach Gehör gewählt. */
const VORSCHLAG_LAUTSTÄRKE = 0.5;

/**
 * Der Abspielplan eines Marsches. `tempo` zählt Zählzeiten pro Minute, in jeder
 * Taktart: eine punktierte Viertel in 6/8 dauert so lang wie eine Viertel in
 * 2/4. Gerechnet wird in exakten Zählzeiten, erst ganz am Ende in Sekunden.
 */
export const abspielplan = (marsch: Marsch, tempo: number): Anschlag[] => {
  // Ein überlaufender Takt ist ein Datenfehler und wird nicht still gespielt.
  marsch.verse.forEach((vers, versIndex) => {
    vers.takte.forEach((takt, taktIndex) => {
      const überlauf = taktÜberlauf(takt, vers.taktart);
      if (überlauf) {
        throw new UngültigerTaktError(versIndex + 1, taktIndex + 1, überlauf, vers.taktart);
      }
    });
  });

  const sekunden = (zählzeiten: Bruch): number => (alsZahl(zählzeiten) * 60) / tempo;
  const anschläge: Anschlag[] = [];
  let taktbeginn = NULL;
  for (const vers of marsch.verse) {
    const zählzeitLänge = zählzeit(vers.taktart);
    // Wiederholungen werden ausgerollt; Voltas und Schluss gibt es noch nicht.
    const takte = Array.from({ length: vers.wiederholungen }, () => vers.takte).flat();
    for (const takt of takte) {
      for (const schlag of takt.schlaege) {
        const zeit = sekunden(addiere(taktbeginn, dividiere(schlag.position, zählzeitLänge)));
        if (schlag.figur === "Schlepp") {
          anschläge.push({
            zeit: zeit - VORSCHLAG_VORLAUF,
            hand: andereHand(schlag.hand),
            lautstärke: VORSCHLAG_LAUTSTÄRKE,
          });
        }
        anschläge.push({ zeit, hand: schlag.hand, lautstärke: 1 });
      }
      taktbeginn = addiere(taktbeginn, dividiere(taktLänge(vers.taktart), zählzeitLänge));
    }
  }
  // Bei hohem Tempo fällt ein Vorschlag vor den vorigen Schlag.
  return anschläge.sort((a, b) => a.zeit - b.zeit);
};
