# Drumba

A local-first web app for writing **Basler Trommeln** scores — authored in a single precise
model, rendered as **Zündstoffnoten** or **Hieroglyphen**, and played back as synthesized audio.

This file is a glossary of domain terms only. It is not a spec and holds no implementation
detail. Terms are Baseldytsch / German where the tradition has a word for the thing; invented
English translations are avoided.

## Status

Domain model under active design. The **first slice** is deliberately minimal: build one
Marsch in memory and render it as Zündstoffnoten. In scope for the slice: Marsch, Vers, Takt,
Schlag, Figur (Dupfe / Schlepp / Fünferruf), Hand, notated value. Deferred (terms kept here
for orientation, not built yet): dynamics, Pause, Auftakt, Schluss, Tempo, Vortrag,
Hieroglyphen rendering + import, playback, library/persistence, Pfeife.

Stack: TypeScript + React + Vite, notation as inline SVG, no backend, Vitest.

## Language

### The tradition

**Basler Trommeln**:
The Basel rudimental snare-drumming tradition (tied to Fasnacht). The subject the app serves.
_Avoid_: Swiss drumming, marching snare.

**Trommel**:
The drum itself — the only instrument Drumba models for now. The fife (**Pfeife**) is
explicitly out of scope but the model should not preclude adding it later.

### Notation systems

**Zündstoffnoten** (Zündstoffschrift):
Matchstick-style notation. Rhythmically precise. The notation whose expressive power the
canonical model matches — anything a Zündstoff score can say, the model can hold.
_Avoid_: matchstick notation.

**Hieroglyphen** (Hieroglyphenschrift, Winzer-Notenschrift):
Older symbol-based notation (Severin, ~1865). Encodes figures/gestures, not exact durations,
so it is **rhythmically imprecise**. In Drumba it is a lossy *rendering* of the canonical
model, plus a separate lossy *import* path where the user supplies the missing rhythm.
Hieroglyphen is never the source of truth.

### The document

**Marsch**:
One drumming piece — the top-level thing a user authors and owns in their library. Almost all
repertoire pieces are Märsche; the model targets them for v1. A Marsch carries its Tempo and
Vortrag, an ordered list of Verse, and an optional Schluss instruction.
_Avoid_: Stück, score, composition, song, track.

**Vers** (pl. **Verse**):
An ordered section of a Marsch. Typically 8 Takte. Each Vers stores its own repeat count —
usually 2, sometimes 1 (not repeated). May contain Voltas. Identified by position/number.
_Avoid_: Teil, section, part, verse (English).

**Schluss**:
An optional end-of-Marsch instruction that replays earlier Verse — e.g. "Vers 1–3 zum
Schluss". Its exact shape is undecided; when built it will be structure, not duplicated Takte.

**Takt**:
A bar. Has a time signature with an arbitrary numerator/denominator — 6/8 and 2/4 dominate
the repertoire, but 5/8 and others occur, so the signature is not a fixed set. A Schlag's
position within its Takt is an exact fraction, never a float or a fixed grid slot.

**Auftakt**:
A pickup — Schläge before the first full Takt. When built, modelled as its own thing, not as
a short first Takt.

### Rhythmic content

**Schlag**:
The single atomic event of the canonical model. Carries: its **Figur** type, a primary
**Hand**, an exact fractional position within its Takt, and an explicit notated value
(Achtel, Sechzehntel, …). There is no separate "ornament" concept — a flam is its own Figur,
not a decorated Dupfe. Dynamics are deferred (not modelled in the first slice).
_Avoid_: note, stroke, hit, event.

**Figur**:
The kind of a Schlag, drawn from the Basel figure vocabulary. The full vocabulary comes later;
seed entries:

- **Dupfe**: a single stroke.
- **Schlepp**: a flam.
- **Fünferruf**: a five-stroke roll. Member of the **Ruf** family (named, measured rolls).

**Hand**:
Which hand plays the Schlag — left or right. **Always stored explicitly** on every Schlag,
even though the tradition lets a reader infer it. Auto-filling by the alternation rule is an
authoring convenience, not a gap in the model.

**Ruf**:
The family of named, measured rolls (Fünferruf, …). A roll is one Figur with a duration, never
pre-expanded into its constituent strokes.

### Interpretation

**Tempo**:
Playback speed of a Marsch. A property of the Marsch, overridable per playback.

**Vortrag**:
The Basel-idiomatic feel applied in playback — at minimum a named feel plus a swing ratio.
A property of the Marsch, overridable per playback.
_Avoid_: groove, swing (swing is only one component).
