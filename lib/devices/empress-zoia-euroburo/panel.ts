import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the ZOIA Euroburo's front panel.
 *
 * Read off the panel figure on the manual's cover and laid out again in our own geometry and
 * line weights. Nothing is extracted, embedded or traced.
 *
 * ## The figure is on the cover, and it is the only complete one
 *
 * The same shape as the LiveTrak L-8: the body of the manual draws the panel in fragments — the
 * MODULE LAYOUT figure (pp.14-15) is a callout diagram that names the clusters without placing
 * them against each other — and the **cover carries the whole front panel in true plan view**,
 * as a line drawing, with the Eurorack mounting slots at all four corners. That is what these
 * coordinates were measured on.
 *
 * ## This is the first Eurorack module in the library, and the orientation is the interesting bit
 *
 * `panelSpanMm` is *"the front-panel horizontal span in normal playing orientation"*, and for a
 * module bolted into a case that is the HP width, not the depth and not the height. The
 * specifications give **34hp** (p.29) and nothing in millimetres; one HP is 1/5 inch, so 34 HP is
 * 34 x 5.08 = 172.72 mm. That figure is the *pitch the module occupies in a row*, which is
 * exactly what §2.3 asks this field for — a real Eurorack faceplate is cut a fraction narrower so
 * neighbours clear each other, and that fraction is not what a rack of panels should be drawn at.
 *
 * `panelRiseMm` is **measured, not assumed**. The manual never states a height: it gives 34hp and
 * *"Depth (module only): 28mm"*, and depth does not exist in a front-panel view (§2.3). So the
 * rise comes off the cover drawing at the width's own scale — its ink measures 1771 x 1320 px at
 * 600 dpi, and 1320 px at 172.72 mm / 1771 px is **128.74 mm**.
 *
 * That is the §2.3 aspect check passing rather than being waved through, and it passes twice
 * over: the drawn aspect is 1.3417 against 172.72 / 128.5 = 1.3441 for a 3U panel, and the
 * measured rise lands 0.24 mm from the 128.5 mm that Eurorack 3U has been since Doepfer set it.
 * The authored number is the **measurement**, because the citation names the drawing it was read
 * off and because the standard is not in this document.
 *
 * ## No voice field
 *
 * Zero assignables (§2.4), so no `voices` region — a region filled with nothing on every guide
 * ever rendered would claim a readout the box cannot produce. Same call as the L-8.
 *
 * ## What is simplified away
 *
 * The jacks are the renderer's (§2.3): it draws the ones `clock` and `io` declare, so authoring
 * the five audio jacks, the eight CV jacks and the two MIDI jacks here would be a second,
 * competing claim about the same sockets. The three columns they sit in are grouped and labelled
 * instead. The action-button icons above the grid (move, copy, edit, delete, star, view, save,
 * random) are silkscreen on the *panel* but functions of the *buttons below them*, so they are
 * not drawn as controls of their own.
 */
export const ZOIA_EUROBURO_PANEL: PanelLayout = {
  panelRiseMm: 128.7,
  verified: {
    kind: 'manual',
    source: 'ZOIA Euroburo User Manual Rrev2 (firmware 2.30), cover (front panel drawing)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Left column: the encoder, the screen, and the navigation buttons.
    // -----------------------------------------------------------------------
    { kind: 'knob', x: 17.1, y: 16, d: 9.4 },
    { kind: 'screen', x: 8.2, y: 34.1, w: 27, h: 16.3 },
    { kind: 'button', x: 11.5, y: 54.8, w: 9.3, h: 9.3 },
    { kind: 'button', x: 23.2, y: 54.8, w: 9.3, h: 9.3 },
    { kind: 'button', x: 11.5, y: 67, w: 9.3, h: 8.8 },
    // The larger rounded button — a stompswitch on the pedal ZOIA, kept here.
    { kind: 'button', x: 22.8, y: 66.5, w: 9.7, h: 11.7 },
    { kind: 'button', x: 11.5, y: 88, w: 9.3, h: 8.8 },
    { kind: 'button', x: 23.2, y: 88, w: 9.3, h: 8.8 },
    { kind: 'label', x: 21.5, y: 112, text: 'MICRO SD', align: 'middle' },

    // -----------------------------------------------------------------------
    // The 8 x 5 grid. One page of a patch: every module and every parameter a
    // patch contains lives on one of these forty buttons (p.1, p.19).
    // -----------------------------------------------------------------------
    { kind: 'grid', x: 43.3, y: 20.4, w: 89.9, h: 55.4, cols: 8, rows: 5, shape: 'pad', label: 'GRID' },

    // The fifth column of connection buttons, permanently wired to the i/o
    // modules beside them (p.14): audio in, audio out, headphone.
    { kind: 'group', x: 139, y: 18, w: 25, h: 60, label: 'AUDIO I/O' },
    { kind: 'grid', x: 141.3, y: 20.4, w: 8.5, h: 55.4, cols: 1, rows: 5, shape: 'pad' },

    // -----------------------------------------------------------------------
    // Four CV inputs and four CV outputs, each with its own connection button
    // (p.6). The jacks below them are the renderer's.
    // -----------------------------------------------------------------------
    { kind: 'label', x: 65, y: 86, text: 'CV IN', align: 'middle' },
    { kind: 'label', x: 111, y: 86, text: 'CV OUT', align: 'middle' },
    { kind: 'grid', x: 43.3, y: 88, w: 89.9, h: 8.8, cols: 8, rows: 1, shape: 'pad' },

    { kind: 'group', x: 146, y: 88, w: 24, h: 22, label: 'MIDI' },
  ],
}
