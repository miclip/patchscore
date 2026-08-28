import type { PanelLayout } from '../../core/device'

/**
 * §10. The EP–133 K.O. II front panel, **measured off teenage engineering's own published front
 * view and redrawn here**. No vendor artwork is embedded, traced or shipped: what follows is a
 * list of measured rectangles and their labels, and the rack draws our own panel from it.
 *
 * ## The figure, and why its provenance is `maker` rather than `manual`
 *
 * This box publishes no PDF, and its web guide's images did not survive the mirror in
 * `manuals/te-ep-133/` — which is why an earlier draft of this device shipped with no panel at
 * all. That was wrong, and the figure it missed is a **complete, unobstructed, fully-labelled
 * vector front view** linked from the live hardware-overview page:
 *
 *     https://assets.teenage.engineering/_img/69787b2c965bf01b27d19664_opt.svg
 *
 * 440 × 511, 68 paths, no raster and no perspective. It is not in the manual, so `verified` is
 * `kind: 'maker'` — #191's third kind, the same one `physical.verified` carries for the same
 * reason: a figure the manufacturer publishes outside the manual, checkable by anyone with the
 * link. `test/rack.test.ts` accepts `manual` or `maker` for a drawing and nothing else.
 *
 * ## The method, and the two checks that make the numbers believable
 *
 * `lib/devices/moog-dfam/panel.ts` is the worked example and this follows it, with the step that
 * needs a rasteriser replaced by one that does not: the source is vector, so control positions
 * are the **path bounding boxes the drawing itself declares**, parsed out of the `d` attributes
 * rather than estimated off pixels. Compound paths were split at every `M` so that a row of four
 * pads drawn as one path yields four boxes.
 *
 * **The aspect check comes first, and it settles the orientation** (§2.3). The outline path
 * measures **288.545 × 393.520** units, an aspect of **0.73324**. teenage engineering publish
 * `240 mm x 176 mm x 16 mm`, and 176/240 is **0.73333** — agreement to 0.013%, where 240/176
 * would be 1.364 and wrong by 86%. **So this box is portrait in playing orientation: 176 mm
 * across, 240 mm down.** An earlier draft had the span at 240 by reading the specification's
 * first figure as the width, which is the trap `PanelLayout.panelRiseMm`'s own doc-comment warns
 * about, sprung from the other side.
 *
 * **The second check is that the recovered grid is a grid.** Scaling by 176/288.545 and
 * 240/393.520 — two scales that agree to one part in eight thousand — puts nearly every control
 * on an **8 mm module**: the button columns land at 8.0, 32.0, 56.0, 80.0, 128.0 and 151.9, the
 * rows at 112.0, 136.0, 160.0, 184.0 and 207.9, and the panel edges at exactly 0 and 176/240. A
 * measurement that recovers a designer's round numbers to a tenth of a millimetre is a
 * measurement that worked; an estimate does not do that.
 *
 * ## What the figure settles that nineteen pages of text did not
 *
 * The guide says *"the fader assignments can be found printed above the pads"* and never lists
 * them, and the changelog gets as far as *"(level, pitch, pan, etc.)"*. **They are printed above
 * the pads, and this is that drawing**, one per sample pad in pad order:
 *
 *     7 LEVEL    8 PITCH    9 TIME
 *     4 LPF      5 HPF      6 → FX
 *     1 ATK      2 REL      3 PAN
 *     . TUNE     0 VEL      ENTER MOD
 *
 * They are recorded in the manifest's module JSDoc rather than drawn as twelve silkscreen labels
 * here, because at 176 mm across a label per pad is noise on a diagram whose job is proportion
 * and control clusters.
 *
 * The figure also confirms the pad legends the MIDI note map implies — the twelve pads are a
 * numpad reading `.`, `0`, `enter`, `1`–`9`, so `ENTER` is a sample pad and not a function key —
 * and it names the two knobs' secondary functions, `GAIN` under `BPM` on X and `SWING` under
 * `METRONOME` on Y, which corroborates the guide's tempo and timing pages from the panel side.
 *
 * ## Three things read off the drawing and deliberately under-claimed
 *
 *  - **The dark band at y 56–104 is drawn as the `screen`.** It is a plain black rectangle with a
 *    lighter diagonal wedge across it — an unlit window with a specular reflection, which is how
 *    this maker draws a display in a flat front view. Nothing else on the panel could be the
 *    display the guide describes (*"a custom display that features 66 unique icons"*, and a
 *    *"segment display"* in its error codes), and every other region is accounted for. The drawn
 *    box is the **glass**, not the active area: the figure does not delimit the segments, so
 *    nothing here claims to.
 *  - **The perforated block is a `grid` and is not called a speaker.** 14 columns × 12 rows of
 *    holes — counted from the 168 subpaths that draw them, not estimated — filling 56 × 48 mm at
 *    the top right. The guide never mentions it in nineteen pages, so the label describes what is
 *    drawn rather than what is behind it.
 *  - **The connector strip is a legend, not a row of sockets.** The sockets are on the top edge,
 *    which a front view cannot show; what the front face carries is the silkscreen naming them,
 *    with `i`/`o` marks over `SYNC` and over `MIDI`. So they are `label` features at their
 *    measured positions. `PanelFeature` has no jack kind by design, and the jacks themselves are
 *    declared in `index.ts` where they are cited.
 *
 * ## The voice field is the group column *and* the pads, and that took two goes
 *
 * `PanelFeature`'s own words are *"put it where the box's own voice or track selection lives"*,
 * and on this box that is both columns: the twelve pads are where a sample sounds from, and
 * `A`–`D` immediately to their left choose which twelve of the forty-eight you are addressing.
 * Forty-eight assignables is twelve pads times four groups, and the pair of columns is the
 * gesture that reaches all of them.
 *
 * **The first draft used the pad block alone and the rack caught it.** Forty-eight cells in a
 * region drawn for twelve packs to 54% coverage — under `test/rack.test.ts`'s 55% floor — because
 * the field was a third narrower than the thing it had to hold. Taking in the group column makes
 * the region square, 86.9 × 86.9 mm, and the same packer fills it. The test was measuring the
 * right thing: a voice field that cannot hold its own assignables is drawn in the wrong place.
 */

/** Panel-local millimetres, origin top-left, in normal playing orientation. */
const SPAN_MM = 176
const RISE_MM = 240

/**
 * A button whose face is split into two legends — `SOUND` over `EDIT`, `MAIN` over `COMMIT`.
 * There is one control under the pair, so it is one feature, and the label is the pair as the
 * panel prints it.
 */
function split(x: number, y: number, w: number, h: number, top: string, bottom: string) {
  return { kind: 'button' as const, x, y, w, h, label: `${top} / ${bottom}` }
}

export const EP_133_PANEL: PanelLayout = {
  panelRiseMm: RISE_MM,

  verified: {
    kind: 'maker',
    source:
      'teenage engineering EP–133 K.O. II front view, assets.teenage.engineering/_img/69787b2c965bf01b27d19664_opt.svg, fetched 2026-08-28',
  },

  features: [
    // -----------------------------------------------------------------------
    // Upper third: nameplate, grille, display. Drawn first, so controls sit over them.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 0, y: 8, w: 119.9, h: 48, label: 'K.O. II' },
    { kind: 'grid', x: 120, y: 8, w: 56, h: 48, cols: 14, rows: 12, label: 'grille' },
    { kind: 'screen', x: 0, y: 56, w: 176, h: 47.9 },

    // -----------------------------------------------------------------------
    // The top-edge connector legend (see the note above: silkscreen, not sockets).
    // -----------------------------------------------------------------------
    { kind: 'label', x: 16, y: 5.5, text: 'OUTPUT', align: 'middle' },
    { kind: 'label', x: 48, y: 5.5, text: 'INPUT', align: 'middle' },
    { kind: 'label', x: 76, y: 5.5, text: 'SYNC', align: 'middle' },
    { kind: 'label', x: 92, y: 5.5, text: 'MIDI', align: 'middle' },
    { kind: 'label', x: 136, y: 5.5, text: 'USB', align: 'middle' },
    { kind: 'label', x: 160, y: 5.5, text: 'POWER', align: 'middle' },

    // -----------------------------------------------------------------------
    // Knob row. The two on the right carry a second legend each — GAIN under BPM,
    // SWING under METRONOME — which the guide's tempo and timing pages describe.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 16, y: 109, text: 'VOLUME', align: 'middle' },
    { kind: 'knob', x: 7.9, y: 111.8, d: 16.2, label: 'VOLUME' },
    { kind: 'label', x: 136, y: 109, text: 'BPM', align: 'middle' },
    { kind: 'knob', x: 127.9, y: 111.8, d: 16.2, label: 'X · BPM / GAIN' },
    { kind: 'label', x: 160, y: 109, text: 'METRONOME', align: 'middle' },
    { kind: 'knob', x: 151.9, y: 111.8, d: 16.2, label: 'Y · METRONOME / SWING' },

    // Mode buttons, on the same row as the knobs.
    split(32, 112, 16.1, 16.1, 'SOUND', 'EDIT'),
    split(56, 112, 16.1, 16.1, 'MAIN', 'COMMIT'),
    split(80, 111.9, 16.1, 16.1, 'TEMPO', 'LOOP'),

    // -----------------------------------------------------------------------
    // Left column: the three modifiers and the fader between them.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 8, y: 136, w: 16, h: 8.1, label: 'KEYS' },
    { kind: 'button', x: 8, y: 151.9, w: 16, h: 8.1, label: 'FADER' },
    { kind: 'grid', x: 11.8, y: 168.3, w: 6.8, h: 39.3, cols: 1, rows: 1, shape: 'fader' },
    { kind: 'button', x: 8, y: 215.8, w: 16, h: 8.1, label: 'SHIFT' },

    // -----------------------------------------------------------------------
    // Group pads. Four, and they select which bank of twelve the pads address.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 32.5, y: 136.5, w: 15, h: 15, label: 'A' },
    { kind: 'button', x: 32.5, y: 160.5, w: 15, h: 15, label: 'B' },
    { kind: 'button', x: 32.5, y: 184.5, w: 15, h: 15, label: 'C' },
    { kind: 'button', x: 32.5, y: 208.4, w: 15, h: 15, label: 'D' },

    // -----------------------------------------------------------------------
    // The one region the resolver writes into: group column plus pads, which is
    // the gesture that reaches all forty-eight. See the note above.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: 32.5, y: 136.5, w: 86.9, h: 86.9, label: 'Groups A-D · pads' },

    // -----------------------------------------------------------------------
    // Right column: the function pairs, then the transport.
    // -----------------------------------------------------------------------
    split(128, 136, 16, 16, 'SAMPLE', 'CHOP'),
    split(151.9, 136, 16.1, 16, 'TIMING', 'CORRECT'),
    split(128, 160, 16, 16, 'FX', 'OUTPUT'),
    split(151.9, 160, 16.1, 16, 'ERASE', 'SYSTEM'),
    { kind: 'button', x: 128, y: 184, w: 16, h: 16, label: '−' },
    { kind: 'button', x: 151.9, y: 184, w: 16.1, h: 16, label: '+' },
    { kind: 'button', x: 128, y: 207.9, w: 16, h: 16, label: 'RECORD' },
    { kind: 'button', x: 151.9, y: 207.9, w: 16.1, h: 16, label: 'PLAY' },
  ],
}

/**
 * Every feature falls inside the panel — `DeviceSchema` enforces it against `physical.panelSpanMm`
 * and `panelRiseMm`, and this is the same claim stated where the numbers are, so a coordinate
 * edited by hand fails here rather than three files away.
 */
export const EP_133_PANEL_BOX = { spanMm: SPAN_MM, riseMm: RISE_MM }
