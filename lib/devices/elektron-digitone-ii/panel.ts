import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Digitone II's top panel.
 *
 * Read off the FRONT PANEL figure on printed p.12 — the one complete, unobstructed,
 * fully-labelled panel drawing in the document. Our own geometry and line weights; nothing
 * traced, extracted or embedded. The Elektron logo the figure prints in its top right corner is
 * deliberately **not** drawn: it is the one mark on that face that is the maker's rather than the
 * panel's, and §10 keeps vendor artwork out.
 *
 * ## Every coordinate below was measured, not estimated
 *
 * The page was rendered at 200 dpi, the panel's outer border located at **976 x 799 px**, and
 * control positions taken as the centroids of the drawing's own light components against the
 * panel's 112-grey fill. That is why the four DATA ENTRY knobs of a row come out at one y to a
 * tenth of a millimetre, and why all eight arrive at one diameter.
 *
 * ## The aspect check (§2.3), which this figure passes to four decimal places
 *
 * Printed p.87 reads `Dimensions: W 215 × D 176 × H 63 mm`. The measured panel box is
 *
 *     976 / 799 = 1.22153        <- the drawing
 *     215 / 176 = 1.22159        <- the specification's W / D
 *     215 /  63 = 3.41           <- 179% out, the reading a careless eye would take
 *
 * so the face a player looks at is 215 x 176 mm and 63 mm is how far the box stands off the desk.
 * The two scales agree to 0.005% — `215/976 = 0.220287` mm/px across, `176/799 = 0.220275` down —
 * so unlike the DFAM there is no residual to take on either axis, and every figure below is one
 * scale applied to one measurement.
 *
 * **The figure draws the rear connector strip along the top edge as part of the same face**, and
 * the aspect agreeing anyway is what says that strip is inside the 176 mm rather than added to
 * it. The sibling Digitakt II panel records a 2% discrepancy from exactly this cause; that box's
 * figure draws the strip proud of the panel and this one does not.
 *
 * ## The voice field is the sixteen [TRIG] keys
 *
 * §2.3 asks for the region where the box's own voice selection lives. Here that is literally the
 * same control: p.12 item 16 says the [TRIG] keys "are also used to select a track, bank, pattern,
 * and song in combination with the [TRK], [PTN], and [SONG] keys", and item 19 gives the gesture —
 * "Press [TRK] + one of the [TRIG] keys to select a track for editing". So the field sits on them
 * and no second grid is drawn underneath, which would draw the same sixteen buttons twice.
 *
 * The keys measure 11.35 x 17.6 mm each — taller than they are wide, which is what the drawing
 * shows and not a compromise; sixteen cells over 124.4 x 40.1 mm reproduce that.
 *
 * ## What is drawn as a `grid` and why
 *
 * `PanelFeature` has no jack, so the rear sockets seen along the top edge are a `grid` of eleven —
 * headphones, out L, out R, in L, in R, MIDI In, MIDI Out, MIDI Thru, USB, DC In, Power, which is
 * p.14's nine numbered entries with the two stereo pairs counted as the four sockets they are.
 * The same answer the Cascadia, the Mother-32 and the DFAM reached for their patchbays.
 *
 * The `<PATTERN PAGE>` LEDs (item 10) are drawn as a 4 x 2 grid because that is what the figure
 * draws — counted off the rendered page at 6x rather than assumed — and it agrees with p.48's
 * "128 steps spread over 8 pages with 16 steps each".
 */

/** Panel size in mm, cited p.87 — W 215 x D 176 in playing orientation. */
const W = 215
const H = 176

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

export const DIGITONE_II_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Digitone II User Manual OS 1.10, p.12 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The rear connector strip, drawn along the top edge as the figure draws it (p.14).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 13.4, y: 2, w: 184.2, h: 5.5, cols: 11, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Left column — the two absolute controls (p.12 items 1 and 25).
    // -----------------------------------------------------------------------
    knob(17.4, 32.5, 13, 'MAIN VOLUME'),
    knob(17.5, 57.4, 13, 'LEVEL/DATA'),

    // -----------------------------------------------------------------------
    // Screen (item 26), and the eight DATA ENTRY knobs A-H beside it (item 8).
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 31.5, y: 22.1, w: 73.3, h: 50.7 },
    {
      kind: 'grid',
      x: 111.8,
      y: 25.9,
      w: 92,
      h: 37.9,
      cols: 4,
      rows: 2,
      shape: 'knob',
      label: 'DATA ENTRY',
    },

    // -----------------------------------------------------------------------
    // The six [PARAMETER] keys — TRIG, SYN, FLTR, AMP, FX, MOD — which are the six pages every
    // recipe in this folder is written against (item 9).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 110.6, y: 72.4, w: 94.4, h: 13.8, label: 'PARAMETER' },
    { kind: 'grid', x: 112.2, y: 73.7, w: 91.2, h: 11.2, cols: 6, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Menu, transport and navigation.
    // -----------------------------------------------------------------------
    button(20, 89.9, 17.6, 11.2, 'FUNC'),
    // PRESET/KIT, SETTINGS, VOICE SETUP, TEMPO (items 2-5).
    { kind: 'grid', x: 38.3, y: 84.3, w: 59.1, h: 11.2, cols: 4, rows: 1, shape: 'pad' },
    // KEYBOARD (item 23), then RECORD, PLAY, STOP (items 20-22).
    button(19.9, 105.8, 11.5, 11.5),
    { kind: 'grid', x: 38, y: 100.1, w: 59.8, h: 11.5, cols: 3, rows: 1, shape: 'pad' },
    // YES and NO stacked (items 6, 7), then the arrow cluster (item 11) — one key above three.
    { kind: 'grid', x: 112.2, y: 92.2, w: 11.2, h: 27.3, cols: 1, rows: 2, shape: 'pad' },
    button(149.8, 97.8, 11.2, 11.2),
    { kind: 'grid', x: 128.2, y: 108.3, w: 43.1, h: 11.2, cols: 3, rows: 1, shape: 'pad' },
    // The <PATTERN PAGE> LEDs (item 10), and [PAGE] under them (item 12).
    { kind: 'grid', x: 183.3, y: 93.5, w: 23.2, h: 11, cols: 4, rows: 2, shape: 'pad' },
    button(194.8, 113.9, 17.6, 11.2, 'PAGE'),
    // TRK, PTN, SONG down the left edge (items 17-19).
    { kind: 'grid', x: 11.1, y: 118.2, w: 17.6, h: 45.4, cols: 1, rows: 3, shape: 'pad' },
    // ARPEGGIATOR and NOTE EDIT, with [+]/[-] beside them (items 13-15).
    { kind: 'grid', x: 171.5, y: 129.6, w: 31.9, h: 33.9, cols: 2, rows: 2, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The sixteen [TRIG] keys — which are the track selectors, so they are the voice field.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: 37.9, y: 126.5, w: 124.4, h: 40.1, label: 'TRACK' },
  ],
}

/** Exported so the test can assert the aspect check rather than restate it. */
export const DIGITONE_II_PANEL_SPAN_MM = W
