# 02 — legeBoegen finds the Landung through the model

Status: done
Type: task
Blocked by: 01

Spec: `.scratch/aufraeumen/spec.md`, item 2.

Export the Landung lookup from `src/model/marsch.ts` (today the private `folgeschlag`) and use
it in both `pruefeMarsch` and `legeBoegen`. `legeBoegen` must find the placed Schlag that the
model names as the Landung — e.g. by keying placed Schläge by (Takt index, Schlag index) or by
the `Schlag` object — not `platzierte[index + 1]`. This is the seam `.scratch/auftakt/` will
extend so a Landung can cross from the Auftakt into Takt 1.

Done when: a model test covers the lookup (same Takt, next Takt, none past the Vers), existing
Bogen tests pass, `npm run check` passes. Purely internal: set `Status: done` after committing.

## Comments

**2026-10-11 (AFK agent).** Commit "Find a Ruf's Landung through the model in legeBoegen".
`folgeschlag` is exported from `src/model/marsch.ts` and also returns where the Landung sits
(`taktIndex`, `index`). `legeVers` keeps the placed Schläge per Takt, and `legeBoegen` maps
the model's Landung back to its placed Schlag. Screenshot unchanged (byte-identical to the one
taken before the clean-up; see `.scratch/aufraeumen/01-uebungsmarsch.png`). No departure from
the spec.
Review note, rejected: key placed Schläge by the `Schlag` object instead of (Takt, index), which
would need no change for the Auftakt. Rejected because a Marsch that reuses one Takt object
for a repeated Takt would map the Landung to the wrong place. The Auftakt issue has to give
`folgeschlag` a way to say "in the Auftakt" anyway.
