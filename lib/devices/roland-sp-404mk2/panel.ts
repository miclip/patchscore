import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the SP-404MK2's top panel.
 *
 * ## The figure, and the measurement
 *
 * Printed p.6, "Panel descriptions", carries the whole unit in one top-down view. Rendered the
 * way `moog-dfam/panel.ts` says to render one —
 *
 * ```
 * pdftoppm -f 6 -l 6 -r 200 -png manuals/SP-404MK2_v4_reference_eng02_W.pdf /tmp/sp404_p6
 * ```
 *
 * — the drawing's non-white bounding box is **888 x 1371 px**, an aspect of **0.6477**. p.266
 * gives `External dimensions 178 (W) x 276 (D) x 71 (H) mm`, so `178 / 276 = 0.6449`. Those agree
 * to 0.4%, which is what establishes that the view is orthographic rather than the tilted product
 * render it resembles at a glance, *and* picks the 178 x 276 pair out of the specification line
 * while rejecting the 71 mm the box stands off the desk.
 *
 * Scale is therefore **4.9888 px/mm across and 4.9674 px/mm down**, each axis fitted to its own
 * bound. Every coordinate below is a connected-component bounding box or centroid out of that
 * render, converted through those two numbers. Our own geometry and line weights; nothing traced,
 * extracted or embedded, and no vendor artwork ships.
 *
 * ## Two places the figure fights back, and what was done about each
 *
 * **The five orange section rectangles and five numbered badges are drawn over the unit.** They
 * are the page's annotation, not the panel, and they occlude three lower edges: the display well
 * and both effect-button clusters run under the "Control section (1)" rectangle, whose top line
 * sits at 110.2 mm. Where a boundary is under an overlay it is **derived from this same figure
 * rather than measured**, and only where the derivation is forced: the display well's *width* is
 * measured at 62.3 mm and the well is a circle, so its height is its width. The OLED's height is
 * authored at the overlay's own edge, which makes it a measured lower bound — the real screen is
 * a millimetre or two deeper. The badges also sit on [REC], on [LOOP] and on one pad label; none
 * of those three measurements moved, because a bright badge punches a hole in a dark button
 * without touching its bounding box.
 *
 * **The knob caps sit in a recess whose shading reaches the same luminance as the caps**, so no
 * global threshold separates the two on this figure — the gap between two knobs dips to 24 while
 * the cap interior sits at 26-51. Their x is therefore taken from two independent signals that
 * *are* unbiased, and which agree to 0.1 mm: the white pointer stroke on each cap (33.78, 70.46,
 * 107.14) and the centre of the silkscreen label above it (70.36, 107.24, 143.82). The four come
 * out on a 36.7 mm pitch with a mean of 88.8 mm against a panel centreline of 89.0. Their
 * diameter is the widest row of the cap silhouette, 19.4 mm.
 *
 * A dark-component bounding box gives a *different* answer for those four — about 1.6 mm to the
 * right, every time — because the cap is lit from the upper left and its shaded side thresholds
 * wider. That is the failure mode worth naming: the method that works everywhere else on this
 * panel is biased on the one shape that is rendered as a solid, and the check that caught it was
 * the panel's own symmetry.
 *
 * Everything else was measured twice, at two resolutions, and agrees. The button rows come out
 * within 0.5 mm of the lower-resolution copy of this figure that pp.7-11 crop, and the pad grid
 * within 0.3 mm.
 *
 * **The rear panel is deliberately absent.** p.14 documents MIDI IN/OUT, USB, LINE IN and LINE
 * OUT, and this figure does not show them — they are on the back face, out of a top view. The
 * Digitakt II draws its connector strip because *its* figure draws it; drawing one here would be
 * inventing a row of sockets at a place on the panel nobody measured.
 *
 * ## The voice field
 *
 * Pads [1]-[16] (p.11), 104.2 x 90.3 mm — the 4 x 4 block only, not the fifth column. That column
 * is BUS FX, HOLD, EXT SOURCE and SUB PAD, which are buttons rather than sample slots, so it is
 * drawn as an ordinary grid beside the field. Sixteen cells over that block are 26.1 x 22.6 mm,
 * an aspect of 1.15 — a slightly wide rectangle, which is what an SP-404 pad is.
 */

/** Panel size in mm, cited p.266 — W 178 x D 276 in playing orientation. This box is portrait. */
const W = 178
const H = 276

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** A button measured as a bounding box, which is how the render gives them up. */
function button(x: number, y: number, w: number, h: number, label?: string): PanelFeature {
  return { kind: 'button', x, y, w, h, ...(label === undefined ? {} : { label }) }
}

export const SP_404MK2_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'SP-404MK2 Reference Manual v4.00, p.6 (Panel descriptions)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Edit section. Four caps on a 36.7 mm pitch, 19.4 mm across, in a recessed strip.
    // -----------------------------------------------------------------------
    knob(33.8, 33.5, 19.4, 'VOLUME'),
    knob(70.4, 33.5, 19.4, 'CTRL 1'),
    knob(107.2, 33.5, 19.4, 'CTRL 2'),
    knob(143.8, 33.5, 19.4, 'CTRL 3'),

    // -----------------------------------------------------------------------
    // Control section 1: the round display well, and the six effect buttons flanking it.
    // The well's 62.3 mm width is measured; its height is that width, because it is a circle
    // and its lower edge is under the page's own section rectangle.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 59.7, y: 54.2, w: 62.3, h: 62.3 },
    { kind: 'screen', x: 59.9, y: 70.1, w: 58.1, h: 40.1 },
    // FILTER+DRIVE, RESONATOR, DELAY down the left; ISOLATOR, DJFX LOOPER, MFX down the right.
    // The bodies are angled parallelograms, which `PanelFeature` has no way to say, so each side
    // is its measured cluster box with its three cells in it. The right three are genuinely the
    // wider pair — 24.5 mm against 19.0 — which is DJFX LOOPER needing two lines of silkscreen.
    { kind: 'grid', x: 26.7, y: 58.0, w: 19.0, h: 47.5, cols: 1, rows: 3, shape: 'pad', label: 'EFFECTS' },
    { kind: 'grid', x: 125.9, y: 56.6, w: 24.5, h: 48.9, cols: 1, rows: 3, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Control sections 2 and 3. Three rows of buttons and the [VALUE] knob.
    // -----------------------------------------------------------------------
    // PATTERN SELECT, PATTERN EDIT, RECORD SETTING.
    { kind: 'group', x: 22.1, y: 117.3, w: 51.6, h: 12.6, label: 'PATTERN SEQUENCER' },
    { kind: 'grid', x: 23.1, y: 118.8, w: 48.9, h: 9.7, cols: 3, rows: 1, shape: 'pad' },
    // SAMPLE EDIT: the two buttons every recipe below sends a reader to, plus MARK.
    button(81.8, 118.8, 14.0, 9.7, 'START/END'),
    button(99.6, 118.8, 14.2, 9.7, 'PITCH/SPEED'),
    button(117.7, 118.8, 14.0, 9.7, 'MARK'),
    knob(147.9, 122.6, 14.0, 'VALUE'),

    // DEL, REC, RESAMPLE.
    { kind: 'grid', x: 22.5, y: 134.7, w: 49.9, h: 9.5, cols: 3, rows: 1, shape: 'pad', label: 'SAMPLING' },
    // SAMPLE MODE — the playback-mode switches the recipes name.
    button(78.4, 134.7, 9.6, 9.5, 'BPM SYNC'),
    button(91.2, 134.7, 10.2, 9.5, 'GATE'),
    button(104.6, 134.7, 14.0, 9.5, 'LOOP'),
    button(122.9, 134.7, 14.0, 9.5, 'REVERSE'),
    button(140.7, 134.7, 14.4, 9.5, 'ROLL'),

    // EXIT, COPY, REMAIN; the five bank buttons, each toggling A-E with F-J; SHIFT.
    { kind: 'grid', x: 23.1, y: 150.4, w: 48.9, h: 9.9, cols: 3, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 78.4, y: 150.4, w: 63.3, h: 9.9, cols: 5, rows: 1, shape: 'pad', label: 'BANK' },
    button(144.7, 150.4, 10.4, 9.9, 'SHIFT'),

    // -----------------------------------------------------------------------
    // Pad section. Pads [1]-[16] are the voice field; the fifth column is buttons.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: 23.1, y: 166.1, w: 104.2, h: 90.3, label: 'PAD' },
    { kind: 'grid', x: 132.7, y: 166.1, w: 22.3, h: 90.3, cols: 1, rows: 4, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The front chamfer (p.13), drawn because the figure draws it — this is the edge a reader
    // reaches for headphones and for the mic/guitar input.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 0.6, y: 256.9, w: 176.8, h: 18.7, label: 'PHONES · GAIN · MIC/GUITAR · INPUT' },
  ],
}
