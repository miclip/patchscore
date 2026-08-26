import type {
  AuthoredParam,
  CapabilityEvidence,
  Cite,
  Device,
  Recipe,
  Template,
} from '../lib/core/index'

/**
 * Minimal valid data for every authored shape. Tests clone these and break one thing at a
 * time, so a fixture that stops parsing is itself a failure worth seeing.
 *
 * These are deliberately *not* real device data. The TR-1000 manifest is build step 2.
 */

export function numericParam(over: Record<string, unknown> = {}): AuthoredParam {
  return {
    kind: 'numeric',
    name: 'TUNE',
    value: 52,
    // A unit by default, because a numeric that carries one is the ordinary case. #29's audit
    // counts the unitless ones, and its tests build those explicitly with `unit: undefined` —
    // so every other test here keeps asserting only the thing it is about.
    unit: '%',
    range: { min: 0, max: 100, verified: { kind: 'manual', source: 'fixture manual p.1' } },
    ...over,
  } as AuthoredParam
}

export function enumParam(over: Record<string, unknown> = {}): AuthoredParam {
  return {
    kind: 'enum',
    name: 'MODE',
    value: 'analog',
    options: { values: ['analog', 'digital'] },
    ...over,
  } as AuthoredParam
}

export function textParam(over: Record<string, unknown> = {}): AuthoredParam {
  return { kind: 'text', name: 'NOTE', value: 'patch the sub out', ...over } as AuthoredParam
}

export function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 'fx-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'Short, hard, forward kick',
    params: [numericParam()],
    articulation: [{ slot: 'accent', set: { velocity: 110 }, hint: 'apply-cycle' }],
    verified: { kind: 'manual', source: 'fixture manual p.42' },
    ...over,
  }
}

export function device(over: Partial<Device> = {}): Device {
  return {
    id: 'fixture-drum',
    name: 'Fixture Drum',
    maker: 'Fixture',
    kind: 'drum-machine',
    clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },
    io: { main: 'stereo', individualOuts: 8, audioIn: false, usbAudio: true },
    physical: { panelSpanMm: 400, verified: { kind: 'manual', source: 'Fixture p.1' } },
    voices: [
      { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
      { kind: 'fixed', id: 'lt', label: 'LT', roles: ['sub', 'bass-mid', 'tom'], polyphony: 1 },
    ],
    comfortableVoices: 8,
    features: { perStep: ['velocity', 'probability', 'cycle'] },
    hints: { 'apply-cycle': 'Hold STEP, MENU, C5 knob' },
    manual: { title: 'Fixture Owner Manual', edition: 'eng02' },
    recipes: [recipe()],
    ...over,
    // §2.6/#142. A device with recipes owes an answer at `noteDuration`, so the shared fixture
    // declares one — a drum machine's, matching `kind` above — and `withNoteDuration` pairs it
    // with the citation the schema asks for. `noteDuration: undefined` suppresses both.
    noteDuration: 'noteDuration' in over ? over.noteDuration : FIXTURE_DURATION,
    capabilityEvidence: withNoteDuration(over, FIXTURE_DURATION),
  }
}

/**
 * §2.6/#142. The evidence map a fixture ends up with — **merged rather than replaced**, which is
 * the one place these builders do not behave like a plain spread, and it has to be.
 *
 * `DeviceSchema` requires an entry at `noteDuration` from any device carrying recipes, and these
 * fixtures carry one by default. A test overriding `capabilityEvidence` to say something about
 * *jacks* is not saying anything about note duration, and under a plain spread it would silently
 * drop the baseline and fail on a rule it was not testing.
 *
 * Injected **exactly where the declaration is**, which is the pairing `DeviceSchema` checks: a
 * citation with no declaration behind it is refused as loudly as the reverse. A fixture passing
 * `noteDuration: undefined` therefore gets neither, which is how a test builds a manifest that
 * has said nothing at all. `capabilityEvidence: undefined` explicitly still means none.
 */
export function withNoteDuration(
  over: Partial<Device>,
  fallback: Device['noteDuration'],
): Record<string, CapabilityEvidence> | undefined {
  const own = 'capabilityEvidence' in over ? over.capabilityEvidence : undefined
  if ('capabilityEvidence' in over && own === undefined) return undefined
  const declared = 'noteDuration' in over ? over.noteDuration : fallback
  if (declared === undefined) return own
  return { noteDuration: FIXTURE_CITE, ...own }
}

/** The declaration those fixtures carry. A drum machine's answer, to match the fixture's kind. */
export const FIXTURE_DURATION = {
  kind: 'trigger',
  reason: "the instrument's own envelope ends it",
} as const

/** The citation those baseline entries carry. Nothing reads it; it only has to be a `Cite`. */
export const FIXTURE_CITE: Cite = { kind: 'manual', source: 'Fixture p.1' }


export function poolDevice(over: Partial<Device> = {}): Device {
  return device({
    id: 'fixture-tracker',
    name: 'Fixture Tracker',
    kind: 'groovebox',
    voices: [
      {
        kind: 'pool',
        id: 'track',
        label: 'Track',
        count: 8,
        roles: ['kick', 'sub', 'pad', 'lead'],
        polyphony: 4,
      },
    ],
    recipes: [recipe({ id: 'fx-track-kick-hard', voice: 'track', articulation: undefined })],
    ...over,
  })
}

export function template(over: Partial<Template> = {}): Template {
  return {
    id: 'fixture-techno',
    name: 'Fixture Techno',
    bpm: { min: 130, max: 142, default: 134 },
    keys: ['F minor', 'A minor'],
    structure: [
      { name: 'Intro', bars: 16, energy: 0.2 },
      { name: 'Build', bars: 16, energy: 0.5 },
      { name: 'Drop', bars: 32, energy: 0.9 },
    ],
    harmony: {
      cycleBars: 8,
      progression: [
        { degree: 'i', bars: 4 },
        { degree: 'VI', bars: 2 },
        { degree: 'VII', bars: 2 },
      ],
    },
    hooks: [
      {
        id: 'fx-hook-1',
        forRole: 'lead',
        bars: 2,
        baseOctave: 4,
        notes: [{ step: 1, degree: 5, octave: 0, len: 2 }],
      },
    ],
    roles: [
      { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
      { id: 'r-pad', role: 'pad', priority: 3, character: 'dark', sustain: 'continuous', polyphony: 3 },
      {
        id: 'r-tex',
        role: 'texture',
        priority: 4,
        character: 'dark',
        sustain: 'continuous',
        // §4.4/#81: `optional` is a claim about the objective, `inessential` a claim to the
        // reader, and the schema requires the second wherever the first is made.
        optional: true,
        inessential: { reason: 'the fixture is still the fixture without it' },
      },
      {
        id: 'r-riser',
        role: 'riser',
        priority: 4,
        character: 'bright',
        sustain: 'transient',
        sections: ['Build'],
      },
    ],
    patterns: [
      {
        id: 'fx-kick-b2',
        forRole: 'kick',
        band: 2,
        length: 16,
        hits: [
          { step: 1, slot: 'downbeat' },
          { step: 5, slot: 'downbeat' },
          { step: 9, slot: 'downbeat', velocity: 110 },
          { step: 13, slot: 'last-hit' },
        ],
      },
    ],
    ...over,
  }
}
