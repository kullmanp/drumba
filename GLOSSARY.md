# Drumba

A local-first web app for writing **Basler Trommeln** scores — authored in a single precise
model, rendered as **Zündstoffnoten** or **Hieroglyphen**, and played back as synthesized audio.

This file is a glossary of domain terms only. It is not a spec and holds no implementation
detail. Terms are Baseldytsch / German where the tradition has a word for the thing; invented
English translations are avoided.

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
so it is **rhythmically imprecise**. In Drumba it is a lossy _rendering_ of the canonical
model, plus a separate lossy _import_ path where the user supplies the missing rhythm.
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
A bar. Carries a **Taktart**. A Schlag's position within its Takt is an exact fraction, never
a float or a fixed grid slot.

**Taktart**:
A time signature, with an arbitrary numerator (**Zähler**) and denominator (**Nenner**) — 6/8
and 2/4 dominate the repertoire, but 5/8 and others occur, so the signature is not a fixed
set. Held on the Vers for now; the repertoire's mixed meter will push it down to the Takt.

**Zählzeit**:
The beat a Takt counts in, and the unit Schläge are grouped and beamed by. Dotted in compound
Taktarten (6/8, 9/8 count in dotted quarters), plain otherwise. Irregular Taktarten like 5/8
group 3+2 or 2+3; that grouping is not modelled yet.

**Wiederholungen**:
How many times a Vers is played — 2 (repeated) or 1. Drawn as repeat barlines or plain ones.

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

**Hand**:
Which hand plays the Schlag — left or right. Zündstoffnoten writes the hand down: it is the
**height of the Notenkopf** relative to the Notenlinie — rechts above the line, links below.
Nothing is left to the reader to infer, so the model stores it explicitly on every Schlag.
Auto-filling by the alternation rule is an authoring convenience, not a gap in the model.

**Ruf**:
The family of measured rolls, counted by their number of strokes — the repertoire uses 3, 5,
7, 9, 11, 15. A roll is one Figur with a duration, never pre-expanded into its constituent
strokes; its last stroke is the **Landung**, a Schlag of its own. Only the **Fünferruf** is
modelled so far.

**Fünferruf** (mit Schlepp):
The most common Ruf. Five strokes: Schlepp rechts, Dupfe rechts, Dupfe links, Dupfe links,
Dupfe rechts. The first four are evenly spaced and fill exactly an Achtel; the fifth lands on
the Achtel's end. So in 6/8, where an Achtel is a third of a Zählzeit instead of a half, it is
played faster than in 2/4. Practically always played starting rechts; the mirrored version
starting links is rare and hard to play, but legitimate. Written as a Schlepp whose Hals
carries a Wirbel, with a "5" and a slur to the fifth stroke.
A **Fünferruf ohne Schlepp** (no Vorschlag on the first stroke) also exists; deferred.

### Notation elements

The parts a Zündstoff score is drawn from. They are properties of the _drawing_, not of the
canonical model — the model holds Schläge, and the renderer decides which of these appear.

**Notenlinie**:
The single horizontal line a Vers's Takte sit on. Schläge are drawn against it, not on it: the
line runs _through_ the notation rather than under it.

**Notenkopf**:
The filled oval head that draws a Schlag, tilted up to the right. It sits at one of exactly two
heights — above the Notenlinie for a Schlag played **rechts**, below it for **links** — and
stands clear of the line rather than touching it, so the two heights read apart at a glance.
The Notenkopf is where the Hand is written; there are no `r`/`l` letters in the notation.

**Hals**:
The stem hanging from a Notenkopf, at the head's **left flank** rather than through its middle.
Always drawn **downward**, whichever side of the Notenlinie its Notenkopf sits on, so that
every Hals of a group reaches the same Balken.

**Balken**:
A beam joining the Hälse of Schläge that fall on the same Zählzeit. It runs **below** the
Notenlinie, at the lower end of the Hälse.

**Fahne**:
The hook on the lower end of a Hals, for a Schlag short enough to need one but not beamed to a
neighbour. One for an Achtel, two for a Sechzehntel. A dotted value carries as many Fahnen as
its undotted base.

**Punkt**:
The augmentation dot. It stands immediately right of the Notenkopf, at the head's own height —
not by the Hals and not by the Balken.

**Taktstrich**:
A barline. Plain, or a repeat barline opening or closing a repeated Vers.

**Vorschlag**:
The grace stroke of a Schlepp, played with the other Hand. Not written as a note of its own: a
short **vertical line rising from the Notenkopf** of the Schlag it belongs to. Because it hangs
off the head rather than standing beside it, it carries no Hand height — the reader infers the
Vorschlag's Hand from the Schlepp's.
Played softer than the main stroke and a short, fixed moment _before_ it, so the main stroke
still falls on the Schlag's position. That moment is a gesture, not a rhythmic value: it does
not shrink or grow with Tempo.

**Wirbel**:
The mark that shows a **Ruf** is one figure rather than its constituent strokes: slashes across
the Ruf's Hals, its stroke count written above, and a slur to the **Landung**. Not a bracket
above the Hälse.

**Bogen**:
The slur from a Ruf to its Landung, arching over both Notenköpfe — across the Taktstrich when
the Landung falls in the next Takt. Part of the **Wirbel**.

**Landung**:
The last stroke of a Ruf — the Schlag the roll lands on. It is a Schlag of its own, with its
own Notenkopf, value and Balken, played with the Hand the Ruf started with. It may fall in the
next Takt, across the Taktstrich.
_Avoid_: landing note, Endschlag.

### Interpretation

**Tempo**:
Playback speed of a Marsch, counted in **Zählzeiten per minute**. The pulse holds across a
change of Taktart: a dotted quarter in 6/8 lasts as long as a quarter in 2/4, and the Achtel
move instead. A property of the Marsch, overridable per playback.

**Vortrag**:
The Basel-idiomatic feel applied in playback — at minimum a named feel plus a swing ratio.
A property of the Marsch, overridable per playback.
_Avoid_: groove, swing (swing is only one component).
