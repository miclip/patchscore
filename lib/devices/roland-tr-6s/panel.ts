import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the TR-6S's top panel.
 *
 * Read off the Top Panel figure in the Owner's Manual (eng02, p.4) — the clusters, their order,
 * their sizes and their pitch — and laid out again in our own geometry and line weights. That
 * figure is a photo-real product render with five numbered callout boxes drawn over it, which
 * changes nothing about the rule: it is reference for where things sit, and nothing is
 * extracted, embedded or traced.
 *
 * ## Method
 *
 * The page was rendered at 200 dpi and every coordinate below is a measurement off that render,
 * not an estimate. The panel body is a flat fill of `rgb(95, 96, 102)`; isolating it puts the
 * drawn face at **1329 x 763 px**, and every control is the bounding box of its own component
 * within that. Two controls were recovered by hand because a pink callout circle sits on top of
 * them — the leftmost step pad (behind circle 5) and the leftmost instrument select button
 * (behind circle 3). Neither was guessed: the step pads run on an exact 67.2 px pitch and the
 * instrument buttons on an exact 100.2 px pitch, both confirmed across the fifteen and five
 * that are unobstructed, so the hidden one is arithmetic rather than judgement.
 *
 * ## The aspect does not come out, and the shortfall is in the figure
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` matches the drawn aspect before either number is
 * believed. Here it does not, by 2.6%. Main Specifications give *"224 (W) x 132 (D) x 61 (H)
 * mm"* (eng02, p.40), an aspect of 1.697; the drawn face measures 1329 x 763 px, an aspect of
 * 1.742.
 *
 * The figure is a straight-on plan view with no perspective — the left and right edges are
 * parallel, the knobs come out circular, the six channel strips are on an even pitch — so the
 * disagreement is not distortion. Taking the width as true (1329 px = 224 mm, 5.933 px/mm) puts
 * the drawn face at **128.6 mm** against a specified 132 mm footprint. Three and a half
 * millimetres, and it is the same answer the TR-8S and the MC-101 reached from larger gaps: the
 * figure shows the flat top face and crops the rounded front and rear shoulders that the
 * footprint includes.
 *
 * So `panelRiseMm` carries the published 132, because that is the citable number and because a
 * rack draws a box's footprint. The coordinates below are measured on the 224 x 128.6 flat-face
 * scale and **offset 1.7 mm down**, centring the drawn face in the footprint. Nothing is
 * stretched to fill the depth: stretching would turn all five knobs into ellipses.
 *
 * ## The voice field
 *
 * On the instrument select buttons — the row of six marked BD, SD, LT, HC, CH, OH directly
 * under the faders (p.4, callout 3), which is where this box's own voice selection lives. Six
 * assignables, six buttons, one cell each, and the readout lands on exactly the button a reader
 * would press.
 *
 * ## What is simplified away
 *
 * The six-strip section is drawn as one fader grid rather than six separate features, because
 * that is what it is: one control repeated on an even pitch. The silkscreen bar naming BASS DRUM
 * through OPEN HIHAT above the strips is not drawn, since the voice field below already names
 * them and names them per assignable.
 *
 * The grey second legends under the buttons — `SETTING` under [PTN SELECT], `LAST` under
 * [STEP LOOP], `MOTION` under [VARIATION], `EDIT` under [KIT]/[INST]/[SAMPLE], `TAP` under
 * [TEMPO] — are the [SHIFT] functions rather than controls of their own, so each button carries
 * its primary label only. The gestures live in the manifest's `hints` table, which is where a
 * reader standing at the box is looking for them.
 *
 * The three knobs in the INST edit section each carry a second grey legend too — `REVERB` under
 * [TUNE], `DELAY` under [DECAY], `MASTER FX` under [CTRL] — and that one is not a [SHIFT]
 * function but a **mode**: p.14, *"When all of the instrument select buttons are unlit, you can
 * use the knobs to adjust the effects."* The primary label is drawn because every recipe in the
 * manifest addresses these knobs with an instrument selected, which is the other mode.
 *
 * The jacks are the renderer's (§2.3) and are not authored here.
 */
export const TR_6S_PANEL: PanelLayout = {
  panelRiseMm: 132,
  verified: {
    kind: 'manual',
    source: "TR-6S Owner's Manual eng02, p.4 (Top Panel)",
  },
  features: [
    // -----------------------------------------------------------------------
    // 1. Common section 1 — transport, record modes and pattern variations.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 7.2, y: 13.5, w: 31.7, h: 110.7 },
    { kind: 'knob', x: 16.5, y: 17.9, d: 13.0, label: 'VOLUME' },
    { kind: 'button', x: 8.1, y: 39.6, w: 12.8, h: 7.6, round: true, label: 'SHIFT' },
    { kind: 'button', x: 24.8, y: 39.6, w: 12.8, h: 7.6, round: true, label: 'CLEAR' },
    { kind: 'button', x: 8.1, y: 51.6, w: 12.8, h: 9.6, label: 'PTN SELECT' },
    { kind: 'button', x: 24.8, y: 51.6, w: 12.8, h: 9.8, label: 'TR-REC' },
    { kind: 'button', x: 8.1, y: 67.6, w: 12.8, h: 7.8, label: 'STEP LOOP' },
    { kind: 'button', x: 24.8, y: 67.8, w: 12.8, h: 7.6, label: 'SUB' },
    { kind: 'button', x: 8.1, y: 81.8, w: 12.8, h: 9.6, label: 'VARIATION' },
    { kind: 'button', x: 24.8, y: 81.8, w: 12.8, h: 9.6, label: 'INST REC' },
    { kind: 'button', x: 14.4, y: 106.0, w: 12.3, h: 9.4, label: 'START/STOP' },

    // -----------------------------------------------------------------------
    // 2. INST edit section — three knobs, the master FX switch, six faders.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 43.3, y: 13.5, w: 98.8, h: 67.7 },
    { kind: 'knob', x: 46.6, y: 16.7, d: 15.5, label: 'TUNE' },
    { kind: 'knob', x: 70.5, y: 16.5, d: 15.6, label: 'DECAY' },
    { kind: 'knob', x: 94.8, y: 16.7, d: 15.5, label: 'CTRL' },
    { kind: 'button', x: 119.7, y: 20.4, w: 12.8, h: 7.8, label: 'MASTER FX' },
    { kind: 'grid', x: 43.1, y: 49.2, w: 97.3, h: 30.7, cols: 6, rows: 1, shape: 'fader' },

    // -----------------------------------------------------------------------
    // 3. Instrument select buttons — and the one region the resolver writes into.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 43.3, y: 82.1, w: 98.8, h: 17.1, label: 'ACCENT' },
    { kind: 'voices', x: 43.8, y: 88.7, w: 97.3, h: 7.8, label: 'INSTRUMENT' },

    // -----------------------------------------------------------------------
    // 4. Display, edit buttons, tempo.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 146.0, y: 13.5, w: 70.2, h: 86.0, label: 'SETTING / EDIT' },
    { kind: 'screen', x: 147.1, y: 17.4, w: 58.8, h: 14.8 },
    { kind: 'button', x: 147.3, y: 53.6, w: 12.8, h: 7.8, label: 'KIT' },
    { kind: 'button', x: 163.8, y: 53.6, w: 12.8, h: 7.8, label: 'INST' },
    { kind: 'button', x: 180.5, y: 53.6, w: 12.6, h: 7.8, label: 'SAMPLE' },
    { kind: 'knob', x: 197.7, y: 55.4, d: 18.3, label: 'VALUE' },
    { kind: 'button', x: 147.3, y: 68.6, w: 12.8, h: 7.8, label: 'COPY' },
    { kind: 'button', x: 163.8, y: 68.6, w: 12.8, h: 7.8, label: 'UTILITY' },
    { kind: 'button', x: 180.5, y: 68.6, w: 12.6, h: 7.8, label: 'EXIT' },
    { kind: 'button', x: 155.6, y: 83.6, w: 12.6, h: 7.8, label: 'FILL IN TRIG' },
    { kind: 'button', x: 180.5, y: 83.6, w: 12.6, h: 7.8, label: 'SHUFFLE' },
    { kind: 'button', x: 200.6, y: 83.6, w: 12.6, h: 7.8, label: 'TEMPO' },

    // -----------------------------------------------------------------------
    // 5. The sixteen step pads.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 36.1, y: 101.1, w: 181.3, h: 23.1 },
    { kind: 'grid', x: 33.0, y: 104.3, w: 177.7, h: 12.6, cols: 16, rows: 1, shape: 'pad' },
  ],
}
