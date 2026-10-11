# Siebnerruf — the 7er in ZicZac, Vers 1, Takt 4

Status: ready-for-agent

## Problem Statement

The Übungsmarsch follows ZicZac Vers 1 one Takt at a time, and Takt 4 is the first it cannot
hold. The Dreierruf of the Tagwachtstreich lands on Takt 4's downbeat, and right after it, before
Zählzeit 2, the original writes a small free **Siebnerruf** starting links: a dotted head with a
Fahne and two Wirbel slashes, a "7", and a Bogen to the rechts Achtel on 1/4. The Übungsmarsch
stands in for it with punktierte Achtel and Sechzehntel.

The Siebnerruf brings three things the Fünferruf did not: a Landung in the **other** Hand, a
Ruf of dotted value, and a Ruf with no Schlepp. Until the model holds it, Takt 4 is made up.

## Solution

Add the **Siebnerruf** to the model, playback and layout, and write Takt 4 of the Übungsmarsch
as the original has it.

A Siebnerruf is seven strokes: links, links, rechts, rechts, links, links, then the Landung
rechts, or the mirror. The first six are evenly spaced and fill exactly a punktierte Achtel. The
seventh is the **Landung**, the next ordinary Schlag, 3/16 later and in the other Hand
(ADR-0002). It is drawn like a Fünferruf without its Vorschlag: Notenkopf, Punkt, Hals with
Wirbel slashes, a "7" and a Bogen to the Landung.

The deliverable: `npm run dev` shows and plays Takt 4 as in ZicZac, and `npm test` proves the
Siebnerruf's timing, geometry and validity.

## User Stories

1. As a drummer, I want to see a Siebnerruf drawn the way ZicZac draws it — a small dotted head
   with a Wirbel, a "7" and a Bogen to its Landung — so that I recognise it.
2. As a drummer, I want to hear a Siebnerruf links as six even strokes L L R R L L followed by
   its Landung rechts, so that I can learn how it sounds.
3. As a drummer, I want a Siebnerruf starting rechts to be possible, played mirrored, landing
   links.
4. As a drummer, I want Takt 4 of the Übungsmarsch to be ZicZac Vers 1, Takt 4, so that the
   Übungsmarsch keeps growing toward the real Marsch.
5. As a developer, I want a Siebnerruf without a valid Landung, or of any value other than a
   punktierte Achtel, to be rejected, so that it is never drawn or played wrong.
6. As a developer, I want its strokes, Bogen and Wirbel asserted through the existing seams,
   like the Fünferruf's.

## Implementation Decisions

**Model.** Add `"Siebnerruf"` to the flat `Figur` set: one Schlag on its **first** stroke, with
its own Hand, position and `wert` 3/16, as ADR-0002 does for the Fünferruf. No new ADR. The
Dreierruf sits on its Landung (ADR-0004) only because it has no head or value of its own; the
Siebnerruf has both.

**`FIGURMERKMALE`.** What differs between the Rufe moves into the table rather than into
`if`s on the Figur:

- no Vorschlag;
- `ruf`: 7 Schläge, the duration the Ruf fills (3/16), and which Hand the Landung is in —
  the other. The Fünferruf gets its 1/8 and "same Hand" there too, replacing
  `FUENFERRUF_DAUER`. The exact field shape is the implementer's choice.

**Validity.** `pruefeLandung` reads the Ruf's entry: the Landung is the next Schlag, a Dupfe,
exactly the Ruf's duration later, in the Hand the Ruf calls for. A Siebnerruf whose `wert` is
not 3/16 is invalid too. Both throw `UngueltigerRufError`, whose message must stop saying
"eine Achtel spaeter in derselben Hand" and name what the Ruf in question expects.

**Playback.** A Siebnerruf links at position _p_ yields six strokes at _p_ + _i_ · 1/32,
_i_ = 0…5, in the Hands L L R R L L (mirrored for rechts), at full volume, and no Vorschlag.
The Landung plays as its own Schlag. The spacing comes from "six even strokes in the Ruf's
duration", read from `FIGURMERKMALE`, the same way the Fünferruf's four come from its 1/8.

**Layout.** Nothing new beyond what the Ruf entry says. The Siebnerruf in Takt 4 is not on a
Zählzeit, so it is a free Ruf: small head, short Hals, its own Fahne, unbeamed. It gets a
Punkt like any dotted value, Wirbel slashes (2, as the Fünferruf's), `rufZahl` "7", and a
`bogen` from its Notenkopf to the Landung's. It is the first Ruf drawn **links**: its Bogen
starts at a head below the Notenlinie and ends at one above it. Place the Bogen's start by eye
against the crop of ZicZac Vers 1, Takt 4; the Fünferruf spec left this open.

**Übungsmarsch, 2/4-Vers, Takt 4** becomes ZicZac Vers 1, Takt 4:

- Dreierruf rechts on 0, Sechzehntel — the Landung of the Tagwachtstreich, as before;
- Siebnerruf links on 1/16, punktierte Achtel;
- Dupfe rechts on 1/4, Achtel — the Siebnerruf's Landung;
- Dupfe links on 3/8, Achtel, beamed with it.

The old Takt 4 (punktierte Achtel, Sechzehntel, twice) goes. Its Stummel toward the Punkt is
covered in `layout.test.ts` ("gibt der Sechzehntel nach einer punktierten Achtel einen Stummel
nach links"); `uebungsmarsch.test.ts` still needs Stummel in both directions, which Takt 1
provides. Its "all Figuren" test gains `Siebnerruf`.

## Testing Decisions

**What makes a good test here.** As in the earlier specs: call `layout`, `abspielplan` or
`pruefeMarsch`, assert on the data, and assert on relationships rather than constants chosen
by eye or ear.

**Coverage to hit.**

- Model: a Siebnerruf links landing rechts 3/16 later passes. Rejected: Landung in the same
  Hand; Landung not exactly 3/16 later; Landung not a Dupfe; no next Schlag; `wert` other than
  3/16. The Fünferruf's existing checks still pass unchanged.
- Playback: a Siebnerruf links yields six strokes L L R R L L, evenly spaced, spanning less
  than 3/16, with no Vorschlag; the Landung sounds 3/16 after the first stroke. A rechts
  Siebnerruf is mirrored. Its stroke spacing equals a Fünferruf's at the same Taktart and
  Tempo. An invalid Siebnerruf throws.
- Layout: the Siebnerruf has no Vorschlag, a Punkt, Wirbel slashes and a `rufZahl` "7"; its
  `bogen` runs from its Notenkopf (below the line) to the Landung's (above it). Free when not
  on a Zählzeit. An invalid one throws.

## Out of Scope

- **The Schlag before a free Ruf drawn with the Ruf's value added.** The original writes Takt
  4's downbeat as a Viertel (Sechzehntel plus the Ruf's punktierte Achtel), and the Viertel
  before the free Fünferruf in Vers 1, Takt 8 likewise. Drumba draws the played value, so the
  downbeat gets a Sechzehntel's two Fahnen. A drawing rule for every free Ruf; its own slice.
- **Siebnerruf mit Schlepp**, **mit Nachschlag** (the Achterruf), on a Zählzeit, or beamed.
- **The other Rufe**: 9, 11 (Vers 2, Takt 4) and 15, and a general "Ruf of _n_ strokes".
- **The Fünferruf ohne Schlepp**, a Landung across Verse or repeats, dynamics.
- Everything still out of scope from earlier specs: editing, persistence, Hieroglyphen,
  Pfeife.

## Further Notes

`GLOSSARY.md` gained **Siebnerruf**; **Landung** no longer claims every Ruf lands in the Hand
it started with (the Dreierruf never did). Source: `ZicZac.pdf`, Vers 1, Takt 4 — crop it with
`scripts/ausschnitt.sh` (about y 340, x 725, 160 × 140 on the 2400 px render).
