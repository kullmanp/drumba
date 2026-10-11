# 01 — Pause in the model, the filled-Takt check, silent playback

Status: done
Type: task
Blocked by: aufraeumen/02

Spec: `.scratch/pausen/spec.md` — Model, Check, Playback.

Add `Pause` and `Takt.pausen`, extend `taktUeberlauf` to Pausen, add the tiling check and its
named error to `pruefeMarsch`, and add the playback test. Keep the Übungsmarsch valid (it is
already filled; give its Takte `pausen: []`). The layout may ignore Pausen in this issue.

Done when: model and playback tests cover the spec's cases and `npm run check` passes. Purely
internal: set `Status: done` after committing.

## Comments

**2026-10-11 (AFK agent).** Commit "Hold Pausen in the model and reject unfilled Takte".
`Pause` and `Takt.pausen` are in the model. `taktUeberlauf` covers Pausen, so
`UngueltigerTaktError` now carries `element: Schlag | Pause` instead of `schlag`. The tiling
check `fuellfehler(takt, beginn, ende)` throws `LueckenhafterTaktError` (Vers, Takt, "Luecke" or
"Ueberlappung" and where). It takes its start as a parameter for the Auftakt, which is not
built. Playback needed no change; two tests prove that Pausen stay silent.
Fixtures: older tests whose Takte were only partly filled now spell out their Pausen. The
layout and playback test builders default `pausen` to `[]`.
Loose end (review): a Schlag or Pause with `wert` 0 or a negative `wert` is not rejected by the
model. It cannot be drawn today, but the model would let it through.
