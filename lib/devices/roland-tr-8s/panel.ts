import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the TR-8S's top panel.
 *
 * Read off the Top Panel figure in the Reference Manual (eng01, p.4) — the clusters, their order,
 * their sizes and their pitch — and laid out again in our own geometry and line weights. That
 * figure is a photo-real product render rather than a line drawing, which changes nothing about
 * the rule: it is reference for where things sit, and nothing is extracted, embedded or traced.
 *
 * ## The aspect does not come out, and the shortfall is in the figure
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` matches the drawn aspect before either number is
 * believed. Here it does not, by 3%. The Owner's Manual gives *"409 (W) x 263 (D) x 58 (H) mm"*
 * (eng03, p.24), an aspect of 1.555; the p.4 figure's ink measures 2725 x 1699 px at 400 dpi, an
 * aspect of 1.604.
 *
 * The figure is a straight-on plan view with no perspective — the left and right edges are
 * parallel, the knobs come out circular, the eleven channel strips are on an even pitch — so the
 * disagreement is not distortion. Taking the width as true (2725 px = 409 mm, 6.663 px/mm) puts
 * the drawn face at **255 mm** against a specified 263 mm footprint. Eight millimetres, and this
 * is the same shape of answer the MC-101 reached from a much larger gap: the figure shows the
 * flat top face and crops the rounded front and rear shoulders that the footprint includes.
 *
 * So `panelRiseMm` carries the published 263, because that is the citable number and because a
 * rack draws a box's footprint. The coordinates below are measured on the 409 x 255 flat-face
 * scale and **offset 4 mm down**, centring the drawn face in the footprint. Nothing is stretched
 * to fill the depth: stretching would turn every one of the thirty-three knobs into an ellipse.
 *
 * ## The voice field
 *
 * On the instrument select buttons, which is where this box's own voice selection lives — the
 * row of eleven marked BD, SD, LT, MT, HT, RS, HC, CH, OH, CC, RC directly under the faders
 * (p.4, callout 8). Eleven assignables, eleven buttons, one cell each, and the readout lands on
 * exactly the control a reader would press.
 *
 * ## What is simplified away
 *
 * The eleven-strip section is drawn as four grids — TUNE, DECAY, CTRL and the faders — rather
 * than as forty-four separate features, because that is what it is: one control repeated on an
 * even pitch. The silkscreen bar naming BASS DRUM through RIDE CYMBAL above the strips is not
 * drawn, since the voice field below already names them and names them per assignable. The
 * jacks are the renderer's (§2.3) and are not authored here.
 */
export const TR_8S_PANEL: PanelLayout = {
  panelRiseMm: 263,
  verified: {
    kind: 'manual',
    source: 'TR-8S Reference Manual eng01, p.4 (Top Panel)',
  },
  features: [
    // -----------------------------------------------------------------------
    // 1. Common section 1 — transport, record modes and pattern variations.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 8.4, y: 18.3, w: 60.9, h: 224.8 },
    { kind: 'knob', x: 23.5, y: 29.6, d: 11.8, label: 'VOLUME' },
    { kind: 'knob', x: 44.9, y: 29.6, d: 11.8, label: 'EXT IN' },
    { kind: 'button', x: 22.5, y: 61, w: 13, h: 9, round: true, label: 'SHIFT' },
    { kind: 'button', x: 44.3, y: 61, w: 13, h: 9, round: true, label: 'CLEAR' },
    { kind: 'button', x: 18.3, y: 82.6, w: 18.5, h: 10.7, label: 'PTN SELECT' },
    { kind: 'button', x: 44.1, y: 82.6, w: 18.3, h: 10.7, label: 'TR-REC' },
    { kind: 'button', x: 22.1, y: 103.4, w: 14.2, h: 8.8, label: 'LAST' },
    { kind: 'button', x: 44.1, y: 103.4, w: 14.3, h: 8.8, label: 'SUB' },
    { kind: 'button', x: 22.1, y: 119.1, w: 14.2, h: 8.8, label: 'MOTION' },
    { kind: 'button', x: 44.1, y: 119.1, w: 14.2, h: 8.8 },
    { kind: 'button', x: 18.3, y: 138.5, w: 18.5, h: 10.5, label: 'INST PLAY' },
    { kind: 'button', x: 44.1, y: 138.5, w: 18.3, h: 10.5, label: 'INST REC' },
    // Pattern variations A-D over E-H.
    { kind: 'grid', x: 14.1, y: 164.3, w: 52, h: 26.3, cols: 4, rows: 2, shape: 'pad', label: 'A-H' },
    { kind: 'button', x: 20, y: 215.8, w: 24.8, h: 15.7, label: 'START/STOP' },

    // -----------------------------------------------------------------------
    // 2-6. The effect and fill strip along the top.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 74.2, y: 18.3, w: 36.5, h: 29.8, label: 'ACCENT' },
    { kind: 'knob', x: 77.4, y: 29.9, d: 11.3, label: 'LEVEL' },
    { kind: 'button', x: 99.4, y: 31.3, w: 10.5, h: 8.4, label: 'STEP' },

    { kind: 'group', x: 116.6, y: 18.3, w: 20, h: 29.8, label: 'REVERB' },
    { kind: 'knob', x: 120.9, y: 29.9, d: 11.3, label: 'LEVEL' },

    { kind: 'group', x: 138.7, y: 18.3, w: 60.9, h: 29.8, label: 'DELAY' },
    { kind: 'knob', x: 144.2, y: 29.9, d: 11.3, label: 'LEVEL' },
    { kind: 'knob', x: 165.6, y: 29.9, d: 11.3, label: 'TIME' },
    { kind: 'knob', x: 187, y: 29.9, d: 11.3, label: 'FEEDBACK' },

    { kind: 'group', x: 208, y: 18.3, w: 34.7, h: 29.8, label: 'MASTER FX' },
    { kind: 'button', x: 210.1, y: 31.9, w: 11.2, h: 7.8, label: 'ON' },
    { kind: 'knob', x: 230.8, y: 29.9, d: 11.3, label: 'CTRL' },

    { kind: 'group', x: 251.1, y: 18.3, w: 59.9, h: 29.8, label: 'FILL IN' },
    { kind: 'button', x: 253.2, y: 31.9, w: 12.1, h: 7.8, label: 'ON' },
    { kind: 'knob', x: 276, y: 29.9, d: 11.3 },
    { kind: 'button', x: 296.2, y: 30.4, w: 13.3, h: 9.9, label: 'MANUAL TRIG' },

    // -----------------------------------------------------------------------
    // 7. Eleven identical channel strips: three knobs and a fader each.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 74.2, y: 57.1, w: 237.7, h: 112.9 },
    { kind: 'grid', x: 72.5, y: 60.1, w: 240, h: 13, cols: 11, rows: 1, shape: 'knob', label: 'TUNE' },
    { kind: 'grid', x: 72.5, y: 82.8, w: 240, h: 13, cols: 11, rows: 1, shape: 'knob', label: 'DECAY' },
    { kind: 'grid', x: 72.5, y: 105.3, w: 240, h: 11, cols: 11, rows: 1, shape: 'knob', label: 'CTRL' },
    { kind: 'grid', x: 72.5, y: 127.5, w: 240, h: 39.9, cols: 11, rows: 1, shape: 'fader' },

    // -----------------------------------------------------------------------
    // 8. Instrument select buttons — and the one region the resolver writes into.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 74.2, y: 173.4, w: 237.7, h: 22.4 },
    { kind: 'voices', x: 74.2, y: 176, w: 237.7, h: 18, label: 'INSTRUMENT' },

    // -----------------------------------------------------------------------
    // 9. Display, edit buttons, tempo.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 317.9, y: 18.3, w: 77, h: 176.5 },
    { kind: 'screen', x: 326.7, y: 28.8, w: 58.9, h: 15.1 },
    { kind: 'knob', x: 371.3, y: 57.6, d: 13.9, label: 'VALUE' },
    { kind: 'button', x: 326.7, y: 60.7, w: 14.7, h: 8, label: 'WRITE' },
    { kind: 'button', x: 348.8, y: 60.7, w: 14.7, h: 8, label: 'ENTER' },
    { kind: 'button', x: 326.7, y: 81.3, w: 14.7, h: 8, label: 'KIT' },
    { kind: 'button', x: 348.8, y: 81.3, w: 14.7, h: 8, label: 'INST' },
    { kind: 'button', x: 370.9, y: 81.3, w: 14.7, h: 8, label: 'SAMPLE' },
    { kind: 'button', x: 326.7, y: 100.2, w: 14.7, h: 8.4, label: 'CTRL SELECT' },
    { kind: 'button', x: 348.8, y: 100.2, w: 14.7, h: 8.4, label: 'COPY' },
    { kind: 'button', x: 370.9, y: 100.2, w: 14.7, h: 8.4, label: 'UTILITY' },
    { kind: 'screen', x: 327.8, y: 119.1, w: 32.6, h: 9.5 },
    { kind: 'knob', x: 331.6, y: 140.2, d: 27.3, label: 'TEMPO' },
    { kind: 'knob', x: 371.9, y: 131.3, d: 12.6, label: 'SHUFFLE' },
    { kind: 'button', x: 366.1, y: 170.6, w: 23.5, h: 18.9 },
    { kind: 'button', x: 329.9, y: 184.7, w: 14.7, h: 8, label: 'MUTE' },

    // -----------------------------------------------------------------------
    // 10. The sixteen step pads.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 53.2, y: 198.9, w: 340.2, h: 44.2 },
    { kind: 'grid', x: 60.3, y: 210.5, w: 323.6, h: 21, cols: 16, rows: 1, shape: 'pad' },
  ],
}
