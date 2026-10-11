# Coding standards

Judgement calls for review. What a tool can check lives in `npm run check` (types, tests,
Prettier, umlauts in code), not here. Module boundaries are in `AGENTS.md`.

## Vocabulary

- **Glossary terms verbatim, spelled in ASCII.** Identifiers use the `GLOSSARY.md` vocabulary,
  with umlauts written out: `zaehlzeit`, `schlaege`, `KOPF_HOEHE`, `UngueltigerTaktError`,
  `Fuenferruf`. Code files hold no umlauts at all — names, comments, test names and UI text alike
  (`npm run check` enforces it). Markdown keeps its umlauts.
- **Respect the _Avoid_ lists.** A name the glossary says to avoid is wrong even in English code
  (`stroke`, `note` for a Schlag).
- **New terms.** A German word for a concept the tradition names goes in `GLOSSARY.md`. A word
  for an implementation concept (`Anschlag`, `Glyph`) is documented on its definition instead.
- **German names, German comments.** Doc comments explain _why_, in German, at the density of
  the surrounding code. Browser and library APIs keep their own names.

## Model and arithmetic

- **Exact until the edge.** Positions and Notenwerte are `Bruch`. Convert to `number` once, at
  the final step into geometry or seconds (`alsZahl`), never back into the model.
- **Bad data throws.** A Takt that overruns its Taktart, or anything else the model cannot
  honestly draw or play, raises a named error that says where (Vers, Takt) — it is never
  silently drawn or played.
- **Figure traits in one table.** What a Figur has (Vorschlag, Ruf, stroke count) lives in
  `FIGURMERKMALE`. Compare a Figur by name only where behaviour belongs to that one figure,
  such as a Ruf's stroke pattern in playback.

## Tests

- **At the seam.** Tests call the module's pure function (`layout`, `abspielplan`) and assert
  on the data it returns. No DOM, no audio, no internals.
- **Relationships over tuned constants.** Assert that a Vorschlag comes before its main stroke
  and is quieter, that a Kopf stands clear of the Notenlinie — not that it sits at −0.030 s or
  x = 12.4. Values that follow exactly from the model (a Takt's length at a Tempo) may be
  asserted exactly.
- **Shape.** A `// --- Halterungen ---` section of small fixture builders, then German
  `describe`/`it` names that read as the behaviour.
