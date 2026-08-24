import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Metropolix front panel.
 *
 * Measured off the FRONT PANEL OVERVIEW figure on p.17 of the Metropolix Manual v1.6 — the one
 * full-panel drawing in the document — by scanning the rendered page for the panel's own outline
 * and taking every position as a fraction of it. Our own geometry and line weights; nothing
 * traced, extracted or embedded.
 *
 * **The rise is a measurement, and it has to be**, which is the unusual part of this panel. The
 * TECHNICAL SPECIFICATIONS page (p.204) gives `Width: 34 hp` and `Maximum Depth: 25 mm` and no
 * height at all. Depth is how far the module protrudes *behind* the panel — §2.3's own trap,
 * from the third direction — so 25 mm is not a panel dimension and taking it as one would draw a
 * module seven times too short. So the outline was measured instead: 1985 x 1484 px at 300 dpi,
 * an aspect of 1.3376, which against the cited 172.7 mm width gives **129 mm**.
 *
 * That number is corroborated but not sourced: 3U Eurorack is 128.5 mm by the standard, and the
 * measurement lands 0.6 mm from it, inside the width of the drawn outline. The manual is what is
 * cited, because the manual is what was read.
 *
 * **No voice field.** This box has no voices (§2.4) so there is nothing for the resolver to write
 * into, and a `kind: 'voices'` region here would be a lit rectangle that can never light. Every
 * other drawn panel in the library has one; this is the first that must not.
 *
 * **A screen, and this one is real.** Unlike the Cascadia and the CRAVE, Metropolix has an actual
 * display — the OLED at the centre of the panel, which the manual's HOME screens are drawn on.
 *
 * The panel reads as two columns rather than bands: everything on the left is controls and jacks,
 * and the right two thirds is the eight-stage sequencer laid out as three stacked banks — PITCH
 * sliders, PULSE COUNT switches, GATE TYPE switches — each eight across, which is the shape a
 * player navigates by.
 */

/** Panel size in mm: 34 HP cited (p.204), rise measured off the p.17 figure. */
const W = 172.7
const H = 129

/** The sequencer's three banks all start at this x and run to the right edge. */
const SEQ_X = 79
const SEQ_W = 89

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** A block of sockets. Drawn as pads because the vocabulary has no jack. */
function sockets(x: number, y: number, w: number, h: number, cols: number, rows: number): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols, rows, shape: 'pad' }
}

export const METROPOLIX_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Metropolix Manual v1.6, p.17 (FRONT PANEL OVERVIEW) — rise measured from the figure',
  },
  features: [
    // -----------------------------------------------------------------------
    // Left column — jacks, aux, the screen and the transport (p.17, callouts 4-7, 10, 11).
    // -----------------------------------------------------------------------

    // Outputs A, B, CLOCK OUT, then TRK 1 and TRK 2 PITCH and GATE (p.18). Two rows of buttons
    // with their jacks beneath, which is how the panel groups them.
    { kind: 'group', x: 3, y: 7, w: 72, h: 24, label: 'OUT' },
    sockets(5, 10, 44, 8, 3, 1),
    sockets(52, 10, 21, 8, 2, 1),
    sockets(52, 21, 21, 8, 2, 1),
    // CLOCK IN and RESET IN (p.19).
    sockets(5, 21, 30, 8, 2, 1),

    // X, Y and Z: three AUX inputs with an attenuverter and a jack each (p.19).
    { kind: 'group', x: 3, y: 33, w: 43, h: 40, label: 'AUX' },
    knob(11, 39, 7, 'X'),
    knob(24, 39, 7, 'Y'),
    knob(37, 39, 7, 'Z'),
    { kind: 'grid', x: 5, y: 46, w: 39, h: 12, cols: 3, rows: 1, shape: 'fader' },
    sockets(5, 61, 39, 9, 3, 1),

    // The OLED and its encoder, and the three track-select buttons under them.
    { kind: 'group', x: 48, y: 33, w: 27, h: 52, label: 'MOD' },
    { kind: 'screen', x: 50, y: 36, w: 23, h: 15 },
    knob(61, 60, 12),
    knob(72, 60, 5, 'EXIT'),
    { kind: 'grid', x: 50, y: 74, w: 23, h: 7, cols: 3, rows: 1, shape: 'pad' },

    // CTRL 1 and CTRL 2, the two assignable performance knobs (callout 10).
    knob(15, 82, 12, 'CTRL 1'),
    knob(35, 82, 12, 'CTRL 2'),

    // Transport: RUN, loop and RESET; then SETUP, BPM and SCALE (callouts 5, 6).
    { kind: 'grid', x: 5, y: 94, w: 27, h: 7, cols: 3, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 34, y: 94, w: 27, h: 7, cols: 3, rows: 1, shape: 'pad' },
    // Track-based buttons: ORDER, LEN, DIV, SWING, SLIDE, GATE (callout 7).
    { kind: 'group', x: 3, y: 103, w: 58, h: 12, label: 'TRACK' },
    { kind: 'grid', x: 5, y: 105, w: 54, h: 7, cols: 6, rows: 1, shape: 'pad' },
    // ALT and EDIT, which put the stage row into its second and third layers (callout 9).
    { kind: 'grid', x: 63, y: 94, w: 8, h: 18, cols: 1, rows: 2, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Right — the eight-stage sequencer, three banks deep (callouts 1-3).
    // -----------------------------------------------------------------------
    { kind: 'group', x: SEQ_X - 2, y: 7, w: SEQ_W + 4, h: 36, label: 'PITCH' },
    { kind: 'grid', x: SEQ_X, y: 9, w: SEQ_W, h: 31, cols: 8, rows: 1, shape: 'fader' },

    { kind: 'group', x: SEQ_X - 2, y: 47, w: SEQ_W + 4, h: 38, label: 'PULSE COUNT' },
    { kind: 'grid', x: SEQ_X, y: 49, w: SEQ_W, h: 33, cols: 8, rows: 1, shape: 'fader' },

    { kind: 'group', x: SEQ_X - 2, y: 87, w: SEQ_W + 4, h: 15, label: 'GATE TYPE' },
    { kind: 'grid', x: SEQ_X, y: 89, w: SEQ_W, h: 11, cols: 8, rows: 1, shape: 'fader' },

    // The eight stage-based buttons, which are what `features.perStep` names: SLIDE, SKIP,
    // PITCH, GATE, RATCH, PROB, ACCUM, CV (callout 8; described on p.32).
    { kind: 'group', x: SEQ_X - 2, y: 104, w: SEQ_W + 4, h: 12, label: 'STAGE' },
    { kind: 'grid', x: SEQ_X, y: 106, w: SEQ_W, h: 8, cols: 8, rows: 1, shape: 'pad' },
  ],
}
