import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Subharmonicon's panel.
 *
 * Read off the full-panel line drawing the manual prints on its blank patch sheets (printed
 * p.50, PDF p.49) — the same drawing that carries the ten factory patch sheets on printed
 * pp.45-49, and the only complete, unobstructed, fully-labelled panel figure in the document.
 * Our own geometry and line weights; nothing traced, extracted or embedded.
 *
 * ## The measurement is off the vector paths, not off a render
 *
 * `pdfimages -f 49 -l 49 -list` reports no raster images on that page: the figure is vector
 * artwork, so its geometry is *stated* in the file rather than inferred from ink. Every number
 * below was read from the path data — `pdftocairo -svg`, then each subpath flattened to points
 * in page space, closed curves fitted as circles by algebraic least squares, and hexagons and
 * rounded rectangles taken from their exact bounding boxes. Circle-fit residuals are under
 * 0.01 pt on every knob and under 0.003 pt on all thirty-two jacks, which is the difference
 * between a measurement and a reading.
 *
 * **The first pass rasterised at 300 dpi and took component centroids, and it was wrong in ways
 * worth recording**, because the same shortcut is available on every future device:
 *
 *  - a systematic **0.25-0.31 mm error on every y**, from locating the panel's top border to the
 *    nearest dark pixel row rather than at its stated coordinate;
 *  - knob and jack sizes over by 0.2-0.4 mm, because a stroked outline's ink is wider than the
 *    path it is centred on — the large knobs read 19.3 mm either way, but the small ones went
 *    6.6 against a true 6.4 and the jack collars 9.9 x 8.5 against 9.6 x 8.1;
 *  - and one outright mistake: `OSCILLATORS` was placed at x 175.4 when the word is centred at
 *    **141.9**, over the divider between the two oscillator halves, 34 mm away. A centroid pass
 *    over a text band cannot tell a word from the neighbouring boxed `2` marker; the glyph paths
 *    can.
 *
 * The page draws the panel **twice**, and the two copies agree to **0.0006 mm** on all eleven
 * large knobs. That is a check on the extraction rather than an independent measurement — it is
 * the same artwork placed twice — but it is what says no transform was dropped on the way out.
 * The two are not identical everywhere: only the upper copy draws the unit's side bars, so the
 * outer box below is the upper one's.
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
 * believed. Printed p.58 reads `SIZE (WxDxH): 12.57" x 4.21" x 5.24"`. The unit's outline is two
 * side bars at x 40.0000 and 571.0000-572.0000 spanning y 83.0000 to 308.9336, so the drawn box
 * is **532.0000 x 225.9336 pt = 2.35467**, against
 *
 *     319.3 / 133   = 2.40075     <- 1.92% out, and the only candidate that is close
 *     319.3 / 106.9 = 2.98690     <- 26.9% out
 *
 * So the face a player looks at is 319.3 x 133 mm, and 106.9 mm is how far the box stands off
 * the desk. **The same two numbers as the DFAM and the Mother-32**, which is what should happen:
 * printed p.9 says so in as many words — "As with Mother-32 and DFAM, Subharmonicon conforms to
 * the 60HP Eurorack format; features aluminum rails, finished wood side pieces, an extensive
 * patchbay". Three manuals printing the same enclosure, measured independently off three
 * different drawings, agreeing to a tenth of a millimetre.
 *
 * **The residual 1.92% is taken on the y axis, deliberately**, exactly as the DFAM's is: x is
 * scaled by `532.0000 pt = 319.3 mm` and y by `225.9336 pt = 133 mm`, so the figure maps onto the
 * box the manifest declares rather than drifting below its foot. Trusting x alone would make the
 * drawing 135.60 mm tall against a cited 133.
 *
 * **A second check the DFAM could not make, and the vector data sharpens it.** The metal panel
 * proper is one closed four-anchor rectangle, 516.3281 x 218.1055 pt, an aspect of **2.36733**
 * against Eurorack's exact 60HP x 3U of 304.8 / 128.5 = **2.37198**. The drawing is faithful to
 * **0.20%** on the part of the unit that has a standard behind it, and the whole of the 1.92%
 * residual sits in the cheeks: at the unit's scale they measure **4.67 mm** and **4.74 mm**,
 * where a 60HP panel inside a 319.3 mm unit leaves 7.25 mm each. That is ink, and it is recorded
 * rather than corrected — correcting it would move every feature by up to 2.6 mm to make the
 * figure agree with an arithmetic nobody drew.
 *
 * ## No cheeks are drawn
 *
 * 319.3 mm is the whole unit, wood end cheeks included. The cheeks are unmistakable in the
 * drawing — wavy grain between the side bar and the panel edge — and nothing is drawn outside
 * the controls, so the features sit inside x 13.9..310.2.
 *
 * ## What this panel has that the vocabulary has no word for
 *
 * **The patchbay is a 4 x 8 block of 3.5 mm points and is drawn as a `grid`**, because
 * `PanelFeature` has no jack — the answer the Cascadia, the Mother-32 and the DFAM all reached.
 * It is labelled `IN / OUT`, the panel's own silkscreen over it, and printed p.31 explains the
 * legend: "Of these, 17 are inputs, identified by normal text on the panel. The remaining 15 are
 * outputs, indicated by reversed-color text over an inverse background."
 *
 * The block is exactly regular, which is one more thing the paths say and a render only suggests:
 * the four columns sit on a 13.77 mm pitch and the eight rows on 13.49 mm, every collar the same
 * 15.95 x 13.83 pt hexagon, every jack circle the same 4.9 pt radius.
 *
 * **Reading the legend off the drawing is what cross-checked the jack list.** The reversed labels
 * are solid black chips; their row and column pattern — one output in rows 1, 3 and 5, three in
 * rows 2 and 4, none in row 6, four in row 7, two in row 8 — sums to fifteen and matches the
 * chapter's own eight `ROW` headings exactly. The manifest's `JACKS` and this drawing were read
 * separately and agree.
 *
 * **The patchbay is not enclosed**, as the DFAM's is not: the four columns sit on open panel with
 * the legend floating above them.
 *
 * **The LEDs are not drawn.** The paths carry sixteen of them at one 2.5 pt radius — eight step
 * indicators, four beside QUANTIZE, three beside SEQ OCT, one beside the MIDI IN jack — and the
 * eight panel screws at 5.5 pt. None is a control, and `grid` says "a block of identical
 * *controls*", so they are left off. The DFAM's rule, applied to a panel with twenty-four of them.
 *
 * **The eight STEP knobs and the four RHYTHM knobs are drawn as knobs at one small diameter**,
 * because that is what they are: the STEP knobs carry eight radiating ticks and the RHYTHM knobs
 * a dense ring of sixteen — one per selectable integer — and the bodies are the same 10.6 pt
 * circle. They are twelve separate `knob` features rather than two `grid`s, because each carries
 * its own silkscreen name and a grid has one label for the block.
 *
 * **The two WAVE switches are drawn as buttons.** They are three-position toggles in hex collars
 * — the paths give two hexagons at 10.77 x 9.34 pt, distinct from the patchbay's thirty-two —
 * and the panel prints waveform glyphs rather than words beside the three positions (printed
 * pp.19-20 name them UP, MIDDLE and DOWN). `PanelFeature` has no switch, so they take the DFAM's
 * answer: a button carrying the control's name.
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
 * grid cell on the same panel, and the patchbay's four columns over 50.9 mm make that 12.7 mm, so
 * anything from 25.4 mm up reads as a slab sitting over a field of sockets. 24 x 9 also keeps the
 * cell's aspect at 2.67, under §10's ceiling of 3, and clears the bottom-right panel screw, whose
 * path puts it at x 306.2..312.8.
 */

// ---------------------------------------------------------------------------
// Measured constants — page points converted at 0.60018797 mm/pt in x and
// 0.58866853 mm/pt in y, per the aspect note above.
// ---------------------------------------------------------------------------

/** The unit's own vertical span, cheeks and rails included (printed p.58, checked by aspect). */
const RISE = 133

/** Every large knob is one circle. Eleven fitted, r = 16.1319 pt, residual under 0.007 pt. */
const KNOB_D = 19.3

/** The four SUB FREQ knobs and the six mixer LEVEL knobs: r = 12.7 pt, ten of them. */
const MID_D = 15.2

/** The eight STEP knobs and the four RHYTHM knobs: r = 5.3 pt, twelve of them. */
const STEP_D = 6.4

/** A 3.5 mm patch point's hex collar, 15.95 x 13.83 pt, thirty-two identical. */
const JACK_W = 9.6
const JACK_H = 8.1

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string, d = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/** A rounded push button, and — for the two WAVE toggles — a switch drawn as one. */
function button(cx: number, cy: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'button', x: cx - w / 2, y: cy - h / 2, w, h, label }
}

/** The four columns the sequencers, the polyrhythm and their buttons all share. */
const STEP_X = [17.0, 36.4, 55.8, 75.1]
const SEQ_1_Y = 18.9
const SEQ_2_Y = 43.9
const RHYTHM_Y = 68.9
const ASSIGN_Y = 71.4

/** The right-hand column pair, on a 30.6 mm horizontal pitch and a 31.0 mm vertical one. */
const COL_L = 213.2
const COL_R = 243.8

/** The patchbay's own grid: four columns at 13.77 mm pitch, eight rows at 13.49 mm. */
const BAY_X0 = 264.1
const BAY_X1 = 305.4
const BAY_Y0 = 18.9
const BAY_Y1 = 113.4

export const SUBHARMONICON_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Moog Subharmonicon Manual, p.50 (blank preset panel drawing)',
  },
  features: [
    // ---- sequencer 1: four step knobs, their LEDs left off -------------------------
    { kind: 'label', x: 46.1, y: 9.7, text: 'SEQUENCER 1', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, SEQ_1_Y, `STEP ${i + 1}`, STEP_D)),

    // ---- sequencer 2 ---------------------------------------------------------------
    { kind: 'label', x: 46.1, y: 34.7, text: 'SEQUENCER 2', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, SEQ_2_Y, `STEP ${i + 1}`, STEP_D)),

    // ---- polyrhythm: four dividers, each with its two destination buttons ----------
    { kind: 'label', x: 46.1, y: 59.2, text: 'POLYRHYTHM', align: 'middle' },
    ...STEP_X.map((x, i) => knob(x, RHYTHM_Y, `RHYTHM ${i + 1}`, STEP_D)),
    ...STEP_X.map((x) => button(x, 81.6, 10.3, 6.2, 'SEQ 1')),
    ...STEP_X.map((x) => button(x, 90.6, 10.3, 6.2, 'SEQ 2')),

    // ---- tempo and transport -------------------------------------------------------
    { kind: 'label', x: 26.7, y: 98.8, text: 'TEMPO', align: 'middle' },
    knob(26.7, 111.9, 'TEMPO'),
    button(49.9, 103.6, 8.1, 7.9, 'RESET'),
    button(63.1, 103.6, 8.1, 7.9, 'EG'),
    button(76.4, 103.6, 8.1, 7.9, 'NEXT'),
    button(53.1, 113.9, 14.2, 8.2, 'PLAY'),
    button(73.2, 113.9, 14.2, 8.2, 'TRIGGER'),

    // ---- the oscillators: two VCOs, four subharmonics, and the shared buttons -------
    { kind: 'label', x: 141.9, y: 6.8, text: 'OSCILLATORS', align: 'middle' },
    button(94.0, 27.9, 6.5, 5.5, 'VCO 1 WAVE'),
    knob(113.3, 27.9, 'VCO 1 FREQ'),
    knob(170.4, 27.9, 'VCO 2 FREQ'),
    button(189.7, 27.9, 6.5, 5.5, 'VCO 2 WAVE'),
    button(141.8, 37.9, 10.3, 6.2, 'SEQ OCT'),
    knob(99.1, 53.9, 'SUB 1 FREQ', MID_D),
    knob(127.6, 53.9, 'SUB 2 FREQ', MID_D),
    knob(156.1, 53.9, 'SUB 1 FREQ', MID_D),
    knob(184.7, 53.9, 'SUB 2 FREQ', MID_D),
    button(100.1, ASSIGN_Y, 8.1, 7.9, 'OSC 1'),
    button(113.3, ASSIGN_Y, 8.1, 7.9, 'SUB 1'),
    button(126.6, ASSIGN_Y, 8.1, 7.9, 'SUB 2'),
    button(157.1, ASSIGN_Y, 8.1, 7.9, 'OSC 2'),
    button(170.4, ASSIGN_Y, 8.1, 7.9, 'SUB 1'),
    button(183.6, ASSIGN_Y, 8.1, 7.9, 'SUB 2'),
    button(141.8, 87.9, 11.0, 6.2, 'QUANTIZE'),

    // ---- the mixer: six levels, one per sound source --------------------------------
    knob(113.3, 88.9, 'VCO 1 LEVEL', MID_D),
    knob(170.4, 88.9, 'VCO 2 LEVEL', MID_D),
    knob(99.1, 111.9, 'SUB 1 LEVEL', MID_D),
    knob(127.6, 111.9, 'SUB 2 LEVEL', MID_D),
    knob(156.1, 111.9, 'SUB 1 LEVEL', MID_D),
    knob(184.7, 111.9, 'SUB 2 LEVEL', MID_D),

    // ---- filter, amplifier, and the two envelopes -----------------------------------
    knob(COL_L, 18.9, 'CUTOFF'),
    knob(COL_R, 18.9, 'VOLUME'),
    knob(COL_L, 49.9, 'RESONANCE'),
    knob(COL_R, 49.9, 'VCF EG AMT'),
    knob(COL_L, 80.9, 'VCF ATTACK'),
    knob(COL_R, 80.9, 'VCF DECAY'),
    knob(COL_L, 111.9, 'VCA ATTACK'),
    knob(COL_R, 111.9, 'VCA DECAY'),

    // ---- the patchbay ---------------------------------------------------------------
    { kind: 'label', x: 283.9, y: 7.6, text: 'IN / OUT', align: 'middle' },
    {
      kind: 'grid',
      x: BAY_X0 - JACK_W / 2,
      y: BAY_Y0 - JACK_H / 2,
      w: BAY_X1 - BAY_X0 + JACK_W,
      h: BAY_Y1 - BAY_Y0 + JACK_H,
      cols: 4,
      rows: 8,
      shape: 'pad',
    },

    // ---- the bottom band: nameplate, and the one region the resolver writes ----------
    { kind: 'label', x: 36.4, y: 128.2, text: 'SUBHARMONICON', align: 'start' },
    { kind: 'voices', x: 264, y: 121.5, w: 24, h: 9 },
  ],
}
