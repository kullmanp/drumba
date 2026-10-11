# Starttakt — playback from a chosen Takt

Status: done

## Problem Statement

Play always starts at the beginning of the Marsch. To hear one passage, such as the
**Tagwachtstreich** in Vers 2, Takt 3 of the Übungsmarsch, the drummer has to sit through
everything before it, and has to do that again after every change of Tempo. As the Übungsmarsch
grows toward the whole of ZicZac, this gets worse with every Takt that is added.

## Solution

The drummer clicks a **Takt** in the score. That Takt is marked as the **Starttakt**, and Play
starts there instead of at the beginning. Playback runs from the Starttakt to the end of the
Marsch, as before. Clicking the marked Takt again clears the mark, and Play starts from the
beginning again.

The smallest slice that works: the Starttakt is a whole Takt, chosen by a click, shown by a
mark in the score. It is not a playhead and not a loop.

The deliverable: `npm run dev` lets the drummer click Vers 2, Takt 3, press Play and hear the
Tagwachtstreich straight away. `npm test` proves which Anschläge a Starttakt keeps and when they
sound, and where the layout puts the mark and the click targets.

## User Stories

1. As a drummer, I want to click a Takt to start playback there, so that I can listen to one
   passage without waiting through the whole Marsch.
2. As a drummer, I want to see which Takt playback will start from, so that I know what Play
   will do.
3. As a drummer, I want to clear the Starttakt, so that I can hear the whole Marsch again.
4. As a drummer, I want the Starttakt to stay set while I change the Tempo and press Play
   again, so that I can practise one passage at rising speed.
5. As a drummer, I want a figure on the Starttakt's first Schlag to sound whole, so that a
   Doublé's soft Dupfe, a Vorschlag or a Dreierruf's rolled Dupfe are not cut off.
6. As a drummer, I want a Vers's **Auftakt** to play when I start from its Takt 1, so that the
   Vers begins as it is written.
7. As a developer, I want the Starttakt applied by the pure timing function, so that what is
   played from a Starttakt is asserted as data, like all other timing.

## Implementation Decisions

**Model.** No change. The Starttakt is a playback and display setting, not part of the
Marsch. It is a place: a Vers index and a Takt index, both from 0.

**Playback.**

- `abspielplan(marsch, tempo, starttakt?)`. Without a Starttakt the plan is unchanged.
- With one, the plan holds the Anschläge of every Schlag from the Starttakt onward, in the
  first Durchgang of its Vers, and then everything after it as before: the rest of the Vers,
  its repeat if it has one, and the following Verse.
- A Schlag's Anschläge stay together: a Schlag kept by the Starttakt keeps its soft Dupfe, its
  Vorschlag and its rolled Dupfe, even when they sound before the Starttakt's beginning. A
  Schlag before the Starttakt contributes nothing, even when its sound reaches past the
  Taktstrich. The boundary is strict for a Ruf too: a Fünferruf at the end of Takt 2 whose
  Landung opens Takt 3 is dropped when Takt 3 is the Starttakt, and its Landung sounds alone,
  as a Dupfe. The Ruf is written in Takt 2; to hear it, start there. (A Dreierruf sits on its
  Landung, ADR-0004, so it is kept whole.)
- If the Starttakt is Takt 1 of a Vers with an Auftakt, the Auftakt is played first.
- Time 0 is the Starttakt's beginning, or the Auftakt's beginning when the Auftakt is played.
  Anything that belongs to a kept Schlag and sounds earlier gets a negative time, as a leading
  Vorschlag does today, and the adapter's lead-in already copes with that. A Starttakt that
  opens with a Pause keeps that silence: its first Anschlag falls at its written position.
- The rolled Dupfe of a Dreierruf on the Starttakt's first Schlag still measure their gap from
  the Schlag written before it, even though that Schlag is not played. That keeps their
  rhythm the same as when the Marsch is played from the beginning.
- A Starttakt that does not exist in the Marsch throws a named error.

**Layout.**

- `layout(marsch, starttakt?)`.
- For every Takt the layout emits a `taktflaeche` glyph: its x range from Taktstrich to
  Taktstrich, a y range covering the Vers's notation, and its Vers and Takt index. It is the
  click target, and the layout gives its bounds so the renderer computes no x. Takt 1's starts
  at the Vers's first Taktstrich: the Auftakt before it has no click target, since starting
  from Takt 1 plays it anyway.
- With a Starttakt, the layout emits one `starttakt` glyph over that Takt's span.

**Renderer.**

- Each `taktflaeche` is a transparent rectangle with a pointer cursor. A click reports its Vers
  and Takt index.
- The `starttakt` glyph is a faint tinted band behind the notation of its Takt, drawn before the
  notes so it never covers ink.

**App.** `App` holds the Starttakt in state beside the Tempo. A click on a Takt sets it, and a
click on the Starttakt clears it. Play passes it to `abspielplan`, and the score passes it to
`layout`. Clicking while playback runs only moves the mark; the new Starttakt applies on the
next Play, as a new Tempo does.

## Testing Decisions

At the seams, relationships over constants (`CODING_STANDARDS.md`).

- **Playback:**
  - Without a Starttakt, the plan is the same as today.
  - From a Starttakt in the middle of a Vers: the first Anschlag is the Starttakt's first
    Schlag at its position from time 0, the Starttakt's beginning, and the plan then matches the tail of the full plan shifted by the
    Starttakt's start time.
  - A Vers with Wiederholungen 2, started from its last Takt, plays that Takt, then the whole
    Vers again.
  - From Takt 1 of a Vers with an Auftakt, the Auftakt is played first.
  - A Doublé on the Starttakt's first Schlag keeps its soft Dupfe, at a negative time.
  - A Dreierruf on the Starttakt's first Schlag keeps its rolled Dupfe at the same distances
    from it as in the full plan.
  - A Fünferruf whose Landung opens the Starttakt is not played; the Landung is.
  - A Starttakt opening with a Pause has its first Anschlag after time 0.
  - A Starttakt outside the Marsch is rejected.
- **Layout:**
  - Every Takt has one `taktflaeche`, and neighbouring ones meet at their shared Taktstrich.
  - The `starttakt` glyph spans its Takt's `taktflaeche`.
  - Without a Starttakt there is no `starttakt` glyph.

## Out of Scope

- A playhead that follows the sound.
- Looping a passage, and an end point.
- Starting mid-Takt, from a Schlag, or in a Vers's second Durchgang.
- Starting from the Auftakt itself.
- A count-in or metronome before the Starttakt.
- Keyboard control.
- Remembering the Starttakt across page loads.

## Decisions

Settled in a grilling session on 2026-10-11:

1. The start is a whole Takt, not a Schlag.
2. From Takt 1 of a Vers with an Auftakt, the Auftakt plays first.
3. A Starttakt in a repeated Vers starts in the first Durchgang and plays the repeat.
4. A click on the marked Takt clears it; there is no separate control.
5. A click during playback only moves the mark; it applies on the next Play.
6. The Takt boundary is strict for a Ruf whose Landung opens the Starttakt: the Ruf is dropped.
7. The Auftakt has no click target of its own.
8. A Dreierruf on the Starttakt's first Schlag measures its gap from the unplayed Schlag
   before it.
9. A Starttakt opening with a Pause keeps the silence; time 0 is the Takt's beginning.

## Further Notes

Raised on 2026-10-11 while tuning the Dreierruf by ear (see the closing note of
`.scratch/dreierruf/spec.md`). The original playback spec put "Partial playback" out of scope
(`.scratch/playback/spec.md`).

"Starttakt" is a word for an implementation concept, not a term of the tradition, so it belongs
on its definition in code and not in `GLOSSARY.md`.

## Comments

**Closed 2026-10-11.** Specified in `a882022`, settled in `611e713`, built in `cf92850` (the
Starttakt in the model, playback and layout, its mark and click targets in the renderer and
`App`). Where the result departs from the spec:

- The Starttakt, its `UnbekannterStarttaktError` and its check live in `src/model/starttakt.ts`,
  shared by playback and layout; the Marsch itself is unchanged.
- The plan runs the whole Marsch silently up to the Starttakt and measures time from there, so
  its tail matches the full plan exactly, the Dreierruf's gap included.
- Each `taktflaeche` carries a tooltip naming its Vers and Takt, which the spec did not ask for.

Loose ends: the mark's colour is chosen by eye, and a Starttakt is not kept across page loads.
