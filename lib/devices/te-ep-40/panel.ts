import type { PanelLayout } from '../../core/device'

/**
 * §10. The EP–40 riddim front panel, **measured off teenage engineering's own published front
 * view and redrawn here**. No vendor artwork is embedded, traced or shipped: what follows is a
 * list of measured rectangles and their labels, and the rack draws our own panel from it.
 *
 * ## The figure, and why its provenance is `maker` rather than `manual`
 *
 * This box publishes no PDF and its web guide's images did not survive the mirror in
 * `manuals/te-ep-40/`. `manuals/te-ep-40/VERSION` carries the warning that the sibling earned the
 * hard way — *"absence here is absence OF IMAGES, never evidence that a figure does not exist"* —
 * so the live hardware-overview page was opened and its linked assets listed. It carries four
 * vector views, and one of them prints the word `FRONT` across the top:
 *
 *     https://assets.teenage.engineering/_img/69033ff84b343523886b5edb_opt.svg
 *
 * 442 × 553, 70 paths, no raster and no perspective. It is not in the guide, so `verified` is
 * `kind: 'maker'` — the same kind `physical.verified` carries, for the same reason: a figure the
 * manufacturer publishes outside the manual, checkable by anyone with the link.
 *
 * **The other three views were measured too, and two of them corroborate the thickness.** The
 * side views are 26.60 × 400.00 units against this drawing's 289.00 × 394.00; at this figure's own
 * scale that edge is 16.2 mm, against the published 16 mm. A back view at 287.82 × 391.84 carries
 * two corner fixings and none of the controls, which is how the front was picked rather than
 * guessed.
 *
 * ## The method, and the two checks that make the numbers believable
 *
 * `lib/devices/moog-dfam/panel.ts` is the worked example and `lib/devices/te-ep-133/panel.ts` is
 * the same method on a vector source, which is what this is: control positions are the **path
 * bounding boxes the drawing itself declares**, parsed out of the `d` attributes rather than
 * estimated off pixels, with compound paths split at every `M` so a row of four buttons drawn as
 * one path yields four boxes.
 *
 * **The aspect check comes first, and it settles the orientation** (§2.3). The panel face
 * measures **289.00 × 394.00** units, an aspect of **0.73350**. teenage engineering publish
 * `240 x 176 x 16 mm`, and 176/240 is **0.73333** — agreement to 0.023%, where 240/176 would be
 * 1.364 and wrong by 86%. **So this box is portrait in playing orientation: 176 mm across, 240 mm
 * down.** The 16 mm is the thickness and is not this field.
 *
 * **The second check is that the recovered grid is a grid.** Scaling by 176/289.00 and 240/394.00
 * — two scales that agree to one part in four thousand — puts every control on an **8 mm
 * module**: the columns land at 7.7/7.8, 31.7, 55.7, 79.7, 103.6, 127.5 and 151.4, the rows at
 * 112.2, 136.3, 160.3, 184.3 and 208.2, and the panel edges at exactly 0 and 176/240. A
 * measurement that recovers a designer's round numbers to within three tenths of a millimetre is
 * a measurement that worked; an estimate does not do that.
 *
 * ## This is the K.O. II chassis with different graphics on it
 *
 * Worth saying plainly, because it is the sort of coincidence that looks like a copied file. The
 * columns and rows recovered here land within 0.3 mm of the ones
 * `lib/devices/te-ep-133/panel.ts` recovered from a **different** drawing on a different canvas
 * (440 × 511 there, 442 × 553 here), and both boxes publish the same `240 x 176 x 16 mm`. The two
 * panels were measured independently and agree; nothing here is inherited from that file.
 *
 * What is *not* shared is the printing, and that is where the two boxes part company:
 *
 *  - The nameplate reads **RIDDIM**, with `SUPERTONE` under it and `ORIGINAL LAYERING MACHINE`
 *    along the bottom of the plate.
 *  - The perforated block is **eleven horizontal slots with a disc behind them**, counted off the
 *    drawing, rather than the K.O. II's 14 × 12 field of holes.
 *  - **The four group pads carry pictograms, not the letters `A`–`D`.** Top to bottom: a drum, a
 *    bass guitar, a pair of keyboard rows, and a disc. See the note at the group buttons below.
 *  - A bracket printed `LIVE` spans the `SOUND` and `MAIN` buttons, which is the combination
 *    guide 8.4 gives for live state — the panel stating a shortcut the prose also states.
 *
 * ## What the figure settles that nineteen pages of text did not
 *
 * Guide 9.5 says *"the fader assignments can be found printed above the pads"* and never lists
 * them. They are printed above the pads, and this is that drawing — one per sample pad, in pad
 * order:
 *
 *     7 LEVEL    8 PITCH    9 TIME
 *     4 LPF      5 HPF      6 → FX
 *     1 ATK      2 REL      3 PAN
 *     . TUNE     0 VEL      ENTER MOD
 *
 * Twelve, matching the twelve pads. They are recorded in the manifest's module JSDoc rather than
 * drawn as twelve silkscreen labels here, because at 176 mm across a label per pad is noise on a
 * diagram whose job is proportion and control clusters — the same call `te-ep-133/panel.ts` made.
 *
 * The figure also confirms the pad legends the MIDI note map implies — the twelve pads are a
 * numpad reading `.`, `0`, `enter`, `1`–`9`, so `ENTER` is a sample pad and not a function key —
 * and it names the two knobs' secondary functions, `GAIN` under `BPM` on X and `SWING` under
 * `METRONOME` on Y, which corroborates the guide's tempo and timing pages from the panel side.
 *
 * ## Three things read off the drawing and deliberately under-claimed
 *
 *  - **The dark band at y 56.5–104.4 is drawn as the `screen`.** It is a plain dark rectangle
 *    with a lighter diagonal wedge across it — an unlit window with a specular reflection, which
 *    is how this maker draws a display in a flat front view. The drawn box is the **glass**, not
 *    the active area: the figure does not delimit the segments, so nothing here claims to.
 *  - **The slotted block is a `grid` and is not called a speaker.** Eleven horizontal bars on a
 *    3.99 mm pitch with a 40 mm disc behind them, filling 56 × 47.9 mm at the top right. The
 *    guide never mentions it in nineteen pages, so the label describes what is drawn rather than
 *    what is behind it.
 *  - **The connector strip is a legend, not a row of sockets.** The sockets are on the top edge,
 *    which a front view cannot show; what the front face carries is the silkscreen naming them,
 *    with `i`/`o` marks over `SYNC` and over `MIDI`. So they are `label` features at their
 *    measured positions. `PanelFeature` has no jack kind by design, and the jacks themselves are
 *    declared in `index.ts` where they are cited.
 *
 * ## The voice field is the group column *and* the pads
 *
 * `PanelFeature`'s own words are *"put it where the box's own voice or track selection lives"*,
 * and on this box that is both columns: the twelve pads are where a sample sounds from, and the
 * four group pads immediately to their left choose which twelve of the forty-eight you are
 * addressing. Forty-eight assignables is twelve pads times four groups, and the pair of columns
 * is the gesture that reaches all of them. The measured region is square — 87.8 × 87.8 mm — which
 * is what `test/rack.test.ts`'s coverage floor needs a forty-eight-cell field to be.
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

export const EP_40_PANEL: PanelLayout = {
  panelRiseMm: RISE_MM,

  verified: {
    kind: 'maker',
    source:
      'teenage engineering EP–40 riddim front view, assets.teenage.engineering/_img/69033ff84b343523886b5edb_opt.svg, fetched 2026-08-28',
  },

  features: [
    // -----------------------------------------------------------------------
    // Upper third: nameplate, slotted block, display. Drawn first, so controls
    // sit over them.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 0, y: 8.5, w: 119.7, h: 47.9, label: 'RIDDIM' },
    { kind: 'grid', x: 119.6, y: 8.5, w: 56, h: 47.9, cols: 1, rows: 11, label: 'grille' },
    { kind: 'screen', x: 0, y: 56.5, w: 175.7, h: 47.9 },

    // -----------------------------------------------------------------------
    // The top-edge connector legend (see the note above: silkscreen, not sockets).
    // OUTPUT, INPUT, USB and POWER are cells; SYNC and MIDI share one cell and
    // are two labels inside it, each under its own i/o marks.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 15.8, y: 5.5, text: 'OUTPUT', align: 'middle' },
    { kind: 'label', x: 47.8, y: 5.5, text: 'INPUT', align: 'middle' },
    { kind: 'label', x: 76.1, y: 5.5, text: 'SYNC', align: 'middle' },
    { kind: 'label', x: 91.8, y: 5.5, text: 'MIDI', align: 'middle' },
    { kind: 'label', x: 135.6, y: 5.5, text: 'USB', align: 'middle' },
    { kind: 'label', x: 159.4, y: 5.5, text: 'POWER', align: 'middle' },

    // -----------------------------------------------------------------------
    // Knob row. The two on the right carry a second legend each — GAIN under BPM,
    // SWING under METRONOME — and a bracket printed LIVE spans SOUND and MAIN.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 15.8, y: 108.4, text: 'VOLUME', align: 'middle' },
    { kind: 'knob', x: 7.7, y: 112.2, d: 16.2, label: 'VOLUME' },
    { kind: 'label', x: 49.8, y: 108.4, text: 'LIVE', align: 'middle' },
    { kind: 'label', x: 133, y: 108.4, text: 'BPM', align: 'middle' },
    { kind: 'knob', x: 127.5, y: 112.2, d: 16.2, label: 'X · BPM / GAIN' },
    { kind: 'label', x: 159.6, y: 108.4, text: 'METRONOME', align: 'middle' },
    { kind: 'knob', x: 151.4, y: 112.2, d: 16.2, label: 'Y · METRONOME / SWING' },

    // Mode buttons, on the same row as the knobs.
    split(31.7, 112.4, 16.1, 16.1, 'SOUND', 'EDIT'),
    split(55.7, 112.4, 16.1, 16.1, 'MAIN', 'COMMIT'),
    split(79.7, 112.3, 16.1, 16.1, 'TEMPO', 'LOOP'),

    // -----------------------------------------------------------------------
    // Left column: the three modifiers and the fader between them. The fader's
    // box is the cap's measured diameter by the slot's measured travel.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 7.8, y: 136.3, w: 16, h: 8.1, label: 'KEYS' },
    { kind: 'button', x: 7.8, y: 152.3, w: 16, h: 8.1, label: 'FADER' },
    { kind: 'grid', x: 9.1, y: 168.7, w: 13.4, h: 39.2, cols: 1, rows: 1, shape: 'fader' },
    { kind: 'button', x: 7.8, y: 216.1, w: 16, h: 8.1, label: 'SHIFT' },

    // -----------------------------------------------------------------------
    // Group pads. Four, and they select which bank of twelve the pads address.
    //
    // The panel prints pictograms rather than letters, so the labels below say
    // what is drawn. The guide names the same four `a`-`d` top to bottom, and
    // its recommended layout (7.1 step 3) is drums, bass, melodies, loops — the
    // same order as the drawings, which is why `index.ts` treats the pictograms
    // as the guide's advice printed on the box rather than as a constraint.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 31.7, y: 136.4, w: 16, h: 16, label: 'drum' },
    { kind: 'button', x: 31.7, y: 160.3, w: 16, h: 16, label: 'bass' },
    { kind: 'button', x: 31.7, y: 184.3, w: 16, h: 16, label: 'keys' },
    { kind: 'button', x: 31.7, y: 208.2, w: 16, h: 16, label: 'disc' },

    // -----------------------------------------------------------------------
    // The one region the resolver writes into: group column plus pads, which is
    // the gesture that reaches all forty-eight. See the note above.
    // -----------------------------------------------------------------------
    { kind: 'voices', x: 31.7, y: 136.4, w: 87.8, h: 87.8, label: 'Groups A-D · pads' },

    // -----------------------------------------------------------------------
    // Right column: the function pairs, then the transport.
    // -----------------------------------------------------------------------
    split(127.6, 136.4, 16, 16, 'SAMPLE', 'CHOP'),
    split(151.5, 136.4, 16.1, 16, 'TIMING', 'CORRECT'),
    split(127.6, 160.3, 16, 16, 'FX', 'OUTPUT'),
    split(151.5, 160.3, 16.1, 16, 'ERASE', 'SYSTEM'),
    { kind: 'button', x: 127.6, y: 184.3, w: 16, h: 16, label: '−' },
    { kind: 'button', x: 151.5, y: 184.3, w: 16.1, h: 16, label: '+' },
    { kind: 'button', x: 127.6, y: 208.2, w: 16, h: 16, label: 'RECORD' },
    { kind: 'button', x: 151.5, y: 208.2, w: 16.1, h: 16, label: 'PLAY' },
  ],
}

/**
 * Every feature falls inside the panel — `DeviceSchema` enforces it against `physical.panelSpanMm`
 * and `panelRiseMm`, and this is the same claim stated where the numbers are, so a coordinate
 * edited by hand fails here rather than three files away.
 */
export const EP_40_PANEL_BOX = { spanMm: SPAN_MM, riseMm: RISE_MM }
