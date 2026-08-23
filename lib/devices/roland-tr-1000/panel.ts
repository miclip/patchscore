import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the TR-1000's top panel.
 *
 * Read off the Owner's Manual panel diagram (eng02, p.9, "Top panel/front panel") the way a
 * parameter value is read off a specifications table: the numbered callouts on that page name
 * six clusters, and the coordinates below are those clusters measured against the panel's own
 * outline and converted to millimetres. Nothing is extracted, traced or embedded — this is our
 * geometry, in our line weights, and the manual is gitignored precisely so none of it ships.
 *
 * The panel is landscape and Roland labels its axes, so `panelSpanMm` 486 is the horizontal span
 * and 311 — the figure the specifications call *depth* — is the vertical span of the surface you
 * play. Checked against the drawing rather than assumed: the diagram's aspect is ~1.60 against
 * 486/311 = 1.56.
 *
 * The voice field lands on callout ④, the instrument-select row, whose ten buttons are silkscreened
 * BD SD LT HT RS HC CH OH CC RC — the same ten fixed voices this manifest declares, in the same
 * order. That is the one place on this box where "which voice is in use" is a real question the
 * panel answers, so it is where the resolver's answer belongs.
 */

/** Callout ②'s effect strip: eleven small knobs on one line. */
const FX_KNOBS: { x: number; label: string }[] = [
  { x: 114, label: 'LEVEL' },
  { x: 140, label: 'LEVEL' },
  { x: 158, label: 'TIME' },
  { x: 184, label: 'LEVEL' },
  { x: 202, label: 'TIME' },
  { x: 220, label: 'FDBK' },
  { x: 250, label: 'CTRL 1' },
  { x: 268, label: 'CTRL 2' },
  { x: 286, label: 'CTRL 3' },
  { x: 330, label: 'FILTER' },
  { x: 348, label: 'DRIVE' },
]

export const TR_1000_PANEL: PanelLayout = {
  panelRiseMm: 311,
  verified: { kind: 'manual', source: "TR-1000 Owner's Manual eng02, p.9 (Top panel/front panel)" },
  features: [
    // ① Common / pattern section, left column.
    { kind: 'group', x: 10, y: 26, w: 76, h: 214, label: 'PATTERN' },
    { kind: 'knob', x: 18, y: 34, d: 14, label: 'VOLUME' },
    { kind: 'knob', x: 54, y: 34, d: 14, label: 'EXT IN' },
    { kind: 'grid', x: 15, y: 58, w: 66, h: 178, cols: 2, rows: 9, shape: 'pad' },

    // ② Effect controlling section, the strip across the top.
    { kind: 'group', x: 88, y: 24, w: 318, h: 40 },
    { kind: 'label', x: 96, y: 32, text: 'ACCENT' },
    { kind: 'label', x: 138, y: 32, text: 'REVERB' },
    { kind: 'label', x: 182, y: 32, text: 'DELAY' },
    { kind: 'label', x: 248, y: 32, text: 'MASTER FX' },
    { kind: 'label', x: 310, y: 32, text: 'ANALOG FX' },
    { kind: 'button', x: 94, y: 38, w: 14, h: 11, label: 'STEP' },
    { kind: 'button', x: 236, y: 38, w: 11, h: 11, label: 'ON' },
    { kind: 'button', x: 310, y: 38, w: 11, h: 11, label: 'ON' },
    ...FX_KNOBS.map((k) => ({ kind: 'knob' as const, x: k.x, y: 38, d: 11, label: k.label })),

    // ③ Instrument section: eleven columns of three knobs over a fader.
    { kind: 'grid', x: 92, y: 70, w: 312, h: 74, cols: 11, rows: 3, shape: 'knob' },
    { kind: 'grid', x: 92, y: 150, w: 312, h: 62, cols: 11, rows: 1, shape: 'fader' },

    // ④ Instrument select — the resolver's readout.
    { kind: 'voices', x: 90, y: 218, w: 314, h: 22, label: 'INSTRUMENT' },

    // ⑤ Display and ⑥ its button cluster, right column.
    { kind: 'screen', x: 411, y: 28, w: 70, h: 40 },
    { kind: 'grid', x: 411, y: 76, w: 70, h: 136, cols: 4, rows: 6, shape: 'pad' },

    // ⑧ Tempo.
    { kind: 'group', x: 409, y: 235, w: 74, h: 52, label: 'TEMPO' },
    { kind: 'knob', x: 430, y: 248, d: 20, label: 'TEMPO' },

    // ⑦ Transport and the sixteen step keys.
    { kind: 'button', x: 15, y: 250, w: 24, h: 16, label: 'START' },
    { kind: 'button', x: 44, y: 250, w: 26, h: 16, label: 'STOP' },
    { kind: 'grid', x: 75, y: 248, w: 328, h: 38, cols: 16, rows: 1, shape: 'key', label: 'STEP' },
  ],
}
