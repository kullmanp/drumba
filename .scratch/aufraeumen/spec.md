# Aufräumen — loose ends before Pausen and Auftakt

Status: done

## Problem Statement

Two loose ends from the closed specs stand in the way of the next features:

- The **Balkenstummel**'s far end is computed in the renderer (`STUMMEL_LAENGE` in
  `src/render/zuendstoffnoten.tsx`). AGENTS.md says an x computed in `src/render/` belongs in
  the layout. Decided 2026-10-11: the rule wins.
- `legeBoegen` in the layout takes the next _placed_ Schlag as a Ruf's Landung, instead of the
  model's `folgeschlag` that `pruefeMarsch` uses. Once Pausen and the Auftakt exist, "next
  placed" and "next Schlag" can drift apart. There should be one definition.

(A third loose end, "the overrun walk is duplicated between layout and playback", is already
gone: both call `pruefeMarsch`.)

## Solution

1. The layout emits the Balkenstummel with both ends, so a test can assert it points into its
   Balkengruppe. The renderer keeps only stroke weight and the Balken thickness and spacing.
2. The model exports the Landung lookup (`folgeschlag`, or a `landung(...)` built on it), and
   both `pruefeMarsch` and `legeBoegen` use it. `legeBoegen` maps the model's Landung back to
   its placed Schlag rather than reading `platzierte[index + 1]`.

No visible change: `npm run dev` looks exactly as before.

## Testing Decisions

- Layout: a Stummel on a group's first Schlag ends right of its Hals, one on any other Schlag
  ends left of it, and both ends stay within the group's first and last Hals.
- Layout: a Bogen still runs from a Ruf to its Landung, in the same Takt and across the
  Taktstrich (existing tests must stay green).
- Model: the exported lookup finds the Landung in the same Takt and in the next Takt, and finds
  none past the end of the Vers.

## Out of Scope

Anything visible. Pausen and the Auftakt (`.scratch/pausen/`, `.scratch/auftakt/`).

## Comments

**Closed 2026-10-11.** Specified in `7ff0536`, built in `f557642` (Balkenstummel in the layout)
and `ee56e96` (Landung through the model). The page renders byte-identical to before. Notes
beyond the spec:

- The `balkenstummel` glyph now carries both ends (`x1` at the Hals, `x2` into the group); the
  `Richtung` type is gone and `STUMMEL_LAENGE` lives in the layout.
- Placed Schläge are keyed by (Takt index, Schlag index), not by the `Schlag` object, so a Takt
  object reused for a repeated Takt still finds its own Landung.

Loose ends:

- A Balkenstummel stays inside its group only while neighbouring Hälse are at least 7 units
  apart; the layout does not clamp it.
