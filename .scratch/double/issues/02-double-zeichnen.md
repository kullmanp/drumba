# 02 — Draw the Doublé, and put it into the Übungsmarsch

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `.scratch/double/spec.md` — Layout, Renderer, Übungsmarsch.

Emit the flag at the top of a Doublé's Vorschlag line from the layout, draw it in the renderer,
and rewrite ZicZac Vers 1, Takt 2 in the Übungsmarsch with Doublés.

Done when: the spec's layout tests pass, `npm run check` passes, and the agent has put a
Playwright screenshot of that Takt beside a crop of ZicZac Vers 1, Takt 2 into
`.scratch/double/` and linked them under `## Comments`. Visual and audible: set
`Status: ready-for-human` after committing.
