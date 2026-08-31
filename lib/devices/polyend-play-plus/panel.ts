import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Polyend Play+ panel.
 *
 * Read off the dimensioned plan view in 1.2 Hardware Overview (Rev 2, p.15) — the one complete,
 * unobstructed, fully-labelled figure of the panel in the document, and the same figure the cited
 * `panelSpanMm` comes from. Our own geometry and line weights; nothing traced or embedded.
 *
 * ## Method: the figure's own vector geometry, not a render of it
 *
 * The page carries no raster image at all — `pdfimages -list` returns nothing for it, and the four
 * XObjects it does use are every one `/Subtype /Form`. The panel is `I1`, a form with `/BBox
 * [0 0 1702 1254]` and an identity `/Matrix`, placed by the page at `0.169356 0 0 0.169356
 * 174.917 330.582 cm`. So every coordinate below is read from the drawing's own path operators
 * rather than measured off pixels, and carries no rasterisation error.
 *
 * **That is worth the trouble because of what it settles.** Inside the form the panel border runs
 * `x 18.846..1684.180`, `y 16.763..1239.560` — 1665.334 x 1222.797 units, an aspect of
 * **1.361905** against the figure's printed 282 / 207 = **1.362319**. They agree to **0.03%**.
 *
 * And the stronger claim, which an aspect check cannot make on its own: at the placement scale
 * those bounds are **282.03 x 207.09 pt on the page**, so the figure is drawn at exactly one point
 * per millimetre. That confirms 282 and 207 *individually* rather than only their ratio, and it is
 * what finally rules out the 35 mm depth dimensioned on the rear-panel elevation immediately above
 * the plan view. The Play+ is landscape, so unlike its portrait sibling the Tracker Mini there is
 * no orientation trap here: the maker's width and the played span are the same edge.
 *
 * Form units convert at 282 / 1665.334 = 0.169335 mm horizontally and 207 / 1222.797 = 0.169284
 * vertically, a 0.03% anisotropy that is the residue of rounding rather than two different scales.
 * The origin is the border's top-left, `(18.846, 1239.560)` — PDF y counts upward, so the form's
 * maximum y is the panel's top.
 *
 * **Sizes here are path centrelines and are therefore about half a millimetre under what a render
 * shows**, because a rasterised stroke is dark across its whole width and the centreline is not.
 * Centres are unaffected and agree with a 200 dpi render to within 0.3 mm; sizes are the drawn
 * geometry rather than the drawn geometry plus its ink.
 *
 * The census the form yields is exact and matches the prose: **160 pads** at 59.0 x 59.0 units
 * (9.99 mm square), **15 knobs** as 4-segment circles at 70.9 units (12.00 mm), **11 buttons** at
 * 94.7 units (16.03 mm) — p.60's fifteen rotary knobs, and p.16's five screen buttons plus six
 * function buttons. The sixteenth circle is the clickable (Screen) encoder at 14.00 mm.
 *
 * One thing the vector shows that a render obscures: **the pad field is one uniform grid.** All
 * twenty columns sit on a 13.04 mm pitch, including the step-to-function boundary, where the gap
 * is 13.040 mm — the same as everywhere else. The 16 + 4 split is functional, drawn only by the
 * labels beneath the last four columns, so the two grids below are adjacent rather than separated.
 *
 * ## Where the voice field goes
 *
 * **On the track-function columns, not the step grid**, and the difference is one the library has
 * already paid for once. `PanelFeature` asks for the field to go "where the box's own voice or
 * track selection lives", and on this box that is exact: p.43 names the gesture — *"Tap the
 * [Select] Pad, column 20, last on the right for the respective track to select"* — and p.42
 * groups the last four columns as the per-track controls, *"which includes mute, solo, variation
 * and select"*. The rectangle below covers the selection end of that block, columns 18 to 20.
 *
 * The step grid was the obvious place and it is the wrong one. Rows there really are tracks (p.42,
 * "Tracks are structural elements represented by pad rows"), so the semantics are fine; the
 * geometry is not. Handing sixteen cells that region makes each one 47.6 mm across against a
 * 10 mm pad — the failure `rack.test.ts` records finding in Chrome on the Deluge, where a voice
 * field over the whole 16 x 8 grid "stopped reading as a Deluge".
 *
 * One honest mismatch, recorded rather than smoothed over: the panel has **eight** pad rows and
 * the box has **sixteen** tracks (p.42, "8 for MIDI / Synths and 8 sample tracks"). The grid shows
 * one bank at a time and `[Shift] + [Audio/MIDI]` swaps which (p.92), so no arrangement of this
 * drawing can show all sixteen assignables in their own rows. The field lets the renderer lay its
 * cells out and is not claiming a row-for-row correspondence.
 */
export const PLAY_PLUS_PANEL: PanelLayout = {
  panelRiseMm: 207,
  verified: {
    kind: 'manual',
    source: 'Polyend Play+ Manual Rev 2, p.15 (1.2 Hardware Overview)',
  },
  features: [
    // The wordmark cluster spans x 10.41..68.39, y 6.29..13.93 in the figure.
    { kind: 'label', x: 10.4, y: 12.5, text: 'Play+', align: 'start' },

    // The display, with two of the five dynamic screen buttons stacked down its left side. p.18:
    // "The two left side dynamic buttons also can be used to select between the two upper and
    // lower parameters." Their centres sit at y 28.20 and 53.08 — deliberately not aligned with
    // the knob rows to their right, which the vector shows and a glance does not.
    { kind: 'screen', x: 31.02, y: 17.93, w: 59.70, h: 45.24 },
    { kind: 'button', x: 10.69, y: 20.19, w: 16.03, h: 16.02 },
    { kind: 'button', x: 10.69, y: 45.07, w: 16.03, h: 16.02 },

    // The clickable (Screen) encoder, and the remaining three screen buttons in a row beside it.
    { kind: 'knob', x: 11.70, y: 67.76, d: 14.0, label: 'SCREEN' },
    { kind: 'button', x: 32.52, y: 66.68, w: 16.03, h: 16.02 },
    { kind: 'button', x: 52.43, y: 66.68, w: 16.03, h: 16.02 },
    { kind: 'button', x: 72.34, y: 66.68, w: 16.03, h: 16.02 },

    // The 15 parameter knobs, 5 across and 3 down on a 26.29 x 24.38 mm pitch (p.60: "The 15
    // rotary knobs are used to set the parameter values. Each knob controls two parameters").
    // Labelled with the primary only — the secondary is the same knob double-tapped, so a second
    // label would draw a control that is not there. Row 1.
    { kind: 'knob', x: 101.89, y: 20.0, d: 12.0, label: 'MASTER VOL' },
    { kind: 'knob', x: 128.18, y: 20.0, d: 12.0, label: 'NOTE' },
    { kind: 'knob', x: 154.47, y: 20.0, d: 12.0, label: 'SAMPLE' },
    { kind: 'knob', x: 180.76, y: 20.0, d: 12.0, label: 'REVERB SEND' },
    { kind: 'knob', x: 207.05, y: 20.0, d: 12.0, label: 'CHANCE' },
    // Row 2.
    { kind: 'knob', x: 101.89, y: 44.37, d: 12.0, label: 'TEMPO' },
    { kind: 'knob', x: 128.18, y: 44.37, d: 12.0, label: 'VOLUME' },
    { kind: 'knob', x: 154.47, y: 44.37, d: 12.0, label: 'SAMPLE START' },
    { kind: 'knob', x: 180.76, y: 44.37, d: 12.0, label: 'OVERDRIVE' },
    { kind: 'knob', x: 207.05, y: 44.37, d: 12.0, label: 'RANDOMIZE' },
    // Row 3.
    { kind: 'knob', x: 101.89, y: 68.76, d: 12.0, label: 'TRACK LENGTH' },
    { kind: 'knob', x: 128.18, y: 68.76, d: 12.0, label: 'FILTER CUTOFF' },
    { kind: 'knob', x: 154.47, y: 68.76, d: 12.0, label: 'SAMPLE ATTACK' },
    { kind: 'knob', x: 180.76, y: 68.76, d: 12.0, label: 'REPEAT TYPE' },
    { kind: 'knob', x: 207.05, y: 68.76, d: 12.0, label: 'MOVE' },

    // The six function buttons in two columns right of the knobs, top to bottom as p.16 numbers
    // them: Fill / Patterns, Save / Copy, View / Shift.
    { kind: 'button', x: 229.91, y: 17.99, w: 16.03, h: 16.02, label: 'FILL' },
    { kind: 'button', x: 255.96, y: 17.99, w: 16.03, h: 16.02, label: 'PATTERNS' },
    { kind: 'button', x: 229.91, y: 42.36, w: 16.03, h: 16.02, label: 'SAVE' },
    { kind: 'button', x: 255.96, y: 42.36, w: 16.03, h: 16.02, label: 'COPY' },
    { kind: 'button', x: 229.91, y: 66.68, w: 16.03, h: 16.02, label: 'VIEW' },
    { kind: 'button', x: 255.96, y: 66.68, w: 16.03, h: 16.02, label: 'SHIFT' },

    // The 8 x 20 pad field, drawn as the two blocks p.16 and p.42 describe: sixteen step columns
    // and four function columns (Mute, Solo, Variation, Select). One 13.04 mm pitch throughout,
    // so the two sit flush — the boundary is a label, not a gap.
    { kind: 'grid', x: 12.81, y: 92.78, w: 204.90, h: 101.57, cols: 16, rows: 8, shape: 'pad', label: 'STEPS' },
    { kind: 'grid', x: 220.75, y: 92.78, w: 49.12, h: 101.57, cols: 4, rows: 8, shape: 'pad' },

    // The readout, on the Solo / Variation / Select columns. See the header for why it is here
    // and not on the step grid.
    { kind: 'voices', x: 233.79, y: 92.78, w: 36.08, h: 101.57, label: 'TRACK' },
  ],
}
