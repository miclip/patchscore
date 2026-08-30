import type { PanelFeature, PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Behringer Neutron's panel.
 *
 * Read off the *Default Patch* figure on printed p.24 — the first of the four Preset Patches, and
 * the only complete, unobstructed, fully-labelled panel view in the document. The other three on
 * that page carry orange patch cables drawn over the sockets; p.6's control diagram is the panel
 * cut into three separate blocks with the patchbay drawn somewhere else again, so it is a callout
 * key rather than a plan view. Our own geometry and line weights; nothing traced, extracted
 * or embedded.
 *
 * **Every control coordinate below was measured, not estimated.** The page was rendered at 600
 * dpi, the panel's outer border located at 2067 x 654 px, and control positions taken as the
 * centroids of the drawing's own components — the knob faces are the light connected components,
 * the buttons the mid-grey ones, the jacks the dark rings. That is why all thirty-three small
 * knobs come out at one diameter (8.3 mm) and the four knob rows at four y values to a tenth of a
 * millimetre.
 *
 * ## The aspect check, and what it settles
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` match the drawn aspect before either number is
 * believed, and here it does more than confirm: it picks between two widths the manual prints on
 * the same page. p.26 gives `Dimensions (H x W x D)  94 x 424 x 136 mm` and, four rows later,
 * `Eurorack HP  80 HP`. The measured panel box is 2067 / 654 = **3.1606**, against
 *
 *     406.4 / 128.5 = 3.1626   <- 80 HP x 3U, 0.06% out
 *     424   / 136   = 3.1176   <- the case, width by depth, 1.4% out
 *     424   /  94   = 4.5106   <- the case, width by height, 43% out
 *
 * So the figure is the **Eurorack panel**, and 424 mm is the factory chassis with its end cheeks
 * (406.4 + 2 x 8.8) rather than the surface anybody plays. §10 says to resist end cheeks, and §6
 * of the manual (p.18) is a page on taking the chassis off entirely, so the panel is the part of
 * this box that survives. `physical.panelSpanMm` is therefore 406.4 — 80 HP at the
 * Eurorack 5.08 mm, which is arithmetic on p.26's own figure and not a second reading.
 *
 * `panelRiseMm` is then **measured rather than assumed**: 654 px scaled by the cited span gives
 * 128.59 mm. That it lands on the 3U standard of 128.5 is corroboration, not the source — no page
 * of this manual prints a panel height at all.
 *
 * ## What the drawing carries and what it cannot
 *
 * **There is no jack in this vocabulary**, as the DFAM and the CRAVE both record, so the
 * fifty-six patch points are two `grid` blocks — decorative, binding nothing, and carrying no
 * named jack positions. The panel prints `IN` over the left four columns and `OUT` over the right
 * three, which is the division `index.ts` puts in the jack ids; the grids carry those two words
 * and nothing else. The MIDI IN DIN (item 38) is a third one-cell grid, because it is a socket
 * and this vocabulary has no better shape for one.
 *
 * **No screen, because the box has none.** The Neutron reports state through the LFO shape LED
 * wheel, the three OSC octave LEDs and the three VCF mode LEDs (pp.13-14), and those are
 * indicators rather than a readout. A `screen` would claim something this panel cannot display.
 * The LEDs are not drawn: they are smaller than the smallest thing worth putting on a simplified
 * panel, and the Minitaur's drawing leaves its MIDI activity LED off for the same reason.
 *
 * **Group rectangles are derived, and the derivation is uniform.** Where the drawing's own
 * hairline boxes were unambiguous — the two OSC boxes, the VCF strip, the LFO box, the patchbay
 * frames — their edges were taken from the long vertical runs in the render. Everywhere else a
 * section box is the measured bounding box of the controls it encloses with a uniform margin.
 * None of them was placed by eye, and none of them is traced from the vendor's line.
 *
 * ## The voice field
 *
 * Placed in `OUTPUT`, the section the one voice finally leaves by — the CRAVE's reasoning, and
 * for a box with no voice or track selector there is nothing better to point at. It is also the
 * only choice the panel has room for: this is 80 HP carrying thirty-six knobs, seven buttons and
 * fifty-six sockets, and a sweep for clear space at the usual 26 x 10 mm found none anywhere on
 * the panel. 19 x 7 is 2.71 : 1, under the rack's 3 : 1 cell ceiling — 21 x 7 sits exactly *on*
 * it and the packer rejects that, which is the CRAVE's `27 x 10 gives 2.7` reasoning arriving at
 * the same place from a narrower region.
 */

/** 80 HP at the Eurorack 5.08 mm/HP, from `Eurorack HP  80 HP` on p.26. */
const SPAN = 406.4
/** 654 px of drawn panel scaled by SPAN — see the aspect check above. */
const RISE = 128.6

/** The four knob rows, measured. Every knob on the panel sits on one of them. */
const ROW_1 = 20.8
const ROW_2 = 49.5
const ROW_3 = 78.4
const ROW_4 = 107.3

const KNOB_D = 8.3
/** The two OSC TUNE knobs, the only oversized pair. */
const TUNE_D = 14.1
/** The LFO SHAPE knob, sitting inside its ring of five shape LEDs. */
const SHAPE_D = 11.4

/** `x`/`y` are the bounding box everywhere in this vocabulary, so centres are placed through here. */
function knob(cx: number, cy: number, label: string, d = KNOB_D): PanelFeature {
  return { kind: 'knob', x: cx - d / 2, y: cy - d / 2, d, label }
}

/**
 * A momentary panel button. All seven measure 5.9 x 5.3 mm and are given as measured top-left
 * corners rather than centres, which is what the component detection returns for a square.
 */
function button(x: number, y: number, label: string): PanelFeature {
  return { kind: 'button', x, y, w: 5.9, h: 5.3, label }
}

/** A block of sockets. Drawn as pads because the vocabulary has no jack; see above. */
function sockets(x: number, y: number, w: number, h: number, cols: number, rows: number, label?: string): PanelFeature {
  return { kind: 'grid', x, y, w, h, cols, rows, shape: 'pad', ...(label === undefined ? {} : { label }) }
}

/** Measured jack geometry: 7 columns on a 13.48 mm pitch, 8 rows on 12.90, each ring 4.17 mm. */
const JACK_D = 4.17
const IN_X = 309.7
const OUT_X = 363.5
const JACK_TOP = 19.5
const JACK_BOTTOM = 109.8
const JACK_H = JACK_BOTTOM - JACK_TOP + JACK_D

export const NEUTRON_PANEL: PanelLayout = {
  panelRiseMm: RISE,
  verified: {
    kind: 'manual',
    source: 'Neutron User Manual, p.24 (Preset Patches, Default Patch panel figure)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Oscillators (p.7 §3.1.1). Two boxes with the shared TUNE/OSC MIX row above them.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 12, y: 12, text: 'NEUTRON', align: 'start' },
    knob(32.7, 44.6, 'TUNE', TUNE_D),
    knob(79.9, 44.6, 'TUNE', TUNE_D),
    knob(56.3, 31.2, 'OSC MIX'),
    { kind: 'label', x: 56.3, y: 38.5, text: 'OCTAVE', align: 'middle' },

    { kind: 'group', x: 19.5, y: 49.2, w: 28.5, h: 74.5, label: 'OSC 1' },
    knob(32.7, ROW_3, 'SHAPE'),
    button(46.4, 79.4, 'RANGE'),
    knob(32.7, ROW_4, 'WIDTH'),

    { kind: 'group', x: 63.7, y: 49.2, w: 29.3, h: 74.5, label: 'OSC 2' },
    knob(79.9, ROW_3, 'SHAPE'),
    button(60.6, 79.4, 'RANGE'),
    knob(79.9, ROW_4, 'WIDTH'),

    // Between the two boxes, belonging to neither (p.7 items 8 and 9).
    button(53.5, 94.0, 'OSC SYNC'),
    button(53.5, 107.5, 'PARAPHONIC'),

    // -----------------------------------------------------------------------
    // VCF (p.7 §3.1.2). One full-height strip; MODE sits at its left edge.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 93.0, y: 4.3, w: 33.6, h: 119.4, label: 'VCF' },
    button(98.9, 18.3, 'MODE'),
    knob(117.2, ROW_1, 'FREQ'),
    knob(117.4, ROW_2, 'RESO'),
    button(114.6, 62.9, 'KEY TRK'),
    knob(117.4, ROW_3, 'MOD DEPTH'),
    knob(117.4, ROW_4, 'ENV DEPTH'),

    // -----------------------------------------------------------------------
    // LFO (p.7 §3.1.3). SHAPE is the large knob ringed by its five shape LEDs.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 130.7, y: 4.3, w: 45.7, h: 61.0, label: 'LFO' },
    button(139.0, 18.3, 'KEY SYNC'),
    knob(166.5, ROW_1, 'RATE'),
    knob(154.2, 45.9, 'SHAPE', SHAPE_D),

    // -----------------------------------------------------------------------
    // Noise and VCA bias (p.7 §3.1.4), the narrow column between VCF and the envelopes.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 133.3, y: 68.2, w: 17.1, h: 55.5 },
    knob(142.0, ROW_3, 'NOISE'),
    knob(141.9, ROW_4, 'VCA BIAS'),

    // -----------------------------------------------------------------------
    // Delay and Overdrive (p.7 §§3.1.5-3.1.6), stacked in one module.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 182.3, y: 4.3, w: 69.8, h: 32.1, label: 'DELAY' },
    knob(191.0, ROW_1, 'TIME'),
    knob(215.5, ROW_1, 'REPEATS'),
    knob(240.1, ROW_1, 'MIX'),

    { kind: 'group', x: 182.3, y: 37.5, w: 69.8, h: 27.8, label: 'OVERDRIVE' },
    knob(191.0, ROW_2, 'DRIVE'),
    knob(215.4, ROW_2, 'TONE'),
    knob(240.0, ROW_2, 'LEVEL'),

    // -----------------------------------------------------------------------
    // Envelopes (p.8 §3.1.7). Two ADSR rows on the same four columns.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 157.7, y: 68.2, w: 90.8, h: 27.3, label: 'ENVELOPE 1' },
    knob(166.5, ROW_3, 'A'),
    knob(190.8, ROW_3, 'D'),
    knob(215.3, ROW_3, 'S'),
    knob(240.1, ROW_3, 'R'),

    { kind: 'group', x: 157.7, y: 96.4, w: 90.8, h: 27.3, label: 'ENVELOPE 2' },
    knob(166.5, ROW_4, 'A'),
    knob(190.8, ROW_4, 'D'),
    knob(215.3, ROW_4, 'S'),
    knob(240.0, ROW_4, 'R'),

    // -----------------------------------------------------------------------
    // Output (p.8 §3.1.8). VOLUME and the MIDI IN DIN, which the manual groups here.
    // -----------------------------------------------------------------------
    { kind: 'group', x: 256.0, y: 4.3, w: 44.2, h: 28.3, label: 'OUTPUT' },
    knob(264.5, ROW_1, 'VOLUME'),
    sockets(282.5, 14.4, 13.0, 13.0, 1, 1, 'MIDI IN'),
    // One voice; the section it leaves the box by. See the header.
    { kind: 'voices', x: 257.0, y: 25.5, w: 19.0, h: 7.0 },

    // -----------------------------------------------------------------------
    // Sample & Hold (p.8 §3.1.9), Slew and the two attenuators (p.8 §3.2, items 41-44).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 256.0, y: 37.2, w: 44.2, h: 28.1, label: 'SAMPLE & HOLD' },
    knob(264.6, ROW_2, 'RATE'),
    knob(289.0, ROW_2, 'GLIDE'),

    { kind: 'group', x: 256.0, y: 68.2, w: 44.2, h: 27.3, label: 'SLEW RATE LIMITER' },
    knob(264.6, ROW_3, 'SLEW'),
    knob(289.1, ROW_3, 'PORTA TIME'),

    { kind: 'group', x: 256.0, y: 96.4, w: 44.2, h: 27.3, label: 'ATTENUATORS' },
    knob(264.6, ROW_4, '1'),
    knob(289.1, ROW_4, '2'),

    // -----------------------------------------------------------------------
    // The patchbay (pp.8-9). Four input columns, three output columns, eight rows each.
    // -----------------------------------------------------------------------
    sockets(
      IN_X - JACK_D / 2,
      JACK_TOP - JACK_D / 2,
      350.1 - IN_X + JACK_D,
      JACK_H,
      4,
      8,
      'IN',
    ),
    sockets(
      OUT_X - JACK_D / 2,
      JACK_TOP - JACK_D / 2,
      390.6 - OUT_X + JACK_D,
      JACK_H,
      3,
      8,
      'OUT',
    ),
  ],
}

/** Exported so `index.ts` can state the span it was measured against without repeating the number. */
export const NEUTRON_PANEL_SPAN_MM = SPAN
