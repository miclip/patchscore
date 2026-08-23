import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Tracker Mini's panel.
 *
 * Read off the Hardware Overview drawing in the manual (2.2.1b, p.13) — the same figure the
 * cited `panelSpanMm` comes from, which carries its own dimension lines: 130 mm across, 170 mm
 * down, 20 mm thick. Our own geometry and line weights; nothing traced or embedded.
 *
 * **The box is portrait**, and that is the whole reason `panelSpanMm` is 130 rather than the 170
 * Polyend's specifications call the width. In a rack of landscape boxes this panel is meant to
 * read as narrow and tall, because it is.
 *
 * The voice field sits **on the screen**, which is where a tracker's tracks actually live: the
 * display is the track view, so two banks of eight lit cells is what this box looks like doing
 * the job. It is also the only region on a 130 mm panel with room for sixteen of them.
 */
export const TRACKER_MINI_PANEL: PanelLayout = {
  panelRiseMm: 170,
  verified: { kind: 'manual', source: 'Polyend Tracker Mini Manual 2.2.1b, p.13 (Hardware Overview)' },
  features: [
    { kind: 'screen', x: 8, y: 10, w: 114, h: 70 },
    { kind: 'voices', x: 12, y: 14, w: 106, h: 62 },

    // The row of eight function buttons directly under the screen.
    { kind: 'grid', x: 8, y: 83, w: 114, h: 8, cols: 8, rows: 1, shape: 'pad' },

    // Left: a tall button over the arrow cluster.
    { kind: 'button', x: 24, y: 97, w: 8, h: 17, round: true },
    { kind: 'grid', x: 10, y: 116, w: 32, h: 22, cols: 3, rows: 3, shape: 'pad' },

    // Centre: the main button matrix. Right: a column of mode buttons.
    { kind: 'grid', x: 47, y: 96, w: 42, h: 40, cols: 3, rows: 4, shape: 'pad' },
    { kind: 'grid', x: 96, y: 96, w: 22, h: 40, cols: 1, rows: 5, shape: 'pad' },

    // The wide button under the matrix, and the encoder at the foot of the panel.
    { kind: 'button', x: 49, y: 146, w: 36, h: 6 },
    { kind: 'knob', x: 30, y: 158, d: 7 },
  ],
}
