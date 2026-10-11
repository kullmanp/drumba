# 01 — The Balkenstummel's far end comes from the layout

Status: ready-for-agent
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
