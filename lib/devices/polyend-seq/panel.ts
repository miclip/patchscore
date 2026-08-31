import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Polyend Seq control surface.
 *
 * ## The figure, and why it is measurable
 *
 * p.3 prints one complete, unobstructed, fully-labelled plan view of the panel, immediately under
 * the back-panel socket list and immediately above the front-panel inventory it illustrates. It
 * is a line drawing rather than the photograph on p.2, which is what makes it measurable: every
 * control is a closed outline of its own, so a centre is a connected component rather than a
 * judgement. It was rendered at 400 dpi and decoded by connected components.
 *
 * ## How the frame was pinned, and the check that fell out of it
 *
 *  1. **The panel border.** The outline is a single rounded rectangle and the only component
 *     spanning more than half the page in either axis. Its strokes are four pixels thick, so the
 *     frame is taken at their centres: x 202.5 and 3094.5, y 2084.5 and 2782.5 — 2892.0 x 698.0
 *     px. A small unlabelled tab sits *above* the top edge at x 410-459 px and is excluded; see
 *     below.
 *  2. **The aspect check (§2.3), which is the whole reason these numbers are trustworthy.**
 *     2892.0 / 698.0 = 4.1433. p.14's specification line reads *"width 5.7?(14.5cm), height
 *     1.7?(4.3cm), length 23.6?(60cm)"* — the `?` is the document's own mangled inch mark, in the
 *     rendered page as well as the text layer — and 600 / 145 = 4.1379. They agree to 0.13%,
 *     which picks 600 x 145 out of that line and rejects the 43 mm height a careless reading
 *     would have taken for the rise.
 *
 *     **That line also springs `panelSpanMm`'s documented trap from the other side.** It calls
 *     145 mm the *width* and 600 mm the *length*; the horizontal span of the surface as played is
 *     the 600. The drawing is what settles it, and the aspect is how the drawing says so.
 *  3. **The scale**, 600 / 2892.0 = 0.207469 mm/px, taken across only. Carried down the other
 *     axis it makes the rise 144.81 mm against the stated 145 — a second figure this file did not
 *     fit, reproducing the first to 0.13%. The axes are not scaled separately.
 *
 * **The frame then checks itself against four counts nothing above used.** Carried through it,
 * the components come out at 8 buttons in the left column, 6 circles, 8 buttons in a column at
 * x 155.6 mm and 256 buttons in a block of 32 x 8. p.3's inventory is *"8 function keys… A 4 Line
 * TFT Display… 6 Clickable infinite Knobs. 8 'Track' buttons numbered '1' through '8'. 8 Rows of
 * 32 Steps per Track buttons."* Not one of those counts was used to build the mapping, and a
 * frame wrong in either span would still have counted them right — but the same mapping also puts
 * every button in both columns at 8.92 x 9.93 mm and every knob at 15.77 mm across, from spans
 * measured along an axis that was divided once.
 *
 * ## What is measured here and what is not
 *
 * Measured: the panel border, the screen's box, all sixteen button centres in the two columns and
 * their size, all six knob centres and their diameter, the step block's footprint, and the `Rec`
 * silkscreen between `Stop` and `Play`. Every number below is a connected-component bounding box
 * carried through the mapping above.
 *
 * **The 256 step keys are a `grid`, not 256 buttons.** They are one block of identical controls
 * and the panel numbers none of them; the drawing groups them visually in fours, with a 13.9 mm
 * gap every fourth column against the 13.07 mm ordinary one, and that grouping is the only thing
 * this file does not carry over — §10's `grid` is an even block. The eight track keys next to
 * them *are* individually numbered on the panel, so those are eight buttons.
 *
 * **Two things on the drawing are deliberately not here.**
 *
 * The mark to the right of the screen, at 128.6 x 19.5 mm, is the Polyend logo — a `P` inside a
 * filled disc. That is vendor artwork, and §10 says reference, never asset, so it is measured,
 * identified and left out rather than redrawn. The Torso T-1's panel sets its logo as a `label`
 * because that logo is a word; this one is a device.
 *
 * The unlabelled 9.3 x 3.3 mm tab the drawing puts on the rear edge at x 43.0-53.2 mm falls
 * outside the panel box entirely, at negative y, and no page in the manual names it. It could not
 * be a feature even if it were named — every feature must fall inside the span x rise box — and
 * inventing a name for it is what the Hapax's undeclared footswitch socket refused to do.
 *
 * **No voice field.** This box has no voices (§2.4), so a `kind: 'voices'` region would be a lit
 * rectangle that can never light. The Hapax, the Metropolix and the T-1 are the other three
 * panels that must not have one, for the same reason.
 *
 * Reference, never asset (§10): the figure was decoded by finding the panel border and the
 * control outlines by their own pixel runs, and nothing was kept but the numbers. Our own
 * geometry and line weights; nothing traced, extracted or embedded, and the PDF is not in this
 * repository.
 */

/** Panel rise in mm — the 14.5 cm p.14 calls the width, which is the vertical span as played. */
const H = 145

/** Button size, measured off the component bounding boxes; both columns are identical. */
const BTN_W = 8.92
const BTN_H = 9.93

/** Knob outline diameter, measured the same way. */
const KNOB_D = 15.77

/**
 * The eight button rows, centre lines. One even 15.04 mm pitch serves the function column, the
 * track column and the step grid's rows alike.
 */
const ROW_Y = [19.92, 34.96, 50.0, 65.04, 80.08, 95.12, 110.06, 125.21]

/** The two button columns, centre lines: function keys at the far left, track keys past the knobs. */
const FN_X = 19.5
const TRACK_X = 155.6

/** The three knob columns and two knob rows, centre lines. */
const KNOB_X = [63.17, 94.09, 125.21]
const KNOB_ROW_1 = 81.02
const KNOB_ROW_2 = 115.15

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'knob', x: cx - KNOB_D / 2, y: cy - KNOB_D / 2, d: KNOB_D, label }
}

/** The same, for a button measured by its centre. */
function button(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'button', x: cx - BTN_W / 2, y: cy - BTN_H / 2, w: BTN_W, h: BTN_H, label }
}

function row(n: number): number {
  const y = ROW_Y[n]
  if (y === undefined) throw new Error(`no button row ${n}`)
  return y
}

function knobCol(n: number): number {
  const x = KNOB_X[n]
  if (x === undefined) throw new Error(`no knob column ${n}`)
  return x
}

/** p.3's eight function keys, in the order it lists them, which is the order they are drawn. */
const FUNCTION_KEYS = [
  'Pattern',
  'Duplicate',
  'Quantize',
  'Random',
  'On/Off',
  'Clear',
  'Stop',
  'Play',
] as const

export const SEQ_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source:
      'Polyend Seq Manual 2.2.6, p.3 (Front panel) — measured off the plan drawing on that page, scaled against p.14 (Technical specifications)',
  },
  features: [
    // -----------------------------------------------------------------------
    // The four-line TFT display. p.3: "A 4 Line TFT Display with no sub-menus."
    // -----------------------------------------------------------------------
    { kind: 'screen', x: 69.4, y: 15.25, w: 49.38, h: 37.14 },

    // -----------------------------------------------------------------------
    // The function column, top to bottom.
    // -----------------------------------------------------------------------
    ...FUNCTION_KEYS.map((label, i) => button(FN_X, row(i), label)),

    // -----------------------------------------------------------------------
    // The `Rec` silkscreen, which is not a key: p.4 gives recording to Stop and
    // Play held together, and the drawing brackets the two under that word.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 42.01, y: 115.87, text: 'Rec' },

    // -----------------------------------------------------------------------
    // The six clickable encoders, under the names printed beneath them, which
    // are also the six names the manual gives its knob sections.
    // -----------------------------------------------------------------------
    knob(knobCol(0), KNOB_ROW_1, 'Tempo'),
    knob(knobCol(1), KNOB_ROW_1, 'Note'),
    knob(knobCol(2), KNOB_ROW_1, 'Velocity'),
    knob(knobCol(0), KNOB_ROW_2, 'Move'),
    knob(knobCol(1), KNOB_ROW_2, 'Length'),
    knob(knobCol(2), KNOB_ROW_2, 'Roll'),

    // -----------------------------------------------------------------------
    // The eight track keys, numbered on the panel and so drawn individually.
    // -----------------------------------------------------------------------
    ...ROW_Y.map((_, i) => button(TRACK_X, row(i), `${i + 1}`)),

    // -----------------------------------------------------------------------
    // The step block: 32 columns x 8 rows on its measured footprint. `Steps` is
    // p.3's word for it, not a silkscreen — the panel prints no name here.
    // -----------------------------------------------------------------------
    {
      kind: 'grid',
      x: 166.08,
      y: 15.04,
      w: 419.29,
      h: 115.15,
      cols: 32,
      rows: 8,
      shape: 'pad',
      label: 'Steps',
    },
  ],
}
