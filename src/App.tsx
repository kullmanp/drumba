import { uebungsmarsch } from "./beispiel/uebungsmarsch";
import { Zündstoffnoten } from "./render/zuendstoffnoten";

export const App = () => (
  <main>
    <Zündstoffnoten marsch={uebungsmarsch} />
  </main>
);
