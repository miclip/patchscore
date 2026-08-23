import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Deluge's panel.
 *
 * Read off the Hardware Overview figure in the Official Guidebook (OS 4.1 OLED, §1.3). A warning
 * for whoever comes next: **that figure is split across two pages and each page clips it** — the
 * page render shows only the left portion, and the right portion is on the following page. The
 * two halves were extracted separately and joined on the pad grid's own column pitch, which is
 * the only feature visible in both. If a cluster here looks a few millimetres off, that seam is
 * why; the clusters are in the right places and the proportions are right, which is what a
 * simplified panel owes. Nothing is traced, extracted into the repo, or shipped.
 *
 * Landscape, and checked rather than assumed: the plan view's aspect is ~1.47 against
 * 305/208 = 1.47, so the specifications' first figure really is the horizontal span here.
 *
 * The pad grid is 16 × 8 — the guidebook says so in words ("the pad grid is laid out with 16 x 8
 * physical pads"), and the two sidebar columns are silkscreened MUTE/LAUNCH and AUDITION/SECTION
 * on the same drawing. The voice field is laid over the main grid because that is where a
 * Deluge's clips live; the cells are this rig's 24 assignables, not 128 pads, so the field is a
 * readout on the grid rather than a map of it.
 */

/** The eight small parameter knobs in their box, LEVEL/PAN through CUSTOM 2/CUSTOM 3. */
const PARAM_KNOBS: PanelFeature[] = [
  41.2, 52.8, 65.1, 76.9, 88.8, 100.6, 112.5, 124.3,
].map((cx) => ({ kind: 'knob', x: cx - 3, y: 41.3, d: 6 }))

/** BACK / LOAD / SAVE / LEARN, TAP TEMPO / SYNC-SCALING / TRIPLETS, PLAY / RECORD / SHIFT. */
const BUTTON_COLUMNS: PanelFeature[] = [203.5, 240.6, 274.9].flatMap((cx) =>
  [36.7, 48.7, 60.7, 72.8].map((cy) => ({
    kind: 'button' as const,
    x: cx - 3.8,
    y: cy - 3.8,
    w: 7.6,
    h: 7.6,
    round: true,
  })),
)

export const DELUGE_PANEL: PanelLayout = {
  panelRiseMm: 208,
  verified: {
    kind: 'manual',
    source: 'Deluge Official Guidebook OS 4.1 (OLED), §1.3 Hardware Overview',
  },
  features: [
    // Left: the two scroll/zoom rotaries.
    { kind: 'knob', x: 32.5, y: 17, d: 19 },
    { kind: 'knob', x: 1.8, y: 52.8, d: 19 },

    // The two large gold rotaries, each with its four-LED column. Unlabelled on purpose: at this
    // scale six labels inside 130 mm collide into a smear, and a silkscreen you cannot read is
    // worse than none. Only the controls with room keep their names.
    { kind: 'grid', x: 85.3, y: 16.8, w: 3.8, h: 18.4, cols: 1, rows: 4, shape: 'pad' },
    { kind: 'knob', x: 91.4, y: 16.4, d: 17.8 },
    { kind: 'grid', x: 55.7, y: 53.1, w: 4, h: 18.5, cols: 1, rows: 4, shape: 'pad' },
    { kind: 'knob', x: 61, y: 52.1, d: 20 },

    // The parameter-select row inside its outline.
    { kind: 'group', x: 35, y: 37, w: 95, h: 14 },
    ...PARAM_KNOBS,

    { kind: 'button', x: 85.4, y: 58.6, w: 6.9, h: 6.9, round: true },
    { kind: 'button', x: 109.6, y: 52.6, w: 7.2, h: 7.2, round: true },
    { kind: 'button', x: 109.6, y: 64.5, w: 7.2, h: 7.2, round: true },

    // The display cluster: SELECT, SETTINGS, the OLED, and the clip-type knobs under it.
    { kind: 'group', x: 126, y: 33, w: 77, h: 46 },
    { kind: 'knob', x: 130, y: 35, d: 17.8, label: 'SELECT' },
    { kind: 'button', x: 129, y: 59, w: 19, h: 6.5, label: 'SETTINGS' },
    { kind: 'screen', x: 152.5, y: 40, w: 42, h: 13 },
    ...[158.5, 168.5, 179.2, 189.6].map((cx) => ({
      kind: 'knob' as const,
      x: cx - 3.25,
      y: 57.5,
      d: 6.5,
    })),
    ...[159.9, 179.8].map((cx) => ({ kind: 'knob' as const, x: cx - 3.25, y: 69.5, d: 6.5 })),

    // Right: transport and the two big rotaries over it.
    { kind: 'knob', x: 231.4, y: 20, d: 17.9, label: 'TEMPO' },
    { kind: 'knob', x: 264.7, y: 18.7, d: 19.6, label: 'LEVEL' },
    ...BUTTON_COLUMNS,

    // The 16 x 8 grid, and the two sidebar columns beside it (MUTE/LAUNCH, AUDITION/SECTION).
    //
    // The voice field takes the **top two rows** rather than the whole grid, and the remaining
    // six rows are drawn as plain pads. Handing it the full 248 x 124 mm made 24 cells roughly
    // 40 mm across — bigger than a TR-1000 step key, where a real Deluge pad is about 15 — and
    // the panel stopped looking like a Deluge. Two rows keeps the cells at pad size and keeps the
    // grid reading as the 16 x 8 grid it is. No cell claims to be a particular pad; the caption
    // says these are assignables.
    { kind: 'voices', x: 8, y: 78, w: 248, h: 32 },
    { kind: 'grid', x: 8, y: 113, w: 248, h: 89, cols: 16, rows: 6, shape: 'pad' },
    { kind: 'grid', x: 266, y: 78, w: 28, h: 124, cols: 2, rows: 8, shape: 'pad' },
  ],
}
