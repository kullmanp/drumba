# 01 — Auftakt in the model, its checks, and the Landung into Takt 1

Status: done
Type: task
Blocked by: pausen/02

Spec: `.scratch/auftakt/spec.md` — Model, Landung.

Add `Vers.auftakt`, its checks and named error in `pruefeMarsch`, and extend the Landung lookup
across the Auftakt → Takt 1 boundary. Layout and playback may ignore the Auftakt in this
issue. Do not change the Übungsmarsch yet.

Done when: model tests cover the spec's cases and `npm run check` passes. Purely internal: set
`Status: done` after committing.

## Comments

**2026-10-11 (AFK agent).** Commit "Hold the Auftakt in the model and check where it replays".
`Vers.auftakt?: Takt`. The Auftakt has Takt index `AUFTAKT = -1` and is resolved through
`taktAn(vers, taktIndex)`, so `folgeschlag` steps from the Auftakt into Takt 1 like from any
Takt into the next. `auftaktBeginn` gives its start. `UngueltigerAuftaktError` (with the Vers) covers
an Auftakt that is empty, starts with a Pause, is a whole Takt long, overruns, has a gap, or
would replay over a sounding Schlag. The replay check runs over the Vers's own last Takt if it
repeats, and over the previous Vers's last Takt, measured in Zählzeiten. It also rejects an
Auftakt longer than that last Takt. Ruf checks run on the Auftakt; `UngueltigerRufError` says
"Vers N, Auftakt" there.
Change of order: `pruefeMarsch` now checks all Takte of a Vers for overrun and gaps before the
Auftakt's replay and all Ruf checks, so a broken last Takt is reported as such.
No departure from the spec. Loose end: a Vers without Takte is not rejected, so an Auftakt
after it is checked against nothing.
