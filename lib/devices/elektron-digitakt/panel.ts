import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Digitakt's top panel.
 *
 * Measured off the figure's own vector geometry, not off a raster of it. `3.1 FRONT PANEL` on
 * p.12 is the one complete, unobstructed, fully-labelled top-down view in this document, and
 * `pdftocairo -svg` gives every control back as a path rather than as a cloud of pixels:
 *
 *  1. The panel is a single rounded rectangle, `(127.894531, 145.824219)` to `(490.816406,
 *     442.914062)` pt — **362.921875 x 297.089843 pt**.
 *  2. Every control is one filled path in the panel's control grey, so a centre and a size are
 *     read off the path's own extent with nothing rounded and nothing estimated. Two shapes exist
 *     and the path data tells them apart without anybody judging by eye: a knob is four bezier
 *     arcs and no straight segments (`C=4 L=0`), a key is four arcs and four straights (`C=4
 *     L=4`) — a rounded rectangle. Cluster outlines are stroked paths; label positions are the
 *     glyph runs' own coordinates.
 *  3. Scaled pt -> mm against p.81's `W 215 x D 176 x H 63 mm`.
 *
 * **The aspect check is exact, which is the point of doing it this way.** 362.921875 / 297.089843
 * = 1.221590 against the specification's 215 / 176 = 1.221591 — agreement to six significant
 * figures, where measuring the same figure at 200 dpi put it 0.12% out. That settles 176 as the
 * rise rather than the 63 mm the box stands off the desk, and it settles it without a margin.
 *
 * Every dimension below falls out of that scaling as a round number, which is the other thing a
 * raster pass could not show: knobs are exactly **13.0 mm**, small keys **11.15 mm** square, wide
 * keys **17.5 x 11.15**, and the [TRIG] keys **17.5 mm** square. The drawing is on a grid.
 *
 * Our own geometry and line weights throughout; nothing traced, extracted or embedded.
 *
 * ## Two things this panel does that the Digitakt II's does not
 *
 * **The voice field is the top row of eight [TRIG] keys, not all sixteen.** p.17 gives the box
 * eight audio tracks on TRK 1-8 and eight *dedicated* MIDI tracks on TRK 9-16, and the panel says
 * the same thing in silkscreen: the top row is legended `KICK SNARE TOM CLAP COWBELL CLOSED HAT
 * OPEN HAT CYMBAL` and the bottom row `MIDI A` through `MIDI H`. The eight assignables are the
 * top row, so that is where the readout goes, and the MIDI row is drawn beside it as an ordinary
 * grid. On the successor the two rows are one pool of sixteen and its panel is right to cover
 * both.
 *
 * **The eight drum names on that legend are silkscreen, not an instrument set.** p.82 says
 * outright that *"You can assign any machine to any audio track"* and p.17 that each audio track
 * *"contains one sample"* — the words under the keys are where a factory kit puts its parts, not
 * a fixed voice. They are recorded here and deliberately not drawn as per-key labels; the
 * manifest's `voices` is one pool of eight for exactly this reason.
 *
 * ## What is drawn, and three things that are not
 *
 * A `grid` divides its box into `cols x rows` cells, so the two [TRIG] rows take a box built from
 * their *measured centre spacing* — 20.9886 mm, first centre minus half a cell plus eight cells —
 * which puts every cell centre on a measured key. Everything else is an individual feature with
 * its own measured box, because no other cluster on this panel is evenly enough spaced for a grid
 * to land its cells on the controls.
 *
 * **Two** things the figure contains are left out rather than approximated:
 *
 *  - **The <PATTERN PAGE> LEDs and the keyboard LED.** Four circles of 3.11 mm at y 102 and one at
 *    (20, 118). They are indicators, not controls, and `PanelFeature` has no kind that says so —
 *    drawing them as a `grid` of pads would put five controls on the panel that nobody can press.
 *  - **The `Quick Mute` bracket** at x 208, which is a piece of typography pointing at the [TRIG]
 *    keys rather than a feature of the panel.
 *
 * And one thing that is absent because **the figure does not contain it**, which is a different
 * claim and was miscounted as an omission in an earlier draft of this comment: there is no box
 * around the rear connector names. That draft drew one. The vector pass finds five stroked cluster
 * outlines on this panel and the top edge is not among them — the names are printed straight onto
 * the panel face, so they are drawn here the same way.
 *
 * The connector names themselves are the *rear* panel (p.14: headphones, main out, input, three
 * MIDI DIN sockets, USB, DC in, power), printed on the figure at the edge they are behind. They
 * are `label`s at their glyph runs' measured centres, on the two baselines the figure uses — 4.61
 * mm for the names and 8.00 mm for `Sync A` and `Sync B` under the two ports that carry them.
 * `Headphones` is the one word here the figure does not print: it draws a headphone symbol at
 * x 15.5, and this uses p.14's own name for the socket at the symbol's measured centre.
 */

/** Panel size in mm, cited p.81 — W 215 x D 176 in playing orientation. */
const W = 215
const H = 176

/** `x`/`y` are the bounding box, so a knob quoted by its measured centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/**
 * A key, quoted by its measured centre. Every key on this panel is a rounded rectangle — `C=4
 * L=4` in the path data — including the four round-*looking* menu keys, so none of them passes
 * `round`.
 */
function key(cx: number, cy: number, w: number, h: number, label?: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    ...(label === undefined ? {} : { label }),
  }
}

/** A rear-panel name, at its glyph run's measured centre on the figure's own baseline. */
function connector(cx: number, text: string, y = 4.61): PanelFeature {
  return { kind: 'label', x: cx, y, text, align: 'middle' }
}

/**
 * The horizontal extent of a row of eight [TRIG] keys, **taken from the row the figure draws
 * rather than derived from the key pitch.**
 *
 * The two readings differ and the difference is the whole question. The keys are 17.5 mm square
 * with measured centres from 48.04 to 194.96 mm, so the row's own outer edges are 39.29 and
 * 203.71 — and the stroked cluster outline around both rows is `x 39.29, w 164.44`, agreeing with
 * the key extents to two decimal places. Deriving a box from the 20.9886 mm centre *pitch*
 * instead gives `x 37.55, w 167.91`: about 1.7 mm wider on each side than anything the figure
 * draws.
 *
 * A box derived from the centre pitch was here first, on the argument that it lines a `grid`'s
 * cells up better with the keys. That argument optimises for a renderer convention this repo has
 * not written yet — nothing today says a grid centres a shape in its cell — while the measured box
 * is true whatever the renderer turns out to do. §10's standard is measured coordinates, so the
 * region is the region the figure draws.
 */
const TRIG_ROW = { x: 39.29, w: 164.44 }

export const DIGITAKT_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Digitakt User Manual OS 1.51, p.12 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The five stroked cluster outlines the figure draws, before what sits in them.
    // -----------------------------------------------------------------------
    /** The screen block — screen, product line, and the model logo under it. */
    { kind: 'group', x: 33.25, y: 21.96, w: 73.5, h: 50.75 },
    /** The eight DATA ENTRY knobs A-H (item 9). */
    { kind: 'group', x: 116.0, y: 26.0, w: 88.24, h: 38.31, label: 'DATA ENTRY' },
    /** The five [PARAMETER] keys (item 10). */
    { kind: 'group', x: 116.0, y: 73.92, w: 87.73, h: 11.3, label: 'PARAMETER' },
    /** The [ARROW] keys (item 11). */
    { kind: 'group', x: 132.43, y: 92.34, w: 43.15, h: 27.24 },
    /** Both rows of [TRIG] keys, with the drum legend between them (item 13). */
    { kind: 'group', x: 39.29, y: 126.75, w: 164.44, h: 40.08 },

    // -----------------------------------------------------------------------
    // Rear panel, named where the figure names it (p.14). No outline: it draws none.
    // -----------------------------------------------------------------------
    connector(15.5, 'Headphones'),
    connector(26.5, 'Left'),
    connector(41.5, 'Right'),
    connector(56.2, 'Input L'),
    connector(71.05, 'Input R'),
    connector(89.2, 'MIDI In'),
    connector(109.51, 'MIDI Out'),
    connector(109.02, 'Sync A', 8.0),
    connector(129.21, 'MIDI Thru'),
    connector(129.06, 'Sync B', 8.0),
    connector(151.05, 'USB'),
    connector(170.2, 'DC In'),
    connector(192.46, 'Power'),

    // -----------------------------------------------------------------------
    // The screen (item 2), taken as the bounding box of the display content the figure draws
    // rather than as its surround. That content measures 57.25 x 28.63 mm — an aspect of 2.00
    // against the 128 x 64 pixel OLED p.81 specifies, which is the check that says the box is
    // the active area and not the bezel around it.
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 41.19, y: 30.56, w: 57.25, h: 28.63 },

    // The two absolute controls down the left edge (items 1 and 21).
    knob(17.5, 32.5, 13.0, 'MASTER VOLUME'),
    knob(17.5, 57.5, 13.0, 'LEVEL/DATA'),

    // -----------------------------------------------------------------------
    // DATA ENTRY A-H. Centres 25.0 mm apart across, 25.0 mm down; each knob 13.0 mm.
    // -----------------------------------------------------------------------
    knob(122.5, 32.5, 13.0, 'A'),
    knob(147.5, 32.5, 13.0, 'B'),
    knob(172.73, 32.5, 13.0, 'C'),
    knob(197.51, 32.5, 13.0, 'D'),
    knob(122.5, 57.5, 13.0, 'E'),
    knob(147.5, 57.5, 13.0, 'F'),
    knob(172.73, 57.5, 13.0, 'G'),
    knob(197.51, 57.5, 13.0, 'H'),

    // -----------------------------------------------------------------------
    // The five [PARAMETER] keys — the five pages every recipe is written against.
    // -----------------------------------------------------------------------
    key(122.0, 79.5, 11.15, 11.15, 'TRIG'),
    key(141.0, 79.5, 11.15, 11.15, 'SRC'),
    key(160.0, 79.5, 11.15, 11.15, 'FLTR'),
    key(179.0, 79.5, 11.15, 11.15, 'AMP'),
    key(198.0, 79.5, 11.15, 11.15, 'LFO'),

    // -----------------------------------------------------------------------
    // Menu keys (items 3-6) and the modifier and track keys down the left edge.
    // -----------------------------------------------------------------------
    key(44.99, 90.02, 11.15, 11.15, 'SONG'),
    key(61.0, 90.02, 11.15, 11.15, 'SETTINGS'),
    key(77.0, 90.02, 11.15, 11.15, 'SAMPLING'),
    key(92.93, 90.02, 11.15, 11.15, 'TEMPO'),
    key(20.0, 90.02, 17.5, 11.15, 'FUNC'),
    key(20.0, 105.94, 17.5, 11.15, 'TRK'),
    key(20.0, 135.5, 17.5, 11.15, 'PTN'),
    key(20.0, 158.0, 17.5, 11.15, 'BANK'),

    // -----------------------------------------------------------------------
    // Transport (items 16-18), YES/NO (items 7, 8), the arrow cluster and PAGE.
    // -----------------------------------------------------------------------
    key(48.04, 105.94, 17.5, 11.15, 'RECORD'),
    key(69.0, 105.94, 17.5, 11.15, 'PLAY'),
    key(90.01, 105.94, 17.5, 11.15, 'STOP'),
    key(122.0, 98.0, 11.15, 11.15, 'YES'),
    key(122.0, 114.0, 11.15, 11.15, 'NO'),
    key(154.0, 98.0, 11.15, 11.15),
    key(138.0, 114.0, 11.15, 11.15),
    key(154.0, 114.0, 11.15, 11.15),
    key(170.0, 114.0, 11.15, 11.15),
    key(194.98, 114.0, 17.5, 11.15, 'PAGE'),

    // -----------------------------------------------------------------------
    // [TRIG 1-8] are the eight audio tracks, so they are the voice field.
    // [TRIG 9-16] are the eight dedicated MIDI tracks, which sound nothing.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: TRIG_ROW.x, y: 126.75, w: TRIG_ROW.w, h: 17.5, label: 'AUDIO TRACK' },
    // Row 2 sits 22.5 mm below row 1 — key centres 135.5 and 158.0.
    {
      kind: 'grid',
      x: TRIG_ROW.x,
      y: 149.25,
      w: TRIG_ROW.w,
      h: 17.5,
      cols: 8,
      rows: 1,
      shape: 'pad',
      label: 'MIDI TRACK',
    },
  ],
}
