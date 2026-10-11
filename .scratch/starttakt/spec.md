# Starttakt — playback from a chosen Takt

Status: needs-triage

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
  Taktstrich.
- If the Starttakt is Takt 1 of a Vers with an Auftakt, the Auftakt is played first.
- Time 0 is the Starttakt's beginning, or the Auftakt's beginning when the Auftakt is played.
  Anything that belongs to a kept Schlag and sounds earlier gets a negative time, as a leading
  Vorschlag does today, and the adapter's lead-in already copes with that.
- The rolled Dupfe of a Dreierruf on the Starttakt's first Schlag still measure their gap from
  the Schlag written before it, even though that Schlag is not played. That keeps their
  rhythm the same as when the Marsch is played from the beginning.
- A Starttakt that does not exist in the Marsch throws a named error.

**Layout.**

- `layout(marsch, starttakt?)`.
- For every Takt the layout emits a `taktflaeche` glyph: its x range from Taktstrich to
  Taktstrich, a y range covering the Vers's notation, and its Vers and Takt index. It is the
  click target, and the layout gives its bounds so the renderer computes no x.
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
    Schlag, at time 0, and the plan then matches the tail of the full plan shifted by the
    Starttakt's start time.
  - A Vers with Wiederholungen 2, started from its last Takt, plays that Takt, then the whole
    Vers again.
  - From Takt 1 of a Vers with an Auftakt, the Auftakt is played first.
  - A Doublé on the Starttakt's first Schlag keeps its soft Dupfe, at a negative time.
  - A Dreierruf on the Starttakt's first Schlag keeps its rolled Dupfe at the same distances
    from it as in the full plan.
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

## Open Questions

Decided by the agent without a grilling session; settle these before the spec is
`ready-for-agent`.

1. Is a Takt the right size of step, or should the start be a Schlag?
2. Should the Auftakt play when starting from Takt 1? (Proposed: yes.)
3. Should a Starttakt in a repeated Vers start in the first Durchgang and play the repeat?
   (Proposed: yes.)
4. Should a click on the marked Takt clear the mark, or is a separate control clearer?
5. Should a click during playback restart playback from the new Starttakt, rather than only
   move the mark?

## Further Notes

Raised on 2026-10-11 while tuning the Dreierruf by ear (see the closing note of
`.scratch/dreierruf/spec.md`). The original playback spec put "Partial playback" out of scope
(`.scratch/playback/spec.md`).

"Starttakt" is a word for an implementation concept, not a term of the tradition, so it belongs
on its definition in code and not in `GLOSSARY.md`.
