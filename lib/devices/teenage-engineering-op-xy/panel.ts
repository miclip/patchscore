import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the OP-XY's panel. Our own geometry and line
 * weights; nothing traced, extracted or embedded.
 *
 * ## Two sources, and they are deliberately kept apart
 *
 * **The shape is measured off the manual. The millimetre scale is not, because the manual has
 * none.** Those are different claims from different places and this file does not blur them.
 *
 * *Shape* — the full guide draws the panel top-down, in playing orientation, seventeen times
 * across §2.1-§2.14; every figure is the same artwork with a different cluster tinted. The
 * measurement was taken from the **§2.3 tracks figure on printed p.5**, whose tint falls on the
 * track buttons and leaves the rest unshaded. Method, following `moog-dfam/panel.ts`:
 *
 *  1. Rendered PDF p.9 at 300 dpi (`pdftoppm -r 300`); printed folio 5, read off that page's own
 *     footer.
 *  2. Found the outer rounded rectangle by longest-ink-run, at stroke centres: x 500.5 → 3549.5
 *     px, y 417.5 → 1508.5 px. **3049 × 1091 px, drawn aspect 2.7947.**
 *  3. Took control positions as centroids of the drawing's own dark components, never by eye.
 *     The key grid came out exactly regular — 166.0 px pitch in both axes, seventeen columns,
 *     with a 48 px bezel top, bottom and left — and every centroid landed on that grid to within
 *     a pixel, which is the cross-check that the border was found correctly.
 *
 * *Scale* — **288 × 102 mm, from teenage engineering's product page**
 * (`teenage.engineering/store/op-xy`, "dimensions: 288 x 102 x 29 mm | 11.4 x 4 x 1.2 in"). It
 * is **not a citation and cannot be one**: `Cite` has only `manual` and `observed` kinds, a
 * store page is neither, and `physical.verified` is `false` accordingly — see the note on that
 * field in `index.ts`, which also records that manual §1.4 *technical specifications* (p.3) was
 * rendered and prints no dimension, so nobody need re-derive that.
 *
 * **The two agree to 1.02%**, and that is the reason to trust both: the published 288/102 is an
 * aspect of 2.8235 against the drawn 2.7947. A figure taken from a different source, arriving
 * within one per cent of a measurement made from a drawing, is each one checking the other.
 *
 * That 1% has to go somewhere, so each axis is scaled to its own published dimension —
 * 288/3049 across, 102/1091 down — rather than uniformly. The panel then lands exactly on
 * 288.0 × 102.0 with nothing overhanging, at the cost of the drawing being 1% anisotropic;
 * a knob's `d` uses the horizontal scale, so a circle stays a circle to within that.
 *
 * **Nothing here is derived from my own drawing.** Deriving the span from the aspect I measured
 * would be circular — it would make the panel confirm itself and read like evidence.
 *
 * ## Printed folio = PDF page − 4 here, and − 5 later in the book
 *
 * PDF 57 is unnumbered, so the offset steps by one partway through: PDF 5-56 are printed 1-52,
 * PDF 58-135 are printed 53-130. Established by rendering the page-number corner of twenty-seven
 * pages and reading them, because this PDF's text layer is Paper Capture OCR that substitutes
 * digits for letters. The front-of-book index disagrees with the real folios in several places
 * besides. Every page cited in this device folder was read off a rendered footer.
 *
 * ## What is drawn
 *
 * Six rows, all confirmed against the labelled figures on printed pp.4, 5, 6 and 8:
 *
 *  - the double-height top zone — speaker, volume, projects and tempo, the display, the four
 *    encoders, and sample over com at the right edge (pp.6, 8);
 *  - the mode row: four main modes, then M1-M4 under the display, then the eight track buttons
 *    under the encoders, then players (p.4 — "beneath the encoders you will find the 8 track
 *    buttons", and "switch between the available modules using the four buttons underneath the
 *    screen");
 *  - the sixteen-step sequencer with bar at its right (pp.5, 8);
 *  - transport, then the ten accidentals in their 3-2-3-2 clusters;
 *  - the octave pair and shift, then the fourteen naturals.
 *
 * The two-octave keyboard is the bottom two rows (p.6). Its accidentals sit on the *column
 * boundaries* of the naturals rather than on the grid centres, which is why they are four grids
 * and not one: the gaps are where the box has no sharp, and a single fourteen-wide grid would
 * silently invent two keys. The 3-2-3-2 pattern puts the keyboard's low note on F.
 *
 * The `voices` field sits on the eight track buttons, which is where this box's own track
 * selection lives — p.5: "press a track button to enter that track. peep a white or red light?
 * that's the current, selected track." It is inset about a millimetre inside that row so the lit
 * cells read as sitting *on* the buttons rather than covering the gaps between them; the rack
 * packer caps a voice cell near the size of the controls around it, so on a row this wide and
 * shallow the inset is also what carries region coverage past `test/rack.test.ts`'s floor.
 */
export const OP_XY_PANEL: PanelLayout = {
  // 102 mm is the product-page figure described above, **not** p.5's — the manual prints no
  // dimension. It is the scale the coordinates are expressed in; the uncited-ness of that scale
  // is carried by `physical.verified` in `index.ts`, which is the field the rack actually lays
  // out from.
  panelRiseMm: 102,
  // The drawing, which is what this field is for: every coordinate below is a centroid measured
  // off the §2.3 figure on printed p.5, at 300 dpi.
  verified: { kind: 'manual', source: 'OP-XY full guide v1.1.15, p.5 (2.3 tracks)' },
  features: [
    // ---- top zone: two grid rows tall -------------------------------------
    { kind: 'group', x: 4.53, y: 4.49, w: 31.36, h: 31.04, label: 'speaker' },
    { kind: 'knob', x: 38.02, y: 6.79, d: 11.33, label: 'volume' },
    { kind: 'button', x: 35.89, y: 20.01, w: 15.63, h: 15.52, label: 'projects' },
    { kind: 'button', x: 51.53, y: 20.01, w: 15.68, h: 15.52, label: 'tempo' },
    { kind: 'screen', x: 67.21, y: 4.49, w: 62.63, h: 31.04 },
    { kind: 'knob', x: 136.81, y: 11.44, d: 17.38 },
    { kind: 'knob', x: 168.2, y: 11.44, d: 17.38 },
    { kind: 'knob', x: 199.56, y: 11.44, d: 17.38 },
    { kind: 'knob', x: 230.78, y: 11.44, d: 17.38 },
    { kind: 'button', x: 255.18, y: 4.49, w: 15.63, h: 15.52, label: 'sample' },
    { kind: 'button', x: 255.18, y: 20.01, w: 15.63, h: 15.52, label: 'com' },
    // The level meter, in the right margin beside the key grid (p.3).
    { kind: 'group', x: 275.48, y: 34.45, w: 8.41, h: 17.67, label: 'level' },

    // ---- mode row ---------------------------------------------------------
    { kind: 'grid', x: 4.53, y: 35.53, w: 62.72, h: 15.47, cols: 4, rows: 1, shape: 'pad', label: 'modes' },
    { kind: 'grid', x: 67.25, y: 35.53, w: 62.72, h: 15.47, cols: 4, rows: 1, shape: 'pad', label: 'M1-M4' },
    { kind: 'voices', x: 130.9, y: 36.5, w: 123.5, h: 13.5, label: 'tracks' },
    { kind: 'button', x: 255.41, y: 35.53, w: 15.68, h: 15.47, round: true, label: 'players' },

    // ---- step sequencer ---------------------------------------------------
    { kind: 'grid', x: 4.53, y: 51.0, w: 250.88, h: 15.52, cols: 16, rows: 1, shape: 'pad', label: 'sequencer' },
    { kind: 'button', x: 255.41, y: 51.0, w: 15.68, h: 15.52, round: true, label: 'bar' },

    // ---- transport and the accidentals ------------------------------------
    { kind: 'grid', x: 4.53, y: 66.52, w: 47.04, h: 15.52, cols: 3, rows: 1, shape: 'pad', label: 'transport' },
    { kind: 'grid', x: 59.41, y: 66.52, w: 46.99, h: 15.52, cols: 3, rows: 1, shape: 'key' },
    { kind: 'grid', x: 122.09, y: 66.52, w: 31.31, h: 15.52, cols: 2, rows: 1, shape: 'key' },
    { kind: 'grid', x: 169.08, y: 66.52, w: 46.99, h: 15.52, cols: 3, rows: 1, shape: 'key' },
    { kind: 'grid', x: 231.7, y: 66.52, w: 31.36, h: 15.52, cols: 2, rows: 1, shape: 'key' },

    // ---- octave pair, shift, and the naturals -----------------------------
    { kind: 'grid', x: 4.53, y: 82.04, w: 47.04, h: 15.47, cols: 3, rows: 1, shape: 'pad', label: 'shift' },
    { kind: 'grid', x: 51.57, y: 82.04, w: 219.52, h: 15.47, cols: 14, rows: 1, shape: 'key', label: 'keyboard' },
  ],
}
