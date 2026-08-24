import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Subsequent 37's top panel.
 *
 * ## The manual has no top-down panel view, and that changed which document this cites
 *
 * Every other panel in this library was read off a plan view in the device's own manual. This
 * one cannot be: the Subsequent 37 User's Manual carries a three-quarter perspective
 * illustration on p.2 and then **one isolated drawing of each section** beside its prose
 * (pp.13, 15, 21, 22, 25, 27, 28, 30, 34) — nine drawings at two different scales, with no
 * figure anywhere that puts them in one frame. Reconstructing a panel by butting nine section
 * drawings together produces a layout whose horizontal proportions are guesswork wearing a page
 * number.
 *
 * Moog publishes a document that *is* the missing figure: the **Subsequent 37 Quickstart
 * Guide**, a two-page poster whose lower half is a flat, full-width, to-scale legend of the
 * whole control surface. That is what these coordinates were measured off, and that is what
 * `verified` names. Reference, never asset (§10): the panel was decoded by rendering the poster
 * at 150 dpi, finding the section dividers and the knob bodies by their own pixel runs, and
 * dividing into the published footprint. Our own geometry and line weights; nothing traced,
 * extracted or embedded.
 *
 * **The measurement checks itself.** p.9 of the manual states the panel carries *"40 knobs and
 * 74 switches"*. Detecting circular knob faces in the poster's control band finds **exactly 40**,
 * and they fall into the ten sections in the counts the manual's own section drawings show:
 * 1 · 2 · 1 · 5 · 5 · 6 · 5 · 5 · 8 · 2. A reconstruction that lands on the manual's own knob
 * count, section by section, is not an eyeballed one.
 *
 * ## The footprint, and the one number on it that cannot be right
 *
 * p.61's Dimensions line prints both unit systems and they disagree:
 *
 *     6.75" H x 26.375" W x 14.75 D  /  17cm H x 68cm W x 37.5cm D
 *
 * Height and depth convert cleanly (6.75" = 17.1 cm, 14.75" = 37.5 cm). **Width does not**:
 * 26.375" is 66.99 cm, not 68. One of the pair is a typo, and it is the imperial one — Moog's
 * own product listing gives the width as 26.75", which is 67.9 cm and rounds to the printed 68.
 * So `panelSpanMm` is **680**, the metric figure, and `index.ts` records the disagreement beside
 * it rather than quietly picking a number.
 *
 * `panelRiseMm` is 375, the depth off the same line — the trap the field documents, in its usual
 * direction. For a keyboard sitting on a stand the surface you play is the top, so the vertical
 * span of the panel is the manufacturer's *depth*; 170 mm is how far the box stands off the
 * stand and is not a panel dimension at all.
 *
 * ## The bands
 *
 *  1. **0-159 mm** — the control surface, measured. Ten sections, three knob rows at 27.5, 79.3
 *     and 132.2 mm, and a bottom strip carrying KB OCTAVE, BANK and PRESET 1-16.
 *  2. **159-232 mm** — bare panel, with the PITCH and MODULATION wheels at the far left.
 *  3. **232-372 mm** — the 37-note keyboard.
 *
 * Bands 2 and 3 are **not** measured, because the poster's legend stops at the bottom of the
 * control surface: it draws no keys and no wheels. Their proportions are ours, laid out to the
 * 37-key count p.61 states and to the wheels' front-left position in the p.2 illustration. That
 * is the honest split — the control surface is decoded from a drawing, the two bands below it
 * are a simplification, and the `verified` citation covers only the first.
 *
 * **Two details of the real panel worth keeping**, because losing them makes the drawing read as
 * a generic synth: the MIXER's five level knobs are staggered in a zig-zag against their five
 * mute buttons rather than stacked in a column, and the FILTER's CUTOFF knob is visibly larger
 * than every other knob on the box. Both are in the poster and both survive here.
 *
 * **The voice field sits in the OSCILLATORS section beside DUO MODE**, which is §10's
 * "somewhere true": DUO MODE and KB CTRL are where this instrument's two notes are allocated,
 * and where the front panel shows what it is doing with them. One cell, because the box is one
 * assignable of two-note paraphony and not two assignables (see `index.ts`).
 *
 * **The KNOB SHIFT strip is drawn as its button and not as its silkscreen.** The real panel
 * prints `DELAY  HOLD  VEL AMT  KB TRACK` across that strip, and drawing those four words is
 * what a faithful simplification would do. It is left out because `lib/core/fx.ts` reads panel
 * labels as evidence of an effects chain, matching `DELAY` as a whole word — and it says so
 * about itself: *"a knob labelled `DELAY` that is really an envelope delay would be read as an
 * effect"*. With the silkscreen drawn, every guide containing this box listed it under **Master
 * FX** as *"carries DELAY · HOLD · VEL AMT · KB TRACK on the panel"*, which is false twice over:
 * this instrument has no time-based effects at all, and the word on the strip is an envelope
 * stage. A drawing detail is worth less than a true sentence, so the strip keeps its button and
 * loses its four words. The engine-side limitation is real and is not fixed here.
 *
 * **The wheels are drawn as rounded buttons.** `PanelFeature` has no wheel, and a wheel seen
 * from above is a tall narrow rounded rectangle. The minilogue xd records the same compromise
 * for its joystick and the Crave for its patch sockets: the vocabulary is closed on purpose, and
 * picking the nearest member of it beats widening it for one box.
 */

/** Both figures off the p.61 Dimensions line; see the note above on the width. */
const SPAN = 680
const RISE = 375

/** Bottom of the measured control surface. Everything below it is our own simplification. */
const CONTROL_H = 159.4

/** The three knob rows of the control band, as measured (mm to the knob centre). */
const ROW_1 = 27.5
const ROW_2 = 79.3
const ROW_3 = 132.2

/** Every knob on this panel is one size but CUTOFF, which is drawn half again as large. */
const KNOB_D = 17
const CUTOFF_D = 24

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

/** One of the panel's 74 switches: a small square, lit from behind on the real box. */
function button(cx: number, cy: number, label?: string, w = 11, h = 6.5): PanelFeature {
  return { kind: 'button', x: cx - w / 2, y: cy - h / 2, w, h, ...(label === undefined ? {} : { label }) }
}

/** A row of indicator LEDs beside a switch. Decorative; the vocabulary has no LED. */
function leds(cx: number, cy: number, cols: number, pitch = 7): PanelFeature {
  return {
    kind: 'grid',
    x: cx - (cols * pitch) / 2,
    y: cy - 1.6,
    w: cols * pitch,
    h: 3.2,
    cols,
    rows: 1,
    shape: 'pad',
  }
}

// ---------------------------------------------------------------------------
// The keyboard — p.61, "NUMBER OF KEYS: 37", "Semi-Weighted with After Pressure"
// ---------------------------------------------------------------------------

/**
 * 37 keys is three octaves and a top C: **22 white and 15 black**, starting on C. The white
 * keys are one even grid; the black ones are six clusters, **2 then 3 per octave**, because
 * spacing fifteen of them evenly would lose the one thing that makes a row of rectangles read
 * as a keyboard. The minilogue xd's 37-key panel makes exactly the same call, and for a 37-key
 * instrument the two layouts should agree.
 */
const KEY_X = 130
const KEY_Y = 232
const KEY_W = 532
const KEY_H = 140
const WHITE_W = KEY_W / 22
const BLACK_W = 12
const BLACK_H = 88

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

export const SUBSEQUENT_37_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Subsequent 37 Quickstart Guide, panel legend',
  },
  features: [
    // -----------------------------------------------------------------------
    // 1. PROGRAMMING (p.13). The display, and the nine buttons that reach the menus.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 0.5, y: 1, w: 41.4, h: 151 },
    { kind: 'screen', x: 4, y: 6, w: 35, h: 21 },
    // Down, Up, CURSOR.
    { kind: 'grid', x: 5, y: 34, w: 33, h: 7, cols: 3, rows: 1, shape: 'pad' },
    // COMPARE / SAVE, MIDI / GLOBAL, PRESET / PANEL-INIT.
    { kind: 'grid', x: 5, y: 47, w: 15, h: 55, cols: 1, rows: 3, shape: 'pad' },
    { kind: 'grid', x: 24, y: 47, w: 15, h: 55, cols: 1, rows: 3, shape: 'pad' },
    knob(21.2, 130.0, 'FINE TUNE'),

    // -----------------------------------------------------------------------
    // 2. ARPEGGIATOR (p.15). RATE reads 2-280 BPM, or clock divisions under SYNC.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 42.9, y: 1, w: 52.7, h: 151 },
    knob(61.2, ROW_1, 'RATE'),
    button(85.5, ROW_1, 'SYNC / TAP', 12, 12),
    leds(69, 47, 5),
    button(60, 57, 'RANGE'),
    button(78, 57, 'RANGE'),
    button(60, 73, 'BACK / FORTH'),
    button(78, 73, 'INVERT'),
    knob(69.1, 116.1, 'PATTERN'),
    button(56, 143, 'ON / REST'),
    button(82, 143, 'LATCH / TIE'),

    // -----------------------------------------------------------------------
    // 3. GLIDE (p.21). One knob and five switches; the knob's scale is 0-10 and unitless.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 96.6, y: 1, w: 33.8, h: 151 },
    knob(113.5, ROW_1, 'TIME'),
    leds(113.5, 47, 2, 12),
    button(113.5, 57, 'OSC'),
    leds(113.5, 70, 3, 9),
    button(113.5, 80, 'TYPE'),
    button(113.5, 96, 'GATED'),
    button(113.5, 112, 'LEGATO'),
    button(113.5, 130, 'ON'),

    // -----------------------------------------------------------------------
    // 4-5. MOD 1 and MOD 2 (pp.22-24). Two identical busses, drawn identically.
    //      HI RANGE and SYNC are the two switches that replace the LFO RATE scale.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 131.4, y: 1, w: 78.7, h: 151, label: 'MOD 1' },
    knob(152.4, ROW_1, 'LFO 1 RATE'),
    knob(190.1, ROW_1, 'MOD 1 SOURCE'),
    button(152.4, 55.9, 'HI RANGE', 16),
    button(171.0, 55.9, 'SYNC', 16),
    button(190.1, 55.9, 'KB RESET', 16),
    knob(152.4, ROW_2, 'PITCH AMT'),
    knob(190.3, ROW_2, 'FILTER AMT'),
    button(152.4, 100, 'OSC'),
    button(190.3, 100, 'CONTROLLERS', 16),
    button(152.4, ROW_3, 'DEST'),
    knob(190.3, ROW_3, 'MOD 1 AMT'),

    { kind: 'group', x: 211.1, y: 1, w: 79.0, h: 151, label: 'MOD 2' },
    knob(232.2, ROW_1, 'LFO 2 RATE'),
    knob(270.1, ROW_1, 'MOD 2 SOURCE'),
    button(232.2, 55.9, 'HI RANGE', 16),
    button(251.0, 55.9, 'SYNC', 16),
    button(270.1, 55.9, 'KB RESET', 16),
    knob(232.1, ROW_2, 'PITCH AMT'),
    knob(269.9, ROW_2, 'FILTER AMT'),
    button(232.1, 100, 'OSC'),
    button(269.9, 100, 'CONTROLLERS', 16),
    button(232.1, ROW_3, 'DEST'),
    knob(269.9, ROW_3, 'MOD 2 AMT'),

    // -----------------------------------------------------------------------
    // 6. OSCILLATORS (pp.25-26). The section that allocates the two notes, so the voice
    //    field lives here — beside DUO MODE and KB CTRL, which decide what they do.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 291.1, y: 1, w: 75.6, h: 151, label: 'OSCILLATORS' },
    knob(309.6, ROW_1, 'OSC 1 OCTAVE'),
    knob(347.9, ROW_1, 'OSC 1 WAVE'),
    button(309.6, 47.9, 'HARD SYNC', 16),
    button(340.0, 47.9, 'KB RESET', 16),
    knob(309.6, ROW_2, 'OSC 2 OCTAVE'),
    knob(347.9, ROW_2, 'OSC 2 WAVE'),
    leds(303.0, 100, 2, 8),
    button(316.0, 100, 'KB CTRL', 14),
    button(345.0, 100, 'DUO MODE', 14),
    // The two paraphonic notes, as one assignable. See `index.ts` on why this is one cell.
    { kind: 'voices', x: 333, y: 108, w: 30, h: 12, label: 'DUO' },
    knob(309.6, ROW_3, 'FREQUENCY'),
    knob(347.9, ROW_3, 'BEAT FREQ'),

    // -----------------------------------------------------------------------
    // 7. MIXER (p.27). Five levels, staggered against five mute buttons.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 367.7, y: 1, w: 62.1, h: 151, label: 'MIXER' },
    knob(386.8, 27.6, 'OSC 1'),
    button(412.0, 27.6, 'OSC 1 MUTE', 8, 8),
    button(386.8, 52.8, 'SUB 1 MUTE', 8, 8),
    knob(412.0, 52.8, 'SUB 1'),
    knob(386.8, 79.5, 'OSC 2'),
    button(412.0, 79.5, 'OSC 2 MUTE', 8, 8),
    button(386.8, 105.1, 'NOISE MUTE', 8, 8),
    knob(412.0, 105.1, 'NOISE'),
    knob(386.8, 130.9, 'FDBK / EXT IN'),
    button(412.0, 130.9, 'FDBK MUTE', 8, 8),

    // -----------------------------------------------------------------------
    // 8. FILTER (pp.28-29). CUTOFF is the one oversized knob on the panel.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 430.8, y: 1, w: 66.8, h: 151, label: 'FILTER' },
    knob(464.1, 29.8, 'CUTOFF', CUTOFF_D),
    knob(446.9, ROW_2, 'RESONANCE'),
    knob(481.5, ROW_2, 'MULTIDRIVE'),
    leds(464.1, 103, 4, 11),
    button(464.1, 112, 'SLOPE', 14),
    knob(446.9, ROW_3, 'EG AMT'),
    knob(481.5, ROW_3, 'KB TRACK'),

    // -----------------------------------------------------------------------
    // 9. ENVELOPE GENERATORS (pp.30-33). Two mirrored DAHDSR rows, F over A, split by the
    //    KNOB SHIFT strip that turns all eight knobs into different parameters.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 498.6, y: 1, w: 141.7, h: 151, label: 'ENVELOPE GENERATORS' },
    knob(522.0, 27.4, 'ATTACK'),
    knob(554.2, 27.4, 'DECAY'),
    knob(586.2, 27.4, 'SUSTAIN'),
    knob(618.4, 27.4, 'RELEASE'),
    { kind: 'grid', x: 507, y: 46, w: 126, h: 7, cols: 5, rows: 1, shape: 'pad' },
    button(506, 68.6, 'KNOB SHIFT', 9, 9),
    knob(522.0, 105.1, 'ATTACK'),
    knob(554.2, 105.1, 'DECAY'),
    knob(586.2, 105.1, 'SUSTAIN'),
    knob(618.4, 105.1, 'RELEASE'),
    { kind: 'grid', x: 507, y: 124, w: 126, h: 7, cols: 5, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // 10. OUTPUT (p.34). Main volume, mute, headphone volume, headphone jack.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 640.8, y: 1, w: 38.7, h: 151, label: 'OUTPUT' },
    knob(660.0, 27.4, 'VOLUME'),
    button(660.0, 52, 'MUTE', 9, 9),
    knob(660.0, 79.3, 'HEADPHONES'),
    button(660.0, 108, 'PHONES JACK', 11, 11),

    // -----------------------------------------------------------------------
    // 11. The bottom strip (p.12): octave, bank, and the sixteen preset buttons that
    //     double as the step keys of the 64-step sequencer.
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 5, y: 143, w: 26, h: 9, cols: 2, rows: 1, shape: 'pad' },
    { kind: 'button', x: 37, y: 143, w: 16, h: 9, label: 'BANK' },
    { kind: 'grid', x: 60, y: 143, w: 612, h: 9, cols: 16, rows: 1, shape: 'pad' },

    // -----------------------------------------------------------------------
    // 12-13. The wheels and the keyboard. Not measured — see the note above.
    // -----------------------------------------------------------------------
    { kind: 'button', x: 26, y: 250, w: 18, h: 52, round: true, label: 'PITCH' },
    { kind: 'button', x: 58, y: 250, w: 18, h: 52, round: true, label: 'MOD' },
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
export const SUBSEQUENT_37_SPAN_MM = SPAN

/** Exported for the test that the measured control band and the drawn bands do not overlap. */
export const SUBSEQUENT_37_CONTROL_H_MM = CONTROL_H
