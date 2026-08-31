import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Polyend Tracker panel.
 *
 * Read off the two plan views in 1.2 Hardware Overview (p.13, dimensioned) and 1.2's control
 * callout figure (p.14, labelled) — between them the one complete, unobstructed, fully-labelled
 * figure of the panel in the document. Our own geometry and line weights; nothing traced or
 * embedded.
 *
 * ## Method: the figure's own vector geometry, not a render of it
 *
 * Neither page carries a raster image — `pdfimages -list` returns nothing for either, and every
 * XObject they use is `/Subtype /Form`. The panel is one drawing placed twice: `I1` on p.13 and
 * `I4` on p.14, both `/BBox [0 0 1702 1254]` with an identity `/Matrix`, and both containing the
 * same border path at `x 18.896..1684.230`, `y 16.703..1239.500`. So every coordinate below is
 * read from the drawing's own path operators and carries no rasterisation error.
 *
 * **What that settles.** The border is 1665.334 x 1222.797 units, an aspect of **1.361905**
 * against the dimensioned 282 / 207 = **1.362319** — they agree to **0.03%**. And p.13 places the
 * form at `0.169491 0 0 0.169491 174.802 330.666 cm`, which puts those bounds at **282.26 x
 * 207.25 pt on the page**: one point per millimetre to within 0.09%. That confirms 282 and 207
 * *individually* rather than only their ratio, and it is what rules out the 33 mm depth
 * dimensioned on the rear-panel elevation directly above the plan view. The Tracker is landscape
 * — unlike its portrait sibling the Tracker Mini, the maker's width and the played span are the
 * same edge, so there is no orientation trap here.
 *
 * Form units convert at 282 / 1665.334 = 0.169335 mm horizontally and 207 / 1222.797 = 0.169284
 * vertically, a 0.03% anisotropy that is rounding rather than two different scales.  The origin
 * is the border's top-left, `(18.896, 1239.500)` — PDF y counts upward, so the form's maximum y
 * is the panel's top.
 *
 * **Sizes here are path centrelines**, so they run about half a millimetre under what a render
 * shows: a rasterised stroke is dark across its whole width and the centreline is not. Centres
 * are unaffected.
 *
 * The census the form yields is exact and matches p.14's prose: **48 pads** at 59.0 x 59.0 units
 * (9.99 mm square), which is callout 3's *"4 x 12 grid of silicon multifunctional [PADS]"*; **33
 * buttons** at 94.7 units (16.03 mm), which is callout 2's row of eight dynamic screen buttons
 * plus the twenty-five in the right-hand block; one **screen** of 899.4 x 507.3 units, callout 1's
 * *"7 Inch, LCD TFT 800 x 480 Display"*; and one circle of 273.1 units (46.2 mm), callout 4's jog
 * wheel. Nothing else on the panel is a control — the four navigation glyphs are arrows drawn on
 * top of four of those buttons, which is how the inverted-T cluster below is identified rather
 * than guessed.
 *
 * The pad field is one uniform grid: all twelve columns sit on a 13.04 mm pitch, the same pitch
 * the Play+ carries, because the two boxes share a chassis and this is literally the same
 * 282 x 207 frame.
 *
 * ## Where the voice field goes
 *
 * **On the eight screen buttons, and on this box that is exact.** `PanelFeature` asks for the
 * field to go where the box's own track selection lives, and p.18 names the gesture: *"To mute /
 * unmute, Press [Shift] + The screen button for the respective track. All 8 tracks are presented
 * by the screen buttons when holding the shift button."* Eight buttons, eight tracks, one to one
 * — so unlike the Play+, where the field covers a selection block and claims no row-for-row
 * correspondence, the cells here land on the controls they stand for.
 *
 * The pad grid was the obvious place and it is the wrong one. It is 4 x 12 and the box has eight
 * tracks, so no arrangement of it corresponds to anything; and handing eight cells a 153 mm
 * region makes each one 19 mm across against a 10 mm pad, the failure `rack.test.ts` records
 * finding on the Deluge.
 */
export const TRACKER_PANEL: PanelLayout = {
  panelRiseMm: 207,
  verified: {
    kind: 'manual',
    source: 'Polyend Tracker Manual 1.9.2a, p.13-14 (1.2 Hardware Overview)',
  },
  features: [
    // The wordmark cluster — logo disc then letterforms — spans x 12.70..78.74, y 6.76..14.67.
    { kind: 'label', x: 12.7, y: 13.4, text: 'Tracker', align: 'start' },

    // Callout 1, the 7-inch display, top-left and the width of the pad field beneath it.
    { kind: 'screen', x: 12.31, y: 19.86, w: 152.3, h: 85.88 },

    // Callout 2, the eight dynamic screen buttons, in one row directly under the display on a
    // 19.28 mm pitch. p.14: "Dynamic [Screen buttons] are dependant on the function displayed
    // above each button."
    { kind: 'button', x: 13.25, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 32.53, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 51.81, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 71.09, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 90.37, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 109.65, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 128.93, y: 115.61, w: 16.03, h: 16.02 },
    { kind: 'button', x: 148.21, y: 115.61, w: 16.03, h: 16.02 },

    // The 5 x 5 command block, right of the display on the same 19.28 mm pitch. Rows top to
    // bottom as p.14's callouts 15-19, 10-14, 5-9, then the transport and navigation pair.
    // Labels are the panel's primary legend; a secondary is [Shift] on the same key (callout 25),
    // so printing it would draw a control that is not there.
    { kind: 'button', x: 177.15, y: 18.66, w: 16.03, h: 16.02, label: 'INST PARAMS' },
    { kind: 'button', x: 196.43, y: 18.66, w: 16.03, h: 16.02, label: 'PERFORM' },
    { kind: 'button', x: 215.71, y: 18.66, w: 16.03, h: 16.02, label: 'FILE' },
    { kind: 'button', x: 234.99, y: 18.66, w: 16.03, h: 16.02, label: 'CONFIG' },
    { kind: 'button', x: 254.27, y: 18.66, w: 16.03, h: 16.02, label: 'MASTER' },

    { kind: 'button', x: 177.15, y: 37.61, w: 16.03, h: 16.03, label: 'SAMPLE LOADER' },
    { kind: 'button', x: 196.43, y: 37.61, w: 16.03, h: 16.03, label: 'SAMPLE PLAYBACK' },
    { kind: 'button', x: 215.71, y: 37.61, w: 16.03, h: 16.03, label: 'SAMPLE EDITOR' },
    { kind: 'button', x: 234.99, y: 37.61, w: 16.03, h: 16.03, label: 'SAMPLE RECORDER' },
    { kind: 'button', x: 254.27, y: 37.61, w: 16.03, h: 16.03, label: 'SONG' },

    { kind: 'button', x: 177.15, y: 56.58, w: 16.03, h: 16.02, label: 'NOTE' },
    { kind: 'button', x: 196.43, y: 56.58, w: 16.03, h: 16.02, label: 'INSTRUMENT' },
    { kind: 'button', x: 215.71, y: 56.58, w: 16.03, h: 16.02, label: 'FX1' },
    { kind: 'button', x: 234.99, y: 56.58, w: 16.03, h: 16.02, label: 'FX2' },
    { kind: 'button', x: 254.27, y: 56.58, w: 16.03, h: 16.02, label: 'PATTERN' },

    { kind: 'button', x: 177.15, y: 96.7, w: 16.03, h: 16.02, label: 'PLAY' },
    { kind: 'button', x: 196.43, y: 96.7, w: 16.03, h: 16.02, label: 'COPY' },
    { kind: 'button', x: 215.71, y: 96.7, w: 16.03, h: 16.02, label: 'INSERT' },
    { kind: 'button', x: 234.99, y: 96.7, w: 16.03, h: 16.02, label: 'UP' },
    { kind: 'button', x: 254.27, y: 96.7, w: 16.03, h: 16.02, label: 'DELETE' },

    { kind: 'button', x: 177.15, y: 115.66, w: 16.03, h: 16.02, label: 'REC' },
    { kind: 'button', x: 196.43, y: 115.66, w: 16.03, h: 16.02, label: 'SHIFT' },
    { kind: 'button', x: 215.71, y: 115.66, w: 16.03, h: 16.02, label: 'LEFT' },
    { kind: 'button', x: 234.99, y: 115.66, w: 16.03, h: 16.02, label: 'DOWN' },
    { kind: 'button', x: 254.27, y: 115.66, w: 16.03, h: 16.02, label: 'RIGHT' },

    // Callout 4, the jog wheel, bottom right beside the pad field.
    { kind: 'knob', x: 200.74, y: 146.57, d: 46.25, label: 'JOG' },

    // Callout 3, the 4 x 12 pad field. One 13.04 mm pitch across and down.
    { kind: 'grid', x: 11.97, y: 145.26, w: 153.42, h: 49.09, cols: 12, rows: 4, shape: 'pad', label: 'PADS' },

    // The readout, on the screen-button row. See the header: p.18 makes these the eight tracks.
    { kind: 'voices', x: 13.25, y: 115.61, w: 150.99, h: 16.02, label: 'TRACKS' },
  ],
}
