import type { PanelFeature, PanelLayout } from '../../core/device'

/**
 * §10. **The RD-9's panel, from the figure the User Manual does not contain.**
 *
 * This box was the library's only entry in `test/rack.test.ts`'s `UNDRAWN` list, and the reason
 * given there was accurate about the manual: §3 "Front and Rear Panel Control Layout" (pp.6-8)
 * draws the panel in eleven separate section crops, each at its own scale with its own callouts,
 * and no page shows them together. Composing them would have meant guessing where each section
 * sits, which is estimated coordinates under another name.
 *
 * The **Quick Start Guide** has what the manual is missing. `QSG_BE_0704-AAB_RD-9_WW.pdf`, p.8
 * (folio 14-15, "RD-9 Controls"), prints a complete top-down view of the instrument with its
 * chassis outline, every control drawn in place, and a matching rear view below it. One figure,
 * one scale, both axes.
 *
 * **The anchor and the residual.** Rendered at 400 dpi, the chassis silhouette measures
 * 2634 x 1387 px. The span is the cited `477 mm` from the specifications, so:
 *
 *     PX_TO_MM = 477 / 2634
 *     drawn aspect  2634 / 1387        = 1.899
 *     rise          477 / 1.899        = 251.2 mm
 *     specification depth              = 264 mm
 *     outside the top view             =  12.8 mm
 *
 * That residual is the rear jack barrels and the sloped back edge, which stand behind the surface
 * you look down on. **The RD-8's panel is the check on it**: a different box, a different drawing
 * in a different document, measured independently, and it leaves 13.6 mm of its own 265 mm depth
 * outside its top view. Two siblings agreeing to under a millimetre on a figure neither of them
 * was fitted to is the strongest evidence available here that the method reads the drawings right.
 *
 * Coordinates below are the measured pixels of that render, origin at the chassis top-left corner,
 * passed through `mm()`. Pixels rather than millimetres so the numbers in this file are the ones
 * somebody re-measuring the figure would read off it, exactly as `behringer-rd-8/panel.ts` does.
 *
 * §10's rule holds: nothing here is extracted, embedded or traced. The figure was measured and the
 * panel redrawn in this repo's own vocabulary.
 */

const PX_TO_MM = 477 / 2634

const mm = (px: number): number => Math.round(px * PX_TO_MM * 10) / 10

/** 1387 px of drawn chassis at the span's own scale. See the note above on the 12.8 mm residual. */
const RISE = mm(1387)

/** The voice block's knobs, which measure 79 px across the cap and rim alike. */
const VOICE_KNOB_D = mm(79)

/** MASTER, PHONES and the four FX knobs, drawn a size up from the voice knobs at 98 px. */
const BIG_KNOB_D = mm(98)

/**
 * The three knob rows of the voice block. Every column that has a knob on a row has it on this
 * centre line, which is what makes the block read as a grid at arm's length (§8).
 */
const ROW_TUNE = 404
const ROW_SHAPE = 575
const ROW_TAIL = 746

/**
 * The nine section columns, measured at their printed dividing rules. ACCENT is narrower than the
 * eight voice sections, which share a uniform 220 px pitch.
 */
const SECTION = [586, 760, 980, 1200, 1420, 1640, 1860, 2080, 2300, 2520]

function knob(cx: number, cy: number, label: string, d = VOICE_KNOB_D): PanelFeature {
  return { kind: 'knob', x: mm(cx) - d / 2, y: mm(cy) - d / 2, d, label }
}

/** A rectangular push button, measured as a box around its printed outline. */
function button(cx: number, cy: number, w: number, h: number, label: string): PanelFeature {
  return { kind: 'button', x: mm(cx - w / 2), y: mm(cy - h / 2), w: mm(w), h: mm(h), label }
}

/** A hairline section boundary the panel actually prints. */
function group(i: number, y: number, h: number, label: string): PanelFeature {
  const x = SECTION[i]
  const next = SECTION[i + 1]
  if (x === undefined || next === undefined) throw new Error(`behringer-rd-9 panel: no section ${i}`)
  return { kind: 'group', x: mm(x), y: mm(y), w: mm(next - x), h: mm(h), label }
}

export const RD9_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'RHYTHM DESIGNER RD-9 Quick Start Guide, p.8 (top view, the RD-9 Controls spread)',
  },
  features: [
    // ---- volume, top left ---------------------------------------------------------
    knob(171, 174, 'MASTER', BIG_KNOB_D),
    knob(506, 174, 'PHONES', BIG_KNOB_D),

    // ---- the FX bus: one analog filter and one Wave Designer, shared by every voice sent ----
    group(0, 190, 200, 'FX'),
    knob(171, 327, 'CUTOFF', BIG_KNOB_D),
    button(282, 330, 83, 55, 'HPF'),
    button(393, 331, 83, 54, 'ON'),
    knob(506, 327, 'RESONANCE', BIG_KNOB_D),
    { kind: 'label', x: mm(338), y: mm(378), text: 'ANALOG FILTER', align: 'middle' },
    knob(171, 502, 'ATTACK', BIG_KNOB_D),
    button(394, 506, 82, 54, 'SEND'),
    knob(506, 502, 'SUSTAIN', BIG_KNOB_D),
    { kind: 'label', x: mm(338), y: mm(430), text: 'WAVE DESIGNER', align: 'middle' },

    // ---- edit, mode and sync, stacked down the left edge ---------------------------
    button(170, 643, 82, 55, 'SAVE'),
    button(282, 643, 82, 55, 'COPY'),
    button(393, 643, 82, 55, 'ERASE'),
    button(505, 643, 82, 55, 'DUMP'),
    { kind: 'label', x: mm(338), y: mm(600), text: 'EDIT', align: 'middle' },

    button(191, 765, 128, 52, 'SONG'),
    button(338, 765, 128, 52, 'PATTERN'),
    button(485, 765, 128, 52, 'STEP'),
    { kind: 'label', x: mm(338), y: mm(722), text: 'MODE', align: 'middle' },

    button(180, 878, 96, 60, 'SYNC CYCLE'),
    { kind: 'label', x: mm(338), y: mm(835), text: 'SYNC', align: 'middle' },

    // ---- the nine section headings across the voice block --------------------------
    group(0, 330, 60, 'ACCENT'),
    group(1, 330, 60, 'BASS DRUM'),
    group(2, 330, 60, 'SNARE DRUM'),
    group(3, 330, 60, 'LOW TOM'),
    group(4, 330, 60, 'MID TOM'),
    group(5, 330, 60, 'HI TOM'),
    group(6, 330, 60, 'RIM SHOT  CLAP'),
    group(7, 330, 60, 'HI HAT'),
    group(8, 330, 60, 'CYMBAL'),

    // ---- ACCENT: one knob, and it is not a voice -----------------------------------
    knob(673, ROW_TUNE, 'ACCENT'),

    // ---- the eight voice sections, three rows deep ---------------------------------
    // BASS DRUM is the only column with all three rows.
    knob(817, ROW_TUNE, 'TUNE'),
    knob(925, ROW_TUNE, 'LEVEL'),
    knob(817, ROW_SHAPE, 'ATTACK'),
    knob(925, ROW_SHAPE, 'DECAY'),
    knob(817, ROW_TAIL, 'P. DEPTH'),
    knob(925, ROW_TAIL, 'PITCH'),

    knob(1037, ROW_TUNE, 'TUNE'),
    knob(1145, ROW_TUNE, 'LEVEL'),
    knob(1037, ROW_SHAPE, 'TONE'),
    knob(1145, ROW_SHAPE, 'SNAPPY'),

    // The three toms carry TUNE, LEVEL and a lone DECAY.
    knob(1257, ROW_TUNE, 'TUNE'),
    knob(1365, ROW_TUNE, 'LEVEL'),
    knob(1257, ROW_SHAPE, 'DECAY'),

    knob(1477, ROW_TUNE, 'TUNE'),
    knob(1585, ROW_TUNE, 'LEVEL'),
    knob(1477, ROW_SHAPE, 'DECAY'),

    knob(1696, ROW_TUNE, 'TUNE'),
    knob(1805, ROW_TUNE, 'LEVEL'),
    knob(1696, ROW_SHAPE, 'DECAY'),

    // RIM SHOT and CLAP share a section and have a level each, no tuning.
    knob(1916, ROW_TUNE, 'LEVEL'),
    knob(2025, ROW_TUNE, 'LEVEL'),

    knob(2136, ROW_TUNE, 'TUNE'),
    knob(2245, ROW_TUNE, 'LEVEL'),
    knob(2136, ROW_SHAPE, 'CH DECAY'),
    knob(2245, ROW_SHAPE, 'OH DECAY'),

    knob(2356, ROW_TUNE, 'LEVEL'),
    knob(2465, ROW_TUNE, 'LEVEL'),
    knob(2356, ROW_SHAPE, 'CRASH TUNE'),
    knob(2465, ROW_SHAPE, 'RIDE TUNE'),

    /**
     * The eleven voice-select buttons, and the field the resolver lights.
     *
     * They are not on one row: the three sections that carry two voices each print the first
     * above the second, so RIM SHOT, CLOSED and CRASH sit a row higher than the eight beneath
     * them. The field spans both rows, which is where a lit cell belongs — this is where the box
     * selects a voice, so an occupied assignable lands on the control you actually press.
     *
     * **ACCENT is outside it**, exactly as on the RD-8: it is a global emphasis control rather
     * than an assignable, and putting it inside the field would offer the resolver a voice that
     * does not exist.
     */
    button(1971, 744, 129, 60, 'RIM SHOT'),
    button(2191, 744, 129, 60, 'CLOSED'),
    button(2411, 744, 129, 60, 'CRASH'),

    button(870, 874, 129, 55, 'BASS DRUM'),
    button(1090, 874, 129, 55, 'SNARE DRUM'),
    button(1311, 874, 129, 55, 'LOW TOM'),
    button(1531, 874, 129, 55, 'MID TOM'),
    button(1751, 874, 129, 55, 'HI TOM'),
    button(1971, 874, 111, 55, 'CLAP'),
    button(2186, 874, 119, 55, 'OPEN'),
    button(2411, 874, 129, 55, 'RIDE'),

    { kind: 'voices', x: mm(806), y: mm(714), w: mm(1669), h: mm(190) },

    // ---- the bottom strip: transport, display, steps -------------------------------
    button(191, 1006, 121, 111, 'TAP / HOLD'),
    { kind: 'screen', x: mm(410 - 124), y: mm(1006 - 53), w: mm(248), h: mm(107) },
    knob(623, 1006, 'DATA', mm(60)),
    button(850, 1038, 122, 48, 'DATA MODE'),

    button(1117, 1006, 122, 111, 'AUTO SCROLL'),
    button(1241, 1038, 76, 48, '<<'),
    button(1365, 1038, 122, 48, 'LENGTH'),
    button(1489, 1038, 76, 48, '>>'),

    button(191, 1180, 121, 111, 'RECORD'),
    button(338, 1180, 121, 111, 'STOP'),
    button(485, 1180, 121, 111, 'PLAY / PAUSE'),

    button(2255, 1006, 121, 111, 'TRIGGER'),
    button(2437, 1006, 122, 48, 'MUTE'),
    button(2437, 1048, 122, 48, 'SOLO'),
    button(2437, 1144, 122, 48, 'SETTINGS'),
    button(2437, 1218, 122, 48, 'AUTO FILL'),
    { kind: 'label', x: mm(2437), y: mm(963), text: 'TRACK', align: 'middle' },

    /**
     * The sixteen step buttons, on one uniform pitch. Measured at 621.5 and 2299 for the first and
     * last centres, which is 111.83 px between them — computed rather than typed sixteen times, so
     * a re-measurement moves one number and the row stays even.
     */
    ...Array.from({ length: 16 }, (_, i): PanelFeature => {
      const cx = 621.5 + i * ((2299 - 621.5) / 15)
      return { kind: 'button', x: mm(cx - 32.5), y: mm(1180 - 32.5), w: mm(65), h: mm(65), label: `${i + 1}` }
    }),

    { kind: 'label', x: mm(1460), y: mm(1285), text: 'BASIC RHYTHM', align: 'middle' },
  ],
}
