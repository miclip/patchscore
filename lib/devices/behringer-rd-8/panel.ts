import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Behringer RD-8's panel.
 *
 * Our own geometry and line weights. Nothing traced, extracted or embedded — the figure below was
 * measured and then thrown away, exactly as the DFAM's was.
 *
 * ## Which figure, and why not the one §3 prints
 *
 * §3 "Front and Rear Panel Control Layout" (pp.5-7) is eleven separate crops, one per section,
 * each drawn at its own scale with its own callout numbers, and no page shows them together.
 * That is the same shape as the RD-9's manual and it is why `behringer-rd-9` draws no panel:
 * composing eleven crops means guessing where each sits and at what size, which is estimated
 * coordinates in everything but name.
 *
 * **The RD-8's manual has something the RD-9's does not.** §15 "RD-8 Set-up Example" on p.24
 * prints a complete, unobstructed top view of the whole unit, every silkscreen legible at 400
 * dpi, as one element of a hook-up diagram. It is the only figure in 30 pages that shows the
 * whole panel at one scale.
 *
 * ## The projection was checked before anything was measured
 *
 * A product render is not a dimensioned drawing, and a tilted one would compress the depth axis
 * by an unknown amount. Two checks, both passed, both done at 400 dpi:
 *
 *  - **The silhouette is a rectangle.** The chassis' left and right edges sit at a constant x
 *    over its whole height (1189 px and 2243 px on the rendered page, unvarying), so there is no
 *    perspective convergence.
 *  - **Circles render as circles.** The twelve LEVEL knob caps of the voice block measure
 *    18 x 18 px each, across the full width of the panel — from the ACCENT column to the CLOSED
 *    HAT column. A view tilted about the horizontal axis would return ellipses, and the ratio
 *    would be the cosine of the tilt. It returns squares, twelve times.
 *
 * So the projection is orthographic with one scale on both axes, and a single px -> mm factor is
 * the whole conversion.
 *
 * ## The aspect check does not agree with the specification, and that is recorded rather than
 * smoothed over
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect. The measured chassis box is
 * 1054 x 532 px = **1.981**, against p.26's `Dimensions (H x W x D)  77 x 498 x 265 mm`:
 *
 *     498 / 265 = 1.879     <- the specification's own footprint, 5.4% out
 *     498 / 251.4 = 1.981   <- what the drawing says, with the span anchored to the cited 498
 *
 * The isotropy check above rules out the drawing being squashed, so the two numbers disagree
 * about the box rather than about the picture. **The span is cited and the rise is measured**:
 * every coordinate here is scaled by `1054 px = 498 mm`, which makes the drawn rise 251.4 mm and
 * leaves 13.6 mm of the specification's depth outside the top view. Rear jack barrels and the
 * front foot lip are the obvious candidates and the manual states neither, so this file claims
 * only what it measured.
 *
 * A reader who wants the discrepancy closed wants an `observed` measurement off a real unit.
 * That would replace `panelRiseMm` and nothing else.
 *
 * ## What is drawn and what is not
 *
 * **Indicators are not controls.** The TEMPO / SWING / PROB / FLAM lamps beside the display, the
 * 16 / 32 / 48 / 64 bank lamps, the four SYNC lamps and the Wave Designer's SIG lamp are all
 * omitted — the DFAM's rule, for the DFAM's reason: a simplified panel may leave something out,
 * it may not call an indicator a control.
 *
 * **Two rows are grids and the middle row is not.** The twelve LEVEL knobs are identical
 * controls on one pitch and the twelve SELECT buttons are too, so both are one `grid`. The row
 * under LEVEL is `TUNING`, `TONE`, `OFFSET` and two gaps, so it is drawn knob by knob with the
 * label each column actually carries.
 *
 * **The `voices` field sits on the voice-name block**, columns BASS DRUM through CLOSED HAT.
 * That is where this box selects a voice (p.7, control 58), so a lit cell lands on the button a
 * reader would press. ACCENT is drawn beside it as a plain button because it is not an
 * assignable — it is the global emphasis track (p.9, control 1).
 */

// ---------------------------------------------------------------------------
// Measured constants
// ---------------------------------------------------------------------------

/**
 * p.24 rendered at 400 dpi. The chassis silhouette measures 1054 x 532 px, and p.26's
 * Specifications give the width as 498 mm — the only cited dimension this drawing can be
 * anchored to. Every number below is a pixel measurement passed through `mm`.
 */
const PX_TO_MM = 498 / 1054

const mm = (px: number): number => Math.round(px * PX_TO_MM * 10) / 10

/** 532 px of drawn chassis at the span's own scale. See the note above on the 5.4% residual. */
const RISE = mm(532)

/** The voice block's knob caps, twelve of which measure 18 x 18 px; 26 px with their rims. */
const VOICE_KNOB_D = mm(26)

/** MASTER, PHONES and the four FX knobs, which are drawn a size up from the voice knobs. */
const BIG_KNOB_D = mm(30)

/** The three knob rows of the voice block, and the twelve column centres they share. */
const LEVEL_ROW = mm(126.5)
const SHAPE_ROW = mm(194.5)
const TAIL_ROW = mm(262.4)
const COLUMN = [279.0, 341.0, 403.3, 465.4, 527.6, 591.1, 652.5, 715.4, 778.3, 840.3, 902.3, 964.7].map(mm)

/** The twelve columns are indexed from the panel's own left-to-right order, ACCENT first. */
function col(i: number): number {
  const centre = COLUMN[i]
  if (centre === undefined) throw new Error(`behringer-rd-8 panel: no voice column ${i}`)
  return centre
}

/** `x`/`y` are a bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string, d = VOICE_KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A rectangular push button or a two-position voice switch, measured as a box. */
function button(x: number, y: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'button', x: mm(x), y: mm(y), w: mm(w), h: mm(h), label }
}

/** A hairline section boundary the panel actually prints. */
function group(x: number, y: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'group', x: mm(x), y: mm(y), w: mm(w), h: mm(h), label }
}

export const RD8_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'RHYTHM DESIGNER RD-8 User Manual, p.24 (top view, §15 Set-up Example)',
  },
  features: [
    // ---- volume, top left ---------------------------------------------------------
    knob(mm(82.5), mm(65), 'MASTER', BIG_KNOB_D),
    knob(mm(214), mm(65), 'PHONES', BIG_KNOB_D),

    // ---- the FX bus: one filter and one Wave Designer for every voice sent to it ----
    group(59, 86, 180, 131, 'FX'),
    knob(mm(82.5), mm(122.5), 'CUTOFF', BIG_KNOB_D),
    button(115, 117, 27, 19, 'HPF'),
    button(155, 117, 34, 20, 'ON'),
    knob(mm(215), mm(122.5), 'RESONANCE', BIG_KNOB_D),
    { kind: 'label', x: mm(149), y: mm(140), text: 'ANALOG FILTER', align: 'middle' },
    knob(mm(82.5), mm(192.5), 'ATTACK', BIG_KNOB_D),
    button(155, 186, 34, 18, 'SEND'),
    knob(mm(215), mm(192.5), 'SUSTAIN', BIG_KNOB_D),
    { kind: 'label', x: mm(149), y: mm(163), text: 'WAVE DESIGNER', align: 'middle' },

    // ---- edit, mode and sync, stacked down the left edge ---------------------------
    group(61, 226, 178, 34, 'EDIT'),
    button(69, 238, 32, 21, 'SAVE'),
    button(112, 238, 32, 21, 'COPY'),
    button(155, 238, 32, 21, 'ERASE'),
    button(199, 238, 32, 21, 'DUMP'),

    group(59, 269, 180, 43, 'MODE'),
    button(66, 286, 54, 19, 'SONG'),
    button(122, 286, 55, 19, 'PATTERN'),
    button(182, 286, 55, 19, 'STEP'),

    group(59, 316, 180, 37, 'SYNC'),
    button(68, 327, 32, 22, 'CYCLE'),

    // ---- transport and the display ------------------------------------------------
    button(66, 361, 52, 48, 'TAP / HOLD'),
    { kind: 'screen', x: mm(128), y: mm(366), w: mm(100), h: mm(44) },
    knob(mm(256), mm(390), 'DATA', mm(33)),
    button(325, 394, 47, 15, 'DATA MODE'),
    button(66, 432, 52, 48, 'RECORD'),
    button(123, 432, 52, 48, 'STOP'),
    button(180, 432, 52, 48, 'PLAY / PAUSE'),

    // ---- auto scroll and pattern length -------------------------------------------
    group(418, 358, 202, 71, 'AUTO SCROLL'),
    button(427, 366, 46, 47, 'AUTO SCROLL'),
    button(485, 393, 30, 19, '<<'),
    button(522, 393, 52, 19, 'LENGTH'),
    button(579, 393, 31, 19, '>>'),

    // ---- step and note repeat ------------------------------------------------------
    group(625, 358, 302, 71, 'STEP & NOTE REPEAT'),
    button(633, 391, 33, 21, '1'),
    button(672, 391, 33, 21, '2'),
    button(710, 391, 33, 21, '4'),
    button(750, 391, 33, 21, '8'),
    button(788, 391, 34, 21, 'STEP REPEAT'),
    button(828, 391, 34, 21, 'NOTE REPEAT'),
    button(867, 365, 50, 47, 'TRIGGER'),

    // ---- track control, settings and autofill, down the right edge ------------------
    { kind: 'label', x: mm(963), y: mm(359), text: 'TRACK', align: 'middle' },
    button(941, 370, 45, 14, 'MUTE'),
    button(941, 396, 45, 16, 'SOLO'),
    button(941, 435, 46, 16, 'SETTINGS'),
    button(941, 461, 46, 17, 'AUTO FILL'),

    // ---- the voice block: twelve columns, three knob rows, five voice switches -------
    {
      kind: 'grid',
      x: col(0) - VOICE_KNOB_D / 2,
      y: LEVEL_ROW - VOICE_KNOB_D / 2,
      w: col(11) - col(0) + VOICE_KNOB_D,
      h: VOICE_KNOB_D,
      cols: 12,
      rows: 1,
      shape: 'knob',
      label: 'LEVEL',
    },
    // The middle row is not uniform: RIM SHOT and COW BELL have nothing on it, and the knob over
    // ACCENT tunes the bass drum (p.9, control 2).
    knob(col(0), SHAPE_ROW, 'TUNING'),
    knob(col(1), SHAPE_ROW, 'TONE'),
    knob(col(2), SHAPE_ROW, 'TONE'),
    knob(col(3), SHAPE_ROW, 'TUNING'),
    knob(col(4), SHAPE_ROW, 'TUNING'),
    knob(col(5), SHAPE_ROW, 'TUNING'),
    knob(col(7), SHAPE_ROW, 'OFFSET'),
    knob(col(9), SHAPE_ROW, 'TONE'),
    knob(col(10), SHAPE_ROW, 'TONE'),
    knob(col(11), SHAPE_ROW, 'TONE'),

    knob(col(1), TAIL_ROW, 'DECAY'),
    knob(col(2), TAIL_ROW, 'SNAPPY'),
    knob(col(9), TAIL_ROW, 'DECAY'),
    knob(col(10), TAIL_ROW, 'DECAY'),

    button(442, 249, 49, 20, 'LOW CONGA'),
    button(504, 249, 49, 20, 'MID CONGA'),
    button(567, 249, 48, 20, 'HI CONGA'),
    button(629, 249, 49, 20, 'CLAVES'),
    button(692, 249, 48, 20, 'MARACAS'),

    // ACCENT is not an assignable, so it sits beside the voice field rather than inside it.
    button(255, 303, 49, 21, 'ACCENT'),
    button(255, 327, 50, 22, 'SELECT'),
    { kind: 'voices', x: mm(316), y: mm(303), w: mm(674), h: mm(46) },

    // ---- the sixteen step buttons, on one uniform 43.3 px pitch ---------------------
    {
      kind: 'grid',
      x: mm(246),
      y: mm(432),
      w: mm(678),
      h: mm(50),
      cols: 16,
      rows: 1,
      shape: 'pad',
      label: 'STEP',
    },
  ],
}
