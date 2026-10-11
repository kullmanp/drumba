# Tole — the Quintole of ZicZac Vers 1, Takt 3

Status: done

## Problem Statement

The goal is ZicZac as the whole Übungsmarsch. ZicZac Vers 1, Takt 3 (`ziczac-takt3.png`) has a
"5" under the Balken of its second Zählzeit: a **Quintole**, five Sechzehntel played in the
time of four. Drumba has no Tole. A Takt is filled by its written values, so Achtel +
Sechzehntel + Achtel in one Zählzeit of 2/4 is an overrun. There is also no way to place those
Schläge where they are played, and no way to draw the "5".

## Solution

A **Tole** (see `GLOSSARY.md`) is _n_ Schläge of a written value played in the time of _m_. A
Takt holds its Tolen as a list next to its Schläge and Pausen. A Schlag inside a Tole keeps its
written value and stores its **played** exact position, so layout and playback read positions
as they do now. The model check scales written values inside a Tole by _m/n_ when it checks
that the Takt is filled. The layout draws _n_ centred under the Balken of the Tole's Schläge.

The model is general from the start, because Triolen, Sechstolen and Siebentolen will follow.
Only the Quintole is built into the Übungsmarsch and tested.

The deliverable: `npm run dev` shows ZicZac Vers 1, Takt 3 without its Dreierruf marks (see
the Dreierruf spec), with the "5" under the second Balkengruppe. Playback plays the second
Zählzeit as a Quintole, and `npm test` proves the fill check and the number's place.

## User Stories

1. As an author, I want to write a Quintole as its written values (Achtel, Sechzehntel,
   Achtel), so that the score reads like the original.
2. As an author, I want a Takt holding a Quintole to pass the check only when the Quintole is
   filled exactly, so that a mistyped Tole is caught like any gap or overlap.
3. As a drummer, I want to see the "5" under the Balken of the Quintole's Schläge.
4. As a drummer, I want to hear the Quintole's Schläge at their played times: five evenly
   spaced Sechzehntel in the time of four.
5. As a developer, I want the number emitted by the layout with its position, so that it is
   asserted as data like every other mark.

## Implementation Decisions

**Model.**

- `Takt` gains `tolen: readonly Tole[]`. A Tole has a `position` (where it starts in the Takt,
  played), an `anzahl` _n_, a `statt` _m_ and an `einheit` (the written value counted, as a
  `Bruch`; 1/16 for the Quintole). It lasts `statt × einheit`: a Quintole of Sechzehntel lasts
  a quarter.
- Choose the field names to read like the surrounding code. Make `tolen` required, as
  `pausen` is, and give existing Takte `tolen: []`.
- Positions inside a Tole are the played ones: in Takt 3 of 2/4, the Quintole's Schläge sit
  at 1/4, 7/20 and 2/5. Their `wert` stays written: 1/8, 1/16 and 1/8.
- A Schlag or Pause belongs to a Tole when its position lies inside the Tole's span.
- **Checks** (`pruefeMarsch`), each with an error naming Vers and Takt:
  - A Tole lies inside its Takt.
  - Tolen don't overlap.
  - A Tole is filled exactly: its elements' written values, each scaled by _m/n_, run from
    its start to its end with no gap or overlap.
  - The Takt's fill check treats the Tole's elements by their played length (`wert × m/n`).
    The simplest fix is for `fuellfehler` and the overrun check to use a played length for
    every element, which equals `wert` outside a Tole.
- A Tole need not match a Zählzeit. A Triole of Viertel in 2/4 spans the whole Takt.

**Layout.**

- Horizontal placement is unchanged: x already comes from the played position.
- Balkengruppen are still formed by Zählzeit. The number of Balken still comes from the
  written value, so the Quintole is drawn with one Balken and a left Balkenstummel on its
  Sechzehntel, as in the original.
- A new glyph carries the Tole's number at a point centred under the Balken of its Schläge:
  x halfway between its first and last Hals, y a fixed distance below the lowest Balken.
  `rufZahl` is the nearest existing text glyph. Reuse it if it reads well, otherwise add a
  `toleZahl`.

**Renderer.** The number is drawn as text like the Wirbel's number, a little smaller.

**Playback.** No change: Anschläge come from the played positions. A test proves it.

**Übungsmarsch.** ZicZac Vers 1, Takt 3 goes into the 2/4 Vers as a new Takt 3, after the
three Doublés, so the Vers grows to seven Takte:

- **First Zählzeit:** Double rechts at 0, Dupfe links at 1/16, Dupfe rechts at 1/8, Dupfe rechts
  at 3/16, all Sechzehntel.
- **Second Zählzeit:** a Quintole (5 Sechzehntel statt 4) at 1/4, holding Dupfe links at 1/4
  (Achtel), Dupfe links at 7/20 (Sechzehntel) and Dupfe rechts at 2/5 (Achtel).
- Update the file's header comment.

## Testing Decisions

At the seam, relationships over constants (`CODING_STANDARDS.md`).

- **Model:**
  - ZicZac Takt 3 passes `pruefeMarsch`.
  - Each of these is rejected with the right error: a Quintole one Sechzehntel short, one
    Sechzehntel long, the same Schläge without a Tole, a Tole reaching past the Takt's end,
    and two overlapping Tolen.
  - A Triole of three Achtel statt two passes, which shows the model is not Quintole-only.
- **Layout:**
  - The Tole's number is centred between the first and last Hals of its Schläge and lies
    below their Balken.
  - A Takt without a Tole has no number.
  - The Quintole's Sechzehntel has one Balkenstummel pointing left.
- **Playback:** the Quintole's three Schläge are played at the start of the Zählzeit and at 2/5
  and 3/5 of it, at the given Tempo.
- The Übungsmarsch lays out and plays without throwing.

## Out of Scope

- The two Dreierruf marks in Takt 3 and the Dreierruf into Takt 4, which are the next slice
  (`.scratch/dreierruf/spec.md`).
- A Tole number under a single Notenkopf, and a Tole with a bracket.
- Nested Tolen.
- Tolen in Hieroglyphen.

## Further Notes

Decided in the 2026-10-11 grilling. The Doublé spec called the "5" "the Ruf marked 5 under the
Balken". That was wrong: it is a Quintole. A Ruf is marked by its Wirbel.

Reference: `~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf`, cropped in
`ziczac-takt3.png`.

## Comments

**2026-10-11, built (agent), awaiting your check.** Commit "Write ZicZac Vers 1, Takt 3 with its
Quintole". Screenshot `drumba-takt3.png` beside `ziczac-takt3.png`.

- The "5" is a new `toleZahl` glyph rather than `rufZahl`: its `y` is the number's top edge
  (it hangs under the Balken, the renderer uses `dominantBaseline="hanging"`), where `rufZahl`
  gives a baseline above a Bogen. It is drawn upright, as in the original, not italic like the
  Wirbel's number.
- "The same Schläge without a Tole" is rejected as an overrun (`UngueltigerTaktError`): the
  last Achtel at 2/5 runs past the Takt's end before the overlap at 7/20 is reached.
- Tolen are checked before the Takt's own fill, so a mis-filled Tole is reported as an
  `UngueltigeToleError`, not as a gap in the Takt.
- Loose end: the Fünferruf's Landung check still measures exactly an Achtel; a Ruf inside a
  Tole would be rejected. No original needs it yet.

**Closed 2026-10-11.** Specified in `d94d7ec`, built in `46751d9` (Tolen in the model, the
Tole's number in the layout, ZicZac Vers 1, Takt 3 in the Übungsmarsch), with a fix in
`f5da8f1`: the fill check had stopped seeing an Auftakt's Schläge out of order. Where the result
departs from the spec:

- The number is a new `toleZahl` glyph, whose `y` is its top edge, drawn upright, not
  `rufZahl`.
- The same Schläge without a Tole are rejected as an overrun (`UngueltigerTaktError`), not as an
  overlap.

Loose ends:

- A Fünferruf inside a Tole would be rejected: its Landung check measures exactly an Achtel.
- A Tole number under a single Notenkopf, bracketed Tolen and nested Tolen are not built.
