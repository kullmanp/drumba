# 02 — Draw the Auftakt, and put it into the Übungsmarsch

Status: ready-for-human
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

## Comments

**2026-10-11 (AFK agent).** Commit "Draw the Auftakt before the first Taktstrich".

Images to compare (Drumba is zoomed 3× in the browser):

- `.scratch/auftakt/drumba-auftakt.png` beside `.scratch/auftakt/ziczac-vers1-auftakt.png`
- `.scratch/auftakt/drumba-ganze-seite.png`: the whole Übungsmarsch, including the 6/8
  Vers's new closing Takt

What was built: the Auftakt is laid out by `legeTakt` as a Takt whose start is shifted left by
the Auftakt's start, so its full-Takt positions, Zählzeit grouping, Balken and the free-Ruf rule
work unchanged. It sits between the Taktart and the first Taktstrich, as wide as it lasts, with
no Taktstrich before it. The Notenlinie starts at it. The first Taktstrich carries the opening
repeat sign. `legeBoegen` draws the Bogen from an Auftakt Ruf to its Landung on Takt 1.
Übungsmarsch: the 2/4 Vers opens with ZicZac Vers 1's free Fünferruf (rechts, at 3/8, landing on
Takt 1's first Achtel rechts, read off the enlarged crop) and is now `wiederholungen: 2`. The 6/8
Vers ends on a new Takt: punktierte Viertel, Achtel, Viertelpause.

Differences from ZicZac, as the spec wants or out of scope: ZicZac draws no opening repeat sign
(Drumba keeps its own, after the Auftakt). ZicZac sets the "5" beside the free Ruf rather than
over the middle of the Bogen. That is the existing Wirbel layout, not touched here.
Playback still ignores the Auftakt until issue 03. No departure from the spec.
