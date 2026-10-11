import type { Marsch } from "./marsch";

/**
 * Der Starttakt: der Takt, ab dem die Wiedergabe beginnt und den die Partitur
 * markiert. Eine Einstellung beim Abspielen und Zeichnen, kein Teil des
 * Marsches — und ein Begriff der Implementierung, nicht der Tradition, daher
 * nicht im Glossar.
 *
 * Eine Stelle: Vers und Takt, beide ab 0 gezaehlt. Der Auftakt ist nie
 * Starttakt; wer ab Takt 1 spielt, hoert ihn ohnehin zuerst.
 */
export interface Starttakt {
  readonly versIndex: number;
  readonly taktIndex: number;
}

/** Ein Starttakt, den es im Marsch nicht gibt. Er wird nicht still uebergangen. */
export class UnbekannterStarttaktError extends Error {
  constructor(readonly starttakt: Starttakt) {
    super(
      `Vers ${starttakt.versIndex + 1}, Takt ${starttakt.taktIndex + 1} gibt es im Marsch ` +
        `nicht und kann kein Starttakt sein`,
    );
    this.name = "UnbekannterStarttaktError";
  }
}

/** Wirft, wenn der Starttakt nicht auf einen Takt des Marsches zeigt. */
export const pruefeStarttakt = (marsch: Marsch, starttakt: Starttakt): void => {
  const vers = marsch.verse[starttakt.versIndex];
  if (!vers || vers.takte[starttakt.taktIndex] === undefined) {
    throw new UnbekannterStarttaktError(starttakt);
  }
};
