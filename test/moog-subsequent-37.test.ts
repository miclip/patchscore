import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  assignableKey,
  expand,
  realisationOf,
  requiredVoicePolyphony,
  resolve,
  type Assignable,
  type AuthoredParam,
  type Recipe,
  type RoleRequest,
} from '../lib/core/index'
import { device } from '../lib/devices/moog-subsequent-37/index'
import { fxSources } from '../lib/core/fx'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, ambientDub, industrialTechno } from '../lib/templates/index'
import { template } from './fixtures'

/**
 * The Subsequent 37 is the library's first **two-note** voice, and that one number is what most
 * of this file is about.
 *
 * Every other polyphony in the registry is 1, 4 or 8. Two is the middle value, and it is the
 * only one that sits *between* what the shipped templates ask for and what they will accept:
 * `stab` and `pad` are both requested at three notes or more, this box carries two, and §7.3 has
 * to say the difference out loud rather than quietly assigning a patch that cannot play the part.
 *
 * So there are two claims here that nothing else in the library can make, and they pull in
 * opposite directions:
 *
 *  - a **two-note** part fits inside the single assignable, for both roles;
 *  - a **three-note** part does not, and fails as `polyphony` rather than as `no-such-role` —
 *    the box plays stabs and pads, it does not play triads of either.
 *
 * The second is what the role list has to stay out of. `roles` says what the voice can be asked
 * to do and `polyphony` says how many notes it can do it with; withholding `pad` on the grounds
 * that two notes makes a thin one would move a size question into the capability list and make
 * the guide say *"nothing in your rig plays this part"* about a box that plainly sustains.
 *
 * On top of that sits the pairing this manifest is built around. `DUO MODE` alone does not mean
 * two notes: with `KB CTRL` at OFF the panel is lit exactly the same way, OSC 2 leaves the
 * keyboard, and the part is monophonic again — while the FREQUENCY knob quietly moves from a
 * seven-semitone scale to a three-octave one. Both halves of that are asserted below, from the
 * manifest side, because the resolver cannot see either.
 */

const MANUAL = "Subsequent 37 User's Manual"

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function every(): AuthoredParam[] {
  return device.recipes.flatMap(params)
}

/**
 * How many notes a recipe leaves itself, read off the two switches that decide it (p.26).
 *
 * This is the number the engine cannot see. `Assignable.polyphony` is 2 and stays 2, because
 * that is a fact about the box; what a recipe does with the two is a fact about the recipe, and
 * `Recipe` has nowhere to put it.
 *
 * **Both switches are consulted, and that is the point.** DUO MODE on with KB CTRL at OFF is the
 * state that looks duophonic and is not: "OSC 2 drones and does not follow the keyboard".
 */
function notesAvailable(recipe: Recipe): number {
  const duoMode = paramNamed(recipe, 'OSC · DUO MODE')
  const kbCtrl = paramNamed(recipe, 'OSC · KB CTRL')
  if (duoMode?.kind !== 'enum') throw new Error(`${recipe.id}: no DUO MODE`)
  if (kbCtrl?.kind !== 'enum') throw new Error(`${recipe.id}: no KB CTRL`)
  if (duoMode.value === 'OFF') return 1
  return kbCtrl.value === 'OFF' ? 1 : 2
}

/** A request, with the fields every one of these tests would otherwise repeat. */
function ask(over: Partial<RoleRequest> & Pick<RoleRequest, 'id' | 'role'>): RoleRequest {
  return { priority: 1, character: 'dark', sustain: 'continuous', ...over }
}

function rig(roles: RoleRequest[]) {
  return resolve({
    devices: [device],
    template: template({ roles, patterns: [], hooks: [] }),
    mood: NEUTRAL_MOOD,
    seed: 1,
  })
}

describe('Subsequent 37 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('moog-subsequent-37')
    expect(device.name).toBe('Subsequent 37')
    expect(device.maker).toBe('Moog')
    expect(device.kind).toBe('synth')
  })

  it('names the manual precisely, and claims no edition it does not have', () => {
    // The 2014 Sub 37's manual is the same length with the same structure and near-identical
    // ranges. Citing it would give a real page number from a real Moog manual describing a
    // different instrument, which is harder to catch than an invented value.
    expect(device.manual).toEqual({ title: MANUAL })
    expect(device.manual?.title).toContain('Subsequent')
    // No edition is printed on the cover or title page; the only dating is a ©2017 colophon.
    expect(device.manual?.edition).toBeUndefined()
  })

  it('sends and receives clock, over the two transports it has', () => {
    // p.37: `SEND CLOCK: OFF, ARP, ON`. pp.15/23/31/33: every SYNC switch locks to external
    // MIDI clock. pp.35-36: clock rides `IN PORTS`/`OUT PORTS`, both defaulting to BOTH.
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb'])
    // §7.4: a synth with a sequencer in it can drive a rig; driving one is not its job.
    expect(device.clock.preferredSource).toBeUndefined()
  })

  it('is the library first mono-output synth, and takes audio in', () => {
    // p.61: `AUDIO OUTPUT: 1xTS, 1xTRS Headphone`, and p.34 says the headphone jack is the same
    // monaural signal on both sides. Every other synth in the registry is stereo.
    expect(device.io).toEqual({ main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false })
    const synths = DEVICES.filter((d) => d.kind === 'synth')
    expect(synths.map((d) => d.id)).toContain('moog-subsequent-37')
    expect(synths.filter((d) => d.io.main === 'mono').map((d) => d.id)).toEqual([
      'moog-subsequent-37',
    ])
  })

  it('declares no patch points, because every socket is a rig connection', () => {
    // §3.3 is for a box a recipe cables into itself. Audio out, EXT IN, four CV/gate inputs,
    // MIDI DIN and USB are all rig connections (pp.7-8), and §10's rack draws those already.
    // FDBK / EXT IN is the closest thing to an internal patch and needs no cable at all (p.27).
    expect(device.jacks).toBeUndefined()
    expect(device.recipes.every((r) => r.patch === undefined)).toBe(true)
  })

  it('carries no step data, because patterns are template-owned (§4.3)', () => {
    expect(device.features?.perStep).toBeUndefined()
    expect(device.recipes.every((r) => r.articulation === undefined)).toBe(true)
    // Nor does any recipe reach for the arpeggiator, whose RATE knob is the fourth control on
    // this panel whose scale a SYNC switch replaces (p.15).
    const names = new Set(every().map((p) => p.name))
    expect(names.has('ARPEGGIATOR · RATE')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §12.4 — two notes, from three sides
// ---------------------------------------------------------------------------

describe('two notes are one assignable, and the line is drawn at three', () => {
  it('expands to exactly one assignable, of polyphony 2', () => {
    // p.61: `POLYPHONY: Selectable Monophonic or Duophonic`. p.9: two independent pitches
    // through "a single, classic 20Hz-20kHz Moog Ladder Filter" — one filter, one amplifier,
    // one pair of envelopes, so the two pitches are capacity inside a part and never two parts.
    const assignables = expand(device)
    expect(assignables).toHaveLength(1)
    expect(assignables[0]?.polyphony).toBe(2)
    expect(assignables[0]?.voiceId).toBe('voice')
    expect(assignables[0]?.poolId).toBeUndefined()
    expect(device.voices).toHaveLength(1)
  })

  it('is the only two-note voice in the library', () => {
    // Every other polyphony in the registry is 1, 4 or 8. This is the middle value that tests
    // whether the field means notes-within-a-role rather than roles-at-once.
    const twos = DEVICES.flatMap((d) => expand(d)).filter((a) => a.polyphony === 2)
    expect(twos.map((a) => a.deviceId)).toEqual(['moog-subsequent-37'])
  })

  it('carries a two-note part inside that one assignable', () => {
    const result = rig([ask({ id: 'r-stab', role: 'stab', character: 'hard', polyphony: 2 })])
    expect(result.gaps).toEqual([])
    const [stab] = result.assignments
    expect(stab?.notes).toBe(2)
    expect(stab?.assignable.polyphony).toBe(2)
    expect(expand(device)).toHaveLength(1)
  })

  it('calls a three-note stab a `polyphony` gap, not a missing role', () => {
    const result = rig([ask({ id: 'r-stab', role: 'stab', character: 'hard', polyphony: 3 })])
    expect(result.assignments).toEqual([])
    const [gap] = result.gaps
    expect(gap?.reason).toBe('no-capable-voice')
    if (gap?.reason !== 'no-capable-voice') throw new Error('wrong gap')
    // The distinction §7.3 exists to draw: this box plays stabs, it does not play three-note
    // ones. `no-such-role` here would be a lie about the hardware.
    expect(gap.because).toBe('polyphony')
    expect(gap.notes).toBe(3)
    expect(gap.roleVoices.map((v) => v.voiceId)).toEqual(['voice'])
  })

  it('treats a pad exactly as it treats a stab: two notes yes, three notes polyphony', () => {
    // The role is declared and authored, so the refusal comes from the number rather than from
    // the list — which is the only thing `polyphony` is entitled to say. A `no-such-role` gap
    // here would render as "nothing in your rig plays this part" about a box that sustains,
    // filters and takes two independent pitches.
    expect(device.voices[0]?.roles).toContain('pad')
    expect(device.recipes.some((r) => r.role === 'pad')).toBe(true)

    for (const notes of [1, 2]) {
      const result = rig([ask({ id: 'r-pad', role: 'pad', polyphony: notes })])
      expect(result.gaps, `pad at ${notes}`).toEqual([])
      expect(result.assignments[0]?.notes, `pad at ${notes}`).toBe(notes)
    }
    for (const notes of [3, 4]) {
      const result = rig([ask({ id: 'r-pad', role: 'pad', polyphony: notes })])
      expect(result.assignments, `pad at ${notes}`).toEqual([])
      const [gap] = result.gaps
      expect(gap?.reason, `pad at ${notes}`).toBe('no-capable-voice')
      if (gap?.reason !== 'no-capable-voice') throw new Error('wrong gap')
      expect(gap.because, `pad at ${notes}`).toBe('polyphony')
      expect(gap.notes, `pad at ${notes}`).toBe(notes)
    }
  })

  it('plays a texture with the looping envelope the manual describes', () => {
    // The role was withheld once for want of a recipe, which is an authoring gap reported as a
    // capability one. It resolves now, and the recipe behind it is the box's own documented
    // technique rather than a bass with the release turned up: p.31's LOOP, "a multistage LFO",
    // over an OSC 2 that has left the keyboard.
    const result = rig([ask({ id: 'r-texture', role: 'texture', character: 'soft' })])
    expect(result.gaps).toEqual([])
    const recipe = device.recipes.find((r) => r.id === result.assignments[0]?.recipe?.id)
    if (recipe === undefined) throw new Error('no texture recipe')
    expect(recipe.role).toBe('texture')

    const filterLoop = paramNamed(recipe, 'FILTER EG · LOOP')
    const ampLoop = paramNamed(recipe, 'AMP EG · LOOP')
    if (filterLoop?.kind !== 'enum' || ampLoop?.kind !== 'enum') throw new Error('no LOOP')
    expect(filterLoop.value).toBe('ON')
    // Not the amplitude one: looping that re-articulates a held note and turns a bed into a
    // pulse. The asymmetry is the recipe, so it is asserted rather than left to a comment.
    expect(ampLoop.value).toBe('OFF')
    expect(filterLoop.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.31` })

    // And it is the second recipe on the device to use the extended FREQUENCY scale, so that
    // branch is exercised by more than one authored patch.
    expect(notesAvailable(recipe)).toBe(1)
    const kbCtrl = paramNamed(recipe, 'OSC · KB CTRL')
    expect(kbCtrl?.kind === 'enum' && kbCtrl.value).toBe('OFF')
  })

  it('reports a texture it cannot get to as contended, never as absent', () => {
    // `ambient-dub` asks for a one-note texture and a one-note sub, and this box has one voice.
    // The gap that comes back is `no-room`, which is a true sentence about a rig; before the
    // role was declared it was `no-such-role`, which was a false one about the hardware.
    const result = resolve({ devices: [device], template: ambientDub, mood: NEUTRAL_MOOD, seed: 1 })
    const gap = result.gaps.find((g) => g.requestId === 'r-texture')
    expect(gap?.reason).toBe('no-room')
  })

  it('still reports a genuinely absent role as absent', () => {
    // The other half, so the change above did not simply delete the distinction: a role this
    // voice does not declare is `no-such-role`, and that failure is structural rather than about
    // size or about authoring. One filter and one amp envelope cannot give a kick a noise
    // transient over an independent pitched body, and no note count would fix it.
    for (const role of ['kick', 'closed-hat', 'snare'] as const) {
      const result = rig([ask({ id: 'r', role, polyphony: 1 })])
      const [gap] = result.gaps
      expect(gap?.reason, role).toBe('no-capable-voice')
      if (gap?.reason !== 'no-capable-voice') throw new Error('wrong gap')
      expect(gap.because, role).toBe('no-such-role')
    }
  })

  it('gives both kinds of answer on the real template, in one run', () => {
    // Not a constructed request: `industrial-techno` asks for a three-note stab and a three-note
    // pad, and both come back as the size failure while the drum parts come back as the
    // structural one. The two live side by side in one guide, which is what makes the
    // distinction worth drawing at all.
    const result = resolve({
      devices: [device],
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 3,
    })
    const causes = new Map(
      result.gaps.map((g) => [g.requestId, g.reason === 'no-capable-voice' ? g.because : g.reason]),
    )
    expect(causes.get('r-stab')).toBe('polyphony')
    expect(causes.get('r-pad')).toBe('polyphony')
    expect(causes.get('r-kick')).toBe('no-such-role')
    expect(causes.get('r-closed-hat')).toBe('no-such-role')
  })

  it('asks the single voice for the whole note count, never for a chord it cannot load', () => {
    // Every recipe is `polyphonic-voice` by omission, and that is not incidental: §12.4's other
    // realisation is a chord baked into a sample, and p.61 says `SOUND ENGINE: 100% Analog`.
    for (const recipe of device.recipes) {
      expect(realisationOf(recipe), recipe.id).toBe('polyphonic-voice')
      expect(requiredVoicePolyphony(recipe, 2), recipe.id).toBe(2)
    }
  })
})

describe('two parts cannot both have the voice', () => {
  it('gives the voice to one request and contends the rest', () => {
    const result = rig([
      ask({ id: 'r-bass', role: 'bass-mid', priority: 1, character: 'dirty' }),
      ask({ id: 'r-acid', role: 'acid', priority: 2, character: 'dirty' }),
      ask({ id: 'r-lead', role: 'lead', priority: 3, character: 'bright' }),
    ])
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.requestId).toBe('r-bass')
    expect(result.gaps.map((g) => g.requestId)).toEqual(['r-acid', 'r-lead'])
    for (const gap of result.gaps) {
      expect(gap.reason).toBe('no-room')
      if (gap.reason !== 'no-room') throw new Error('wrong gap')
      expect(gap.because).toBe('contended')
      expect(gap.detail).toContain('Subsequent 37 Voice is carrying bass-mid')
    }
  })

  it('never lets two parts occupy the voice in one section, on the real template either', () => {
    const result = resolve({
      devices: [device],
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 7,
    })
    const held = new Map<string, string>()
    for (const a of result.assignments) {
      for (const section of a.sections) {
        const key = `${assignableKey(a.assignable as Assignable)} ${section}`
        expect(held.get(key), `${key} taken twice`).toBeUndefined()
        held.set(key, a.requestId)
      }
    }
    expect(held.size).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// p.26 — DUO MODE and KB CTRL, the pair that decides two separate things
// ---------------------------------------------------------------------------

describe('DUO MODE never means two notes on its own (p.26)', () => {
  it('states both switches on every recipe, cited to the page that describes them', () => {
    for (const recipe of device.recipes) {
      const duoMode = paramNamed(recipe, 'OSC · DUO MODE')
      const kbCtrl = paramNamed(recipe, 'OSC · KB CTRL')
      if (duoMode?.kind !== 'enum' || kbCtrl?.kind !== 'enum') {
        throw new Error(`${recipe.id}: missing a voicing switch`)
      }
      expect(duoMode.options.values).toEqual(['OFF', 'ON'])
      expect(kbCtrl.options.values).toEqual(['HI', 'LO', 'OFF'])
      for (const claim of [duoMode.options.verified, kbCtrl.options.verified]) {
        expect(claim, recipe.id).toEqual({ kind: 'manual', source: `${MANUAL}, p.26` })
      }
      // The option set is the citable claim; which position is chosen is taste (§3.2).
      expect(duoMode.verified).toBe(false)
      expect(kbCtrl.verified).toBe(false)
    }
  })

  it('counts the drone state as one note, however duophonic the panel looks', () => {
    // The state that would be got wrong: DUO MODE lit, KB CTRL off, and the part monophonic
    // because "OSC 2 drones and does not follow the keyboard".
    const drones = device.recipes.filter((r) => {
      const kbCtrl = paramNamed(r, 'OSC · KB CTRL')
      const duoMode = paramNamed(r, 'OSC · DUO MODE')
      return (
        kbCtrl?.kind === 'enum' &&
        kbCtrl.value === 'OFF' &&
        duoMode?.kind === 'enum' &&
        duoMode.value === 'ON'
      )
    })
    // Not vacuous: at least one recipe is actually in that state, so the rule has something to
    // hold and the +/- 3 octave scale below is exercised by a real recipe.
    expect(drones.length).toBeGreaterThanOrEqual(1)
    for (const recipe of drones) expect(notesAvailable(recipe), recipe.id).toBe(1)
  })

  it('spends the second note only where a template asks for two, and says so at the machine', () => {
    // Read off the manifest rather than asserted per recipe id, so a new recipe joins the rule
    // instead of slipping past it.
    const byRole = new Map<string, Set<number>>()
    for (const recipe of device.recipes) {
      const seen = byRole.get(recipe.role) ?? new Set<number>()
      seen.add(notesAvailable(recipe))
      byRole.set(recipe.role, seen)
    }
    const spent = Object.fromEntries([...byRole].map(([role, n]) => [role, [...n].sort()]))
    expect(spent).toEqual({
      'bass-mid': [1],
      sub: [1],
      acid: [1],
      lead: [1],
      arp: [1],
      // The two roles the shipped templates ask for more than one note of.
      stab: [2],
      pad: [2],
      // One note played, plus a drone that never touches the keyboard.
      texture: [1],
    })
    // And the cost of each is stated where the reader sees it, because `Recipe` cannot say it.
    for (const recipe of device.recipes) {
      const duoMode = paramNamed(recipe, 'OSC · DUO MODE')
      if (duoMode?.kind !== 'enum') throw new Error(`${recipe.id}: no DUO MODE`)
      expect(duoMode.note, recipe.id).toBeDefined()
      if (notesAvailable(recipe) === 2) expect(duoMode.note).toContain('two notes')
      else expect(duoMode.note).toContain('one note')
    }
  })

  it('can play every request the shipped templates make of the roles it declares', () => {
    // The rule tied to the thing it protects. `stab` and `pad` are the roles the templates ask
    // for more notes of than any recipe leaves, and they are exactly the requests the resolver
    // refuses above — so every *other* declared role must be fully served, and those two must be
    // the only exceptions rather than the first of many.
    const declared = new Set(device.voices[0]?.roles ?? [])
    const asks = TEMPLATES.flatMap((t) => t.roles)
      .filter((r) => declared.has(r.role))
      .map((r) => ({ role: r.role, notes: r.polyphony ?? 1 }))
    expect(asks.length).toBeGreaterThan(0)
    const short = new Set<string>()
    for (const askFor of asks) {
      for (const recipe of device.recipes.filter((r) => r.role === askFor.role)) {
        if (notesAvailable(recipe) < askFor.notes) short.add(recipe.role)
      }
    }
    expect([...short].sort()).toEqual(['pad', 'stab'])
  })
})

// ---------------------------------------------------------------------------
// §3.2 — the scales a switch replaces, each paired with its switch
// ---------------------------------------------------------------------------

describe('every mode-dependent range is paired with the switch that selects it', () => {
  it('gives OSC 2 FREQUENCY whichever of its two printed scales KB CTRL puts in force (p.26)', () => {
    // The TR-8S `SNAPPY` failure exactly: the panel keeps its `-7 ... +7` silkscreen in both
    // states while the scale in force changes. p.26: with KB CTRL off "The FREQUENCY control
    // knob's range is extended to +/- 3 octaves".
    let extended = 0
    for (const recipe of device.recipes) {
      const kbCtrl = paramNamed(recipe, 'OSC · KB CTRL')
      const frequency = paramNamed(recipe, 'OSC 2 · FREQUENCY')
      if (kbCtrl?.kind !== 'enum') throw new Error(`${recipe.id}: no KB CTRL`)
      if (frequency?.kind !== 'numeric') throw new Error(`${recipe.id}: no FREQUENCY`)
      const off = kbCtrl.value === 'OFF'
      expect([frequency.range.min, frequency.range.max], recipe.id).toEqual(
        off ? [-36, 36] : [-7, 7],
      )
      // Both scales in semitones, deliberately: p.26 says "+/- 3 octaves" and an octave is
      // twelve semitones, so carrying the manual's own unit would have added a fourth scale to
      // a pitch-interval family `test/units.test.ts` already lists as drift. Same unit also
      // makes the five-fold difference visible, which two units would have hidden.
      expect(frequency.unit, recipe.id).toBe('st')
      expect(frequency.range.verified, recipe.id).toEqual({
        kind: 'manual',
        source: `${MANUAL}, p.26`,
      })
      if (off) extended += 1
    }
    // Both scales are used, so a wrong bound cannot hide behind an unexercised branch.
    expect(extended).toBeGreaterThanOrEqual(1)
    expect(extended).toBeLessThan(device.recipes.length)
  })

  it('never prints an LFO rate in hertz while SYNC is on (p.23)', () => {
    // p.23: with SYNC lit "the LFO RATE knob selects between clock divisions of the internal or
    // external MIDI clock". A number in hertz there is a reading off the scale the switch has
    // moved away from, and the cited `(0.1…100 Hz)` beside it would make it look checked.
    let synced = 0
    for (const recipe of device.recipes) {
      const sync = paramNamed(recipe, 'MOD 1 · SYNC')
      const rate = paramNamed(recipe, 'MOD 1 · LFO RATE')
      const division = paramNamed(recipe, 'MOD 1 · LFO RATE (division)')
      if (sync?.kind !== 'enum') throw new Error(`${recipe.id}: no MOD 1 SYNC`)
      if (sync.value === 'ON') {
        synced += 1
        expect(rate, recipe.id).toBeUndefined()
        if (division?.kind !== 'enum') throw new Error(`${recipe.id}: synced with no division`)
        // 21 divisions, and unlike the minilogue xd's equivalent the manual prints all of them,
        // so the option set has a citable legality gate (§3.2).
        expect(division.options.values).toHaveLength(21)
        expect(division.options.values[0]).toBe('4 WHOLE')
        expect(division.options.values[20]).toBe('1/64 T')
        expect(division.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.52` })
      } else {
        expect(division, recipe.id).toBeUndefined()
        if (rate?.kind !== 'numeric') throw new Error(`${recipe.id}: free LFO with no rate`)
      }
    }
    // Exercised on at least one recipe, so the synced branch is not dead authoring.
    expect(synced).toBeGreaterThanOrEqual(1)
  })

  it('gives LFO RATE the bounds HI RANGE names, and cites the page that names them', () => {
    // p.22 for the default 0.1-100 Hz, p.23 for HI RANGE's "1Hz ... through 1,000Hz". Two
    // scales, two pages, and the switch decides which one the value was read from.
    for (const recipe of device.recipes) {
      const hiRange = paramNamed(recipe, 'MOD 1 · HI RANGE')
      const rate = paramNamed(recipe, 'MOD 1 · LFO RATE')
      if (hiRange?.kind !== 'enum') throw new Error(`${recipe.id}: no HI RANGE`)
      if (rate === undefined) continue
      if (rate.kind !== 'numeric') throw new Error(`${recipe.id}: LFO RATE is not numeric`)
      const on = hiRange.value === 'ON'
      expect([rate.range.min, rate.range.max], recipe.id).toEqual(on ? [1, 1000] : [0.1, 100])
      expect(rate.unit).toBe('Hz')
      expect(rate.range.verified, recipe.id).toEqual({
        kind: 'manual',
        source: `${MANUAL}, p.${on ? 23 : 22}`,
      })
    }
  })

  it('introduces no new unit, which is what the units tripwire is for', () => {
    // #29 pins the unit vocabulary so a new unit gets looked at while the recipe introducing it
    // is still being written. This device introduces none: every unit it uses was already in
    // the library, and the one place it was tempted — p.26's "+/- 3 octaves" — is carried in
    // semitones instead. See the FREQUENCY test above for why.
    const units = new Set(
      every().flatMap((p) => (p.kind === 'numeric' && p.unit !== undefined ? [p.unit] : [])),
    )
    expect([...units].sort()).toEqual(['%', 'Hz', 'ms', 'st'])
  })

  it('never places a value in the LFO range the manual does not bound', () => {
    // CC 76/78 (p.54) give the LFO three ranges — LOW, MED, HIGH — and pp.22-23 document two.
    // The low range's endpoints are printed nowhere, and `LFO: 0.01Hz - 1000Hz` (p.61) does not
    // agree with the union of the two documented ones either. So the switch is authored as the
    // panel's own two-state button and nothing ever lands in the third.
    for (const recipe of device.recipes) {
      const hiRange = paramNamed(recipe, 'MOD 1 · HI RANGE')
      if (hiRange?.kind !== 'enum') throw new Error(`${recipe.id}: no HI RANGE`)
      expect(hiRange.options.values).toEqual(['OFF', 'ON'])
    }
    expect(every().flatMap((p) => (p.kind === 'enum' ? [p.value] : []))).not.toContain('LOW')
  })

  it('states KNOB SHIFT off before any recipe states an envelope time (p.30)', () => {
    // One button turns all eight envelope knobs into DELAY, HOLD, VEL AMT and KB TRACK, and the
    // shifted knobs keep the unshifted tick marks — so nothing on the panel tells a reader which
    // layer they are looking at.
    for (const recipe of device.recipes) {
      const names = params(recipe).map((p) => p.name)
      const shift = paramNamed(recipe, 'ENV · KNOB SHIFT')
      if (shift?.kind !== 'enum') throw new Error(`${recipe.id}: no KNOB SHIFT`)
      expect(shift.value, recipe.id).toBe('OFF')
      expect(shift.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.30` })
      // Before, not merely present: the guide renders params in authored order.
      const at = names.indexOf('ENV · KNOB SHIFT')
      for (const stage of ['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE']) {
        for (const eg of ['FILTER EG', 'AMP EG']) {
          const i = names.indexOf(`${eg} · ${stage}`)
          expect(i, `${recipe.id} ${eg} ${stage}`).toBeGreaterThan(at)
        }
      }
      // And none of the shifted parameters is authored under its shifted name.
      for (const shifted of ['DELAY', 'HOLD', 'VEL AMT', 'KB TRACK']) {
        expect(names.some((n) => n.startsWith('FILTER EG · ' + shifted))).toBe(false)
        expect(names.some((n) => n.startsWith('AMP EG · ' + shifted))).toBe(false)
      }
    }
  })

  it('omits the one control whose scale the manual never prints in any unit', () => {
    // GLIDE TIME has the panel's `0 ... 10` calibration and no seconds figure anywhere in 61
    // pages, so it is authored unitless against that calibration. A millisecond value beside it
    // would be a fabrication wearing a page number.
    for (const recipe of device.recipes) {
      const time = paramNamed(recipe, 'GLIDE · TIME')
      if (time?.kind !== 'numeric') throw new Error(`${recipe.id}: no GLIDE TIME`)
      expect([time.range.min, time.range.max]).toEqual([0, 10])
      expect(time.unit, recipe.id).toBeUndefined()
      expect(time.range.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.21` })
    }
    // And the glide TYPE always travels with it: the knob means a rate under LCR and a time
    // under LCT, which is one number behind three different things (p.21).
    for (const recipe of device.recipes) {
      const type = paramNamed(recipe, 'GLIDE · TYPE')
      if (type?.kind !== 'enum') throw new Error(`${recipe.id}: no GLIDE TYPE`)
      expect(type.options.values).toEqual(['LCR', 'LCT', 'EXP'])
    }
  })
})

// ---------------------------------------------------------------------------
// §3.2 — cited ranges, provisional points
// ---------------------------------------------------------------------------

describe('every range is cited and every point is not (§3.2)', () => {
  it('cites each range to this manual, individually, and never the point', () => {
    const all = every()
    // Around fifty per recipe, which is what an analog synth with no init sound costs: there is
    // no patch to recall, so every control the reader has to set is a line in the guide.
    expect(all.length / device.recipes.length).toBeGreaterThan(40)
    for (const param of all) {
      // The point is taste throughout: this manual has no patch chapter, no suggested-settings
      // table and no example appendix in 61 pages.
      expect(param.verified, param.name).toBe(false)
      const claim =
        param.kind === 'numeric'
          ? param.range.verified
          : param.kind === 'enum'
            ? param.options.verified
            : undefined
      expect(claim, param.name).toMatchObject({
        kind: 'manual',
        source: expect.stringContaining(MANUAL),
      })
    }
    // Every recipe terminates the §3.1 inheritance chain rather than leaving it open.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
  })

  it('cites the [0...10] controls one by one, on their own pages', () => {
    // Eight controls share one printed scale across three pages, and a shared constant for the
    // *value* must not become a shared citation. `TEN` in the manifest is the bounds; the page
    // comes from the caller, every time.
    const wanted: Record<string, number> = {
      'MIXER · OSC 1': 27,
      'MIXER · SUB 1': 27,
      'MIXER · OSC 2': 27,
      'MIXER · NOISE': 27,
      'MIXER · FDBK / EXT IN': 27,
      RESONANCE: 28,
      MULTIDRIVE: 28,
      'FILTER EG · SUSTAIN': 31,
      'AMP EG · SUSTAIN': 32,
      'GLIDE · TIME': 21,
    }
    for (const [name, page] of Object.entries(wanted)) {
      const found = device.recipes.flatMap((r) => {
        const p = paramNamed(r, name)
        return p?.kind === 'numeric' ? [p] : []
      })
      expect(found.length, name).toBe(device.recipes.length)
      for (const param of found) {
        expect([param.range.min, param.range.max], name).toEqual([0, 10])
        expect(param.range.verified, name).toEqual({
          kind: 'manual',
          source: `${MANUAL}, p.${page}`,
        })
      }
    }
  })

  it('gives every envelope time the range the prose states, in milliseconds', () => {
    // pp.30-33, once per stage: "Its value ranges from 1 millisecond to 10 seconds". The panel
    // silkscreen reads `M-SEC .1` at the same end, a decade apart; the prose is what the range
    // cites, because it is stated in words on four pages and the tick label is one glyph.
    for (const recipe of device.recipes) {
      for (const name of [
        'FILTER EG · ATTACK',
        'FILTER EG · DECAY',
        'FILTER EG · RELEASE',
        'AMP EG · ATTACK',
        'AMP EG · DECAY',
        'AMP EG · RELEASE',
      ]) {
        const param = paramNamed(recipe, name)
        if (param?.kind !== 'numeric') throw new Error(`${recipe.id}: no ${name}`)
        expect([param.range.min, param.range.max], `${recipe.id} ${name}`).toEqual([1, 10000])
        expect(param.unit).toBe('ms')
      }
    }
  })

  it('scales the CUTOFF mood offset to the authored value, because the knob is logarithmic', () => {
    // §6.1 applies a mood offset linearly in device units, and this range is three decades
    // wide: 400 Hz would shut a bass patch sitting at 300 and be inaudible on a lead at 6k. The
    // scaling therefore lives where the value is authored, and it is an integer, so nothing
    // here can drift across platforms (§7.2).
    for (const recipe of device.recipes) {
      const cutoff = paramNamed(recipe, 'CUTOFF')
      if (cutoff?.kind !== 'numeric') throw new Error(`${recipe.id}: no CUTOFF`)
      expect([cutoff.range.min, cutoff.range.max]).toEqual([20, 20000])
      const [offset] = cutoff.mood ?? []
      expect(offset?.axis, recipe.id).toBe('darkness')
      expect(offset?.amount, recipe.id).toBe(-Math.round(cutoff.value * 0.45))
      expect(Number.isInteger(offset?.amount), recipe.id).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// §10 — the panel, and the document it had to be measured off
// ---------------------------------------------------------------------------

describe('the panel (§10)', () => {
  it('spans 680 x 375 mm, both figures off the p.61 Dimensions line', () => {
    expect(device.physical.panelSpanMm).toBe(680)
    expect(device.panel?.panelRiseMm).toBe(375)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.61` })
  })

  it('takes the metric width, because the imperial one on that line cannot be right', () => {
    // p.61 prints `6.75" H x 26.375" W x 14.75 D / 17cm H x 68cm W x 37.5cm D`. Height and depth
    // convert cleanly; width does not — 26.375" is 66.99 cm, not 68. Moog's own product listing
    // gives 26.75", which is 67.9 cm and rounds to the printed figure.
    expect(device.physical.panelSpanMm).not.toBeCloseTo(26.375 * 25.4, 0)
    expect(device.panel?.panelRiseMm).toBeCloseTo(14.75 * 25.4, 0)
    // And not the height, which is the other number on that line and is not a panel dimension.
    expect(device.panel?.panelRiseMm).not.toBe(170)
  })

  it('cites the Quickstart, because the manual has no top-down panel view', () => {
    // The manual carries a perspective illustration on p.2 and nine separate section drawings
    // at two scales, and no figure that puts them in one frame. Butting nine drawings together
    // would produce proportions that are guesswork wearing a page number.
    expect(device.panel?.verified).toEqual({
      kind: 'manual',
      source: 'Subsequent 37 Quickstart Guide, panel legend',
    })
  })

  it('draws the 40 knobs p.9 says the panel has', () => {
    // p.9: the front panel is "equipped with 40 knobs and 74 switches". A reconstruction that
    // lands on the manual's own knob count is not an eyeballed one.
    const knobs = (device.panel?.features ?? []).filter((f) => f.kind === 'knob')
    expect(knobs).toHaveLength(40)
    // CUTOFF is the one oversized knob on the panel, and losing that loses the section.
    const cutoff = knobs.find((f) => f.kind === 'knob' && f.label === 'CUTOFF')
    if (cutoff?.kind !== 'knob') throw new Error('no CUTOFF knob')
    const others = knobs.filter((f) => f.kind === 'knob' && f.label !== 'CUTOFF')
    expect(others.every((f) => f.kind === 'knob' && f.d < cutoff.d)).toBe(true)
  })

  it('keeps every drawn feature inside the published footprint', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(680)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(375)
    }
  })

  it('draws one voice field, holding one cell, in the OSCILLATORS section', () => {
    // §10's "somewhere true": DUO MODE and KB CTRL are where this instrument's two notes are
    // allocated and where the panel shows what it is doing with them.
    const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
    expect(fields).toHaveLength(1)
    const group = device.panel?.features.find(
      (f) => f.kind === 'group' && f.label === 'OSCILLATORS',
    )
    if (group?.kind !== 'group' || fields[0]?.kind !== 'voices') {
      throw new Error('no OSCILLATORS group')
    }
    expect(fields[0].x).toBeGreaterThanOrEqual(group.x)
    expect(fields[0].y).toBeGreaterThanOrEqual(group.y)
    expect(fields[0].x + fields[0].w).toBeLessThanOrEqual(group.x + group.w)
    expect(fields[0].y + fields[0].h).toBeLessThanOrEqual(group.y + group.h)
  })

  it('never lands in the Master FX list, because this box has no effects', () => {
    // `lib/core/fx.ts` reads panel labels as evidence of an effects chain and matches `DELAY` as
    // a whole word. The real panel silkscreens `DELAY  HOLD  VEL AMT  KB TRACK` across the KNOB
    // SHIFT strip — all four are envelope stages — so drawing that silkscreen put this
    // instrument under **Master FX** in every guide that contained it, claiming a delay it does
    // not have. The strip therefore keeps its button and loses its four words, and this holds
    // the repair rather than leaving it to whoever next tidies the panel.
    expect(fxSources(DEVICES).map((s) => s.deviceId)).not.toContain('moog-subsequent-37')
    const labels = (device.panel?.features ?? []).flatMap((f) =>
      f.kind === 'label' ? [f.text] : 'label' in f && f.label !== undefined ? [f.label] : [],
    )
    expect(labels.some((l) => /\bDELAY\b/i.test(l))).toBe(false)
    // Nor does any recipe parameter name one, which is the module's other evidence route.
    expect(every().some((p) => /\b(DELAY|REVERB|CHORUS|FX)\b/i.test(p.name))).toBe(false)
  })

  it('draws 37 keys, as 22 white and 15 black in the clusters a keyboard has', () => {
    // p.61: `NUMBER OF KEYS: 37`. Same layout as the minilogue xd's 37-key panel, which is what
    // two 37-key instruments should agree on.
    const keys = (device.panel?.features ?? []).filter(
      (f) => f.kind === 'grid' && f.shape === 'key',
    )
    const cells = keys.reduce((sum, f) => sum + (f.kind === 'grid' ? f.cols * f.rows : 0), 0)
    expect(cells).toBe(37)
    expect(keys).toHaveLength(7)
    const black = keys.filter((f) => f.kind === 'grid' && f.cols < 22)
    expect(black.map((f) => (f.kind === 'grid' ? f.cols : 0))).toEqual([2, 3, 2, 3, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// §3 — the shape of the library this device adds
// ---------------------------------------------------------------------------

describe('the recipe library', () => {
  it('authors 15 to 20 recipes over eight roles, weighted to the low end', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
    const byRole = new Map<string, number>()
    for (const r of device.recipes) byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1)
    expect([...byRole.keys()].sort()).toEqual([
      'acid',
      'arp',
      'bass-mid',
      'lead',
      'pad',
      'stab',
      'sub',
      'texture',
    ])
    // `bass-mid` gets all six characters: a Moog in a rack is a bass, and this is the box the
    // library did not have.
    expect(byRole.get('bass-mid')).toBe(CHARACTERS.length)
    const bassCharacters = device.recipes.filter((r) => r.role === 'bass-mid').map((r) => r.character)
    expect(new Set(bassCharacters).size).toBe(CHARACTERS.length)
  })

  it('declares exactly the roles one paraphonic voice can claim, and covers all of them', () => {
    expect(device.voices[0]?.roles).toEqual([
      'bass-mid',
      'sub',
      'acid',
      'lead',
      'stab',
      'pad',
      'texture',
      'arp',
    ])
    // Every authored recipe addresses a declared role, and every declared role has a recipe: a
    // role offered with nothing behind it is a gap the resolver would find at run time.
    const withRecipes = new Set(device.recipes.map((r) => r.role))
    expect([...withRecipes].sort()).toEqual([...(device.voices[0]?.roles ?? [])].sort())
  })

  it('answers all five mood axes', () => {
    // §6: a device declines an axis by having no param that names it. CUTOFF takes darkness;
    // RESONANCE, MULTIDRIVE and the mixer feedback channel take grit; AMP EG DECAY takes
    // density, AMP EG RELEASE takes space, and the arpeggiator swing takes swing (p.40).
    const axes = new Set(
      every().flatMap((p) => (p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [])),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })

  it('says out loud that swing only reaches the box own sequencer', () => {
    // p.40's SWING swings the onboard arpeggiator and step sequencer. A part sequenced anywhere
    // else will not hear it, and a knob that silently does nothing is worse than an axis
    // honestly declined — so the axis is declared and the condition is stated.
    for (const recipe of device.recipes) {
      const swing = paramNamed(recipe, 'SWING')
      if (swing?.kind !== 'numeric') throw new Error(`${recipe.id}: no SWING`)
      expect(swing.note).toContain('nothing played from elsewhere')
      expect(swing.range.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.40` })
    }
  })

  it('uses only the two switch-gated states it can cite, on every recipe', () => {
    // The audit, as one assertion over the three controls on this panel whose printed scale
    // another control replaces. Each is present with the bounds its own switch position names —
    // a value read off the wrong one of two scales is invented, however carefully the range
    // beside it is cited.
    for (const recipe of device.recipes) {
      const kbCtrl = paramNamed(recipe, 'OSC · KB CTRL')
      const frequency = paramNamed(recipe, 'OSC 2 · FREQUENCY')
      const hiRange = paramNamed(recipe, 'MOD 1 · HI RANGE')
      const sync = paramNamed(recipe, 'MOD 1 · SYNC')
      const rate = paramNamed(recipe, 'MOD 1 · LFO RATE')
      const shift = paramNamed(recipe, 'ENV · KNOB SHIFT')
      if (kbCtrl?.kind !== 'enum' || hiRange?.kind !== 'enum' || sync?.kind !== 'enum') {
        throw new Error(`${recipe.id}: missing a gating switch`)
      }
      if (frequency?.kind !== 'numeric') throw new Error(`${recipe.id}: no FREQUENCY`)
      if (shift?.kind !== 'enum') throw new Error(`${recipe.id}: no KNOB SHIFT`)
      // FREQUENCY: +/- 7 semitones under HI and LO, +/- 3 octaves under OFF (p.26).
      expect([frequency.range.min, frequency.range.max], recipe.id).toEqual(
        kbCtrl.value === 'OFF' ? [-36, 36] : [-7, 7],
      )
      // LFO RATE: a hertz value exists only where SYNC is off (p.23).
      expect(rate === undefined, recipe.id).toBe(sync.value === 'ON')
      // KNOB SHIFT: the envelope knobs are the envelope knobs (p.30).
      expect(shift.value, recipe.id).toBe('OFF')
    }
  })
})
