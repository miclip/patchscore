import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Minitaur's panel.
 *
 * Read off the FRONT PANEL figure on printed p.6 — the only complete, unobstructed,
 * fully-labelled panel drawing in the document. Our own geometry and line weights; nothing
 * traced, extracted or embedded.
 *
 * ## Every coordinate was measured, and measured from the vector artwork rather than a render
 *
 * The figure is **vector**, not a bitmap: `pdftocairo -svg` on PDF page 4 yields 900 paths and
 * two 16 x 15 px icons that are unrelated glyphs. So the geometry is exact and there is no need
 * to hunt centroids in a raster at all. Each path's bounding box was taken in page coordinates
 * with the enclosing `<g transform>` stack resolved, the panel border located as the largest
 * path on the page, and every control read off directly.
 *
 *     panel border      284.26 x 179.49 pt   at (443.5, 146.1) on the page
 *     scale             222.3 mm / 284.26 pt = 0.78203 mm/pt
 *
 * **A first pass at this measured a 200 dpi render instead and concluded the figure was not to
 * scale.** It reported the knobs as ellipses of aspect 1.098 and the panel was left undrawn on
 * the strength of it. That was wrong, and the error was in the measurement rather than the
 * document: connected-component analysis at that threshold merges each knob ring with its own
 * pointer and the tick marks beside it, which stretches the bounding box horizontally. The
 * vector paths settle it — **every knob is a circle to four decimal places**, 1.0000, 0.9999,
 * 0.9997 across all eighteen, and the back-panel jacks on p.18 likewise. The lesson is the one
 * `CLAUDE.md` already states about `pdftotext`, one tool along: a render is evidence about a
 * render, and the artwork itself is available here.
 *
 * ## The aspect check, and the rise it picks
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. The drawn aspect is **1.5837**, and the specification line on p.30 —
 * `8.75" x 5.12" x 3.12"`, `222.3mm x 130.2mm x 79.4mm` — offers no pair that matches it:
 *
 *     222.3 / 130.2 = 1.7074     <- the footprint depth, 7.8% out
 *     222.3 /  79.4 = 2.7997
 *     130.2 /  79.4 = 1.6398
 *
 * So the rise comes from the drawing, which is what §2.3 says to do — *"read it off the drawing,
 * not off the axis letters"*. At the cited 222.3 mm span the panel face is **140.36 mm**, and
 * `panelSpanMm / panelRiseMm` is 1.5838 against the drawn 1.5837.
 *
 * **That the face is longer than the footprint is a fact about the box, not a discrepancy.** The
 * Minitaur's top slopes, so the surface you play is longer than the depth it stands on: a face
 * of 140.4 mm over a 130.2 mm footprint implies a front-to-back rise of about 52 mm, well inside
 * the box's 79.4 mm height. The Mother-32 hit the mirror image of this and its panel comment
 * records it — there the table's *axis letters* were wrong and the drawing picked 133 mm over
 * 106.9 mm. Here the letters are right and the face simply is not one of the three edges.
 *
 * `verified` cites p.6, the drawing these coordinates come off. The 222.3 mm span they are
 * scaled against is `physical.verified`'s p.30, in the manifest.
 *
 * ## What is drawn and what is not
 *
 * Eighteen knobs, four buttons and the voice field. The section brackets the panel silkscreens —
 * `VCO 2`, `FILTER`, `VCA`, `OSCILLATORS`, `MIX`, `ENVELOPES`, `MOD` — and the `moog` logotype
 * are **not** drawn: their rectangles were not measured, and §10's standard is that an estimated
 * coordinate is worse than an absent one because it looks exactly like a measured one. The knob
 * labels carry the same information where a reader needs it, on the control itself.
 *
 * The MIDI activity LED beside `FINE TUNE` is not drawn either. It is an indicator rather than a
 * control, and nothing in a guide ever asks a reader to set it.
 */

/**
 * One diameter for the standard knobs, and a larger one for `CUTOFF`.
 *
 * The measured outer paths run 19.9 to 22.6 mm across the seventeen standard knobs, and that
 * spread is the tick ring being present on some and absent on others rather than seventeen
 * different knobs — the Minitaur's caps are one size. 21.5 mm is their mean. `CUTOFF` is
 * genuinely the larger control on this panel, drawn at 28.5 mm and visibly bigger in the figure,
 * so it keeps its own diameter.
 */
const KNOB_D = 21.5
const CUTOFF_D = 28.5
/** The four panel switches, drawn square at their measured 10.7 mm. */
const SWITCH = 10.7
/** `FINE TUNE` is a small screwdriver-style trimmer, not a performance knob. */
const TRIM_D = 5

/** Centres are what a measurement gives you; `x`/`y` are the top-left corner (§10). */
function knob(cx: number, cy: number, label: string, d: number = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

function button(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'button', x: cx - SWITCH / 2, y: cy - SWITCH / 2, w: SWITCH, h: SWITCH, label }
}

/** The three knob rows, at the y each row's paths agree on to a tenth of a millimetre. */
const TOP = 32.6
const MID = 70.2
const LOW = 107.9

export const MINITAUR_PANEL: PanelLayout = {
  panelRiseMm: 140.36,
  verified: {
    kind: 'manual',
    source: 'Moog Minitaur Manual, p.6 (FRONT PANEL figure)',
  },
  features: [
    // ---- top row: VCO 2, FILTER, VCA -------------------------------------------------
    knob(52.9, TOP, 'FREQ'),
    knob(91.8, TOP, 'CUTOFF', CUTOFF_D),
    knob(130.6, TOP, 'RES'),
    knob(164.6, TOP, 'EG AMOUNT'),
    knob(198.6, TOP, 'VOLUME'),

    // `FINE TUNE`, the trimmer under the bull. Sets both oscillators and takes no MIDI (p.10).
    knob(28.1, 39.0, 'FINE TUNE', TRIM_D),

    // ---- middle row: the two oscillator switches, MIX, and the filter envelope --------
    button(23.8, 60.4, 'OSC 1'),
    button(23.8, 82.3, 'OSC 2'),
    knob(52.9, MID, 'VCO 1 LVL'),
    knob(82.0, MID, 'VCO 2 LVL'),
    // The panel prints ATTACK / DECAY-RELEASE / SUSTAIN once, under the FILTER and AMPLIFIER
    // row brackets. The row is named on each control here, since the brackets are not drawn.
    knob(111.2, MID, 'FILTER ATTACK'),
    knob(140.3, MID, 'FILTER DECAY/REL'),
    knob(169.3, MID, 'FILTER SUSTAIN'),

    // ---- bottom row: MOD, and the amplifier envelope ----------------------------------
    knob(23.8, LOW, 'LFO RATE'),
    knob(52.9, LOW, 'VCO LFO AMT'),
    knob(82.0, LOW, 'VCF LFO AMT'),
    knob(111.2, LOW, 'AMP ATTACK'),
    knob(140.2, LOW, 'AMP DECAY/REL'),
    knob(169.4, LOW, 'AMP SUSTAIN'),

    // ---- right column: the two switches and the glide rate ----------------------------
    button(201.8, 59.1, 'RELEASE'),
    knob(201.7, 87.0, 'GLIDE RATE'),
    button(201.8, 110.4, 'GLIDE'),

    // ---- the one region the resolver writes ------------------------------------------
    // The bottom strip below the MOD row, which ends at y 119.1. One voice, so the region is
    // sized like the Mother-32's rather than stretched across a panel that has no room for it.
    { kind: 'voices', x: 14, y: 127, w: 28, h: 10 },
  ],
}
