# 02 — legeBoegen finds the Landung through the model

Status: ready-for-agent
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
