import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Akai MPC One G2's top panel.
 *
 * Read off the plan-view line drawings the `MPC Standalone OS User Guide v3.9` prints of this
 * box — printed p.362 (`Hardware Features > MPC One G2 > Top Panel`) and printed p.464
 * (`Appendix > Ableton Control Maps > MPC One G2`), which are **the same orthographic figure at
 * two sizes**. Our own geometry and line weights; nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated**, as connected components of the
 * drawing's own ink. Both pages were rendered and both were needed, because the two figures
 * carry their callout bubbles in different places and each hides what the other shows:
 *
 *     p.362 @ 200 dpi   panel border 1246 x 1246 px (x 205..1451, y 345..1591)
 *     p.464 @ 400 dpi   panel border 1917 x 1913 px (x 704.5..2621.5, y 504.5..2417.5)
 *
 * p.362's callouts are grey and p.464's are solid black, but both are opaque: on p.362 the two
 * five-button rows under the display are covered end to end, and on p.464 the four Pad Bank
 * buttons are clipped left and right. Each control below is taken from whichever figure draws it
 * whole, and where both do they agree to within 0.2 mm — the pad block measures 114.8 x 114.6 mm
 * on p.362 and 114.7 x 114.7 mm on p.464.
 *
 * ## The aspect check, and the second one the display gave for free
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed. Printed p.478 gives `Dimensions (width x depth x height) — 10.7" x 10.7" x 2.1" /
 * 272 x 272 x 53 mm`. The box is square, so the usual trap — reading the height where the depth
 * belongs — cannot be resolved by the ratio alone:
 *
 *     272 / 272 = 1.000     <- the measured border is 1.000 (p.362) and 1.002 (p.464)
 *     272 /  53 = 5.132     <- five times out
 *
 * The measurement rejects the 53 mm and cannot choose between the two 272s, which is fine
 * because they are the same number.
 *
 * **The display then checks the scale independently.** p.477 gives the screen's active area as
 * `5.9" x 3.7" / 151 x 94 mm`, which nothing in the aspect calculation used. Measured off p.362
 * at the scale above, the inner bezel rectangle comes out **150.2 x 94.3 mm** — 0.5% under and
 * 0.3% over, which is inside one bezel line either way. A dimensions row and a display row, printed a page
 * apart for different reasons, agreeing to within the ink. The **specification's** 151 x 94 is
 * what is drawn, centred on the measured centre (93.0, 75.1).
 *
 * ## The voice field is the screen, not the pads
 *
 * The sibling's argument, and it transfers whole because the pools do (see `index.ts`): this
 * manifest carries a `pad` pool and two plugin-track pools, no single hardware cluster covers
 * all three, and `PanelFeature` allows exactly one voice field. The screen is where every one of
 * them is selected; the 4 x 4 pad grid shows a bank of sixteen and says nothing about the other
 * two pools. So the field goes on the display and the pad grid is left to be drawn as what it is
 * — the thing a reader finds their place by first.
 *
 * ## What is drawn, and what is deliberately not
 *
 * **Two button sizes, both measured.** The panel draws its buttons at 13.9 x 7.0 mm (the five
 * along the top of the display, FULL LEVEL, 16 LEVELS, COPY, UNDO, SHIFT, TAP TEMPO, TC, Q-LINK
 * and the four Pad Bank keys) and at 14.2 x 11.5 mm (ERASE, NOTE REPEAT, the mode row and the
 * transport row). That is not a rendering artefact — p.464 shows the two sizes side by side in
 * one column down the left edge, and the difference is why the rows are not one grid.
 *
 * **The four Q-Link knobs are four knobs, not a grid**, following the sibling. Their measured
 * centre pitches down the column are 30.7, 30.6 and 30.8 mm, which is even enough that a grid
 * would have been defensible; they are drawn individually so each carries its own label, and
 * the rounded surround the figure draws around them is the `group`.
 *
 * **The four Q-Link bank LEDs are not drawn**, on the DFAM's rule the sibling also follows:
 * `grid` says "a block of identical *controls*", and an indicator is not one. Same for the three
 * LEDs under the mode row.
 *
 * **The grey band behind the transport row is not drawn.** The figure tints it on both pages and
 * on both pages a callout bubble sits across its lower edge, so its extent could not be
 * measured. A `group` at an estimated height would be exactly the thing §10 forbids.
 *
 * **Nothing is drawn for the rear panel.** It has its own plan view on printed p.366 and its
 * sockets are declared as jacks instead.
 */

/** Panel size in mm, cited p.478 — 272 wide x 272 deep, and square. */
const W = 272
const H = 272

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label === undefined ? {} : { label }) }
}

export const MPC_ONE_G2_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source:
      'MPC Standalone OS User Guide v3.9, p.362 (Hardware Features > MPC One G2 > Top Panel) and p.464 (Appendix > Ableton Control Maps > MPC One G2)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Silkscreen above the display.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 92.9, y: 11.0, text: 'MPC ONE', align: 'middle' },

    // -----------------------------------------------------------------------
    // The display, at the specification's active area on the measured centre, with the voice
    // field inside it — see the note above on why the field is here and not on the pads.
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 17.5, y: 28.1, w: 151.0, h: 94.0 },
    { kind: 'voices', x: 18.5, y: 29.1, w: 149.0, h: 92.0, label: 'TRACK / PAD' },

    // -----------------------------------------------------------------------
    // Four Q-Link knobs down the right of the display (p.363 item 12), inside the surround the
    // figure draws around them, with the Q-Link button and the Pad Bank keys beside it.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 188.8, y: 16.6, w: 25.7, h: 116.6 },
    knob(201.6, 29.3, 19.7, 'Q-LINK 1'),
    knob(201.6, 60.0, 19.7, 'Q-LINK 2'),
    knob(201.6, 90.6, 19.7, 'Q-LINK 3'),
    knob(201.6, 121.4, 19.7, 'Q-LINK 4'),
    { kind: 'button', x: 238.2, y: 59.2, w: 14.0, h: 7.0, label: 'Q-LINK' },
    { kind: 'grid', x: 227.0, y: 100.9, w: 36.1, h: 26.2, cols: 2, rows: 2, shape: 'pad', label: 'BANK' },

    // -----------------------------------------------------------------------
    // Left edge (p.363 items 8-11, p.365 item 31). Three small keys, then two large ones.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 10.9, y: 141.8, w: 13.9, h: 7.0, label: 'FULL LEVEL' },
    { kind: 'button', x: 10.9, y: 164.3, w: 13.9, h: 7.1, label: '16 LEVELS' },
    { kind: 'button', x: 10.9, y: 186.8, w: 13.9, h: 7.1, label: 'COPY' },
    { kind: 'button', x: 10.9, y: 217.9, w: 14.2, h: 11.5, label: 'ERASE' },
    { kind: 'button', x: 10.9, y: 246.1, w: 14.2, h: 11.5, label: 'NOTE REPEAT' },

    // -----------------------------------------------------------------------
    // The 4 x 4 pad grid (p.363 item 6). Sixteen pads, one bank of the eight.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 35.7, y: 142.0, w: 114.7, h: 114.7, cols: 4, rows: 4, shape: 'pad', label: 'PADS' },

    // -----------------------------------------------------------------------
    // Right of the pads: MENU / LOAD / MIXER / TRACK MUTE / NEXT SEQ (p.364 items 14-18), then
    // UNDO and SHIFT against TAP TEMPO and TC with the Data Dial and -/+ between them.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 160.3, y: 141.8, w: 102.9, h: 7.0, cols: 5, rows: 1, shape: 'pad' },
    { kind: 'button', x: 160.3, y: 164.3, w: 13.9, h: 7.1, label: 'UNDO' },
    { kind: 'button', x: 160.3, y: 186.8, w: 13.9, h: 7.1, label: 'SHIFT' },
    { kind: 'button', x: 249.2, y: 164.3, w: 13.9, h: 7.1, label: 'TAP TEMPO' },
    { kind: 'button', x: 249.2, y: 186.8, w: 13.9, h: 7.1, label: 'TC' },
    knob(211.8, 178.2, 30.5, 'DATA'),
    { kind: 'grid', x: 194.5, y: 199.3, w: 35.8, h: 7.2, cols: 2, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Mode row (p.364 items 20-24) and transport (p.365 items 25-29). Both are the large key.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 160.0, y: 217.9, w: 103.4, h: 11.5, cols: 5, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 160.0, y: 246.1, w: 103.4, h: 11.5, cols: 5, rows: 1, shape: 'pad', label: 'TRANSPORT' },
  ],
}

/** Declared so the span in `index.ts` and the rise here cannot drift apart unnoticed. */
export const MPC_ONE_G2_PANEL_SPAN_MM = W
