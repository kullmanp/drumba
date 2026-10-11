# A Ruf's Landung is a Schlag of its own

A **Fünferruf** is five strokes, and the fifth is its **Landung**. We considered making the
whole figure one Schlag with two lengths, one for the four leading strokes and one for the
Landung. That shape would guarantee a Ruf can never be written without its Landung, and that
the Landung is always in the right Hand.

We instead model the Ruf as one Schlag (`wert` 1/8, sounding strokes 1–4) and the Landung as
the **next ordinary Schlag**. The repertoire decides it: in the originals the Landung routinely
falls in the next Takt, across the Taktstrich; it is beamed into a Balkengruppe of its own,
apart from the Ruf; and it carries its own accent and dynamic. A single Schlag spanning two
Takte would break "a Schlag's position is within its Takt" and the overrun check, and a single
Schlag drawn as two Notenköpfe in two Balkengruppen would split the layout's one-Schlag,
one-Notenkopf rule.

## Consequences

- A Ruf with no Landung, or with one in the wrong place or Hand, is now expressible. A model
  check rejects it, the same way an overrunning Takt is rejected, and layout and playback both
  run it.
- The Wirbel's slur and the Ruf's sound reach from one Schlag to the next, so both layout and
  playback look past the current Schlag, and past the current Takt.
- A Hieroglyphen rendering, where a Ruf is one sign, has to fold the Ruf and its Landung back
  together.
