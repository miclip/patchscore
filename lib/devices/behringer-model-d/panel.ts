import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Behringer MODEL D's panel.
 *
 * Read off the blank **patch sheet on printed p.40** — the DFAM's source and for the same reason.
 * It is the one complete, unobstructed, fully-labelled plan view in this document: every knob is
 * drawn with its own tick ring and printed scale and **no pointer**, because the sheet exists for
 * the reader to draw one. p.7's *3.1 Top Controls* is the same panel cut into blocks with numbered
 * callouts laid over it, and p.15's *Control Settings for Calibration* is the same drawing again
 * with pointers and grey fills that swallow the tick rings. Our own geometry and line weights;
 * nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** p.40 was rendered at 600 dpi, rotated
 * into playing orientation, and the panel's outer border located by its longest straight runs at
 * 5999 x 2170 px. Control positions are the centroids of the drawing's own white components — a
 * knob face, a switch body and a jack bore are each an enclosed white region, and taking centroids
 * rather than reading by eye is why all nine MODIFIERS knobs come out on three y values to a
 * hundredth of a millimetre and the five MODIFIERS jacks at 13.335 mm pitch.
 *
 * ## The aspect check, and what it settles
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. p.34 prints two candidate widths in the same block — `Dimensions (H x W x D)  90 x
 * 374 x 136mm` and, two rows later, `Module width  70HP`. The measured panel box is
 * 5999 / 2170 = **2.7645**, against
 *
 *     355.6 / 128.5 = 2.7674   <- 70 HP x 3U, 0.10% out
 *     374   / 136   = 2.7500   <- the chassis, width by depth, 0.53% out
 *     374   /  90   = 4.1556   <- the chassis, width by height, 50% out
 *
 * So the figure is the **Eurorack panel**, and 374 mm is the factory chassis with its wooden end
 * cheeks — which the arithmetic corroborates exactly rather than approximately: 374 − 355.6 =
 * 18.4 = 2 x 9.2 mm of wood. §8 of the manual (p.32) is a chapter on taking that chassis off, so
 * the panel is the part of this box that survives. `physical.panelSpanMm` is therefore 355.6 —
 * 70 HP at the Eurorack 5.08 mm, arithmetic on p.34's own figure and not a second reading.
 *
 * `panelRiseMm` is then **measured rather than assumed**: 2170 px scaled by the cited span gives
 * 128.63 mm. That it lands on the 3U standard of 128.5 is corroboration, not the source — no page
 * of this manual prints a panel height at all.
 *
 * ## Two counts that agree, which is why the component sweep is trusted
 *
 * p.6 states the panel in one line: *"The MODEL D has 29 knobs and 19 switches"*. The sweep found
 * **29 circular knob faces and 19 switch bodies**, independently, and every one of them is below.
 * The five mixer switches interleave rather than stack — OSC 1, EXT IN, OSC 2, NOISE, OSC 3 down
 * the column, each wired across to the volume knob on its own side — which is the layout the
 * measurement produced and not one anybody would guess.
 *
 * ## What the drawing carries and what it cannot
 *
 * **There is no jack in this vocabulary**, as the DFAM, the CRAVE and the Neutron all record, so
 * the fifteen 3.5 mm patch points are `grid` blocks — decorative, binding nothing, carrying no
 * named jack positions. They are drawn as five separate grids because the panel scatters them
 * that way, one strip per section along the top edge, rather than as one patchbay. The two MIDI
 * DINs and the USB port are three more, for the same want of a better shape.
 *
 * The panel marks each jack's direction with a small triangle beside its label — `▼` above an
 * input, `▲` above an output. That is a fact about the silkscreen rather than about a rectangle,
 * so it is recorded here and carried in `index.ts` by the jack directions themselves.
 *
 * **No screen, because the box has none.** Two LEDs — `OVERLOAD` in the mixer and `POWER` in the
 * output section — are the whole of its reporting, and both were measured at 3.6 mm. Neither is
 * drawn: they are indicators rather than controls, nothing in a guide ever asks a reader to set
 * one, and the Neutron and the Minitaur leave theirs off for the same reason.
 *
 * The two vendor marks the sheet carries — the `D` logo in the mixer and the Behringer triangle
 * in the output section — are not drawn either. They came out of the component sweep as two
 * rectangles and were dropped there: §10 says panel artwork is reference, never asset.
 *
 * **Group rectangles are measured, not derived.** This drawing boxes its own six sections, and
 * every edge below is a straight run the sweep found: the top edges on one row at y 1.45, the
 * dividers as full-height verticals at 62.4, 150.7, 233.5 and 311.3, and `LOUDNESS CONTOUR`'s
 * top edge as a run of its own at y 79.1. Corners round outward by about a millimetre beyond the
 * straight portion; the boxes below are the straight parts.
 *
 * ## The voice field
 *
 * Placed in `OUTPUT`, the section the one voice finally leaves by — the CRAVE's reasoning, and
 * for a box with no voice or track selector there is nothing better to point at. A clear-space
 * sweep of that section found 24 x 9 mm free between the `PHONES` row and the section label, at
 * 2.67 : 1 and so under the rack's 3 : 1 cell ceiling.
 */

/** 70 HP at the Eurorack 5.08 mm/HP, from `Module width  70HP` on p.34. */
export const MODEL_D_PANEL_SPAN_MM = 355.6

/** 2170 px of drawn panel scaled by the span — see the aspect check above. */
const RISE = 128.6

/**
 * The knob faces come in exactly two diameters and the drawing is consistent about which.
 *
 * Twenty-five knobs measure 7.8 mm across the outer circle; the four `RANGE` and `WAVEFORM` knobs
 * in the oscillator bank measure 9.8 mm and are visibly the larger control in the figure. The
 * `OSCILLATOR-2` and `-3` `FREQUENCY` knobs between them are the small size — their tick rings are
 * wider, because a ±7 scale needs fifteen marks, but the caps are not.
 */
const KNOB_D = 7.8
const OSC_KNOB_D = 9.8
/** The nineteen switches, all one body: 15.5 x 8.5 mm, laid on its side where the panel turns it. */
const SW_W = 15.5
const SW_H = 8.5
/** The fifteen 3.5 mm patch points, and the bore is what the sheet draws. */
const JACK_D = 8.4
/** The two 5-pin DINs. */
const DIN_D = 16.8

/** Centres are what a measurement gives you; `x`/`y` are the top-left corner (§10). */
function knob(cx: number, cy: number, label: string, d: number = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A switch, wide by default and upright where `upright` says the panel stands it on end. */
function sw(cx: number, cy: number, label: string, upright = false): PanelFeature {
  const w = upright ? SW_H : SW_W
  const h = upright ? SW_W : SW_H
  return { kind: 'button', x: cx - w / 2, y: cy - h / 2, w, h, label }
}

/**
 * A row of sockets. `PanelFeature` has no jack, so a strip of them is a `grid` — decorative, and
 * binding nothing. `firstCx` is the centre of the leftmost, `pitch` the measured spacing.
 */
function jacks(
  firstCx: number,
  cy: number,
  count: number,
  pitch: number,
  label: string,
  d = JACK_D,
): PanelFeature {
  return {
    kind: 'grid',
    x: firstCx - d / 2,
    y: cy - d / 2,
    w: d + (count - 1) * pitch,
    h: d,
    cols: count,
    rows: 1,
    shape: 'knob',
    label,
  }
}

/** A measured section box. `x0`/`y0` to `x1`/`y1`, which is how the straight runs came out. */
function group(x0: number, y0: number, x1: number, y1: number, label: string): PanelFeature {
  return { kind: 'group', x: x0, y: y0, w: x1 - x0, h: y1 - y0, label }
}

/** The three knob rows the oscillator bank, mixer and modifiers all share, measured. */
const ROW_1 = 38.28
const ROW_2 = 68.76
const ROW_3 = 99.24
/** The top strip every section's patch points sit on. */
const JACK_ROW = 14.79

export const MODEL_D_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: { kind: 'manual', source: 'MODEL D User Manual, p.40 (MODEL D Patch Sheet)' },
  features: [
    // ---- the six section boxes, drawn first so everything else sits on them ----------
    group(3.3, 1.45, 60.8, 27.4, 'MIDI'),
    group(1.4, 28.7, 63.6, 126.8, 'CONTROLLERS'),
    group(65.5, 1.45, 148.5, 126.2, 'OSCILLATOR BANK'),
    group(153.1, 1.45, 231.4, 126.2, 'MIXER'),
    group(236.0, 1.45, 309.2, 126.2, 'MODIFIERS'),
    // Inside MODIFIERS, and the panel's own division: its top edge is a straight run at y 79.1.
    group(243.2, 79.1, 309.2, 126.2, 'LOUDNESS CONTOUR'),
    group(313.8, 1.45, 352.3, 126.2, 'OUTPUT'),

    // ---- MIDI: a USB B port and two 5-pin DINs (p.8, items 1-3) ---------------------
    { kind: 'grid', x: 10.76 - 12.7 / 2, y: 17.96 - 11.4 / 2, w: 12.7, h: 11.4, cols: 1, rows: 1, label: 'USB' },
    jacks(31.74, 17.96, 2, 20.95, 'MIDI IN · THRU', DIN_D),

    // ---- CONTROLLERS (p.8, items 4-12) ----------------------------------------------
    knob(31.74, 45.58, 'TUNE'),
    knob(16.18, 68.76, 'GLIDE'),
    knob(47.29, 68.76, 'MOD MIX'),
    sw(16.18, 85.57, 'OSC 3 / FILTER EG'),
    sw(47.27, 85.57, 'NOISE (MOD SRC) / LFO'),
    knob(16.18, 107.81, 'MOD DEPTH'),
    sw(31.74, 107.79, 'LFO WAVEFORM', true),
    knob(47.29, 107.81, 'LFO RATE'),

    // The two switches that straddle the CONTROLLERS/OSCILLATOR BANK border, drawn where the
    // sheet draws them: on the line, not inside either box.
    sw(63.13, 45.58, 'OSCILLATOR MODULATION'),
    sw(69.5, 99.26, 'OSC 3 CONTROL', true),

    // ---- OSCILLATOR BANK (p.9, items 13-19) -----------------------------------------
    jacks(87.3, JACK_ROW, 3, 24.765, 'MOD SOURCE · OSC 1V/OCT · LFO CV'),
    knob(87.3, ROW_1, 'OSC 1 RANGE', OSC_KNOB_D),
    knob(136.83, ROW_1, 'OSC 1 WAVEFORM', OSC_KNOB_D),
    knob(87.3, ROW_2, 'OSC 2 RANGE', OSC_KNOB_D),
    knob(112.06, ROW_2, 'OSC 2 FREQUENCY'),
    knob(136.83, ROW_2, 'OSC 2 WAVEFORM', OSC_KNOB_D),
    knob(87.3, ROW_3, 'OSC 3 RANGE', OSC_KNOB_D),
    knob(112.06, ROW_3, 'OSC 3 FREQUENCY'),
    knob(136.83, ROW_3, 'OSC 3 WAVEFORM', OSC_KNOB_D),

    // ---- MIXER (p.9, items 20-29) ---------------------------------------------------
    jacks(158.1, JACK_ROW, 2, 13.34, 'LFO TRI · LFO SQR'),
    jacks(203.5, JACK_ROW, 2, 13.34, 'EXT · MIX'),
    knob(161.91, ROW_1, 'OSC 1 VOLUME'),
    knob(161.91, ROW_2, 'OSC 2 VOLUME'),
    knob(161.91, ROW_3, 'OSC 3 VOLUME'),
    // The interleaved column. Each switch sits on the row of the knob it selects, which is why
    // EXT IN and NOISE fall between the oscillators rather than under them.
    sw(182.22, 38.26, 'OSC 1'),
    sw(182.22, 53.5, 'EXT IN'),
    sw(182.22, 68.73, 'OSC 2'),
    sw(182.22, 83.91, 'NOISE'),
    sw(182.22, 99.26, 'OSC 3'),
    knob(202.55, 53.52, 'EXT IN VOLUME'),
    knob(202.55, 84.0, 'NOISE VOLUME'),
    sw(218.11, 84.02, 'WHITE / PINK', true),

    // ---- MODIFIERS (p.10, items 30-41) ----------------------------------------------
    jacks(250.49, JACK_ROW, 5, 13.335, 'CUT CV · FC GATE · FILT CONT · LC GATE · LOUD CONT'),
    sw(233.67, 23.03, 'FILTER MODE'),
    sw(233.67, 38.26, 'FILTER MODULATION'),
    sw(233.67, 53.5, 'KEYBOARD CONTROL 1'),
    sw(233.67, 68.73, 'KEYBOARD CONTROL 2'),
    sw(233.67, 84.02, 'FILTER DECAY'),
    sw(233.67, 99.2, 'LOUD DECAY'),
    knob(254.3, ROW_1, 'CUTOFF FREQUENCY'),
    knob(277.16, ROW_1, 'FILTER EMPHASIS'),
    knob(300.02, ROW_1, 'AMOUNT OF CONTOUR'),
    knob(254.3, ROW_2, 'FILTER ATTACK'),
    knob(277.16, ROW_2, 'FILTER DECAY TIME'),
    knob(300.02, ROW_2, 'FILTER SUSTAIN'),
    knob(254.3, ROW_3, 'LOUDNESS ATTACK'),
    knob(277.16, ROW_3, 'LOUDNESS DECAY TIME'),
    knob(300.02, ROW_3, 'LOUDNESS SUSTAIN'),

    // ---- OUTPUT (p.11, items 42-49) -------------------------------------------------
    jacks(322.88, JACK_ROW, 2, 20.32, 'LOUD CV · MAIN'),
    knob(322.88, ROW_1, 'VOLUME'),
    sw(343.18, 38.26, 'MAIN OUT'),
    sw(322.88, 68.76, 'A-440'),
    knob(322.88, ROW_3, 'PHONES VOLUME'),
    jacks(343.2, ROW_3, 1, 0, 'PHONES'),

    // ---- the one region the resolver writes ------------------------------------------
    { kind: 'voices', x: 318, y: 108.5, w: 24, h: 9 },
  ],
}
