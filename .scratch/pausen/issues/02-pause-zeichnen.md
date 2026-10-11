# 02 — Draw Pausen, and put them into the Übungsmarsch

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `.scratch/pausen/spec.md` — Layout, Renderer, Übungsmarsch.

Emit `pause` glyphs (and Punkte) from the layout, keep Pausen out of Balkengruppen as
specified, draw the three glyphs in the renderer, and add the two Übungsmarsch Takte.

Done when: the layout tests cover the spec's cases, `npm run check` passes, and the agent has
put a Playwright screenshot of the 2/4 Vers beside crops of ZicZac Vers 1 Takt 2 and Vers 3's
last Takt into `.scratch/pausen/` and linked them under `## Comments`. Visual: set
`Status: ready-for-human` after committing.
