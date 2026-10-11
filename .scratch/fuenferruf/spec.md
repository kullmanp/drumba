# Fünferruf — first Ruf

Status: ready-for-agent

## Problem Statement

Drumba can draw and play **Dupfe** and **Schlepp**, but almost no real **Marsch** gets by
without a **Ruf**. ZicZac has a **Fünferruf** in nearly every **Vers**. The Übungsmarsch had its
two Rufe swapped for a Schlepp and a Dupfe because the model could not hold them. Until the
model can say "Fünferruf", every Marsch it holds is a simplified one, and an editor built on
that model would only write Märsche that don't exist.

The Ruf is also the first figure that reaches past its own Schlag. Its sound runs into the
next Schlag, the **Landung**, and its drawing slurs to it, often across a **Taktstrich**. That
tests whether the model's one-Schlag-at-a-time shape holds up.

## Solution

Add the **Fünferruf mit Schlepp** to the model, the layout and playback, and put two of them
back into the Übungsmarsch.

A Fünferruf is five strokes: Schlepp rechts, Dupfe rechts, Dupfe links, Dupfe links, Dupfe
rechts. The first four are evenly spaced and fill exactly an Achtel. The fifth is the
**Landung**, which is the next ordinary Schlag, 1/8 later and in the same Hand (ADR-0002).
It is drawn as a Schlepp whose Hals carries the **Wirbel**: slashes across the Hals, a "5"
above, and a slur to the Landung.

The deliverable: `npm run dev` shows and plays the Übungsmarsch with its Fünferrufe, and
`npm test` proves their geometry and timing.

## User Stories

1. As a drummer, I want to see a Fünferruf drawn the way the originals draw it, with the
   Schlepp head, the slashed Hals, a "5" and a slur to its Landung, so that I recognise it
   at a glance.
2. As a drummer, I want the slur to reach across a Taktstrich when the Ruf lands on the next
   downbeat, so that the most common placement of a Ruf reads correctly.
3. As a drummer, I want to hear a Fünferruf as a soft Vorschlag, then four even strokes in
   the order rechts, rechts, links, links, then the Landung, so that I can learn how it sounds.
4. As a drummer, I want a Fünferruf in 6/8 to sound faster than one in 2/4 at the same Tempo,
   because it always fills exactly an Achtel.
5. As a drummer, I want a Fünferruf starting links to be possible, played mirrored, so that
   the rare left-hand version can be written down.
6. As a developer, I want a Fünferruf without a valid Landung to be rejected by both layout
   and playback, so that a Ruf that lands nowhere is never drawn or played.
7. As a developer, I want the Ruf's strokes and the Wirbel's positions asserted as data
   through the existing seams, so that the figure is tested like the others.

## Implementation Decisions

**Model.** Add `"Fuenferruf"` to the flat `Figur` set. Code files carry no umlauts, so the
glossary's Fünferruf is spelled this way. A Fünferruf is one Schlag with its own Hand,
position and `wert` 1/8. There is no new field on `Schlag`. The Landung is the following
Schlag, as ADR-0002 records.

**Hand.** Explicit, as on every Schlag. Rechts is the norm. Links is allowed and plays
mirrored: Schlepp links, links, rechts, rechts, and then a Landung links.

**Validity.** A new model function finds the first Fünferruf without a valid Landung. A valid
Landung must meet three conditions:

- It is the next Schlag after the Ruf, in the same Takt or in the next Takt of the same Vers.
- It sits exactly 1/8 after the Ruf's position, measured across the Taktstrich when it falls
  in the next Takt.
- It is played in the Ruf's Hand.

A Ruf whose Landung would fall outside its Vers (at the end of a Vers, or across a repeat) is
invalid for now. Layout and playback both throw a new `UngueltigerRufError` for any violation.
While adding this, fold the duplicated overrun walk over a Marsch (a loose end from playback)
into one model function that both layout and playback call.

**Playback.** A Fünferruf at position _p_ yields:

- a Vorschlag in the other Hand, `VORSCHLAG_VORLAUF` before _p_, at Vorschlag volume, as for a
  Schlepp
- four strokes at _p_, _p_ + 1/32, _p_ + 2/32 and _p_ + 3/32, in the Hands R, R, L, L
  (mirrored for links), all at full volume

The Landung plays as its own Schlag. All positions are exact fractions until the final
conversion to seconds. Because the stroke spacing is measured in notated value, a Fünferruf
in 6/8 plays faster than one in 2/4 at the same Tempo without any extra code.

**Layout.** The Ruf's Notenkopf, Hals and Vorschlag are drawn as for a Schlepp. On top of
that, the layout emits:

- `bogen`: the slur, with its start point at the Ruf's Notenkopf and its end point at the
  Landung's Notenkopf. Each Vers is one row, so a slur across a Taktstrich within a Vers never
  breaks across lines.
- `rufZahl`: the "5", positioned above the slur.
- the Wirbel: a slash count (2 for the Fünferruf) on the Ruf's Hals, either as a field on the
  `hals` glyph or as a `wirbel` glyph of its own. The implementer can choose.

**Renderer.** Draws the slur's curve, the number, and the slashes across the Hals. The slash
angle, spacing and weight are the inner shape of a single mark, so they belong here. Measure
them against `2006Trommelfont` if the font contains them; otherwise use placeholders verified
by eye.

**Übungsmarsch.** Add two Fünferrufe, both in Balkengruppen of equal Achtel, because mixed
groups still throw `UngleicheBalkengruppeError`:

- in 6/8, a Ruf that lands within its Takt (e.g. Fünferruf, Landung, Dupfe | …)
- in 2/4 Achtel, a Ruf on the last Achtel of a Takt that lands on the next Takt's downbeat

## Testing Decisions

**What makes a good test here.** The same as the earlier specs: call `layout` or
`abspielplan`, then assert on the data, and assert on relationships rather than constants
chosen by eye or ear.

**Coverage to hit.**

- Model: a valid Ruf passes, and the check catches each of these: no next Schlag; Landung not
  exactly 1/8 later; Landung in the wrong Hand; Landung outside the Vers. A Landung in the next
  Takt is valid.
- Playback: a Fünferruf rechts yields a quieter Vorschlag links before four even strokes R R L
  L that span less than 1/8. The Landung sounds 1/8 after the first stroke. A links Ruf is
  mirrored. The stroke spacing in seconds is shorter in 6/8 than in 2/4 at the same Tempo. An
  invalid Ruf throws.
- Layout: the Ruf has a Vorschlag and a slashed Hals. The `bogen` starts at the Ruf's
  Notenkopf and ends at the Landung's, both within a Takt and across a Taktstrich. The
  `rufZahl` sits above the slur, between its ends. An invalid Ruf throws.

## Out of Scope

- **The other Rufe**: the 3, 7, 9, 11 and 15 strokes.
- **The Fünferruf ohne Schlepp**: the variant with no Vorschlag on the first stroke.
- **Balkenstummel**: no Fünferruf beamed with Sechzehntel, as in ZicZac.
- **A Landung across Verse or repeats**, and a Ruf in an **Auftakt**.
- **Smaller Ruf heads**, and slash counts that vary by Ruf.
- **Dynamics and accents** on the Landung.
- Everything still out of scope from the earlier specs: editing, persistence, Hieroglyphen,
  Pfeife.

## Further Notes

`GLOSSARY.md` holds the terms this slice settled: **Fünferruf**, **Wirbel** and **Landung**.
ADR-0002 records why the Landung is a Schlag of its own.

## Comments

**2026-10-11, after a first look.** A Fünferruf that does not start on a Zählzeit leads into
one and stands free before it: never beamed to the Schläge before it, drawn smaller (head about
two-thirds size, closer to the line, Hals about half as deep) with its own Fahne, measured by
eye against ZicZac. A Fünferruf that starts on a Zählzeit beams as before. Open: the tradition
may have a name for the Ruf that starts on a Zählzeit ("Volltakt-Fünfer"?), unconfirmed, so not
in `GLOSSARY.md` yet.
