import type { Glyph } from "../layout/layout";
import { layout } from "../layout/layout";
import type { Marsch } from "../model/marsch";

/**
 * Der SVG-Renderer: eine stumpfe Abbildung platzierter Glyphen auf
 * SVG-Primitive. Hier wird nichts entschieden — jede Koordinate kommt aus dem
 * Layout, und der einzige Massstab ist `skalierung`. Insbesondere waehlt der
 * Renderer keine Hoehen: auf welcher Seite der Notenlinie ein Notenkopf steht,
 * sagt das Layout, denn daran liest man die Hand.
 */

/**
 * Strichstaerken und die innere Form einzelner Zeichen. Wo ein Zeichen steht,
 * sagt das Layout; wie dick und wie gross es ist, steht hier.
 *
 * Die Staerken sind am `2006Trommelfont` ausgemessen und auf die Kopfhoehe des
 * Layouts umgerechnet. Sie sind viel feiner, als sie vorher waren: der Hals
 * misst rund ein Zehntel der Kopfhoehe, nicht ein Viertel.
 */
const HALS_STAERKE = 0.82;
const LINIEN_STAERKE = 0.71;
/** Noch ungeprueft: die Vorlage zeigt keinen Schlepp. Vorerst wie der Hals. */
const VORSCHLAG_STAERKE = 0.82;
const KLAMMER_STAERKE = 1.54;
const KLAMMER_PUNKT = 1.06;
/**
 * Die Neigung des Notenkopfes. Der Kopf ist eine Ellipse, die nach rechts oben
 * kippt — im Trommelfont deutlich steiler als im allgemeinen Notenstich, der
 * bei rund 20° liegt. Das Achsenverhaeltnis der Ellipse steckt dagegen schon in
 * der Huellbox, die das Layout nennt; nur der Winkel gehoert hierher.
 */
const KOPF_NEIGUNG = 33.4;
const PUNKT_RADIUS = 1.5;
/**
 * Die Balken haengen an den Halsenden und stapeln sich von dort nach *oben*,
 * zur Notenlinie hin — der unterste liegt auf der Hoehe, die das Layout nennt.
 */
const BALKEN_STAERKE = 3.76;
const BALKEN_LUECKE = 2.5;
/**
 * Ein Balken der gegebenen Ebene zwischen zwei x, in beliebiger Reihenfolge.
 * Ebene 1 liegt auf `y`; jede weitere stapelt sich darueber.
 */
const balkenRechteck = (xA: number, xB: number, y: number, ebene: number) => (
  <rect
    x={Math.min(xA, xB)}
    y={y - BALKEN_STAERKE - (ebene - 1) * (BALKEN_STAERKE + BALKEN_LUECKE)}
    width={Math.abs(xB - xA)}
    height={BALKEN_STAERKE}
    fill="currentColor"
    stroke="none"
  />
);
const FAHNE_BREITE = 7;
/** Die Fahne haengt am unteren Halsende und schwingt nach rechts oben aus. */
const FAHNE_STEIGUNG = 6;
const FAHNE_ABSTAND = 5;
/**
 * Die Striche des Wirbels queren den Hals schraeg nach rechts oben, mittig um
 * die Hoehe, die das Layout nennt. Noch ohne Vorlage, nach Augenmass an ZicZac.
 */
const WIRBEL_BREITE = 6;
const WIRBEL_STEIGUNG = 3;
const WIRBEL_ABSTAND = 3.5;
const WIRBEL_STAERKE = 1.1;
/**
 * Die innere Form der Pausen, vom unteren Ende aus, das das Layout nennt. Ohne
 * Schriftvorlage, nach Augenmass an ZicZac: die Achtelpause eine schraege
 * Stange mit einem Haken, dessen Ende ein Tropfen ist, die Sechzehntelpause mit
 * zweien; die Viertelpause ein Zickzack mit einem Fuss.
 */
const PAUSE_HAKEN_ABSTAND = 6;
const PAUSE_STANGE_SOCKEL = 7;
const PAUSE_STANGE_NEIGUNG = 0.25;
const PAUSE_TROPFEN_VERSATZ = 4.5;
const PAUSE_TROPFEN_RADIUS = 2.2;
const VIERTELPAUSE_HOEHE = 25;
const VIERTELPAUSE_STAERKE = 3;

/** Der Bogen eines Rufs ist feiner als der Hals. */
const BOGEN_STAERKE = 0.6;
const RUF_ZAHL_GROESSE = 8;

/**
 * Die Halbachsen der Ellipse, die eine gegebene Huellbox unter `KOPF_NEIGUNG`
 * gerade ausfuellt. Aus w² = a²cos²θ + b²sin²θ und h² = a²sin²θ + b²cos²θ
 * aufgeloest; der Renderer bekommt vom Layout nur die Box und leitet den Rest
 * selbst ab, damit die Groesse an genau einer Stelle steht.
 */
const kopfAchsen = (breite: number, hoehe: number) => {
  const bogen = (KOPF_NEIGUNG * Math.PI) / 180;
  const c = Math.cos(bogen) ** 2;
  const s = Math.sin(bogen) ** 2;
  const w = (breite / 2) ** 2;
  const h = (hoehe / 2) ** 2;
  return { rx: Math.sqrt((w * c - h * s) / (c - s)), ry: Math.sqrt((h * c - w * s) / (c - s)) };
};

const Notenkopf = ({ glyph }: { glyph: Extract<Glyph, { typ: "notenkopf" }> }) => {
  const { rx, ry } = kopfAchsen(glyph.breite, glyph.hoehe);
  // Negativ, weil die y-Achse im SVG nach unten zeigt: der Kopf kippt nach
  // rechts *oben*.
  return (
    <ellipse
      cx={glyph.x}
      cy={glyph.y}
      rx={rx}
      ry={ry}
      transform={`rotate(${-KOPF_NEIGUNG} ${glyph.x} ${glyph.y})`}
      fill="currentColor"
      stroke="none"
    />
  );
};

/** Eine Achtel- oder Sechzehntelpause: eine Stange mit so vielen Haken wie Fahnen. */
const Hakenpause = ({ x, y, haken }: { x: number; y: number; haken: number }) => {
  const hoehe = PAUSE_STANGE_SOCKEL + PAUSE_HAKEN_ABSTAND * haken;
  // Die Stange steigt nach rechts; ihr Fuss steht etwas links der Stelle.
  const stangeX = (ueberFuss: number) => x - 1 + ueberFuss * PAUSE_STANGE_NEIGUNG;
  return (
    <>
      <line x1={stangeX(0)} y1={y} x2={stangeX(hoehe)} y2={y - hoehe} strokeWidth={HALS_STAERKE} />
      {Array.from({ length: haken }, (_, i) => {
        const hakenHoehe = hoehe - i * PAUSE_HAKEN_ABSTAND;
        const endeX = stangeX(hakenHoehe);
        const tropfenX = endeX - PAUSE_TROPFEN_VERSATZ;
        const tropfenY = y - hakenHoehe + 2;
        return (
          <g key={i}>
            <circle cx={tropfenX} cy={tropfenY} r={PAUSE_TROPFEN_RADIUS} fill="currentColor" />
            <path
              d={`M ${tropfenX} ${tropfenY + PAUSE_TROPFEN_RADIUS} Q ${endeX - 1.5} ${tropfenY + 1.5} ${endeX} ${y - hakenHoehe}`}
              fill="none"
              strokeWidth={HALS_STAERKE}
            />
          </g>
        );
      })}
    </>
  );
};

/** Die Viertelpause: oben ein Zickzack mit kraeftigem Mittelstrich, unten ein Fuss. */
const Viertelpause = ({ x, y }: { x: number; y: number }) => {
  const oben = y - VIERTELPAUSE_HOEHE;
  return (
    <>
      <path
        d={`M ${x - 1.5} ${oben} L ${x + 2.5} ${oben + 6} M ${x - 1.5} ${oben + 12} L ${x + 1.5} ${oben + 17}`}
        fill="none"
        strokeWidth={HALS_STAERKE}
      />
      <line
        x1={x + 2.5}
        y1={oben + 6}
        x2={x - 1.5}
        y2={oben + 12}
        strokeWidth={VIERTELPAUSE_STAERKE}
      />
      <path
        d={`M ${x - 5.5} ${y - 2} Q ${x - 3} ${y - 7} ${x + 1.5} ${oben + 17} L ${x + 5} ${y - 0.5}`}
        fill="none"
        strokeWidth={HALS_STAERKE * 1.4}
      />
    </>
  );
};

const Taktstrich = ({ glyph }: { glyph: Extract<Glyph, { typ: "taktstrich" }> }) => (
  <>
    {glyph.striche.map((x, i) => (
      <line
        key={`strich-${i}`}
        x1={x}
        y1={glyph.yOben}
        x2={x}
        y2={glyph.yUnten}
        strokeWidth={i === 0 ? LINIEN_STAERKE : KLAMMER_STAERKE}
      />
    ))}
    {glyph.punkte.map((punkt, i) => (
      <circle key={`punkt-${i}`} cx={punkt.x} cy={punkt.y} r={KLAMMER_PUNKT} fill="currentColor" />
    ))}
  </>
);

const zeichne = (glyph: Glyph) => {
  switch (glyph.typ) {
    case "titel":
      return (
        <text x={glyph.x} y={glyph.y} fontSize={22} fontWeight={600} fill="currentColor">
          {glyph.text}
        </text>
      );
    case "versNummer":
      return (
        <text x={glyph.x} y={glyph.y} fontSize={13} fill="currentColor" dominantBaseline="middle">
          {glyph.nummer}.
        </text>
      );
    case "taktart":
      return (
        <text x={glyph.x} fontSize={14} fontWeight={600} fill="currentColor" textAnchor="middle">
          <tspan x={glyph.x} y={glyph.y - 8}>
            {glyph.zaehler}
          </tspan>
          <tspan x={glyph.x} y={glyph.y + 8}>
            {glyph.nenner}
          </tspan>
        </text>
      );
    case "notenlinie":
      return (
        <line x1={glyph.x1} y1={glyph.y} x2={glyph.x2} y2={glyph.y} strokeWidth={LINIEN_STAERKE} />
      );
    case "taktstrich":
      return <Taktstrich glyph={glyph} />;
    case "notenkopf":
      return <Notenkopf glyph={glyph} />;
    case "hals":
      return (
        <line
          x1={glyph.x}
          y1={glyph.yOben}
          x2={glyph.x}
          y2={glyph.yUnten}
          strokeWidth={HALS_STAERKE}
        />
      );
    case "vorschlag":
      return (
        <line
          x1={glyph.x}
          y1={glyph.yOben}
          x2={glyph.x}
          y2={glyph.yUnten}
          strokeWidth={VORSCHLAG_STAERKE}
        />
      );
    case "wirbelstriche":
      return (
        <>
          {Array.from({ length: glyph.anzahl }, (_, i) => {
            const y = glyph.y + (i - (glyph.anzahl - 1) / 2) * WIRBEL_ABSTAND;
            return (
              <line
                key={i}
                x1={glyph.x - WIRBEL_BREITE / 2}
                y1={y + WIRBEL_STEIGUNG / 2}
                x2={glyph.x + WIRBEL_BREITE / 2}
                y2={y - WIRBEL_STEIGUNG / 2}
                strokeWidth={WIRBEL_STAERKE}
              />
            );
          })}
        </>
      );
    case "bogen": {
      // Ein quadratischer Bogen erreicht bei t = 1/2 den Mittelwert aus Enden und
      // doppeltem Kontrollpunkt — so liegt sein Scheitel dort, wo das Layout will.
      const kontrollY = 2 * glyph.scheitelY - (glyph.y1 + glyph.y2) / 2;
      const kontrollX = (glyph.x1 + glyph.x2) / 2;
      return (
        <path
          d={`M ${glyph.x1} ${glyph.y1} Q ${kontrollX} ${kontrollY} ${glyph.x2} ${glyph.y2}`}
          fill="none"
          strokeWidth={BOGEN_STAERKE}
        />
      );
    }
    case "rufZahl":
      return (
        <text
          x={glyph.x}
          y={glyph.y}
          fontSize={RUF_ZAHL_GROESSE}
          fontStyle="italic"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
        >
          {glyph.text}
        </text>
      );
    case "punkt":
      return (
        <circle cx={glyph.x} cy={glyph.y} r={PUNKT_RADIUS} fill="currentColor" stroke="none" />
      );
    case "pause":
      if (glyph.art === "Viertelpause") return <Viertelpause x={glyph.x} y={glyph.y} />;
      return <Hakenpause x={glyph.x} y={glyph.y} haken={glyph.art === "Achtelpause" ? 1 : 2} />;
    case "balken":
      return balkenRechteck(glyph.x1, glyph.x2, glyph.y, glyph.ebene);
    case "balkenstummel":
      return balkenRechteck(glyph.x1, glyph.x2, glyph.y, glyph.ebene);
    case "fahne":
      return (
        <>
          {Array.from({ length: glyph.anzahl }, (_, i) => (
            <line
              key={i}
              x1={glyph.x}
              y1={glyph.y - i * FAHNE_ABSTAND}
              x2={glyph.x + FAHNE_BREITE}
              y2={glyph.y - i * FAHNE_ABSTAND - FAHNE_STEIGUNG}
              strokeWidth={HALS_STAERKE}
            />
          ))}
        </>
      );
  }
};

export interface ZuendstoffnotenProps {
  readonly marsch: Marsch;
  /** Abstrakte Einheiten je Bildschirmpunkt. */
  readonly skalierung?: number;
}

export const Zuendstoffnoten = ({ marsch, skalierung = 1.6 }: ZuendstoffnotenProps) => {
  const { breite, hoehe, glyphen } = layout(marsch);

  return (
    <svg
      width={breite * skalierung}
      height={hoehe * skalierung}
      viewBox={`0 0 ${breite} ${hoehe}`}
      role="img"
      aria-label={`${marsch.titel} in Zuendstoffnoten`}
      stroke="currentColor"
      strokeLinecap="round"
    >
      {glyphen.map((glyph, i) => (
        <g key={i}>{zeichne(glyph)}</g>
      ))}
    </svg>
  );
};
