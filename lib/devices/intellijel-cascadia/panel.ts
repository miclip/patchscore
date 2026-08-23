import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Cascadia's panel.
 *
 * Read off the LAYOUT figure on p.8 of the Cascadia Manual v1.1 — the one full-panel drawing in
 * the document, with the fourteen sections called out by number. Our own geometry and line
 * weights; nothing traced, extracted or embedded.
 *
 * **The aspect was checked, not assumed**, because `panelSpanMm` here is a figure that means
 * something other than it appears to (see `index.ts`). The p.8 drawing measures 1290 x 911 px at
 * 200 dpi, an aspect of 1.416, against 348/246 = 1.415. So the drawn panel and the two
 * specifications figures agree to within a tenth of a percent, and the "including wood end
 * cheeks" caveat on the width applies to this drawing too — the figure covers the whole unit,
 * and so does the rectangle below.
 *
 * **No cheeks are drawn**, deliberately. §10 says to resist wood end cheeks, and here there is a
 * second reason on top of the first: 348 mm already *includes* them, so a drawn cheek would put
 * the panel proper somewhere narrower than the number claims and make the rack subtly wrong in
 * the one direction §10 cares about.
 *
 * **The sections are the drawing.** Cascadia's panel is fourteen numbered blocks in four bands,
 * and the block boundaries are what a player navigates by — far more than any individual knob.
 * So the group rectangles are measured off p.8 to the pixel and the controls inside them are laid
 * out evenly within their block, which is what a simplified panel owes: the clusters in the right
 * places, at the right proportions, in our own hand.
 *
 * **There is no jack in this vocabulary.** `PanelFeature` offers screen, knob, button, grid,
 * voices, label and group and nothing else, so Cascadia's hundred-plus sockets are drawn as
 * `grid` blocks — which is what §10 says a grid is for, "a block of identical controls",
 * decorative and binding nothing. It also means this layout carries **no named jack positions**,
 * and so cannot be the source of coordinates for an intra-panel cable. That is a fact about the
 * shape, not an omission in this file: see the note in `index.ts`.
 *
 * The voice field sits on VCA A, the output amplifier. This box is one voice and the rack draws
 * one cell for it; VCA A is the section that voice finally passes through, so a lit cell there
 * reads true in a way a lit cell on the mixer or the filter would not.
 */

/** Section bands, measured off p.8. The four rows the panel actually reads as. */
const IO_Y = 0
const VOICE_Y = 33
const UTIL_Y = 116
const MOD_Y = 161
const BOTTOM = 246

/** Sliders are how this box is set: a fader block of `n` under one section. */
function faders(x: number, y: number, w: number, h: number, n: number, label?: string): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols: n, rows: 1, shape: 'fader', ...(label ? { label } : {}) }
}

/** A block of sockets. Drawn as pads because the vocabulary has no jack; see above. */
function sockets(x: number, y: number, w: number, h: number, cols: number, rows: number): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols, rows, shape: 'pad' }
}

/** `x`/`y` are the bounding box, so a knob quoted by its centre is placed through here. */
function knob(cx: number, cy: number, d: number, label?: string): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, ...(label ? { label } : {}) }
}

/** The I/O CONTROL strip across the top: FX send/return, output control, main level. */
const IO_KNOBS: PanelFeature[] = [107, 125, 160, 191, 253, 283, 336].map((cx) => knob(cx, 19, 9))

export const CASCADIA_PANEL: PanelLayout = {
  panelRiseMm: 246,
  verified: { kind: 'manual', source: 'Intellijel Cascadia Manual v1.1, p.8 (LAYOUT)' },
  features: [
    // ---- 13: I/O CONTROL, the strip along the top -------------------------------
    { kind: 'group', x: 0, y: IO_Y, w: 348, h: 32, label: 'I/O CONTROL' },
    // EXT IN: the three MIDI/CV source buttons in the top left corner.
    sockets(11, 11, 34, 9, 3, 1),
    ...IO_KNOBS,

    // ---- the voice row: 1 MIDI/CV, 6 LINE IN, 7 MIXER, 8 VCF, 9 FOLDER, 10 VCA A -
    { kind: 'group', x: 0, y: VOICE_Y, w: 52, h: 82, label: 'MIDI / CV' },
    sockets(6, 40, 40, 40, 2, 4),
    sockets(6, 86, 40, 22, 2, 2),

    { kind: 'group', x: 52, y: VOICE_Y, w: 17, h: 82, label: 'LINE IN' },
    faders(57, 40, 8, 52, 1),
    sockets(57, 96, 8, 12, 1, 1),

    { kind: 'group', x: 69, y: VOICE_Y, w: 95, h: 82, label: 'MIXER' },
    faders(73, 40, 74, 52, 6),
    // SUB TYPE, NOISE TYPE and SOFT CLIP, the three switches down the right of the block.
    ...[45, 63, 81].map((cy) => ({ kind: 'button' as const, x: 152, y: cy, w: 8, h: 8 })),
    sockets(73, 96, 86, 12, 7, 1),

    { kind: 'group', x: 164, y: VOICE_Y, w: 107, h: 82, label: 'VCF' },
    faders(168, 40, 60, 52, 6),
    knob(248, 52, 17, 'MODE'),
    knob(248, 80, 14, 'LEVEL'),
    sockets(168, 96, 98, 12, 8, 1),

    { kind: 'group', x: 271, y: VOICE_Y, w: 30, h: 82, label: 'FOLDER' },
    faders(276, 40, 20, 52, 2),
    sockets(276, 96, 20, 12, 2, 1),

    { kind: 'group', x: 301, y: VOICE_Y, w: 47, h: 82, label: 'VCA A' },
    faders(305, 40, 38, 40, 3),
    // §10's one resolver-written region. One voice, one cell — see the note above. Sized so that
    // the single cell still reads as a control: wider than tall but not a slab, and no bigger
    // than the socket blocks it sits among.
    { kind: 'voices', x: 308, y: 84, w: 32, h: 14 },
    sockets(305, 102, 38, 10, 3, 1),

    // ---- 12: UTILITIES, the patchbay band ---------------------------------------
    { kind: 'group', x: 0, y: UTIL_Y, w: 348, h: 44, label: 'UTILITIES' },
    // S&H, SLEW / ENV FOLLOW, MIXUVERTER, LFO X / Y / Z — the four knob-bearing utilities.
    ...[50, 76, 108, 140].map((cx) => knob(cx, 128, 10)),
    // MULTS, SUM, INVERT, BI>UNI, EXP SRC, RINGMOD, VCA B / LPF — sockets, almost all of them.
    sockets(6, 138, 116, 18, 10, 2),
    sockets(126, 122, 100, 34, 9, 3),
    sockets(230, 122, 62, 34, 5, 3),
    sockets(296, 122, 46, 34, 4, 3),

    // ---- the modulation row: 3 VCO B, 2 VCO A, 4 ENV A, 5 ENV B, 11 PUSH GATE ----
    { kind: 'group', x: 0, y: MOD_Y, w: 51, h: BOTTOM - MOD_Y, label: 'VCO B' },
    sockets(6, 166, 40, 26, 3, 2),
    knob(19, 210, 16, 'PITCH'),
    knob(19, 234, 14, 'OCTAVE'),
    ...[40, 40].map((cx, i) => ({ kind: 'button' as const, x: cx, y: 205 + i * 22, w: 7, h: 12 })),

    { kind: 'group', x: 52, y: MOD_Y, w: 109, h: BOTTOM - MOD_Y, label: 'VCO A' },
    sockets(57, 166, 78, 14, 6, 1),
    faders(63, 190, 60, 46, 5),
    knob(146, 200, 17, 'PITCH'),
    knob(146, 228, 14, 'OCTAVE'),
    // TZFM/EXP, AC/DC, SYNC TYPE and PULSE POSITION, the four switches in the block.
    ...[184, 200, 216, 232].map((cy) => ({ kind: 'button' as const, x: 126, y: cy, w: 7, h: 11 })),

    { kind: 'group', x: 162, y: MOD_Y, w: 82, h: BOTTOM - MOD_Y, label: 'ENVELOPE A' },
    sockets(167, 166, 72, 14, 6, 1),
    faders(178, 190, 56, 46, 5, 'H A D S R'),
    // HOLD POSITION, ENVELOPE SPEED and CTRL SOURCE, the three three-way switches.
    ...[190, 208, 226].map((cy) => ({ kind: 'button' as const, x: 167, y: cy, w: 7, h: 13 })),

    { kind: 'group', x: 245, y: MOD_Y, w: 103, h: BOTTOM - MOD_Y, label: 'ENVELOPE B' },
    sockets(250, 166, 70, 14, 6, 1),
    faders(250, 190, 66, 46, 6, 'RISE FALL SHAPE'),
    // MODE SELECT and TYPE SELECT.
    ...[190, 214].map((cy) => ({ kind: 'button' as const, x: 322, y: cy, w: 7, h: 16 })),

    // ---- 11: PUSH GATE, the corner block ----------------------------------------
    { kind: 'group', x: 324, y: MOD_Y, w: 24, h: 41, label: 'PUSH' },
    sockets(331, 166, 10, 10, 1, 1),
    { kind: 'button', x: 329, y: 182, w: 14, h: 14, round: true, label: 'GATE' },
  ],
}
