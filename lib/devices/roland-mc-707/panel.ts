import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the MC-707's top panel.
 *
 * Read off the Top Panel figure in the Reference Manual (eng02, p.5) — the clusters, their order,
 * their sizes and their pitch — and laid out again in our own geometry and line weights. Nothing
 * is extracted, embedded or traced.
 *
 * ## Method
 *
 * `moog-dfam/panel.ts` is the worked example and this follows it:
 *
 * 1. The figure was rendered at **400 dpi** (`pdftoppm -f 5 -l 5 -r 400 -png`), not the 120 dpi a
 *    reading pass uses.
 * 2. Its outer border was located in pixels: **rows 531-1758, columns 655-2698**, giving a
 *    chassis of **2044 x 1228 px**. The edges were checked for straightness before being
 *    believed — the top edge sits at row **531** across ten sample columns, the left and right at
 *    655 and 2698 across eight sample rows, and the bottom at 1758 across nine of the ten columns,
 *    the tenth running into the first line of body text that starts below the figure at that
 *    column. It is a true rectangle, not a perspective view, so a pixel distance means the same
 *    thing everywhere on it.
 *
 *    **The top edge is 531 and not 619**, and the difference is worth recording because the wrong
 *    number survived a whole pass here. A first scan opened its window at row 619 and duly
 *    reported the edge at 619-621 — it was reading its own starting line, and the branding strip
 *    carrying the Roland mark and `GROOVEBOX MC-707` sits above it, inside the panel. Widening the
 *    window meant excluding the page's own blue `Top Panel` header band, which occupies rows
 *    310-509 and is not part of the box; masking it by hue rather than by row puts the edge at 531
 *    from every one of the ten columns. **None of the geometry below moved**: the 531 figure is
 *    the one every coordinate here was always scaled and offset against, and the stale sentence
 *    was prose describing a check, not the check itself.
 * 3. Control positions are **centroids of the drawing's own components**, found by thresholding
 *    rather than by eye: knobs as bright unsaturated discs against the panel's grey of 90, pads
 *    and step buttons as bright saturated blocks, buttons as filled dark outlines.
 * 4. Pixels were scaled to millimetres against the cited dimensions, **and the aspect was checked
 *    before either number was believed** (§2.3). That check is the next section.
 *
 * ## The aspect residual, and why nothing is stretched to close it
 *
 * `panelSpanMm` is 425 and `panelRiseMm` is 263, both printed in the Main Specifications table
 * (Owner's Manual eng02, p.3: *"425(W) x 263(D) x 58(H) mm"*), read off a render of that page
 * and cross-checked against the inch row printed beside it. The MC-707 is a landscape desktop box
 * played lying flat, so there is no orientation trap: the vendor's W is the horizontal span in
 * playing orientation and the D it calls *depth* is the panel's vertical rise.
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect. **It nearly does, and the
 * gap is recorded rather than closed:**
 *
 * | | |
 * |---|---|
 * | drawn | 2044 / 1228 = **1.66450** |
 * | specified | 425 / 263 = **1.61597** |
 * | residual | **+3.003%** |
 *
 * Three parts in a hundred is small enough to be the draughtsman's rounding and too large to be
 * measurement noise at 400 dpi, where one pixel is 0.21 mm. It is worth putting beside the
 * sibling's: the MC-101's p.4 figure comes out at 1.74 against a specified 1.31, a residual of
 * **+33%**, because Roland's figures for that box crop the rounded shoulders and show only the
 * flat face. This figure does not — it draws the whole footprint, corner radius and all — which
 * is why the number here is 3% and not 33%, and why this panel needs no equivalent of the
 * sibling's 11 mm offset guess.
 *
 * **The geometry is therefore unstretched.** One scale, `425 / 2044 = 0.207926 mm/px`, is applied
 * to both axes. The drawing's 1228 px of depth become **255.33 mm inside the 263 mm rise**, and
 * the 7.67 mm left over is **split evenly, 3.83 mm at each end**. Splitting is a choice and is
 * named as one: no reading of either document says where the 3% falls, so the panel does not
 * invent an asymmetry by pushing it all to the front lip or all to the rear. What it does not do
 * is scale the axes differently to force 1.61597, which would turn every knob on the box into an
 * ellipse and every pad into a rectangle — a panel that looks entirely plausible and is wrong,
 * which §2.3 says is the failure hardest to notice later.
 *
 * ## The two callout boxes, and what was inferred past them
 *
 * The figure carries two white callout boxes that sit **on** the panel, and both obscure controls.
 * Neither obscures anything unique, and in both cases the recovery is tighter than "assume the
 * pitch", because in both cases the callout truncates a control's *extent* while leaving its
 * *centre line* measurable:
 *
 *  - **"Playback position indicators"** covers the `FILTER` knobs of mixer strips 2, 3 and 4
 *    completely. The strip pitch is not inferred from them: the `FX` knob row two rows below is
 *    unobstructed and gives all eight centres at **138.86 px**, the `SEL` row gives 138.93, and
 *    the pad rows give 138.86. The `FILTER` row's own *y* comes from its five unobstructed
 *    members (strips 1, 5, 6, 7, 8), which agree on row 698 to within a pixel. So the three
 *    missing knobs are placed by a pitch measured elsewhere on the same lattice and a row
 *    measured on the same row — not by assuming regularity, but by measuring it.
 *  - **"Measure indicators"** clips the bottom of pads 1 and 2 in the upper row (detected 85 px
 *    tall against the 109 px the six unobstructed pads measure) and the top of pads 1 and 2 in
 *    the lower row (34 px of 109). Their *x* centres survive the clipping and were measured
 *    directly at 1036 and 1174.5; only the height is taken from the pads beside them.
 *
 * Both inferences are recorded here rather than smoothed over, because a coordinate that was
 * reasoned to looks exactly like one that was measured, and the standard this project stopped a
 * run over is that they must not.
 *
 * ## What is drawn
 *
 * Left to right, the five sections the page numbers: Common Section 1, the Mixer, the step
 * buttons and pads, the Total Effect cluster, and the display with its control cluster and the
 * PAD MODE row beneath it. The eight mixer strips carry a numbered tab, four playback-position
 * indicators, the `FILTER` / `MOD` / `FX` knobs, a level fader and a `SEL` button each — the
 * indicators as one four-cell grid per strip rather than one thirty-two-cell grid across the
 * mixer, because their 28.5 px spacing inside a strip is not the 138.9 px spacing between strips
 * and a single uniform grid would draw a lattice the box does not have.
 *
 * **Every `grid` box here spans the measured *pitch*, not the measured control.** The renderer
 * tiles a grid box into `cols` equal cells separated by a fixed 1.2 mm, so cell width and cell
 * spacing are one number and an author cannot have both right: a box drawn to the outer edges of
 * the end controls puts every cell centre inboard of the control it stands for, and a box drawn
 * to the pitch puts every centre exactly on one and draws the cell a little larger than the cap.
 * This panel takes the second, because where a control *is* is what a reader at the machine
 * matches against and 22.7 mm pads drawn at 27.7 mm still read as pads. That is why the mixer's
 * six rows, the step row and the pad block all report `x` within 65.1-65.4 and `w` of 229.8: they
 * are the same eight-column lattice, measured six times over and agreeing to a third of a
 * millimetre. It is also the check that caught this — the first pass sized each box to its own
 * controls, and the six rows came out at five different widths.
 *
 * ## The voice field
 *
 * On the pads, and on this box that is a stronger claim than it was on the sibling, because the
 * pads are where **both** pools are addressed rather than one:
 *
 *  - The eight `drum-pad` assignables *are* pads. On a drum track *"press a pad (key) to select
 *    the pad that you want to edit"* (p.30), of the sixteen a kit holds.
 *  - The seven `tone-track` assignables are reached on the same sixteen pads in a different pad
 *    mode: *"Stopping/Playing Tracks (Pads [1]-[8])"* (p.22), where pads 1-8 are the eight tracks.
 *
 * So a lit cell in this region is a lit pad under one mode or a lit track under another, and both
 * banks land somewhere the manual puts them. The mixer strip was the alternative and loses for
 * the sibling's reason: it is the better *picture* of eight tracks, but this device has fifteen
 * assignables and that region has eight lanes, so a fifteen-cell readout laid into it would read
 * as a claim about tracks it is not making.
 *
 * It is drawn on the pad block exactly — the same 229.8 x 56.6 mm rect as the pad grid, so the
 * readout lands on the pads rather than near them. That is worth checking rather than assuming,
 * because the packer's cell size decides whether the readout looks like pads at all: at this
 * width eight columns win on cell area and give **26.1 x 20.4 mm cells, nothing hidden** — one
 * row per bank, the eight drum pads over the seven tone tracks — which is the shape a pad is,
 * and it stays well inside `MAX_CELL_ASPECT` at 1.28:1. The sibling had to reach down into its
 * front margin to get cells that shape; here the pads are deep enough on their own.
 */
export const MC_707_PANEL: PanelLayout = {
  panelRiseMm: 263,
  verified: { kind: 'manual', source: 'MC-707 Reference Manual eng02, p.5 (Top Panel)' },
  features: [
    // Branding along the top edge: the Roland mark at the left, GROOVEBOX MC-707 at the right.
    { kind: 'label', x: 10.4, y: 15.1, text: 'Roland', align: 'start' },
    { kind: 'label', x: 410.9, y: 15.1, text: 'MC-707', align: 'end' },

    // 1 Common Section 1: levels, modifiers, transport, MOTION, SCENE, MEASURE.
    { kind: 'knob', x: 19.6, y: 32.1, d: 12.9, label: 'VOLUME' },
    { kind: 'knob', x: 41.7, y: 32.3, d: 12.9, label: 'PHONES' },
    { kind: 'button', x: 20, y: 57.3, w: 12.9, h: 10, label: 'SHIFT' },
    { kind: 'button', x: 41.8, y: 57.3, w: 12.9, h: 10, round: true, label: 'CLEAR' },
    { kind: 'button', x: 27.9, y: 73.9, w: 18.9, h: 11.4, label: 'PROJECT' },
    { kind: 'button', x: 27.9, y: 90.7, w: 18.9, h: 11.6, label: 'QUANTIZE' },
    { kind: 'button', x: 27.9, y: 107.8, w: 18.9, h: 11.4, label: 'REC' },
    { kind: 'label', x: 37.3, y: 128.4, text: 'MOTION', align: 'middle' },
    { kind: 'grid', x: 16.1, y: 133, w: 42.5, h: 8.9, cols: 2, rows: 1, shape: 'pad' },
    { kind: 'label', x: 37.3, y: 152.5, text: 'SCENE', align: 'middle' },
    { kind: 'grid', x: 16.1, y: 153.5, w: 42.5, h: 28.5, cols: 2, rows: 2, shape: 'pad' },
    { kind: 'label', x: 37.3, y: 195.3, text: 'MEASURE', align: 'middle' },
    { kind: 'grid', x: 16.1, y: 198.7, w: 42.5, h: 8.9, cols: 2, rows: 1, shape: 'pad' },
    // The four measure indicators, on their own 29.3 px pitch below the [<] [>] buttons.
    { kind: 'grid', x: 25.6, y: 212.7, w: 23.2, h: 2.7, cols: 4, rows: 1 },
    { kind: 'button', x: 24.7, y: 223.8, w: 25.2, h: 16.4, label: 'START/STOP' },

    // 2 Mixer Section: eight strips on a 138.86 px (28.87 mm) pitch, every row on the same
    // lattice — which is why each of these spans x 65.1-65.4 and 229.8 mm wide.
    { kind: 'grid', x: 65.2, y: 12.8, w: 229.8, h: 7.9, cols: 8, rows: 1 },
    // Four playback-position indicators per strip — one grid each, see the head note.
    { kind: 'grid', x: 67.8, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 96.6, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 125.5, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 154.4, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 183.2, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 212.1, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 241, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    { kind: 'grid', x: 269.9, y: 25.1, w: 22.5, h: 2.7, cols: 4, rows: 1 },
    // FILTER, MOD and FX, one row each across the eight strips, on a 110 px vertical pitch.
    { kind: 'grid', x: 65.1, y: 32.1, w: 229.8, h: 12.9, cols: 8, rows: 1, shape: 'knob' },
    { kind: 'grid', x: 65.1, y: 55, w: 229.8, h: 12.9, cols: 8, rows: 1, shape: 'knob' },
    { kind: 'grid', x: 65.1, y: 78, w: 229.8, h: 12.9, cols: 8, rows: 1, shape: 'knob' },
    { kind: 'grid', x: 65.2, y: 101.6, w: 229.8, h: 41.6, cols: 8, rows: 1, shape: 'fader' },
    { kind: 'grid', x: 65.3, y: 155.8, w: 229.9, h: 6.4, cols: 8, rows: 1, shape: 'pad' },

    // 3 The sixteen step buttons on a 69.43 px pitch, and the sixteen pads below them.
    { kind: 'grid', x: 65.1, y: 171.4, w: 229.8, h: 7.5, cols: 16, rows: 1, shape: 'key' },
    { kind: 'grid', x: 65.4, y: 189.3, w: 229.8, h: 56.6, cols: 8, rows: 2, shape: 'pad' },

    // 4 Total Effect Section: REVERB / DELAY over MULTI / ON, then the two effect knobs.
    { kind: 'grid', x: 317.6, y: 24.9, w: 34.8, h: 28.7, cols: 2, rows: 2, shape: 'pad' },
    { kind: 'knob', x: 361.6, y: 32.3, d: 12.7, label: 'FX PRM' },
    { kind: 'knob', x: 385.5, y: 32.3, d: 12.7, label: 'FX DEPTH' },

    // 5 The display, the [C1]-[C4] knobs and the two button rows that say what they address.
    { kind: 'screen', x: 309.4, y: 71.2, w: 92.9, h: 32 },
    { kind: 'grid', x: 308.7, y: 114.5, w: 94.4, h: 16, cols: 4, rows: 1, shape: 'knob' },
    { kind: 'grid', x: 308.8, y: 137.9, w: 94.3, h: 8.9, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 308.8, y: 155.8, w: 94.3, h: 8.9, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'knob', x: 317.5, y: 180.5, d: 29.1, label: 'VALUE' },
    { kind: 'button', x: 373, y: 183.7, w: 13.7, h: 8.9, label: '∧' },
    { kind: 'button', x: 354.5, y: 190.8, w: 13.7, h: 8.7, label: '<' },
    { kind: 'button', x: 391.3, y: 190.8, w: 13.7, h: 8.7, label: '>' },
    { kind: 'button', x: 373, y: 197.8, w: 13.7, h: 8.7, label: '∨' },

    // PAD MODE: MUTE, CLIP, NOTE, CHORD, SCATTER on a 100.5 px pitch.
    { kind: 'label', x: 356, y: 221.5, text: 'PAD MODE', align: 'middle' },
    { kind: 'grid', x: 304.3, y: 223.4, w: 103.3, h: 17.5, cols: 5, rows: 1, shape: 'pad' },

    // The readout, on the pads — eight drum pads over seven tone tracks. See the head note.
    { kind: 'voices', x: 65.4, y: 189.3, w: 229.8, h: 56.6, label: 'PADS' },
  ],
}
