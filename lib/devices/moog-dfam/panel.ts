import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog DFAM's panel.
 *
 * Read off the full-panel line drawing the manual prints on its blank patch sheets (printed
 * p.38) — the same drawing that carries the factory presets on pp.33-36, and the only complete,
 * unobstructed, fully-labelled panel figure in the document. Our own geometry and line weights;
 * nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** The page was rendered at 200 dpi, the
 * panel's outer border located at 1450 x 615 px, and control positions taken as the centroids of
 * the drawing's own dark components — which is why the six knobs of the top row come out at one y
 * to a tenth of a millimetre and all fourteen large knobs at one diameter.
 *
 * ## The aspect check, and the sibling it agrees with
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. Printed p.40 reads `SIZE (W X D X H): 12.57" x 4.21" x 5.24`, and unlike the
 * Mother-32's table — whose axis letters are wrong, as that manifest records at length — this one
 * is labelled correctly. The drawing confirms it rather than being needed to correct it. The
 * measured panel box is 1450 / 615 = **2.358**, against
 *
 *     319.3 / 133   = 2.401     <- 1.8% out, and the only candidate that is close
 *     319.3 / 106.9 = 2.987     <- 27% out
 *
 * So the face a player looks at is 319.3 x 133 mm, and 106.9 mm is how far the box stands off the
 * desk with its knobs on. **The same two numbers as the Mother-32**, which is what should happen:
 * these are the same 60 HP enclosure, and p.7 calls DFAM "an addition to the Mother-32 family of
 * Semi-Modular Analog Synthesizers". Two manuals printing the same box in different units and
 * different axis orders, measured independently off two different drawings, agreeing to a tenth
 * of a millimetre — that agreement is worth more than either reading alone.
 *
 * **The residual 1.8% is taken on the y axis, deliberately.** The drawing is 135.4 mm tall if the
 * horizontal scale is trusted, and the specification says 133. Rather than let features drift
 * below the panel's foot, x is scaled by `1450 px = 319.3 mm` and y by `615 px = 133 mm`, so the
 * figure maps exactly onto the box the manifest declares. Every `y` below is therefore a fraction
 * of the measured drawing's height, expressed against the cited rise.
 *
 * ## No cheeks are drawn
 *
 * 319.3 mm is the whole unit, wood end cheeks included, exactly as the Mother-32's identical
 * figure is. The cheeks are visible at roughly 9 mm each side — the wavy grain is unmistakable in
 * the drawing — and the metal panel proper is the 60 HP (304.8 mm) Eurorack panel that p.40's
 * EURORACK SPECS row names. Drawing a cheek would put the panel proper somewhere narrower than
 * the span claims, so nothing is drawn outside the controls and the features sit inside x 16..309.
 *
 * ## What this panel has that the vocabulary has no word for
 *
 * **The patchbay is a 3 x 8 block of 3.5 mm points and is drawn as a `grid`**, because
 * `PanelFeature` has no jack — the answer the Cascadia and the Mother-32 both reached, and it
 * means this layout carries no named jack positions and cannot be the source of coordinates for
 * an intra-panel cable. It is labelled `IN / OUT`, the panel's own silkscreen over it, and p.24
 * explains the legend: "There are 15 inputs LABELED in standard text, and 9 outputs identified by
 * REVERSE lettering."
 *
 * **The patchbay is *not* enclosed here, where the Mother-32's is.** That manifest draws a
 * `group` around its four columns because its figure draws one. This figure does not: the columns
 * sit on open panel with the legend floating above them, and the only vertical rule near them is
 * the panel's own inner border. Two sibling boxes, one enclosure each way, and the difference is
 * ink rather than judgement — which is the whole reason §10 asks for the drawing to be measured
 * instead of remembered.
 *
 * **The step LEDs are not drawn.** A row of eight indicators sits between the PITCH and VELOCITY
 * knobs, and a ninth beside RUN / STOP. None is a control, and `grid` says "a block of identical
 * *controls*", so they are left off. A simplified panel may leave something out; it may not call
 * an indicator a socket.
 *
 * **The eight PITCH and eight VELOCITY knobs are `shape: 'knob'`, because that is what they are.**
 * The Metropolix draws its eight step controls as faders for the same reason in the other
 * direction: they are sliders on that panel. Same vocabulary, same rule, opposite answer.
 *
 * **The three LEVEL controls are smaller than every other knob and are drawn so** — 7.6 mm against
 * 15.3 mm, measured, and the drawing gives them no tick ring where every other knob has one. They
 * are the mixer's three channels, in a column of their own between the oscillators and the filter.
 *
 * **No `group` rectangles anywhere.** This panel prints no section boundaries: the sections are
 * two rows of labelled knobs, a sequencer field and the patchbay, and nothing encloses any of
 * them. Inventing boxes would be drawing lines the panel does not have.
 *
 * The `voices` region sits in the bottom band directly under the patchbay. This box is one voice
 * and the rack draws one cell for it; the patchbay column above that cell is where the voice
 * leaves — `VCA` is its top entry — so a lit cell there reads true in a way a cell on the mixer or
 * the sequencer would not. It clears the panel screw at x 301.6.
 */

// ---------------------------------------------------------------------------
// Measured constants
// ---------------------------------------------------------------------------

/** The unit's own vertical span, cheeks included (printed p.40, checked against the drawing). */
const RISE = 133

/** The two knob rows, the sequencer's two, and the transport buttons. Centres, in millimetres. */
const ROW_1 = 26.2
const ROW_2 = 58.5
const SEQ_PITCH = 86.8
const SEQ_VELOCITY = 110.4
const TRANSPORT = 110.4

/** Every full-size knob on this panel is one diameter. Measured fourteen times, 15.2-15.4 mm. */
const KNOB_D = 15.3

/** The three mixer LEVEL controls, and the sixteen sequencer knobs: one smaller diameter. */
const SMALL_D = 7.6

/** A round push button — TRIGGER, RUN / STOP, ADVANCE. Measured 9.7-9.9 mm. */
const BUTTON_D = 9.8

/** Every toggle is the same hex-collar switch. */
const SWITCH_W = 8.6
const SWITCH_H = 7.4

/** A 3.5 mm patch point as the drawing renders it, hex collar included. */
const JACK_W = 9.2
const JACK_H = 8.0

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string, d = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A two- or three-position toggle. Drawn as a button; the panel prints its positions beside it. */
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

/** The three round buttons, which the drawing fills solid. */
function button(cx: number, cy: number, label: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - BUTTON_D / 2,
    y: cy - BUTTON_D / 2,
    w: BUTTON_D,
    h: BUTTON_D,
    round: true,
    label,
  }
}

/** Eight knobs on a measured 24.4 mm pitch, from the first centre to the last. */
function stepRow(firstCx: number, lastCx: number, cy: number, label: string): PanelFeature {
  return {
    kind: 'grid',
    x: firstCx - SMALL_D / 2,
    y: cy - SMALL_D / 2,
    w: lastCx - firstCx + SMALL_D,
    h: SMALL_D,
    cols: 8,
    rows: 1,
    shape: 'knob',
    label,
  }
}

export const DFAM_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Moog DFAM Owner’s Manual, p.38 (blank patch sheet panel drawing)',
  },
  features: [
    // ---- row 1: VCO 1, the filter and the output, left to right -------------------
    knob(23.3, ROW_1, 'VCO DECAY'),
    toggle(45.3, ROW_1, 'SEQ PITCH MOD'),
    knob(66.9, ROW_1, 'VCO 1 EG AMOUNT'),
    knob(96.4, ROW_1, 'VCO 1 FREQUENCY'),
    toggle(118.5, ROW_1, 'VCO 1 WAVE'),
    toggle(158.6, ROW_1, 'VCF'),
    knob(181.0, ROW_1, 'CUTOFF'),
    knob(210.5, ROW_1, 'RESONANCE'),
    toggle(233.7, ROW_1, 'VCA EG'),
    knob(255.9, ROW_1, 'VOLUME'),

    // ---- row 2: VCO 2, and the two envelopes that shape the hit --------------------
    knob(23.3, ROW_2, '1→2 FM AMOUNT'),
    toggle(45.3, ROW_2, 'HARD SYNC'),
    knob(66.9, ROW_2, 'VCO 2 EG AMOUNT'),
    knob(96.7, ROW_2, 'VCO 2 FREQUENCY'),
    toggle(118.5, ROW_2, 'VCO 2 WAVE'),
    knob(164.9, ROW_2, 'VCF DECAY'),
    knob(194.4, ROW_2, 'VCF EG AMOUNT'),
    knob(224.0, ROW_2, 'NOISE / VCF MOD'),
    knob(255.9, ROW_2, 'VCA DECAY'),

    // ---- the mixer: three small level controls in their own column ----------------
    knob(137.8, 20.7, 'VCO 1 LEVEL', SMALL_D),
    knob(137.7, 42.4, 'NOISE / EXT LEVEL', SMALL_D),
    knob(137.8, 64.1, 'VCO 2 LEVEL', SMALL_D),

    // ---- the sequencer: clock, transport, and the two rows of eight ---------------
    button(23.5, 89.7, 'TRIGGER'),
    knob(51.3, 89.7, 'TEMPO'),
    button(41.9, TRANSPORT, 'RUN / STOP'),
    button(61.2, TRANSPORT, 'ADVANCE'),
    // Step numbers 1-8 are silkscreened above the PITCH row; the eight LEDs between the rows are
    // indicators and are left off, per the note above.
    stepRow(85.6, 256.3, SEQ_PITCH, 'PITCH'),
    stepRow(85.8, 256.2, SEQ_VELOCITY, 'VELOCITY'),

    // ---- the patchbay: 3 columns at 276.7/290.5/304.3, 8 rows on a 13.5 mm pitch ---
    { kind: 'label', x: 290.5, y: 11.0, text: 'IN / OUT', align: 'middle' },
    {
      kind: 'grid',
      x: 276.7 - JACK_W / 2,
      y: 18.9 - JACK_H / 2,
      w: 304.3 - 276.7 + JACK_W,
      h: 113.1 - 18.9 + JACK_H,
      cols: 3,
      rows: 8,
      shape: 'pad',
    },

    // ---- the bottom band: nameplate, and the one region the resolver writes --------
    { kind: 'label', x: 28, y: 127, text: 'DFAM', align: 'start' },
    // Sized against the rack's two standing rules rather than against the free space: a cell must
    // read as a control (§10 asks for w/h under 3) and must not tower over the pads beside it.
    // 26 x 9 for the one voice this box has satisfies both, and sits clear of the corner screw.
    { kind: 'voices', x: 268, y: 121, w: 26, h: 9 },
  ],
}
