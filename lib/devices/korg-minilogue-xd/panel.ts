import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the minilogue xd's top panel.
 *
 * Measured off the plan view on p.5 of the Owner's Manual — the one full-instrument drawing in
 * the document — by decoding a 400 dpi render, finding the panel outline and the section
 * rectangles by their own pixel runs, and dividing into the published footprint. Our own geometry
 * and line weights; nothing traced, extracted or embedded.
 *
 * **The aspect was checked, and it is the check that tells the two products apart.** The drawn
 * panel measures 2205 x 1345 px, or 1.640 : 1. `500 / 300` is 1.667 and `500 / 179` — the
 * *module's* footprint — is 2.79. So the drawing on p.5 is unambiguously the keyboard, and the
 * 300 mm rise is the one to divide by. Both numbers come off the same Dimensions line on p.66:
 * `minilogue xd: 500 x 300 x 85 mm`, `(W x D x H)`. For a keyboard sitting flat on a stand, the
 * surface you play is the top, so the rise is the manufacturer's **depth** — the same trap
 * `panelRiseMm` documents, and 85 mm is how far the box stands off the stand rather than a panel
 * dimension at all.
 *
 * **The bands are the drawing**, and they are measured rather than eyeballed:
 *
 *  1. **0-31 mm** — the rear connector silkscreen, which this layout deliberately omits: the
 *     sockets are on the back edge, and §10's rack already carries them on its own patch rail.
 *  2. **31-119 mm** — every knob and switch, in seven boxed sections, on three rows at
 *     `cy` 45.9, 73.8 and 101.8 mm.
 *  3. **119-152 mm** — the joystick, the sixteen buttons, and the EDIT/SEQUENCER block.
 *  4. **171-282 mm** — the 37-note keyboard.
 *
 * **Row 1 and row 2 share a column grid and row 3 does not**, which is the fact a simplified
 * drawing most needs to get right on this panel. MASTER sits directly above TEMPO, VCO 1 PITCH
 * above VCO 2 PITCH, CUTOFF above RESONANCE, AMP EG ATTACK above EG ATTACK. Row 3 breaks the
 * grid because the MULTI ENGINE display and the LFO's two switches take space no knob column
 * has, so its controls are placed where they are drawn rather than where the grid would put them.
 *
 * **Two screens, not one, and both are documented.** p.66 lists the main display as "Organic EL
 * ... with oscilloscope function" and the MULTI ENGINE section's as "7-segment LED, 6 characters
 * x 1 line". They are different readouts in different sections, so drawing one would lose the
 * thing that makes the MULTI ENGINE block legible.
 *
 * **The joystick is drawn as a knob**, because `PanelFeature` has no joystick and a knob is the
 * closest honest shape for "a round control you move by hand". The Crave records the same
 * compromise for its patch sockets: the vocabulary is closed on purpose, and picking the nearest
 * member of it beats widening it for one box.
 *
 * **The voice field sits in the VOICE MODE section**, which is exactly what §10 asks for: the
 * place the box's own voice allocation is chosen and shown. The four mode LEDs that live there
 * on the real panel are what the field replaces — one cell, because this instrument is one
 * assignable of four-note polyphony and not four assignables (see `index.ts`).
 */

/** Both figures off the p.66 Dimensions line; see the note above for which is which. */
const SPAN = 500
const RISE = 300

/** The three rows the control band is laid out on, as drawn (mm to the knob centre). */
const ROW_1 = 45.9
const ROW_2 = 73.8
const ROW_3 = 101.8

/** Every panel knob but two is this diameter. */
const KNOB_D = 14.5

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, label?: string, d = KNOB_D): PanelFeature {
  return {
    kind: 'knob',
    x: cx - d / 2,
    y: cy - d / 2,
    d,
    ...(label === undefined ? {} : { label }),
  }
}

/**
 * A vertical slide switch — WAVE, OCTAVE, SYNC, DRIVE, TARGET and the rest. Drawn as a button
 * because the vocabulary has no toggle, and tall-and-narrow because that is how they are drawn:
 * these are two- and three-position sliders, not momentary buttons.
 */
function slider(cx: number, cy: number, label?: string, h = 14): PanelFeature {
  return { kind: 'button', x: cx - 2.6, y: cy - h / 2, w: 5.2, h, ...(label === undefined ? {} : { label }) }
}

/** A column of indicator LEDs beside a switch. Decorative; the vocabulary has no LED. */
function leds(cx: number, cy: number, rows: number): PanelFeature {
  return { kind: 'grid', x: cx - 2, y: cy - rows * 2.6, w: 4, h: rows * 5.2, cols: 1, rows, shape: 'pad' }
}

// ---------------------------------------------------------------------------
// The keyboard (p.5, p.66: "37 keys (slim keyboard, velocity sensitive)")
// ---------------------------------------------------------------------------

/**
 * 37 keys is three octaves and a top C: **22 white and 15 black**, starting on C. The white keys
 * are one even grid; the black ones are drawn as six clusters, **2 then 3 per octave**, because
 * spacing fifteen of them evenly would lose the one thing that makes a row of rectangles read as
 * a keyboard. The Crave's panel makes the same call for its thirteen-note keyboard.
 */
const KEY_X = 27
const KEY_Y = 171.5
const KEY_W = 446
const KEY_H = 110.9
const WHITE_W = KEY_W / 22
const BLACK_W = 11
const BLACK_H = 66

function blacks(firstWhite: number, count: number): PanelFeature {
  return {
    kind: 'grid',
    x: KEY_X + (firstWhite + 1) * WHITE_W - BLACK_W / 2,
    y: KEY_Y,
    w: (count - 1) * WHITE_W + BLACK_W,
    h: BLACK_H,
    cols: count,
    rows: 1,
    shape: 'key',
  }
}

export const MINILOGUE_XD_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: "minilogue xd Owner's Manual E 9, p.5 (Front panel controls)",
  },
  features: [
    // -----------------------------------------------------------------------
    // 1. MASTER controls (p.5). The group is L-shaped on the panel, wrapping over the top of
    //    the VOICE MODE box; drawn here as the two columns it reads as.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 34.2, y: 31.2, w: 57.4, h: 84.8, label: 'MASTER' },
    knob(48.8, ROW_1, 'MASTER'),
    knob(77.0, ROW_1, 'PORTAMENTO'),
    knob(48.8, ROW_2, 'TEMPO'),
    // Five OCTAVE LEDs over a three-position switch: +-2 octaves of transpose (p.10).
    { kind: 'grid', x: 36, y: 92.5, w: 24, h: 4, cols: 5, rows: 1, shape: 'pad' },
    { kind: 'button', x: 37.5, y: 104, w: 12, h: 5.5, label: 'OCTAVE' },

    // -----------------------------------------------------------------------
    // 2. VOICE MODE (p.17). One knob, one four-position switch, and the voice field.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 64.6, y: 59.8, w: 27.0, h: 56.2, label: 'VOICE MODE' },
    knob(77.0, ROW_2, 'VOICE MODE DEPTH'),
    { kind: 'button', x: 66.5, y: 87, w: 5.2, h: 24, label: 'TYPE' },
    // The four analog voices, as one assignable. See `index.ts` on why this is one cell.
    { kind: 'voices', x: 73.5, y: 88, w: 16.5, h: 21, label: 'VOICE' },

    // -----------------------------------------------------------------------
    // 3. VCO 1 / VCO 2 / MULTI ENGINE (pp.18-22).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 92.7, y: 31.2, w: 117.3, h: 84.8, label: 'VCO 1 / VCO 2 / MULTI ENGINE' },
    slider(98.3, ROW_1, 'WAVE'),
    slider(112.5, ROW_1, 'OCTAVE'),
    leds(123.7, ROW_1, 4),
    knob(139.9, ROW_1, 'PITCH'),
    knob(168.3, ROW_1, 'SHAPE'),
    slider(188.6, ROW_1, 'SYNC'),
    slider(203.1, ROW_1, 'RING'),

    slider(98.3, ROW_2, 'WAVE'),
    slider(112.5, ROW_2, 'OCTAVE'),
    leds(123.7, ROW_2, 4),
    knob(139.9, ROW_2, 'PITCH'),
    knob(168.3, ROW_2, 'SHAPE'),
    knob(196.6, ROW_2, 'CROSS MOD DEPTH'),

    slider(98.3, ROW_3, 'NOISE/VPM/USR'),
    // The MULTI ENGINE's own readout: 7-segment LED, six characters (p.66).
    { kind: 'screen', x: 113.2, y: 94.3, w: 40.1, h: 14.5 },
    knob(168.3, ROW_3, 'TYPE', 15.4),
    knob(196.6, ROW_3, 'SHAPE'),

    // -----------------------------------------------------------------------
    // 4. MIXER (p.22). Three levels, one per source, in one column.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 212.9, y: 31.2, w: 25.9, h: 87.7, label: 'MIXER' },
    knob(224.9, ROW_1, 'VCO 1'),
    knob(224.9, ROW_2, 'VCO 2'),
    knob(224.9, ROW_3, 'MULTI'),

    // -----------------------------------------------------------------------
    // 5. FILTER (p.23).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 240.4, y: 31.2, w: 25.8, h: 87.7, label: 'FILTER' },
    knob(253.5, ROW_1, 'CUTOFF'),
    knob(253.5, ROW_2, 'RESONANCE'),
    slider(246.0, ROW_3, 'DRIVE'),
    slider(260.4, ROW_3, 'KEY TRACK'),

    // -----------------------------------------------------------------------
    // 6. AMP EG / EG / LFO (pp.24-25). Three sections, one boxed block, one row each.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 269.2, y: 31.2, w: 112.0, h: 87.7, label: 'AMP EG / EG / LFO' },
    knob(281.6, ROW_1, 'ATTACK'),
    knob(310.0, ROW_1, 'DECAY'),
    knob(338.3, ROW_1, 'SUSTAIN'),
    knob(366.7, ROW_1, 'RELEASE'),

    knob(281.6, ROW_2, 'ATTACK'),
    knob(310.0, ROW_2, 'DECAY'),
    knob(338.3, ROW_2, 'EG INT'),
    slider(366.7, ROW_2, 'TARGET'),

    slider(274.2, ROW_3, 'WAVE'),
    slider(288.7, ROW_3, 'MODE'),
    knob(310.0, ROW_3, 'RATE'),
    knob(338.3, ROW_3, 'INT'),
    slider(366.7, ROW_3, 'TARGET'),

    // -----------------------------------------------------------------------
    // 7. EFFECTS (p.26). Two switches and two knobs, on row 1 only.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 382.3, y: 31.2, w: 81.9, h: 28.4, label: 'EFFECTS' },
    slider(387.2, ROW_1, 'DEL/REV/MOD', 12),
    slider(400.9, ROW_1, 'OFF/ON/SELECT', 12),
    knob(423.2, ROW_1, 'TIME'),
    knob(451.6, ROW_1, 'DEPTH'),

    // -----------------------------------------------------------------------
    // 8-10. Display, PROGRAM/VALUE, and the EDIT/SEQUENCER block (pp.10, 27, 33).
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 393.2, y: 65.4, w: 31.7, h: 17.4 },
    knob(451.2, 74.7, 'PROGRAM/VALUE', 16),
    { kind: 'group', x: 387.5, y: 91.2, w: 73.3, h: 50.9, label: 'EDIT / SEQUENCER' },
    // EDIT MODE, WRITE, EXIT, SHIFT.
    { kind: 'grid', x: 395.0, y: 98.1, w: 56.5, h: 7.4, cols: 4, rows: 1, shape: 'pad' },
    // MOTION MODE, PLAY, REC, REST.
    { kind: 'grid', x: 395.0, y: 126.0, w: 56.5, h: 7.4, cols: 4, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // 11-12. Buttons 1-16 and the joystick (pp.10-13).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 133.1, y: 120.9, w: 237.0, h: 19.4 },
    { kind: 'grid', x: 140.1, y: 123.5, w: 226.3, h: 14.2, cols: 16, rows: 1, shape: 'pad' },
    knob(48.8, 129.7, 'JOYSTICK', 24.9),

    // -----------------------------------------------------------------------
    // 13. The keyboard.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: KEY_X, y: KEY_Y, w: KEY_W, h: KEY_H, cols: 22, rows: 1, shape: 'key' },
    blacks(0, 2),
    blacks(3, 3),
    blacks(7, 2),
    blacks(10, 3),
    blacks(14, 2),
    blacks(17, 3),
  ],
}

/** Exported for the test that asserts every feature lands inside the published footprint. */
export const MINILOGUE_XD_SPAN_MM = SPAN
