import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the MC-101's top panel.
 *
 * Read off the Top Panel figure in the Reference Manual (eng01, p.4) — the clusters, their
 * order, their sizes and their pitch — and laid out again in our own geometry and line weights.
 * Nothing is extracted, embedded or traced.
 *
 * ## The specifications and the drawing disagree about depth, and that is a fact about the box
 *
 * `panelSpanMm` is 174 and `panelRiseMm` is 133, both printed in the Main Specifications table
 * (Owner's Manual eng02, p.19: *"174 (W) x 133 (D) x 58 (H) mm"*), confirmed by rendering that
 * page rather than by grepping the text layer, and cross-checked against the inch row it prints
 * beside it. The MC-101 is a landscape desktop box played lying flat, so there is no
 * orientation trap here: the vendor's W really is the horizontal span in playing orientation.
 *
 * §2.3 asks for one further check — that `panelSpanMm / panelRiseMm` matches the drawn aspect —
 * and **it does not.** The p.4 figure is 1733 x 996 px at 400 dpi, an aspect of 1.74; the
 * specifications give 174 / 133 = 1.31.
 *
 * The figure is not distorted artwork, and three measurements say so. Its pads come out square
 * (115 x 116 px) on a square 14.3 mm lattice, its measure indicators are circles, and its
 * chassis outline is a true rounded rectangle with left and right edges at constant x — no
 * perspective. The rear-panel figure on p.6 settles it: its MIDI DIN socket is 144 x 145 px, a
 * true circle, and at the scale the 174 mm width sets that is 15.4 mm — which is what a 5-pin
 * DIN panel socket measures. Yet the same figure's silhouette is only 38.6 mm tall against a
 * specified 58 mm, and the front-panel figure gives 32.2 mm. Three faces, three different
 * shortfalls, none of them internally distorted.
 *
 * So the figures show each **flat face** and crop the rounded shoulders, which the bottom-panel
 * render on p.5 shows the box plainly having. The flat top face is about 174 x 100 mm inside a
 * 174 x 133 mm footprint, the missing ~33 mm being the rounded front lip and the rear shoulder.
 *
 * **That 100 is inference from measurement and is not printed anywhere, so it is not what is
 * authored.** `panelRiseMm` carries the published footprint, because that is the citable number
 * and because a rack draws a box's footprint. The layout below is measured on the 174 x 100
 * flat-face scale and then **offset 11 mm down**, leaving 11 mm of blank at the rear and 22 mm
 * at the front — the drawing's own weighting. Nothing is stretched to fill the depth: stretching
 * would turn every knob into an ellipse and every pad into a tall rectangle, which is not what
 * this box looks like, and a panel that looks entirely plausible and is wrong is the failure
 * §2.3 says is hardest to notice later.
 *
 * ## The voice field
 *
 * On the pads. 8 of this device's 11 assignables *are* pads of a DRUM track —
 * *"In a drum kit, 16 instruments are assigned to the pads, one instrument to each pad"*
 * (p.17), of which the pool models the eight any template can reach — so a lit cell there is a
 * lit pad, which is as true as this readout gets.
 *
 * It is drawn 50 mm deep rather than the 25.9 mm the pads themselves occupy, and reaches down
 * into the blank front margin the flat-face reading leaves. That is not decoration: the packer
 * sizes every cell at `min(cellWidth x 0.78, spareHeight / rows)`, so a 26 mm-deep region turns
 * eleven cells into 25.7 x 3.3 mm slabs — the panel stops reading as a box with pads on it. At
 * 50 mm they come out 25.7 x 11.3 mm, which is the shape a pad is.
 *
 * The mixer strip was the alternative and is the better *picture* of four tracks: numbered tabs
 * over four colour-coded faders, one lane each. It loses because this device has eleven
 * assignables and that region has four lanes, so an eleven-cell readout laid into it would
 * read as a claim about tracks that it is not making. The mixer stays a plain fader grid, and
 * the three TONE tracks share the pad region because a panel has one voice field.
 */
export const MC_101_PANEL: PanelLayout = {
  panelRiseMm: 133,
  verified: { kind: 'manual', source: 'MC-101 Reference Manual eng01, p.4 (Top Panel)' },
  features: [
    // Branding along the top edge.
    { kind: 'label', x: 3.7, y: 17, text: 'Roland', align: 'start' },
    { kind: 'label', x: 169.3, y: 17, text: 'MC-101', align: 'end' },

    // 1 Common Section 1, the far-left column: volume, modifiers, TRACK SEL, MEASURE, transport.
    { kind: 'knob', x: 14, y: 24.1, d: 9.8, label: 'VOLUME' },
    { kind: 'button', x: 7.3, y: 41.3, w: 9.9, h: 5.9, label: 'SHIFT' },
    { kind: 'button', x: 21, y: 41.2, w: 9.9, h: 5.9, label: 'PROJECT' },
    { kind: 'label', x: 19, y: 56, text: 'TRACK SEL', align: 'middle' },
    { kind: 'grid', x: 7.1, y: 58.6, w: 23.8, h: 16, cols: 2, rows: 2, shape: 'pad' },
    { kind: 'label', x: 19, y: 80.5, text: 'MEASURE', align: 'middle' },
    { kind: 'grid', x: 7.3, y: 82.9, w: 23.6, h: 5.9, cols: 2, rows: 1, shape: 'pad' },
    // The four measure display indicators, on the same pitch as the buttons above them.
    { kind: 'grid', x: 10.6, y: 91.6, w: 16.1, h: 1.4, cols: 4, rows: 1 },
    { kind: 'grid', x: 7.3, y: 96.6, w: 23.6, h: 5.9, cols: 2, rows: 1, shape: 'pad' },

    // 2 Total Effect Section.
    { kind: 'button', x: 39.9, y: 26.3, w: 9.8, h: 5.9, label: 'MULTI FX' },
    { kind: 'knob', x: 57.9, y: 24.2, d: 9.8, label: 'FX PRM' },
    { kind: 'knob', x: 75.6, y: 24.2, d: 9.8, label: 'FX DEPTH' },

    // 6 Common Section 2, top right: the display and the VALUE dial that drives every menu.
    { kind: 'screen', x: 94.3, y: 22.9, w: 51.5, h: 13.2 },
    { kind: 'knob', x: 155.2, y: 23, d: 12.1, label: 'VALUE' },

    // 3 Mixer Section: numbered track tabs over four level faders, 14.3 mm pitch.
    { kind: 'grid', x: 35.8, y: 41, w: 55.2, h: 2.9, cols: 4, rows: 1 },
    { kind: 'grid', x: 39.3, y: 49, w: 48.5, h: 24.7, cols: 4, rows: 1, shape: 'fader' },

    // 4 Control Section: [C1]-[C4] over the four buttons that say what those knobs address.
    { kind: 'label', x: 121.2, y: 43.5, text: 'CONTROL', align: 'middle' },
    { kind: 'grid', x: 94.3, y: 50.4, w: 52.7, h: 9.9, cols: 4, rows: 1, shape: 'knob' },
    { kind: 'grid', x: 94.1, y: 64.2, w: 53, h: 6, cols: 4, rows: 1, shape: 'pad' },

    // 6 continued, the right-hand column: EXIT and TEMPO over the four PAD mode buttons.
    { kind: 'grid', x: 156.3, y: 46.9, w: 9.9, h: 16.8, cols: 1, rows: 2, shape: 'pad' },
    { kind: 'label', x: 161.3, y: 71, text: 'PAD', align: 'middle' },
    { kind: 'grid', x: 156.3, y: 74.1, w: 9.9, h: 30.2, cols: 1, rows: 4, shape: 'pad' },

    // 5 Pad Section: 8 x 2, and the readout that sits on it.
    { kind: 'voices', x: 36, y: 79.5, w: 111.6, h: 50 },
  ],
}
