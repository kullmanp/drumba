# ZicZac Vers 1 — Takte 5 to 8

Status: ready-for-agent

## Problem Statement

The Übungsmarsch's 2/4-Vers follows ZicZac Vers 1 through Takt 4, then three made-up Takte
stand in for the rest. Takte 5 to 8 bring what Drumba cannot yet show:

- **Takt 5** (`ziczac-takt5.png`) has a **Triole** whose "3" covers only three of the four
  Schläge under its Balken, marked by short hooks either side of the number.
- **Takt 6** (`ziczac-takt6.png`) ends with a free Fünferruf mit Schlepp landing on Takt 7,
  and the Schlepp before it is written as a Viertel though it is played as an Achtel.
- **Takt 7** has a **Fünferruf ohne Schlepp**: a free Ruf links, no Vorschlag, landing links.
- **Takt 8** closes the Vers on a Viertel and a Viertelpause.

Vers 1 is cut off at the page edge from Takt 7 on; Takte 7 and 8 are read from the end of
Vers 3 (`ziczac-vers3-takt7-8.png`), which is the same.

Across Takte 4, 6 and 7 the original follows one convention Drumba does not: the Schlag
before a **freier Ruf** is written with its own value plus the Ruf's. Drumba draws the played
value, so all three Takte look different from the original.

## Solution

Add the **Fünferruf ohne Schlepp** to the model, playback and layout; draw a partial Tole's
hooks; draw the Schlag before a free Ruf with the Ruf's value added, and every free Ruf with
one Fahne; replace the filler Takte with ZicZac Vers 1, Takte 5 to 8. See `GLOSSARY.md` for
**Fünferruf ohne Schlepp**, **Freier Ruf** and **Tole**.

The deliverable: `npm run dev` shows and plays the 2/4-Vers as ZicZac Vers 1 — Auftakt and
eight Takte — and `npm test` proves the new Ruf, the hooks and the drawing rule.

## User Stories

1. As a drummer, I want the 2/4-Vers of the Übungsmarsch to be all of ZicZac Vers 1, so that
   I can read and hear the whole Vers.
2. As a drummer, I want a Fünferruf ohne Schlepp links to sound as L L R R in a Sechzehntel,
   then its Landung links, and the mirror rechts.
3. As a drummer, I want to see a Triole that covers part of its Balkengruppe with hooks either
   side of its "3", so that I know which Schläge it covers.
4. As a drummer, I want the Schlag before a free Ruf written as the original writes it — a
   Viertel in Takte 4 and 6, an Achtel in Takt 7 — and every free Ruf with one Fahne.
5. As a developer, I want a Fünferruf ohne Schlepp without a valid Landung, or of any value
   other than a Sechzehntel, to be rejected.
6. As a developer, I want the hooks and the drawn values asserted at the layout seam.

## Implementation Decisions

**Model.** Add `"FuenferrufOhneSchlepp"` to `Figur`, with the `FIGURMERKMALE` entry
`{ vorschlag: false, ruf: { schlaege: 5, dauer: 1/16, landung: "gleicheHand" } }`. Like the
Siebnerruf it is one Schlag on its first stroke with `wert` 1/16 (ADR-0002). Validity and
playback already read the table: the Landung is the next Schlag, a Dupfe, 1/16 later in the
same Hand; the four strokes are L L R R (mirrored rechts), 1/64 apart, no Vorschlag. Expect no
new code there beyond the entry; if there is, the table was not general enough.

**Layout — drawn value.** A Schlag is drawn by its **drawn value**: its `wert`, plus the
Ruf's `wert` when the next element in the same Takt is a free Ruf starting exactly where the
Schlag ends. A Pause before a free Ruf, or no element before it (the Auftakt), keeps its own
value. The drawn value decides everything drawn by value: Fahnen, Balken and Stummel, Punkt,
and whether the Schlag is beamed. Position and x are unchanged. The model, the fill check and
playback keep the played value.

- Takt 4: the Dreierruf on 0 (1/16 + 3/16) is drawn as a Viertel: no Fahne, no Balken.
- Takt 6: the Schlepp on 1/4 (1/8 + 1/8) is drawn as a Viertel.
- Takt 7: the Dupfe on 0 (1/16 + 1/16) is drawn as an Achtel, beamed with the two Sechzehntel
  of its Zählzeit, one Balken under it.

**Layout — free Ruf.** A free Ruf carries exactly one Fahne, whatever its value. The
Fünferruf ohne Schlepp is drawn like the Siebnerruf: no Vorschlag, Wirbel slashes, `rufZahl`
"5", `bogen` to its Landung — no Punkt.

**Layout — Tole hooks.** When a Tole's Schläge are not all of their Balkengruppe, the layout
emits a hook either side of the number, spanning from the Tole's first Hals to its last at
the number's height, leaving a gap for the number. The exact glyph shape (one glyph with two
segments, or two) is the implementer's choice; its ends are coordinates and are asserted on.
The renderer only strokes them. The Quintole in Takt 3 covers its whole group and keeps no
hooks.

**Übungsmarsch, 2/4-Vers.** Takte 5 to 7 (the filler) go; Takte 5 to 8 become:

- **Takt 5:** Schlepp rechts 0 (Achtel), Schlepp links 1/8 (Sechzehntel), Dupfe links 3/16
  (Sechzehntel); a Triole `{ position 1/4, anzahl 3, statt 2, einheit 1/16 }` holding Dupfe
  rechts 1/4, Dupfe links 7/24, Dupfe rechts 1/3 (Sechzehntel); Dupfe links 3/8 (Achtel).
- **Takt 6:** Schlepp rechts 0, Dupfe links 1/16, Dupfe rechts 1/8, Schlepp links 3/16 (all
  Sechzehntel); Schlepp rechts 1/4 (Achtel); Fünferruf rechts 3/8 (Achtel), landing on Takt 7.
- **Takt 7:** Dupfe rechts 0 (Sechzehntel); Fünferruf ohne Schlepp links 1/16 (Sechzehntel);
  Dupfe links 1/8, Dupfe rechts 3/16; Dupfe links 1/4, Dupfe rechts 5/16, Schlepp rechts 3/8,
  Dupfe links 7/16 (all Sechzehntel).
- **Takt 8:** Dupfe rechts 0 (Viertel), Viertelpause 1/4.

Update the file's header comment. Its "all Figuren" test gains `FuenferrufOhneSchlepp`. Check
that what the dropped filler Takte covered in `uebungsmarsch.test.ts` is still covered by the
new Takte or in `layout.test.ts`.

## Testing Decisions

As in the earlier specs: assert on `layout`, `abspielplan` and `pruefeMarsch` output, on
relationships rather than constants chosen by eye.

- **Model:** a Fünferruf ohne Schlepp links landing links 1/16 later passes. Rejected: Landung
  in the other Hand, not exactly 1/16 later, not a Dupfe, missing; `wert` other than 1/16.
- **Playback:** a Fünferruf ohne Schlepp links yields four strokes L L R R, evenly spaced,
  spanning less than 1/16, no Vorschlag; the Landung sounds 1/16 after the first stroke; the
  rechts one is mirrored; its spacing is half a Fünferruf's at the same Taktart and Tempo.
- **Layout:**
  - It has no Vorschlag and no Punkt, Wirbel slashes, `rufZahl` "5", a `bogen` to its Landung,
    and one Fahne when free.
  - Every free Ruf has exactly one Fahne (Siebnerruf, Fünferruf, Fünferruf ohne Schlepp).
  - A Sechzehntel before a free Siebnerruf is drawn with no Fahne and unbeamed; an Achtel
    before a free Fünferruf likewise; a Sechzehntel before a free Fünferruf ohne Schlepp is
    beamed with one Balken and no Stummel. A Pause before a free Ruf is unchanged.
  - A Triole covering three of four Schläge has hooks whose outer ends sit at its first and
    last Hals, around its number; a Tole covering its whole group has none.

## Out of Scope

- Accents (`^`) and dynamics.
- A Fünferruf ohne Schlepp on a Zählzeit, beamed, in 6/8, or as a Landung across Verse.
- The other Verse of ZicZac, and the Rufe of 9, 11 and 15.
- Everything still out of scope from earlier specs: editing, persistence, Hieroglyphen,
  Pfeife.

## Further Notes

Decided in the 2026-10-11 grilling. The drawing rule for the Schlag before a free Ruf was
out of scope in `.scratch/siebnerruf/spec.md`; it is built here. That spec places "the
Viertel before the free Fünferruf" in Vers 1, Takt 8 — it is Takt 6.

Source: `~/Documents/Privat/Fasnacht/Drummelnote/Originale/ZicZac.pdf`. On the 2400 px render:
Takt 5 about y 330, x 880, 160 × 180; Takt 6 about y 340, x 1040, 140 × 200; Vers 3, Takte 7
and 8 about y 740, x 1150, 170 × 520.

## Comments

**2026-10-11, built (agent), awaiting your check.** Screenshot `drumba-takte-4-8.png` beside the
ZicZac crops. Where the result departs from the spec:

- A free Ruf no longer breaks its Balkengruppe: the Balken runs under it, from the Schlag
  before it to its Landung, as in the original. Without that, Takt 7's first Zählzeit fell
  into an unbeamed Achtel and two beamed Sechzehntel.
- A Bogen whose Landung is links ends above the Notenlinie, like a links Ruf's Bogen begins
  (`BOGEN_UEBER_LINIE`). Takt 7 has the first Landung below the line; its Bogen cut through
  the line.
- `gespielteDauer` is now exported from the model, so the layout can tell that a Schlag ends
  exactly where the free Ruf begins, inside a Tole too.

Loose ends:

- The Fünferruf ohne Schlepp stands only a Sechzehntel before its Landung on the time axis,
  so its Bogen and "5" are cramped. The original makes room for it; Drumba spaces by played
  time.
- The hooks' size (`TOLE_ZAHL_HALBBREITE`, `TOLE_ZAHL_HALBHOEHE`) assumes the number's size,
  which the renderer sets.

**2026-10-11, your check.** Looks and sounds right. Two fixes since: every Ruf's number now
stands under its Bogen, not above it; a free Ruf's Hals is now a fixed length from its head
(about two thirds of a full Hals), so under a links head it reaches nearly to the Balken, as in
ZicZac Vers 1, Takte 4 and 7.
