# Zündstoffnoten renderer — first iteration

Status: ready-for-agent

## Problem Statement

There is no software for writing **Basler Trommeln** scores. Drummers who want a march in
**Zündstoffnoten** either buy a printed book, or fight a general-purpose notation program
(MuseScore, Capella, Finale) into approximating a notation it was never designed for. Nothing
lets a drummer hold a **Marsch** as structured data and see it drawn in the notation the
tradition actually reads.

Before any of that can be built, Drumba needs the thing everything else stands on: a canonical
in-memory model of a Marsch, and the ability to draw it as Zündstoffnoten.

## Solution

A minimal, deliberately narrow first slice: define the canonical model types, hand-build one
Marsch in code, and render it as Zündstoffnoten in the browser as inline SVG.

There is no editor, no persistence, no playback, and no Hieroglyphen in this iteration. The
deliverable is: `npm run dev` opens a page showing a correctly drawn Zündstoff score of a
hard-coded Marsch, and `npm test` proves the layout that produced it.

## User Stories

1. As a drummer, I want to see a Marsch drawn in Zündstoffnoten, so that I can read it in the
   notation my tradition uses rather than in standard percussion notation.
2. As a drummer, I want each **Schlag** drawn at its correct rhythmic position within its
   **Takt**, so that the score is rhythmically truthful and not just decorative.
3. As a drummer, I want a **Dupfe** drawn as a single matchstick note, so that I recognise the
   most common figure at a glance.
4. As a drummer, I want a **Schlepp** drawn with its grace note ahead of the main stroke, so
   that I can tell a flam from a single stroke without counting.
5. As a drummer, I want a **Fünferruf** drawn as a roll spanning its written duration, so that
   I read it as one figure rather than as five separate strokes.
6. As a drummer, I want the **Hand** of every Schlag shown, so that I know the sticking without
   having to infer it from the alternation rule.
7. As a drummer, I want the **Takte** of a **Vers** laid out left to right on a staff line, so
   that the score reads like a score and not like a list.
8. As a drummer, I want barlines between Takte, so that I can see where each bar begins and ends.
9. As a drummer, I want each Vers's time signature shown, so that I know whether I am reading
   6/8 or 2/4.
10. As a drummer, I want Verse laid out one after another with their numbers visible, so that I
    can navigate the Marsch by Vers.
11. As a drummer, I want a Vers's repeat shown as repeat barlines, so that I know it is played
    twice — or see plain barlines when it is played once.
12. As a drummer, I want the Marsch's title shown above the score, so that I know what I am
    looking at.
13. As a drummer reading 6/8, I want Schläge on the same beat grouped under a beam, so that the
    metric grouping is visible the way Zündstoffnoten shows it.
14. As a developer, I want the canonical model expressed as plain TypeScript types, so that an
    invalid Marsch is hard to construct and easy to spot.
15. As a developer, I want a Schlag's position stored as an exact fraction, so that a 6/8 or 5/8
    bar never suffers floating-point drift.
16. As a developer, I want layout to be a pure function from Marsch to placed glyphs, so that I
    can assert on geometry as data rather than parsing SVG attributes.
17. As a developer, I want the React layer to be a dumb mapping from placed glyphs to SVG
    elements, so that there is no logic hiding in the component.
18. As a developer, I want the figure vocabulary to be an open, extensible set, so that adding
    the rest of the Basel figures later does not mean reshaping the model.
19. As a developer, I want a hard-coded example Marsch that exercises all three figures, so that
    I have something real to look at while building the renderer.
20. As a developer, I want the layout's output measured in abstract units the SVG layer scales,
    so that sizing decisions are not baked into the geometry.
21. As a developer, I want a Takt whose Schläge overrun its time signature to be a detectable
    error, so that bad data surfaces early rather than rendering silently wrong.
22. As a developer, I want the vocabulary from `CONTEXT.md` used verbatim in type and function
    names, so that the code and the glossary never drift apart.

## Implementation Decisions

**Stack.** TypeScript + React + Vite, Vitest for tests, no backend. Notation drawn as inline
SVG — no canvas, no external notation library.

**Modules.** Three, in dependency order:

- **Canonical model** — the domain types (`Marsch`, `Vers`, `Takt`, `Schlag`, `Figur`, `Hand`)
  plus exact-fraction arithmetic for positions and note values. No rendering knowledge.
- **Zündstoff layout** — a pure function from a `Marsch` to a flat, ordered collection of
  placed glyphs with coordinates in abstract units. Owns all geometry: horizontal spacing
  within a Takt, stem and beam placement, grace-note offset for a **Schlepp**, roll span for a
  **Fünferruf**, hand indicators, barlines, repeat barlines, time signature and Vers numbering.
  Knows nothing about React or SVG.
- **SVG renderer** — React components that map placed glyphs to SVG primitives and apply a
  single scale factor. Contains no layout decisions.

**The seam.** One seam, at the layout function. Tests call `layout(marsch)` and assert on the
returned data. The renderer is verified by eye in the browser, not by DOM assertions. This
choice was made explicitly over testing at the component boundary: notation is a geometry
problem, and asserting "the Schlepp's grace note sits N units left of its main stem" as data is
far more precise and durable than digging it out of SVG attributes.

**Model shape.** Follows `CONTEXT.md` and ADR-0001:

- A `Marsch` has a title and an ordered list of `Vers`.
- A `Vers` has a time signature (arbitrary numerator/denominator — 6/8 and 2/4 dominate but 5/8
  occurs), a repeat count (1 or 2), and an ordered list of `Takt`.
- A `Takt` is an ordered list of `Schlag`.
- A `Schlag` carries a `Figur`, a `Hand`, an exact fractional position within its Takt, and an
  explicit notated value. Position and value are exact fractions, never floats.
- `Figur` for this iteration: `Dupfe`, `Schlepp`, `Fünferruf`. Modelled as a flat set — a
  Schlepp is its own Figur, not a decorated Dupfe. The set must be trivially extensible; the
  full Basel vocabulary arrives later.
- `Hand` is stored explicitly on every Schlag. There is no inference and no default.

**Layout output.** A flat list of placed glyphs is preferred over a nested structure mirroring
the model: it keeps assertions simple and keeps the renderer a single map. Each placed glyph
carries what it is, where it sits, and any figure-specific geometry.

**Time signature placement.** On the `Vers`, not the `Takt`. The glossary allows per-Takt
signatures and the repertoire does contain mixed meter, but no example in this iteration needs
it, and hoisting it to the Vers keeps the first slice smaller. Moving it down to the Takt later
is a local change.

**Validation.** A Takt whose Schläge exceed its time signature is invalid. Surface it as a
thrown error or an explicit result — do not render it silently. Rendering must not paper over
bad data.

**Example Marsch.** One hard-coded Marsch in the repo, exercising all three Figuren across at
least two Verse with different repeat counts, at least one 6/8 Vers, and beamed groups. It is
the fixture for both the tests and the dev page.

## Testing Decisions

**What makes a good test here.** Tests assert on external behaviour of the layout function: for
a given `Marsch`, what glyphs come out, in what order, at what positions, with what
figure-specific geometry. They must not reach into layout internals, and must not assert on
absolute pixel values chosen for aesthetics — assert on *relationships* (this glyph is left of
that one; the grace note is offset from its main stem; the roll spans its written duration)
rather than on magic numbers, so that visual tuning does not break the suite.

**Modules tested.**

- **Canonical model** — fraction arithmetic and any validation helpers. Direct unit tests.
- **Zündstoff layout** — the main body of tests, through the single seam.
- **SVG renderer** — not tested in this iteration. It is a thin, judgement-free mapping;
  correctness is verified by eye in the browser.

**Coverage to hit.** One Takt of Dupfen at correct positions; a Schlepp's grace note; a
Fünferruf's span; hand indicators for both hands; barlines between Takte; repeat barlines for a
Vers played twice versus plain barlines for one played once; time signature glyph; Vers
numbering; beam grouping in 6/8; multi-Vers ordering; and the overrun-Takt error case.

**Prior art.** None — this is the first code in the repo. These tests set the pattern: pure
functions in, data assertions out, no DOM.

## Out of Scope

Everything not needed to draw one hard-coded Marsch:

- **Editing** — no UI for creating or modifying a Marsch. It is built in code.
- **Persistence and library** — nothing is saved or loaded. No local-first storage yet.
- **Playback** — no audio, no synthesis, no scheduling. `Tempo` and `Vortrag` are not modelled.
- **Hieroglyphen** — neither rendering nor import. Deferred per ADR-0001.
- **Dynamics** — no accents, no dynamic levels, per-Schlag or passage-level.
- **Pause** (rests) — not modelled. Every position in a Takt is either a Schlag or empty space.
- **Auftakt** — no pickup handling.
- **Schluss** — no "Vers 1–3 zum Schluss" instruction. Its shape is undecided.
- **Voltas** — no 1./2. Ende. Repeats are a plain count only.
- **Pfeife** — snare only. No second voice, no multi-part arrangements.
- **Printing and export** — no PDF, no image export.
- **Mixed meter within a Vers** — one time signature per Vers.

## Further Notes

ADR-0001 governs: the canonical model is the single source of truth and matches Zündstoff's
precision. This iteration builds the model and the Zündstoff renderer only; Hieroglyphen will
later be a lossy view over the same model, never an independent document. Nothing in this
iteration may make the model less precise than Zündstoff requires.

`CONTEXT.md` is the vocabulary authority. Use `Marsch`, `Vers`, `Takt`, `Schlag`, `Figur`,
`Hand`, `Dupfe`, `Schlepp`, `Fünferruf` verbatim in identifiers. Avoid the synonyms the
glossary rejects (`Stück`, `Teil`, "score", "note", "stroke", "section"). If a needed concept
is missing from the glossary, that is a signal to add it there, not to invent a term in code.

Umlauts in identifiers are valid TypeScript. Prefer `Fünferruf` over `Fuenferruf` — matching
the glossary exactly is worth more than ASCII purity.

The full Basel figure vocabulary is coming from the user later. The three Figuren here are
seeds; the design should make adding twenty more a matter of extending a set and adding
geometry, not restructuring the model.
