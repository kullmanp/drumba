# 03 — Play the Auftakt, and again before every return to Takt 1

Status: ready-for-human
Type: task
Blocked by: 02

Spec: `.scratch/auftakt/spec.md` — Playback.

Extend `abspielplan`: time 0 at the first Auftakt, and each Auftakt replayed so it ends at the
end of the preceding last Takt — on a repeat and at the move from the previous Vers.

Done when: playback tests cover the spec's cases and `npm run check` passes. Playback is
verified by ear, which the agent cannot do: set `Status: ready-for-human` after committing and
note under `## Comments` what to listen for (the Ruf before Takt 1, and again over the
Viertelpause before the repeat and at the end of the 6/8 Vers).

## Comments

**2026-10-11 (AFK agent).** Commit "Play the Auftakt before Takt 1 and on every return to it".
`abspielplan` sets time 0 at the first Vers's Auftakt. At the start of every pass through a
Vers with an Auftakt, it plays the Auftakt as a full Takt that ends exactly where Takt 1 begins:
on the first pass, on the repeat, and at the move from the previous Vers. Timing stays in
Zählzeiten, so a 2/4 Auftakt falls on the right stretch of a 6/8 Takt. No departure from the
spec.

What to listen for in `npm run dev` (Play):

- At the very start of the 2/4 Vers's pass — i.e. after the 6/8 Vers — the free Fünferruf
  sounds over the closing Viertelpause of the 6/8 Vers's new last Takt and lands on Takt 1's
  first Achtel.
- At the end of the 2/4 Vers's first pass, the Ruf sounds again over the closing Viertelpause
  and lands on Takt 1 for the repeat.
- The Übungsmarsch starts with the 6/8 Vers, which has no Auftakt, so the Marsch itself starts
  on Takt 1. The "Marsch begins with the Auftakt" case is covered by tests only.
- The 6/8 Vers now also repeats its new closing Takt (punktierte Viertel, Achtel,
  Viertelpause).
