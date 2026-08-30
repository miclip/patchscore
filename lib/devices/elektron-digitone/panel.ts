import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Digitone's top panel.
 *
 * Read off the FRONT PANEL figure on printed p.12 — the one complete, unobstructed,
 * fully-labelled panel drawing in the document. Our own geometry and line weights; nothing
 * traced, extracted or embedded.
 *
 * **Three marks the figure prints are deliberately not drawn**: the Elektron logo in the top
 * right, the `Digitone` wordmark below the screen, and the `Polyphonic Digital Synthesizer`
 * line above it. All three are the maker's rather than the panel's, and §10 keeps vendor
 * artwork out. The rack draws the device's own name where a box puts its logo, so nothing is
 * lost by leaving them off.
 *
 * ## Every coordinate below was measured, not estimated
 *
 * The page was rendered at 200 dpi and the panel's outer border located by taking, for every
 * row and column, the modal extent of the drawing's own 166-grey fill. That gives **1017 x 832
 * px**, with 742 of the 832 rows agreeing on the left edge at x=357 and 1002 of the 1017 columns
 * agreeing on the bottom edge at y=1221. Controls were then taken as connected
 * components of the fill's two lighter families (174 for a key, 200+ for a knob cap or a lit
 * key), which is why the eight DATA ENTRY knobs come out at one diameter and the sixteen [TRIG]
 * keys at one height.
 *
 * ## The aspect check (§2.3), and a second one this figure happens to allow
 *
 * Printed p.88 reads `Dimensions: W 215 × D 176 × H 63 mm`. The measured panel box is
 *
 *     1017 / 832 = 1.22236        <- the drawing
 *      215 / 176 = 1.22159        <- the specification's W / D
 *      215 /  63 = 3.41           <- 179% out, the reading a careless eye would take
 *
 * so the face a player looks at is 215 x 176 mm and 63 mm is how far the box stands off the
 * desk. The two scales agree to 0.06% — `215/1017 = 0.211406` mm/px across, `176/832 = 0.211538`
 * mm/px down — so each axis below is its own scale applied to its own measurement and there is
 * no residual to distribute.
 *
 * **The screen gives an independent check the sibling's figure could not.** p.88 specifies a
 * `128 × 64 pixel OLED screen`, an aspect of exactly 2.000. The drawn display measures 291 x 145
 * px, an aspect of **2.007** — 0.3% out. That is a second, unrelated dimension agreeing with a
 * second, unrelated specification line, on the same scale factors, which is a stronger statement
 * about the measurement than the panel aspect alone.
 *
 * ## The rear connectors are named here and not drawn
 *
 * **This figure differs from the Digitone II's, and the difference decides a coordinate.** That
 * box's p.12 draws its rear sockets along the top edge as shapes, so `elektron-digitone-ii`'s
 * panel draws eleven pads across them. This figure draws *no sockets at all* — it prints eleven
 * names in a row along the top edge (`⌒`, Left, Right, Input L, Input R, MIDI In, MIDI Out /
 * Sync A, MIDI Thru / Sync B, USB, DC In, Power) with the shapes themselves left to p.14's
 * separate rear view.
 *
 * The eleven name centres *were* measured — 72.5, 127, 198.5, 269.5, 342, 425.5, 520, 614.5,
 * 718.5, 808.5 and 913 px — and they are **not evenly spaced**: the gaps run from 54.5 px to
 * 104.5 px, because the audio cluster on the left is tighter than the MIDI and power sockets on
 * the right. An eleven-cell grid across the strip, which is the sibling's shape, would put five
 * of the eleven more than 5 mm from where this drawing names them and the worst 11.6 mm out. So
 * the strip is a `group` marking the measured extent and nothing else: the region is real and
 * measured, and no socket shape is invented to fill it.
 *
 * ## The voice field is the four [T1-T4] keys, and here that is not the [TRIG] row
 *
 * §2.3 asks for the region where the box's own voice or track selection lives. On the Digitone II
 * that is the [TRIG] keys, because track selection is their secondary function. **This box has
 * four dedicated keys instead** — p.13 item 11, *"[TRACK] keys. Selects which track to be active.
 * The secondary function mutes the track"* — drawn in their own bordered block at the bottom
 * right. So the field sits there, and the sixteen [TRIG] keys are a plain 8 x 2 `grid`.
 *
 * That is also why the field is four cells rather than sixteen: the pool below it is four synth
 * tracks (p.16), and the field is filled one cell per assignable.
 */

/** Panel size in mm, cited p.88 — W 215 x D 176 in playing orientation. */
const W = 215
const H = 176

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** Same, for the keys whose centroid is what the measurement gives. */
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

export const DIGITONE_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Digitone User Manual OS 1.41, p.12 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The rear connector strip. Measured extent, no invented sockets — see the header.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 13.53, y: 1.27, w: 183.5, h: 7.19, label: 'REAR CONNECTORS' },

    // -----------------------------------------------------------------------
    // Left column, the two absolute controls (p.13 items 1 and 25).
    // -----------------------------------------------------------------------
    knob(17.34, 32.37, 12.48, 'MASTER VOLUME'),
    knob(17.34, 57.33, 12.48, 'LEVEL/DATA'),

    // -----------------------------------------------------------------------
    // Screen (item 2) and the eight DATA ENTRY knobs A-H beside it (item 5).
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 37.0, y: 29.62, w: 61.52, h: 30.67 },
    { kind: 'group', x: 111.83, y: 25.81, w: 92.17, h: 43.58 },
    {
      kind: 'grid',
      x: 112.15,
      y: 26.12,
      w: 91.43,
      h: 37.44,
      cols: 4,
      rows: 2,
      shape: 'knob',
      label: 'DATA ENTRY',
    },

    // -----------------------------------------------------------------------
    // The six [PARAMETER] keys — TRIG, SYN1, SYN2, FLTR, AMP, LFO — which are the six pages
    // every recipe in this folder is written against (item 6).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 111.83, y: 73.83, w: 92.17, h: 15.87, label: 'PARAMETER' },
    { kind: 'grid', x: 112.89, y: 74.46, w: 90.27, h: 10.15, cols: 6, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Menu and transport, down the left and across the middle.
    // -----------------------------------------------------------------------
    button(19.77, 89.9, 16.49, 10.37, 'FUNC'),
    button(19.77, 105.88, 16.49, 10.15, 'MIDI'),
    // [NOTE] (item 14). The <ARPEGGIATOR> LED beside it is a 2 mm dot and is not drawn.
    button(19.77, 123.86, 10.15, 10.15),
    button(19.77, 142.05, 16.49, 10.15, 'PTN'),
    button(19.77, 157.91, 16.49, 10.15, 'BANK'),
    // SONG MODE, SETTINGS, VOICE, TEMPO (items 16-19).
    { kind: 'grid', x: 38.9, y: 84.83, w: 58.14, h: 10.37, cols: 4, rows: 1, shape: 'pad' },
    // RECORD, PLAY, STOP (items 20-22), which are wider than the row above them.
    { kind: 'grid', x: 38.69, y: 100.9, w: 58.56, h: 10.15, cols: 3, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // YES over NO (items 4, 3), and the [ARROW] cluster (item 7) — one key above three.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 112.89, y: 92.87, w: 10.15, h: 26.23, cols: 1, rows: 2, shape: 'pad' },
    { kind: 'group', x: 127.06, y: 92.23, w: 46.09, h: 31.94 },
    button(149.99, 97.84, 10.15, 10.15),
    { kind: 'grid', x: 128.96, y: 108.94, w: 42.07, h: 10.15, cols: 3, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The <PATTERN PAGE> LEDs (item 8) and [PAGE] below them (item 9). Four LEDs in one row,
    // counted off the rendered page — which agrees with p.13's "up to four" pattern pages.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 182.02, y: 96.25, w: 25.16, h: 8.67 },
    { kind: 'grid', x: 184.35, y: 100.27, w: 21.56, h: 3.38, cols: 4, rows: 1, shape: 'pad' },
    button(195.02, 113.91, 16.49, 10.15, 'PAGE'),

    // -----------------------------------------------------------------------
    // The sixteen [TRIG] keys (item 10), 8 x 2 in their own bordered block.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 38.05, y: 126.71, w: 124.73, h: 40.19 },
    { kind: 'grid', x: 38.69, y: 127.35, w: 123.25, h: 39.13, cols: 8, rows: 2, shape: 'key' },

    // -----------------------------------------------------------------------
    // The four [T1-T4] keys — the track selectors, so they are the voice field (item 11).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 171.24, y: 129.67, w: 33.19, h: 37.44 },
    { kind: 'voices', x: 172.3, y: 130.52, w: 31.08, h: 32.79, label: 'TRACK' },
  ],
}

/** Exported so the test can assert the aspect check rather than restate it. */
export const DIGITONE_PANEL_SPAN_MM = W
