# 03 — Play the Auftakt, and again before every return to Takt 1

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `.scratch/auftakt/spec.md` — Playback.

Extend `abspielplan`: time 0 at the first Auftakt, and each Auftakt replayed so it ends at the
end of the preceding last Takt — on a repeat and at the move from the previous Vers.

Done when: playback tests cover the spec's cases and `npm run check` passes. Playback is
verified by ear, which the agent cannot do: set `Status: ready-for-human` after committing and
note under `## Comments` what to listen for (the Ruf before Takt 1, and again over the
Viertelpause before the repeat and at the end of the 6/8 Vers).
