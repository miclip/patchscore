import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Octatrack MKII's top panel.
 *
 * ## Where the coordinates come from
 *
 * §3.1 FRONT PANEL, p.12, is the one complete top-down plan view in the document: a true
 * orthographic drawing, knobs as plain circles, screen as a flat rectangle, no foreshortening.
 *
 * **It was measured off the page's vector geometry rather than off a raster of it**, and that
 * choice is what makes the measurement possible at all. In a rendering, the figure is obstructed:
 * the callout discs numbered 24 to 28 sit directly on top of the `PROJ`, `PART`, `AED`, `MIX` and
 * `ARR` keys, and leader lines and highlight rectangles cross the panel body. Taking centroids of
 * dark components off that image would fold callout ink into five of the controls.
 *
 * In the page's own content stream those callouts are a separate overlay. The panel is one group,
 * and every control in it is an unobstructed path. So the method is the DFAM's with its third
 * step done in the source rather than in pixels:
 *
 *   1. `pdftocairo -svg -f 12 -l 12` the page. The panel is the group `source-8`, clipped to
 *      384 x 199 of its own units, and the callouts are outside it.
 *   2. Its outer rounded rectangle runs `x` 0.792969 to 383.050781 and `y` 0.324219 to
 *      198.199219, so the drawn panel is **382.257812 x 197.875**, aspect **1.93181**.
 *   3. Every control is the bounding box of its own path — exact numbers, not estimates. The
 *      values below are those numbers, in the drawing's units, converted here rather than by hand
 *      so the conversion is one line a reader can check.
 *
 * ## The aspect check, and the millimetre it does not settle
 *
 * §2.3 asks for the aspect to be checked before either figure is believed, and here it does not
 * agree with the specification. p.116 prints *"Dimensions: W 340 x D 184 x H 63 mm (13.3" x 7.2"
 * x 2.5") (including knobs, jacks, and rubber feet)"*, and `340 / 184` is **1.848** against the
 * drawn 1.932 — about four and a half percent apart.
 *
 * The span is the half that is safe: 340 mm is a width, the drawing is a plan view, and nothing
 * protrudes sideways. So `panelSpanMm: 340` is what the manifest cites, and the rise is anchored
 * to it through the drawn aspect: `197.875 x 340 / 382.257812` = **176.00 mm**.
 *
 * **The 8 mm that go missing are the depth's own parenthesis.** 184 mm is quoted *including
 * jacks and rubber feet*, and p.14's rear panel puts eleven sockets and a power inlet along the
 * back edge, where the jack bodies and their strain relief stand behind the face the plan view
 * draws. A footprint measured over protruding hardware being longer than the top face is the
 * ordinary case, not a contradiction — but the manual never prints the top face on its own, so
 * **176.00 mm is a derivation from the drawing and not a figure anybody published**, and that is
 * the uncertainty this paragraph exists to record rather than smooth over.
 *
 * ## What is drawn
 *
 * Our own geometry and line weights. Nothing traced, extracted or embedded (§10) — the numbers
 * are positions and sizes, and the shapes are this file's.
 *
 * **The voice field sits on the screen, and it is not the eight [TRACK] keys.** Those keys are
 * where a reader selects a track, and they would be the obvious home for it, but they are two
 * columns of four flanking the display — `T1` to `T4` at `x` 118, `T5` to `T8` at `x` 232 — and a
 * `voices` field is one rectangle. Any rectangle covering both columns swallows the screen
 * between them.
 *
 * The screen is the honest answer rather than the fallback, and `PanelFeature` names this case
 * outright: *"Draw the voice field on top of one to show a box whose screen lists its tracks."*
 * p.19 §5 item 1 says this screen does exactly that — *"Track icons that shows the machine
 * assignments and status of the tracks. The active track is highlighted"*, abbreviated `F`, `S`,
 * `T`, `N`, `P` and `M` for the machine on each. The icons are drawn in two columns at the
 * display's own left and right edges, in line with the two key columns, so the field lands
 * between them either way. The Tracker Mini reached the same place for the same reason.
 */

/** The panel outline in `source-8`'s own units, read off its outer rounded rectangle. */
const OUTLINE = { x0: 0.792969, y0: 0.324219, x1: 383.050781, y1: 198.199219 }

const SPAN_U = OUTLINE.x1 - OUTLINE.x0
const RISE_U = OUTLINE.y1 - OUTLINE.y0

/** p.116's width, the half of the specification the plan view can be anchored to. */
const SPAN_MM = 340
const SCALE = SPAN_MM / SPAN_U

/** Drawing units to panel millimetres, origin at the panel's top-left corner. */
const mx = (u: number) => (u - OUTLINE.x0) * SCALE
const my = (u: number) => (u - OUTLINE.y0) * SCALE
/** A length rather than a position, so no origin is subtracted. */
const ml = (u: number) => u * SCALE

/**
 * `x`/`y` are the bounding box, so a control measured by its outline is placed through one of
 * these rather than converted at each call site.
 */
function knob(x0: number, y0: number, x1: number, label: string): PanelFeature {
  return { kind: 'knob', x: mx(x0), y: my(y0), d: ml(x1 - x0), label }
}

function button(x0: number, y0: number, x1: number, y1: number, label?: string): PanelFeature {
  return {
    kind: 'button',
    x: mx(x0),
    y: my(y0),
    w: ml(x1 - x0),
    h: ml(y1 - y0),
    round: true,
    ...(label === undefined ? {} : { label }),
  }
}

function grid(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cols: number,
  rows: number,
  shape: 'pad' | 'knob' | 'fader' | 'key',
  label?: string,
): PanelFeature {
  return {
    kind: 'grid',
    x: mx(x0),
    y: my(y0),
    w: ml(x1 - x0),
    h: ml(y1 - y0),
    cols,
    rows,
    shape,
    ...(label === undefined ? {} : { label }),
  }
}

export const OCTATRACK_MKII_PANEL: PanelLayout = {
  panelRiseMm: RISE_U * SCALE,
  verified: {
    kind: 'manual',
    source: 'Octatrack MKII User Manual OS 1.40A, p.12 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The screen (p.12 item 4; p.116 gives it as a 128 x 64 pixel OLED), and the voice field on
    // top of it — see the header for why it is here and not on the [TRACK] keys.
    // -----------------------------------------------------------------------
    { kind: 'screen', x: mx(140.09), y: my(32.32), w: ml(83.2), h: ml(63.02) },
    {
      kind: 'voices',
      x: mx(146.56),
      y: my(39.65),
      w: ml(70.26),
      h: ml(46.11),
      label: 'TRACK',
    },

    // -----------------------------------------------------------------------
    // The eight [TRACK] keys, in the two columns the figure draws them in (item 3). Drawn as
    // controls even though the voice readout is on the screen: this is what a reader presses.
    // -----------------------------------------------------------------------
    button(118.52, 30.62, 131.05, 43.16, 'T1'),
    button(118.52, 48.59, 131.05, 61.12, 'T2'),
    button(118.52, 66.71, 131.05, 79.25, 'T3'),
    button(118.52, 84.7, 131.05, 97.24, 'T4'),
    button(232.4, 30.62, 244.94, 43.15, 'T5'),
    button(232.66, 48.73, 245.2, 61.26, 'T6'),
    button(232.76, 66.72, 245.29, 79.25, 'T7'),
    button(232.54, 84.57, 245.08, 97.09, 'T8'),

    // -----------------------------------------------------------------------
    // Top left: the headphones level (item 30), the sampling keys and their source LEDs
    // (items 1 and 2), and [MIDI] (item 29).
    // -----------------------------------------------------------------------
    knob(18.89, 29.33, 33.96, 'HEADPHONES'),
    grid(47.31, 40.43, 96.39, 44.54, 6, 1, 'pad'),
    button(47.36, 48.27, 60.38, 61.29, 'REC1'),
    button(65.22, 48.27, 78.23, 61.29, 'REC2'),
    button(83.24, 48.21, 96.25, 61.23, 'REC3'),
    button(11.42, 55.19, 24.29, 68.06, 'MIDI'),

    // The five menu keys (items 24-28) — the ones a rendered page cannot measure.
    button(11.38, 77.54, 24.47, 90.63, 'PROJ'),
    button(29.52, 77.67, 42.34, 90.49, 'PART'),
    button(47.54, 77.67, 60.23, 90.35, 'AED'),
    button(65.44, 77.63, 78.25, 90.45, 'MIX'),
    button(83.51, 77.63, 96.25, 90.36, 'ARR'),

    // -----------------------------------------------------------------------
    // Right of the screen: LEVEL (item 6), [TEMPO] (item 8), and the six DATA ENTRY knobs
    // (item 7), whose silkscreen letters are the ones §5.2 tells a reader to reach for.
    // -----------------------------------------------------------------------
    knob(267.19, 41.05, 282.26, 'LEVEL'),
    button(268.55, 72.84, 281.09, 85.38, 'TEMPO'),
    knob(297.55, 41.05, 312.61, 'A'),
    knob(327.9, 41.05, 342.97, 'B'),
    knob(358.26, 41.05, 373.32, 'C'),
    knob(297.55, 71.58, 312.61, 'D'),
    knob(327.9, 71.58, 342.97, 'E'),
    knob(358.26, 71.58, 373.32, 'F'),

    // -----------------------------------------------------------------------
    // The five [TRACK PARAMETER] keys (item 15) — the five pages every recipe is written
    // against. The rule between them and their secondary legends reads `Setup`.
    // -----------------------------------------------------------------------
    button(139.3, 101.63, 152.12, 114.45, 'SRC'),
    button(157.25, 101.63, 170.08, 114.45, 'AMP'),
    button(175.35, 101.77, 188.02, 114.45, 'LFO'),
    button(193.31, 101.75, 205.91, 114.36, 'FX1'),
    button(211.38, 101.75, 223.98, 114.36, 'FX2'),
    { kind: 'label', x: mx(181.7), y: my(121.0), text: 'Setup', align: 'middle' },

    // -----------------------------------------------------------------------
    // Left of centre: the modifier and navigation block (items 16-23), then the transport
    // (items 12-14), drawn in the figure's own left-to-right order.
    // -----------------------------------------------------------------------
    button(11.67, 107.05, 31.46, 119.27, 'FUNC'),
    button(44.23, 107.05, 64.0, 119.26, 'CUE'),
    button(11.34, 134.03, 31.66, 146.57, 'PTN'),
    button(44.25, 134.2, 64.0, 146.4, 'BANK'),
    button(75.75, 116.04, 88.29, 128.58, 'YES'),
    button(75.61, 133.97, 88.4, 146.76, 'NO'),
    button(111.75, 115.95, 124.48, 128.68),
    button(93.62, 134.03, 106.35, 146.76),
    button(111.75, 133.79, 124.48, 146.52),
    button(129.59, 134.03, 142.33, 146.76),
    button(160.98, 134.34, 180.75, 146.54, 'REC'),
    button(182.62, 134.34, 202.4, 146.55, 'PLAY'),
    button(203.94, 134.34, 223.71, 146.55, 'STOP'),

    // -----------------------------------------------------------------------
    // The two [SCENE] keys and the crossfader between them (items 9 and 11). The fader's box is
    // the handle's travel, which is what the drawing gives: the slot runs 278.24 to 340.07 and
    // the handle stands 120.81 to 142.28 across it.
    // -----------------------------------------------------------------------
    button(245.08, 121.37, 264.8, 141.09, 'SCENE A'),
    grid(278.24, 120.81, 340.07, 142.28, 1, 1, 'fader', 'CROSSFADER'),
    button(353.55, 121.37, 373.26, 141.09, 'SCENE B'),

    // -----------------------------------------------------------------------
    // The sixteen [TRIG] keys (item 21), with [PAGE] and its four page LEDs beside them
    // (item 10). The silkscreen splits the row in half: keys 1-8 trig the tracks, 9-16 trig
    // their machines (p.68), and both halves are lettered T1 to T8 under their own caption.
    // -----------------------------------------------------------------------
    grid(351.94, 155.11, 374.59, 159.21, 4, 1, 'pad'),
    button(353.39, 163.4, 373.24, 175.66, 'PAGE'),
    grid(11.74, 159.63, 351.93, 179.57, 16, 1, 'key'),
    { kind: 'label', x: mx(96.2), y: my(186.5), text: 'Track Trigs', align: 'middle' },
    { kind: 'label', x: mx(270.9), y: my(186.5), text: 'Sample/MIDI Trigs', align: 'middle' },
  ],
}
