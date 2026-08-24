import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the CRAVE's top panel.
 *
 * Measured off the clean plan view on printed p.18 of the Quick Start Guide — the one full-panel
 * drawing in the document — by taking normalised positions off a 200 dpi render and multiplying
 * them into the panel's own millimetres. Our own geometry and line weights; nothing traced,
 * extracted or embedded.
 *
 * **The aspect was checked, and the check is more interesting than usual.** The drawn panel
 * *face* measures 1.919 : 1 and the drawing *including the side mounting brackets* measures
 * 1.994 : 1. The specification's `320 / 164` is 1.951, which sits between them — so the 320 mm
 * width evidently includes the brackets while the playing surface is a little narrower. §10 says
 * to resist end cheeks and there is a second reason to here, the same one the Cascadia records:
 * the published width already contains them, so drawing a bracket would put the panel proper
 * somewhere narrower than the number claims and make the rack subtly wrong.
 *
 * **The bands are the drawing**, and their heights are measured rather than eyeballed:
 *
 *  1. **25%** — two MIDI DIN sockets, then the whole patchbay, straight across the top;
 *  2. **27%** — OSCILLATOR (VCO) | FILTER (VCF) | OUTPUT (VCA);
 *  3. **19%** — ENVELOPE | MODULATION | UTILITY;
 *  4. **29%** — SEQUENCER, with the 13-note keyboard filling its right half.
 *
 * **Bands 2 and 3 share one eight-column grid**, which is the fact that makes this panel readable
 * and the thing a simplified drawing most needs to get right. FREQUENCY sits directly above
 * ATTACK, CUTOFF directly above LFO RATE, VOLUME directly above VC MIX. Column 1 of band 2 has no
 * switch under its knob because that is where the CRAVE wordmark is printed.
 *
 * **The patchbay's inputs and outputs divide by column, not by row.** Columns 1-9 are inputs in
 * both rows and columns 10-17 are outputs in both rows, which is why the manual's own numbering
 * runs 40-48 along the top and then jumps to 58. The panel says which is which typographically —
 * input labels dark on light, outputs light on dark, with a two-cell `IN`/`OUT` key in the last
 * slot of the lower row — and none of that survives into `PanelFeature`, so the drawing carries
 * the sockets and `index.ts` carries the direction.
 *
 * **There is no jack in this vocabulary**, exactly as the Cascadia records. `PanelFeature` offers
 * screen, knob, button, grid, voices, label and group, so the thirty-three patch points and two
 * DIN sockets are drawn as `grid` blocks — §10's "a block of identical controls", decorative and
 * binding nothing. This layout therefore carries **no named jack positions** and cannot be the
 * coordinate source for an intra-panel cable, which is a fact about the shape rather than an
 * omission here.
 *
 * **No screen is drawn, because the box has none.** The CRAVE reports state through the eight
 * OCTAVE/LOCATION LEDs (p.20 item 29) and nothing else; those are a `grid` of pads. A `screen`
 * would claim a readout this box cannot produce.
 *
 * The voice field sits in OUTPUT (VCA), the section the one voice finally passes through.
 */

/** Band boundaries in mm, from the measured shares of a 164 mm rise. */
const PATCH_TOP = 2
const BAND2 = 41.5
const BAND3 = 86
const BAND4 = 117
const BOTTOM = 162

/**
 * The eight columns bands 2 and 3 share, in mm across a 320 mm panel. Measured, not spaced
 * evenly: there is an extra hair of gap where the VCO and VCF sections meet.
 */
const COL = [23.4, 62.1, 101.1, 139.8, 180.2, 218.9, 257.6, 296.3] as const

const KNOB_D = 13.8

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, label?: string): PanelFeature {
  return {
    kind: 'knob',
    x: cx - KNOB_D / 2,
    y: cy - KNOB_D / 2,
    d: KNOB_D,
    ...(label === undefined ? {} : { label }),
  }
}

/**
 * A two-position slide switch. Drawn as a button because the vocabulary has no toggle: these are
 * the switches that set SHAPE, MOD SOURCE, MOD DEST and the rest, and a button is the closest
 * honest shape for "a small control with two named positions".
 */
function toggle(cx: number, cy: number, label?: string): PanelFeature {
  return { kind: 'button', x: cx - 6, y: cy - 2.6, w: 12, h: 5.2, ...(label === undefined ? {} : { label }) }
}

/** A block of sockets. Drawn as pads because the vocabulary has no jack; see above. */
function sockets(x: number, y: number, w: number, h: number, cols: number, rows: number): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols, rows, shape: 'pad' }
}

export const CRAVE_PANEL: PanelLayout = {
  panelRiseMm: 164,
  verified: {
    kind: 'manual',
    source: 'CRAVE Quick Start Guide BE_0718-AAJ_WW, p.18 (CRAVE Controls)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Band 1 — MIDI, then the patchbay (pp.18, 21).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 4.5, y: PATCH_TOP, w: 312, h: BAND2 - PATCH_TOP - 2, label: 'PATCHBAY' },
    // MIDI IN and MIDI OUT/THRU (items 38, 39), larger than the 3.5 mm sockets and straddling
    // both jack rows. On the top panel, not the back: the rear carries only four things.
    sockets(16.5, 13.5, 38, 28, 2, 1),
    // Seventeen sockets over sixteen: the last slot of the lower row is the IN / OUT legend
    // rather than a jack, which a simplified drawing is not the place to encode.
    sockets(61.3, 16.7, 242.5, 8, 17, 1),
    sockets(61.3, 30.8, 242.5, 8, 17, 1),

    // -----------------------------------------------------------------------
    // Band 2 — the voice path, left to right, in signal order (p.18).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 4.5, y: BAND2, w: 155, h: BAND3 - BAND2 - 2, label: 'OSCILLATOR (VCO)' },
    knob(COL[0], 59.7, 'FREQUENCY'),
    knob(COL[1], 59.7, 'PULSE WIDTH'),
    knob(COL[2], 59.7, 'OSC MOD'),
    knob(COL[3], 59.7, 'MIX'),
    // No switch in column 1: that is where the CRAVE wordmark is printed.
    toggle(COL[1], 80.2, 'SHAPE'),
    toggle(COL[2], 80.2, 'MOD SOURCE'),
    toggle(COL[3], 80.2, 'MOD DEST'),

    { kind: 'group', x: 159.4, y: BAND2, w: 117, h: BAND3 - BAND2 - 2, label: 'FILTER (VCF)' },
    knob(COL[4], 59.7, 'CUTOFF'),
    knob(COL[5], 59.7, 'RESONANCE'),
    knob(COL[6], 59.7, 'VCF MOD'),
    toggle(COL[4], 80.2, 'MODE'),
    toggle(COL[5], 80.2, 'MOD SOURCE'),
    toggle(COL[6], 80.2, 'MOD POLARITY'),

    { kind: 'group', x: 276.5, y: BAND2, w: 40, h: BAND3 - BAND2 - 2, label: 'OUTPUT (VCA)' },
    // This column is stacked tighter than the others to leave the voice field real depth below
    // it — see the note on the field itself.
    knob(COL[7], 55, 'VOLUME'),
    toggle(COL[7], 68, 'VCA MODE'),
    // The one voice, in the section it finally passes through.
    //
    // **Sized for shape, not just for area.** §10's packer picks a column count and one cell in a
    // wide shallow strip comes out as a slab: at 27 x 5.5 this region produced a single cell of
    // aspect 4.9 against the ceiling of 3, and took the squat-cell fallback. 27 x 10 gives 2.7,
    // which is the shape a reader can recognise as a voice rather than a rule.
    { kind: 'voices', x: 283, y: 73, w: 27, h: 10, label: 'VOICE' },

    // -----------------------------------------------------------------------
    // Band 3 — envelope, LFO and the two utilities, on the same eight columns.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 4.5, y: BAND3, w: 155, h: BAND4 - BAND3 - 2, label: 'ENVELOPE' },
    knob(COL[0], 103.2, 'ATTACK'),
    knob(COL[1], 103.2, 'DECAY'),
    knob(COL[2], 103.2, 'SUSTAIN'),
    toggle(COL[3], 103.2, 'SUSTAIN'),

    { kind: 'group', x: 159.4, y: BAND3, w: 78.4, h: BAND4 - BAND3 - 2, label: 'MODULATION' },
    knob(COL[4], 103.2, 'LFO RATE'),
    toggle(COL[5], 103.2, 'SHAPE'),

    { kind: 'group', x: 237.8, y: BAND3, w: 78.7, h: BAND4 - BAND3 - 2, label: 'UTILITY' },
    knob(COL[6], 103.2, 'GLIDE'),
    knob(COL[7], 103.2, 'VC MIX'),

    // -----------------------------------------------------------------------
    // Band 4 — the sequencer, and the 13-note keyboard filling its right half (p.20).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 4.5, y: BAND4, w: 312, h: BOTTOM - BAND4, label: 'SEQUENCER' },
    // Column 1 again — the tempo knob lines up with FREQUENCY and ATTACK above it.
    knob(COL[0], 139.2, 'TEMPO/GATE LENGTH'),

    // Eight transport and edit buttons, two rows of four (items 25-28, 31-34).
    { kind: 'grid', x: 49.6, y: 127.5, w: 56, h: 24, cols: 4, rows: 2, shape: 'pad' },
    // OCTAVE/LOCATION: eight LEDs, and the only state readout the box has. Not a screen.
    { kind: 'grid', x: 116, y: 135, w: 43, h: 4.5, cols: 8, rows: 1, shape: 'pad' },
    // <KYBD and STEP>, which move the keyboard octave (items 35, 36).
    { kind: 'grid', x: 122, y: 143.5, w: 30, h: 6.5, cols: 2, rows: 1, shape: 'pad' },

    // The 13-note keyboard. Drawn as three blocks rather than two, because the upper row is
    // grouped **2 then 3** — a real piano arrangement, C#/D# then F#/G#/A# — and evenly spacing
    // five buttons would lose the one thing that makes the row readable as a keyboard.
    { kind: 'grid', x: 176, y: 122.5, w: 30, h: 12, cols: 2, rows: 1, shape: 'key' },
    { kind: 'grid', x: 220, y: 122.5, w: 46, h: 12, cols: 3, rows: 1, shape: 'key' },
    // Eight lower keys, which double as STEP switches 1-8.
    { kind: 'grid', x: 168.8, y: 142.4, w: 122.5, h: 11.8, cols: 8, rows: 1, shape: 'key' },

    // POWER LED (item 37), the last thing on the right.
    { kind: 'grid', x: 298.5, y: 138.5, w: 4, h: 4, cols: 1, rows: 1, shape: 'pad' },
  ],
}
