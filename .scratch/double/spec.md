# Doublé

Status: done

## Problem Statement

The goal is ZicZac as the whole Übungsmarsch, so the next figure is the one ZicZac uses
first: the **Doublé**. ZicZac Vers 1, Takt 2 is three Doublés after an Achtelpause, and Takt 3
opens with one. Drumba has no Doublé, so the Übungsmarsch writes Takt 2 as plain Dupfen: it
looks wrong (the flag on each Vorschlag line is missing) and sounds wrong (no Vorschlag, no
soft Dupfe).

## Solution

A **Doublé** (see `GLOSSARY.md`) is a new Figur: a Schlepp preceded by a soft Dupfe in the
Schlepp's own Hand, a Sechzehntel before the main stroke. Like a Schlepp, it is one Schlag at
the main stroke's position and Hand; the soft Dupfe and the Vorschlag belong to the figure and
take no room in the Takt. The layout draws it as a Schlepp whose Vorschlag line carries a Fahne
at its top. Playback adds the soft Dupfe at half the main stroke's loudness, and the Vorschlag
of every figure drops to about 0.3.

The deliverable: `npm run dev` shows ZicZac Vers 1, Takt 2 with three Doublés that look like
the ZicZac crop and sound like a Doublé, and `npm test` proves the soft Dupfe's time, Hand and
loudness and the flag's place.

## User Stories

1. As an author, I want to write a Doublé as one Schlag, so that a Takt of Doublés is filled
   by their main strokes' values like any other Takt.
2. As a drummer, I want a Doublé drawn as in the originals, a Schlepp whose Vorschlag line
   carries a Fahne at its top, so that I tell it from a Schlepp at a glance.
3. As a drummer, I want to hear the soft Dupfe a Sechzehntel before the Schlepp, in the main
   stroke's Hand, at any Tempo and in any Taktart.
4. As a drummer, I want the soft Dupfe to sound louder than the Vorschlag and softer than the
   main stroke.
5. As a developer, I want the flag emitted by the layout with its position, so that it is
   asserted as data like every other mark.

## Implementation Decisions

**Model.** `Figur` gains `"Double"` (the glossary's Doublé in ASCII). `FIGURMERKMALE` says what
makes it one: it has a Vorschlag, like the Schlepp, and a soft Dupfe in the main Hand a
Sechzehntel (1/16, a Notenwert, so it scales with Tempo) before the main stroke. Put that
distance in the table, not in playback, so layout and playback read one source. No new check:
the soft Dupfe may fall on the previous Schlag's time, into the previous Takt, or before the
Marsch starts, as a Vorschlag can.

**Layout.** A Doublé lays out exactly as a Schlepp (Notenkopf, Hals, Balken or Fahne,
Vorschlag line), plus one Fahne at the top of the Vorschlag line, falling to the right. Its
value does not matter: a Doublé carries the flag whether it is an Achtel, a Sechzehntel or a
beamed Schlag. The `fahne` glyph needs to say which end it hangs from (the lower end of a Hals,
rising, or the top of a Vorschlag line, falling); the layout gives the point, the renderer the
shape.

**Renderer.** The flag on the Vorschlag reuses the existing straight Fahne line, mirrored to
fall from the top. A truer curved Fahne for both is a later refinement.

**Playback.** A Doublé yields three Anschläge: the soft Dupfe in the main Hand a Sechzehntel
before the main stroke, at 0.5; the Vorschlag in the other Hand, as for a Schlepp; the main
stroke at 1. `VORSCHLAG_LAUTSTAERKE` drops from 0.5 to about 0.3 for every figure with a
Vorschlag. Both values are by ear; the human tunes them after listening.

**Übungsmarsch.** ZicZac Vers 1, Takt 2 becomes Achtelpause, Doublé links (1/8), Doublé rechts
(1/4), Doublé links (3/8), all Achtel. Read the Hands again from a crop of that one Takt
(`scripts/ausschnitt.sh`) before writing them.

## Testing Decisions

At the seam, relationships over constants (`CODING_STANDARDS.md`).

- Model: a Takt of Doublés filled by their values passes `pruefeMarsch`; a Doublé on position 0
  of Takt 1 passes.
- Layout: a Doublé has everything a Schlepp at the same place has, plus one flag whose point is
  the top of its Vorschlag line; a Schlepp and a Dupfe have no such flag; the flag is there on
  an Achtel, a Sechzehntel and a beamed Schlag alike.
- Playback: a Doublé's soft Dupfe is in the main Hand, exactly a Sechzehntel before the main
  stroke at the given Tempo, in 2/4 and in 6/8; it is louder than the Vorschlag and softer than
  the main stroke; a Doublé on time 0 puts its soft Dupfe before 0; a Schlepp still yields no
  soft Dupfe.
- The Übungsmarsch lays out and plays without throwing.

## Out of Scope

The rest of ZicZac Vers 1, Takt 3 (the stacked dots and the Ruf marked "5" under the Balken),
which is the next slice; a curved Fahne; accents and dynamics; Doublés in Hieroglyphen.

## Further Notes

Decided in the 2026-10-11 grilling. This answers the closed Pausen spec's loose end: the
flagged line above each Achtel of ZicZac Vers 1, Takt 2 is the Doublé. Reference:
`~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf`; crop with
`scripts/ausschnitt.sh`.

## Comments

**Closed 2026-10-11.** Specified in `ba8fa07`, built in `e2a2f2e` (the Doublé in the model and
playback), `0c6f009` (drawing it, and ZicZac Vers 1, Takt 2 in the Übungsmarsch) and `90619ba`
(the flag tested on both Hands). Where the result departs from the spec:

- The flag on the Vorschlag is drawn at the Vorschlag's stroke weight, not the Hals's.
- The `fahne` glyph names its end as `haengtAn: "hals" | "vorschlag"`.

Loose ends:

- The flag is a straight line; the original's is a curved hook, as is every Fahne's.
- The soft Dupfe's loudness is a fixed 0.5, not half the main stroke's: the two agree only while
  every main stroke is at 1, and will part once accents arrive.
- The loudness values (soft Dupfe 0.5, Vorschlag 0.3) are still first guesses, not tuned by ear.
- The rest of ZicZac Vers 1, Takt 3 is the next slice.
