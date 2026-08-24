import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Digitakt II's top panel.
 *
 * Read off the FRONT PANEL figure on p.12 — the one full-panel drawing in the manual — and laid
 * out as fractions of its own outline, multiplied into the panel's millimetres. Our own geometry
 * and line weights; nothing traced, extracted or embedded.
 *
 * The drawn panel measures about 1.20 : 1 against the specification's `215 / 176 = 1.2216`
 * (p.91), a two percent difference explained by the figure drawing the rear connector strip along
 * the top edge as part of the same face. The specification is what is authored.
 *
 * **The voice field is the sixteen [TRIG] keys, and that is not a compromise.** §2.3 asks for the
 * region where the box's own voice selection lives, and on this panel that is literally the same
 * control: the [TRIG] keys select the active track *and* place trigs, and p.25 says the sixteen
 * "have radio button functionality… Only one track can be selected at a time". So the voice field
 * sits exactly on them rather than beside them, and no separate grid is drawn underneath — a
 * second block there would draw the same sixteen buttons twice.
 *
 * Sixteen cells over 170 x 41 mm come out around 1.05 : 1, which is what a square backlit button
 * should look like and comfortably inside §10's aspect ceiling.
 *
 * The connector strip along the top is the *rear* panel seen from above (p.14): headphones, main
 * and input jacks, three MIDI DIN sockets, USB and power. It is drawn because the figure draws
 * it, and because a reader looking for the MIDI sockets finds them at that edge.
 */

/** Panel size in mm, cited p.91 — W 215 x D 176 in playing orientation. */
const W = 215
const H = 176

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

export const DIGITAKT_II_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'Digitakt II User Manual OS 1.15A, p.12 (3.1 FRONT PANEL)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The rear connector strip, drawn along the top edge as the figure draws it (p.14).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 8, y: 4, w: 199, h: 7, cols: 11, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Left column — the two absolute controls (p.12 items 1 and 22).
    // -----------------------------------------------------------------------
    knob(18.5, 33.4, 11, 'MAIN VOLUME'),
    knob(18.5, 58, 11, 'LEVEL/DATA'),

    // -----------------------------------------------------------------------
    // The screen, and the eight DATA ENTRY knobs A-H beside it (item 8).
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 33, y: 23.5, w: 76, h: 49 },
    { kind: 'grid', x: 111, y: 25, w: 100, h: 49, cols: 4, rows: 2, shape: 'knob', label: 'DATA ENTRY' },

    // -----------------------------------------------------------------------
    // The six [PARAMETER] keys — TRIG, SRC, FLTR, AMP, FX, MOD — which are the six pages
    // every recipe below is written against (item 9; p.25 notes they too are radio buttons).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 111, y: 74, w: 100, h: 13, label: 'PARAMETER' },
    { kind: 'grid', x: 113, y: 76, w: 96, h: 9, cols: 6, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Menu, transport and navigation.
    // -----------------------------------------------------------------------
    knob(21, 89.5, 10, 'FUNC'),
    // PRESET/KIT, SETTINGS, SAMPLING, TEMPO (items 2-5).
    { kind: 'grid', x: 41, y: 85, w: 59, h: 11, cols: 4, rows: 1, shape: 'pad' },
    // RECORD, PLAY, STOP.
    { kind: 'grid', x: 49, y: 101, w: 52, h: 12, cols: 3, rows: 1, shape: 'pad' },
    // YES and NO (items 6, 7), then the arrow cluster and PAGE (items 10-12).
    { kind: 'grid', x: 113, y: 90, w: 12, h: 24, cols: 1, rows: 2, shape: 'pad' },
    { kind: 'grid', x: 130, y: 92, w: 52, h: 20, cols: 3, rows: 2, shape: 'pad' },
    knob(198, 113, 11, 'PAGE'),
    // KEYBOARD, TRK, PTN, SONG down the left edge (items 14-19).
    { kind: 'grid', x: 13, y: 100, w: 18, h: 65, cols: 1, rows: 4, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The sixteen [TRIG] keys — which are the track selectors, so they are the voice field.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: 39, y: 127, w: 170, h: 41, label: 'TRACK' },
  ],
}
