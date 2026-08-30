# One canonical model; Hieroglyphen is a lossy view, not a source of truth

Drumba supports two Basel notations, **Zündstoffnoten** (rhythmically precise) and
**Hieroglyphen** (Severin, ~1865 — encodes figures/gestures, not exact durations, so
rhythmically imprecise). We considered treating each notation as an independent document the
user authors separately.

We instead keep a **single canonical model** with Zündstoff-grade precision (exact fractional
positions, explicit notated values, explicit `Hand` on every `Schlag`) as the only source of
truth. Hieroglyphen is a **lossy renderer** over that model, plus a **separate lossy import**
path where the user resolves the rhythm the hieroglyphs leave open. A hieroglyph score is
never authoritative.

## Consequences

- A precise model always renders *down* to hieroglyphs; the reverse needs human input, which
  is why import is its own path rather than a symmetric editor.
- Every downstream feature (playback, transposition between notations, analysis) targets the
  canonical model only and never has to reconcile two authored representations.
- If a hieroglyph-only source must round-trip losslessly some day, this decision has to be
  revisited — hence the ADR.
