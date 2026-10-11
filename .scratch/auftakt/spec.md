# Auftakt

Status: done

## Problem Statement

Most Verse of a real Marsch open with an **Auftakt**: in ZicZac, Verse 1, 3, 4, 5, 7 and 8 open
with a free Fünferruf before the first Taktstrich, landing on Takt 1; Vers 6 opens with two
Sechzehntel links. Drumba cannot hold any of that, so no ZicZac Vers can be written as it
stands.

## Solution

Follow ADR-0003 (`docs/adr/0003-auftakt-als-taktende.md`) and the glossary's **Auftakt**:

- A Vers has an optional Auftakt: the tail end of a Takt in the Vers's Taktart, with Schläge
  (and Pausen) at the positions they would have in a full Takt.
- It is drawn before the Vers's first Taktstrich; a repeated Vers's opening repeat sign stands
  after it, at Takt 1.
- A Ruf in the Auftakt lands on Takt 1.
- In playback it sounds first at the start of the Marsch, and again over the end of the
  preceding last Takt whenever the music returns to Takt 1 of its Vers: on a repeat, and at the
  move from the previous Vers. That stretch of the last Takt must hold only Pausen.

The deliverable: `npm run dev` shows the 2/4 Vers opening with ZicZac's free Fünferruf before
the first Taktstrich, the Bogen reaching into Takt 1, the repeat sign after it; playing it, the
Ruf sounds before Takt 1 and again over the closing Viertelpause before the repeat.

## User Stories

1. As a drummer, I want a Vers to open with an Auftakt drawn before its first Taktstrich, so
   that ZicZac's Verse can be written as printed.
2. As a drummer, I want a free Fünferruf in the Auftakt drawn small and unbeamed, with its
   Bogen to its Landung on Takt 1, like any free Ruf before a Zählzeit.
3. As a drummer, I want two Sechzehntel in an Auftakt beamed together, as in ZicZac Vers 6.
4. As a drummer, I want the opening repeat sign after the Auftakt, so that the sign shows where
   the repeat returns.
5. As a drummer, I want to hear the Auftakt again before the repeat and before the next Vers,
   over the Pause that ends the last Takt, so that playback sounds as the Marsch is played.
6. As an author, I want an Auftakt that would replay over a sounding Schlag, an empty Auftakt,
   or one as long as a whole Takt, rejected with an error naming the Vers.

## Implementation Decisions

**Model.** `Vers` gains `auftakt?: Takt`. Its Schläge and Pausen have positions in a full Takt
of the Vers's Taktart. Its **start** is its first Schlag's position; its length is Takt length
minus start. `pruefeMarsch` requires, else a named error (e.g. `UngueltigerAuftaktError`, with
the Vers number):

- the Auftakt holds at least one Schlag, its first element is a Schlag, and its start is
  greater than 0 (shorter than a Takt);
- its Schläge and Pausen tile from its start to the Takt's end (the Pausen spec's tiling check,
  from the start instead of 0);
- **replay**: for every place it is replayed — the Vers's own last Takt if `wiederholungen` is
  2, and the previous Vers's last Takt if there is a previous Vers — the final stretch of that
  Takt as long as the Auftakt holds no part of any Schlag (no Schlag's [position,
  position + wert) overlaps it). Length is compared in **Zählzeiten** (Tempo holds the pulse
  across Taktarten, see `GLOSSARY.md` **Tempo**): an Auftakt of half a Zählzeit in 2/4 covers
  the last half Zählzeit (3/16) of a 6/8 Takt.

**Landung.** The model's Landung lookup (exported by `.scratch/aufraeumen/` issue 02) crosses
from the Auftakt into Takt 1: the abstand from an Auftakt Schlag to Takt 1's first Schlag is
Takt length − its position + that Schlag's position. Ruf checks run on the Auftakt too. A
Landung in the next Vers or across the repeat is still out of scope.

**Layout.** The Auftakt sits between the Taktart and the first Taktstrich, on the same rhythmic
x scale as the Takte, its width proportional to its length. The Notenlinie starts at the
Auftakt. No Taktstrich before it. Grouping, Balken and the free-Ruf rule work on its full-Takt
positions unchanged: an Achtel Fünferruf at 3/8 in 2/4 is free and small; two Sechzehntel at
3/8 and 7/16 form one Balkengruppe. The first Taktstrich after the Auftakt carries the opening
repeat sign of a repeated Vers. `legeBoegen` draws the Bogen from an Auftakt Ruf to its Landung
on Takt 1.

**Playback.** The Marsch's time 0 is the start of the first Vers's Auftakt, if it has one. At
the end of each pass through a Vers, the Auftakt of the Vers that comes next in time (the same
Vers on a repeat, else the next Vers) is played so that it ends exactly at the end of the last
Takt. The very first Auftakt plays before Takt 1. Timing goes through Zählzeiten like
everything else in `abspielplan`.

**Übungsmarsch.**

- The 2/4 Vers gets ZicZac Vers 1's Auftakt: a Fünferruf rechts, Achtel, at 3/8, landing on
  Takt 1's first Schlag (rechts Achtel). Crop and enlarge (`sips -Z 1400`) the opening of ZicZac
  Vers 1 before transcribing. The Vers becomes `wiederholungen: 2`. Its last Takt already ends
  on a Viertel + Viertelpause (Pausen spec), which the replay covers.
- The 2/4 Vers's Auftakt is also replayed over the end of the 6/8 Vers's last Takt, which today
  ends on a sounding punktierte Viertel. Add a closing Takt to the 6/8 Vers: punktierte Viertel,
  Achtel, Viertelpause (positions 0, 3/8, 1/2), so the 6/8 Vers ends on a Pause. Keep the
  existing Takte.
- ZicZac Vers 6's Sechzehntel Auftakt goes into a layout test only.

## Testing Decisions

At the seam, relationships over constants.

- Model: a valid Auftakt passes; empty, starting with a Pause, full-length, and not tiling each
  throw; replay over a sounding Schlag throws — on a repeat, from the previous Vers, and across
  Taktarten (2/4 Auftakt into a 6/8 Takt); a Ruf in the Auftakt landing on Takt 1 passes, one
  landing wrong throws.
- Layout: every Auftakt glyph lies left of the first Taktstrich and right of the Taktart; the
  first Taktstrich is the opening repeat sign when the Vers repeats; an Achtel Fünferruf Auftakt
  is drawn free (no Balken, smaller head) with a Bogen whose far end is over Takt 1's first
  Notenkopf; two Sechzehntel in an Auftakt share one Balkengruppe with two Balken levels; a
  Vers without Auftakt lays out exactly as before.
- Playback: the first Anschlag of the Marsch is the Auftakt's (or its Vorschlag), and Takt 1's
  first Schlag falls exactly one Auftakt-length later; on a repeat the Auftakt's Schläge fall
  inside the last Takt, ending at its end; a Vers without Auftakt plays as before.
- The Übungsmarsch lays out and plays without throwing.

## Out of Scope

The short free Ruf (ZicZac Vers 1 Takt 9, Vers 3 Takt 2), an open model question; Voltas (the
1./2. endings of ZicZac Vers 5 and 6); Schluss; a Landung across Verse or across the repeat; a
Marsch-level Auftakt distinct from the first Vers's.

## Further Notes

Decided in the 2026-10-11 grilling for the AFK session; ADR-0003 records why the Auftakt is the
tail end of a Takt. ZicZac draws no opening repeat sign at all; Drumba keeps its own and places
it after the Auftakt.

## Comments

**Closed 2026-10-11.** Specified in `7ff0536` with ADR-0003, built in `1e96210` (model),
`ffacb7f` (drawing) and `07eadef` (playback). It looks and sounds right. Notes beyond the spec:

- The 2/4 Vers of the Übungsmarsch is played twice and opens with a free Fünferruf; both Verse
  end on a Viertelpause it replays over.
- The Übungsmarsch opens with a Vers without Auftakt, so "the Marsch begins with the Auftakt" is
  covered by tests only.

Loose ends:

- An Auftakt after an empty Vers is checked against nothing.
- ZicZac sets the Ruf's "5" beside the free Ruf; Drumba sets it over the middle of the Bogen.
