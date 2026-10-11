# 01 — Pause in the model, the filled-Takt check, silent playback

Status: ready-for-agent
Type: task
Blocked by: aufraeumen/02

Spec: `.scratch/pausen/spec.md` — Model, Check, Playback.

Add `Pause` and `Takt.pausen`, extend `taktUeberlauf` to Pausen, add the tiling check and its
named error to `pruefeMarsch`, and add the playback test. Keep the Übungsmarsch valid (it is
already filled; give its Takte `pausen: []`). The layout may ignore Pausen in this issue.

Done when: model and playback tests cover the spec's cases and `npm run check` passes. Purely
internal: set `Status: done` after committing.
