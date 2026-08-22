import type { Device, Recipe, Template } from '../../lib/core/index'
import { moodState, type MoodState } from '../../lib/core/index'

/**
 * The golden scenario: one rig, one template, one mood, one seed.
 *
 * It is built to be a **trap for locale-dependent ordering**, not merely a large result. Device
 * ids are `A-cascade`, `B-tracker`, `a-drum`: by UTF-16 code unit that is the order they sort in
 * (`A` 0x41 < `B` 0x42 < `a` 0x61), while ICU collation puts `a-drum` first and case last. Every
 * §7.2 tie-break that touches a device id — candidate ordering, the clock-master tail — therefore
 * produces different bytes under `localeCompare` than under code units, and the golden file
 * records the code-unit answer.
 *
 * `test/determinism.test.ts` asserts that this discrimination is real rather than assumed, so a
 * later edit that flattens the ids into one case fails loudly instead of quietly making the
 * golden file stop testing anything.
 */

const MANUAL = { kind: 'manual', source: 'Golden Manual p.12' } as const
const OBSERVED = { kind: 'observed', source: 'golden unit, firmware 1.11' } as const

function recipe(over: Partial<Recipe> & Pick<Recipe, 'id' | 'role' | 'character' | 'voice'>): Recipe {
  return {
    title: `${over.character} ${over.role}`,
    params: [],
    verified: MANUAL,
    ...over,
  }
}

/** Semi-modular: one voice, patch cables, and it cannot master the clock (§7.4). */
const cascade: Device = {
  id: 'A-cascade',
  name: 'Golden Cascade',
  maker: 'Fixture',
  kind: 'semi-modular',
  clock: { canMaster: false, canSlave: true, transport: ['usb'] },
  io: { main: 'stereo', individualOuts: 1, audioIn: true, usbAudio: false },
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['bass-mid', 'lead'], polyphony: 1 }],
  comfortableVoices: 1,
  features: { perStep: ['velocity'] },
  hints: { 'fine-adjust': 'Hold SHIFT while turning' },
  recipes: [
    recipe({
      id: 'cascade-bassmid-dark',
      role: 'bass-mid',
      character: 'dark',
      voice: 'voice',
      params: [
        {
          kind: 'numeric',
          name: 'CUTOFF',
          value: 64,
          unit: 'Hz',
          range: { min: 0, max: 127, verified: MANUAL },
          mood: [{ axis: 'darkness', amount: -30 }],
          hint: 'fine-adjust',
        },
        {
          // Point observed on the unit, range read off the page: two independent claims (§3.2).
          kind: 'numeric',
          name: 'RESONANCE',
          value: 20,
          verified: OBSERVED,
          range: { min: 0, max: 127, verified: MANUAL },
          mood: [{ axis: 'grit', amount: 24 }],
        },
      ],
      patch: [{ from: 'OSC1 SUB', to: 'FILTER IN', note: 'short cable' }],
    }),
  ],
}

/** A pool, and the only box in the rig that can master over MIDI DIN. */
const tracker: Device = {
  id: 'B-tracker',
  name: 'Golden Tracker',
  maker: 'Fixture',
  kind: 'groovebox',
  clock: { canMaster: true, canSlave: true, transport: ['midi-din', 'usb'] },
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true },
  voices: [
    { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad', 'sub', 'texture'], polyphony: 4 },
  ],
  comfortableVoices: 3,
  features: { perStep: ['velocity', 'probability'] },
  recipes: [
    // Two pad recipes, `clean` and `dirty`, both exactly sqrt(2) from the requested `dark`
    // (§3.4) — so neither is exact and §3.5's **recipe id** tie-break is what picks one.
    //
    // The ids differ only by a dotted vs dotless i, which is the one collation difference that
    // splits English from Turkish: by code unit `ice` < `ıce` (U+0069 < U+0131) and English ICU
    // agrees, but Turkish ICU orders `ıce` first. That makes the CI locale matrix load-bearing
    // rather than decorative — a regression to `localeCompare` here would still pass the
    // `C.UTF-8` job and fail only under `tr_TR.UTF-8`, which is exactly the silent
    // cross-platform failure §7.2 exists to catch.
    recipe({
      id: 'tracker-pad-ice',
      role: 'pad',
      character: 'dirty',
      voice: 'track',
      params: [
        {
          // An unverified range: mood-inert, however loud the knob (§3.2's legality gate).
          kind: 'numeric',
          name: 'ATTACK',
          value: 40,
          range: { min: 0, max: 127, verified: false },
          mood: [{ axis: 'space', amount: 20 }],
        },
        { kind: 'enum', name: 'MODE', value: 'poly', options: ['poly', 'mono'], verified: false },
      ],
      articulation: [{ slot: 'downbeat', set: { velocity: 96 } }],
    }),
    recipe({
      id: 'tracker-pad-\u0131ce',
      role: 'pad',
      character: 'clean',
      voice: 'track',
      params: [
        { kind: 'enum', name: 'MODE', value: 'mono', options: ['poly', 'mono'], verified: false },
      ],
      articulation: [{ slot: 'downbeat', set: { velocity: 64 } }],
    }),
    recipe({
      id: 'tracker-sub-dirty',
      role: 'sub',
      character: 'dirty',
      voice: 'track',
      params: [
        {
          kind: 'numeric',
          name: 'DRIVE',
          value: 10,
          range: { min: 0, max: 100, verified: MANUAL },
          step: 5,
          mood: [{ axis: 'grit', amount: 40 }],
        },
      ],
    }),
  ],
}

/** Fixed voices, MIDI DIN, and it carries the most parts — so it wins §7.4 on load. */
const drum: Device = {
  id: 'a-drum',
  name: 'Golden Drum',
  maker: 'Fixture',
  kind: 'drum-machine',
  clock: { canMaster: true, canSlave: true, transport: ['midi-din', 'usb'] },
  io: { main: 'stereo', individualOuts: 8, audioIn: false, usbAudio: true },
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
  ],
  comfortableVoices: 4,
  features: { perStep: ['velocity', 'cycle'] },
  hints: { 'apply-cycle': 'Hold STEP, MENU, C5 knob' },
  recipes: [
    recipe({
      id: 'drum-kick-hard',
      role: 'kick',
      character: 'hard',
      voice: 'bd',
      routing: 'Keep out of the analog FX path',
      params: [
        {
          kind: 'numeric',
          name: 'TUNE',
          value: 52,
          range: { min: 0, max: 100, verified: MANUAL },
          mood: [{ axis: 'darkness', amount: -12 }],
        },
        { kind: 'text', name: 'NOTE', value: 'sits under the sub', verified: false },
      ],
      articulation: [
        { slot: 'accent', set: { velocity: 110 } },
        { slot: 'last-hit', set: { cycle: 2 }, hint: 'apply-cycle' },
      ],
    }),
    recipe({
      id: 'drum-hat-dirty',
      role: 'closed-hat',
      character: 'dirty',
      voice: 'ch',
      params: [
        {
          kind: 'numeric',
          name: 'DECAY',
          value: 24,
          range: { min: 0, max: 127, verified: MANUAL },
          mood: [{ axis: 'density', amount: 10 }],
        },
      ],
      articulation: [{ slot: 'offbeat', set: { velocity: 80 } }],
    }),
    recipe({ id: 'drum-tom-hard', role: 'tom', character: 'hard', voice: 'lt', params: [] }),
  ],
}

export const GOLDEN_DEVICES: Device[] = [cascade, tracker, drum]

export const GOLDEN_TEMPLATE: Template = {
  id: 'golden-techno',
  name: 'Golden Techno',
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
  hooks: [{ id: 'g-hook-1', forRole: 'lead', bars: 2, notes: [{ step: 1, degree: 5, octave: 0, len: 2 }] }],
  roles: [
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    { id: 'r-sub', role: 'sub', priority: 1, character: 'dark', sustain: 'continuous' },
    { id: 'r-hat', role: 'closed-hat', priority: 2, character: 'dirty', sustain: 'continuous' },
    { id: 'r-bassmid', role: 'bass-mid', priority: 2, character: 'dark', sustain: 'continuous' },
    { id: 'r-pad', role: 'pad', priority: 3, character: 'dark', sustain: 'continuous', polyphony: 3 },
    // A second pad, so the tracker carries three parts and ties the drum machine on occupied
    // count — which drops the clock-master decision through transport to the device-id
    // tie-break, the one place §7.2's code-unit rule is visible in the golden bytes.
    { id: 'r-pad-2', role: 'pad', priority: 2, character: 'dark', sustain: 'continuous', polyphony: 3 },
    // Two toms on two boxes, which this rig cannot satisfy: one becomes a `distinct` gap (§12.6).
    { id: 'r-tom-1', role: 'tom', priority: 3, character: 'hard', sustain: 'continuous', distinct: true },
    { id: 'r-tom-2', role: 'tom', priority: 3, character: 'hard', sustain: 'continuous', distinct: true },
    // Nothing in the rig declares `acid`: a `no-capable-voice` gap.
    { id: 'r-acid', role: 'acid', priority: 4, character: 'bright', sustain: 'continuous', optional: true },
    // Capable but unauthored: a `no-recipe` gap naming the tracker's tracks.
    { id: 'r-tex', role: 'texture', priority: 4, character: 'dark', sustain: 'continuous', optional: true },
    // Transient: occupies Build only (§4.2).
    { id: 'r-snare', role: 'snare', priority: 3, character: 'hard', sustain: 'transient', sections: ['Build'] },
  ],
  patterns: [
    {
      id: 'p-kick-b2',
      forRole: 'kick',
      band: 2,
      length: 16,
      hits: [
        { step: 1, slot: 'downbeat' },
        { step: 5, slot: 'accent', velocity: 110 },
        { step: 9, slot: 'downbeat' },
        { step: 13, slot: 'last-hit' },
      ],
    },
    // Band 2 only in Drop, so Intro and Build fall back to band 1 and the guide says so (§6.3).
    {
      id: 'p-hat-b2-drop',
      forRole: 'closed-hat',
      band: 2,
      sections: ['Drop'],
      length: 16,
      hits: [
        { step: 3, slot: 'offbeat' },
        { step: 7, slot: 'offbeat' },
      ],
    },
    { id: 'p-hat-b1', forRole: 'closed-hat', band: 1, length: 16, hits: [{ step: 3, slot: 'offbeat' }] },
    { id: 'p-pad-b2', forRole: 'pad', band: 2, length: 32, hits: [{ step: 1, slot: 'downbeat' }] },
    { id: 'p-sub-b2', forRole: 'sub', band: 2, length: 16, hits: [{ step: 1, slot: 'downbeat' }] },
  ],
}

/** Off-centre on four of the five axes, so mood does real work in the golden result. */
export const GOLDEN_MOOD: MoodState = moodState({
  darkness: 80,
  density: 60,
  grit: 75,
  space: 30,
})

export const GOLDEN_SEED = 20260822
