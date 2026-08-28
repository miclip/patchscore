import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Akai MPC XL's top panel.
 *
 * Read off the plan-view line drawing on printed p.377, the first and fullest of the eight copies
 * of that figure in `Hardware Features > MPC XL` (pp.377-385 repeat it under different callout
 * sets). Our own geometry and line weights; nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** The page was rendered at 200 dpi and
 * control positions taken as the bounding boxes of the drawing's own connected components. The
 * one exception is named at the end.
 *
 * ## Where the origin is, and why it is not the chassis
 *
 * The figure draws the display raised on its hinge, standing behind the chassis, so there are two
 * candidate rectangles and they give different answers:
 *
 *     chassis alone           x 135..1526, y  530..1611   1391 x 1081 px   aspect 1.287
 *     chassis + display       x 135..1526, y  376..1611   1391 x 1235 px   aspect 1.126
 *     p.533, display flat     543 x 488 mm                                 aspect 1.113
 *
 * The second is the one p.533 is measuring. Its row is headed `Dimensions (display flat)`, and
 * with the display folded down the box is as deep as the drawing including the display: 1235 px
 * against 543 mm of width comes to **482.1 mm, 1.2% under the printed 488**, which is a line
 * width at this scale. The chassis alone is 422 mm and 13.5% short, which is what the display
 * assembly adds when it lies flat.
 *
 * So `y = 0` is the top of the display housing, not the back edge of the chassis, and the chassis
 * itself starts at y = 60.5 mm. The 5.9 mm the drawing leaves over is left at the front, where
 * the chassis carries nothing.
 *
 * ## The drawing is orthographic, and two independent checks say so
 *
 * A raised display could mean a perspective figure, in which case the depth axis would be
 * foreshortened and the two axes would need separate scales. It is not, and neither does:
 *
 *  - **The pads are square to one pixel.** All sixteen measure 80 x 80 px (four of them 81 x 80),
 *    on a 94 px pitch in both directions. Under any anisotropic scale they would come out
 *    rectangular.
 *  - **The display's active area lands on the specification.** Measured 557 x 348 px, which at
 *    543 / 1391 mm per px is **217.4 x 135.8 mm** with a 256.3 mm diagonal. p.532 prints
 *    `(1) 1280x800 ... 10.1" / 256.5 mm (diagonal)`, and a 1280 x 800 panel of that diagonal is
 *    217.5 x 135.9 mm. Nothing in the scale used the display, so the agreement is worth having:
 *    two readings, 0.1 mm apart.
 *
 * Both would be destroyed by scaling the axes independently to fill 488 mm: the pads would become
 * 31.2 x 36.1 mm and the display 217.4 x 154.9 mm, contradicting p.532 by 14%. One scale is used
 * for both axes, 543 / 1391 = 0.39037 mm per px, and the 1.2% residual is recorded above rather
 * than absorbed.
 *
 * ## The Q-Link strip is the thing this panel exists to show
 *
 * Sixteen columns across the full width, each a display over a knob over a button, on an 84 px
 * (32.8 mm) pitch that is even to a pixel across all three rows. p.532 counts `(17) 360°
 * touch-sensitive Q-Link Knobs` and `(17) monochrome 128 x 32 OLED displays`; sixteen are here
 * and the seventeenth of each is the Channel Control knob in the mixer block with its own strip
 * below it (p.384 item 62: *"shown in the display strip below the Channel Control"*). Both are
 * drawn.
 *
 * The sixteen displays are sixteen `screen` features rather than one wide one or a `grid`. They
 * are separate 128 x 32 panels with gaps between them, and `grid` says *a block of identical
 * controls*, which a display is not — the DFAM's rule about indicators, met from the other side.
 * The knobs and the buttons under them are grids, because their pitch is even and they are
 * controls.
 *
 * ## The voice field is the screen, for the sibling's reason
 *
 * `lib/devices/akai-mpc-live-iii/panel.ts` sets out the argument and none of it turns on which
 * chassis the software runs in: this manifest has three pools, no single hardware cluster selects
 * all three, and the display is where a track's type is set and where Sample Assign puts a sample
 * on a pad. Putting the field on the pad grid would draw forty-eight cells over a control that
 * addresses sixteen, and would cost the 4 x 4 grid its shape, which is the thing a reader finds
 * their place by.
 *
 * ## What is drawn at cluster level, and the one estimate
 *
 * The mixer block (p.384 items 58-68) and the I/O block (pp.384-385 items 69-80) are drawn as
 * their group boundary, their knobs, and their buttons in blocks. The callout badges the figure
 * prints sit on top of those two clusters more densely than anywhere else on the page, so their
 * button outlines do not survive component analysis; those boxes were read off the drawing at
 * 500 dpi by eye and are the estimate this file admits to. Everything outside them — the Q-Link
 * strip, the pads, the touch strip, the display, the two block boundaries, the knob centres, the
 * pad bank and mode matrices, the keypad, the transport — is component-measured.
 *
 * **The level meters are not drawn.** Three columns of them sit in the I/O block and one in the
 * mixer block, and an indicator is not a control (the DFAM's rule, as the sibling applies it to
 * the Q-Link bank LEDs). The same goes for the touch strip's own LED column and the time-division
 * scale silkscreened beside it.
 *
 * **Nothing is drawn for the rear or front panels.** They have their own figures on pp.386-387
 * and are declared as jacks in `index.ts`.
 */

/** Panel size in mm. 543 is cited p.533; the rise is the same row's depth, display flat. */
const W = 543
const H = 488

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

/**
 * The sixteen Q-Link displays, on the measured pitch. First centre 26.0 mm, pitch 32.79 mm, each
 * 23.8 x 7.0 mm — the same three numbers the knob and button grids below are built from.
 */
const QLINK_DISPLAYS: PanelFeature[] = Array.from({ length: 16 }, (_, i) => ({
  kind: 'screen',
  x: 26.0 + i * 32.79 - 23.8 / 2,
  y: 196.0,
  w: 23.8,
  h: 7.0,
}))

export const MPC_XL_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'MPC Live III / MPC XL User Guide v3.7, p.377 (Hardware Features > MPC XL > Top Panel)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The display assembly across the back, in the flat position p.533 measures. The active area
    // is the measured rectangle; the housing around it is the hinged case (p.377 item 1).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 147.6, y: 0.0, w: 247.9, h: 180.0, label: 'DISPLAY' },
    { kind: 'screen', x: 162.8, y: 16.0, w: 217.4, h: 135.8 },
    { kind: 'voices', x: 163.8, y: 17.0, w: 215.4, h: 133.8, label: 'TRACK / PAD' },

    // -----------------------------------------------------------------------
    // Mixer block, back left (p.384 items 58-68). Channel Control is the seventeenth Q-Link and
    // the strip under it the seventeenth display.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 1.2, y: 60.5, w: 144.4, h: 126.1, label: 'MIXER' },
    { kind: 'label', x: 16.0, y: 80.0, text: 'MPC XL', align: 'start' },
    { kind: 'grid', x: 17.2, y: 107.0, w: 42.2, h: 42.9, cols: 2, rows: 3, shape: 'pad' },
    knob(86.7, 112.8, 17.6, 'CHANNEL'),
    { kind: 'screen', x: 74.2, y: 132.3, w: 25.0, h: 7.0 },
    { kind: 'grid', x: 66.0, y: 154.2, w: 40.6, h: 23.8, cols: 2, rows: 2, shape: 'pad' },
    { kind: 'button', x: 17.2, y: 167.1, w: 20.3, h: 12.5, label: 'Q-LINKS' },

    // -----------------------------------------------------------------------
    // I/O block, back right (pp.384-385 items 69-80): the two input gains, the 3/4 record gain
    // and main volume, then the monitor blend and the two meter buttons.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 397.8, y: 60.5, w: 144.0, h: 126.1, label: 'I/O' },
    knob(415.7, 86.3, 19.5, 'GAIN 1'),
    knob(449.3, 86.3, 19.5, 'GAIN 2'),
    knob(482.9, 86.3, 19.5, '3/4 REC'),
    knob(516.8, 86.3, 19.5, 'MAIN VOLUME'),
    knob(449.3, 153.0, 19.5, 'DIR / MAIN'),
    { kind: 'grid', x: 488.7, y: 167.5, w: 37.9, h: 6.2, cols: 2, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The Q-Link strip, full width: sixteen displays, sixteen knobs, sixteen buttons (p.379).
    // -----------------------------------------------------------------------
    ...QLINK_DISPLAYS,
    { kind: 'grid', x: 14.4, y: 217.0, w: 514.5, h: 23.4, cols: 16, rows: 1, shape: 'knob', label: 'Q-LINKS' },
    { kind: 'grid', x: 15.2, y: 245.9, w: 512.6, h: 7.0, cols: 16, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The touch strip down the left edge (p.379 item 18), one continuous linear control.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 18.7, y: 286.5, w: 20.7, h: 131.2, cols: 1, rows: 1, shape: 'fader', label: 'TOUCH STRIP' },

    // -----------------------------------------------------------------------
    // Mode and pad-bank matrix, four wide, in the six rows the drawing spaces it into
    // (pp.379-381). Row two is Pad Bank A-D / E-H; the column to its right is Full Level,
    // 16 Levels, Notes, Next Seq, Shift, Erase and Note Repeat.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 61.7, y: 288.5, w: 87.8, h: 11.7, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 61.7, y: 317.4, w: 87.8, h: 11.7, cols: 4, rows: 1, shape: 'pad', label: 'PAD BANK' },
    { kind: 'grid', x: 61.7, y: 333.0, w: 87.8, h: 11.7, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 61.7, y: 361.1, w: 87.8, h: 12.5, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 61.7, y: 391.1, w: 87.8, h: 10.5, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 61.7, y: 404.8, w: 87.8, h: 12.9, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 163.2, y: 289.7, w: 19.1, h: 53.9, cols: 1, rows: 4, shape: 'pad' },
    { kind: 'button', x: 163.2, y: 361.5, w: 19.1, h: 11.7, label: 'SHIFT' },
    { kind: 'grid', x: 163.2, y: 391.1, w: 19.1, h: 24.6, cols: 1, rows: 2, shape: 'pad' },

    // -----------------------------------------------------------------------
    // The 4 x 4 pad grid (p.378 item 8). Sixteen pads, one bank of the eight, 31.2 mm square on
    // a 36.7 mm pitch — the same pad the Live III has.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 200.6, y: 281.8, w: 142.1, h: 142.1, cols: 4, rows: 4, shape: 'pad', label: 'PADS' },

    // -----------------------------------------------------------------------
    // Mode column right of the pads: Menu, Main, Shift, Loop On, Arrange (pp.378-383).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 355.6, y: 317.4, w: 25.0, h: 26.2, cols: 1, rows: 2, shape: 'pad' },
    { kind: 'button', x: 355.6, y: 361.5, w: 25.0, h: 10.9, label: 'SHIFT' },
    { kind: 'grid', x: 355.6, y: 391.1, w: 25.0, h: 24.6, cols: 1, rows: 2, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Data entry, bottom right (p.377 items 2-5): dial, -/+, cursors, numeric keypad, with
    // Tap Tempo and the Copy / Read-Write / Undo row above them.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 359.1, y: 289.3, w: 21.1, h: 10.5, label: 'TAP' },
    { kind: 'grid', x: 394.7, y: 289.3, w: 63.2, h: 10.5, cols: 3, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 400.1, y: 308.0, w: 51.9, h: 44.9, cols: 3, rows: 4, shape: 'pad', label: 'KEYPAD' },
    { kind: 'grid', x: 394.7, y: 361.1, w: 63.6, h: 11.3, cols: 3, rows: 1, shape: 'pad' },
    knob(495.6, 300.4, 39.4, 'DATA'),
    { kind: 'button', x: 480.2, y: 326.7, w: 32.0, h: 6.6, label: '- / +' },
    { kind: 'button', x: 477.0, y: 341.6, w: 36.3, h: 33.2, label: 'CURSOR' },

    // -----------------------------------------------------------------------
    // Locate and transport, across the bottom right (pp.383-384 items 50-57).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 394.7, y: 391.1, w: 123.0, h: 9.8, cols: 5, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 394.7, y: 409.5, w: 123.0, h: 12.9, cols: 5, rows: 1, shape: 'pad', label: 'TRANSPORT' },
  ],
}
