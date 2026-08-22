import type { Device } from '../../core/device'
import type { AuthoredNumericParam } from '../../core/params'

/**
 * Roland TR-1000 (§2.3). Ten instrument tracks, four of them layer tracks.
 *
 * **Everything sound-design here is provisional, deliberately.** The owner's manual
 * (TR-1000_eng02_W.pdf) documents the *panel* — which knob does what, which screen a
 * parameter lives on, which gesture enters a step — and explicitly defers parameter values
 * to the separate Reference Manual / Parameter Guide ("For details on the parameter's value,
 * refer to the Reference Manual", p.17). So:
 *
 *  - the capability data below (tracks, jacks, clock, per-step features, gestures) is read
 *    off the manual and is the reason this file can be written at all;
 *  - every recipe carries `verified: false`, and every range carries its own `verified: false`,
 *    because a page citation for "the TUNE knob adjusts tuning" is not a citation for
 *    "TUNE sits at 44 for a hard kick". Citing the page for an invented setting would be
 *    exactly the fraud invariant 4 exists to prevent.
 *
 * Points *and* ranges stay explicitly `false` rather than inheriting the recipe's citation.
 * The redundancy is the point: if someone later cites one recipe from the Parameter Guide,
 * nothing in it is promoted to `authored` until a human writes the citation on that exact
 * claim. Inheritance would flip 85 values at once, and bounds are their own claim (§3.1).
 *
 * **Values are knob positions**, as a percentage of travel, because that is what the manual
 * lets anyone verify by looking at the box. `unit: '% travel'` says so on every rendered value.
 */

/** Knob position, 0-100 % of travel. Point and bounds both provisional: see the note above. */
function knob(
  name: string,
  value: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { min: 0, max: 100, verified: false },
    unit: '% travel',
    verified: false,
    ...extra,
  }
}

/** Generator types the manual lists by name (p.14). Which one a recipe picks is taste. */
const GEN_TYPES = ['Analog', 'ACB', 'FM', 'PCM', 'Sample']

export const device: Device = {
  id: 'roland-tr-1000',
  name: 'TR-1000',
  maker: 'Roland',
  kind: 'drum-machine',

  // MIDI IN/OUT1/OUT2-THRU, both OUT connectors switchable to DIN SYNC; USB clock; CLK OUT
  // mini-jack; TRG IN usable as a clock source (p.11-12, p.30, p.33 sync settings).
  clock: {
    canMaster: true,
    canSlave: true,
    transport: ['midi-din', 'din-sync', 'usb', 'analog-clock', 'trigger'],
  },

  // MIX OUT L/MONO+R, ten INDIVIDUAL OUT/TRIGGER OUT jacks (BD-RC), ANALOG FX OUT L/R,
  // EXTERNAL IN L/R, USB-C audio to a computer (p.11-12).
  io: { main: 'stereo', individualOuts: 10, audioIn: true, usbAudio: true },

  /**
   * The ten tracks, in panel order (p.14). BD-HT are layer tracks and sound generators A and
   * B together; RS-RC are single tracks. Either way one track sounds one note, so polyphony
   * is 1 everywhere (§12.4: polyphony counts notes, never roles).
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'sub', 'bass-mid'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HT', roles: ['tom', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'rs', label: 'RS', roles: ['rim', 'ghost-perc', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'hc', label: 'HC', roles: ['clap', 'snare', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OH', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'cc', label: 'CC', roles: ['impact', 'metallic', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'rc', label: 'RC', roles: ['ride', 'metallic', 'closed-hat'], polyphony: 1 },
  ],

  /**
   * §2.3's five step-parameter keys, which are this device's STEP EDIT screen (p.17): the
   * screen labels them VELOCITY, PROB, SUBSTEP, CYCLE and START, and `probability` and
   * `start-timing` are those two spelled out. `accent`, `weak` and `alt-inst` are three more
   * per-step capabilities the manual documents as their own gestures (p.17-18) rather than as
   * STEP EDIT fields, and the articulation below uses all three.
   *
   * `lfo` is omitted on purpose: the MOD screen exists (SHIFT + [FILTER]) but the manual never
   * states how many LFOs there are or whether they sync, and inventing a count to fill the
   * field is exactly invariant 5's failure mode.
   */
  features: {
    perStep: [
      'velocity',
      'probability',
      'substep',
      'cycle',
      'start-timing',
      'accent',
      'weak',
      'alt-inst',
    ],
    sidechain: { internal: true, fromExternalAudio: true },
  },

  /** Gestures, straight off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'accent-step': 'ACCENT [STEP], then step keys',
    'weak-step': 'Hold [SHIFT], press step keys',
    'sub-step': 'Press [SUB], then step keys',
    'alt-inst': 'Hold LAYER [B], press step keys',
    'step-edit': 'Hold step key, turn [C1]-[C5]',
    'layer-ab': 'LAYER [A]/[B] selects the layer',
    'select-gen': 'Hold [SHIFT], press [GEN]',
    'motion-rec': 'MOTION [REC] lit, then move knob',
  },

  /**
   * §2.3. Ten tracks exist, but eight occupied at once is what this box carries before it
   * feels over-subscribed — a musical judgement about the device, not a limit the manual
   * states (§12.4 counts an assignable once if it is occupied in any section).
   */
  comfortableVoices: 8,

  manual: { title: 'TR-1000 Owner’s Manual', edition: 'eng02' },

  recipes: [
    // ---- BD -------------------------------------------------------------------------
    {
      id: 'tr1000-kick-hard',
      role: 'kick',
      character: 'hard',
      voice: 'bd',
      title: 'Tight forward kick, fast tail',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false, hint: 'Hold [SHIFT], press [GEN]' },
        knob('TUNE', 44, { mood: [{ axis: 'darkness', amount: -10 }] }),
        knob('DECAY', 32),
        knob('MIX', 55, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 82),
      ],
      articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
      routing: 'INDIVIDUAL OUT BD — effects are bypassed on that jack',
      verified: false,
    },
    {
      id: 'tr1000-kick-dark',
      role: 'kick',
      character: 'dark',
      voice: 'bd',
      title: 'Low long kick that owns the bottom',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 28, { mood: [{ axis: 'darkness', amount: -8 }] }),
        knob('DECAY', 68, { mood: [{ axis: 'density', amount: -12 }] }),
        knob('MIX', 40, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 84),
      ],
      articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-kick-dirty',
      role: 'kick',
      character: 'dirty',
      voice: 'bd',
      title: 'Saturated kick with an audible click',
      params: [
        { kind: 'enum', name: 'GEN', value: 'Analog', options: GEN_TYPES, verified: false },
        knob('TUNE', 46, { mood: [{ axis: 'darkness', amount: -10 }] }),
        knob('DECAY', 40),
        knob('MIX', 70, { hint: 'Push layer B for the click' }),
        knob('LEVEL', 80),
      ],
      articulation: [
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
        { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
      ],
      verified: false,
    },
    {
      id: 'tr1000-sub-dark',
      role: 'sub',
      character: 'dark',
      voice: 'bd',
      title: 'Kick tuned down into a sustained sub',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 12, { mood: [{ axis: 'darkness', amount: -6 }] }),
        knob('DECAY', 88, { mood: [{ axis: 'density', amount: -16 }] }),
        knob('MIX', 30, { hint: 'Layer A only, no click' }),
        knob('LEVEL', 76),
      ],
      routing: 'INDIVIDUAL OUT BD so the sub stays out of the bus effects',
      verified: false,
    },

    // ---- SD -------------------------------------------------------------------------
    {
      id: 'tr1000-snare-hard',
      role: 'snare',
      character: 'hard',
      voice: 'sd',
      title: 'Cracking snare, short and centred',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 58, { mood: [{ axis: 'darkness', amount: -8 }] }),
        knob('DECAY', 36),
        knob('MIX', 62, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 78),
      ],
      articulation: [
        { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
        { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
      ],
      routing: 'INDIVIDUAL OUT SD — effects are bypassed on that jack',
      verified: false,
    },
    {
      id: 'tr1000-snare-bright',
      role: 'snare',
      character: 'bright',
      voice: 'sd',
      title: 'Thin high snare that cuts over a busy top',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 72, { mood: [{ axis: 'darkness', amount: -14 }] }),
        knob('DECAY', 30),
        knob('MIX', 74, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 76),
      ],
      articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-snare-dirty',
      role: 'snare',
      character: 'dirty',
      voice: 'sd',
      title: 'Ragged snare with an FM edge',
      params: [
        { kind: 'enum', name: 'GEN', value: 'FM', options: GEN_TYPES, verified: false },
        knob('TUNE', 54, { mood: [{ axis: 'darkness', amount: -8 }] }),
        knob('DECAY', 44),
        knob('MIX', 58, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 77),
      ],
      articulation: [
        { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
        { slot: 'fill', set: { substep: '1/2' }, hint: 'sub-step' },
      ],
      verified: false,
    },

    // ---- LT / HT --------------------------------------------------------------------
    {
      id: 'tr1000-tom-dark',
      role: 'tom',
      character: 'dark',
      voice: 'lt',
      title: 'Low tom with a slow fall',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 26, { mood: [{ axis: 'darkness', amount: -6 }] }),
        knob('DECAY', 62, { mood: [{ axis: 'density', amount: -10 }] }),
        knob('MIX', 45, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 70),
      ],
      articulation: [{ slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' }],
      verified: false,
    },
    {
      id: 'tr1000-tom-bright',
      role: 'tom',
      character: 'bright',
      voice: 'ht',
      title: 'High tom, tight enough to sit in a fill',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 68, { mood: [{ axis: 'darkness', amount: -12 }] }),
        knob('DECAY', 44),
        knob('MIX', 60, { hint: 'Layer A/B balance' }),
        knob('LEVEL', 70),
      ],
      articulation: [
        { slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' },
        { slot: 'last-hit', set: { accent: true }, hint: 'accent-step' },
      ],
      verified: false,
    },

    // ---- RS -------------------------------------------------------------------------
    {
      id: 'tr1000-rim-clean',
      role: 'rim',
      character: 'clean',
      voice: 'rs',
      title: 'Dry rim, no tail at all',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 62),
        knob('DECAY', 18),
        knob('LEVEL', 66),
      ],
      articulation: [{ slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' }],
      verified: false,
    },
    {
      id: 'tr1000-ghost-perc-soft',
      role: 'ghost-perc',
      character: 'soft',
      voice: 'rs',
      title: 'Barely-there rim under the backbeat',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 58),
        knob('DECAY', 14),
        knob('LEVEL', 52),
      ],
      articulation: [
        { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
        { slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' },
      ],
      verified: false,
    },

    // ---- HC -------------------------------------------------------------------------
    {
      id: 'tr1000-clap-bright',
      role: 'clap',
      character: 'bright',
      voice: 'hc',
      title: 'Wide clap sitting on top of the snare',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 66, { mood: [{ axis: 'darkness', amount: -10 }] }),
        knob('DECAY', 34),
        knob('LEVEL', 74),
      ],
      articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-clap-soft',
      role: 'clap',
      character: 'soft',
      voice: 'hc',
      title: 'Soft clap layered behind, not in front',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 60),
        knob('DECAY', 40, { mood: [{ axis: 'density', amount: -8 }] }),
        knob('LEVEL', 62),
      ],
      articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },

    // ---- CH -------------------------------------------------------------------------
    {
      id: 'tr1000-closed-hat-clean',
      role: 'closed-hat',
      character: 'clean',
      voice: 'ch',
      title: 'Clipped closed hat, straight sixteenths',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 60),
        knob('DECAY', 16, { mood: [{ axis: 'density', amount: -6 }] }),
        knob('LEVEL', 64),
      ],
      articulation: [
        { slot: 'offbeat', set: { weak: true }, hint: 'weak-step' },
        { slot: 'fill', set: { substep: '1/2' }, hint: 'sub-step' },
      ],
      verified: false,
    },
    {
      id: 'tr1000-closed-hat-dirty',
      role: 'closed-hat',
      character: 'dirty',
      voice: 'ch',
      title: 'Grainy FM hat with a metallic edge',
      params: [
        { kind: 'enum', name: 'GEN', value: 'FM', options: GEN_TYPES, verified: false },
        knob('TUNE', 66),
        knob('DECAY', 22, { mood: [{ axis: 'density', amount: -8 }] }),
        knob('LEVEL', 66),
      ],
      articulation: [
        { slot: 'offbeat', set: { weak: true }, hint: 'weak-step' },
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      ],
      verified: false,
    },

    // ---- OH -------------------------------------------------------------------------
    {
      id: 'tr1000-open-hat-bright',
      role: 'open-hat',
      character: 'bright',
      voice: 'oh',
      title: 'Open hat that rings into the next downbeat',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 64, { mood: [{ axis: 'darkness', amount: -12 }] }),
        knob('DECAY', 54, { mood: [{ axis: 'density', amount: -14 }] }),
        knob('LEVEL', 68),
      ],
      articulation: [{ slot: 'offbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-open-hat-dark',
      role: 'open-hat',
      character: 'dark',
      voice: 'oh',
      title: 'Dull open hat, more air than sizzle',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 42, { mood: [{ axis: 'darkness', amount: -8 }] }),
        knob('DECAY', 62, { mood: [{ axis: 'density', amount: -14 }] }),
        knob('LEVEL', 66),
      ],
      articulation: [{ slot: 'offbeat', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },

    // ---- CC / RC --------------------------------------------------------------------
    {
      id: 'tr1000-impact-hard',
      role: 'impact',
      character: 'hard',
      voice: 'cc',
      title: 'Crash marking the top of a section',
      params: [
        { kind: 'enum', name: 'GEN', value: 'PCM', options: GEN_TYPES, verified: false },
        knob('TUNE', 55),
        knob('DECAY', 80, { mood: [{ axis: 'density', amount: -18 }] }),
        knob('LEVEL', 72),
      ],
      articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-ride-clean',
      role: 'ride',
      character: 'clean',
      voice: 'rc',
      title: 'Even ride holding the top of the bar',
      params: [
        { kind: 'enum', name: 'GEN', value: 'ACB', options: GEN_TYPES, verified: false },
        knob('TUNE', 58),
        knob('DECAY', 70, { mood: [{ axis: 'density', amount: -12 }] }),
        knob('LEVEL', 62),
      ],
      articulation: [
        { slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' },
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      ],
      verified: false,
    },
  ],
}
