import { bruch } from "../model/bruch";
import type { Figur, Hand, Marsch, Pause, Schlag, Takt } from "../model/marsch";
import { andereHand } from "../model/marsch";

/**
 * Ein von Hand gebauter Marsch als Anschauungsmaterial: keine Uebertragung aus
 * dem Repertoire, sondern eine Uebung, die alle Figuren des Modells zeigt —
 * Dupfe, Schlepp, Double, Fuenferruf mit und ohne Schlepp, Siebnerruf und
 * Dreierruf — auf beiden Haenden, in 6/8 und in 2/4. Ein Fuenferruf landet im
 * eigenen Takt, einer ueber den Taktstrich und einer aus dem Auftakt in Takt 1.
 *
 * Der 2/4-Vers ist ZicZac, Vers 1, ganz: sein Auftakt kehrt bei der
 * Wiederholung und am Ende des 6/8-Verses ueber eine Pause wieder. Takt 1
 * mischt Achtel und Sechzehntel unter einem Balken, mit Balkenstummeln; Takt 2
 * stellt eine Achtelpause vor drei Doubles; Takt 3 hat eine Quintole und den
 * Tagwachtstreich, dessen zweiter Dreierruf auf Takt 4 landet; Takt 4 einen
 * Siebnerruf; Takt 5 eine Triole, die nur einen Teil ihrer Gruppe deckt;
 * Takt 6 einen freien Fuenferruf in Takt 7, der einen Fuenferruf ohne Schlepp
 * hat; Takt 8 endet auf einer Viertelpause.
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

const pause = (position: readonly [number, number], wert: readonly [number, number]): Pause => ({
  position: bruch(position[0], position[1]),
  wert: bruch(wert[0], wert[1]),
});

/** Gleich lange Schlaege ab Position 0, abwechselnd ab `beginn`. */
const wechselnd = (figuren: readonly Figur[], beginn: Hand, nenner: number): Takt => ({
  schlaege: figuren.map((figur, i) =>
    schlag(figur, i % 2 === 0 ? beginn : andereHand(beginn), [i, nenner], [1, nenner]),
  ),
  pausen: [],
  tolen: [],
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
          pausen: [],
          tolen: [],
        },
        // Punktierte Viertel ueber die erste Zaehlzeit, dann drei Achtel.
        {
          schlaege: [
            schlag("Schlepp", "rechts", [0, 1], [3, 8]),
            schlag("Dupfe", "links", [3, 8], [1, 8]),
            schlag("Dupfe", "rechts", [4, 8], [1, 8]),
            schlag("Dupfe", "links", [5, 8], [1, 8]),
          ],
          pausen: [],
          tolen: [],
        },
        // Zwei punktierte Viertel — ohne Balken.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [3, 8]),
            schlag("Schlepp", "links", [3, 8], [3, 8]),
          ],
          pausen: [],
          tolen: [],
        },
        // Punktierte Viertel, Achtel, Viertelpause: der Vers endet auf einer Pause,
        // ueber die der Auftakt des naechsten Verses faellt.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [3, 8]),
            schlag("Dupfe", "links", [3, 8], [1, 8]),
          ],
          pausen: [pause([1, 2], [1, 4])],
          tolen: [],
        },
      ],
    },
    {
      taktart: { zaehler: 2, nenner: 4 },
      wiederholungen: 2,
      // ZicZac, Vers 1: ein freier Fuenferruf auf der letzten Achtel vor dem
      // ersten Taktstrich, der auf Takt 1 landet.
      auftakt: {
        schlaege: [schlag("Fuenferruf", "rechts", [3, 8], [1, 8])],
        pausen: [],
        tolen: [],
      },
      takte: [
        // ZicZac, Vers 1, Takt 1: Achtel, Sechzehntel, Sechzehntel | Sechzehntel,
        // Achtel, Sechzehntel — der zweite Balken nur unter den Sechzehnteln,
        // die einzelnen mit Stummeln nach innen.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [1, 8]),
            schlag("Schlepp", "links", [1, 8], [1, 16]),
            schlag("Dupfe", "links", [3, 16], [1, 16]),
            schlag("Dupfe", "rechts", [1, 4], [1, 16]),
            schlag("Dupfe", "links", [5, 16], [1, 8]),
            schlag("Schlepp", "rechts", [7, 16], [1, 16]),
          ],
          pausen: [],
          tolen: [],
        },
        // ZicZac, Vers 1, Takt 2: Achtelpause, dann drei Doubles als Achtel — das
        // erste allein auf seiner Zaehlzeit mit Fahne, die beiden anderen gebalkt.
        {
          schlaege: [
            schlag("Double", "links", [1, 8], [1, 8]),
            schlag("Double", "rechts", [1, 4], [1, 8]),
            schlag("Double", "links", [3, 8], [1, 8]),
          ],
          pausen: [pause([0, 1], [1, 8])],
          tolen: [],
        },
        // ZicZac, Vers 1, Takt 3: vier Sechzehntel, dann eine Quintole — Achtel,
        // Sechzehntel, Achtel in der Zeit von vier Sechzehnteln, auf ihren
        // gespielten Positionen. Die Sechzehntel ist ein Dreierruf links: mit
        // der Achtel danach und dem Dreierruf rechts auf dem naechsten
        // Taktbeginn ein Tagwachtstreich.
        {
          schlaege: [
            schlag("Double", "rechts", [0, 1], [1, 16]),
            schlag("Dupfe", "links", [1, 16], [1, 16]),
            schlag("Dupfe", "rechts", [1, 8], [1, 16]),
            schlag("Dupfe", "rechts", [3, 16], [1, 16]),
            schlag("Dupfe", "links", [1, 4], [1, 8]),
            schlag("Dreierruf", "links", [7, 20], [1, 16]),
            schlag("Dupfe", "rechts", [2, 5], [1, 8]),
          ],
          pausen: [],
          tolen: [{ position: bruch(1, 4), anzahl: 5, statt: 4, einheit: bruch(1, 16) }],
        },
        // ZicZac, Vers 1, Takt 4: der Dreierruf rechts als Landung des
        // Tagwachtstreichs — sein Zeichen steht vor dem Taktstrich —, dann ein
        // freier Siebnerruf links, der rechts auf der zweiten Zaehlzeit landet.
        {
          schlaege: [
            schlag("Dreierruf", "rechts", [0, 1], [1, 16]),
            schlag("Siebnerruf", "links", [1, 16], [3, 16]),
            schlag("Dupfe", "rechts", [1, 4], [1, 8]),
            schlag("Dupfe", "links", [3, 8], [1, 8]),
          ],
          pausen: [],
          tolen: [],
        },
        // ZicZac, Vers 1, Takt 5: die erste Zaehlzeit wie in Takt 1, die zweite
        // eine Triole aus drei Sechzehnteln, dann eine Achtel ausserhalb von ihr.
        {
          schlaege: [
            schlag("Schlepp", "rechts", [0, 1], [1, 8]),
            schlag("Schlepp", "links", [1, 8], [1, 16]),
            schlag("Dupfe", "links", [3, 16], [1, 16]),
            schlag("Dupfe", "rechts", [1, 4], [1, 16]),
            schlag("Dupfe", "links", [7, 24], [1, 16]),
            schlag("Dupfe", "rechts", [1, 3], [1, 16]),
            schlag("Dupfe", "links", [3, 8], [1, 8]),
          ],
          pausen: [],
          tolen: [{ position: bruch(1, 4), anzahl: 3, statt: 2, einheit: bruch(1, 16) }],
        },
        // ZicZac, Vers 1, Takt 6: vier Sechzehntel, ein Schlepp, dann ein freier
        // Fuenferruf, der auf Takt 7 landet. Der Schlepp wird mit dem Wert des
        // Rufs als Viertel gezeichnet.
        {
          schlaege: [
            schlag("Schlepp", "rechts", [0, 1], [1, 16]),
            schlag("Dupfe", "links", [1, 16], [1, 16]),
            schlag("Dupfe", "rechts", [1, 8], [1, 16]),
            schlag("Schlepp", "links", [3, 16], [1, 16]),
            schlag("Schlepp", "rechts", [1, 4], [1, 8]),
            schlag("Fuenferruf", "rechts", [3, 8], [1, 8]),
          ],
          pausen: [],
          tolen: [],
        },
        // ZicZac, Vers 1, Takt 7 (gelesen am Ende von Vers 3): die Landung des
        // Fuenferrufs, ein freier Fuenferruf ohne Schlepp links, der links landet,
        // dann Sechzehntel.
        {
          schlaege: [
            schlag("Dupfe", "rechts", [0, 1], [1, 16]),
            schlag("FuenferrufOhneSchlepp", "links", [1, 16], [1, 16]),
            schlag("Dupfe", "links", [1, 8], [1, 16]),
            schlag("Dupfe", "rechts", [3, 16], [1, 16]),
            schlag("Dupfe", "links", [1, 4], [1, 16]),
            schlag("Dupfe", "rechts", [5, 16], [1, 16]),
            schlag("Schlepp", "rechts", [3, 8], [1, 16]),
            schlag("Dupfe", "links", [7, 16], [1, 16]),
          ],
          pausen: [],
          tolen: [],
        },
        // ZicZac, Vers 1, Takt 8: Viertel und Viertelpause.
        {
          schlaege: [schlag("Dupfe", "rechts", [0, 1], [1, 4])],
          pausen: [pause([1, 4], [1, 4])],
          tolen: [],
        },
      ],
    },
  ],
};
