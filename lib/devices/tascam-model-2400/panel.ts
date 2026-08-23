import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Tascam Model 2400's top panel.
 *
 * Read off the Dimensional drawings on p.73 and laid out again in our own geometry and line
 * weights. Nothing is extracted, embedded or traced.
 *
 * ## For once the figure is a real mechanical drawing
 *
 * The L-8's panel had to come off the cover and the Euroburo's likewise, because neither manual
 * draws the whole thing anywhere else. This one has a proper **dimensioned plan view**: p.73
 * carries the top view with a 680.5 mm horizontal dimension line and a 568.0 mm vertical one,
 * beside a rear elevation at 132.5 mm and a side elevation at 79.1 mm. §2.3 says to *"prefer
 * citing that diagram, since it is the thing actually measured"*, and here that is possible.
 *
 * The aspect check passes to within a tenth of a percent. The chassis rectangle in the plan view
 * measures 1071.5 x 895 px at 200 dpi, an aspect of **1.1972**, against 680.5 / 568.0 =
 * **1.1981** from the specifications. A second, independent check falls out of the same drawing:
 * a nested rectangle inside the first measures 2011 px against the outer 2146 px at 400 dpi, a
 * ratio of 0.9371, and the specifications give two widths — 680.5 mm *"with side panels"* and
 * 638.5 mm *"without"*, a ratio of 0.9383. The drawing is dimensioning both, and it agrees with
 * the table on each.
 *
 * **680.5 is the authored span**, because §2.3 asks how much room the box takes up in a row of
 * panels and the side cheeks are bolted on. A desk mixer lies flat, so the surface you play is
 * the top panel and its vertical span is the 568.0 mm the specifications call *depth* — the trap
 * that field exists for, springing in its usual direction.
 *
 * ## No voice field
 *
 * Zero assignables (§2.4), so no `voices` region. Third device in the library to make that call.
 *
 * ## What is simplified away, and it is a lot
 *
 * This panel carries somewhere over two hundred controls. Drawing each would be a transcription,
 * not a simplification, so what is authored is the **structure**: seventeen input columns on a
 * 27.83 mm pitch, each row of identical controls as one grid, and the master section as its
 * clusters. The measurements are of the rows and the pitch, which is what makes the drawing read
 * as this box rather than as a generic mixer.
 *
 * Deliberately not drawn: the sixteen XLR/TRS combo jacks along the top edge and the INSERT
 * jacks below them, because the renderer draws the jacks `clock` and `io` declare (§2.3) and a
 * second set here would be a competing claim about the same sockets; the per-channel silkscreen;
 * and the MID frequency knob, which the twelve mono channels have and the five stereo channels do
 * not — the EQ grid is three rows across all seventeen, which is true of every column, rather
 * than four rows that would be a lie about five of them.
 */
export const MODEL_2400_PANEL: PanelLayout = {
  panelRiseMm: 568,
  verified: {
    kind: 'manual',
    source: 'Tascam Model 2400 Owner’s Manual, p.73 (Dimensional drawings)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Input channels 1-12 and 13/14-21/22: seventeen columns on a 27.83 mm
    // pitch, from the left edge of channel 1 to the right edge of 21/22.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 26, y: 10, w: 482, h: 545 },

    // GAIN, one per channel. Mic 0-50 dB, line -10 to +40 dB (p.70).
    { kind: 'grid', x: 33.9, y: 72, w: 473.2, h: 24, cols: 17, rows: 1, shape: 'knob', label: 'GAIN' },
    // LOW CUT, 100 Hz at -18 dB/oct (p.72), and INST on channels 1-2.
    { kind: 'grid', x: 33.9, y: 100, w: 473.2, h: 8, cols: 17, rows: 1, shape: 'pad', label: 'LOW CUT' },
    // INPUT SEL: MIC/LINE, MTR or USB per channel.
    { kind: 'grid', x: 33.9, y: 121, w: 473.2, h: 10, cols: 17, rows: 1, shape: 'pad', label: 'INPUT SEL' },
    { kind: 'grid', x: 33.9, y: 135, w: 473.2, h: 8, cols: 17, rows: 1, shape: 'pad', label: 'REC OUT' },

    // The analogue compressor is on the twelve mono channels only — twelve
    // columns of the same pitch, not seventeen.
    { kind: 'grid', x: 33.9, y: 152, w: 334, h: 16, cols: 12, rows: 1, shape: 'knob', label: 'COMP' },

    // Three-band analogue EQ: high shelf 10 kHz, mid peak, low shelf 60 Hz,
    // each -15 to +15 dB (p.72).
    { kind: 'grid', x: 33.9, y: 174, w: 473.2, h: 72, cols: 17, rows: 3, shape: 'knob', label: 'EQ' },
    { kind: 'grid', x: 33.9, y: 250, w: 473.2, h: 8, cols: 17, rows: 1, shape: 'pad', label: 'BYPASS' },

    // Five aux sends per channel, feeding AUX OUTPUT 1-5 (p.71).
    { kind: 'grid', x: 33.9, y: 264, w: 473.2, h: 95, cols: 17, rows: 5, shape: 'knob', label: 'AUX 1-5' },
    { kind: 'grid', x: 33.9, y: 363, w: 473.2, h: 18, cols: 17, rows: 1, shape: 'knob', label: 'PAN' },

    // -----------------------------------------------------------------------
    // The fader block: seventeen input channels, four SUB pairs and MAIN.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 33.9, y: 386, w: 613.3, h: 12, cols: 22, rows: 1, shape: 'pad', label: 'REC / MUTE' },
    { kind: 'grid', x: 33.9, y: 402, w: 613.3, h: 112, cols: 22, rows: 1, shape: 'fader' },

    // -----------------------------------------------------------------------
    // Master section, right of the input columns.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 508.7, y: 12.7, w: 68, h: 32.5, label: 'TALKBACK' },
    { kind: 'group', x: 579.6, y: 12.7, w: 49.6, h: 32.5, label: 'PHONES' },
    { kind: 'group', x: 508.7, y: 50.7, w: 111.4, h: 55, label: 'MASTER BUS PROCESSOR' },
    { kind: 'grid', x: 514, y: 62, w: 100, h: 18, cols: 5, rows: 1, shape: 'knob' },
    { kind: 'label', x: 628.9, y: 96, text: 'SD', align: 'middle' },

    { kind: 'group', x: 508.7, y: 111.2, w: 136.7, h: 61.5 },
    { kind: 'screen', x: 532.5, y: 118.3, w: 44.2, h: 47 },
    { kind: 'knob', x: 544.9, y: 185.3, d: 20, label: 'MULTI JOG' },
    { kind: 'grid', x: 580, y: 188, w: 62, h: 14, cols: 3, rows: 1, shape: 'pad', label: 'TRANSPORT' },

    { kind: 'group', x: 508.7, y: 248.7, w: 53.5, h: 119.5, label: 'MONITORS' },
    { kind: 'grid', x: 513, y: 258, w: 20, h: 100, cols: 1, rows: 5, shape: 'knob' },
    { kind: 'group', x: 565.2, y: 219.8, w: 80.2, h: 148.4, label: 'DIGITAL EFFECT PROCESSOR' },
  ],
}
