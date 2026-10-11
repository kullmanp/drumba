import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Schlag, Takt } from "../model/marsch";
import { andereHand } from "../model/marsch";

/**
 * Ein von Hand gebauter Marsch als Anschauungsmaterial: keine Uebertragung aus
 * dem Repertoire, sondern eine Uebung, die alle Figuren des Modells zeigt —
 * Dupfe, Schlepp und Fuenferruf — auf beiden Haenden, in 6/8 und in 2/4. Ein
 * Fuenferruf landet im eigenen Takt, einer ueber den Taktstrich.
 *
 * Die Balkengruppen sind bewusst durchweg gleichwertig: Balkenstummel fuer eine
 * gemischte Gruppe gibt es noch nicht, und das Layout wirft, statt sie falsch
 * zu zeichnen.
 */

const schlag = (
  figur: Figur,
  hand: Hand,
  position: readonly [number, number],
  wert: readonly [number, number],
): Schlag => ({
  figur,
  hand,
  position: bruch(position[0], position[1]),
  wert: bruch(wert[0], wert[1]),
});

/** Gleich lange Schlaege ab Position 0, abwechselnd ab `beginn`. */
const wechselnd = (figuren: readonly Figur[], beginn: Hand, nenner: number): Takt => ({
  schlaege: figuren.map((figur, i) =>
    schlag(figur, i % 2 === 0 ? beginn : andereHand(beginn), [i, nenner], [1, nenner]),
  ),
});

export const uebungsmarsch: Marsch = {
  titel: "Uebungsmarsch",
  verse: [
    {
      taktart: { zaehler: 6, nenner: 8 },
      wiederholungen: 2,
      takte: [
        // Sechs Achtel — zwei Balkengruppen zu drei.
        wechselnd(["Dupfe", "Dupfe", "Dupfe", "Dupfe", "Dupfe", "Dupfe"], "rechts", 8),
        // Schlepp auf jede Zaehlzeit.
        wechselnd(["Schlepp", "Dupfe", "Dupfe", "Schlepp", "Dupfe", "Dupfe"], "rechts", 8),
        // Ein Fuenferruf auf jede Zaehlzeit, jeder mit seiner Landung im Takt.
        {
          schlaege: [
            schlag("Fuenferruf", "rechts", [0, 1], [1, 8]),
            schlag("Dupfe", "rechts", [1, 8], [1, 8]),
            schlag("Dupfe", "links", [2, 8], [1, 8]),
            schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
            schlag("Dupfe", "rechts", [4, 8], [1, 8]),
            schlag("Dupfe", "links", [5, 8], [1, 8]),
          ],
        },
        // Punktierte Viertel ueber die erste Zaehlzeit, dann drei Achtel.
        {
          schlaege: [
            schlag("Schlepp", "rechts", [0, 1], [3, 8]),
            schlag("Dupfe", "links", [3, 8], [1, 8]),
            schlag("Dupfe", "rechts", [4, 8], [1, 8]),
            schlag("Dupfe", "links", [5, 8], [1, 8]),
          ],
        },
        // Zwei punktierte Viertel — ohne Balken.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [3, 8]),
            schlag("Schlepp", "links", [3, 8], [3, 8]),
          ],
        },
      ],
    },
    {
      taktart: { zaehler: 2, nenner: 4 },
      wiederholungen: 1,
      takte: [
        // Acht Sechzehntel — eine Balkengruppe je Viertel.
        wechselnd(
          Array.from({ length: 8 }, () => "Dupfe" as Figur),
          "rechts",
          16,
        ),
        // Vier Achtel; der Fuenferruf auf der letzten landet auf dem naechsten Taktbeginn.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [1, 8]),
            schlag("Dupfe", "links", [1, 8], [1, 8]),
            schlag("Dupfe", "links", [2, 8], [1, 8]),
            schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
          ],
        },
        // Zwei Viertel — ohne Balken, der Schlepp diesmal auf der linken Hand.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [1, 4]),
            schlag("Schlepp", "links", [1, 4], [1, 4]),
          ],
        },
      ],
    },
  ],
};
