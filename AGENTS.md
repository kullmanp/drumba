# Drumba

A local-first web app for writing **Basler Trommeln** scores. See `GLOSSARY.md` for the domain
glossary and `docs/adr/` for architectural decisions.

## Code

TypeScript + React + Vite, notation as inline SVG, no backend, Vitest.

`npm run dev` opens the score, `npm test` runs Vitest, `npm run typecheck` runs `tsc`.

Four modules, in dependency order — each layer knows nothing of the one above it:

- `src/model/` — the canonical model (ADR-0001) and exact fraction arithmetic. No geometry.
- `src/layout/` — `layout(marsch)`, a pure function to placed glyphs in abstract units.
  No React, no SVG. **This is the tested seam**: tests assert on the returned data, and on
  relationships between glyphs rather than on the constants chosen for looks.
- `src/render/` — React components mapping glyphs to SVG. Untested; verified by eye.
- `src/playback/` — a sibling of the layout over the same model, never reading layout or SVG.
  `abspielplan(marsch, tempo)` is the pure, tested timing seam: a time-ordered list of
  `Anschlag`. `wiedergabe.ts` is the Web Audio adapter that only schedules that list.
  Untested; verified by ear.

The line between layout and renderer: **the layout decides where every mark sits; the renderer decides
how thick and how tall it is.** Anything positioned along the score — a Vorschlag's offset, a
Wirbel's span, the second stroke and the dots of a repeat Taktstrich — is emitted by the
layout as coordinates, so it can be asserted on. What is left to the renderer is stroke weight
and the inner shape of a single mark: how far a Fahne falls, how far apart stacked Balken sit.
If you find yourself computing an x in `src/render/`, it belongs in the layout.

Identifiers use the `GLOSSARY.md` vocabulary verbatim, umlauts included (`Fünferruf`, not
`Fuenferruf`). Filenames stay ASCII, to keep git and macOS from disagreeing about
normalisation.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
