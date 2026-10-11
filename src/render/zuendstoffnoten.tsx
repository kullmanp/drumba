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
 *
 * Die Stärken sind am `2006Trommelfont` ausgemessen und auf die Kopfhöhe des
 * Layouts umgerechnet. Sie sind viel feiner, als sie vorher waren: der Hals
 * misst rund ein Zehntel der Kopfhöhe, nicht ein Viertel.
 */
const HALS_STÄRKE = 0.82;
const LINIEN_STÄRKE = 0.71;
/** Noch ungeprüft: die Vorlage zeigt keinen Schlepp. Vorerst wie der Hals. */
const VORSCHLAG_STÄRKE = 0.82;
const KLAMMER_STÄRKE = 1.54;
const KLAMMER_PUNKT = 1.06;
/**
 * Die Neigung des Notenkopfes. Der Kopf ist eine Ellipse, die nach rechts oben
 * kippt — im Trommelfont deutlich steiler als im allgemeinen Notenstich, der
 * bei rund 20° liegt. Das Achsenverhältnis der Ellipse steckt dagegen schon in
 * der Hüllbox, die das Layout nennt; nur der Winkel gehört hierher.
 */
const KOPF_NEIGUNG = 33.4;
const PUNKT_RADIUS = 1.5;
/**
 * Die Balken hängen an den Halsenden und stapeln sich von dort nach *oben*,
 * zur Notenlinie hin — der unterste liegt auf der Höhe, die das Layout nennt.
 */
const BALKEN_STÄRKE = 3.76;
const BALKEN_LÜCKE = 2.5;
const FAHNE_BREITE = 7;
/** Die Fahne hängt am unteren Halsende und schwingt nach rechts oben aus. */
const FAHNE_STEIGUNG = 6;
const FAHNE_ABSTAND = 5;

/**
 * Die Halbachsen der Ellipse, die eine gegebene Hüllbox unter `KOPF_NEIGUNG`
 * gerade ausfüllt. Aus w² = a²cos²θ + b²sin²θ und h² = a²sin²θ + b²cos²θ
 * aufgelöst; der Renderer bekommt vom Layout nur die Box und leitet den Rest
 * selbst ab, damit die Grösse an genau einer Stelle steht.
 */
const kopfAchsen = (breite: number, höhe: number) => {
  const bogen = (KOPF_NEIGUNG * Math.PI) / 180;
  const c = Math.cos(bogen) ** 2;
  const s = Math.sin(bogen) ** 2;
  const w = (breite / 2) ** 2;
  const h = (höhe / 2) ** 2;
  return { rx: Math.sqrt((w * c - h * s) / (c - s)), ry: Math.sqrt((h * c - w * s) / (c - s)) };
};

const Notenkopf = ({ glyph }: { glyph: Extract<Glyph, { typ: "notenkopf" }> }) => {
  const { rx, ry } = kopfAchsen(glyph.breite, glyph.höhe);
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

const Taktstrich = ({ glyph }: { glyph: Extract<Glyph, { typ: "taktstrich" }> }) => (
  <>
    {glyph.striche.map((x, i) => (
      <line
        key={`strich-${i}`}
        x1={x}
        y1={glyph.yOben}
        x2={x}
        y2={glyph.yUnten}
        strokeWidth={i === 0 ? LINIEN_STÄRKE : KLAMMER_STÄRKE}
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
            {glyph.zähler}
          </tspan>
          <tspan x={glyph.x} y={glyph.y + 8}>
            {glyph.nenner}
          </tspan>
        </text>
      );
    case "notenlinie":
      return (
        <line x1={glyph.x1} y1={glyph.y} x2={glyph.x2} y2={glyph.y} strokeWidth={LINIEN_STÄRKE} />
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
          strokeWidth={HALS_STÄRKE}
        />
      );
    case "vorschlag":
      return (
        <line
          x1={glyph.x}
          y1={glyph.yOben}
          x2={glyph.x}
          y2={glyph.yUnten}
          strokeWidth={VORSCHLAG_STÄRKE}
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
              y={glyph.y - BALKEN_STÄRKE - i * (BALKEN_STÄRKE + BALKEN_LÜCKE)}
              width={glyph.x2 - glyph.x1}
              height={BALKEN_STÄRKE}
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
              strokeWidth={HALS_STÄRKE}
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
  const { breite, höhe, glyphen } = layout(marsch);

  return (
    <svg
      width={breite * skalierung}
      height={höhe * skalierung}
      viewBox={`0 0 ${breite} ${höhe}`}
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
