# 01 — Auftakt in the model, its checks, and the Landung into Takt 1

Status: ready-for-agent
Type: task
Blocked by: pausen/02

Spec: `.scratch/auftakt/spec.md` — Model, Landung.

Add `Vers.auftakt`, its checks and named error in `pruefeMarsch`, and extend the Landung lookup
across the Auftakt → Takt 1 boundary. Layout and playback may ignore the Auftakt in this
issue. Do not change the Übungsmarsch yet.

Done when: model tests cover the spec's cases and `npm run check` passes. Purely internal: set
`Status: done` after committing.
