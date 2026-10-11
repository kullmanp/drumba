import type { Anschlag } from "./abspielplan";

/**
 * Der Audio-Adapter: legt einen Abspielplan auf einen `AudioContext`. Hier wird
 * nichts gerechnet ausser Startzeit plus Zeit aus dem Plan — alles Timing steht
 * im Abspielplan. Ungetestet; geprüft nach Gehör.
 *
 * Der Klang ist ein kurzer gefilterter Rauschstoss, für beide Hände gleich. Die
 * Hand liegt trotzdem auf jedem Anschlag, damit sie später hörbar werden kann.
 */

/**
 * Die Zeit vom Druck auf Play bis zum ersten Anschlag. Ein Vorschlag am Anfang
 * liegt vor der Zeit null; der Anlauf zählt ab ihm, damit er nicht in der
 * Vergangenheit liegt.
 */
const ANLAUF = 0.1;

/** Wie lange ein Anschlag ausklingt, in Sekunden. */
const AUSKLANG = 0.12;
/** Mitte des Bandpasses: das Schnarren des Fells, nicht der Kessel. */
const FILTER_FREQUENZ = 2200;
/** Breite des Bandpasses: eher breit, damit es rauscht und nicht pfeift. */
const FILTER_GÜTE = 0.8;
const SPITZENPEGEL = 0.8;

export interface Wiedergabe {
  /** Beendet den Klang sofort. */
  readonly stoppe: () => void;
}

const rauschen = (kontext: AudioContext): AudioBuffer => {
  const länge = Math.ceil(kontext.sampleRate * AUSKLANG);
  const puffer = kontext.createBuffer(1, länge, kontext.sampleRate);
  const daten = puffer.getChannelData(0);
  for (let i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;
  return puffer;
};

/**
 * Spielt den Plan ab. `beiEnde` wird gerufen, wenn der letzte Anschlag
 * verklungen ist — nicht nach `stoppe`.
 */
export const spiele = (plan: readonly Anschlag[], beiEnde: () => void): Wiedergabe => {
  const kontext = new AudioContext();
  const puffer = rauschen(kontext);
  const start = kontext.currentTime + ANLAUF - Math.min(0, plan[0]?.zeit ?? 0);
  let gestoppt = false;

  const quellen = plan.map((anschlag) => {
    const zeit = start + anschlag.zeit;

    const quelle = kontext.createBufferSource();
    quelle.buffer = puffer;

    const filter = kontext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = FILTER_FREQUENZ;
    filter.Q.value = FILTER_GÜTE;

    const pegel = kontext.createGain();
    pegel.gain.setValueAtTime(SPITZENPEGEL * anschlag.lautstärke, zeit);
    pegel.gain.exponentialRampToValueAtTime(0.001, zeit + AUSKLANG);

    quelle.connect(filter).connect(pegel).connect(kontext.destination);
    quelle.start(zeit);
    quelle.stop(zeit + AUSKLANG);
    return quelle;
  });

  /** Schliesst den Kontext genau einmal; `true`, wenn es diesmal geschah. */
  const schliesse = (): boolean => {
    if (gestoppt) return false;
    gestoppt = true;
    void kontext.close();
    return true;
  };
  const ende = () => {
    if (schliesse()) beiEnde();
  };
  // Der Plan ist nach Zeit geordnet: der letzte Anschlag klingt zuletzt aus.
  const letzte = quellen.at(-1);
  if (letzte) letzte.onended = ende;
  else queueMicrotask(ende);

  return { stoppe: () => void schliesse() };
};
