# Playback — first iteration

Status: done

## Problem Statement

Drumba can draw a **Marsch** as **Zündstoffnoten**, but a drummer learning a Marsch wants to
_hear_ it as well as read it: to check a rhythm they are unsure of, or to play along. Right now
the score is silent.

Playback also tests the canonical model from a second direction. The renderer has shown the
model is precise enough to draw. Playback shows whether it is precise enough to perform:
exact positions, Wiederholungen, and the timing of a **Schlepp**'s **Vorschlag**. If the
drawing and the sound disagree, the model has a gap.

## Solution

Play the hard-coded Übungsmarsch as synthesized audio in the browser. The page gets Play and
Stop buttons and a tempo field. Play always starts from the beginning of the Marsch. Each
**Vers** plays as many times as its **Wiederholungen** say, and the Verse follow one another
without a gap. Everything plays straight, with no **Vortrag**.

There is no editor, no persistence and no playhead in this iteration. The deliverable:
`npm run dev` opens the score with a Play button that plays it, and `npm test` proves the
timing that produced the sound.

## User Stories

1. As a drummer, I want to press Play and hear the Marsch, so that I can check how a passage
   sounds without a drum in my hands.
2. As a drummer, I want to press Stop and have the sound end immediately, so that I am not
   stuck listening to the whole Marsch.
3. As a drummer, I want to set the **Tempo** in **Zählzeiten** per minute, so that I can
   practise slowly and then build up to marching speed.
4. As a drummer, I want the pulse to stay the same when a Vers changes **Taktart**, so that a
   dotted quarter in 6/8 lasts as long as a quarter in 2/4, the way a Clique marches.
5. As a drummer, I want every **Schlag** to sound at its exact position in its **Takt**, so that
   what I hear is what the score says.
6. As a drummer, I want a Schlepp to sound as a flam, with a soft Vorschlag just before a main
   stroke that falls on the beat, so that I can tell it from a **Dupfe** by ear.
7. As a drummer, I want the Vorschlag to stay the same short gesture at every Tempo, so that a
   slow practice tempo does not stretch the flam into two separate strokes.
8. As a drummer, I want a Vers with Wiederholungen 2 to play twice, so that playback follows the
   Marsch's structure the way I would play it.
9. As a drummer, I want playback to stop by itself at the end of the Marsch, so that I can press
   Play again to start over.
10. As a developer, I want the timing computed by a pure function from Marsch and Tempo to a
    list of timed strokes, so that I can assert on timing as data without any audio.
11. As a developer, I want the Web Audio part to be a thin adapter that only schedules that
    list, so that there is no timing logic hiding where tests cannot reach it.
12. As a developer, I want the sound synthesized with no samples and no dependencies, so that
    the app stays local-first and has nothing to load.

## Implementation Decisions

**Module.** A new `src/playback/` module. Like `src/layout/` it depends only on `src/model/`
and knows nothing of React, SVG or layout. It has two parts:

- **The timing function**, e.g. `abspielplan(marsch, tempo)`. A pure function returning a flat
  list of timed strokes ordered by time. Each stroke carries its time in seconds, its Hand and
  its volume. It owns all the timing: Zählzeit length from Tempo and Taktart, the position of
  each Schlag, the unrolling of Wiederholungen, and the Vorschlag's offset and volume.
- **The audio adapter.** It takes the list and schedules each stroke on a Web Audio
  `AudioContext` as a short filtered noise burst. It can stop everything it scheduled. It does
  no timing arithmetic beyond adding the list's times to a start time.

**Tempo.** Counted in Zählzeiten per minute (see `zaehlzeit` in `src/model/marsch.ts`). One
Zählzeit lasts `60 / tempo` seconds in every Taktart, so the length of a Takt and of each
Schlag's offset follows from how many Zählzeiten it spans. A 6/8 Takt spans 2 Zählzeiten and a
2/4 Takt spans 2, so at Tempo 100 both last 1.2 s. Use exact fractions until the final
conversion to seconds.

**Tempo is not in the model yet.** It is a playback control only, and `Marsch` gets no `tempo`
field in this iteration. The glossary's "property of the Marsch, overridable per playback"
arrives with authoring and persistence, when a Marsch needs to remember its Tempo. The tempo
field starts at 100. A changed Tempo takes effect on the next Play, not during playback. Play
is unavailable while the field does not hold a positive number.

**Wiederholungen.** The timing function unrolls them: a Vers with Wiederholungen 2 contributes
its Takte twice in a row before the next Vers starts. Voltas and Schluss are not modelled and
are not played.

**Schlepp.** Two strokes. The main stroke sounds exactly at the Schlag's position, in the
Schlag's Hand, at full volume. The Vorschlag sounds a fixed time before it (start around
30 ms, tune by ear), in the other Hand, noticeably quieter (start around half volume). The
offset is in seconds, not a fraction of a note, so it does not change with Tempo.

**Leading Vorschlag.** If the Marsch opens on a Schlepp, its Vorschlag falls before time 0.
The timing function returns that negative time unchanged. The adapter starts the Marsch after
a short lead-in that is longer than the Vorschlag offset.

**Dynamics.** None besides the Vorschlag. Every Dupfe and every main stroke has the same volume.

**Sound.** Identical for both hands. Hand is still carried on every stroke, so hearing the
sticking (pan or pitch) can be added later without touching the timing.

**Validation.** The timing function rejects a Takt that overruns its Taktart, reusing
`taktUeberlauf`, as the layout does. Playback must not quietly play bad data.

**UI.** Play, Stop and the tempo field sit above the score in `App`. The component holds only
the playing/stopped state and the tempo value. All timing comes from the timing function.

## Testing Decisions

**What makes a good test here.** As with the layout: call the timing function and assert on
the returned data. Assert on _relationships_ rather than on constants chosen by ear. For
example, "the Vorschlag comes before its main stroke and is quieter" is a good test, while
"the Vorschlag is at −0.030 s" is not. Timing that follows from the model and Tempo is exact,
so it may be asserted exactly. Examples are a Takt's length at a given Tempo and a Schlag's
offset within its Takt.

**Modules tested.**

- **Timing function** — the body of the tests, through the single seam.
- **Audio adapter and controls** — not tested. Verified by ear in the browser.

**Coverage to hit.**

- Dupfen land at their positions at a given Tempo.
- Doubling the Tempo halves every time.
- A 6/8 Takt and a 2/4 Takt last the same at the same Tempo, so the pulse is constant.
- A Vers with Wiederholungen 2 sounds twice and one with 1 sounds once.
- Verse follow without a gap.
- A Schlepp yields a main stroke at its position in its Hand, and a quieter Vorschlag before it
  in the other Hand.
- The Vorschlag offset in seconds is the same at two different Tempi.
- The list is ordered by time.
- A Marsch opening on a Schlepp yields a negative first time.
- An overrunning Takt is rejected.

**Prior art.** `src/layout/layout.test.ts`: pure function in, data assertions out, no DOM.

## Out of Scope

- **Playhead** — no highlight in the notation that follows the sound.
- **Partial playback** — no start from a chosen Takt or Vers, no looping a Vers.
- **Metronome** — no click track, no count-in.
- **Vortrag** — no swing, no Basel feel. Straight playback only.
- **Dynamics and accents** — beyond the quieter Vorschlag.
- **Hand by ear** — both hands sound the same.
- **Tempo in the model** — not stored on the Marsch, not saved.
- **Live tempo change** — a new Tempo applies on the next Play.
- **Samples or sound selection** — one synthesized sound only.
- **Rufe** — not in the model yet, so not played.
- **Voltas, Schluss, Auftakt, Pause** — not modelled, not played.
- **Editing, persistence, Hieroglyphen, Pfeife** — unchanged from the renderer iteration.

## Further Notes

ADR-0001 governs: playback reads the canonical model only. It must never reach into the layout
or the rendered SVG for timing. The layout and the timing function are siblings over the same
model.

`GLOSSARY.md` holds the two domain facts this iteration settled. **Tempo** counts Zählzeiten
per minute with a constant pulse across Taktarten. The **Vorschlag** is a soft, fixed gesture
just before the main stroke. Use the glossary's terms verbatim in identifiers. "Stroke" is on
its Avoid list as a name for a **Schlag**. A timed sound in the playback list is _not_ a
Schlag, since a Schlepp yields two, so name it for what it is in German (e.g. `Anschlag`) and
add the term to the glossary if it turns out to be a domain term rather than an implementation
one.

Next after this iteration: authoring (writing a Marsch in the app), then persistence (save and
load), which is when Tempo moves onto the Marsch.

## Comments

**Closed 2026-10-11.** Built in `19610eb`; looks and sounds right for a first iteration. Every
user story and every coverage item is met. Notes beyond the spec:

- **`UngültigerTaktError` moved into the model** beside `taktUeberlauf`, so playback can reject
  an overrunning Takt without importing the layout. `dividiere` was added to `bruch.ts`.
- **`Anschlag` is an implementation term**, not a domain one, so it is documented in code and
  not in `GLOSSARY.md`.
- **Sound constants are first guesses, accepted by ear:** Vorschlag 30 ms ahead at half volume,
  a 2.2 kHz bandpassed noise burst with 120 ms decay.
- **Known loose ends from review:** the overrun walk over a Marsch is duplicated between layout
  and playback and could become one model function; an invalid Marsch would throw from the Play
  handler with no UI feedback; the adapter detects the end by the last Anschlag's `onended`,
  which assumes every Anschlag decays equally long — revisit when the Hände sound different.
