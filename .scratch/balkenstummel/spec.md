# Balkenstummel — Balkengruppen of mixed values

Status: ready-for-agent

## Problem Statement

Drumba can only beam a **Balkengruppe** whose Schläge all have the same value. A Zählzeit that
mixes Achtel and Sechzehntel throws `UngleicheBalkengruppeError`, and the Übungsmarsch has
been kept to groups of equal values to avoid it.

Real Märsche mix values almost everywhere. In ZicZac nearly every Takt mixes them: Achtel +
two Sechzehntel, Sechzehntel–Achtel–Sechzehntel, or a Fünferruf beamed with Sechzehntel. The
model already holds these Takte and playback already plays them. Only the drawing fails. Until
it doesn't, every later slice (more vocabulary, an editor) breaks on the first real Takt.

## Solution

Draw a Balkengruppe of mixed values the way the originals do. The first **Balken** spans the
whole group. Each further Balken spans a run of consecutive Schläge short enough to need it.
A lone shorter Schlag gets a **Balkenstummel** pointing into its group.

Put three real Takte into the Übungsmarsch, two taken from ZicZac, and remove
`UngleicheBalkengruppeError`.

The deliverable: `npm run dev` shows the new Takte looking like the ZicZac crop, and `npm test`
proves which Balken span which Hälse and which way each Stummel points.

## User Stories

1. As a drummer, I want an Achtel followed by two Sechzehntel drawn under one Balken, with a
   second Balken over the two Sechzehntel only, so that I read the rhythm at a glance.
2. As a drummer, I want Sechzehntel–Achtel–Sechzehntel drawn with a Balkenstummel on each
   Sechzehntel pointing inward, so that the syncopation looks as it does in the originals.
3. As a drummer, I want a dotted Achtel followed by a Sechzehntel drawn with the Sechzehntel's
   Stummel pointing left, toward the Punkt.
4. As a drummer, I want a Fünferruf on a Zählzeit beamed with the Sechzehntel that follow it,
   so that ZicZac's most common Ruf placement reads correctly.
5. As a developer, I want each Balken and Balkenstummel emitted by the layout with its
   position, so that the beaming is asserted as data like every other mark.

## Implementation Decisions

**No model or playback change.** Mixed-value Takte are already valid and already play. Only
`src/layout/` and `src/render/` change, plus the Übungsmarsch.

**Grouping stays as it is.** A Balkengruppe is still the consecutive beamable Schläge of one
Zählzeit, built per Takt. A free Fünferruf leading into a Zählzeit still stands outside any
group. The author's right to regroup is recorded in `GLOSSARY.md` but not modelled. It waits
for the editor, or for a real Marsch that needs it.

**The rule.** Take a group's Schläge in order, with _n_ the Balken count each needs
(`fahnenAnzahl`: Achtel 1, Sechzehntel 2, and so on; a dotted value counts as its undotted
base).

- Level 1 spans the whole group, from the first Hals to the last.
- For each level _k_ ≥ 2, every maximal run of consecutive Schläge with _n_ ≥ _k_ that holds
  two or more Schläge gets a Balken from its first Hals to its last.
- A run of one Schlag gets a **Balkenstummel** at level _k_ instead. It points **right** if the
  Schlag is the first of its group, **left** otherwise.

So 8–16–16 gets level 1 over all three and level 2 over the last two. 16–8–16 gets level 1 over
all three and level-2 Stummel on the first (right) and the last (left). Dotted 8 + 16 gets
level 1 over both and a level-2 Stummel on the Sechzehntel, pointing left.

**Layout output.** The `balken` glyph carries one level, and the layout emits one per segment.
It drops `anzahl` for the level it draws (e.g. `ebene`). The Balkenstummel is its own glyph
(e.g. `balkenstummel`) with the Hals x it hangs from, its level and its direction. The
layout decides where a Stummel sits and which way it points. The renderer decides its length,
like the gap between stacked Balken. Exact field names are the implementer's choice.

**Errors.** Remove `UngleicheBalkengruppeError` and its test. A mixed group is no longer an
error.

**Renderer.** Draws each Balken at the y offset of its level, which it already does for stacked
Balken. Draws a Stummel as a short Balken from its Hals in its direction. Stub length is set by
eye against ZicZac, unless `2006Trommelfont` has one (it does not, per the subset noted so far).

**Übungsmarsch.** Add a 2/4 Vers (or extend the existing 2/4 one) with these three Takte.
Accents and dynamics are ignored, and the Hands are read off the head heights in the crop:

- **ZicZac Vers 1, Takt 1**: Achtel, Sechzehntel, Sechzehntel | Sechzehntel, Achtel,
  Sechzehntel.
- **ZicZac Vers 1, Takt 9**: Fünferruf on the Zählzeit, its Landung as a Sechzehntel 1/8 later,
  then a Sechzehntel. The second Zählzeit is filled from the crop.
- **A dotted Achtel + Sechzehntel** on one Zählzeit, borrowed from another original or
  written.

Update the Übungsmarsch's doc comment, which says groups are kept equal on purpose.

## Testing Decisions

**What makes a good test here.** The same as the earlier specs: call `layout`, then assert on
the data, and assert on relationships (a Balken starts at this Hals and ends at that one)
rather than on constants.

**Coverage to hit.**

- 8–16–16: one level-1 Balken from the first to the third Hals, one level-2 Balken from the
  second to the third, no Stummel.
- 16–8–16: one level-1 Balken across all three, a level-2 Stummel at the first Hals pointing
  right and one at the third pointing left, no level-2 Balken.
- Dotted 8 + 16: a level-1 Balken across both, a level-2 Stummel at the second Hals pointing
  left.
- Four Sechzehntel still give level 1 and level 2 across all four (a regression check for equal
  groups), and three Achtel in 6/8 still give one level-1 Balken.
- A Fünferruf beamed with Sechzehntel: the Ruf's Hals is in the group, and its Wirbel and Bogen
  are unchanged.
- A free Fünferruf still gets no Balken.
- The Übungsmarsch lays out without throwing.

## Out of Scope

- **Author regrouping**: Balken across a Zählzeit, or a Zählzeit split into two groups.
- **Triplets and quintuplets** (the "3" and "5" under the Balken in ZicZac).
- **Pausen** inside a Balkengruppe.
- **Zweiunddreissigstel** in the Übungsmarsch. The rule covers them, but no example is
  required.
- **Accents and dynamics.**
- Everything still out of scope from the earlier specs: editing, persistence, Hieroglyphen,
  Pfeife, Auftakt, Voltas, Schluss, the other Rufe.

## Further Notes

`GLOSSARY.md` now holds **Balkengruppe** and **Balkenstummel**, and **Balken** describes the
levels. The Zählzeit is the default group, and the author may regroup. The reference is
`~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf`, Vers 1, first line.
