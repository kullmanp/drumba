import { useEffect, useRef, useState } from "react";
import { uebungsmarsch } from "./beispiel/uebungsmarsch";
import { abspielplan } from "./playback/abspielplan";
import type { Starttakt } from "./model/starttakt";
import type { Wiedergabe } from "./playback/wiedergabe";
import { spiele } from "./playback/wiedergabe";
import { Zuendstoffnoten } from "./render/zuendstoffnoten";

/** Das Tempo, mit dem die Seite oeffnet, in Zaehlzeiten pro Minute. */
const START_TEMPO = "100";

export const App = () => {
  const [tempoEingabe, setTempoEingabe] = useState(START_TEMPO);
  const [spielt, setSpielt] = useState(false);
  const [starttakt, setStarttakt] = useState<Starttakt | undefined>(undefined);
  const wiedergabe = useRef<Wiedergabe | null>(null);

  const tempo = Number(tempoEingabe);
  const tempoGueltig = tempoEingabe.trim() !== "" && Number.isFinite(tempo) && tempo > 0;

  const abspielen = () => {
    wiedergabe.current = spiele(abspielplan(uebungsmarsch, tempo, starttakt), () =>
      setSpielt(false),
    );
    setSpielt(true);
  };

  // Ein Klick auf den Starttakt hebt ihn auf, einer auf einen anderen Takt setzt
  // ihn dorthin. Waehrend der Wiedergabe verschiebt er nur die Markierung; sie
  // gilt ab dem naechsten Play, wie ein neues Tempo.
  const waehleTakt = (takt: Starttakt) =>
    setStarttakt((bisher) =>
      bisher?.versIndex === takt.versIndex && bisher.taktIndex === takt.taktIndex
        ? undefined
        : takt,
    );

  const anhalten = () => {
    wiedergabe.current?.stoppe();
    wiedergabe.current = null;
    setSpielt(false);
  };

  useEffect(() => () => wiedergabe.current?.stoppe(), []);

  return (
    <main>
      <div className="steuerung">
        <button type="button" onClick={abspielen} disabled={spielt || !tempoGueltig}>
          Play
        </button>
        <button type="button" onClick={anhalten} disabled={!spielt}>
          Stop
        </button>
        <label>
          Tempo{" "}
          <input
            type="number"
            min={1}
            value={tempoEingabe}
            onChange={(e) => setTempoEingabe(e.target.value)}
          />{" "}
          Zaehlzeiten pro Minute
        </label>
      </div>
      <Zuendstoffnoten marsch={uebungsmarsch} starttakt={starttakt} waehleTakt={waehleTakt} />
    </main>
  );
};
