import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Circuit Tracks' top panel.
 *
 * Read off the *Top View* figure in the User Guide (v3, printed p.15) — the clusters, their
 * order, their sizes and their pitch — and laid out again in our own geometry and line weights.
 * Nothing is extracted, embedded or traced, and no vendor artwork ships.
 *
 * ## The figure is a photograph, and that changes the method
 *
 * `moog-dfam/panel.ts` measures a line drawing and `roland-mc-707/panel.ts` measures a technical
 * illustration. Novation's *Top View* is neither: it is a lit product render, straight-on and
 * complete, with every control labelled. Straight-on is what matters — a pixel distance means
 * the same thing everywhere on it — but the render is lit from above-left and every control is
 * black on black, so the thresholding those two panels use finds shading gradients rather than
 * edges. Three passes at it are recorded here because two of them produced plausible numbers
 * that were wrong:
 *
 *  - **Thresholding the knob bodies puts every centre left of the knob.** The cap's lit top face
 *    is offset from the cap by the lighting, so a mid-grey mask centres on the highlight. On the
 *    two knobs whose position was independently known this was out by 11 and 8 px.
 *  - **Connected components merge.** At any threshold that finds a knob at all, the eight macro
 *    encoders join to each other and to the callout rules between them.
 *
 * What *is* unambiguous in the render is the thing the render puts there deliberately: the white
 * printed **arc** around each encoder, and the bright **LED bar** beneath it. Both are
 * near-white, unsaturated and thin, and both are concentric with the control. Every knob centre
 * below is one of those, cross-checked against the other:
 *
 * | | arc bbox centre | LED centre | agreement |
 * |---|---|---|---|
 * | Macro 4 | 740.5 | 740.0 | 0.5 px |
 * | Macro 5 | 869.5 | 869.5 | 0 px |
 *
 * The nine LED bars are the primary measurement — they segment cleanly on saturated magenta at
 * every threshold tried, and they land at a **constant 70.5 px below** the arc centre on both
 * knobs where both were measurable. Two macro arcs (`1` and `8`) touch the figure's own callout
 * rule and could not be isolated; their LEDs could, and the LEDs put them at 353.5 and 1256.0.
 * That is a measurement, not an assumption of regularity — and it is then corroborated by one:
 * the eight macro columns land on the eight **pad** columns to within 1.5 px, on a pad grid
 * segmented independently on saturated colour.
 *
 * ## Scale, and the aspect check (§2.3)
 *
 * The panel's own border was located at columns **69-1598** and rows **337-1650** of a 200 dpi
 * render, giving **1530 x 1314 px**. `panelSpanMm` is 240 and `panelRiseMm` is 210, both from
 * Novation's published specification (`240mm` length, `210mm` depth, `45mm` height) — the box is
 * a landscape desktop unit played lying flat, so there is no orientation trap: the length is the
 * horizontal span as played and the depth is the panel's rise. The check §2.3 asks for:
 *
 * | | |
 * |---|---|
 * | drawn | 1530 / 1314 = **1.16438** |
 * | specified | 240 / 210 = **1.14286** |
 * | residual | **+1.88%** |
 *
 * Under two parts in a hundred, which at 200 dpi is about 25 px over the whole panel — the
 * render's own drop shadow is that wide. **The geometry is unstretched**, following the MC-707:
 * one scale, `240 / 1530 = 0.156863 mm/px`, on both axes. The drawing's 1314 px of rise become
 * **206.12 mm inside the 210 mm box**, and the 3.88 mm left over is **split evenly, 1.94 mm at
 * each end**. Splitting is a choice and is named as one: nothing in any document says where the
 * residual falls, so the panel does not invent an asymmetry by pushing it all to one lip. What
 * it does not do is scale the axes differently to force 1.14286, which would draw every encoder
 * as an ellipse.
 *
 * ## What is drawn
 *
 * Top to bottom: the wordmark, the ten encoders (Master Volume, the eight Macros in two rows of
 * four, Master Filter), the button row, Preset and Patterns flanking the eight track buttons,
 * and the pad area flanked by the four step buttons on the left and Mixer / FX / Record / Play
 * on the right.
 *
 * **The encoder diameters are measured and not all equal.** A radial intensity profile from each
 * measured centre finds the cap edge — the dark gap ring between cap and panel — at r = 43-47 px
 * across the eight Macros (mean 45.25, so **14.20 mm**), 48 px for Master Volume (**15.06 mm**)
 * and 52 px for Master Filter (**16.31 mm**). The 4 px spread across the eight Macros is render
 * noise on eight identical parts, so they are drawn at the mean rather than at eight slightly
 * different sizes; the two master encoders really are larger, and the profile separates them by
 * more than that spread.
 *
 * The pad block was segmented independently on saturated colour, all 32 of them: columns pitch
 * at 128.29 px and rows at 127.70, and the block occupies 299-1307 x 1048-1544. That pitch is
 * what corroborates the eight macro columns above, and the block's extent is what the voice
 * field below is drawn to.
 *
 * ## The voice field takes three pad rows, and the track row is drawn as eight real buttons
 *
 * The track row looks like the obvious home — eight buttons reading `Synth 1` `Synth 2` `MIDI 1`
 * `MIDI 2` `Drum 1`-`Drum 4`, the row a reader presses to reach a part — and it was authored
 * there first. **It does not fit, by a third of a millimetre, and the arithmetic is worth
 * recording** so nobody re-authors it there. This device declares two pools, so `banksFor`
 * spends `BANK_LABEL_MM` twice (10 mm) plus a 3 mm gap between the banks, leaving `h - 13` for
 * two rows of cells against a `MIN_CELL_H_MM` of 3. The row needs **19 mm** and measures
 * **18.66**. Nothing here may be stretched to close that: the row is where it is.
 *
 * So the field goes on the pad block, which is the Deluge's arrangement — `voices` over part of
 * the pads, a `grid` over the rest — and true of this box for a stronger reason than it is of
 * that one: every part on a Circuit Tracks is entered and played on those pads, whichever track
 * is selected, and Note View for a drum track *is* the sample pads.
 *
 * **Three rows of the four, and the split is a drawing decision rather than a claim about the
 * box.** The whole block is 60% taller than six cells can fill under `CELL_ASPECT`, so a field
 * over all four rows leaves a quarter of itself empty and reads as a panel with fewer parts than
 * the box has — `rack.test.ts` measures that at 0.529 against a 0.55 floor. Three rows fit the
 * six cells properly (0.555) and the fourth row stays drawn as pads, so the block still reads as
 * the 4 x 8 grid it is. Nothing about the box divides its pads three-and-one, and this file does
 * not pretend otherwise; both boxes span the measured pitch, so the fourth row's cells sit on
 * the real pads and the seam between the two falls on a real row boundary.
 *
 * The eight track buttons are drawn as buttons instead, **including the two MIDI ones**. That is
 * the honest rendering of the count this manifest is short: a reader sees eight track buttons on
 * the panel and six cells on the pads, and the two that are missing are named on the panel.
 */

/** px -> mm on the horizontal, from the measured panel border at column 69. */
const K = 240 / 1530

/** The vertical residual, split evenly (see above). */
const DY = (210 - 1314 * K) / 2

function x(px: number): number {
  return Math.round((px - 69) * K * 100) / 100
}

function y(py: number): number {
  return Math.round(((py - 337) * K + DY) * 100) / 100
}

/** A knob from its measured centre and cap diameter, both in pixels. */
function knob(label: string, cx: number, cy: number, dPx: number) {
  const d = Math.round(dPx * K * 100) / 100
  return { kind: 'knob' as const, x: x(cx) - d / 2, y: y(cy) - d / 2, d, label }
}

/** A button from its measured face rectangle, in pixels. */
function button(label: string, x0: number, x1: number, y0: number, y1: number) {
  return {
    kind: 'button' as const,
    x: x(x0),
    y: y(y0),
    w: Math.round((x(x1) - x(x0)) * 100) / 100,
    h: Math.round((y(y1) - y(y0)) * 100) / 100,
    label,
  }
}

/** The eight Macro encoders share one cap diameter — the mean of the eight measured. */
const MACRO_D = 90.5

/**
 * The pad block, in pixels: the first pad's top-left corner and the two measured pitches. The
 * voice field and the fourth-row grid are both derived from these so they cannot drift apart.
 */
const PAD_X0 = 299
const PAD_Y0 = 1048
const COL_PITCH = (1252.5 - 354.5) / 7
const ROW_PITCH = (1486.9 - 1103.8) / 3

export const CIRCUIT_TRACKS_PANEL: PanelLayout = {
  panelRiseMm: 210,
  verified: { kind: 'manual', source: 'Circuit Tracks User Guide v3, p.15 (Top View)' },
  features: [
    // The wordmark, measured across the five white letter groups at rows 395-426.
    { kind: 'label', x: x(153), y: y(410), text: 'CIRCUIT TRACKS' },

    // Encoders. Top row at cy 536.5, bottom at 687.5; Master Filter sits between the rows at 687.
    knob('Master Volume', 218.0, 536.5, 96),
    knob('2 Oscillator Mod', 482.0, 536.5, MACRO_D),
    knob('4 Filter Envelope', 740.0, 536.5, MACRO_D),
    knob('6 Resonance', 998.0, 536.5, MACRO_D),
    knob('8 FX', 1256.0, 536.5, MACRO_D),
    knob('1 Oscillator', 353.5, 687.5, MACRO_D),
    knob('3 Amp Envelope', 611.5, 687.5, MACRO_D),
    knob('5 Filter Frequency', 869.5, 687.5, MACRO_D),
    knob('7 Modulation', 1127.0, 687.5, MACRO_D),
    knob('Master Filter', 1393.5, 687.0, 104),

    // The button row. Tempo/Swing, Clear and Duplicate stand a little taller than their
    // neighbours in the figure and are drawn that way rather than levelled to a common height.
    button('Scales', 148, 270, 811, 882),
    button('Octave Down', 286, 406, 811, 883),
    button('Octave Up', 426, 535, 811, 883),
    button('1-16 / 17-32', 542, 664, 811, 882),
    button('Tempo / Swing', 670, 794, 803, 882),
    button('Clear', 798, 923, 803, 882),
    button('Duplicate', 927, 1052, 805, 882),
    button('Save', 1062, 1182, 811, 882),
    button('Projects', 1200, 1311, 811, 882),
    button('Shift', 1324, 1450, 811, 882),

    // Preset and Patterns flank the track row.
    button('Preset', 148, 270, 894, 1020),
    button('Patterns', 1324, 1450, 890, 1020),

    // The eight track buttons, split at the measured gaps between their faces.
    button('Synth 1', 297, 407, 906, 1025),
    button('Synth 2', 426, 536, 906, 1025),
    button('MIDI 1', 555, 665, 906, 1025),
    button('MIDI 2', 684, 794, 906, 1025),
    button('Drum 1', 813, 923, 906, 1025),
    button('Drum 2', 942, 1052, 906, 1025),
    button('Drum 3', 1070, 1182, 906, 1025),
    button('Drum 4', 1199, 1311, 906, 1025),

    // The step buttons, left of the grid.
    button('Note', 144, 279, 1044, 1158),
    button('Velocity', 144, 279, 1176, 1287),
    button('Gate', 144, 279, 1305, 1414),
    button('Pattern Settings', 144, 279, 1432, 1546),

    // §10's one resolver-written region: the **top three** pad rows, with the fourth drawn as
    // pads beneath it. Both boxes span the measured pitch — one pad's left edge to eight column
    // pitches across, and whole row pitches down — so the fourth row's eight cells land on the
    // eight pads and the two boxes meet without a seam.
    {
      kind: 'voices',
      x: x(PAD_X0),
      y: y(PAD_Y0),
      w: Math.round((x(PAD_X0 + 8 * COL_PITCH) - x(PAD_X0)) * 100) / 100,
      h: Math.round((y(PAD_Y0 + 3 * ROW_PITCH) - y(PAD_Y0)) * 100) / 100,
      label: 'Tracks',
    },
    {
      kind: 'grid',
      x: x(PAD_X0),
      y: y(PAD_Y0 + 3 * ROW_PITCH),
      w: Math.round((x(PAD_X0 + 8 * COL_PITCH) - x(PAD_X0)) * 100) / 100,
      h: Math.round((y(PAD_Y0 + 4 * ROW_PITCH) - y(PAD_Y0 + 3 * ROW_PITCH)) * 100) / 100,
      cols: 8,
      rows: 1,
      shape: 'pad',
    },

    // Transport and view buttons, right of the grid.
    button('Mixer', 1335, 1447, 1047, 1168),
    button('FX', 1335, 1447, 1172, 1296),
    button('Record', 1335, 1447, 1305, 1414),
    button('Play', 1335, 1447, 1432, 1546),
  ],
}
