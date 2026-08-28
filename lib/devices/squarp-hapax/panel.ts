import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Hapax control surface.
 *
 * ## The only full-panel figure in either document is drawn in axonometric
 *
 * Every other panel in this library was read off a plan view. There is none here: the 159-page
 * manual is a print of the online manual and its figures are OLED screenshots, pad-grid
 * schematics and two rear-panel strips. The Quickstart's INTERFACE OVERVIEW (p.16) is the one
 * drawing of the whole surface, and it is drawn at an angle, with the box's thickness extruded
 * below it.
 *
 * That is workable, and the reason is worth stating because it is what makes these coordinates a
 * measurement rather than a sketch: **a parallel projection maps a flat panel by an affine
 * transform**, so a rectangle stays a parallelogram, a regular grid stays a regular grid, and any
 * point can be carried back exactly once the mapping is pinned. The figure was checked to be
 * parallel rather than perspective before anything was read off it — the drawn area of a pad
 * varies by 2% between the near and far ends of the surface, and a homography fits the pad grid
 * no better than an affine map does.
 *
 * ## How the mapping was pinned, at 300 dpi
 *
 *  1. **The two panel axes**, from a Hough transform over the long white lines of the drawing:
 *     111.0 deg and 63.25 deg. Both edges of the outline are drawn twice (top face and bottom
 *     face) and both pairs agree.
 *  2. **One corner exactly.** The leftmost pixel of the outline is the panel's own left corner,
 *     at (635, 1999). The top corner is the topmost pixel; the bottom-most pixel belongs to the
 *     extruded bottom face and is corrected by the thickness edge before use.
 *  3. **The two spans**, 1623.6 px along the long axis and 899.7 px along the short one, divided
 *     into the published 358 x 206 mm (`index.ts` records where that figure comes from and why it
 *     carries no citation).
 *
 * **The mapping checks itself twice, and neither check was used to build it.** Carried through
 * it, the 128 matrix pads land on a comb of exactly 16 columns at a 16.5 mm pitch and 8 rows at a
 * 15.6 mm pitch — a very nearly square pad, from two spans measured independently along two axes
 * foreshortened by different amounts. And the row of buttons above the matrix lands on the same
 * comb extended: 20 columns, being the matrix's 16 plus the clic column on the left and the three
 * on the right, all at the same pitch. A frame that was wrong in either span would have produced
 * pads of the wrong shape and a button row that did not line up with anything.
 *
 * ## What is measured here and what is not
 *
 * Measured: the two screens, the nine encoders, the 128-pad matrix, the clic column on the left,
 * the three clic columns on the right, and the button row between the screens and the matrix.
 * Every number below is a component bounding box or centroid carried through the mapping above.
 *
 * **Not measured, and stated rather than implied**: the internal arrangement of the right-hand
 * clic block. Those three columns hold the eight row selectors, ALL, the arrow keys, zoom and the
 * mode switches, at several sizes and with two positions split into pairs of half-width keys.
 * They are drawn as a plain 3 x 8 grid on the measured footprint. The drawing's knobs are 3D
 * cylinders about 28 mm across, which is the illustration exaggerating a desktop encoder; they
 * are drawn at 16 mm on their measured centres.
 *
 * **No voice field.** This box has no voices (§2.4), so there is nothing for the resolver to
 * write into and a `kind: 'voices'` region would be a lit rectangle that can never light. The
 * Metropolix is the other panel in the library that must not have one, and for the same reason.
 *
 * Reference, never asset (§10): the figure was decoded by rendering it and finding the panel
 * outline, the pad outlines and the knob bodies by their own pixel runs. Our own geometry and
 * line weights; nothing traced, extracted or embedded.
 */

/**
 * Panel rise in mm — the 206 mm depth, which is the vertical span of the surface as played. The
 * horizontal span is `physical.panelSpanMm`; `index.ts` records where both figures come from and
 * why neither carries a page.
 */
const H = 206

/** Pad width, measured off the matrix components; the pads are 14.2 mm tall. */
const PAD_W = 14.6

/** The matrix block: 16 columns of 16.5 mm from x 30.8, 8 rows of 15.6 mm from y 83.2. */
const MATRIX_X = 23.5
const MATRIX_Y = 76.1
const MATRIX_W = 261.9
const MATRIX_H = 123.7

/** The button row above the matrix, measured at y 65.4 to 74.1 on the same 16.5 mm comb. */
const ROW_Y = 65.4
const ROW_H = 8.7

/** The three clic columns on the right, x 290.6 to 342.5. */
const RIGHT_X = 290.6
const RIGHT_W = 51.9

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/** Encoder bodies are drawn far larger than a desktop encoder is; 16 mm is the drawn size. */
const ENC_D = 16

export const HAPAX_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source:
      'Hapax Quickstart HQ-2-0 (December 2023), p.16 (INTERFACE OVERVIEW) — measured off the axonometric figure',
  },
  features: [
    // -----------------------------------------------------------------------
    // Top strip — two screens, eight parameter encoders, one menu encoder.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 1, y: 8, w: 356, h: 54, label: 'SCREENS' },

    // Encoders 1-4, a 2 x 2 to the left of the left screen.
    knob(11.2, 13.7, ENC_D, '1'),
    knob(41.9, 16.2, ENC_D, '2'),
    knob(13.7, 42.1, ENC_D, '3'),
    knob(39.1, 41.4, ENC_D, '4'),

    // The left screen: step and track parameters (p.47).
    { kind: 'screen', x: 74.4, y: 25.4, w: 67.3, h: 33.9 },

    // Encoders 5-8, the second 2 x 2, between the two screens.
    knob(158.4, 15.0, ENC_D, '5'),
    knob(187.1, 14.1, ENC_D, '6'),
    knob(157.0, 39.1, ENC_D, '7'),
    knob(188.4, 43.6, ENC_D, '8'),

    // The right screen: the mode's main display.
    { kind: 'screen', x: 236.8, y: 25.2, w: 67.3, h: 33.9 },

    // The menu encoder, outboard of the right screen at the panel's right corner.
    knob(320.0, 30.5, ENC_D, 'MENU'),

    // -----------------------------------------------------------------------
    // The button row, on the same 16.5 mm comb as everything below it.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 2.1, y: ROW_Y, w: PAD_W, h: ROW_H, cols: 1, rows: 1, shape: 'pad' },
    {
      kind: 'grid',
      x: MATRIX_X,
      y: ROW_Y,
      w: MATRIX_W,
      h: ROW_H,
      cols: 16,
      rows: 1,
      shape: 'pad',
    },
    { kind: 'grid', x: RIGHT_X, y: ROW_Y, w: RIGHT_W, h: ROW_H, cols: 3, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The playing surface: 128 matrix pads, flanked by clic pads on both sides.
    // -----------------------------------------------------------------------

    // The left clic column: mute, algo, copy/paste/delete, rec and the rest (p.16 callouts).
    {
      kind: 'grid',
      x: 2.0,
      y: MATRIX_Y,
      w: PAD_W,
      h: MATRIX_H,
      cols: 1,
      rows: 8,
      shape: 'pad',
    },

    // The 128-pad matrix itself — live keyboard, step grid, automation and pattern launch.
    { kind: 'group', x: MATRIX_X - 2, y: MATRIX_Y - 2, w: MATRIX_W + 4, h: MATRIX_H + 4, label: 'MATRIX' },
    {
      kind: 'grid',
      x: MATRIX_X,
      y: MATRIX_Y,
      w: MATRIX_W,
      h: MATRIX_H,
      cols: 16,
      rows: 8,
      shape: 'pad',
    },

    // The right clic block: eight row selectors, ALL, the arrows and the mode switches. Drawn as
    // a plain grid on its measured footprint — see the header for what that simplifies.
    {
      kind: 'grid',
      x: RIGHT_X,
      y: MATRIX_Y,
      w: RIGHT_W,
      h: MATRIX_H,
      cols: 3,
      rows: 8,
      shape: 'pad',
    },
  ],
}
