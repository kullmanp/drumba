import type { Glyph } from "../layout/layout";
import { layout } from "../layout/layout";
import type { Marsch } from "../model/marsch";

/**
 * Der SVG-Renderer: eine stumpfe Abbildung platzierter Glyphen auf
 * SVG-Primitive. Hier wird nichts entschieden — jede Koordinate kommt aus dem
 * Layout, und der einzige Massstab ist `skalierung`. Insbesondere wählt der
 * Renderer keine Höhen: auf welcher Seite der Notenlinie ein Notenkopf steht,
 * sagt das Layout, denn daran liest man die Hand.
 */

/**
 * Strichstärken und die innere Form einzelner Zeichen. Wo ein Zeichen steht,
 * sagt das Layout; wie dick und wie gross es ist, steht hier.
 */
const HALS_STAERKE = 2.2;
const VORSCHLAG_STAERKE = 2.2;
const LINIEN_STAERKE = 1.2;
const KLAMMER_STAERKE = 2.6;
const KLAMMER_PUNKT = 1.8;
/** Der Notenkopf. Sein Radius passt zum Abstand, den das Layout ihm zur Linie gibt. */
const KOPF_RADIUS = 4;
const PUNKT_RADIUS = 1.5;
/**
 * Die Balken hängen an den Halsenden und stapeln sich von dort nach *oben*,
 * zur Notenlinie hin — der unterste liegt auf der Höhe, die das Layout nennt.
 */
const BALKEN_STAERKE = 4;
const BALKEN_LUECKE = 2.5;
const FAHNE_BREITE = 7;
/** Die Fahne hängt am unteren Halsende und schwingt nach rechts oben aus. */
const FAHNE_STEIGUNG = 6;
const FAHNE_ABSTAND = 5;

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
      return (
        <circle cx={glyph.x} cy={glyph.y} r={KOPF_RADIUS} fill="currentColor" stroke="none" />
      );
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
    case "punkt":
      return (
        <circle cx={glyph.x} cy={glyph.y} r={PUNKT_RADIUS} fill="currentColor" stroke="none" />
      );
    case "balken":
      return (
        <>
          {Array.from({ length: glyph.anzahl }, (_, i) => (
            <rect
              key={i}
              x={glyph.x1}
              y={glyph.y - BALKEN_STAERKE - i * (BALKEN_STAERKE + BALKEN_LUECKE)}
              width={glyph.x2 - glyph.x1}
              height={BALKEN_STAERKE}
              fill="currentColor"
              stroke="none"
            />
          ))}
        </>
      );
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

export interface ZündstoffnotenProps {
  readonly marsch: Marsch;
  /** Abstrakte Einheiten je Bildschirmpunkt. */
  readonly skalierung?: number;
}

export const Zündstoffnoten = ({ marsch, skalierung = 1.6 }: ZündstoffnotenProps) => {
  const { breite, hoehe, glyphen } = layout(marsch);

  return (
    <svg
      width={breite * skalierung}
      height={hoehe * skalierung}
      viewBox={`0 0 ${breite} ${hoehe}`}
      role="img"
      aria-label={`${marsch.titel} in Zündstoffnoten`}
      stroke="currentColor"
      strokeLinecap="round"
    >
      {glyphen.map((glyph, i) => (
        <g key={i}>{zeichne(glyph)}</g>
      ))}
    </svg>
  );
};
