import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Grandmother's front panel.
 *
 * ## Two figures, and the second one checks the first
 *
 * This is the first panel in the library measured off **two** independent drawings that agree,
 * and it needed both:
 *
 *  - **printed p.52**, the blank patch sheet — the module strip alone, rotated 90° to fit a
 *    portrait page, at the largest scale the document prints. Every jack, knob, switch and
 *    module boundary in the strip comes from here.
 *  - **printed p.7**, the GRANDMOTHER OVERVIEW figure — a flat, orthographic, full-instrument
 *    plan view. It is the only figure that carries the keyboard, the left-hand controller and
 *    the nameplate band, and the only one whose *aspect* can be checked against p.54.
 *
 * The p.52 sheet has one trap and p.7 is what catches it: **its outer rounded rectangle is a
 * frame with margins, not the panel edge.** Scaling the sheet so that border spanned the full
 * 584.2 mm made every measured coordinate 8.3% too large — an error no internal check on that
 * one drawing could have found, because the drawing is self-consistent at any scale.
 *
 * So the sheet was scaled by **least-squares fit of its sixteen module-box edges onto p.7's
 * sixteen**, which gives 0.179623 mm/px at 300 dpi with a **maximum residual of 0.18 mm and an
 * rms of 0.08 mm** over those sixteen landmarks. Three further landmarks were held back from the
 * fit and then predicted: the sheet frame's own top and bottom edges and the module-box bottom
 * land within 0.5 mm of the horizontal rules p.7 draws at 16.6, 177.0 and 210.0 mm. Two
 * separately-drawn figures agreeing to half a millimetre is the evidence that these numbers are
 * measured rather than eyeballed.
 *
 * ## The footprint, and the digit that is transposed
 *
 * p.54's DIMS line reads
 *
 *     23" (54.82cm) Wide x 14 1/4" (36.19cm) Deep x 5 1/2" (13.97cm) High
 *
 * Depth and height convert exactly (14.25" = 36.20 cm, 5.5" = 13.97 cm). **Width does not**:
 * 23" is 58.42 cm, and the printed 54.82 is those four digits with the middle pair swapped. The
 * drawing settles which half is wrong. p.7's instrument outline measures 1566 x 956 px, an
 * aspect of **1.638**, against
 *
 *     584.2 / 361.9 = 1.614     <- 1.5% out
 *     548.2 / 361.9 = 1.515     <- 7.6% out
 *
 * so `panelSpanMm` is **584.2**, the imperial figure, and the metric one is the typo. This is
 * the *opposite* verdict to the Subsequent 37, where the imperial width was the bad half of the
 * same kind of pair — which is the point CLAUDE.md keeps making about stated dimensions: the
 * unreliable column is not the same column twice, and only the drawing is reliable.
 *
 * The keyboard is the second, independent confirmation. p.7's keyboard decodes to **19 white
 * keys on a 23.81 mm pitch and 13 black keys**, which is 32 — exactly p.54's `NUMBER OF KEYS:
 * 32 Full-Size Keys` — and 23.81 mm is a full-size white key. Under a 548.2 mm span the same
 * drawing would make the white keys 22.3 mm, which is not full size. The black-key gaps fall at
 * E-F and B-C throughout, so the range is C to G.
 *
 * `panelRiseMm` is 361.9, the depth off the same line — the trap that field documents, in its
 * usual direction. For a keyboard on a table the surface you play is the top, so the panel's
 * vertical span is the manufacturer's *depth*; 139.7 mm is how far the box stands off the table.
 * p.7's outline measures 356.9 mm on that axis against the stated 361.9, the 1.5% the aspect
 * note above already accounts for; the bands below are measured against the width scale and the
 * keyboard's front edge absorbs the residual.
 *
 * ## The bands
 *
 *  1. **16.6-210.0 mm** — the module panel, recessed inside the case. Nine module boxes on one
 *     row between 20.5 and 177.0, then the nameplate band at 181.1-205.7.
 *  2. **212.0-354.6 mm** — the keyboard, with the left-hand controller panel at 22.4-103.8.
 *
 * Every coordinate in both bands is measured. That is the one thing this panel has that the
 * Subsequent 37's does not: there, the poster's legend stopped at the control surface and the
 * wheels and keys had to be laid out by hand.
 *
 * ## What the vocabulary has no word for
 *
 * **The thirty-five front-panel patch points are drawn as one-cell `pad` grids**, because
 * `PanelFeature` has no jack — the Crave's answer and the Cascadia's, for the same reason. They
 * are not blocked into one grid the way the Mother-32's 4 x 8 patchbay is, because they are not
 * a patchbay: they are two rows inside each module, and collapsing them would put a Mother-32's
 * block on a panel that does not have one. The two rows are *dead* level across all nine
 * modules — every top-row jack measures 36.13 mm and every second-row jack 51.94 mm, to the
 * hundredth — and the UTILITIES module's two extra rows at 105.11 and 162.32 are its own.
 *
 * **The nine module boxes are `group` rectangles and they are real ink.** Unlike the Mother-32,
 * this panel does print section boundaries: nine white outlines, measured above to 0.2 mm. What
 * is *not* drawn is the hairline between OSCILLATOR 1 and OSCILLATOR 2 inside the OSCILLATORS
 * box — the vocabulary has no line, and enclosing each half in its own `group` would draw three
 * sides the panel does not have. The panel's own `1` and `2` silkscreen carries it instead.
 *
 * **SUSTAIN is a slider and the PITCH and MOD controls are sliders too**, not wheels: p.54's
 * `OTHER CONTROLLERS: Pitch Bend, Mod Wheel` says wheel and both figures draw a vertical fader.
 * The drawing is what is modelled. Their `fader` footprints are the graduated ladders the patch
 * sheet prints — a writing scale around the travel — so they are a little wider than the caps;
 * that is the drawing's convention and not a measurement of the cap.
 *
 * **Three knob sizes, all measured, because the panel really has three.** Eighteen knobs at
 * 15.5 mm, five black-capped selectors at 17.8 mm (the two OCTAVE knobs, the three WAVEFORM
 * knobs), and CUTOFF at 20.5 mm. Losing the third would lose the one control the panel means you
 * to reach for first.
 *
 * **The LEDs and the moog logo are not drawn.** Neither is a control, and the logo is vendor
 * artwork besides (§10).
 *
 * ## The voice field is in the left-hand controller, and there is no better answer
 *
 * §10 asks for the region to sit where the box's own voice or track selection lives. **This box
 * has no voice selection**: p.54 opens `POLYPHONY: Monophonic` and nothing on the panel allocates
 * anything. Every module box is packed out to its own silkscreen — the widest gap any of them
 * leaves below its last row of labels is under a centimetre, and on a box 42 mm wide that is not
 * a readout. So the honest reading is that there is no such place here and the field goes in the
 * largest run of blank panel that is not silkscreen — the strip below the PITCH and MOD sliders. The left-hand controller is at
 * least where this instrument's one voice is *committed* to something: PLAY starts the
 * arpeggiator or sequencer and HOLD keeps it running (p.30). The alternative was the nameplate
 * band, which has far more room and no meaning at all.
 */

// ---------------------------------------------------------------------------
// Measured constants — see the header for the scale and its residuals
// ---------------------------------------------------------------------------

/** p.54's DIMS depth, cross-checked against p.7's outline. See the header. */
const RISE = 361.9

/**
 * The two jack rows every module shares. Measured nine times each and identical to the
 * hundredth of a millimetre, which is what a drawn-once-and-repeated row looks like.
 */
const JACK_ROW_1 = 36.13
const JACK_ROW_2 = 51.94

/**
 * The three knob rows. Individual centres spread by at most 0.3 mm about these, so one constant
 * per row is the drawing's own claim rather than a smoothing of it.
 */
const KNOB_ROW_1 = 79.6
const KNOB_ROW_2 = 117.7
const KNOB_ROW_3 = 155.8

/** The three ARP/SEQ selector rows, and the row OUTPUT's VCA MODE shares with the first of them. */
const SWITCH_ROW_1 = 111.4
const SWITCH_ROW_2 = 135.29
const SWITCH_ROW_3 = 159.0

/** The module boxes, top and height. Eight of the nine share both; OUTPUT and SPRING REVERB split. */
const BOX_Y = 20.51
const BOX_H = 156.44

/** A 3.5 mm patch point with its hex collar, measured thirty-one times. */
const JACK_W = 9.16
const JACK_H = 8.08

/** A hex-collar selector switch. Measured four times as a clean outline, once through its line. */
const SWITCH_W = 7.18
const SWITCH_H = 8.26

/** Three knob sizes, and the panel has three. See the header. */
const KNOB_D = 15.54
const CAP_D = 17.78
const CUTOFF_D = 20.48

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function jack(cx: number, cy: number, label: string): PanelFeature {
  return {
    kind: 'grid',
    x: cx - JACK_W / 2,
    y: cy - JACK_H / 2,
    w: JACK_W,
    h: JACK_H,
    cols: 1,
    rows: 1,
    shape: 'pad',
    label,
  }
}

function knob(cx: number, cy: number, label: string, d = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A two- or three-position selector. Drawn as a button; the panel prints its positions beside it. */
function toggle(cx: number, cy: number, label: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - SWITCH_W / 2,
    y: cy - SWITCH_H / 2,
    w: SWITCH_W,
    h: SWITCH_H,
    label,
  }
}

/** A module enclosure. Real ink on this panel — nine of them, measured. */
function module(x: number, w: number, label: string, y = BOX_Y, h = BOX_H): PanelFeature {
  return { kind: 'group', x, y, w, h, label }
}

/** A graduated fader. The footprint is the ladder the patch sheet prints; see the header. */
function fader(x: number, y: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols: 1, rows: 1, shape: 'fader', label }
}

// ---------------------------------------------------------------------------
// The keyboard, off p.7
// ---------------------------------------------------------------------------

/** 19 white keys, C to G, on the 23.81 mm pitch that makes them full-size. */
const WHITE_X = 107.88
const WHITE_W = 452.43
const WHITE_Y = 212.8
const WHITE_H = 141.83
const BLACK_W = 11.95
const BLACK_Y = 212.03
const BLACK_H = 93.7

/**
 * The black keys, as the two- and three-key clusters a keyboard actually has. Centres measured
 * individually; the gaps land at E-F and B-C in all three octaves, which is what fixes the range
 * at C to G.
 */
function blacks(...centres: number[]): PanelFeature {
  const left = Math.min(...centres) - BLACK_W / 2
  const right = Math.max(...centres) + BLACK_W / 2
  return {
    kind: 'grid',
    x: left,
    y: BLACK_Y,
    w: right - left,
    h: BLACK_H,
    cols: centres.length,
    rows: 1,
    shape: 'key',
  }
}

export const GRANDMOTHER_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source:
      'Moog Grandmother User’s Manual (Version 2), p.52 (blank patch sheet) scaled onto p.7 (full-instrument plan view)',
  },
  features: [
    // ---- the nine module boxes, left to right --------------------------------------
    module(27.83, 42.39, 'ARP/SEQ'),
    module(73.81, 83.52, 'MODULATION'),
    module(161.11, 83.52, 'OSCILLATORS'),
    module(248.23, 42.39, 'MIXER'),
    module(294.2, 42.39, 'UTILITIES'),
    module(340.37, 83.52, 'FILTER'),
    module(427.49, 83.52, 'ENVELOPE'),
    module(514.78, 42.22, 'OUTPUT', BOX_Y, 110.11),
    module(514.78, 42.4, 'SPRING REVERB', 134.38, 42.57),

    // ---- ARP / SEQ -----------------------------------------------------------------
    jack(49.02, JACK_ROW_1, 'GATE OUT'),
    jack(37.88, JACK_ROW_2, 'KB OUT'),
    jack(60.07, JACK_ROW_2, 'KB VEL OUT'),
    knob(49.02, KNOB_ROW_1, 'RATE'),
    toggle(49.02, SWITCH_ROW_1, 'MODE'),
    toggle(49.02, SWITCH_ROW_2, 'DIRECTION'),
    toggle(49.02, SWITCH_ROW_3, 'OCT / SEQ'),

    // ---- MODULATION ----------------------------------------------------------------
    jack(83.96, JACK_ROW_1, 'RATE IN'),
    jack(147.36, JACK_ROW_1, 'WAVE OUT'),
    jack(105.33, JACK_ROW_2, 'SYNC IN'),
    jack(125.99, JACK_ROW_2, 'S/H OUT'),
    knob(115.57, KNOB_ROW_1, 'RATE'),
    knob(95.09, KNOB_ROW_2, 'PITCH AMT'),
    knob(136.23, KNOB_ROW_2, 'CUTOFF AMT'),
    knob(95.0, KNOB_ROW_3, 'PULSE WIDTH AMT'),
    knob(135.69, KNOB_ROW_3, 'WAVEFORM', CAP_D),

    // ---- OSCILLATORS. The `1` / `2` silkscreen stands in for the hairline between them ----
    { kind: 'label', x: 164.5, y: 30, text: '1', align: 'start' },
    { kind: 'label', x: 241.2, y: 30, text: '2', align: 'end' },
    jack(182.21, JACK_ROW_1, 'WAVE OUT'),
    jack(171.16, JACK_ROW_2, 'PITCH IN'),
    jack(193.35, JACK_ROW_2, 'PWM IN'),
    knob(182.21, KNOB_ROW_1, 'OCTAVE', CAP_D),
    { kind: 'button', x: 176.02, y: 111.57, w: 12.39, h: 12.57, round: true, label: 'SYNC' },
    knob(182.03, KNOB_ROW_3, 'WAVEFORM', CAP_D),
    jack(223.43, JACK_ROW_1, 'WAVE OUT'),
    jack(212.39, JACK_ROW_2, 'PITCH IN'),
    jack(234.57, JACK_ROW_2, 'LIN FM IN'),
    knob(223.34, KNOB_ROW_1, 'OCTAVE', CAP_D),
    knob(223.52, KNOB_ROW_2, 'FREQUENCY'),
    knob(223.34, KNOB_ROW_3, 'WAVEFORM', CAP_D),

    // ---- MIXER ---------------------------------------------------------------------
    jack(258.37, JACK_ROW_1, 'OSC 1 IN'),
    jack(280.55, JACK_ROW_1, 'OSC 2 IN'),
    jack(258.37, JACK_ROW_2, 'NOISE IN'),
    jack(280.55, JACK_ROW_2, 'OUTPUT'),
    knob(269.51, KNOB_ROW_1, 'OSCILLATOR 1'),
    knob(269.51, KNOB_ROW_2, 'OSCILLATOR 2'),
    knob(269.51, KNOB_ROW_3, 'NOISE'),

    // ---- UTILITIES. The four MULT points are one cluster on the shared jack rows ----
    jack(304.35, JACK_ROW_1, 'MULT'),
    jack(326.54, JACK_ROW_1, 'MULT'),
    jack(304.35, JACK_ROW_2, 'MULT'),
    jack(326.54, JACK_ROW_2, 'MULT'),
    knob(315.49, KNOB_ROW_1, 'HIGH PASS'),
    jack(304.35, 105.11, 'INPUT'),
    jack(326.54, 105.11, 'OUTPUT'),
    knob(315.58, 136.81, 'ATTENUATOR'),
    jack(304.35, 162.32, 'INPUT'),
    jack(326.54, 162.32, 'OUTPUT'),

    // ---- FILTER --------------------------------------------------------------------
    jack(350.34, JACK_ROW_1, 'INPUT'),
    jack(413.74, JACK_ROW_1, 'OUTPUT'),
    jack(370.99, JACK_ROW_2, 'ENV AMT IN'),
    jack(393.18, JACK_ROW_2, 'CUTOFF IN'),
    knob(381.9, KNOB_ROW_1, 'CUTOFF', CUTOFF_D),
    toggle(381.96, 120.17, 'KBD TRACK'),
    knob(361.47, KNOB_ROW_3, 'ENVELOPE AMT'),
    knob(402.7, KNOB_ROW_3, 'RESONANCE'),

    // ---- ENVELOPE ------------------------------------------------------------------
    jack(469.25, JACK_ROW_1, 'TRIGGER IN'),
    jack(448.68, JACK_ROW_2, '+ ENV OUT'),
    jack(489.9, JACK_ROW_2, '– ENV OUT'),
    knob(448.59, KNOB_ROW_1, 'ATTACK'),
    knob(448.5, KNOB_ROW_2, 'DECAY'),
    knob(448.59, KNOB_ROW_3, 'RELEASE'),
    fader(477.23, 87.33, 25.33, 60.89, 'SUSTAIN'),

    // ---- OUTPUT and SPRING REVERB --------------------------------------------------
    jack(535.89, JACK_ROW_1, 'VCA AMT IN'),
    jack(524.75, JACK_ROW_2, 'VCA IN'),
    jack(547.02, JACK_ROW_2, 'REVERB IN'),
    knob(535.89, KNOB_ROW_1, 'VOLUME'),
    toggle(535.98, SWITCH_ROW_1, 'VCA MODE'),
    knob(535.98, KNOB_ROW_3, 'MIX'),

    // ---- the nameplate band --------------------------------------------------------
    { kind: 'label', x: 34.34, y: 193, text: 'GRANDMOTHER', align: 'start' },
    { kind: 'label', x: 205.31, y: 193, text: 'SEMI-MODULAR ANALOG SYNTHESIZER', align: 'start' },

    // ---- the left-hand controller, and the keyboard it sits beside ------------------
    { kind: 'group', x: 22.4, y: 216.51, w: 81.37, h: 131.4, label: 'LEFT-HAND CONTROLLER' },
    knob(35.65, 236.85, 'GLIDE'),
    { kind: 'button', x: 50.02, y: 230.32, w: 14.56, h: 14.56, round: true, label: 'PLAY' },
    { kind: 'button', x: 67.57, y: 230.32, w: 14.56, h: 14.56, round: true, label: 'HOLD' },
    { kind: 'button', x: 85.11, y: 230.32, w: 14.56, h: 14.56, round: true, label: 'TAP' },
    fader(42.56, 263.92, 9.7, 57.11, 'PITCH'),
    fader(76.9, 263.92, 9.7, 57.11, 'MOD'),

    // 19 white keys and 13 black, in the clusters a keyboard has. C to G — see the header.
    { kind: 'grid', x: WHITE_X, y: WHITE_Y, w: WHITE_W, h: WHITE_H, cols: 19, rows: 1, shape: 'key' },
    blacks(131.95, 155.85, 179.74),
    blacks(227.15, 251.04),
    blacks(298.82, 322.52, 346.23),
    blacks(394.01, 417.53),
    blacks(465.31, 489.2, 512.9),

    // The one region the resolver writes into. One voice, so one cell; see the header for why it
    // is here and not in a module box. 32 x 11 keeps it under §10's 3:1 and well under twice the
    // 23.81 mm white key beside it.
    { kind: 'voices', x: 30, y: 334, w: 32, h: 11 },
  ],
}
