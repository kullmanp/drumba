# 02 — Draw the Auftakt, and put it into the Übungsmarsch

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `.scratch/auftakt/spec.md` — Layout, Übungsmarsch.

Lay out the Auftakt before the first Taktstrich with the repeat sign after it, draw the Bogen
into Takt 1, and make both Übungsmarsch changes (2/4 Auftakt + `wiederholungen: 2`, closing
Takt of the 6/8 Vers). Playback may still ignore the Auftakt until issue 03.

Done when: layout tests cover the spec's cases, `npm run check` passes, and a Playwright
screenshot of the 2/4 Vers beside an enlarged crop of ZicZac Vers 1's opening is in
`.scratch/auftakt/` and linked under `## Comments`. Visual: set `Status: ready-for-human` after
committing.
