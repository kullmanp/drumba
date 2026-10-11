import { useEffect, useRef, useState } from "react";
import { übungsmarsch } from "./beispiel/uebungsmarsch";
import { abspielplan } from "./playback/abspielplan";
import type { Wiedergabe } from "./playback/wiedergabe";
import { spiele } from "./playback/wiedergabe";
import { Zündstoffnoten } from "./render/zuendstoffnoten";

/** Das Tempo, mit dem die Seite öffnet, in Zählzeiten pro Minute. */
const START_TEMPO = "100";

export const App = () => {
  const [tempoEingabe, setTempoEingabe] = useState(START_TEMPO);
  const [spielt, setSpielt] = useState(false);
  const wiedergabe = useRef<Wiedergabe | null>(null);

  const tempo = Number(tempoEingabe);
  const tempoGültig = tempoEingabe.trim() !== "" && Number.isFinite(tempo) && tempo > 0;

  const abspielen = () => {
    wiedergabe.current = spiele(abspielplan(übungsmarsch, tempo), () => setSpielt(false));
    setSpielt(true);
  };

  const anhalten = () => {
    wiedergabe.current?.stoppe();
    wiedergabe.current = null;
    setSpielt(false);
  };

  useEffect(() => () => wiedergabe.current?.stoppe(), []);

  return (
    <main>
      <div className="steuerung">
        <button type="button" onClick={abspielen} disabled={spielt || !tempoGültig}>
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
          Zählzeiten pro Minute
        </label>
      </div>
      <Zündstoffnoten marsch={übungsmarsch} />
    </main>
  );
};
