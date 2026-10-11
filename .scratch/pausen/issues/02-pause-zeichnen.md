# 02 — Draw Pausen, and put them into the Übungsmarsch

Status: done
Type: task
Blocked by: 01

Spec: `.scratch/pausen/spec.md` — Layout, Renderer, Übungsmarsch.

Emit `pause` glyphs (and Punkte) from the layout, keep Pausen out of Balkengruppen as
specified, draw the three glyphs in the renderer, and add the two Übungsmarsch Takte.

Done when: the layout tests cover the spec's cases, `npm run check` passes, and the agent has
put a Playwright screenshot of the 2/4 Vers beside crops of ZicZac Vers 1 Takt 2 and Vers 3's
last Takt into `.scratch/pausen/` and linked them under `## Comments`. Visual: set
`Status: ready-for-human` after committing.

## Comments

**2026-10-11 (AFK agent).** Commit "Draw Pausen below the Notenlinie".

Images to compare (Drumba is zoomed 3× in the browser):

- `.scratch/pausen/drumba-2-4-vers.png`: the whole 2/4 Vers of the Übungsmarsch
- `.scratch/pausen/drumba-achtelpause.png` beside `.scratch/pausen/ziczac-vers1-takt2.png`
- `.scratch/pausen/drumba-viertelpause.png` beside `.scratch/pausen/ziczac-vers3-letzter-takt.png`

What was built: a `pause` glyph with `x` (on the Schläge' time axis), `y` (the Pause's lower
end, the same depth for every Pause, 0.9 × Hals depth) and `art` (Sechzehntel-, Achtel- or
Viertelpause). A dotted Pause gets a Punkt to its right. Any other value throws
`UnzeichenbarePauseError` (Vers, Takt). Pausen take no part in Balkengruppen. In the
renderer: a slanted stem with one or two hooks ending in a drop, and the zigzag.

Departures and things to look at:

- **Viertelpause sits a little low.** As the spec asks, every Pause shares one height (here
  its lower end). With the Achtelpause placed like ZicZac, the Viertelpause ends at about
  0.89 × Hals depth instead of ZicZac's ~0.78, almost on the Balken. Measuring from the top
  instead would misplace the Achtelpause, so one shared height can't match both. Decide whether
  each Pausenart may have its own height.
- **Question (notation):** in ZicZac Vers 1 Takt 2, each of the three Achtel has a short line
  rising from its Notenkopf **with a flag** on it. A Schlepp's Vorschlag in the same score
  (the Fünferruf, Vers 1 opening; Takt 1's Schlepps) is a plain line without a flag, so this is
  a different mark. Neither the glossary nor the spec names it. Following the spec's "three
  Achtel", I transcribed them as plain Dupfen (links, rechts, links), so the flags are missing.
  What figure is it?
- The spec says the layout throws for unknown values "as it does for unknown Schlag values". The
  layout never checked Schlag values; only Pausen got the new error.
- Balken over a Pause in the middle of a Zählzeit is built as specified, unconfirmed: ZicZac has
  no such Pause.
- The Punkt of a dotted Pause sits at a fixed height between the Notenlinie and the Pause's
  foot, by eye; ZicZac shows no dotted Pause.

Loose ends: `GLOSSARY.md` **Punkt** still says only "right of the Notenkopf, at the head's own
height". A Pause's Punkt is placed differently. Not edited, per the AFK rules. The rests' inner
shapes are by eye: no font source exists.

**2026-10-11.** Checked by the user: done.
