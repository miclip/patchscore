import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Analog Rytm MKII's top panel.
 *
 * Read off the FRONT PANEL figure on printed p.10 — the one complete, unobstructed,
 * fully-labelled panel drawing in the document. Our own geometry and line weights; nothing
 * traced, extracted or embedded. The Elektron logo the figure prints in its top right corner
 * (measured at 361.5, 16.7) is deliberately **not** drawn: it is the maker's mark rather than the
 * panel's, and §10 keeps vendor artwork out. The sibling Digitone II panel omits the same logo
 * for the same reason.
 *
 * ## Every coordinate below was measured, not estimated
 *
 * The page was rendered at 200 dpi, the panel's outer border located at **1074 x 625 px** as the
 * solid extent of the figure's own 199-grey body fill, and control positions taken as the
 * centroids of the light components sitting on it. That is why the four DATA ENTRY knobs of a row
 * come out at one y to a tenth of a millimetre, why all eight arrive at one diameter, and why the
 * twelve pads come out at one size to within a third of a millimetre.
 *
 * The group rectangles are measured too, and separately: the figure draws them as dark hairlines
 * rather than as light fills, so they were found by scanning the panel for horizontal dark runs
 * of 100 px and vertical runs of 60 px. Six boxes came back, and the leader lines that run to the
 * callout numbers came back with them and were discarded — a leader is not a panel feature. This
 * is why the pad enclosure is drawn 7 mm deeper than the pads it holds: the figure's box has the
 * BD/SD/RS/CP silkscreen inside it.
 *
 * ## The aspect check (§2.3)
 *
 * Printed p.76 reads `Dimensions: W385 × D225 × H82 mm (15.2 × 8.85 × 3.3") including knobs,
 * jacks, and feet`. The measured panel box is
 *
 *     1074 / 625 = 1.7184        <- the drawing
 *      385 / 225 = 1.7111        <- the specification's W / D, 0.4% out
 *      385 /  82 = 4.6951        <- 173% out, the reading a careless eye would take
 *
 * so the face a player looks at is 385 x 225 mm, and 82 mm is how far the box stands off the desk
 * with its knobs on. The two scales come out at `385/1074 = 0.35847` mm/px across and
 * `225/625 = 0.36` mm/px down — 0.4% apart, and that residual is taken on the y axis exactly as
 * the DFAM's is, so no feature drifts below the panel's foot.
 *
 * **The figure draws the rear connector strip along the top edge as part of the same face** — the
 * `Main Out`, `Ext In`, `MIDI In`, `Sync A`, `Control In`, `USB` and `DC In` silkscreen is
 * visible across the top of the drawing — and the aspect agreeing anyway is what says that strip
 * is inside the 225 mm rather than added to it. That is the Digitone II's reading, not the
 * Digitakt II's, whose figure draws the strip proud of the panel and records a 2% discrepancy.
 * The sockets themselves are not drawn: the figure labels them but does not render them as
 * controls, and inventing twelve rectangles to sit under real silkscreen would be drawing
 * something this figure does not.
 *
 * ## The voice field is the twelve pads
 *
 * §2.3 asks for the region where the box's own voice selection lives, and here it is the twelve
 * pads: one pad per drum track, silkscreened with the track's own name — the figure prints
 * `1 BD`, `2 SD`, `3 RS`, `4 CP` under the bottom row, `5 BT`, `6 LT`, `7 MT`, `8 HT` under the
 * middle and `9 CH`, `10 OH`, `11 CY`, `12 CB` under the top. Twelve cells over twelve voices,
 * one to one.
 *
 * **The sixteen [TRIG] keys carry the same twelve names and are not the field.** The figure
 * prints `BD SD RS CP BT LT MT HT CH OH CY CB` under trig keys 1-12 as well, so either could be
 * argued. The pads win because the mapping is exact: a voice field laid over sixteen keys would
 * have to leave four of them meaning nothing, and the four it left over are steps 13-16, which
 * are not silent — they are the rest of the bar. Lighting twelve of sixteen sequencer steps to
 * mean "these tracks are in use" is a readout that reads false at a glance, and §10's rule is
 * that the readout has to land somewhere true. This is where the Digitone II's answer and this
 * one diverge, and the reason is that its sixteen keys select sixteen tracks; these twelve pads
 * select twelve.
 *
 * ## What is drawn as a `grid` and why
 *
 * The DATA ENTRY knobs A-H (item 13), the five [PARAMETER] keys (item 14), the five mode keys
 * (items 32-36), the A-H bank keys (item 24) and the sixteen [TRIG] keys (item 27) are each a
 * block of identical controls, which is what `grid` says. The [PARAMETER] keys are the five pages
 * every recipe in this folder is written against — SRC, SMPL, FLTR, AMP, LFO — so the box the
 * figure draws around them is drawn here too.
 *
 * The four `<PATTERN PAGE>` LEDs (item 19, silkscreened `1:4 2:4 3:4 4:4`) are **not** drawn.
 * They are indicators rather than controls, and `grid` says "a block of identical *controls*" —
 * the DFAM leaves its step LEDs off on the same rule. The same goes for the four LEDs above the
 * bank keys.
 */

/** Panel size in mm, cited p.76 — W 385 x D 225 in playing orientation. */
const W = 385
const H = 225

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** Same, for the buttons whose centroid is what the measurement gives. */
function button(cx: number, cy: number, w: number, h: number, label?: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    ...(label === undefined ? {} : { label }),
  }
}

export const ANALOG_RYTM_MKII_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Analog Rytm MKII User Manual OS 1.71, p.10 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Top row, left to right (items 1-7). Two knobs and a key, then the performance pair, then
    // TRACK LEVEL out on its own beside the screen.
    // -----------------------------------------------------------------------
    knob(24.0, 32.2, 13.3, 'MAIN VOLUME'),
    button(53.2, 32.2, 12.2, 12.2, 'SAMPLING'),
    button(89.8, 32.2, 18.6, 12.2, 'QPER'),
    knob(117.3, 32.2, 13.3, 'QUICK PERF AMOUNT'),
    knob(163.1, 32.2, 13.3, 'TRACK LEVEL'),

    // -----------------------------------------------------------------------
    // Second row — [SETTINGS] on its own, then the five mode keys PLAY, MUTE, CHRO, SCNE, PERF
    // (items 32-36), then [FIX] and [TEMPO].
    // -----------------------------------------------------------------------
    button(23.9, 54.5, 12.2, 12.2, 'SETTINGS'),
    { kind: 'grid', x: 47.8, y: 49.1, w: 85.4, h: 12.2, cols: 5, rows: 1, shape: 'pad' },
    button(144.8, 54.5, 12.5, 12.2, 'FIX'),
    button(163.1, 54.5, 12.5, 12.2, 'TEMPO'),

    // -----------------------------------------------------------------------
    // Screen (item 10), and the eight DATA ENTRY knobs A-H in the box the figure draws around
    // them (item 13).
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 184.8, y: 28.2, w: 78.5, h: 55.4 },
    { kind: 'group', x: 271.0, y: 29.9, w: 98.9, h: 49.7 },
    {
      kind: 'grid',
      x: 272.7,
      y: 31.6,
      w: 94.9,
      h: 42.0,
      cols: 4,
      rows: 2,
      shape: 'knob',
      label: 'DATA ENTRY',
    },

    // -----------------------------------------------------------------------
    // Left edge — FUNC, TRK, RTRG (items 30, 29, 28).
    // -----------------------------------------------------------------------
    button(23.9, 91.3, 18.6, 18.7, 'FUNC'),
    button(23.9, 129.4, 18.6, 12.2, 'TRK'),
    button(23.9, 164.2, 18.6, 12.6, 'RTRG'),

    // -----------------------------------------------------------------------
    // [YES] over [NO] (items 9, 8), and the [ARROW] cluster in its own box (item 11) — one key
    // above three, the figure's own arrangement.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 194.2, y: 91.6, w: 12.2, h: 29.9, cols: 1, rows: 2, shape: 'pad' },
    { kind: 'group', x: 207.9, y: 88.9, w: 48.8, h: 37.1 },
    button(232.1, 97.0, 12.2, 12.2),
    { kind: 'grid', x: 209.8, y: 108.6, w: 44.8, h: 12.2, cols: 3, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // [TRIG] (item 12), then the five [PARAMETER] page keys in the box the figure draws around
    // them — SRC, SMPL, FLTR, AMP, LFO (item 14) — and [FX] under their right end (item 15).
    // -----------------------------------------------------------------------
    button(279.9, 97.5, 12.2, 12.2, 'TRIG'),
    { kind: 'group', x: 287.5, y: 88.9, w: 82.4, h: 24.5, label: 'PARAMETER' },
    { kind: 'grid', x: 289.5, y: 90.9, w: 77.4, h: 12.2, cols: 5, rows: 1, shape: 'pad' },
    button(360.8, 121.1, 12.2, 12.2, 'FX'),

    // -----------------------------------------------------------------------
    // The twelve pads (item 26), in the enclosure the figure draws around them. The enclosure is
    // deeper than the pads because the track silkscreen sits inside it.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 44.8, y: 70.9, w: 126.9, h: 105.9 },
    { kind: 'voices', x: 47.4, y: 73.3, w: 122.0, h: 96.5, label: 'TRACK' },

    // -----------------------------------------------------------------------
    // [CHAIN] and [SONG] (items 17, 16), then the A-H bank keys in their box (item 24), whose
    // second function row is Trig Mute, Accent, Swing and Slide.
    // -----------------------------------------------------------------------
    button(298.2, 134.1, 12.2, 12.6, 'CHAIN'),
    button(319.4, 134.1, 12.2, 12.6, 'SONG'),
    { kind: 'group', x: 181.0, y: 130.3, w: 86.4, h: 46.5 },
    { kind: 'grid', x: 182.7, y: 141.7, w: 82.7, h: 28.1, cols: 4, rows: 2, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Transport — [REC], [PLAY], [STOP] (items 23, 22, 21) — then [FILL] and [PAGE].
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 279.0, y: 152.8, w: 60.6, h: 18.7, cols: 3, rows: 1, shape: 'pad' },
    button(360.9, 163.8, 12.2, 12.6, 'FILL'),
    button(360.9, 197.1, 17.9, 11.5, 'PAGE'),

    // -----------------------------------------------------------------------
    // The sixteen [TRIG] keys (item 27), in the enclosure the figure draws around them. Keys 1-12
    // carry the track names a second time; see the module comment for why the voice field is not
    // here.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 13.3, y: 182.9, w: 336.9, h: 26.6 },
    // `shape: 'pad'`, not `'key'`, and the box's own name for them is the reason to check rather
    // than the reason to decide: the figure draws these at 17.9 x 18.0 mm, a rounded square, which
    // is the shape it gives every other key on this panel and a smaller version of the pads above.
    // The MC-707's step row is `'key'` because that panel draws it *narrow* — a different shape
    // from its own pads. This census counts what a panel draws, so drawing one rounded square two
    // ways because one of them is called a key would be the reading it exists to prevent.
    { kind: 'grid', x: 14.9, y: 184.8, w: 334.1, h: 18.0, cols: 16, rows: 1, shape: 'pad' },
  ],
}

/** Exported so the test can assert the aspect check rather than restate it. */
export const ANALOG_RYTM_MKII_PANEL_SPAN_MM = W
