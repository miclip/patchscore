import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Matriarch's front panel.
 *
 * ## Three figures, two of them split, and the split is what had to be proved
 *
 * The Grandmother's panel came from two figures that agreed. This one needs three, because the
 * blank patch sheet **does not fit on one page**:
 *
 *  - **printed p.84**, whose sheet carries the panel's left half — ARP/SEQ, MODULATION,
 *    UTILITIES, OSCILLATORS, MIXER — and bleeds off the right edge of the page.
 *  - **printed p.85**, whose sheet carries the right half — FILTERS, UTILITIES, ENVELOPE
 *    GENERATORS, STEREO DELAY, OUTPUT — and starts hard against the left edge.
 *  - **printed p.9**, the ABOUT MATRIARCH figure: a flat orthographic plan view of the whole
 *    instrument, keyboard and left-hand controller included. The anchor.
 *
 * Butting two half-panel drawings together is exactly what the Subsequent 37's panel note warns
 * against — "a layout whose horizontal proportions are guesswork wearing a page number". So the
 * join is **measured, not assumed**, and it is measured three ways:
 *
 *  1. **The box gaps are identical on both sheets** — 18.5 px between the right edge of one
 *     module box and the left edge of the next, on p.84 and on p.85 alike. Two drawings at
 *     different scales could not share that number.
 *  2. **Each sheet is fitted to p.9 separately**, by least squares over the eleven module-box
 *     edges each one shows. The two fits return **0.169034 and 0.169131 mm/px — a 0.06%
 *     difference.** They are the same drawing scale, established rather than hoped for.
 *  3. **A landmark was held back from the fit.** p.85's leftmost vertical was excluded and then
 *     predicted: it lands at 409.80 mm against p.9's FILTERS left edge at 410.31 — **0.51 mm**.
 *     So the right sheet's outer edge really is where p.9 says the panel continues, and the two
 *     halves tile rather than overlap or gap.
 *
 * The fit residuals are larger than the Grandmother's (max 0.72 mm, rms 0.5 mm against 0.18 and
 * 0.08) and the reason is visible in their *shape*: they alternate +0.5, -0.5, +0.5, -0.5 across
 * the box-gap pairs. That is p.9's own pixel quantisation — at 0.459 mm/px a one-pixel error on a
 * 4 mm gap is half a millimetre — not error in the sheets. **Relative geometry inside each sheet
 * is good to about a tenth of a millimetre; absolute placement carries the anchor's half.** Every
 * jack row below lands on one of seven shared y values to within 0.1 mm, which is the internal
 * evidence for that split.
 *
 * **All 74 front-panel patch points, 44 knobs and 7 switches were checked back against the
 * drawing programmatically** — every label in this file was required to land on a detected dark
 * component of the right size, and the nine that did not (the two 4-jack mult clusters, whose
 * hexes merge into one blob, and PITCH MOD ASSIGN, which merges with the line joining it to
 * PITCH AMT) were confirmed against their inner dots instead. Nothing here is placed by eye.
 *
 * ## The footprint, and the one dimension line in this family that is not wrong
 *
 * p.90: `DIMENSIONS: 32" (81.28cm) Wide x 14 1/4" (36.19cm) Deep x 5 1/2" (13.97cm) High`. All
 * three convert exactly — 32" is 81.28 cm, 14.25" is 36.20, 5.5" is 13.97 — so unlike the
 * Grandmother (whose metric width is a digit transposition) and unlike the Subsequent 37 (whose
 * imperial width does not convert), **there is no tie to break here.** The aspect check is
 * therefore a confirmation rather than a decision: p.9's outline measures 2.303 against the
 * stated 2.246, 2.5% out in the same direction and of the same order as the Grandmother's 1.5%.
 * Both drawings under-draw the rear bevel slightly; neither is a different instrument.
 *
 * `panelRiseMm` is 361.9, the depth — the usual trap in its usual direction for a keyboard. Note
 * that this is the **same depth and height as the Grandmother**, which is the two boxes being the
 * same case in two widths, and it shows: the horizontal bands below (module panel 20.4-210,
 * nameplate 187-204, keyboard from 211) sit within a few millimetres of the Grandmother's
 * measured bands. Two independent measurements off two manuals agreeing on a shared enclosure.
 *
 * ## The keyboard decodes to exactly what the specifications claim
 *
 * p.90 says `NUMBER OF KEYS: 49 Full-Size Keys`. p.9's keyboard yields **29 white keys on a
 * 23.43 mm pitch and 20 black keys 11.95 mm wide**, and 29 + 20 = 49. The black keys fall in
 * clusters of 2-3-2-3-2-3-2-3, so the range is **C to C, four octaves**. The 11.95 mm black-key
 * width is *identical* to the Grandmother's measured 11.95 — the same keybed part, measured
 * independently from a different manual at a different scale.
 *
 * The left-hand controller is the same again, and this is the strongest cross-check in the file:
 * measured off p.9 it is 80.4 x 130.0 mm at x 22.05, with a GLIDE knob, three 14.25 mm buttons and
 * two 9.65 x 56.5 mm sliders. The Grandmother's, measured off *its* manual, is 81.4 x 131.4 at
 * x 22.40, with a GLIDE knob, three 14.56 mm buttons and two 9.70 x 57.11 mm sliders. Every
 * figure agrees within about a millimetre. It is one assembly and both measurements found it.
 *
 * ## What the vocabulary has no word for
 *
 * **The 74 patch points are one-cell `pad` grids**, as on the Grandmother and for the same reason:
 * `PanelFeature` has no jack. They are not blocked into grids because they are not a patchbay —
 * they are two rows inside each module, and the two mults are the only 2x2 clusters.
 *
 * **The ten module boxes are `group` rectangles and they are real ink**, measured to 0.2 mm, and
 * PARAPHONY is an eleventh drawn *inside* OUTPUT because the panel draws it inside OUTPUT. What is
 * not drawn is the hairline dividing OSCILLATORS into four columns and ENVELOPE GENERATORS into
 * two: the vocabulary has no line, and enclosing each column would draw three sides the panel does
 * not have. The panel's own `1 2 3 4` and `FILTER` / `AMPLITUDE` silkscreen carries it instead.
 *
 * **Three knob sizes, all measured.** 33 ring knobs at 14.65 mm, 10 black-capped selectors at
 * 16.65 mm (the four OCTAVE, the four oscillator WAVEFORM, the modulation WAVEFORM and SEQUENCE),
 * and CUTOFF at 20.40 mm — the one control the panel means you to reach for first. The three
 * individual oscillator SYNC buttons are 5.75 mm, an order smaller than anything else on the
 * panel, and drawing them at button size would misrepresent what the panel does with them.
 *
 * **Both SUSTAIN controls are sliders**, as on the Grandmother, and their `fader` footprints are
 * the graduated ladders the patch sheet prints rather than the cap.
 *
 * ## The voice field is in the MIXER, and the reason is p.50
 *
 * §10 asks for the region where the box's own voice allocation lives. The obvious answer is the
 * PARAPHONY box — VOICE MODE 1/2/4 *is* the voice allocation control — and it has no room: the box
 * is 28.6 x 27.6 mm and the switch and its two silkscreen rows fill it.
 *
 * The MIXER is the honest second answer rather than a fallback. p.50 defines paraphony as "allowing
 * the pitch of each oscillator to be played independently, but with all oscillators then sharing a
 * common signal path **from the Mixer section and beyond**" — so the mixer is the exact point at
 * which four independently-pitched oscillators stop being four things, and it is the last place on
 * the panel where they appear separately, as OSCILLATOR 1 to 4. One cell is drawn there, because
 * this box is one assignable of four-note paraphony and not four assignables (see `index.ts`).
 */

// ---------------------------------------------------------------------------
// Measured constants — see the header for the three figures and the residuals
// ---------------------------------------------------------------------------

/** p.90's DIMENSIONS depth, cross-checked against p.9's outline. */
const RISE = 361.9

/** The module boxes' own band, off p.9. */
const BOX_Y = 20.45
const BOX_H = 163.57

/** A 3.5 mm patch point with its hex collar. Measured 66 times; the Grandmother's is 9.16 x 8.08. */
const JACK_W = 9.13
const JACK_H = 7.94

/** A hex-collar selector switch. The Grandmother's measures 7.18 x 8.26. */
const SWITCH_W = 7.35
const SWITCH_H = 8.35

/** Three knob sizes, and the panel has three. */
const KNOB_D = 14.65

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

/** A round button. The three oscillator SYNC buttons are 5.75 mm and the rest 15.85. */
function button(cx: number, cy: number, label: string, d: number): PanelFeature {
  return { kind: 'button', x: cx - d / 2, y: cy - d / 2, w: d, h: d, round: true, label }
}

/** A module enclosure. Real ink on this panel — ten of them, measured off p.9. */
function module(x: number, w: number, label: string): PanelFeature {
  return { kind: 'group', x, y: BOX_Y, w, h: BOX_H, label }
}

/** A graduated fader. The footprint is the ladder the patch sheet prints; see the header. */
function fader(x: number, y: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols: 1, rows: 1, shape: 'fader', label }
}

// ---------------------------------------------------------------------------
// The keyboard, off p.9
// ---------------------------------------------------------------------------

/** 29 white keys, C to C, on the 23.43 mm pitch that makes them full-size. */
const WHITE_X = 108.22
const WHITE_W = 679.47
const WHITE_Y = 210.9
const WHITE_H = 138.76
const BLACK_W = 11.95
const BLACK_Y = 210.9
const BLACK_H = 91.43

/**
 * The black keys, as the two- and three-key clusters a keyboard actually has. Centres measured
 * individually; the gaps land at E-F and B-C in all four octaves, which is what fixes the range
 * at C to C.
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

export const MATRIARCH_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source:
      'Moog Matriarch Manual (012023), pp.84-85 (blank preset sheets, left and right halves) scaled onto p.9 (full-instrument plan view)',
  },
  features: [
    // ---- the ten module boxes, left to right --------------------------------------
    module(27.8, 58.35, 'ARP/SEQ'),
    module(90.52, 67.77, 'MODULATION'),
    module(162.65, 33.31, 'UTILITIES'),
    module(200.33, 136.92, 'OSCILLATORS'),
    module(341.16, 65.01, 'MIXER'),
    module(410.31, 93.04, 'FILTERS'),
    module(507.48, 33.54, 'UTILITIES'),
    module(545.16, 133.7, 'ENVELOPE GENERATORS'),
    module(683.0, 64.79, 'STEREO DELAY'),
    module(751.92, 33.54, 'OUTPUT'),
    // PARAPHONY is a box inside OUTPUT, and the panel draws it as one.
    { kind: 'group', x: 754.15, y: 126.44, w: 28.58, h: 27.57, label: 'PARAPHONY' },
    // The OSCILLATORS and ENVELOPE GENERATORS boxes carry their own internal silkscreen.
    { kind: 'label', x: 208.7, y: 27.5, text: '1', align: 'start' },
    { kind: 'label', x: 243.1, y: 27.5, text: '2', align: 'start' },
    { kind: 'label', x: 277.6, y: 27.5, text: '3', align: 'start' },
    { kind: 'label', x: 312.1, y: 27.5, text: '4', align: 'start' },
    { kind: 'label', x: 577.1, y: 27.5, text: 'FILTER', align: 'middle' },
    { kind: 'label', x: 644.5, y: 27.5, text: 'AMPLITUDE', align: 'middle' },

    // ---- ARP/SEQ
    jack(36.4, 34.2, 'RATE / DIV IN'),
    jack(77.1, 34.2, 'CV OUT'),
    jack(48.9, 49.7, 'VEL OUT'),
    jack(64.6, 49.7, 'GATE OUT'),

    // ---- MODULATION
    jack(111.6, 34.2, 'RATE IN'),
    jack(136.6, 34.2, 'NOISE OUT'),
    jack(99.0, 49.7, 'SYNC IN'),
    jack(124.1, 49.7, 'S / H OUT'),
    jack(149.2, 49.7, 'WAVE OUT'),

    // ---- UTILITIES 1
    jack(171.04, 34.18, 'MULT 1'),
    jack(186.76, 34.18, 'MULT 2'),
    jack(171.04, 49.73, 'MULT 3'),
    jack(186.76, 49.73, 'MULT 4'),
    jack(171.1, 96.0, 'ATTENUATOR 1 INPUT'),
    jack(186.7, 95.9, 'ATTENUATOR 1 OUTPUT'),
    jack(178.9, 110.1, 'ATTENUATOR 1 CV IN'),
    jack(171.1, 159.4, 'ATTENUATOR 2 INPUT'),
    jack(186.7, 159.4, 'ATTENUATOR 2 OUTPUT'),
    jack(178.9, 173.5, 'ATTENUATOR 2 CV IN'),

    // ---- OSCILLATORS
    jack(208.7, 34.2, '1 PITCH IN'),
    jack(224.4, 34.2, '1 WAVE OUT'),
    jack(208.7, 49.7, '1 PWM IN'),
    jack(224.4, 49.7, '1 LIN FM IN'),
    jack(243.1, 34.2, '2 PITCH IN'),
    jack(258.9, 34.2, '2 WAVE OUT'),
    jack(243.1, 49.7, '2 PWM IN'),
    jack(258.9, 49.7, '2 LIN FM IN'),
    jack(277.6, 34.2, '3 PITCH IN'),
    jack(293.3, 34.2, '3 WAVE OUT'),
    jack(277.6, 49.7, '3 PWM IN'),
    jack(293.3, 49.7, '3 LIN FM IN'),
    jack(312.1, 34.2, '4 PITCH IN'),
    jack(327.8, 34.2, '4 WAVE OUT'),
    jack(312.1, 49.7, '4 PWM IN'),
    jack(327.8, 49.7, '4 LIN FM IN'),

    // ---- MIXER
    jack(365.4, 34.2, 'OSC 1 IN'),
    jack(381.1, 34.2, 'OSC 2 IN'),
    jack(349.7, 42.0, 'NOISE IN'),
    jack(396.8, 42.0, 'OUTPUT'),
    jack(365.4, 49.7, 'OSC 3 IN'),
    jack(381.1, 49.7, 'OSC 4 IN'),

    // ---- FILTERS
    jack(418.8, 34.2, 'VCF 1 IN'),
    jack(444.0, 34.2, 'VCF 2 IN'),
    jack(469.0, 34.2, 'VCF 1 OUT'),
    jack(494.0, 34.2, 'VCF 2 OUT'),
    jack(431.4, 49.7, 'CUTOFF 1 IN'),
    jack(456.5, 49.7, 'CUTOFF 2 IN'),
    jack(481.5, 49.7, 'ENV AMT IN'),

    // ---- UTILITIES 2
    jack(516.01, 34.18, 'MULT 1'),
    jack(531.66, 34.18, 'MULT 2'),
    jack(516.01, 49.74, 'MULT 3'),
    jack(531.66, 49.74, 'MULT 4'),
    jack(516.0, 96.0, 'ATTENUATOR INPUT'),
    jack(531.6, 95.9, 'ATTENUATOR OUTPUT'),
    jack(523.8, 110.1, 'ATTENUATOR CV IN'),
    jack(516.0, 159.5, 'LFO RATE IN'),
    jack(531.6, 159.5, 'LFO TRI OUT'),
    jack(523.8, 173.6, 'LFO SQUARE OUT'),

    // ---- ENVELOPE GENERATORS
    jack(559.8, 34.2, 'FILTER TRIGGER IN'),
    jack(594.3, 34.2, 'FILTER ENV OUT'),
    jack(577.1, 49.7, 'FILTER ENV END OUT'),
    jack(627.3, 34.2, 'AMPLITUDE TRIGGER IN'),
    jack(661.8, 34.2, 'AMPLITUDE ENV OUT'),
    jack(644.5, 49.7, 'AMPLITUDE ENV END OUT'),

    // ---- STEREO DELAY
    jack(707.3, 34.2, 'INPUT 1'),
    jack(722.9, 34.2, 'INPUT 2'),
    jack(691.6, 42.0, 'FB CV IN'),
    jack(738.6, 42.0, 'MIX IN'),
    jack(707.3, 49.7, 'TIME 1 IN'),
    jack(722.9, 49.7, 'TIME 2 IN'),

    // ---- OUTPUT
    jack(760.6, 34.2, 'VCA 1 IN'),
    jack(776.3, 34.2, 'VCA 2 IN'),
    jack(760.6, 49.7, 'VCA 1 CV IN'),
    jack(776.3, 49.7, 'VCA 2 CV IN'),

    // ---- knobs, by module ---------------------------------------------------------
    knob(56.8, 74.7, 'RATE / DIV'),
    knob(74.0, 118.6, 'SEQUENCE', 16.65),
    knob(124.1, 74.7, 'RATE'),
    knob(107.0, 117.9, 'WAVEFORM', 16.65),
    knob(141.3, 117.8, 'PITCH AMT'),
    knob(106.9, 166.4, 'CUTOFF AMT'),
    knob(141.3, 166.4, 'PULSE WIDTH AMT'),
    knob(179.0, 74.7, 'ATTENUATOR 1'),
    knob(178.9, 138.2, 'ATTENUATOR 2'),
    knob(216.7, 74.7, '1 OCTAVE', 16.65),
    knob(251.0, 74.7, '2 OCTAVE', 16.65),
    knob(285.5, 74.7, '3 OCTAVE', 16.65),
    knob(320.0, 74.7, '4 OCTAVE', 16.65),
    knob(251.0, 117.8, '2 FREQUENCY'),
    knob(285.5, 117.8, '3 FREQUENCY'),
    knob(319.9, 117.8, '4 FREQUENCY'),
    knob(216.7, 166.4, '1 WAVEFORM', 16.65),
    knob(251.0, 166.4, '2 WAVEFORM', 16.65),
    knob(285.5, 166.4, '3 WAVEFORM', 16.65),
    knob(320.0, 166.4, '4 WAVEFORM', 16.65),
    knob(373.2, 74.7, 'NOISE'),
    knob(356.1, 117.8, 'OSCILLATOR 1'),
    knob(390.4, 117.8, 'OSCILLATOR 2'),
    knob(356.1, 166.4, 'OSCILLATOR 3'),
    knob(390.4, 166.4, 'OSCILLATOR 4'),
    knob(456.4, 78.3, 'CUTOFF', 20.4),
    knob(425.1, 97.5, 'RESONANCE 1'),
    knob(487.9, 97.5, 'RESONANCE 2'),
    knob(425.1, 138.3, 'SPACING'),
    knob(487.9, 138.3, 'ENVELOPE AMT'),
    knob(456.5, 166.5, 'KB TRACKING'),
    knob(523.9, 74.7, 'ATTENUATOR'),
    knob(523.9, 138.3, 'LFO RATE'),
    knob(559.9, 74.7, 'FILTER ATTACK'),
    knob(559.9, 120.6, 'FILTER DECAY'),
    knob(559.9, 166.5, 'FILTER RELEASE'),
    knob(627.3, 74.7, 'AMPLITUDE ATTACK'),
    knob(627.3, 120.6, 'AMPLITUDE DECAY'),
    knob(627.3, 166.5, 'AMPLITUDE RELEASE'),
    knob(715.1, 74.7, 'TIME'),
    knob(697.8, 106.5, 'SPACING'),
    knob(732.3, 106.5, 'FEEDBACK'),
    knob(715.1, 138.3, 'MIX'),
    knob(768.4, 74.7, 'MAIN VOLUME'),

    // ---- selector switches --------------------------------------------------------
    toggle(40.29, 98.58, 'MODE'),
    toggle(40.21, 119.2, 'DIRECTION'),
    toggle(40.21, 139.4, 'OCT / BANK'),
    toggle(124.22, 138.98, 'PITCH MOD ASSIGN'),
    toggle(456.48, 118.07, 'FILTER MODE'),
    toggle(768.44, 106.66, 'VCA MODE'),
    toggle(768.44, 138.37, 'VOICE MODE'),

    // ---- buttons -----------------------------------------------------------------
    button(39.2, 166.6, 'REST', 15.85),
    button(56.7, 166.6, 'TIE', 15.85),
    button(74.3, 166.6, 'RATCHET', 15.85),
    button(216.5, 118.0, 'SYNC ENABLE', 16.7),
    button(251.08, 138.39, '2 SYNC', 5.75),
    button(285.39, 138.39, '3 SYNC', 5.75),
    button(319.88, 138.39, '4 SYNC', 5.75),
    button(706.3, 166.7, 'SYNC / TAP', 15.85),
    button(723.9, 166.7, 'PING PONG', 15.85),
    button(768.5, 166.7, 'MULTI TRIG', 15.85),
    // ---- the two SUSTAIN ladders, one per envelope --------------------------------
    fader(581.78, 84.8, 25.03, 60.1, 'FILTER SUSTAIN'),
    fader(649.28, 84.8, 25.03, 60.1, 'AMPLITUDE SUSTAIN'),

    // ---- the nameplate band -------------------------------------------------------
    { kind: 'label', x: 34.0, y: 196, text: 'MATRIARCH', align: 'start' },
    { kind: 'label', x: 210.0, y: 196, text: 'SEMI-MODULAR ANALOG SYNTHESIZER', align: 'start' },

    // ---- the left-hand controller, measured off p.9 and the same assembly as the
    //      Grandmother's to within a millimetre (see the header) --------------------
    { kind: 'group', x: 22.05, y: 214.11, w: 80.41, h: 130.03, label: 'LEFT-HAND CONTROLLER' },
    knob(35.15, 234.33, 'GLIDE'),
    button(56.44, 235.02, 'PLAY', 14.25),
    button(73.75, 235.02, 'HOLD', 14.25),
    button(91.05, 235.02, 'TAP', 14.25),
    fader(41.81, 260.98, 9.65, 56.51, 'PITCH'),
    fader(75.81, 260.98, 9.65, 56.51, 'MOD'),

    // 29 white keys and 20 black, in the clusters a keyboard has. C to C — see the header.
    { kind: 'grid', x: WHITE_X, y: WHITE_Y, w: WHITE_W, h: WHITE_H, cols: 29, rows: 1, shape: 'key' },
    blacks(131.9, 155.3),
    blacks(202.4, 225.8, 249.5),
    blacks(296.6, 320.0),
    blacks(367.8, 390.5, 414.2),
    blacks(461.1, 484.7),
    blacks(531.8, 555.3, 578.7),
    blacks(625.8, 649.2),
    blacks(696.6, 719.8, 743.4),

    // The one region the resolver writes into. One cell, because this box is one assignable of
    // four-note paraphony; see the header for why it sits in the MIXER.
    { kind: 'voices', x: 352, y: 137, w: 42, h: 15 },
  ],
}
