import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Moog Mother-32's panel.
 *
 * Read off the full-panel line drawing the manual prints on its blank patch sheets (printed
 * p.68) — the same drawing that carries the nine factory patches on pp.64-66, and the only
 * complete, unobstructed, fully-labelled panel figure in the document. Our own geometry and line
 * weights; nothing traced, extracted or embedded.
 *
 * **Every coordinate below was measured, not estimated.** The page was rendered at 200 dpi, the
 * panel's outer border located at 1475 x 626 px, and the control positions taken as the centroids
 * of the drawing's own dark components — which is why the six knobs of the top row come out at
 * one y to a tenth of a millimetre and all fourteen knobs at one diameter. The scale is the panel
 * box itself: 319.3 mm across and 133 mm down (see the aspect note below).
 *
 * ## The aspect check, and why it mattered here more than usual
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed, and on this box that check is not a formality — **the specifications table's own axis
 * letters are wrong.** Printed p.70 reads `SIZE (W x D x H cm): 31.93 x 10.69 (including knob
 * elevation) x 13.3`, which labels 10.69 cm the depth and 13.3 cm the height. The drawing settles
 * it: the measured panel box is 1475 / 626 = **2.356**, against
 *
 *     319.3 / 133   = 2.401     <- 1.9% out, and the only candidate that is close
 *     319.3 / 106.9 = 2.987     <- 27% out
 *
 * So the face a player looks at is 319.3 x 133 mm and 106.9 mm is how far the box stands off the
 * desk with its knobs on. `panelRiseMm` is therefore 133, taken from the figure the table calls
 * height rather than the one it calls depth — the *opposite* of the Deluge's case, where the
 * played surface's vertical span is the manufacturer's depth. The trap is that the axis letters
 * are unreliable in both directions; only the drawing is not.
 *
 * ## No cheeks are drawn
 *
 * 319.3 mm is the whole unit, wood end cheeks included, exactly as the Cascadia's 348 mm is. The
 * cheeks are visible in the figure at roughly 8 mm each side, and the metal panel proper is the
 * 60 HP (304.8 mm) Eurorack panel the specifications' EURORACK SPECS row names. Drawing a cheek
 * would put the panel proper somewhere narrower than the span claims and make the rack subtly
 * wrong in the one direction §10 cares about, so nothing is drawn outside the controls and the
 * features simply sit inside x 9..311.
 *
 * ## What this panel has that the vocabulary has no word for
 *
 * **The patchbay is a 4 x 8 block of 3.5 mm points and is drawn as a `grid`**, because
 * `PanelFeature` has no jack — the same answer the Cascadia reached, for the same reason, and it
 * means this layout carries no named jack positions and cannot be the source of coordinates for
 * an intra-panel cable. The block is labelled `IN / OUT`, which is the panel's own silkscreen
 * over it: printed p.46 explains the legend, "Patch points whose labels are written in standard
 * text are inputs, while patch points whose labels are reversed are outputs."
 *
 * **The 13-note keyboard is the button field, and it is not drawn as keys.** Printed p.70 lists
 * `KEYS: 13 Momentary Pads`, and the thirteen are the five pattern-page buttons on the upper row
 * and the eight step buttons on the lower one — the same buttons, in Keyboard mode. Drawing them
 * as `shape: 'key'` would put a piano where the panel has two rows of square pads, so they are
 * what they look like: a row of buttons and an eight-wide `pad` grid.
 *
 * **The LEDs are not drawn at all.** `OCTAVE / LOCATION` is eight indicators, the Tempo LED is a
 * ninth, and the step LEDs an eighth row below the step buttons. None is a control, and `grid`
 * says "a block of identical *controls*", so the row reaches the drawing as the silkscreen above
 * it — a `label` — and the indicators themselves are left off. A simplified panel may leave
 * something out; it may not call an indicator a socket.
 *
 * **No `group` rectangles.** This panel prints no section boundaries anywhere: the sections are
 * three rows of labelled knobs and nothing encloses them. The Cascadia's fourteen numbered blocks
 * are real ink and were measured; inventing eight boxes here would be drawing lines the panel does
 * not have. The one enclosure below is the patchbay, and it is enclosed because the figure
 * encloses it.
 *
 * The `voices` region sits in the bottom band directly under the patchbay. This box is one voice
 * and the rack draws one cell for it; the patchbay column above that cell is where the voice
 * leaves — `VCA` is its top entry — so a lit cell there reads true in a way a cell on the mixer
 * or the filter would not. It is the one place on this panel with room for a readout that is not
 * already silkscreen.
 */

// ---------------------------------------------------------------------------
// Measured constants
// ---------------------------------------------------------------------------

/** The unit's own vertical span, cheeks included (printed p.70, checked against the drawing). */
const RISE = 133

/** The three knob rows, and the two button rows below them. Centres, in millimetres. */
const ROW_1 = 20.2
const ROW_2 = 49.1
const ROW_3 = 78.1
const BUTTONS_UPPER = 98.2
const BUTTONS_LOWER = 110.4

/** Every knob on this panel is the same size. Measured fourteen times, 16.2-16.4 mm. */
const KNOB_D = 16.3

/** Every toggle is the same size too: a small hex-collar switch. */
const SWITCH_W = 6
const SWITCH_H = 8

/** A square sequencer button. */
const BUTTON_W = 8.3
const BUTTON_H = 7.2

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'knob', x: cx - KNOB_D / 2, y: cy - KNOB_D / 2, d: KNOB_D, label }
}

/** A two- or three-position toggle. Drawn as a button; the panel prints its positions beside it. */
function toggle(cx: number, cy: number, label: string): PanelFeature {
  return {
    kind: 'button',
    x: cx - SWITCH_W / 2,
    y: cy - SWITCH_H / 2,
    w: SWITCH_W,
    h: SWITCH_H,
    label,
  }
}

function button(cx: number, cy: number, label: string, w = BUTTON_W, h = BUTTON_H): PanelFeature {
  return { kind: 'button', x: cx - w / 2, y: cy - h / 2, w, h, label }
}

export const MOTHER_32_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Moog Mother-32 User Manual (Version 2), p.68 (blank patch sheet panel drawing)',
  },
  features: [
    // ---- row 1: the voice, left to right along the top --------------------------
    knob(28.9, ROW_1, 'FREQUENCY'),
    toggle(58.5, ROW_1, 'VCO WAVE'),
    knob(88.0, ROW_1, 'PULSE WIDTH'),
    knob(117.5, ROW_1, 'MIX'),
    knob(153.3, ROW_1, 'CUTOFF'),
    knob(189.0, ROW_1, 'RESONANCE'),
    toggle(213.5, ROW_1, 'VCA MODE'),
    knob(235.9, ROW_1, 'VOLUME'),

    // ---- row 2: modulation routing ----------------------------------------------
    knob(29.0, ROW_2, 'GLIDE'),
    toggle(58.5, ROW_2, 'VCO MOD SOURCE'),
    knob(88.0, ROW_2, 'VCO MOD AMOUNT'),
    toggle(117.7, ROW_2, 'VCO MOD DEST'),
    toggle(147.1, ROW_2, 'VCF MODE'),
    toggle(176.8, ROW_2, 'VCF MOD SOURCE'),
    knob(206.4, ROW_2, 'VCF MOD AMOUNT'),
    toggle(235.8, ROW_2, 'VCF MOD POLARITY'),

    // ---- row 3: clock, LFO and the envelope -------------------------------------
    knob(48.2, ROW_3, 'TEMPO / GATE LENGTH'),
    knob(88.0, ROW_3, 'LFO RATE'),
    toggle(117.6, ROW_3, 'LFO WAVE'),
    knob(147.1, ROW_3, 'ATTACK'),
    toggle(176.7, ROW_3, 'SUSTAIN'),
    knob(206.4, ROW_3, 'DECAY'),
    knob(235.9, ROW_3, 'VC MIX'),

    // ---- the MIDI DIN, bottom left. A socket, so a one-cell pad block ------------
    { kind: 'grid', x: 13.2, y: 102.2, w: 15.6, h: 15.6, cols: 1, rows: 1, shape: 'pad', label: 'MIDI IN' },

    // ---- the sequencer field, and the keyboard that shares it --------------------
    button(47.2, BUTTONS_UPPER, 'HOLD / REST'),
    button(77.8, BUTTONS_UPPER, 'PATTERN (BANK)'),
    // The eight OCTAVE / LOCATION indicators live here. Silkscreen only — see the note above.
    { kind: 'label', x: 105.3, y: 94.0, text: 'OCTAVE / LOCATION', align: 'middle' },
    button(141.3, BUTTONS_UPPER, '1-8'),
    button(156.5, BUTTONS_UPPER, '9-16'),
    button(187.1, BUTTONS_UPPER, '17-24'),
    button(202.5, BUTTONS_UPPER, '25-32'),
    button(217.7, BUTTONS_UPPER, 'SET END'),

    button(47.2, BUTTONS_LOWER, 'RESET / ACCENT'),
    button(62.5, BUTTONS_LOWER, '(SHIFT)'),
    button(77.9, BUTTONS_LOWER, 'RUN / STOP (REC)'),
    // The two arrow-shaped octave buttons are taller than the rest and measured so.
    button(96.6, BUTTONS_LOWER, '(KB)', 9.7, 10.4),
    button(113.9, BUTTONS_LOWER, '(STEP)', 9.7, 10.4),
    // Step buttons 1-8, measured at 133.6 through 240.7 on a 15.3 mm pitch.
    { kind: 'grid', x: 129.4, y: 106.8, w: 115.5, h: BUTTON_H, cols: 8, rows: 1, shape: 'pad' },

    // ---- the patchbay: 4 columns at 263.4/277.2/291.1/305.0, 8 rows on a 13.4 pitch
    { kind: 'group', x: 256, y: 10, w: 55, h: 112, label: 'IN / OUT' },
    { kind: 'grid', x: 258.5, y: 14.5, w: 51.4, h: 103.8, cols: 4, rows: 8, shape: 'pad' },

    // ---- the bottom band: nameplate, and the one region the resolver writes ------
    { kind: 'label', x: 28, y: 128, text: 'MOTHER-32', align: 'start' },
    // Sized against the rack's two standing rules rather than against the free space: a cell must
    // read as a control (§10 asks for w/h under 3) and must not tower over the pads beside it
    // (under twice the widest grid cell, which here is the 15.6 mm MIDI socket). 26 x 10 for the
    // one voice this box has satisfies both with room to spare.
    { kind: 'voices', x: 262, y: 121, w: 26, h: 10 },
  ],
}
