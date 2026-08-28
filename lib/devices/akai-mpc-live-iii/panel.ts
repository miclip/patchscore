import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Akai MPC Live III's top panel.
 *
 * Read off the plan-view line drawing on printed p.369 — an orthographic top-down figure of the
 * whole machine, the only complete one in the document, and not a perspective illustration. Our
 * own geometry and line weights; nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** The page was rendered at 200 dpi, the
 * panel's outer border located at 1441 x 850 px (x 105..1546, y 506..1356), and control positions
 * taken as the bounding boxes of the drawing's own connected components — which is why the
 * sixteen pads come out at one cell size to a tenth of a millimetre and the four Q-Link knobs at
 * one diameter.
 *
 * ## The aspect check, and the second one the display gave for free
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. Printed p.530 gives `Dimensions (width x depth x height) — 17.16" x 10.08" x 2.64" /
 * 436 x 256 x 67 mm`, with the axis order stated in the row header rather than left to inference.
 * The measured panel box is 1441 / 850 = **1.695**, against
 *
 *     436 / 256 = 1.703     <- 0.5% out, and the only candidate that is close
 *     436 /  67 = 6.507     <- four times out
 *
 * So the face a player looks at is 436 x 256 mm and 67 mm is how far the box stands off the desk.
 * This is the `PanelLayout` trap named in the schema, met from the usual side: the figure the
 * manufacturer calls *depth* is the vertical span of the panel as played.
 *
 * **The display then checks the scale independently.** p.530 gives the screen's active area as
 * `5.9" x 3.7" / 150 x 93 mm`, which nothing in the aspect calculation used. Measured off the
 * drawing at the scale above, the inner bezel rectangle comes out **152.8 x 95.5 mm** — 1.9% and
 * 2.7% over, which is one bezel line width on each edge. A dimension row and a display row,
 * printed for different reasons, agreeing to within the ink: that agreement is worth more than
 * either reading alone. The **specification's** 150 x 93 is what is drawn, centred on the
 * measured centre (300.0, 103.2).
 *
 * ## The voice field is the screen, not the pads
 *
 * §2.3 asks for the region where this box's own voice selection lives, and on an MPC that is two
 * places at once: the sixteen pads pick a pad, and the Track section on the display picks a
 * track. This manifest has a pool of each (see `index.ts`), so no single hardware cluster covers
 * both — and `PanelFeature` allows exactly one voice field.
 *
 * The screen is the honest home, and the schema names this case outright: *"Draw the voice field
 * on top of one to show a box whose screen lists its tracks."* Everything in this manifest is
 * selected there — p.45 changes a track's type from the Track Section, p.47 assigns samples to
 * pads through **Sample Assign** on the same display — whereas the pad grid shows a bank of
 * sixteen and says nothing about the other pool. Putting the field on the pads would draw
 * thirty-two cells over a control that addresses sixteen.
 *
 * That leaves the 4 x 4 pad grid free to be drawn as what it is, which matters: it is the single
 * most recognisable thing on the machine, and a reader finding their place on this panel finds it
 * there first.
 *
 * **The field takes essentially the whole display**, because three banks of sixteen need it: the
 * rack packs every bank on a panel at one column count, so the region has to be deep enough for
 * three rows of them and wide enough that the cells still read as cells rather than slabs.
 *
 * ## What is drawn, and what is deliberately not
 *
 * **The four Q-Link knobs are four knobs, not a grid.** Measured centre pitches down the column
 * are 32.1, 29.5 and 32.0 mm — the drawing groups them as two pairs, and a `grid` would impose an
 * even pitch the panel does not have.
 *
 * **The touch strip is `shape: 'fader'`.** It is one continuous linear control 19.4 x 129.8 mm
 * down the left edge (p.371 item 17), so it is drawn the way the Metropolix draws its step
 * sliders rather than as a button that happens to be tall.
 *
 * **The four Q-Link bank LEDs are not drawn**, on the DFAM's rule: `grid` says "a block of
 * identical *controls*", and an indicator is not one. Same for the charging indicator.
 *
 * **The three button rows below the display are drawn as grids at their measured extents**, not
 * as individual buttons. The row of sixteen along the top edge is a genuine even pitch and is one
 * grid; the second row is three grids because the drawing breaks it into three groups with wider
 * gaps at the boundaries — four transport-ish buttons, the four Pad Bank buttons, then eight.
 * Measuring the gaps is what shows the grouping; an even sixteen would have been wrong.
 *
 * **The front bar is drawn**, because the figure draws it and because it is a third of the depth
 * of the box: a `group` across y 216.2..254.4 carrying the speakers, with the microphone bump the
 * drawing puts at its centre marked as silkscreen. Neither is a control, so neither is drawn as
 * one.
 *
 * **Nothing is drawn for the rear panel.** Unlike the Digitakt II's figure, p.369 does not fold
 * the sockets into the top view; they have their own plan view on p.376 and are declared as jacks
 * instead.
 */

/** Panel size in mm, cited p.530 — 436 wide x 256 deep in playing orientation. */
const W = 436
const H = 256

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

export const MPC_LIVE_III_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source: 'MPC Live III / MPC XL User Guide v3.7, p.369 (Hardware Features > MPC Live III > Top Panel)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Top edge — SET, the sixteen Step Buttons, and PREV / NEXT (p.373).
    // -----------------------------------------------------------------------
    { kind: 'button', x: 40.4, y: 13.9, w: 10.5, h: 6.3, label: 'SET' },
    { kind: 'grid', x: 59.6, y: 13.9, w: 324.7, h: 6.3, cols: 16, rows: 1, shape: 'pad', label: 'STEP' },
    { kind: 'grid', x: 394.9, y: 12.3, w: 30.5, h: 9.3, cols: 2, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Main volume, top-left (p.375 item 47) — the box's one level knob.
    // -----------------------------------------------------------------------
    knob(21.2, 27.6, 21.2, 'MAIN VOLUME'),

    // -----------------------------------------------------------------------
    // Second row, in the three groups the drawing spaces it into (pp.370-372):
    // NOTE REPEAT / FULL LEVEL / 16 LEVEL / ERASE, then Pad Banks A-D, then eight.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 56.3, y: 27.1, w: 79.3, h: 11.1, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 140.4, y: 27.1, w: 79.3, h: 11.1, cols: 4, rows: 1, shape: 'pad', label: 'PAD BANK' },
    { kind: 'grid', x: 224.2, y: 27.1, w: 163.4, h: 11.1, cols: 8, rows: 1, shape: 'pad' },
    { kind: 'button', x: 402.7, y: 28.0, w: 13.0, h: 9.3, label: 'Q-LINK' },

    // -----------------------------------------------------------------------
    // Left edge — the touch strip and its CONFIG button (p.371 items 17, 18).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 11.5, y: 54.5, w: 19.4, h: 129.8, cols: 1, rows: 1, shape: 'fader', label: 'TOUCH STRIP' },
    { kind: 'button', x: 12.1, y: 195.8, w: 17.2, h: 9.9, label: 'CONFIG' },

    // -----------------------------------------------------------------------
    // The 4 x 4 pad grid (p.370 item 6). Sixteen pads, one bank of the eight.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 56.3, y: 47.9, w: 146.1, h: 145.4, cols: 4, rows: 4, shape: 'pad', label: 'PADS' },

    // -----------------------------------------------------------------------
    // The display, at the specification's active area on the measured centre, with the voice
    // field inside it — see the note above on why the field is here and not on the pads.
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 225.0, y: 56.7, w: 150.0, h: 93.0 },
    { kind: 'voices', x: 226.0, y: 57.2, w: 148.0, h: 92.0, label: 'TRACK / PAD' },

    // -----------------------------------------------------------------------
    // Four Q-Link knobs down the right edge, at their measured centres (p.371 item 15).
    // -----------------------------------------------------------------------
    knob(410.0, 60.5, 21.2, 'Q-LINK 1'),
    knob(410.0, 92.6, 21.2, 'Q-LINK 2'),
    knob(410.0, 122.1, 21.2, 'Q-LINK 3'),
    knob(410.0, 154.1, 21.2, 'Q-LINK 4'),

    // -----------------------------------------------------------------------
    // Mode row under the display: MENU, MAIN, SHIFT, SOUNDS, EDIT, ARRANGE, MIXER (p.372).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 216.3, y: 165.9, w: 150.5, h: 11.1, cols: 7, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Transport, two rows (p.374), with the -/+ pair and the Data Dial to their right.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 218.2, y: 182.5, w: 166.6, h: 9.0, cols: 7, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 218.2, y: 195.5, w: 166.6, h: 9.5, cols: 7, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 372.0, y: 181.3, w: 13.6, h: 19.7, cols: 1, rows: 2, shape: 'pad' },
    knob(409.8, 192.6, 39.8, 'DATA'),

    // -----------------------------------------------------------------------
    // Silkscreen and the front bar (p.375 items 45, 46). Neither is a control.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 110.0, y: 203.0, text: 'MPC LIVE III', align: 'middle' },
    { kind: 'group', x: 6.1, y: 216.2, w: 423.0, h: 38.2, label: 'SPEAKERS' },
    { kind: 'label', x: 217.7, y: 226.0, text: 'MIC', align: 'middle' },
  ],
}
