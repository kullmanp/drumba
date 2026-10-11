# 01 — The Balkenstummel's far end comes from the layout

Status: done
Type: task

Spec: `.scratch/aufraeumen/spec.md`, item 1.

Move `STUMMEL_LAENGE` from `src/render/zuendstoffnoten.tsx` into `src/layout/layout.ts`. The
`balkenstummel` glyph carries both x ends (e.g. `x1`, `x2`) instead of a Hals x and a
direction; the renderer draws the rectangle between them via `balkenRechteck`. Keep the length
as it is now (7 units). Update the glyph's doc comment, which says the renderer chooses the
length.

Done when: the layout tests assert both ends (pointing into the group), `npm run check`
passes, and a Playwright screenshot of the Übungsmarsch's 2/4 Vers is unchanged by eye.
Purely internal: set `Status: done` after committing.

## Comments

**2026-10-11 (AFK agent).** Commit "Emit the Balkenstummel's far end from the layout".
The `balkenstummel` glyph now carries `x1` (at its Hals) and `x2` (into the group);
`STUMMEL_LAENGE` (7) lives in the layout, the renderer only draws `balkenRechteck(x1, x2, …)`.
Screenshot: `.scratch/aufraeumen/01-uebungsmarsch.png`, byte-identical to the screenshot taken
before the change. No departure from the spec.
Loose end (review): a Stummel stays inside its group only while neighbouring Hälse are at least
7 units apart; the layout does not clamp it. True for every spacing the model produces today.
