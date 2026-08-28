import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Torso T-1 control surface.
 *
 * ## The figure this was measured off is an image, and the mirror does not carry it
 *
 * `manuals/torso-t1/` is a text mirror of the online documentation, and its README says outright
 * that images were dropped: *"a value that exists only in a picture is NOT in this mirror"*. The
 * T-1's panel is one of those values. `/t1/what-is-the-t1/t1-overview/hardware-interface/` prints
 * a numbered table of the six front-panel groups and nothing else; the drawing those numbers
 * point at is `<img src="/img/t1/t1-front-panel.png">` on the live page, and it is the one
 * complete, unobstructed, fully-labelled plan view of the surface. So the citation names the page
 * and the date, and this header records that the geometry came from the figure on it.
 *
 * It is a line drawing rather than a photograph, which is what makes it measurable: every control
 * is a closed outline of its own, so a centroid is a connected component rather than a judgement.
 *
 * ## How the frame was pinned, and the check that fell out of it
 *
 *  1. **The panel border.** The drawing has a double border; the outer rectangle is the panel.
 *     Its lines are the only runs spanning more than half the image in either axis, at x 1.5 and
 *     1674.5 and y 32.5 and 660 — 1673 x 627.5 px.
 *  2. **The aspect check (§2.3), which is the whole reason these numbers are trustworthy.**
 *     1673 / 627.5 = 2.6661. The published `304 x 114 mm` is 2.6667. They agree to 0.02%, which
 *     picks 304 x 114 out of the specification line and rejects the 39 mm depth that a careless
 *     reading of `304 x 114 x 39` would have taken for the rise.
 *  3. **The scale**, 304 / 1673 = 0.181710 mm/px across and 114 / 627.5 = 0.181673 mm/px down.
 *     Two independent divisions agreeing to four figures; the axes are not scaled separately.
 *
 * **The frame then checks itself against a count nothing above used.** Carried through it, the
 * encoder outlines come out at 11.99 mm across and the keypads at 14.45 x 14.44 mm — a square
 * pad, from two spans measured along axes that were divided separately. And the components
 * counted 18 encoders and 23 keypads, which is exactly what
 * `/t1/what-is-the-t1/t1-overview/technical-specifications/` prints: *"18 rotary encoders with
 * push and 23 RBG backlit sillicone keypads"*. Neither figure was used to build the mapping. A
 * frame wrong in either span would have produced oblong pads; a misread drawing would have
 * produced the wrong count.
 *
 * ## What is measured here and what is not
 *
 * Measured: all 18 encoder centres and their diameter, all 23 keypad centres and their size, the
 * four section hairlines' horizontal extents, and the logo block. Every number below is a
 * connected-component bounding box carried through the mapping above.
 *
 * **Not measured, and stated rather than implied**: the *height* of the four section boxes. The
 * drawing rules one hairline per section at y 12.1 mm and no box — the sections are bounded by
 * white space below. The boxes here run from that rule down to y 65.1 mm, which is where the
 * lowest label ink of the second encoder row sits in each section's own x range. The width is the
 * drawing's; the depth is this file's, and it is drawn as a `group` because that is §10's hairline
 * cluster boundary rather than a claim about a printed rectangle.
 *
 * **The sixteen value buttons are a `grid`, not sixteen buttons.** They are one block of
 * identical controls whose meaning changes with whichever parameter view is open — the docs call
 * them `[VBx]` throughout and never give one a fixed name. The seven transport and utility keys
 * are individually named on the panel, so those are individual buttons.
 *
 * **No voice field.** This box has no voices (§2.4), so a `kind: 'voices'` region would be a lit
 * rectangle that can never light. The Hapax and the Metropolix are the other two panels that must
 * not have one, for the same reason.
 *
 * Reference, never asset (§10): the figure was decoded by finding the panel border and the
 * control outlines by their own pixel runs, and nothing was kept but the numbers. Our own
 * geometry and line weights; nothing traced, extracted or embedded, and the PNG is not in this
 * repository.
 */

/** Panel rise in mm — the 114 mm depth, which is the vertical span of the surface as played. */
const H = 114

/** Encoder outline diameter, measured off the component bounding boxes. */
const ENC_D = 12.0

/** Keypad size, measured the same way; the pads are square to within 0.01 mm. */
const KEY_W = 14.45
const KEY_H = 14.44

/** The two encoder rows, centre lines. */
const ENC_ROW_1 = 24.1
const ENC_ROW_2 = 51.1

/** The nine encoder columns, centre lines — an even 32.9 mm pitch across the whole panel. */
const ENC_X = [19.9, 53.0, 85.9, 118.9, 152.0, 184.9, 218.0, 251.0, 284.1]

/** The two keypad rows, centre lines. */
const KEY_ROW_1 = 77.1
const KEY_ROW_2 = 97.1

/** The section hairlines, at y 12.1 mm; the depth below is this file's (see the header). */
const RULE_Y = 12.1
const RULE_H = 53.0

/** `x`/`y` are the bounding box, so a knob measured by its centre is placed through here. */
function knob(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'knob', x: cx - ENC_D / 2, y: cy - ENC_D / 2, d: ENC_D, label }
}

/** The same, for a keypad measured by its centre. */
function key(cx: number, cy: number, label: string): PanelFeature {
  return { kind: 'button', x: cx - KEY_W / 2, y: cy - KEY_H / 2, w: KEY_W, h: KEY_H, label }
}

function col(n: number): number {
  const x = ENC_X[n]
  if (x === undefined) throw new Error(`no encoder column ${n}`)
  return x
}

export const T1_PANEL: PanelLayout = {
  panelRiseMm: H,
  verified: {
    kind: 'manual',
    source:
      'Torso T-1 docs, /t1/what-is-the-t1/t1-overview/hardware-interface/, fetched 2026-08-28 — measured off the front-panel figure on that page, which the text mirror drops',
  },
  features: [
    // -----------------------------------------------------------------------
    // The four sections the hardware-interface table numbers 1-4, in its order
    // and under the silkscreen's own lowercase names.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 13.2, y: RULE_Y, w: 122.6, h: RULE_H, label: 'shape' },
    { kind: 'group', x: 145.3, y: RULE_Y, w: 56.5, h: RULE_H, label: 'groove' },
    { kind: 'group', x: 211.2, y: RULE_Y, w: 21.7, h: RULE_H, label: 'tonal' },
    { kind: 'group', x: 244.1, y: RULE_Y, w: 47.3, h: RULE_H, label: 'setup' },

    // -----------------------------------------------------------------------
    // Encoder row 1. Each label is the panel's own pair: the knob's primary
    // function, then the function [CTRL] reaches on the same encoder.
    // -----------------------------------------------------------------------
    knob(col(0), ENC_ROW_1, 'steps'),
    knob(col(1), ENC_ROW_1, 'pulses rotate'),
    knob(col(2), ENC_ROW_1, 'cycles'),
    knob(col(3), ENC_ROW_1, 'division'),
    knob(col(4), ENC_ROW_1, 'velocity probability'),
    knob(col(5), ENC_ROW_1, 'sustain'),
    knob(col(6), ENC_ROW_1, 'pitch harmony'),
    knob(col(7), ENC_ROW_1, 'length quantize'),
    knob(col(8), ENC_ROW_1, 'tempo'),

    // -----------------------------------------------------------------------
    // Encoder row 2, on the same nine columns.
    // -----------------------------------------------------------------------
    knob(col(0), ENC_ROW_2, 'repeats ramp'),
    knob(col(1), ENC_ROW_2, 'time pace'),
    knob(col(2), ENC_ROW_2, 'voicing style'),
    knob(col(3), ENC_ROW_2, 'range phrase'),
    knob(col(4), ENC_ROW_2, 'accent groove'),
    knob(col(5), ENC_ROW_2, 'timing delay'),
    knob(col(6), ENC_ROW_2, 'scale root'),
    knob(col(7), ENC_ROW_2, 'channel output'),
    knob(col(8), ENC_ROW_2, 'random rate'),

    // -----------------------------------------------------------------------
    // The sixteen value buttons — the hardware-interface table's group 5,
    // "Track selection, parameter visualization, pattern and bank access".
    // Eight columns over two rows, on the measured footprint of the block.
    // -----------------------------------------------------------------------
    {
      kind: 'grid',
      x: 13.0,
      y: 69.9,
      w: 168.5,
      h: 34.4,
      cols: 8,
      rows: 2,
      shape: 'pad',
      label: 'value',
    },

    // -----------------------------------------------------------------------
    // Group 6, "Transport & Utility" — the seven keys the table names, each
    // one of them named on the panel too.
    // -----------------------------------------------------------------------
    key(218.3, KEY_ROW_1, 'play'),
    key(262.4, KEY_ROW_1, 'clear'),
    key(284.4, KEY_ROW_1, 'ctrl'),
    key(218.3, KEY_ROW_2, 'bank'),
    key(240.3, KEY_ROW_2, 'pattern'),
    key(262.4, KEY_ROW_2, 'temp'),
    key(284.4, KEY_ROW_2, 'mute'),

    // The logo block, between the value buttons and the transport keys.
    { kind: 'label', x: 200.0, y: 96.8, text: 't|so' },
  ],
}
