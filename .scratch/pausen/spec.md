# Pausen

Status: done

## Problem Statement

Drumba has no way to write silence. A gap between Schläge is just empty time: it is neither
drawn nor checked, so a typo that leaves a Takt half-empty passes silently. Real Märsche write
**Pausen** everywhere — ZicZac Vers 1, Takt 2 opens with an Achtelpause, and most Verse end on
a Viertel and a Viertelpause. The Auftakt (`.scratch/auftakt/`) needs them too: it is replayed
over the Pause at the end of a Vers.

## Solution

A **Pause** (see `GLOSSARY.md`) is explicit in the model: a position and a notated value in its
Takt, with no Figur and no Hand. A Takt must be filled exactly by its Schläge and Pausen. The
layout places each Pause at one fixed height below the Notenlinie; the renderer draws the
traditional rest glyphs. Playback keeps them silent.

The deliverable: `npm run dev` shows a Takt with an Achtelpause and a Takt ending on a
Viertelpause that look like the ZicZac crops, and `npm test` proves where each Pause sits and
that an unfilled Takt is rejected.

## User Stories

1. As a drummer, I want an Achtelpause, Sechzehntelpause and Viertelpause drawn as in the
   originals, so that I read silence as quickly as Schläge.
2. As a drummer, I want a dotted Pause drawn with a Punkt, like a dotted Schlag.
3. As a drummer, I want a Pause in the middle of a Zählzeit to leave the Balken joining the
   Schläge on either side, so that the Zählzeit still reads as one group.
4. As an author, I want a Takt whose Schläge and Pausen leave a gap or overlap to be rejected
   with an error naming Vers and Takt, so that typos never sound or draw silently.
5. As a developer, I want each Pause emitted by the layout with its position, so that it is
   asserted as data like every other mark.

## Implementation Decisions

**Model.** `Takt` gains `pausen: readonly Pause[]`, a list beside `schlaege`; a Pause is
`{ position: Bruch, wert: Bruch }`. The Schlag code does not change. Values: Sechzehntel,
Achtel, Viertel, each optionally dotted (wert 3/32, 3/16, 3/8). Halbe and Ganze are not drawn
yet; the layout throws a named error for any other value, as it does for unknown Schlag values.
Existing Takte and builders gain `pausen: []` (or the builder supplies it).

**Check.** `pruefeMarsch` additionally requires that the Schläge and Pausen of each Takt, taken
in position order, tile the Takt from 0 to its length with no gap and no overlap. A failure
throws a new named error (e.g. `LueckenhafterTaktError`) that says Vers, Takt and where the gap
or overlap is. The existing overrun check (`taktUeberlauf`) also covers Pausen. Note: the
Auftakt (later spec) is not filled from 0; leave room for that, don't build it.

**Layout.** A `pause` glyph with x (at its position, on the same rhythmic x scale as Schläge),
y (one fixed height below the Notenlinie, about the Balken height, the same for every Pause
whatever its neighbours' Hands), its value, and a Punkt glyph if dotted. A Pause takes no part
in Balkengruppen: a Pause at the edge of a Zählzeit stands outside the Balken, which start and
end at the first and last Schlag; a Pause in the middle of a Zählzeit lets the Balken run over
it (unconfirmed against an original — note it in the commit/comments if an original shows
otherwise).

**Renderer.** Draws the three rest glyphs as SVG paths: the Sechzehntel- and Achtelpause as the
familiar hooked flag shape (one and two hooks), the Viertelpause as the zigzag. No Trommelfont
source exists; size them by eye against the ZicZac crops (Achtelpause: Vers 1 Takt 2;
Viertelpause: Vers 3 last Takt). Inner shape and stroke weight are the renderer's; position is
the layout's.

**Playback.** A Pause produces no Anschlag. `abspielplan` needs no new timing; only add a test.

**Übungsmarsch.** In the 2/4 Vers, add **ZicZac Vers 1, Takt 2**: Achtelpause, then three
Achtel (crop and enlarge that one Takt with `sips -Z 1400` and read the Hands off the head
heights before transcribing; accents and dynamics ignored). Also make the Vers's last Takt end
on a Viertel and a Viertelpause, like ZicZac Vers 3's last Takt. The Auftakt spec builds on
that last Takt.

## Testing Decisions

At the seam, relationships over constants (`CODING_STANDARDS.md`).

- Model: a filled Takt passes; a gap, an overlap, and a Takt of Pausen only (filled) behave as
  specified; the error names Vers and Takt.
- Layout: every Pause sits below the Notenlinie at the same y, whatever the neighbouring Hands;
  a Pause's x is ordered with the Schläge by position; a dotted Pause gets a Punkt right of it;
  a Pause at the start of a Zählzeit is outside the Balken (the Balken starts at the first
  Schlag's Hals); a Pause in the middle leaves one Balken from the first to the last Schlag.
- Playback: a Takt with a Pause yields Anschläge only for its Schläge, at the same times as
  before.
- The Übungsmarsch lays out and plays without throwing.

## Out of Scope

Halbe and Ganze Pausen; multi-Takt rests; Pausen in the Auftakt (the Auftakt spec decides);
accents and dynamics; the short free Ruf (ZicZac Vers 1 Takt 9, Vers 3 Takt 2), which is an
open model question.

## Further Notes

Decided in the 2026-10-11 grilling for the AFK session. Reference:
`~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf` (render with `qlmanage`, see the
project memory).

## Comments

**Closed 2026-10-11.** Specified in `7ff0536`, built in `15f199c` (Pause in the model) and
`33b58ad` (drawing Pausen). It looks right. Notes beyond the spec:

- The layout never checked Schlag values, so only Pausen got the new `UnzeichenbarePauseError`.
- `pruefeMarsch` checks every Takt for overrun and gaps before any Ruf check; older tests spell
  out their Pausen.
- The Übungsmarsch gained ZicZac Vers 1, Takt 2 and closing Viertelpausen in both Verse.

Loose ends:

- ZicZac Vers 1, Takt 2: the flagged line above each Achtel is unnamed; Drumba writes plain
  Dupfen.
- Every Pause sits at one height; ZicZac's Viertelpause sits a little higher. Per-Pausenart
  heights if it should match.
- Balken over a Pause in the middle of a Zählzeit and the Punkt of a dotted Pause have no
  original to confirm them. The rests' shapes are by eye.
- `GLOSSARY.md` **Punkt** does not cover a Pause's Punkt.
- The model accepts a `wert` of 0 or below, and a Vers without Takte.
