import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the MicroFreak front panel.
 *
 * This device shipped undrawn, and the manifest recorded why: §10 wants one complete, unobstructed,
 * fully-labelled figure to measure from, and this manual has none. That finding still holds. What
 * it got wrong was the conclusion drawn from it — *"estimating coordinates off a cropped photograph
 * would produce a drawing indistinguishable from the measured ones, which is worse than none."*
 *
 * **They are not indistinguishable.** `PanelLayout.verified` is `Cite | false`, and the rack prints
 * the three states apart: *"panel not drawn yet"*, *"panel drawn, uncited"*, and *"drawn from
 * <cite>"*. The model already had a word for a drawing whose source is not a citation, so the
 * honest option was never between a measured panel and nothing.
 *
 * ## What is measured, and what is not
 *
 * The front-panel chapter draws the instrument as three separately-cropped photographs — *"Top
 * Row"* (p.9), *"Middle Row"* (p.13), *"Bottom Row"* (p.15). None shows the panel's outer border
 * and none includes the keyboard, which is why no single figure can be measured in §10's sense.
 *
 * **But each strip spans the instrument's full width**, left rounded corner to right rounded
 * corner, and the width is cited: Arturia publishes `55 x 311 x 233 mm`. That fixes a scale for
 * each strip independently, from its own embedded pixel width:
 *
 *     Top Row      1351 x 203 px   0.2302 mm/px   46.7 mm tall
 *     Middle Row   1308 x 155 px   0.2378 mm/px   36.9 mm tall
 *     Bottom Row   1347 x 145 px   0.2309 mm/px   33.5 mm tall
 *
 * So **every horizontal position here is measured**, and so is every diameter and each row's own
 * height. Positions were taken by scanning each strip for column-wise variance across its control
 * band, which separates a control from the flat panel around it, and cross-checked against the
 * figures by eye.
 *
 * **The vertical stacking is not measured**, and the citation's own text says so. Two of the three
 * offsets are recoverable and one is an assumption:
 *
 * - **Top to Middle is fixed by shared content.** The Top Row strip runs past its own controls and
 *   catches the `DIGITAL OSCILLATOR` / `ANALOG FILTER` / `CYCLING ENVELOPE` headers along its
 *   bottom edge, and those same headers open the Middle Row strip. Aligning on them puts the
 *   Middle strip's origin at 39.7 mm, so the two overlap by about 7 mm rather than tiling.
 * - **Middle to Bottom shares nothing**, so it is assumed contiguous. If the real panel has a gap
 *   there, every bottom-row control is drawn that much too high.
 * - **The control band is assumed to start at the top of the panel**, giving 110 mm of controls
 *   inside the cited 233 mm depth and leaving 123 mm for the keyboard and icon strip.
 *
 * A reader looking for a knob is served by which row it is in and what it sits between, and all of
 * that is measured. The assumptions move rows relative to each other, not controls within a row.
 *
 * Our own geometry and line weights throughout. Nothing traced, extracted or embedded (§10) — the
 * strips were read for coordinates and the drawing is ours.
 */

/** Panel size in mm. Both cited to Arturia's published `55 x 311 x 233 mm`; see the header. */
const W = 311
const H = 233

/** Row centre-lines in panel millimetres. Derived, not stated by any figure; see the header. */
const TOP_Y = 24
const MID_Y = 58
const BOT_Y = 94

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** Round buttons, of which this panel has many and no two quite the same size. */
function button(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - d / 2,
    y: cy - d / 2,
    w: d,
    h: d,
    round: true,
    ...(label === undefined ? {} : { label }),
  }
}

/** A section header, centred on the cluster it names. */
function header(cx: number, y: number, text: string): PanelFeature {
  return { kind: 'label', x: cx, y, text, align: 'middle' }
}

export const MICROFREAK_PANEL: PanelLayout = {
  panelRiseMm: H,
  /**
   * **Cited to the three strips, with the source saying what they gave.** The bar `rack.test.ts`
   * sets is that a drawn panel must be one somebody else can re-measure, which is why it refuses
   * `false` and `observed`. This clears that bar: the figures are named, the scale is each
   * strip's own full width against a published 311 mm, and anyone can repeat it.
   *
   * The qualifier is not decoration. Metropolix cites *"rise measured from the figure"* for the
   * same reason — the page is the source, and the clause says which numbers the page states and
   * which were derived from it. Here the derivation is larger, so the clause is longer.
   */
  verified: {
    kind: 'manual',
    source:
      'MicroFreak Manual 4.0.3, pp.9/13/15 (Top/Middle/Bottom Row) — horizontal positions and row heights measured from the three full-width strips; the vertical stacking of the rows is inferred, see panel.ts',
  },
  features: [
    // -----------------------------------------------------------------------
    // Top row — p.9. The modulation matrix, the display cluster, and Master.
    // -----------------------------------------------------------------------
    {
      kind: 'grid',
      x: 9,
      y: 12,
      w: 84,
      h: 26,
      cols: 7,
      rows: 5,
      shape: 'pad',
      label: 'Matrix',
    },
    knob(107, TOP_Y, 17, 'Matrix'),
    button(136, TOP_Y, 13, 'Paraphonic'),
    button(162, TOP_Y, 10, 'Panel'),

    // The display cluster sits in its own recessed bezel, with Preset, Save and Utility inside it.
    { kind: 'group', x: 175, y: 8, w: 104, h: 33 },
    { kind: 'screen', x: 187, y: 17, w: 18, h: 11 },
    knob(218, TOP_Y, 17, 'Preset'),
    button(243, TOP_Y, 13, 'Save'),
    button(265, TOP_Y, 13, 'Utility'),

    knob(293, TOP_Y, 17, 'Master'),

    // -----------------------------------------------------------------------
    // Middle row — p.13. Glide, the digital oscillator, the analog filter and
    // the cycling envelope. These three headers are the join between the two
    // strips; see the header note.
    // -----------------------------------------------------------------------
    header(77, 45, 'DIGITAL OSCILLATOR'),
    header(172, 45, 'ANALOG FILTER'),
    header(262, 45, 'CYCLING ENVELOPE'),

    knob(11, MID_Y, 15, 'Glide'),

    knob(44, MID_Y, 15, 'Type'),
    knob(66, MID_Y, 15, 'Wave'),
    knob(88, MID_Y, 15, 'Timbre'),
    knob(110, MID_Y, 15, 'Shape'),

    button(132, MID_Y, 11, 'Type'),
    knob(160, MID_Y, 16, 'Cutoff'),
    knob(184, MID_Y, 16, 'Resonance'),

    button(207, MID_Y, 11, 'Mode'),
    knob(230, MID_Y, 16, 'Rise / Shape'),
    knob(252, MID_Y, 16, 'Fall / Shape'),
    knob(274, MID_Y, 16, 'Hold / Sustain'),
    knob(296, MID_Y, 16, 'Amount'),

    // -----------------------------------------------------------------------
    // Bottom row — p.15. Octave, arpeggiator/sequencer, LFO and the envelope.
    // -----------------------------------------------------------------------
    header(24, 81, 'OCTAVE'),
    header(91, 81, 'ARP / SEQ'),
    header(161, 81, 'LFO'),
    header(251, 81, 'ENVELOPE'),

    button(17, BOT_Y, 13),
    button(31, BOT_Y, 13),
    button(51, BOT_Y, 13, 'Shift'),

    button(72, BOT_Y, 11, 'Arp | Seq'),
    button(88, BOT_Y, 11, 'Oct | Mod'),
    knob(111, BOT_Y, 17, 'Rate / Swing'),

    button(140, BOT_Y, 12, 'Shape'),
    knob(182, BOT_Y, 17, 'Rate'),

    button(210, BOT_Y, 11, 'Amp Mod'),
    knob(230, BOT_Y, 16, 'Attack'),
    knob(251, BOT_Y, 16, 'Decay / Rel'),
    knob(271, BOT_Y, 16, 'Sustain'),
    knob(292, BOT_Y, 16, 'Filter Amt'),

    // -----------------------------------------------------------------------
    // The playing surface. Below the controls and drawn from the cited depth
    // rather than from any figure — no figure in this manual shows it at all.
    // -----------------------------------------------------------------------
    // Four paraphonic voices, drawn at about a knob's width each. Deliberately *not* stretched
    // across the panel: `rack.test.ts` learned from the Deluge that a voice field given the whole
    // width makes cells that dwarf every control beside them, and the panel stops reading as the
    // box. Four cells of roughly 17 mm sit right next to the 16 mm knobs above them.
    { kind: 'voices', x: 8, y: 116, w: 20, h: 16, label: 'Paraphonic' },

    /**
     * **Fifteen, for a keyboard the manual calls twenty-five.** p.18: *"The keyboard of the
     * MicroFreak is touch capacitive and has 25 keys"*, and p.35 that it *"spans only two
     * octaves"*. Two octaves of 25 is 15 white keys and 10 black, and `shape: 'key'` draws the
     * white ones — the same census every other keybed in the library is drawn by, the Matriarch
     * at 29 of 49 and the minilogue xd at 22 of 37. Drawing 25 here would put a keyboard on the
     * panel that no MicroFreak has.
     */
    { kind: 'grid', x: 8, y: 150, w: W - 16, h: 70, cols: 15, rows: 1, shape: 'key' },
  ],
}
