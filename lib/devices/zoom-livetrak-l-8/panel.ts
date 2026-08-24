import type { PanelLayout } from '@/lib/core'

/**
 * §10. A simplified **original** drawing of the Zoom LiveTrak L-8's top panel.
 *
 * Read off the top-panel figure and laid out again in our own geometry and line weights.
 * Nothing is extracted, embedded or traced.
 *
 * ## The figure is on the cover, and that is the only place it is
 *
 * The "Names and functions of parts" pages (pp.5-18) draw the panel **in fragments** — the input
 * channel section on p.5, the channel strip on p.8, the send effect section on p.9, the output
 * section on p.10, the display and mode section on p.12, the transport on p.17. Every fragment
 * is internally accurate and none of them says where its cluster sits relative to any other, so
 * the section pages alone cannot produce a layout; reconstructing one from them would be
 * inventing the inter-section geometry, which is exactly the plausible fiction §2.3 forbids.
 *
 * **The cover (p.1) carries the whole top panel in plan view**, complete and undistorted, and
 * that is what these coordinates were measured on. It is worth writing down because the obvious
 * place to look is the panel chapter, and the panel chapter is the one that cannot answer.
 *
 * ## The aspect check
 *
 * §2.3 asks that `panelSpanMm / panelRiseMm` matches the drawn aspect before either number is
 * believed, and here it does. The specifications (p.110) give *"268 mm (W) x 282 mm (D) x 74 mm
 * (H)"*; the cover figure's ink measures 1390 x 1461 px at 300 dpi, an aspect of 0.951 against
 * the specified 268 / 282 = 0.950. Two independent readings agreeing to a tenth of a percent.
 *
 * The L-8 is a desktop mixer played lying flat, so the surface you play is the top panel and the
 * trap `panelRiseMm` documents applies in its usual direction: the vertical span in playing
 * orientation is the figure the spec sheet calls **depth**, 282 mm, not the 74 mm it calls
 * height. The box therefore reads slightly *taller than wide* in a rack of landscape boxes,
 * which is what it is.
 *
 * ## Two printed areas, one panel
 *
 * The drawing shows two outlined rectangles rather than one: a connector band across the rear of
 * the top surface (y 9-75 mm) and the control surface below it (y 91-270 mm). Both are on the
 * top panel — the manual files the jacks under "Top", and its "Back" section (p.19) lists only
 * the POWER switch and the SD card slot, its "Bottom" (p.20) only the Micro USB port and the
 * battery cover. Nothing that carries audio is on a face other than this one.
 *
 * ## No voice field
 *
 * §10 allows at most one `voices` region and this panel authors none, because the device has no
 * assignables to fill it (§2.4). A region here would be an empty box on every guide ever
 * rendered, claiming a readout the box cannot produce. The rack's generated fallback covers it.
 *
 * ## What is simplified away
 *
 * The channel level meters (nine segments each, p.110) have no `PanelFeature` kind of their own
 * and are not drawn; the faders are. The physical jacks are not drawn either, and deliberately:
 * §2.3 reserves those for the renderer, which draws the ones `clock` and `io` declare, so
 * authoring them here would be a second, competing claim about the same sockets. The connector
 * band is grouped and labelled instead, which says where they are without restating what they
 * are. The selection encoder is omitted rather than placed: it sits somewhere between the
 * display and the function-button strip, and the figure did not let me pin it to a millimetre.
 */
export const LIVETRAK_L8_PANEL: PanelLayout = {
  panelRiseMm: 282,
  verified: {
    kind: 'manual',
    source: 'Zoom LiveTrak L-8 Operation Manual E_02, p.1 (cover, top-panel plan view)',
  },
  features: [
    // -----------------------------------------------------------------------
    // Connector band — the rear strip of the top surface (pp.5-7, p.10).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 2.5, y: 9.1, w: 254.3, h: 65.7 },
    // Labelled with a `label` rather than the group's own, which the renderer prints at the
    // group's top-left corner — where the rack's name plate already is.
    { kind: 'group', x: 2.5, y: 9.1, w: 110.4, h: 65.7 },
    { kind: 'label', x: 57.7, y: 44, text: 'MIC/LINE 1-6', align: 'middle' },
    { kind: 'group', x: 112.9, y: 9.1, w: 39.7, h: 65.7, label: 'LINE 7/8' },
    { kind: 'group', x: 152.6, y: 9.1, w: 45.6, h: 65.7, label: 'MASTER OUT' },
    { kind: 'group', x: 198.2, y: 9.1, w: 58.6, h: 65.7, label: 'MONITOR OUT' },

    // INPUT SEL, one per stereo channel: input jack / USB return / SOUND PAD (p.7).
    { kind: 'button', x: 119.5, y: 62.6, w: 7, h: 6.6, label: 'INPUT SEL' },
    { kind: 'button', x: 139.4, y: 62.6, w: 7, h: 6.6 },

    // MASTER OUT PHONES volume, and the MASTER/MIX A-C monitor source switches (pp.10-11).
    { kind: 'knob', x: 163.5, y: 46, d: 12, label: 'PHONES' },
    { kind: 'button', x: 173, y: 63, w: 5.5, h: 8, label: 'MASTER' },

    // MONITOR OUT A-C: one volume knob and one source switch each (p.11).
    { kind: 'knob', x: 201.9, y: 44, d: 12, label: 'A' },
    { kind: 'knob', x: 221.4, y: 44, d: 12, label: 'B' },
    { kind: 'knob', x: 241, y: 44, d: 12, label: 'C' },
    { kind: 'button', x: 205.4, y: 63, w: 5.5, h: 8, label: 'MIX A' },
    { kind: 'button', x: 224.9, y: 63, w: 5.5, h: 8, label: 'MIX B' },
    { kind: 'button', x: 244.6, y: 63, w: 5.5, h: 8, label: 'MIX C' },

    // -----------------------------------------------------------------------
    // Control surface (pp.5-9, p.12, p.17).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 2.5, y: 91.3, w: 254.3, h: 178.2 },

    // One phantom switch for all six mic preamps, sitting on the rule above them (p.5).
    { kind: 'button', x: 59.4, y: 94.1, w: 5.4, h: 6.9, label: '48V' },

    // Hi-Z on channels 1-2, -26dB on 3-6: one switch per channel, one row (pp.5-6).
    { kind: 'grid', x: 11.2, y: 104.9, w: 101.7, h: 6.4, cols: 6, rows: 1, shape: 'pad' },

    // GAIN, one per mic preamp. +10 to +54 dB, or -3 to +41 with Hi-Z on (p.6).
    { kind: 'knob', x: 14.2, y: 125.5, d: 11, label: 'GAIN' },
    { kind: 'knob', x: 31.1, y: 125.5, d: 11, label: 'GAIN' },
    { kind: 'knob', x: 48, y: 125.5, d: 11, label: 'GAIN' },
    { kind: 'knob', x: 64.9, y: 125.5, d: 11, label: 'GAIN' },
    { kind: 'knob', x: 81.9, y: 125.5, d: 11, label: 'GAIN' },
    { kind: 'knob', x: 98.9, y: 125.5, d: 11, label: 'GAIN' },

    // SEL, REC/PLAY and MUTE run across the channels in three rows. Split 6 + 2 because the
    // stereo channels are wider than the mono ones and a single 8-wide grid drifts ~4 mm by
    // channel 7.
    { kind: 'grid', x: 11.2, y: 154.9, w: 101.7, h: 5.8, cols: 6, rows: 1, shape: 'pad', label: 'SEL' },
    { kind: 'grid', x: 112.9, y: 154.9, w: 39.7, h: 5.8, cols: 2, rows: 1, shape: 'pad' },

    { kind: 'grid', x: 11.2, y: 172.3, w: 101.7, h: 5.8, cols: 6, rows: 1, shape: 'pad', label: 'REC/PLAY' },
    { kind: 'grid', x: 112.9, y: 172.3, w: 39.7, h: 5.8, cols: 2, rows: 1, shape: 'pad' },
    { kind: 'button', x: 184.3, y: 172.3, w: 5.9, h: 5.8 },

    { kind: 'grid', x: 11.2, y: 189.1, w: 101.7, h: 6.2, cols: 6, rows: 1, shape: 'pad', label: 'MUTE' },
    { kind: 'grid', x: 112.9, y: 189.1, w: 39.7, h: 6.2, cols: 2, rows: 1, shape: 'pad' },
    { kind: 'button', x: 161.5, y: 189.1, w: 5.8, h: 6.2 },
    { kind: 'button', x: 184.5, y: 189.1, w: 5.6, h: 6.2 },

    // Ten faders: six mono channels, two stereo channels, EFX RTN and MASTER. Each column is
    // its own pitch, so each run is its own grid.
    { kind: 'grid', x: 11.2, y: 206.7, w: 101.7, h: 57.3, cols: 6, rows: 1, shape: 'fader' },
    { kind: 'grid', x: 112.9, y: 206.7, w: 39.7, h: 57.3, cols: 2, rows: 1, shape: 'fader' },
    { kind: 'grid', x: 152.6, y: 206.7, w: 45.6, h: 57.3, cols: 2, rows: 1, shape: 'fader', label: 'EFX RTN / MASTER' },

    // SOUND PAD 1-6. Pads 1-3 arrive on channel 7, pads 4-6 on channel 8 (p.7), which is why
    // the block sits over those two fader columns.
    { kind: 'group', x: 113.5, y: 93, w: 38, h: 49, label: 'SOUND PAD' },
    { kind: 'grid', x: 119.6, y: 98.5, w: 26.6, h: 41.9, cols: 2, rows: 3, shape: 'pad' },

    // CHANNEL STRIP — one set of controls, applied to whichever channels have SEL lit (p.6, p.8).
    { kind: 'group', x: 152.6, y: 93.5, w: 45.6, h: 76, label: 'CHANNEL STRIP' },
    { kind: 'knob', x: 158.7, y: 102.1, d: 12.6, label: 'EFX' },
    { kind: 'knob', x: 181.4, y: 102.1, d: 12.6, label: 'HIGH' },
    { kind: 'knob', x: 158.7, y: 125.5, d: 12.6, label: 'PAN' },
    { kind: 'knob', x: 181.4, y: 125.5, d: 12.6, label: 'MID' },
    { kind: 'knob', x: 181.4, y: 150, d: 12.6, label: 'LOW' },
    { kind: 'button', x: 160.7, y: 151.9, w: 5.8, h: 5.8, label: 'LOW CUT' },

    // -----------------------------------------------------------------------
    // Display, function and mode section (p.12, p.17).
    // -----------------------------------------------------------------------
    { kind: 'group', x: 198.2, y: 91.3, w: 58.6, h: 178.2 },
    { kind: 'screen', x: 210, y: 124, w: 40, h: 48 },
    { kind: 'label', x: 227.5, y: 182, text: 'LiveTrak L-8', align: 'middle' },

    // Two rows of four soft buttons whose function follows the selected mode (p.13).
    { kind: 'grid', x: 202.6, y: 187.2, w: 50.2, h: 5.6, cols: 4, rows: 1, shape: 'pad' },
    { kind: 'grid', x: 202.6, y: 223.1, w: 50.2, h: 4.2, cols: 4, rows: 1, shape: 'pad' },

    { kind: 'button', x: 203.4, y: 240.9, w: 20.8, h: 5.6, label: 'MIXER' },
    { kind: 'button', x: 231.1, y: 240.9, w: 21.1, h: 5.6, label: 'EFFECT' },
    { kind: 'button', x: 203.4, y: 256.7, w: 20.8, h: 5.6, label: 'SCENE' },
    { kind: 'button', x: 231.1, y: 256.7, w: 21.1, h: 5.6, label: 'RECORDER' },
  ],
}
