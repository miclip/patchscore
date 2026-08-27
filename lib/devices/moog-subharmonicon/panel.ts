import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Subharmonicon's panel.
 *
 * Read off the full-panel line drawing the manual prints on its blank patch sheets (printed
 * p.50, PDF p.49) — the same drawing that carries the ten factory patch sheets on printed
 * pp.45-49, and the only complete, unobstructed, fully-labelled panel figure in the document.
 * Our own geometry and line weights; nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** The page was rendered at 300 dpi, the
 * unit's outer border located at 2215 x 940 px, and control positions taken as the centroids of
 * the white discs the drawing encloses inside each knob body — which is why the eleven large
 * knobs come out at one diameter and the four patchbay columns at one x each to a tenth of a
 * millimetre.
 *
 * ## The page numbers, and why they are not the PDF's
 *
 * The printed folio is the PDF page **+ 1** through PDF p.54, checked against three footers
 * (PDF 17 prints 18, PDF 30 prints 31, PDF 49 prints 50). It is not a constant: PDF p.6 is a
 * two-folio spread carrying both 6 and 7, and from PDF p.56 the offset is +2 (PDF 56 prints 58,
 * the specifications). Every citation in this folder is the **printed** number.
 *
 * ## The aspect check, and the two siblings it agrees with
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. Printed p.58 reads `SIZE (WxDxH): 12.57" x 4.21" x 5.24"`. The measured outer box is
 * 2215 / 940 = **2.356**, against
 *
 *     319.3 / 133   = 2.401     <- 1.9% out, and the only candidate that is close
 *     319.3 / 106.9 = 2.987     <- 27% out
 *
 * So the face a player looks at is 319.3 x 133 mm, and 106.9 mm is how far the box stands off
 * the desk. **The same two numbers as the DFAM and the Mother-32**, which is what should happen:
 * printed p.9 says so in as many words — "As with Mother-32 and DFAM, Subharmonicon conforms to
 * the 60HP Eurorack format; features aluminum rails, finished wood side pieces, an extensive
 * patchbay". Three manuals printing the same enclosure, measured independently off three
 * different drawings, agreeing to a tenth of a millimetre.
 *
 * **The residual 1.9% is taken on the y axis, deliberately**, exactly as the DFAM's is: x is
 * scaled by `2215 px = 319.3 mm` and y by `940 px = 133 mm`, so the figure maps onto the box the
 * manifest declares rather than drifting below its foot.
 *
 * **A second check the DFAM could not make, and it passes.** The metal panel proper — the
 * boundary between the wood cheeks and the aluminium — measures 2154 x 909.5 px, an aspect of
 * **2.368**, against Eurorack's exact 60HP x 3U of 304.8 / 128.5 = **2.372**. The drawing is
 * therefore faithful to 0.2% on the part of the unit that has a standard behind it, and the whole
 * of the 1.9% residual sits in the cheeks: they are drawn at about 4.3 mm each where a 60HP panel
 * inside a 319.3 mm unit leaves 7.25 mm. That is ink, and it is recorded rather than corrected —
 * correcting it would move every feature by up to 2.6 mm to make the figure agree with an
 * arithmetic nobody drew.
 *
 * ## No cheeks are drawn
 *
 * 319.3 mm is the whole unit, wood end cheeks included. The cheeks are unmistakable in the
 * drawing — wavy grain between the outer border and the panel edge — and nothing is drawn outside
 * the controls, so the features sit inside x 16.9..310.4.
 *
 * ## What this panel has that the vocabulary has no word for
 *
 * **The patchbay is a 4 x 8 block of 3.5 mm points and is drawn as a `grid`**, because
 * `PanelFeature` has no jack — the answer the Cascadia, the Mother-32 and the DFAM all reached.
 * It is labelled `IN / OUT`, the panel's own silkscreen over it, and printed p.31 explains the
 * legend: "Of these, 17 are inputs, identified by normal text on the panel. The remaining 15 are
 * outputs, indicated by reversed-color text over an inverse background."
 *
 * **Reading that legend off the drawing is what cross-checked the jack list.** The reversed
 * labels are solid black chips and fall out of a component pass as filled rectangles; their row
 * and column pattern — one output in rows 1, 3 and 5, three in rows 2 and 4, none in row 6, four
 * in row 7, two in row 8 — sums to fifteen and matches the chapter's own eight `ROW` headings
 * exactly. The manifest's `JACKS` and this drawing were read separately and agree.
 *
 * **The patchbay is not enclosed**, as the DFAM's is not: the four columns sit on open panel with
 * the legend floating above them.
 *
 * **The LEDs are not drawn.** There are eight step indicators (one under each STEP knob), four
 * beside QUANTIZE, three beside SEQ OCT, and one beside the MIDI IN jack. None is a control, and
 * `grid` says "a block of identical *controls*", so they are left off — the DFAM's rule, applied
 * to a panel with sixteen of them.
 *
 * **The eight STEP knobs and the four RHYTHM knobs are drawn as knobs at one small diameter**,
 * because that is what they are: the STEP knobs carry eight radiating ticks and the RHYTHM knobs
 * a dense ring of sixteen — one per selectable integer — and the bodies measure the same 6.6 mm.
 * They are twelve separate `knob` features rather than two `grid`s, because each carries its own
 * silkscreen name and a grid has one label for the block.
 *
 * **The two WAVE switches are drawn as buttons.** They are three-position toggles in hex collars,
 * and the panel prints waveform glyphs rather than words beside the three positions (printed
 * pp.19-20 name them UP, MIDDLE and DOWN). `PanelFeature` has no switch, so they take the
 * DFAM's answer: a button carrying the control's name.
 *
 * **No `group` rectangles.** This panel prints one bracket — the rule either side of the word
 * `OSCILLATORS` — and two more under `SEQ 1 ASSIGN` and `SEQ 2 ASSIGN`. All three are label
 * furniture rather than section boundaries, and none encloses anything, so nothing here draws a
 * box the panel does not have.
 *
 * The `voices` region sits in the bottom band under the patchbay. This box is one voice, the rack
 * draws one cell for it, and the patchbay above that cell is where the voice leaves — `OUT · VCA`
 * is its first entry. **24 x 9 mm is sized against the pads above it rather than against the free
 * space**: `test/rack.test.ts` asks that a voice cell stay under twice the width of the widest
 * grid cell on the same panel, and the patchbay's four columns over 51.2 mm make that 12.8 mm, so
 * anything from 25.6 mm up reads as a slab sitting over a field of sockets. 24 x 9 also keeps the
 * cell's aspect at 2.67, under §10's ceiling of 3, and clears the bottom-right panel screw at
 * x 306.3.
 */

// ---------------------------------------------------------------------------
// Measured constants
// ---------------------------------------------------------------------------

/** The unit's own vertical span, cheeks and rails included (printed p.58, checked by aspect). */
const RISE = 133

/** Every large knob on this panel is one diameter. Measured eleven times, 134 px at 300 dpi. */
const KNOB_D = 19.3

/** The four SUB FREQ knobs and the six mixer LEVEL knobs: one middle diameter. Measured ten times. */
const MID_D = 15.3

/** The eight STEP knobs and the four RHYTHM knobs: one small diameter. Measured twelve times. */
const STEP_D = 6.6

/** A 3.5 mm patch point as the drawing renders it, hex collar included. */
const JACK_W = 9.9
const JACK_H = 8.5

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string, d = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A rounded push button, and — for the two WAVE toggles — a switch drawn as one. */
function button(cx: number, cy: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'button', x: cx - w / 2, y: cy - h / 2, w, h, label }
}

/** The two knob rows of each sequencer, the rhythm row, and the two oscillator halves. */
const STEP_X = [16.9, 36.3, 55.7, 75.1]
const SEQ_1_Y = 19.1
const SEQ_2_Y = 44.2
const RHYTHM_Y = 69.2
const ASSIGN_Y = 71.7

/** The right-hand column pair: CUTOFF/RESONANCE/VCF ATTACK/VCA ATTACK, and their neighbours. */
const COL_L = 213.2
const COL_R = 243.8

export const SUBHARMONICON_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Moog Subharmonicon Manual, p.50 (blank preset panel drawing)',
  },
  features: [
    // ---- sequencer 1: four step knobs, their LEDs left off -------------------------
    { kind: 'label', x: 46.0, y: 8.7, text: 'SEQUENCER 1', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, SEQ_1_Y, `STEP ${i + 1}`, STEP_D)),

    // ---- sequencer 2 ---------------------------------------------------------------
    { kind: 'label', x: 46.0, y: 33.6, text: 'SEQUENCER 2', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, SEQ_2_Y, `STEP ${i + 1}`, STEP_D)),

    // ---- polyrhythm: four dividers, each with its two destination buttons ----------
    { kind: 'label', x: 46.0, y: 58.3, text: 'POLYRHYTHM', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, RHYTHM_Y, `RHYTHM ${i + 1}`, STEP_D)),
    ...STEP_X.map((x) => button(x, 81.8, 9.4, 6.4, 'SEQ 1')),
    ...STEP_X.map((x) => button(x, 91.0, 9.4, 6.4, 'SEQ 2')),

    // ---- tempo and transport -------------------------------------------------------
    { kind: 'label', x: 26.7, y: 97.7, text: 'TEMPO', align: 'middle' },
    knob(26.6, 112.2, 'TEMPO'),
    button(49.9, 103.7, 8.5, 7.8, 'RESET'),
    button(63.1, 103.7, 8.6, 7.8, 'EG'),
    button(76.3, 103.7, 8.6, 7.8, 'NEXT'),
    button(53.0, 114.3, 14.7, 8.5, 'PLAY'),
    button(73.2, 114.3, 14.7, 8.5, 'TRIGGER'),

    // ---- the oscillators: two VCOs, four subharmonics, and the shared buttons -------
    { kind: 'label', x: 175.4, y: 7.2, text: 'OSCILLATORS', align: 'middle' },
    button(93.9, 28.2, 6.9, 5.9, 'VCO 1 WAVE'),
    knob(113.3, 28.2, 'VCO 1 FREQ'),
    knob(170.4, 28.2, 'VCO 2 FREQ'),
    button(189.8, 28.2, 6.9, 5.8, 'VCO 2 WAVE'),
    button(141.8, 38.2, 10.8, 6.7, 'SEQ OCT'),
    knob(99.0, 54.2, 'SUB 1 FREQ', MID_D),
    knob(127.6, 54.2, 'SUB 2 FREQ', MID_D),
    knob(156.1, 54.2, 'SUB 1 FREQ', MID_D),
    knob(184.7, 54.2, 'SUB 2 FREQ', MID_D),
    button(100.0, ASSIGN_Y, 8.5, 8.3, 'OSC 1'),
    button(113.3, ASSIGN_Y, 8.5, 8.3, 'SUB 1'),
    button(126.6, ASSIGN_Y, 8.5, 8.3, 'SUB 2'),
    button(157.1, ASSIGN_Y, 8.5, 8.3, 'OSC 2'),
    button(170.4, ASSIGN_Y, 8.5, 8.3, 'SUB 1'),
    button(183.7, ASSIGN_Y, 8.5, 8.3, 'SUB 2'),
    button(141.8, 88.2, 11.5, 6.5, 'QUANTIZE'),

    // ---- the mixer: six levels, one per sound source --------------------------------
    knob(113.3, 89.2, 'VCO 1 LEVEL', MID_D),
    knob(170.4, 89.2, 'VCO 2 LEVEL', MID_D),
    knob(99.0, 112.3, 'SUB 1 LEVEL', MID_D),
    knob(127.6, 112.3, 'SUB 2 LEVEL', MID_D),
    knob(156.1, 112.2, 'SUB 1 LEVEL', MID_D),
    knob(184.7, 112.3, 'SUB 2 LEVEL', MID_D),

    // ---- filter, amplifier, and the two envelopes -----------------------------------
    knob(COL_L, 19.2, 'CUTOFF'),
    knob(COL_R, 19.2, 'VOLUME'),
    knob(COL_L, 50.2, 'RESONANCE'),
    knob(COL_R, 50.2, 'VCF EG AMT'),
    knob(COL_L, 81.2, 'VCF ATTACK'),
    knob(COL_R, 81.2, 'VCF DECAY'),
    knob(COL_L, 112.2, 'VCA ATTACK'),
    knob(COL_R, 112.2, 'VCA DECAY'),

    // ---- the patchbay: 4 columns at 264.2/277.9/291.8/305.5, 8 rows from 19.1 to 113.8
    { kind: 'label', x: 284.1, y: 6.3, text: 'IN / OUT', align: 'middle' },
    {
      kind: 'grid',
      x: 264.2 - JACK_W / 2,
      y: 19.1 - JACK_H / 2,
      w: 305.5 - 264.2 + JACK_W,
      h: 113.8 - 19.1 + JACK_H,
      cols: 4,
      rows: 8,
      shape: 'pad',
    },

    // ---- the bottom band: nameplate, and the one region the resolver writes ----------
    { kind: 'label', x: 36.5, y: 126.2, text: 'SUBHARMONICON', align: 'start' },
    { kind: 'voices', x: 264, y: 121.5, w: 24, h: 9 },
  ],
}
