import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Muse's top panel.
 *
 * Every coordinate below is taken from **the vector objects of the p.13 plan view**, not from a
 * render of it. The page's content stream was extracted with `qpdf --qdf`, interpreted with a
 * graphics-state machine that tracks `q`/`Q`/`cm` and flattens `m`/`l`/`c`/`re` into device space,
 * and each painted subpath reduced to its exact bounding box in PDF points. Those are the numbers
 * scaled into millimetres here. Our own geometry and line weights; nothing traced, extracted or
 * embedded.
 *
 * ## Why the vector pass replaced a raster one, and what it caught
 *
 * This panel was first measured the way `moog-dfam/panel.ts` describes — render high, find the
 * border, take control positions as centroids of the drawing's dark components. That method put
 * the *positions* within about half a millimetre of the vector figures, and got the **sizes
 * wrong in a way that invented a fact**.
 *
 * A Muse knob is drawn as a body circle inside a ring of tick marks. Connected-component analysis
 * cannot tell those apart: where the ticks touch, it merges them into one blob and returns the
 * ring; where they do not, it returns the body. So the raster pass reported diameters of 19.2,
 * 19.4, 19.6, 23.5, 23.7, 23.9, 24.1, 24.2 and 26.3 mm and the panel was authored with **two
 * apparent size classes of ordinary knob** — a distinction the instrument does not have.
 *
 * The vector objects say what is actually drawn: **forty knobs at 19.50 mm, two at 26.38 mm**
 * (the FILTER 1 and FILTER 2 `CUTOFF` knobs, which really are larger), and **two encoders at
 * 12.10 mm** in the PROGRAMMER. Three classes, exact, and 42 + 2 = **44, which is the number
 * p.116 prints**: *"44 knobs, 16 sliders, 129 buttons – OLED screen"*. The raster pass reached 44
 * only by adding the `SELECT` encoder by eye after the count came up short.
 *
 * It caught a second error of the same kind in the section boxes. A line scan finds horizontal
 * rules and cannot tell a box edge from a divider *inside* a box, so four sections were authored
 * as pairs that the drawing does not draw: `LFO 1` above `LFO 2`, `ARPEGGIATOR` above
 * `SEQUENCER`, `FILTER 1` beside `FILTER 2`, `FILTER ENVELOPE` above `VCA ENVELOPE`. Each is one
 * rounded rectangle in the vector data with a rule drawn across it, and the manual names them the
 * way the panel draws them — `LFO 1+2` (p.52), `FILTERS` (p.35), `ENVELOPES` (p.38).
 *
 * The lesson generalises past this device: **a raster pass measures ink, and ink is not geometry.**
 * Where a PDF carries its drawing as vectors, they are the measurement and a render is a way of
 * looking at it.
 *
 * ## The aspect check
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. Printed p.118 reads `DIMENSIONS  (W x D x H): 99 x 42 x 11 (cm), 39 x 17 x 4.5
 * (inches` — the unclosed parenthesis is Moog's, and is left as printed. The chassis, cheeks
 * included, is exactly `x 72.309..552.183, y 442.365..646.971` pt, or 479.874 x 204.606 pt:
 *
 *     measured  479.874 / 204.606 = 2.34536
 *     990 / 420                   = 2.35714     <- 0.50% out, and the only candidate that is close
 *     990 / 110                   = 9.0         <- 284% out
 *
 * So the surface a player looks at is 990 x 420 mm, and 110 mm is how far the box stands off the
 * stand. x is scaled by `479.874 pt = 990 mm` and y by `204.606 pt = 420 mm`.
 *
 * **Work from the centimetres, not the inches.** The imperial column on the same line rounds 42 cm
 * to 17 inches, which is 43.2 cm — nearly half an inch of drift. It is a conversion of the metric
 * figure rather than a second measurement, so it cannot corroborate anything.
 *
 * The keyboard is the independent check, and the vector pass sharpens it: the 36 white keys are
 * drawn on a pitch of **23.679 mm**, which is a full-size key. (The raster pass said 23.07, a 2.6%
 * under-read, because it measured the ink of the outermost key rather than the key.) A 420 mm span
 * would put the keys at 10 mm and a 990 mm rise would make the instrument taller than it is wide.
 *
 * ## The bands, measured
 *
 *  1. **3.6-41.0 mm** — the rear vent strip. Not drawn: §10's rack carries the rear sockets on its
 *     own patch rail, and a vent is not a control.
 *  2. **52.1-204.1 mm** — the upper section row, eleven boxed sections, on three knob rows at
 *     `cy` 87.35, 139.77 and 179.05 mm.
 *  3. **206.7-253.9 mm** — the lower section row: PITCH LFO, ASSIGNABLE CONTROLLERS, CLOCK,
 *     SEQUENCER, PROGRAMMER, VOICE CONTROL, CHORD.
 *  4. **272.6-409.7 mm** — the Left-Hand Controller and the 61-note keyboard.
 *
 * Two sections break the two-row grid and are drawn where they are drawn: MIXER (81.29-157.28)
 * sits below the title block in its column, and FILTERS (52.09-157.29) is shorter than its
 * neighbours so that PROGRAMMER can be taller.
 *
 * ## What is drawn, and what is deliberately not
 *
 * All 44 knobs and all 16 sliders, which is p.116's own count and is the check that the extraction
 * found controls rather than artefacts.
 *
 * **The 129 buttons are not all drawn, and the omission is honest rather than lazy.** What is drawn
 * is every cluster whose extent was measured *and* whose silkscreen label could be bound to it from
 * the same figure: the eleven `◁ ▷` selector pairs, and the sixteen PROGRAMMER location buttons.
 * The rest of the button field is in the vector data but was not tied to labels one by one, and
 * §10's standard is that a coordinate is measured or it is not shipped. A simplified panel may
 * leave something out; it may not guess at it. The DFAM panel omits its step LEDs on the same
 * principle.
 *
 * **No vendor artwork.** The p.13 figure carries the Moog wordmark twice and the MUSE logotype
 * once, each inside a box of its own that this layout simply does not draw. They are branding, not
 * controls, and §10 forbids shipping them whatever the drawing does.
 *
 * **The `voices` field sits on the TIMBRE A and TIMBRE B buttons**, measured at
 * `x 713.75, w 23.50` — the two 11.39 mm buttons at the left of VOICE CONTROL. That is §10 read
 * literally: the place the box's own voice allocation is chosen and shown. This device is a pool
 * of two timbres rather than one voice or eight (see `index.ts`), and those two buttons are what a
 * reader presses to address them.
 *
 * **The 16 sliders are four banks, not one kind.** Six MIXER faders, four FILTER ENVELOPE and four
 * VCA ENVELOPE stages, and the two Left-Hand Controller strips — which the drawing renders as
 * stacks of ribbed segments rather than as tracks, and which are measured here from the extent of
 * that stack.
 *
 * **The keyboard's black keys are placed individually, not generated.** 61 keys from C is 36 white
 * and 25 black, and the vector data gives all 25 black-key origins outright, so they are listed
 * rather than derived from a 2-then-3 cluster rule. The rule would have produced the same figure;
 * the measurement is simply what there is.
 */

/** Both figures off the p.118 DIMENSIONS line; see the note above for which is which. */
const SPAN = 990
const RISE = 420

/** The three knob rows of the upper section band, as drawn (mm to the knob centre). */
const ROW_1 = 87.35
const ROW_2 = 139.77
const ROW_3 = 179.05

/** The lower section band's single knob row. */
const ROW_4 = 231.46

/** Forty of this panel's forty-two knobs measure exactly this. */
const KNOB_D = 19.5
/** The two FILTER `CUTOFF` knobs, which are genuinely larger. */
const CUTOFF_D = 26.38
/** The PROGRAMMER's `SELECT` and `VALUE` encoders. */
const ENCODER_D = 12.1

/** `x`/`y` are the bounding box, so a knob quoted by its measured centre is placed through here. */
function knob(cx: number, cy: number, label?: string, d = KNOB_D): PanelFeature {
  return {
    kind: 'knob',
    x: cx - d / 2,
    y: cy - d / 2,
    d,
    ...(label === undefined ? {} : { label }),
  }
}

/**
 * A `◁ ▷` selector pair — the two-button stepper this panel uses wherever a control is a short
 * list of positions with LEDs beside it (OCTAVE, WAVEFORM, KB TRACKING, ORDER, DIRECTION, PAGE).
 * Every one of them is 22.72 x 10.13 mm, so only the origin varies.
 */
function stepper(x: number, y: number, label: string): PanelFeature {
  return { kind: 'grid', x, y, w: 22.72, h: 10.13, cols: 2, rows: 1, shape: 'pad', label }
}

/**
 * A bank of vertical faders, quoted by the measured x of the first and last **track** and the
 * track's own width. The grid's cells are the pitch, so the box is widened by half a cell either
 * side to sit each track in the middle of its own cell.
 */
function faders(
  firstX: number,
  lastX: number,
  count: number,
  trackW: number,
  y: number,
  h: number,
  label: string,
): PanelFeature {
  const pitch = (lastX - firstX) / (count - 1)
  return {
    kind: 'grid',
    x: firstX - (pitch - trackW) / 2,
    y,
    w: pitch * count,
    h,
    cols: count,
    rows: 1,
    shape: 'fader',
    label,
  }
}

// ---------------------------------------------------------------------------
// The keyboard (p.13, p.116: "61 full-size semi-weighted Fatar keybed")
// ---------------------------------------------------------------------------

const WHITE_X = 124.98
const WHITE_PITCH = 23.679
const WHITE_W = 22.53
const KEY_Y = 272.56
const WHITE_H = 137.14
const BLACK_W = 13.29
const BLACK_H = 89.54

/** All 25 black-key origins, read straight off the drawing rather than generated. */
const BLACK_X = [
  139.95, 166.85, 209.5, 236.39, 263.29, 305.59, 332.48, 375.13, 402.03, 428.92, 471.12, 498.01,
  540.66, 567.56, 594.45, 637.37, 664.26, 706.91, 733.8, 760.7, 803.69, 830.58, 873.23, 900.13,
  927.02,
]

const KEYBOARD: PanelFeature[] = [
  {
    kind: 'grid',
    x: WHITE_X - (WHITE_PITCH - WHITE_W) / 2,
    y: KEY_Y,
    w: WHITE_PITCH * 36,
    h: WHITE_H,
    cols: 36,
    rows: 1,
    shape: 'key',
  },
  ...BLACK_X.map(
    (x): PanelFeature => ({
      kind: 'grid',
      x,
      y: KEY_Y,
      w: BLACK_W,
      h: BLACK_H,
      cols: 1,
      rows: 1,
      shape: 'key',
    }),
  ),
]

// ---------------------------------------------------------------------------
// Sections. Every rectangle below is one measured rounded rectangle in the drawing —
// never a pair inferred from a rule drawn across one.
// ---------------------------------------------------------------------------

const SECTIONS: PanelFeature[] = [
  { kind: 'group', x: 21.79, y: 52.09, w: 66.57, h: 151.97, label: 'LFO 1 + 2' },
  { kind: 'group', x: 91.01, y: 52.09, w: 96.18, h: 151.97, label: 'MODULATION OSCILLATOR' },
  { kind: 'group', x: 189.84, y: 52.09, w: 148.45, h: 151.97, label: 'OSCILLATORS' },
  { kind: 'group', x: 340.94, y: 81.29, w: 141.89, h: 75.99, label: 'MIXER' },
  { kind: 'group', x: 340.94, y: 159.92, w: 141.89, h: 93.94, label: 'ARPEGGIATOR + SEQUENCER' },
  { kind: 'group', x: 485.48, y: 52.09, w: 214.33, h: 105.2, label: 'FILTERS' },
  { kind: 'group', x: 485.48, y: 159.92, w: 214.33, h: 93.94, label: 'PROGRAMMER' },
  { kind: 'group', x: 702.46, y: 52.2, w: 117.92, h: 151.74, label: 'ENVELOPES' },
  { kind: 'group', x: 823.03, y: 52.2, w: 36.12, h: 151.68, label: 'VCA' },
  { kind: 'group', x: 861.8, y: 52.2, w: 68.05, h: 151.85, label: 'DIFFUSION DELAY' },
  { kind: 'group', x: 932.5, y: 52.2, w: 36.12, h: 151.68, label: 'OUTPUT' },
  { kind: 'group', x: 21.79, y: 206.69, w: 165.4, h: 47.16, label: 'PITCH LFO' },
  { kind: 'group', x: 189.84, y: 206.69, w: 85.14, h: 47.16, label: 'ASSIGNABLE CONTROLLERS' },
  { kind: 'group', x: 277.65, y: 206.69, w: 60.64, h: 47.16, label: 'CLOCK' },
  { kind: 'group', x: 702.46, y: 206.69, w: 143.86, h: 47.16, label: 'VOICE CONTROL' },
  { kind: 'group', x: 848.97, y: 206.69, w: 51.05, h: 47.16, label: 'CHORD' },
]

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const KNOBS: PanelFeature[] = [
  // LFO 1 + LFO 2 (pp.52-53)
  knob(38.93, 74.25, 'RATE'),
  knob(72.96, ROW_1, 'AMPLITUDE'),
  knob(38.93, 147.61, 'RATE'),
  knob(72.96, 160.71, 'AMPLITUDE'),

  // MODULATION OSCILLATOR (pp.30-32)
  knob(109.06, ROW_1, 'FREQUENCY'),
  knob(109.06, ROW_2, 'PITCH AMOUNT'),
  knob(152.92, ROW_2, 'FILTER AMOUNT'),
  knob(109.06, ROW_3, 'PWM AMOUNT'),
  knob(152.92, ROW_3, 'VCA AMOUNT'),

  // OSCILLATOR 1, FM, OSCILLATOR 2 (pp.27-29)
  knob(210.14, ROW_1, 'FREQUENCY'),
  knob(262.8, ROW_1, 'FM AMOUNT'),
  knob(315.47, ROW_1, 'FREQUENCY'),
  knob(210.1, ROW_2, 'TRI/SAW'),
  knob(243.78, ROW_2, 'PULSE WIDTH'),
  knob(281.9, ROW_2, 'TRI/SAW'),
  knob(315.51, ROW_2, 'PULSE WIDTH'),

  // FILTER 1 + FILTER 2 (pp.35-37). The two CUTOFF knobs are the largest on the panel.
  knob(514.35, ROW_1, 'CUTOFF', CUTOFF_D),
  knob(562.26, ROW_1, 'RESONANCE'),
  knob(562.26, 126.77, 'ENVELOPE AMOUNT'),
  knob(622.7, ROW_1, 'RESONANCE'),
  knob(622.7, 126.77, 'ENVELOPE AMOUNT'),
  knob(671.16, ROW_1, 'CUTOFF', CUTOFF_D),

  // VCA (pp.42-43)
  knob(841.39, ROW_1, 'VCA LEVEL'),
  knob(841.46, 139.75, 'PAN'),
  knob(841.46, 178.93, 'PAN SPREAD'),

  // DIFFUSION DELAY (pp.45-46)
  knob(879.01, ROW_1, 'TIME - L'),
  knob(912.62, ROW_1, 'TIME - R'),
  knob(879.01, 139.75, 'FEEDBACK'),
  knob(912.62, 139.97, 'CHARACTER'),
  knob(895.89, 178.93, 'MIX'),

  // OUTPUT (pp.50-51)
  knob(950.56, ROW_1, 'MAIN OUT'),
  knob(950.56, 139.75, 'HEADPHONES'),
  knob(950.56, 178.93, 'LOW CUT'),

  // PITCH LFO (pp.58-59)
  knob(39.34, ROW_4, 'RATE'),
  knob(72.95, ROW_4, 'SHAPE'),
  knob(124.51, ROW_4, 'AMOUNT'),

  // ASSIGNABLE CONTROLLERS (p.61), CLOCK (p.65)
  knob(206.38, ROW_4, 'MACRO'),
  knob(294.65, ROW_4, 'TEMPO'),

  // ARPEGGIATOR (p.68) and SEQUENCER (p.75) clock dividers, sharing one drawn box
  knob(362.87, 184.22, 'CLOCK DIV'),
  knob(362.87, ROW_4, 'CLOCK DIV'),

  // PROGRAMMER encoders (p.15). Both are 12.10 mm; SELECT also pushes.
  knob(534.42, 179.06, 'SELECT', ENCODER_D),
  knob(650.79, 179.06, 'VALUE', ENCODER_D),

  // VOICE CONTROL (p.105), and GLIDE on the Left-Hand Controller (p.13)
  knob(792.26, 231.5, 'DETUNE'),
  knob(39.34, 282.61, 'GLIDE'),
]

const FADERS: PanelFeature[] = [
  faders(359.91, 460.23, 6, 3.41, 99.63, 38.33, 'MIXER'),
  faders(721.31, 781.5, 4, 3.41, 70.8, 38.33, 'ADSR'),
  faders(721.31, 781.5, 4, 3.41, 146.79, 38.33, 'ADSR'),
  // The Left-Hand Controller's two strips. The drawing renders each as a stack of ribbed
  // segments 7.39 mm wide running 312.85 to 373.35, which is the extent taken here.
  faders(47.69, 82.8, 2, 7.39, 312.85, 60.5, 'LHC'),
]

const STEPPERS: PanelFeature[] = [
  stepper(27.98, 108.49, 'WAVEFORM'),
  stepper(27.98, 181.85, 'WAVEFORM'),
  stepper(151.21, 86.64, 'WAVEFORM'),
  stepper(232.43, 108.49, 'OCTAVE'),
  stepper(270.55, 108.49, 'OCTAVE'),
  stepper(503.01, 126.83, 'KB TRACKING'),
  stepper(581.29, 126.83, 'ORDER'),
  stepper(659.49, 126.83, 'KB TRACKING'),
  stepper(415.71, 184.47, 'DIRECTION'),
  stepper(442.8, 184.47, 'OCTAVE RANGE'),
  stepper(442.8, 231.64, 'PAGE'),
]

export const MUSE_PANEL: PanelLayout = {
  panelRiseMm: RISE,

  /**
   * §2.3. The rise is the **depth** off the p.118 `(W x D x H)` line, for the reason
   * `panelRiseMm` documents: a keyboard sits flat on a stand, so the surface a player looks at is
   * the top, and 110 mm is how far the box stands off the stand rather than a panel dimension at
   * all. The aspect check in the header is what settles which of the three figures this is.
   */
  verified: { kind: 'manual', source: "Muse User's Manual v1.4.0, p.118" },

  features: [
    ...SECTIONS,
    // The OLED, measured at 80.86 x 23.06 mm. p.116 lists it without a dimension, so unlike every
    // other figure on this panel there is no specification line to check the drawing against.
    { kind: 'screen', x: 552.17, y: 167.75, w: 80.86, h: 23.06 },
    ...KNOBS,
    ...FADERS,
    ...STEPPERS,
    // The sixteen PROGRAMMER location buttons: patch select, mod slots, arp and sequencer steps.
    // Sixteen 11.39 mm buttons on a 12.54 mm pitch from x 492.86.
    {
      kind: 'grid',
      x: 492.29,
      y: 221.15,
      w: 200.64,
      h: 20.61,
      cols: 16,
      rows: 1,
      shape: 'pad',
      label: '1-16',
    },
    // §10: the voices field on the two measured TIMBRE buttons, which is where this box allocates.
    { kind: 'voices', x: 713.75, y: 221.19, w: 23.5, h: 20.61, label: 'TIMBRE' },
    ...KEYBOARD,
  ],
}

/** The horizontal bound the manifest declares, repeated here so the two cannot drift apart. */
export const MUSE_PANEL_SPAN_MM = SPAN
