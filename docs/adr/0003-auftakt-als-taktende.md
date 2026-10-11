# An Auftakt is the tail end of a Takt, replayed over the last Takt

Many Verse open with an **Auftakt** — in ZicZac most of them, usually a free Fünferruf landing
on Takt 1. We considered two simpler shapes: a short first Takt, and Schläge at negative
positions before Takt 1. A short first Takt breaks "every Takt is filled by its Taktart" and
makes Takt 1 mean two things. Negative positions put a Schlag outside every Takt, and the
Zählzeit grouping and the free-Ruf rule, which both read a position within a Takt, would need
a special case.

We instead hold the Auftakt as an optional, Takt-shaped part of the **Vers** whose Schläge keep
the positions they would have **at the end of a full Takt** of the Vers's Taktart: an Achtel
Auftakt in 2/4 sits at 3/8. Its length runs from its first Schlag to that Takt's end. Grouping,
Balken and the free-Ruf rule then work on it unchanged.

In playback the Auftakt sounds again wherever the music returns to Takt 1 — on a repeat, and
at the move into a Vers that has one — **over the end of the preceding last Takt**, which is
notated in full, Pausen included, and never drawn shortened. This is how the originals are
written and played: ZicZac Vers 3 ends on a Viertel and a Viertelpause, and the Auftakt's
Fünferruf fills the end of that Pause on the way back.

## Consequences

- The stretch of a last Takt that an Auftakt replays over may hold only Pausen. A model check
  rejects anything else, including across a change of Taktart between Verse.
- The opening repeat sign of a repeated Vers stands after the Auftakt, at Takt 1, because the
  repeat returns there.
- A Landung can fall from the Auftakt into Takt 1, so `folgeschlag` crosses that boundary too.
- At the very start of the Marsch the Auftakt simply plays first; the Marsch begins with it.
