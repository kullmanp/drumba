# Dreierruf — the Tagwachtstreich of ZicZac Vers 1, Takt 3

Status: ready-for-agent

Blocked by: `.scratch/tole/spec.md`

## Problem Statement

ZicZac Vers 1, Takt 3 (`ziczac-takt3.png`) ends on a **Tagwachtstreich**: a Dreierruf mit
Nachschlag inside the Quintole, then a Dreierruf in the other Hand that lands on Takt 4's first
Schlag (`ziczac-takt4.png`). Each Dreierruf is written as a small mark of two stacked
Notenköpfe over three short slashes, standing before its Landung. After the Tole slice, Takt 3
has its Quintole but neither mark: it looks wrong and sounds wrong, missing four strokes.

## Solution

A **Dreierruf** (see `GLOSSARY.md`) is a new Figur on its **Landung** (ADR-0004), held like the
Doublé's soft Dupfe. The Schlag is the Landung, at its own position, value and Hand. Two rolled
Dupfe in the other Hand belong to the figure and take no room. They divide the gap from the
Schlag before the Landung to the Landung into three equal parts. The layout draws the mark
midway in that gap, at the height of its own Hand. Playback adds the two rolled Dupfe at 0.75.
`pruefeMarsch` gains the rule that every Ruf lands on a Dupfe.

The deliverable: `npm run dev` shows ZicZac Vers 1, Takt 3 and Takt 4's first Schlag with both
marks where the original has them, and playback plays the Tagwachtstreich. `npm test` proves
the rolled Dupfe's times, Hand and loudness, the mark's place, and the new check.

## User Stories

1. As an author, I want to write a Dreierruf as one Schlag, its Landung, so that a Takt is
   filled by its written values as before.
2. As a drummer, I want the mark drawn as in the originals, two small Notenköpfe over three
   slashes between the previous Schlag and the Landung, above the Notenlinie for rechts and
   below for links.
3. As a drummer, I want the mark of a Dreierruf landing on a Takt's first Schlag drawn before
   that Taktstrich, as the original does.
4. As a drummer, I want to hear the two rolled Dupfe evenly between the previous Schlag and the
   Landung, in the other Hand, softer than the Landung.
5. As an author, I want a Ruf landing on anything but a Dupfe to be rejected.

## Implementation Decisions

**Model.**

- `Figur` gains `"Dreierruf"`. Its `FIGURMERKMALE` entry says what makes it one: no
  Vorschlag, and two rolled Dupfe in the other Hand before the Schlag, spread over the gap from
  the previous Schlag. Like the Doublé's `leiseDupfe`, put this in the table so layout and
  playback read one source.
- It is not a `ruf` in the Fünferruf's sense, which is a Ruf on its first stroke with a
  Landung after it. Keep the two apart: `pruefeLandung` must not treat a Dreierruf as a Ruf
  needing a following Landung.
- **The previous Schlag** is the Schlag before the Dreierruf in written order. It may be in the
  previous Takt or in the Vers's Auftakt.
- **New checks** in `pruefeMarsch`, each with an error naming Vers and Takt:
  - A Dreierruf with no previous Schlag in its Vers is rejected.
  - A Dreierruf whose previous element is a Pause is rejected. No original shows either case;
    loosen this when one does.
  - Every Ruf lands on a Dupfe: a Fünferruf whose Landung is not `"Dupfe"` is rejected. ADR-0004
    states that every Ruf lands on a Dupfe. A Dreierruf is itself its Landung, and its Figur
    replaces Dupfe, so this check does not apply to it.

**Layout.**

- A Dreierruf lays out its Landung exactly as a Dupfe (Notenkopf, Hals, Balken or Fahne), plus
  one new glyph for the mark.
- The glyph's x is midway between the previous Schlag's Notenkopf and the Landung's. If a
  Taktstrich lies between them, x is midway between the previous Notenkopf and that
  Taktstrich, in the earlier Takt.
- The glyph's y is the Notenkopf height of the other Hand: above the Notenlinie when the
  Landung is links.
- The layout gives the point, and the renderer gives the inner shape.

**Renderer.** Two small Notenköpfe stacked one above the other, over three short horizontal
slashes, as in the crops. They are smaller than a full Notenkopf and have no Hals.

**Playback.**

- A Dreierruf yields three Anschläge: two rolled Dupfe in the other Hand at 1/3 and 2/3 of the
  gap from the previous Schlag's played time, at `ROLL_DUPFE_LAUTSTAERKE` 0.75, then the
  Landung at 1.
- The gap is measured in played time, so across a Taktstrich, and from the Auftakt into
  Takt 1. On a repeat, the previous Schlag is whatever was played just before, which may be
  the last Takt of the Vers or the Auftakt replayed over it.
- 0.75 is by ear, and the human tunes it after listening.

**Übungsmarsch.**

- Takt 3 (ZicZac Vers 1, Takt 3, from the Tole slice): its Dupfe links at 7/20 becomes a
  Dreierruf links.
- The next Takt's first Schlag (Dupfe rechts at 0) becomes a Dreierruf rechts, as in ZicZac
  Takt 4.
- Update the header comment.

## Testing Decisions

At the seam, relationships over constants (`CODING_STANDARDS.md`).

- **Model:**
  - The Übungsmarsch passes.
  - A Dreierruf on the first Schlag of a Vers with no Auftakt is rejected.
  - A Dreierruf after a Pause is rejected.
  - A Fünferruf landing on a Schlepp or a Doublé is rejected.
- **Layout:**
  - A Dreierruf has everything a Dupfe at the same place has, plus one mark.
  - The mark lies midway between the two Notenköpfe.
  - When the Landung opens a Takt, the mark lies midway between the previous Notenkopf and
    the Taktstrich, before the Taktstrich.
  - The mark sits at the other Hand's height, on both Hands.
- **Playback:**
  - The two rolled Dupfe are in the other Hand, at exactly 1/3 and 2/3 of the gap.
  - This holds for the Quintole's played times, across a Taktstrich, and at 2/4 and 6/8.
  - They are softer than the Landung.
  - A Dupfe yields no rolled Dupfe.
- The Übungsmarsch lays out and plays without throwing.

## Out of Scope

- The **abgesetzt** Dreierruf: the slurred mark, played faster and closer to the Landung.
- Other Rufe written as a small mark.
- A Dreierruf after a Pause or at the very start of a Vers.
- The Siebnerruf mit Nachschlag and the free Siebnerruf in ZicZac Takt 4.
- Dreierrufe in Hieroglyphen.

## Further Notes

Decided in the 2026-10-11 grilling, recorded in ADR-0004. "Viererruf" is the traditional name
for a Dreierruf mit Nachschlag. The Nachschlag is a plain Dupfe and is not modelled.

Played timing of the second Zählzeit of Takt 3, in fifths of the Zählzeit:

| Played time | 0      | 2/3  | 4/3  | 2           | 3      | 11/3 | 13/3 | 5 (Takt 4) |
| ----------- | ------ | ---- | ---- | ----------- | ------ | ---- | ---- | ---------- |
| Hand        | L      | r    | r    | L           | R      | l    | l    | R          |
| Written as  | Achtel | mark | mark | Sechzehntel | Achtel | mark | mark | Landung    |

Reference: `~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf`, cropped in
`ziczac-takt3.png` and `ziczac-takt4.png`.
