import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fxSources } from '../lib/core/fx'
import type { Device } from '../lib/core/index'
import {
  ARPEGGIATOR_FACT,
  CHARACTERS,
  DeviceSchema,
  FACTORY_PATCHES_FACT,
  KEYBOARD_REACH_FACT,
  KEYBOARD_SHIFT_FACT,
  keyboardPlacement,
  keyboardReachRange,
  keyboardWindow,
  NEUTRAL_MOOD,
  assignableKey,
  expand,
  groupedParams,
  hasArpeggiator,
  paramLabel,
  realisationOf,
  renderGuide,
  requiredVoicePolyphony,
  resolve,
  resolveHook,
  resolveRiff,
  riffConstraintViolations,
  type Assignable,
  type AuthoredParam,
  type HookNote,
  type Recipe,
  type Riff,
  type RoleRequest,
} from '../lib/core/index'
import { resolveRecipe } from '../lib/core/resolver'
import { device } from '../lib/devices/moog-subsequent-37/index'
import { SUBSEQUENT_37_PANEL } from '../lib/devices/moog-subsequent-37/panel'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs/index'
import { presetSession } from '../lib/studio/preset-session'
import { presetLead } from '../lib/studio/preset-text'
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
 * This is the number read off the panel, deliberately not off `patchPolyphony`. `Assignable.polyphony`
 * is 2 and stays 2, because that is a fact about the box; what a recipe does with the two is a
 * fact about the recipe, and `Recipe.patchPolyphony` (§12.4/#85) is where it tells the engine.
 * Two ways of knowing, and the test below holds them to the same answer on every recipe.
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

  it('is a mono-output synth that takes audio in, which most of the library is not', () => {
    // p.61: `AUDIO OUTPUT: 1xTS, 1xTRS Headphone`, and p.34 says the headphone jack is the same
    // monaural signal on both sides.
    expect(device.io).toEqual({ main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false })
    const synths = DEVICES.filter((d) => d.kind === 'synth')
    expect(synths.map((d) => d.id)).toContain('moog-subsequent-37')
    // **It was "the library's first", and a second one landed.** The Minitaur is mono out and
    // takes audio in for the same reason — a small analog Moog with one voice. The claim worth
    // keeping is that mono is the exception among synths, not that this box is alone in it, so
    // the assertion is the membership and the minority rather than a list of one.
    const mono = synths.filter((d) => d.io.main === 'mono').map((d) => d.id)
    expect(mono).toContain('moog-subsequent-37')
    expect(mono).toContain('moog-minitaur')
    expect(mono.length).toBeLessThan(synths.length)
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
    // The arpeggiator's RATE knob is the fourth control on this panel whose scale a SYNC switch
    // replaces (p.15), and the recipes that reach for it (#647) reach for the division and never
    // the BPM figure, exactly as `MOD 1 · LFO RATE` is handled.
    const names = new Set(every().map((p) => p.name))
    expect(names.has('ARPEGGIATOR · RATE')).toBe(false)
    expect(names.has('ARPEGGIATOR · RATE (division)')).toBe(true)
  })

  it('declares its arpeggiator as a capability fact, cited where the preset holds it (§2.6/#645)', () => {
    // p.40 files the arpeggiator under `ARPEGGIATOR (PRESET EDIT 1.1)`, which is what makes a
    // preset able to *be* an arp patch; the same page has it sounding C-E-G one note at a time.
    // A held chord under it costs one voice, which is how a two-note box holds four
    // (`test/arpeggiated-hold.test.ts`).
    expect(hasArpeggiator(device)).toBe(true)
    expect(device.capabilityEvidence?.[ARPEGGIATOR_FACT]).toEqual({ kind: 'manual', source: `${MANUAL}, p.40` })
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

  it('is one of the two-note voices, and the only one that narrows into it', () => {
    // Every other polyphony in the registry is 1, 4 or 8. This is the middle value that tests
    // whether the field means notes-within-a-role rather than roles-at-once.
    //
    // **The NEUTRON is the second, and it arrives at 2 from the other direction.** This box gets
    // there by *narrowing* — DUO mode splitting a polyphonic keyboard down to a pair — where the
    // Behringer gets there by having exactly two oscillators and a PARAPHONIC switch that lets
    // them take a note each (p.14). Two routes to the same number, and the field means the same
    // thing on both: notes inside one part, never two parts.
    //
    // **The Digitone's four are a third route, and they are not a claim about a part at all.**
    // That box has eight voices shared across four tracks (p.37), and `polyphony` is per
    // assignable with no way to say "these four draw on one budget", so its manifest divides
    // eight by four and declares the quotient. The number is arithmetic on a pool rather than a
    // reading of what one voice does, which is why this assertion still names the two boxes that
    // reached 2 by reading one.
    const twos = DEVICES.flatMap((d) => expand(d)).filter((a) => a.polyphony === 2)
    expect([...new Set(twos.map((a) => a.deviceId))]).toEqual([
      'behringer-neutron',
      'elektron-digitone',
      'moog-subsequent-37',
    ])
    expect(twos.filter((a) => a.deviceId === 'elektron-digitone')).toHaveLength(4)
  })

  it('carries a two-note part inside that one assignable', () => {
    const result = rig([ask({ id: 'r-stab', role: 'stab', character: 'hard', polyphony: 2 })])
    expect(result.shortfalls).toEqual([])
    const [stab] = result.assignments
    expect(stab?.notes).toBe(2)
    // One assignable, and #40 makes that worth asserting rather than assuming: a two-note part
    // on a two-note voice must not be spread across two voices when one will hold it.
    expect(stab?.assignables).toHaveLength(1)
    expect(stab?.assignables[0]?.polyphony).toBe(2)
    expect(expand(device)).toHaveLength(1)
  })

  it('calls a three-note stab a `polyphony` gap, not a missing role', () => {
    const result = rig([ask({ id: 'r-stab', role: 'stab', character: 'hard', polyphony: 3 })])
    expect(result.assignments).toEqual([])
    const [gap] = result.shortfalls
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
      expect(result.shortfalls, `pad at ${notes}`).toEqual([])
      expect(result.assignments[0]?.notes, `pad at ${notes}`).toBe(notes)
    }
    for (const notes of [3, 4]) {
      const result = rig([ask({ id: 'r-pad', role: 'pad', polyphony: notes })])
      expect(result.assignments, `pad at ${notes}`).toEqual([])
      const [gap] = result.shortfalls
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
    expect(result.shortfalls).toEqual([])
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
    const gap = result.shortfalls.find((g) => g.requestId === 'r-texture')
    expect(gap?.reason).toBe('no-room')
  })

  it('still reports a genuinely absent role as absent', () => {
    // The other half, so the change above did not simply delete the distinction: a role this
    // voice does not declare is `no-such-role`, and that failure is structural rather than about
    // size or about authoring. One filter and one amp envelope cannot give a kick a noise
    // transient over an independent pitched body, and no note count would fix it.
    for (const role of ['kick', 'closed-hat', 'snare'] as const) {
      const result = rig([ask({ id: 'r', role, polyphony: 1 })])
      const [gap] = result.shortfalls
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
      result.shortfalls.map((g) => [g.requestId, g.reason === 'no-capable-voice' ? g.because : g.reason]),
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
    expect(result.shortfalls.map((g) => g.requestId)).toEqual(['r-acid', 'r-lead'])
    for (const gap of result.shortfalls) {
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
        for (const voice of a.assignables) {
          const key = `${assignableKey(voice as Assignable)} ${section}`
          expect(held.get(key), `${key} taken twice`).toBeUndefined()
          held.set(key, a.requestId)
        }
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

  it('spends the second note on every stab and pad and on one lead, and says so at the machine', () => {
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
      // Every character authored mono already, and a duo bass would displace one of them.
      'bass-mid': [1],
      // One-note parts by nature; a duo version would be a worse recipe, not a missing one.
      sub: [1],
      acid: [1],
      // Three one-note recipes and a two-note one: a mono patch refuses a part it cannot play,
      // and a duo patch is there when the part wants two (#632).
      lead: [1, 2],
      // The two characters a direction asks an arp for are the two authored mono here; a duo
      // arp in any other would be dark on arrival (`test/reachability.test.ts`).
      arp: [1],
      // The two roles the shipped templates ask for more than one note of: two on every recipe.
      stab: [2],
      pad: [2],
      // One note played, plus a drone that never touches the keyboard.
      texture: [1],
    })
    // And the cost of each is stated where the reader sees it, beside what `patchPolyphony` tells
    // the engine, because the reader is at the machine and not in the resolver.
    for (const recipe of device.recipes) {
      const duoMode = paramNamed(recipe, 'OSC · DUO MODE')
      if (duoMode?.kind !== 'enum') throw new Error(`${recipe.id}: no DUO MODE`)
      expect(duoMode.note, recipe.id).toBeDefined()
      if (notesAvailable(recipe) === 2) expect(duoMode.note).toContain('two notes')
      else expect(duoMode.note).toContain('one note')
    }
  })

  it('declares patchPolyphony 1 exactly where the switches leave one note (§12.4/#85)', () => {
    // `notesAvailable` reads DUO MODE and KB CTRL, which is what a reader sets; `patchPolyphony`
    // is what the resolver reads. Held to each other on every recipe, off the switches rather
    // than a list of ids, so a new recipe joins the rule instead of slipping past it. Omitted
    // means the patch spends nothing the box does not have, so a two-note recipe declares
    // nothing rather than restating the assignable's 2.
    for (const recipe of device.recipes) {
      if (notesAvailable(recipe) === 2) {
        expect(recipe.patchPolyphony, `${recipe.id} plays two notes`).toBeUndefined()
      } else {
        expect(recipe.patchPolyphony, `${recipe.id} plays one note`).toBe(1)
      }
    }
    // Not vacuous on either side: the library carries both kinds.
    expect(device.recipes.some((r) => r.patchPolyphony === 1)).toBe(true)
    expect(device.recipes.some((r) => r.patchPolyphony === undefined)).toBe(true)
  })

  it('never hands a two-note request to a one-note recipe, and gives it to every two-note one (#632)', () => {
    // The declaration above is what the resolver reads; this is the resolver reading it. Each
    // recipe is asked for its own role and character at two notes. Where the switches leave two,
    // the recipe wins its own part exactly, which is what keeps the DUO figures resolving
    // (#624). Where they leave one, the recipe is never the answer: either the role has a
    // two-note recipe and the request substitutes to it, which is what a paraphonic box should
    // do, or it has none and the answer is `unvoiced` rather than a patch with OSC 2 on the same
    // key or parked off the keyboard. Which of the two is a fact about the role's recipes, not
    // asserted here per id; what is asserted is that the recipe reached, if any, plays two.
    const voice = expand(device)[0]
    if (voice === undefined) throw new Error('no assignable')
    let refused = 0
    let redirected = 0
    for (const recipe of device.recipes) {
      const result = resolveRecipe(device, voice, recipe.role, recipe.character, 2)
      if (notesAvailable(recipe) === 2) {
        expect(result.outcome, recipe.id).toBe('exact')
        expect(result.outcome !== 'unvoiced' && result.recipe.id, recipe.id).toBe(recipe.id)
      } else if (result.outcome === 'unvoiced') {
        refused += 1
      } else {
        expect(result.outcome, recipe.id).toBe('substituted')
        expect(result.recipe.id, recipe.id).not.toBe(recipe.id)
        expect(notesAvailable(result.recipe), `${recipe.id} sent to ${result.recipe.id}`).toBe(2)
        redirected += 1
      }
    }
    // Not vacuous on either branch: some roles refuse, some redirect.
    expect(refused).toBeGreaterThan(0)
    expect(redirected).toBeGreaterThan(0)
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
    const withGlide = device.recipes.filter((r) => paramNamed(r, 'GLIDE · TIME') !== undefined)
    expect(withGlide.length, 'no recipe turns glide on').toBeGreaterThan(0)
    for (const recipe of withGlide) {
      const time = paramNamed(recipe, 'GLIDE · TIME')
      if (time?.kind !== 'numeric') throw new Error(`${recipe.id}: no GLIDE TIME`)
      expect([time.range.min, time.range.max]).toEqual([0, 10])
      expect(time.unit, recipe.id).toBeUndefined()
      expect(time.range.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.21` })
    }
    // And the glide TYPE always travels with it: the knob means a rate under LCR and a time
    // under LCT, which is one number behind three different things (p.21).
    for (const recipe of withGlide) {
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
      /**
       * Every recipe, except the one control that is not on every recipe: since #319 the glide
       * section collapses to its switch when the switch is off, so `GLIDE · TIME` appears only
       * where glide is on. The claim being made here is about *citation*, not about presence —
       * so it asserts the count it should have and the test below owns the collapse.
       */
      const expected =
        name === 'GLIDE · TIME'
          ? device.recipes.filter((r) => paramNamed(r, 'GLIDE · TIME') !== undefined).length
          : device.recipes.length
      expect(expected, `${name}: nothing carries it`).toBeGreaterThan(0)
      expect(found.length, name).toBe(expected)
      for (const param of found) {
        expect([param.range.min, param.range.max], name).toEqual([0, 10])
        expect(param.range.verified, name).toEqual({
          kind: 'manual',
          source: `${MANUAL}, p.${page}`,
        })
      }
    }
  })

  /**
   * §3.2/#323. **The panel's floor, not the prose's**, and this test used to assert the reverse.
   *
   * pp.30-33 say "Its value ranges from 1 millisecond to 10 seconds", once per stage. The
   * instrument says otherwise: ATTACK and DECAY both carry a full logarithmic legend reading
   * `M-SEC .1` at the floor, ticks at `1` and `10`, and `10 SEC` at the ceiling — a unit and both
   * endpoints, not the "one glyph" this comment previously called it. A photograph settled it.
   *
   * Where Moog's prose and Moog's own silkscreen disagree, the range a reader is shown should be
   * the one printed beside the knob they are turning. Every authored value is at or above 1 ms,
   * so nothing became legal that was not legal before.
   */
  it('gives every envelope time the range the panel prints, in milliseconds', () => {
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
        expect([param.range.min, param.range.max], `${recipe.id} ${name}`).toEqual([0.1, 10000])
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
    // `lib/core/fx.ts` reads panel labels as evidence of an effects chain. The real panel
    // silkscreens `DELAY  HOLD  VEL AMT  KB TRACK` across the KNOB SHIFT strip — all four are
    // envelope stages — and while the matcher accepted any effect token anywhere in a label,
    // drawing that silkscreen put this instrument under **Master FX** in every guide containing
    // it, claiming a delay it does not have.
    //
    // This asserted the workaround for a while: that no label anywhere on the panel contains the
    // word. That held the drawing hostage to an engine limitation, and the matcher now requires
    // every word in a label to be an effect token or a qualifier. So the strip is drawn, whole,
    // and the assertion is the thing that actually matters.
    // No assignments: this asks what the boxes declare about themselves with no guide in hand.
    // Routes 1 and 2 answer as they always do, and the parameter route (#106, per-guide since)
    // answers `unused` for every box that authors an effect parameter — which is why the
    // assertion below matters as much as this one. Nothing on this device names an effect in a
    // recipe either, so there is no capability for `unused` to speak for, and the box is absent
    // from the list on both counts rather than on a technicality of how it was called.
    expect(fxSources(DEVICES, []).map((s) => s.deviceId)).not.toContain('moog-subsequent-37')
    const strip = (device.panel?.features ?? []).filter(
      (f) => f.kind === 'label' && f.text.includes('DELAY'),
    )
    expect(strip).toHaveLength(1)
    expect(strip[0]?.kind === 'label' ? strip[0].text : '').toBe('DELAY  HOLD  VEL AMT  KB TRACK')
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
  it('authors at least fifteen recipes over eight roles, weighted to the low end', () => {
    // A floor and no ceiling. Fifteen to twenty is what covers a device well, not a quota, and
    // a ceiling here made the twenty-first recipe (#632's two-note lead) a test edit rather
    // than a recipe. What is worth pinning is coverage: every role, and all six bass characters.
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
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

describe('the KNOB SHIFT strip, split, would read as an effect', () => {
  it('would be read as an effect if the row were split', () => {
    const split: Device = {
      ...device,
      panel: {
        ...(device.panel as NonNullable<Device['panel']>),
        features: [
          ...(device.panel?.features ?? []).filter(
            (f) => !(f.kind === 'label' && f.text.includes('DELAY')),
          ),
          { kind: 'label', x: 522, y: 66, text: 'DELAY', align: 'start' },
        ],
      },
    }
    expect(fxSources([split], [])).not.toEqual([])
  })
})

/**
 * §3/#319. **A switched-off section is one line, not six.**
 *
 * `GLIDE · ON` gates the whole glide section: with it dark, `TYPE`, `OSC`, `TIME`, `GATED` and
 * `LEGATO` do nothing. Fourteen of this box's recipes printed all six anyway, so a reader got a
 * screen of glide settings under a switch saying the glide is off — five values they could set
 * carefully and hear no difference from. Worse than silence, because it reads as instruction.
 */
describe('the glide section collapses when it is off (#319)', () => {
  const GATED = ['GLIDE · TYPE', 'GLIDE · OSC', 'GLIDE · TIME', 'GLIDE · GATED', 'GLIDE · LEGATO']

  it('prints only the switch on a recipe whose glide is off', () => {
    const off = device.recipes.filter((r) => {
      const on = paramNamed(r, 'GLIDE · ON')
      return on?.kind === 'enum' && on.value === 'OFF'
    })
    expect(off.length, 'no recipe has glide off').toBeGreaterThan(0)
    for (const recipe of off) {
      for (const name of GATED) {
        expect(paramNamed(recipe, name), `${recipe.id} still prints ${name}`).toBeUndefined()
      }
    }
  })

  it('still prints all six where the glide is on, because there they do something', () => {
    const on = device.recipes.filter((r) => {
      const sw = paramNamed(r, 'GLIDE · ON')
      return sw?.kind === 'enum' && sw.value === 'ON'
    })
    expect(on.length, 'no recipe has glide on').toBeGreaterThan(0)
    for (const recipe of on) {
      for (const name of GATED) {
        expect(paramNamed(recipe, name), `${recipe.id} is missing ${name}`).toBeDefined()
      }
    }
  })

  it('never leaves a gated control without its switch', () => {
    // The failure this forbids is the mirror of the one it fixes: a TIME with no ON beside it is
    // a value a reader cannot act on for the opposite reason.
    for (const recipe of device.recipes) {
      const gated = GATED.some((name) => paramNamed(recipe, name) !== undefined)
      if (gated) expect(paramNamed(recipe, 'GLIDE · ON'), recipe.id).toBeDefined()
    }
  })
})

/**
 * §3.1/#385. **Seven boxes, and the panel is what decides them.**
 *
 * This is the second device in the library to author `module`, and it is here rather than
 * somewhere else because its panel and its parameter names disagree. Twelve name prefixes sit
 * under seven silkscreened sections: `OSC`, `OSC 1` and `OSC 2` are all one **OSCILLATORS**
 * section; `ENV`, `FILTER EG` and `AMP EG` are all one **ENVELOPE GENERATORS**; and `CUTOFF`,
 * `RESONANCE` and `MULTIDRIVE` carry no prefix at all while sitting inside **FILTER**.
 *
 * So a module derived from a name would have drawn twelve boxes, three of them empty of the
 * three controls a filter box most needs. What is asserted below is the mapping itself, pinned
 * by name, because it is a reading of the instrument and a later edit that moves one has to say
 * so.
 */
describe('every control is boxed by the panel section it sits on (#385)', () => {
  /** The reading. Left is the name (or its ` · ` prefix); right is the silkscreen above it. */
  const SECTIONS: Record<string, string> = {
    'ARPEGGIATOR': 'ARPEGGIATOR',
    'GLIDE': 'GLIDE',
    'MOD 1': 'MOD 1',
    'OSC': 'OSCILLATORS',
    'OSC 1': 'OSCILLATORS',
    'OSC 2': 'OSCILLATORS',
    'MIXER': 'MIXER',
    'FILTER': 'FILTER',
    'CUTOFF': 'FILTER',
    'RESONANCE': 'FILTER',
    'MULTIDRIVE': 'FILTER',
    'ENV': 'ENVELOPE GENERATORS',
    'FILTER EG': 'ENVELOPE GENERATORS',
    'AMP EG': 'ENVELOPE GENERATORS',
  }

  /** Every authored parameter of every recipe, once per distinct name. */
  const byName = new Map<string, Set<string>>()
  for (const recipe of device.recipes) {
    for (const param of recipe.params) {
      const module = (param as { module?: string }).module ?? '(none)'
      const found = byName.get(param.name)
      if (found === undefined) byName.set(param.name, new Set([module]))
      else found.add(module)
    }
  }

  it('leaves no parameter of any recipe unboxed, except the one that is not on the panel', () => {
    // Whole-device rather than spot-checked: a block helper added later with no `inModule` around
    // it is exactly the miss this catches, and it would otherwise surface as one unboxed run in
    // one guide that nobody happens to render.
    const unboxed = [...byName].filter(([, mods]) => mods.has('(none)')).map(([name]) => name)
    expect(unboxed).toEqual(['SWING'])
  })

  it('leaves SWING unboxed because it is a menu setting, not a panel section', () => {
    // p.40 puts it in `PRESET EDIT > ARPEGGIATOR`, behind the display. §3.1 says an unmoduled
    // param is not a gap; a box named after a silkscreen section it is not printed in would be
    // a fact about the instrument invented to fill a field.
    expect([...(byName.get('SWING') ?? [])]).toEqual(['(none)'])
  })

  it('draws exactly the seven sections the panel names, and no twelfth prefix box', () => {
    const modules = new Set<string>()
    for (const mods of byName.values()) for (const m of mods) if (m !== '(none)') modules.add(m)
    expect([...modules].sort()).toEqual([
      'ARPEGGIATOR',
      'ENVELOPE GENERATORS',
      'FILTER',
      'GLIDE',
      'MIXER',
      'MOD 1',
      'OSCILLATORS',
    ])
    // The four the panel draws as labelled groups are drawn from the same reading `panel.ts` is.
    const labels = SUBSEQUENT_37_PANEL.features.flatMap((f) =>
      f.kind === 'group' && f.label !== undefined ? [f.label] : [],
    )
    for (const named of ['MOD 1', 'OSCILLATORS', 'MIXER', 'FILTER', 'ENVELOPE GENERATORS']) {
      expect(labels, named).toContain(named)
    }
  })

  it('puts every name under the section the reading gives it', () => {
    for (const [name, mods] of byName) {
      if (name === 'SWING') continue
      const prefix = name.includes(' \u00b7 ') ? name.slice(0, name.indexOf(' \u00b7 ')) : name
      const expected = SECTIONS[prefix]
      expect(expected, `${name} is under no section in the table`).toBeDefined()
      expect([...mods], name).toEqual([expected])
    }
  })

  it('boxes the three bare filter controls, which a name parse would have left loose', () => {
    for (const name of ['CUTOFF', 'RESONANCE', 'MULTIDRIVE']) {
      expect([...(byName.get(name) ?? [])], name).toEqual(['FILTER'])
    }
  })

  it('keeps every parameter name exactly as it was authored', () => {
    // `name` is #107's hoist key, `sameRenderedParam`'s comparison and the string every fixture
    // and test above names, so nothing keyed on one moves. The prefix stays on the stored name
    // and `paramLabel` decides the ink.
    expect(byName.has('MIXER \u00b7 SUB 1')).toBe(true)
    expect(byName.has('OSC 1 \u00b7 OCTAVE')).toBe(true)
    expect(byName.has('OSC 2 \u00b7 OCTAVE')).toBe(true)
    expect(byName.has('FILTER EG \u00b7 ATTACK')).toBe(true)
    expect(byName.has('AMP EG \u00b7 ATTACK')).toBe(true)
    expect(byName.has('CUTOFF')).toBe(true)
  })

  it('trims a label only where the box already says it', () => {
    // Inside MIXER the prefix is dead ink. Inside OSCILLATORS it is the only thing telling two
    // oscillators apart, and `paramLabel` leaves it exactly because it is not the module.
    const label = (name: string, module: string) =>
      paramLabel({
        name,
        value: 1,
        provenance: { state: 'authored', cite: { kind: 'manual', source: 'x' } },
        module,
      })
    expect(label('MIXER \u00b7 SUB 1', 'MIXER')).toBe('SUB 1')
    expect(label('OSC 1 \u00b7 OCTAVE', 'OSCILLATORS')).toBe('OSC 1 \u00b7 OCTAVE')
    expect(label('OSC 2 \u00b7 OCTAVE', 'OSCILLATORS')).toBe('OSC 2 \u00b7 OCTAVE')
    expect(label('FILTER EG \u00b7 ATTACK', 'ENVELOPE GENERATORS')).toBe('FILTER EG \u00b7 ATTACK')
    expect(label('CUTOFF', 'FILTER')).toBe('CUTOFF')
  })
})

/**
 * §8/#385. **The boxes a reader actually gets**, which is a claim about authored *order* and not
 * only about the stamps.
 *
 * `groupedParams` cuts on adjacent runs, so a section interrupted and resumed comes out as two
 * boxes carrying the same label — and that is an authoring-order defect the device folder owns.
 * Every recipe here runs `program`, `glide`, the three oscillator blocks, `mix`, `filt`, the two
 * envelopes and the modulation bus, in that sequence, so each part renders seven runs and each
 * section appears once. The two `arp` recipes run `arp` between `program` and `glide` (#647),
 * which is the panel's order too, and render eight; that box is asserted with the arpeggiated
 * hold that lands on it, below.
 */
describe('a real Subsequent 37 guide renders one box per section (#385)', () => {
  const result = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-subsequent-37'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

  it('resolves a part on it at all, so the assertions below are not vacuous', () => {
    expect(result.assignments.length).toBeGreaterThan(0)
    expect(result.assignments.every((a) => a.deviceId === 'moog-subsequent-37')).toBe(true)
  })

  it('cuts each part into the unmoduled swing line and the six sections, in panel order', () => {
    for (const assignment of result.assignments) {
      const groups = groupedParams(assignment.params)
      expect(groups.map((g) => g.module), assignment.role).toEqual([
        undefined,
        'GLIDE',
        'OSCILLATORS',
        'MIXER',
        'FILTER',
        'ENVELOPE GENERATORS',
        'MOD 1',
      ])
      // Runs, not buckets: concatenating them reproduces the order the guide renders.
      expect(groups.flatMap((g) => [...g.params])).toEqual([...assignment.params])
    }
  })

  it('draws the boxes in the guide, one lamp each', () => {
    const md = renderGuide(result)
    for (const module of ['GLIDE', 'OSCILLATORS', 'MIXER', 'FILTER', 'ENVELOPE GENERATORS', 'MOD 1']) {
      expect(md, module).toContain(`- **\u25cf ${module}**`)
    }
  })

  it('prints no parameter line still carrying its own box label', () => {
    // The ink #385 exists to remove: nine `MIXER \u00b7 \u2026` rows under a heading reading MIXER.
    const bullets = renderGuide(result)
      .split('\n')
      .filter((line) => /^\s*- \*\*(?!\u25cf)/.test(line))
    expect(bullets.length).toBeGreaterThan(20)
    for (const module of ['GLIDE', 'MIXER', 'FILTER', 'MOD 1']) {
      expect(
        bullets.filter((line) => line.includes(`**${module} \u00b7 `)),
        module,
      ).toEqual([])
    }
    // And the two oscillators keep theirs, because OSCILLATORS is not the prefix.
    expect(bullets.some((line) => line.includes('**OSC 1 \u00b7 OCTAVE**'))).toBe(true)
    expect(bullets.some((line) => line.includes('**OSC 2 \u00b7 OCTAVE**'))).toBe(true)
  })
})

/**
 * #647. **The two `arp` recipes state the arpeggiator, and no other recipe does.** `Harp C
 * Chord` (#645) lands on `sub37-arp-bright` and its technique tells a reader to switch the
 * arpeggiator on and set the pattern to the order the keys went down; before #647 the recipe
 * stated neither. Now the section is eight cited switches, and the pattern is the one the hold
 * needs.
 *
 * `RATE` is a division and not a BPM, for the reason `MOD 1 · LFO RATE` is: with SYNC lit the
 * knob has left its BPM scale (p.15), and the tempo is the direction's anyway. `1/16` on both,
 * because at the knob's `SEQ` position the same division is the step length of the onboard
 * sequencer (p.17, p.40) and the grid the guide prints is sixteenths.
 */
describe('the arp recipes state the arpeggiator section, and nothing else does (#647)', () => {
  const ARP_NAMES = [
    'ARPEGGIATOR \u00b7 ON',
    'ARPEGGIATOR \u00b7 SYNC',
    'ARPEGGIATOR \u00b7 RATE (division)',
    'ARPEGGIATOR \u00b7 RANGE',
    'ARPEGGIATOR \u00b7 BACK / FORTH',
    'ARPEGGIATOR \u00b7 INVERT',
    'ARPEGGIATOR \u00b7 PATTERN',
    'ARPEGGIATOR \u00b7 LATCH',
  ]
  const arpRecipes = device.recipes.filter((r) => r.role === 'arp')
  const others = device.recipes.filter((r) => r.role !== 'arp')

  it('carries the whole section on both arp recipes, in panel order, and on no other recipe', () => {
    expect(arpRecipes.map((r) => r.id).sort()).toEqual(['sub37-arp-bright', 'sub37-arp-clean'])
    for (const recipe of arpRecipes) {
      const names = params(recipe)
        .filter((p) => p.module === 'ARPEGGIATOR')
        .map((p) => p.name)
      expect(names, recipe.id).toEqual(ARP_NAMES)
    }
    for (const recipe of others) {
      expect(
        params(recipe).filter((p) => p.name.startsWith('ARPEGGIATOR')),
        recipe.id,
      ).toEqual([])
    }
  })

  it('switches it on, syncs it, and names a division off p.52 rather than a BPM', () => {
    for (const recipe of arpRecipes) {
      const on = paramNamed(recipe, 'ARPEGGIATOR \u00b7 ON')
      const sync = paramNamed(recipe, 'ARPEGGIATOR \u00b7 SYNC')
      const rate = paramNamed(recipe, 'ARPEGGIATOR \u00b7 RATE (division)')
      if (on?.kind !== 'enum' || sync?.kind !== 'enum' || rate?.kind !== 'enum') {
        throw new Error(`${recipe.id}: arpeggiator switches missing`)
      }
      expect(on.value).toBe('ON')
      expect(sync.value).toBe('ON')
      expect(rate.value).toBe('1/16')
      expect(rate.options.values).toHaveLength(21)
      expect(rate.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.52` })
      expect(rate.hint).toBe('sync-divisions')
      // p.15's warning is the one thing that makes a synced arpeggiator silent, so it is on the line.
      expect(sync.note).toContain('will not play')
    }
  })

  it('cites the PATTERN knob as all six positions, sequencer included, and picks a pattern', () => {
    // p.16 prints four patterns and two sequencer positions on one knob, and p.56 counts `ARP
    // PATTERN` as six values. `SEQ` is in the set because a struck part recorded on the onboard
    // sequencer (p.17) is played back at it, and the note says so.
    const bright = paramNamed(arpRecipes.find((r) => r.id === 'sub37-arp-bright') as Recipe, 'ARPEGGIATOR \u00b7 PATTERN')
    const clean = paramNamed(arpRecipes.find((r) => r.id === 'sub37-arp-clean') as Recipe, 'ARPEGGIATOR \u00b7 PATTERN')
    if (bright?.kind !== 'enum' || clean?.kind !== 'enum') throw new Error('no PATTERN')
    expect(bright.options.values).toEqual(['UP', 'DWN', 'ORDR', 'RND', 'SEQ', 'REC'])
    expect(bright.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.16` })
    expect(bright.value).toBe('ORDR')
    expect(clean.value).toBe('UP')
    expect(bright.note).toContain('SEQ')
  })

  it('cites RANGE as all seven states p.15 describes, the two unlabelled ones named after their LEDs', () => {
    // Five LEDs, and pressing past either end lights `0` with `-2` or `+2` for a three-octave
    // climb (p.15). p.56 counts `ARP RANGE` as seven, so five would be an incomplete legality
    // claim for a control whose seventh state a reader can land on with one press too many.
    // The set is in the order the buttons walk it: the combined states sit past each end.
    for (const recipe of arpRecipes) {
      const range = paramNamed(recipe, 'ARPEGGIATOR \u00b7 RANGE')
      if (range?.kind !== 'enum') throw new Error(`${recipe.id}: no RANGE`)
      expect(range.options.values).toEqual(['0 & -2', '-2', '-1', '0', '+1', '+2', '0 & +2'])
      expect(range.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.15` })
    }
  })

  it('leaves range, direction, inversion and latch where a held chord is the tune it was pressed as', () => {
    for (const recipe of arpRecipes) {
      const value = (name: string) => {
        const p = paramNamed(recipe, `ARPEGGIATOR \u00b7 ${name}`)
        if (p?.kind !== 'enum') throw new Error(`${recipe.id}: no ${name}`)
        return p.value
      }
      expect(value('RANGE')).toBe('0')
      expect(value('BACK / FORTH')).toBe('OFF')
      expect(value('INVERT')).toBe('OFF')
      expect(value('LATCH')).toBe('OFF')
    }
  })

  it('renders the Harp C Chord hold with the section as one box, pattern ORDR, on the bright arp', () => {
    const harp = RIFFS.find((r) => r.id === 'harp-c-chord-arpeggiated-hold') as Riff
    const result = resolveRiff(harp, [device])
    expect(result.outcome).toBe('played')
    if (result.outcome !== 'played') return
    expect(result.voice.recipe.id).toBe('sub37-arp-bright')
    const groups = groupedParams(result.voice.params)
    expect(groups.map((g) => g.module)).toEqual([
      undefined,
      'ARPEGGIATOR',
      'GLIDE',
      'OSCILLATORS',
      'MIXER',
      'FILTER',
      'ENVELOPE GENERATORS',
      'MOD 1',
    ])
    const pattern = result.voice.params.find((p) => p.name === 'ARPEGGIATOR \u00b7 PATTERN')
    expect(pattern?.value).toBe('ORDR')
    expect(pattern?.provenance).toEqual({ state: 'provisional' })
  })
})


// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * p.30: *"The sustain level is held until the key is released"*; p.32, AMPLIFIER ENVELOPE SUSTAIN:
 * *"The sustain stage is held until the envelope receives a Note Off command or the gate ends"*.
 * Both rendered and read. Every held recipe sets `AMP EG · SUSTAIN` between 3.5 and 9 on the
 * printed 1-10 scale with `LOOP` off.
 */
describe('sustain claims (§3/#506)', () => {
  const heldRoles = (() => {
    const longest = new Map<string, number>()
    for (const t of TEMPLATES) {
      for (const hook of t.hooks) {
        for (const note of hook.notes) {
          if (note.len > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, note.len)
        }
      }
    }
    return new Set([...longest].filter(([, len]) => len >= 16).map(([role]) => role))
  })()

  it("holds on every held-role recipe, on the amplifier envelope's sustain", () => {
    const ids = ['sub37-sub-dark', 'sub37-sub-dirty', 'sub37-acid-dirty', 'sub37-acid-bright', 'sub37-acid-hard', 'sub37-texture-soft', 'sub37-pad-dark']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['AMP EG · SUSTAIN'] },
        evidence: { kind: 'manual', source: "Subsequent 37 User's Manual, pp.30, 32" },
      })
      for (const name of ['AMP EG · SUSTAIN']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['sub37-sub-dark', 'sub37-sub-dirty', 'sub37-acid-dirty', 'sub37-acid-bright', 'sub37-acid-hard', 'sub37-texture-soft', 'sub37-pad-dark'].sort())
    const unclaimed = device.recipes
      .filter((r) => heldRoles.has(r.role) && r.sustain === undefined)
      .map((r) => r.id)
    expect(unclaimed).toEqual([])
    for (const r of device.recipes) {
      if (!heldRoles.has(r.role)) expect(r.sustain, r.id).toBeUndefined()
    }
  })
})

/**
 * §2.6/#617, #624. **The factory presets are a fact off the unit**, read on its own screen at
 * firmware 1.2.0, and the list is exactly as wide as that reading. The manual counts 256
 * locations (p.12, p.61) and names none, so the citation is `observed` and the firmware is the
 * load-bearing half of it.
 */
describe('the factory presets, off the unit at firmware 1.2.0 (§2.6/#617, #624)', () => {
  const patches = device.factoryPatches ?? []
  const names = patches.map((p) => p.name)

  it('declares the twenty that were read, cited observed with the firmware', () => {
    expect(patches).toHaveLength(20)
    expect(device.capabilityEvidence?.[FACTORY_PATCHES_FACT]).toEqual({
      kind: 'observed',
      source: 'Subsequent 37, firmware 1.2.0',
    })
    expect([...names].sort()).toEqual(
      [
        '5TH IN LINE',
        '70s TV PI Theme',
        'Acid Wiggler',
        'BRASH B@SS',
        'CELESTIAL',
        'DRONE',
        'DUO ORG',
        'DUO WAVE MOD',
        'Duotronic Moogtrons',
        'FUNK ORGAN',
        'Harp C Chord',
        'LOW BASS',
        'Octavia',
        'SAW LEAD',
        'SAWTEETH DUO DANCER',
        'SYNTH GONG',
        'Terror Bass',
        'Triangle Lead',
        'TRIPLET 5THS',
        'UBER_SUB',
      ].sort(),
    )
  })

  it('carries a name and where it sat, and nothing else: no bank, no description', () => {
    for (const p of patches) {
      expect(Object.keys(p).sort(), p.name).toEqual(['name', 'slot'])
      expect(p.name.trim(), p.name).toBe(p.name)
      // The address is in its own field; the name never carries one under any spelling.
      expect(p.name, p.name).not.toMatch(/^\d+[.\-]\d+/)
    }
    for (const p of patches as Array<Record<string, unknown>>) {
      expect(p).not.toHaveProperty('bank')
      expect(p).not.toHaveProperty('description')
    }
  })

  /**
   * §2.6/#629. The twenty addresses, `bank.preset` in the box's own numbering, as the operator
   * navigated to each at firmware 1.2.0 and found the name there. The complete mapping, exact:
   * these were carried across from the reading and not re-derived from the decoded file, whose
   * bank numbering is not the box's.
   */
  it('carries where each of the twenty sat, in the box’s own bank.preset numbering', () => {
    const at = Object.fromEntries(patches.map((p) => [p.name, p.slot]))
    expect(at).toEqual({
      'BRASH B@SS': '1.04',
      'LOW BASS': '1.13',
      'Terror Bass': '2.08',
      UBER_SUB: '2.11',
      'FUNK ORGAN': '3.01',
      '5TH IN LINE': '3.09',
      '70s TV PI Theme': '3.10',
      'Acid Wiggler': '3.13',
      CELESTIAL: '4.11',
      DRONE: '5.09',
      'DUO ORG': '5.10',
      'DUO WAVE MOD': '5.11',
      'Duotronic Moogtrons': '5.12',
      'Harp C Chord': '6.05',
      Octavia: '7.05',
      'SAW LEAD': '8.07',
      'SAWTEETH DUO DANCER': '8.08',
      'SYNTH GONG': '9.01',
      'Triangle Lead': '9.08',
      'TRIPLET 5THS': '9.11',
    })
    // Twenty distinct addresses across nine banks, none in the three Init Preset banks.
    expect(new Set(Object.values(at)).size).toBe(20)
    const banks = new Set(Object.values(at).map((a) => Number(a?.split('.')[0])))
    expect(banks.size).toBe(9)
    for (const b of banks) expect(b).toBeLessThanOrEqual(9)
  })

  it('spells the names as the screen prints them, punctuation and case included', () => {
    const set = new Set(names)
    expect(set.has('BRASH B@SS')).toBe(true)
    expect(set.has('UBER_SUB')).toBe(true)
    expect(set.has('70s TV PI Theme')).toBe(true)
    expect(set.has('5TH IN LINE')).toBe(true)
    // Three words on the screen where a decoded bank file printed two: the screen wins.
    expect(set.has('SAWTEETH DUO DANCER')).toBe(true)
    expect(set.has('SAWTEETH DUODANCER')).toBe(false)
    // Nothing here carries the initials prefix the other bank's files all did: those were
    // not this box's presets, and none of its own reads that way.
    for (const name of names) expect(name, name).not.toMatch(/^P[Dd] /)
  })

  it('has no name read twice, so each keys once', () => {
    expect(new Set(names).size).toBe(20)
  })
})

/**
 * §2.6/#593, §3.7/#598, #624, #645. **Thirteen of the twenty carry a use and twelve a figure**,
 * and every figure sounds one or two notes, because this box plays two (p.9, `polyphony: 2`).
 * Six of the twelve never sound two notes at once; five spend the second note, and only on the
 * roles whose recipes here spend it; and one holds four keys down under the arpeggiator, which
 * sounds them one at a time (#645), so its hold is four wide and its voice cost is one. The
 * two counts are kept apart below, since the whole of #645 is that they are different claims.
 */
describe('all twenty presets carry a use, nineteen carry a figure, each sounding within two notes (#624, #643, #645, #664)', () => {
  const uses = device.patchUses ?? []
  const session = presetSession(device)
  const entries = session?.entries ?? []
  const figureOf = (name: string): Riff => {
    const riff = entries.find((e) => e.patch.name === name)?.figure?.riff
    if (riff === undefined) throw new Error(`no figure for ${name}`)
    return riff
  }
  /** The eleven with a figure, in the folder's order. */
  const figured = entries.filter((e) => e.figure !== undefined)

  /** The notes in force at one step of a hook. */
  function sounding(riff: Riff, step: number): HookNote[] {
    return riff.hook.notes.filter((n) => step >= n.step && step < n.step + n.len)
  }
  /** What sounds at the widest step of a hook. */
  function peakOf(riff: Riff): number {
    let peak = 0
    for (let step = 1; step <= riff.hook.bars * 16; step += 1) {
      peak = Math.max(peak, sounding(riff, step).length)
    }
    return peak
  }
  /** A note's height in scale steps from the hook's origin, so contour can be compared. */
  const height = (n: HookNote): number => n.degree + 7 * n.octave
  /**
   * The resolved pitches of a hook, one entry per onset step in step order, a dyad joined
   * bottom to top with `+`. What #643's tables are checked against.
   */
  function pitchesOf(riff: Riff): string[] {
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const byStep = new Map<number, { note: string; midi: number }[]>()
    for (const n of resolved.hook.notes) byStep.set(n.step, [...(byStep.get(n.step) ?? []), n])
    return [...byStep.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, notes]) => [...notes].sort((a, b) => a.midi - b.midi).map((n) => n.note).join('+'))
  }
  /** The onset steps of a hook, in order, as `bar.step` strings a table can be read against. */
  function onsetsOf(riff: Riff): string[] {
    return [...new Set(riff.hook.notes.map((n) => n.step))]
      .sort((a, b) => a - b)
      .map((step) => `${String(Math.floor((step - 1) / 16) + 1)}.${String(((step - 1) % 16) + 1)}`)
  }

  it('describes all twenty, in the editorial order, keyed to the shipped name', () => {
    expect(uses.map((u) => u.name)).toEqual([
      'LOW BASS',
      'UBER_SUB',
      'Terror Bass',
      'BRASH B@SS',
      '5TH IN LINE',
      'Acid Wiggler',
      'TRIPLET 5THS',
      'Harp C Chord',
      'SAW LEAD',
      'Triangle Lead',
      'Octavia',
      '70s TV PI Theme',
      'FUNK ORGAN',
      'DUO ORG',
      'SAWTEETH DUO DANCER',
      'Duotronic Moogtrons',
      'CELESTIAL',
      'DRONE',
      'DUO WAVE MOD',
      'SYNTH GONG',
    ])
    const shipped = new Set((device.factoryPatches ?? []).map((p) => p.name))
    for (const use of uses) {
      expect(shipped.has(use.name), use.name).toBe(true)
      expect(use.bank, use.name).toBeUndefined()
    }
  })

  it('describes every patch it declares, which is what #617 permits rather than requires', () => {
    const described = new Set(uses.map((u) => u.name))
    expect(described.size).toBe(20)
    const silent = (device.factoryPatches ?? []).filter((p) => !described.has(p.name)).map((p) => p.name)
    // #664 closed the list. A subset is what #617 allows and this box no longer exercises it;
    // the minilogue xd does, with twelve uses against two hundred names.
    expect(silent).toHaveLength(0)
    // The session carries an entry per use and none for the rest; the fact stays at twenty.
    expect(session?.named).toBe(20)
    expect(session?.reading).toBe('observed')
    expect(entries).toHaveLength(20)
  })

  it('writes every use unhedged, as what to play, and names no box, bank or slot', () => {
    for (const use of uses) {
      expect(use.use.trim().length, use.name).toBeGreaterThan(0)
      expect(use.use, use.name).not.toMatch(/\b(probably|maybe|roughly|perhaps|might|could)\b/i)
      expect(use.use, use.name).not.toMatch(/\b(sounds like|reminiscent|-ish)\b/i)
      expect(use.use, use.name).not.toMatch(/Subsequent|Moog|firmware|bank|slot|preset \d/i)
    }
  })

  it('joins nineteen uses to exactly one figure each, resolved played on this box alone, and DRONE to none (#643, #645, #664)', () => {
    // #643. `DRONE` keeps a use and loses its figure: one note held under four chords is a use
    // line, and the second use of #617's subset rule. The entry is still in the session, with
    // no `figure`, so the panel and the presets page list it without a link.
    const drone = entries.find((e) => e.patch.name === 'DRONE')
    expect(drone).toBeDefined()
    expect(drone?.figure).toBeUndefined()
    expect(drone?.use).toBe('The root held under the changes')
    expect(figured.map((e) => e.patch.name)).toEqual(uses.map((u) => u.name).filter((n) => n !== 'DRONE'))
    for (const entry of figured) {
      expect(entry.figure?.riff.reference, entry.patch.name).toEqual({ kind: 'patch', name: entry.patch.name })
      expect(entry.figure?.resolution.outcome, entry.patch.name).toBe('played')
      expect(entry.figure?.voice.device.id, entry.patch.name).toBe('moog-subsequent-37')
      expect(entry.figure?.voice.stackWidth, entry.patch.name).toBe(1)
    }
    const shipped = new Set((device.factoryPatches ?? []).map((p) => p.name))
    const naming = RIFFS.filter((r) => r.reference.kind === 'patch' && shipped.has(r.reference.name))
    expect(naming).toHaveLength(19)
    expect(new Set(naming.map((r) => r.reference.name)).size).toBe(19)
    expect(naming.some((r) => r.reference.name === 'DRONE')).toBe(false)
  })

  it('substitutes on exactly one, where the honest character is one this box does not author on the role', () => {
    // A celestial pad is soft and the box authors no soft pad, so it lands on the nearest
    // recipe (§3.5) and the page names the character it got. A triangle lead is clean, and it
    // used to be the other substitution; since #632 the box authors a clean lead, so the figure
    // gets the character it asked for.
    const substituted = entries.filter((e) => e.figure?.voice.substituted).map((e) => e.patch.name)
    expect(substituted).toEqual(['CELESTIAL'])
    expect(figureOf('CELESTIAL').request.character).toBe('soft')
    expect(figureOf('Triangle Lead').request.character).toBe('clean')
    expect(figureOf('Triangle Lead').request.character).toBe(
      entries.find((e) => e.patch.name === 'Triangle Lead')?.figure?.voice.recipe.character,
    )
  })

  it('never sounds a third note, and spends the second on exactly the five stab and pad figures (#643, #645)', () => {
    // Two counts, kept apart (#645). `peakOf` is what the hand holds: the most notes in force
    // at one step. What the box has to sound at once is the request's `polyphony`, and the two
    // agree on every figure but the arpeggiated hold, where the hand holds four and the
    // arpeggiator sounds one, so the request asks for one. `Harp C Chord` is that figure, and
    // the only one wider than two in the hand.
    const two: string[] = []
    const held: string[] = []
    for (const entry of figured) {
      const riff = figureOf(entry.patch.name)
      const peak = peakOf(riff)
      const sounds = riff.request.polyphony ?? 1
      expect(sounds, entry.patch.name).toBeLessThanOrEqual(2)
      if (riff.arpeggiatedHold) {
        held.push(entry.patch.name)
        expect(sounds, riff.id).toBe(1)
        expect(peak, riff.id).toBe(4)
        continue
      }
      expect(peak, entry.patch.name).toBeLessThanOrEqual(2)
      expect(sounds, riff.id).toBe(peak)
      if (peak === 2) two.push(entry.patch.name)
    }
    expect(two).toEqual([
      'FUNK ORGAN',
      'DUO ORG',
      'SAWTEETH DUO DANCER',
      'Duotronic Moogtrons',
      'CELESTIAL',
      'DUO WAVE MOD',
    ])
    expect(held).toEqual(['Harp C Chord'])
  })

  it('lands each two-note figure on a recipe that spends the second note, and each mono role on a mono recipe (#632, #643)', () => {
    // DUO MODE alone never means two notes on this box (p.26): the pair `DUO MODE` on with
    // `KB CTRL` at HI or LO does. Read off the resolved settings of the recipe each figure
    // reached, so the claim rests on what the page prints and not on the role alone. The
    // converse is not a rule: a one-note figure on a two-note recipe is a figure with a note
    // to spare, and Triangle Lead is that because the clean lead it asks for is the duo one
    // (#632); p.26 has one key held sounding on both oscillators, so the line plays as written.
    // Every other single line is on a `patchPolyphony: 1` recipe, which is what refuses a
    // second note (#632), and the two-note figures are all on recipes that omit it.
    const spare: string[] = []
    for (const entry of figured) {
      const params = entry.figure?.voice.params ?? []
      const duo = params.find((p) => p.name === 'OSC · DUO MODE')?.value
      const kb = params.find((p) => p.name === 'OSC · KB CTRL')?.value
      const twoNotes = duo === 'ON' && kb !== 'OFF'
      const riff = figureOf(entry.patch.name)
      // #645. The arpeggiated hold is four in the hand and one in the voice; it is the mono
      // recipe's case below, and `peakOf` would put it in the duo one.
      const peak = riff.arpeggiatedHold ? 1 : peakOf(riff)
      const recipe = entry.figure?.voice.recipe
      if (peak === 2) {
        expect(twoNotes, `${entry.patch.name} on ${recipe?.id ?? '?'}`).toBe(true)
        expect(recipe?.patchPolyphony, entry.patch.name).toBeUndefined()
      } else if (twoNotes) {
        spare.push(entry.patch.name)
        expect(recipe?.patchPolyphony, entry.patch.name).toBeUndefined()
      } else {
        expect(recipe?.patchPolyphony, entry.patch.name).toBe(1)
      }
    }
    expect(spare).toEqual(['Triangle Lead'])
    // The five two-note figures are on the two roles that spend the second note on every recipe.
    const roles = new Set(
      ['FUNK ORGAN', 'DUO ORG', 'SAWTEETH DUO DANCER', 'Duotronic Moogtrons', 'CELESTIAL', 'DUO WAVE MOD'].map(
        (n) => figureOf(n).request.role,
      ),
    )
    expect([...roles].sort()).toEqual(['pad', 'stab'])
    // And the six single lines are on the roles #632 made mono, with the arpeggiated hold on
    // the second `arp`: one voice sounding, four keys down (#645).
    const mono = figured
      .filter((e) => (figureOf(e.patch.name).request.polyphony ?? 1) === 1)
      .map((e) => figureOf(e.patch.name).request.role)
    expect(mono).toEqual([
      'sub',
      'sub',
      'bass-mid',
      'bass-mid',
      'bass-mid',
      'acid',
      'arp',
      'arp',
      'lead',
      'lead',
      'lead',
      'lead',
      'texture',
    ])
  })

  it('writes the three keepers as the three species of two-voice motion', () => {
    // Parallel: every dyad of DUO ORG is a third, both notes on one step for one length.
    const org = figureOf('DUO ORG')
    const byStep = new Map<number, HookNote[]>()
    for (const n of org.hook.notes) byStep.set(n.step, [...(byStep.get(n.step) ?? []), n])
    expect(byStep.size).toBe(12)
    for (const [step, pair] of byStep) {
      expect(pair, `DUO ORG step ${String(step)}`).toHaveLength(2)
      const [a, b] = pair as [HookNote, HookNote]
      expect(a.len).toBe(b.len)
      expect(Math.abs(height(a) - height(b)), `DUO ORG step ${String(step)}`).toBe(2)
    }
    // Contrary: in every bar of the DANCER the top voice falls a step per stab and the bottom
    // rises one, so they cross in the middle and end the bar on each other's notes.
    const dancer = figureOf('SAWTEETH DUO DANCER')
    for (let bar = 0; bar < 4; bar += 1) {
      const stabs = [1, 4, 7, 9, 12, 15].map((s) => s + bar * 16)
      const tops: number[] = []
      const bottoms: number[] = []
      for (const step of stabs) {
        const pair = dancer.hook.notes.filter((n) => n.step === step)
        expect(pair, `DANCER step ${String(step)}`).toHaveLength(2)
        const hs = pair.map(height)
        // Which voice is "top" is fixed by the first stab of the bar, so the crossing shows.
        tops.push(hs[0] as number)
        bottoms.push(hs[1] as number)
      }
      for (let i = 1; i < 6; i += 1) {
        expect((tops[i] as number) - (tops[i - 1] as number), `DANCER bar ${String(bar + 1)}`).toBe(-1)
        expect((bottoms[i] as number) - (bottoms[i - 1] as number), `DANCER bar ${String(bar + 1)}`).toBe(1)
      }
      expect(tops[0]).toBe(bottoms[5])
      expect(bottoms[0]).toBe(tops[5])
      expect((tops[0] as number) - (bottoms[0] as number)).toBe(5)
    }
    // Oblique: one note of the Moogtrons pad spans the whole hook, and every other is above it.
    const trons = figureOf('Duotronic Moogtrons')
    const pedal = trons.hook.notes.find((n) => n.step === 1 && n.len === trons.hook.bars * 16)
    expect(pedal).toBeDefined()
    const line = trons.hook.notes.filter((n) => n !== pedal)
    expect(line).toHaveLength(8)
    for (const n of line) expect(height(n), `step ${String(n.step)}`).toBeGreaterThan(height(pedal as HookNote))
    expect(line.map((n) => n.step)).toEqual([1, 17, 33, 49, 65, 81, 97, 113])
  })

  it('puts every struck figure on a grid, the arpeggiated hold on none, and the gong on the third shape (#643, #645, #664)', () => {
    // #623's three shapes, all three now on this box. A pad and an arpeggiated hold carry no
    // grid and no flag, because there is no grid question to answer. A struck figure answers it
    // `true` and carries the grid. The gong answers it `false`: it is struck, and no step of a
    // repeating pass recurs, so the hook is the whole rhythm.
    const throughComposed: string[] = []
    for (const entry of figured) {
      const riff = figureOf(entry.patch.name)
      if (riff.request.role === 'pad' || riff.arpeggiatedHold) {
        expect(riff.request.reArticulatesHook, riff.id).toBeUndefined()
        expect(riff.pattern, riff.id).toBeUndefined()
        continue
      }
      if (riff.request.reArticulatesHook === false) {
        expect(riff.pattern, riff.id).toBeUndefined()
        throughComposed.push(riff.id)
        continue
      }
      expect(riff.request.reArticulatesHook, riff.id).toBe(true)
      expect(riff.pattern, riff.id).toBeDefined()
    }
    expect(throughComposed).toEqual(['synth-gong-decay-spaced-strikes'])
    // Two figures on `arp`, and they must not converge: the ladder is struck, one note a step
    // on a grid; the hold is four keys down with no grid, and the two are on different
    // characters so they land on different recipes.
    const ladder = figureOf('TRIPLET 5THS')
    const hold = figureOf('Harp C Chord')
    expect(ladder.pattern).toBeDefined()
    expect(ladder.arpeggiatedHold).toBeUndefined()
    expect(peakOf(ladder)).toBe(1)
    expect(hold.arpeggiatedHold).toBe(true)
    expect(hold.pattern).toBeUndefined()
    expect(hold.request.character).not.toBe(ladder.request.character)
    expect(entries.find((e) => e.patch.name === 'Harp C Chord')?.figure?.voice.recipe.id).not.toBe(
      entries.find((e) => e.patch.name === 'TRIPLET 5THS')?.figure?.voice.recipe.id,
    )
  })

  /**
   * #643. **The seven replacements, held to the tables the issue wrote.** The pitches are
   * derived by `resolveHook` from the authored degrees, so a wrong `alter` or octave shows up
   * as a wrong note name here and not as a page somebody has to play. Timing is the onset
   * steps; the mono/duo split is the peak and the recipe each lands on, above.
   */
  describe('the seven #643 replacements resolve to their tables', () => {
    /** Beats 1, 2&, 3 and 4& of a bar, as onset steps. */
    const fourStrikes = (bar: number): string[] => [1, 7, 9, 15].map((s) => `${String(bar)}.${String(s)}`)

    it('LOW BASS: i VI III V in C minor at 120, and the fourth note of every bar is the next root', () => {
      const riff = figureOf('LOW BASS')
      expect(riff.key).toBe('C minor')
      expect(riff.bpm.default).toBe(120)
      expect(riff.request.role).toBe('sub')
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['i', 1], ['VI', 1], ['III', 1], ['V', 1]])
      expect(onsetsOf(riff)).toEqual([1, 2, 3, 4].flatMap(fourStrikes))
      const pitches = pitchesOf(riff)
      expect(pitches).toEqual([
        'C2', 'C3', 'G2', 'Ab2',
        'Ab2', 'Ab3', 'Eb3', 'Eb2',
        'Eb2', 'Eb3', 'Bb2', 'G2',
        'G2', 'G3', 'D3', 'C2',
      ])
      // Arrive early: the fourth note of each bar is the pitch class the next bar opens on.
      for (let bar = 0; bar < 4; bar += 1) {
        const early = pitches[bar * 4 + 3]?.replace(/\d+$/, '')
        const next = pitches[((bar + 1) % 4) * 4]?.replace(/\d+$/, '')
        expect(early, `bar ${String(bar + 1)}`).toBe(next)
      }
      // The whole cycle in one 64-step pass, every onset struck, and the early roots leaned on.
      expect(riff.pattern?.length).toBe(64)
      expect(riff.pattern?.hits.map((h) => h.step)).toEqual([1, 7, 9, 15, 17, 23, 25, 31, 33, 39, 41, 47, 49, 55, 57, 63])
      expect(riff.pattern?.hits.filter((h) => h.slot === 'accent').map((h) => h.step)).toEqual([1, 15, 17, 31, 33, 47, 49, 63])
      expect(riff.constraints?.forbiddenDegrees).toEqual([expect.objectContaining({ chord: 'V', degree: 7 })])
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('Terror Bass: i i i bII in E phrygian at 130, and the F3 to E3 lands on beat four', () => {
      const riff = figureOf('Terror Bass')
      expect(riff.key).toBe('E phrygian')
      expect(riff.bpm.default).toBe(130)
      expect(riff.request.role).toBe('bass-mid')
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['i', 3], ['bII', 1]])
      // Bars one to three strike 1, 2&, 3, 4&; bar four strikes 1, 2&, 3 and beat 4 itself.
      expect(onsetsOf(riff)).toEqual([...[1, 2, 3].flatMap(fourStrikes), '4.1', '4.7', '4.9', '4.13'])
      // Nothing climbs above the C until bar four. The `E3` and `D3` that used to sit in bars
      // one and three were spending the ending early: by the time `F3` to `E3` arrived it was
      // the third visit to that register rather than the first, and the octave stopped reading
      // as an event. Played back, the low version is the one that holds together.
      expect(pitchesOf(riff)).toEqual([
        'E2', 'B2', 'G2', 'A2',
        'E2', 'G2', 'B2', 'C3',
        'E2', 'A2', 'G2', 'B2',
        'F2', 'C3', 'F3', 'E3',
      ])
      // The claim the figure now rests on, as data: bars one to three stay at or below the C.
      const belowTheC = pitchesOf(riff).slice(0, 12)
      expect(belowTheC.some((n) => /^(D3|E3|F3)$/.test(n))).toBe(false)
      // The arrival is the one strike on beat four in the figure, and it is the loudest.
      const onBeatFour = riff.pattern?.hits.filter((h) => (h.step - 1) % 16 === 12)
      expect(onBeatFour?.map((h) => h.step)).toEqual([61])
      const loudest = Math.max(...(riff.pattern?.hits.map((h) => h.velocity ?? 0) ?? []))
      expect(onBeatFour?.[0]?.velocity).toBe(loudest)
      // The raised second is forbidden across the piece, and neither chord carries it.
      expect(riff.constraints?.forbiddenDegrees).toEqual([expect.objectContaining({ chord: 'i', degree: 2, alter: 1 })])
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('Acid Wiggler: one bar of sixteenths in A minor at 132, five pitches, and the four slid steps are never struck', () => {
      const riff = figureOf('Acid Wiggler')
      expect(riff.key).toBe('A minor')
      expect(riff.bpm.default).toBe(132)
      expect(riff.request.role).toBe('acid')
      expect(riff.harmony).toBeUndefined()
      expect(riff.hook.bars).toBe(1)
      expect(riff.hook.notes).toHaveLength(16)
      expect(riff.hook.notes.every((n) => n.len === 1)).toBe(true)
      const pitches = pitchesOf(riff)
      expect(pitches).toEqual([
        'A1', 'A1', 'C2', 'A1',
        'E2', 'A1', 'A1', 'G1',
        'A1', 'A2', 'A1', 'C2',
        'A1', 'A1', 'E2', 'A1',
      ])
      // Deliberately five pitches: the subject, not a symptom.
      expect(new Set(pitches).size).toBe(5)
      // The slide is the note: steps 3, 8, 10 and 15 are in the hook and absent from the grid,
      // and the twelve struck steps are every other one.
      const slid = [3, 8, 10, 15]
      const struck = riff.pattern?.hits.map((h) => h.step) ?? []
      expect(riff.pattern?.length).toBe(16)
      expect(struck).toEqual([1, 2, 4, 5, 6, 7, 9, 11, 12, 13, 14, 16])
      for (const step of slid) {
        expect(sounding(riff, step), `step ${String(step)}`).toHaveLength(1)
        expect(struck.includes(step), `step ${String(step)} is slid, not struck`).toBe(false)
      }
      // The one note away from the root that is struck is the C2 at the end of beat three.
      const strikesOffRoot = struck.filter((step) => pitches[step - 1] !== 'A1')
      expect(strikesOffRoot).toEqual([5, 12])
      expect(riff.pattern?.hits.find((h) => h.step === 12)?.slot).toBe('accent')
      expect(riff.constraints).toBeUndefined()
    })

    it('SAW LEAD: i VI III V in D minor at 124, a climbing bar and a held F5, then the mirror falling to a held E4', () => {
      const riff = figureOf('SAW LEAD')
      expect(riff.key).toBe('D minor')
      expect(riff.bpm.default).toBe(124)
      expect(riff.request.role).toBe('lead')
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['i', 1], ['VI', 1], ['III', 1], ['V', 1]])
      expect(onsetsOf(riff)).toEqual([...fourStrikes(1), '2.1', ...fourStrikes(3), '4.1'])
      const pitches = pitchesOf(riff)
      expect(pitches).toEqual(['D4', 'F4', 'A4', 'D5', 'F5', 'F5', 'D5', 'A4', 'F4', 'E4'])
      // Bars three and four mirror bars one and two in rhythm and invert them in direction.
      const resolved = resolveHook(riff.hook, riff.key)
      if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
      const midi = resolved.hook.notes.map((n) => n.midi)
      const question = midi.slice(0, 4)
      const answer = midi.slice(5, 9)
      for (let i = 1; i < 4; i += 1) {
        expect(Math.sign((question[i] as number) - (question[i - 1] as number)), `question step ${String(i)}`).toBe(1)
        expect(Math.sign((answer[i] as number) - (answer[i - 1] as number)), `answer step ${String(i)}`).toBe(-1)
      }
      // The two held notes are whole bars, both of them.
      expect(riff.hook.notes[4]).toEqual({ step: 17, degree: 3, octave: 1, len: 16 })
      expect(riff.hook.notes[9]).toEqual({ step: 49, degree: 2, octave: 0, len: 16 })
      expect(riff.pattern?.hits.filter((h) => h.slot === 'accent').map((h) => h.step)).toEqual([17, 49])
      expect(riff.constraints?.forbiddenDegrees).toEqual([expect.objectContaining({ chord: 'V', degree: 7 })])
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('Triangle Lead: i VI iv V in G minor at 96, and every bar head is reached by a semitone from below', () => {
      const riff = figureOf('Triangle Lead')
      expect(riff.key).toBe('G minor')
      expect(riff.bpm.default).toBe(96)
      expect(riff.request.role).toBe('lead')
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['i', 1], ['VI', 1], ['iv', 1], ['V', 1]])
      expect(onsetsOf(riff)).toEqual([1, 2, 3, 4].flatMap(fourStrikes))
      expect(pitchesOf(riff)).toEqual([
        'G4', 'Bb4', 'D5', 'D5',
        'Eb5', 'D5', 'Bb4', 'B4',
        'C5', 'Eb5', 'G4', 'C#5',
        'D5', 'F#5', 'A4', 'F#4',
      ])
      // Chromatic approach: the last note of each bar is one semitone below the next bar's
      // first, the wrap to the next pass included.
      const resolved = resolveHook(riff.hook, riff.key)
      if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
      const midi = resolved.hook.notes.map((n) => n.midi)
      for (let bar = 0; bar < 4; bar += 1) {
        const approach = midi[bar * 4 + 3] as number
        const target = midi[((bar + 1) % 4) * 4] as number
        expect(target - approach, `bar ${String(bar + 1)}`).toBe(1)
      }
      // B, C# and F# are outside G minor and are authored as `alter`, never as a key change:
      // the three approach notes and the F#5 that is the D chord's own third.
      const altered = riff.hook.notes.filter((n) => n.alter !== undefined)
      expect(altered.map((n) => [n.step, n.degree, n.alter])).toEqual([[31, 3, 1], [47, 4, 1], [55, 7, 1], [63, 7, 1]])
      // Not the arch: the line does not rise by step to one peak and fall the same way.
      expect(riff.id).not.toContain('rise')
      expect(riff.constraints?.forbiddenDegrees).toEqual([expect.objectContaining({ chord: 'V', degree: 7 })])
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('FUNK ORGAN: i iv VII III in E minor at 112, two notes on the sixteenth before every beat and never on one', () => {
      const riff = figureOf('FUNK ORGAN')
      expect(riff.key).toBe('E minor')
      expect(riff.bpm.default).toBe(112)
      expect(riff.request.role).toBe('stab')
      expect(riff.request.polyphony).toBe(2)
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['i', 1], ['iv', 1], ['VII', 1], ['III', 1]])
      // Steps 4, 8, 12 and 16 of every bar: the sixteenth before beats 2, 3, 4 and the next 1.
      expect(onsetsOf(riff)).toEqual([1, 2, 3, 4].flatMap((bar) => [4, 8, 12, 16].map((s) => `${String(bar)}.${String(s)}`)))
      for (const n of riff.hook.notes) {
        expect((n.step - 1) % 4, `step ${String(n.step)}`).toBe(3)
        expect(n.len).toBe(1)
      }
      expect(pitchesOf(riff)).toEqual([
        'B4+E5', 'B4+E5', 'B4+E5', 'B4+E5',
        'C5+E5', 'C5+E5', 'C5+E5', 'C5+E5',
        'D5+F#5', 'D5+F#5', 'D5+F#5', 'D5+F#5',
        'D5+G5', 'D5+G5', 'D5+G5', 'D5+G5',
      ])
      // Every strike is on the grid, and none lands on a beat.
      expect(riff.pattern?.hits.map((h) => h.step)).toEqual(riff.hook.notes.map((n) => n.step).filter((s, i, a) => a.indexOf(s) === i))
      expect(riff.pattern?.hits.some((h) => (h.step - 1) % 4 === 0)).toBe(false)
      // Consistently early, as data: three steps into every chord, which is the other stab's
      // lesson turned round (strings-of-life walks later each bar).
      expect(riff.constraints?.onsetOffset?.minSteps).toBe(3)
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('CELESTIAL: I vi IV V in A major at 72, two voices closing from an octave to a third, on the duo pad by substitution', () => {
      const riff = figureOf('CELESTIAL')
      expect(riff.key).toBe('A major')
      expect(riff.bpm.default).toBe(72)
      expect(riff.request.role).toBe('pad')
      expect(riff.request.polyphony).toBe(2)
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['I', 2], ['vi', 2], ['IV', 2], ['V', 2]])
      expect(onsetsOf(riff)).toEqual(['1.1', '3.1', '5.1', '7.1'])
      // Sounding at the head of each chord, bottom to top, and the interval between the two.
      const resolved = resolveHook(riff.hook, riff.key)
      if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
      const at = (step: number) =>
        resolved.hook.notes.filter((n) => step >= n.step && step < n.step + n.len).sort((a, b) => a.midi - b.midi)
      const heads = [1, 33, 65, 97].map(at)
      expect(heads.map((pair) => pair.map((n) => n.note))).toEqual([['A3', 'A4'], ['C#4', 'A4'], ['D4', 'A4'], ['E4', 'G#4']])
      expect(heads.map((pair) => (pair[1]?.midi ?? 0) - (pair[0]?.midi ?? 0))).toEqual([12, 8, 7, 4])
      // Two notes for the whole figure, and the upper voice moves once, at the end.
      for (let step = 1; step <= 128; step += 1) expect(sounding(riff, step), `step ${String(step)}`).toHaveLength(2)
      expect(riff.hook.notes.filter((n) => n.octave === 1 || n.degree === 7).map((n) => [n.step, n.len])).toEqual([[1, 96], [97, 32]])
      // It asks for `soft`, the box authors only `dark`, and the substitution lands on the duo
      // pad with both notes: the check the issue asked for.
      const figure = entries.find((e) => e.patch.name === 'CELESTIAL')?.figure
      expect(figure?.voice.substituted).toBe(true)
      expect(figure?.voice.recipe.id).toBe('sub37-pad-dark')
      expect(figure?.voice.recipe.patchPolyphony).toBeUndefined()
      expect(figure?.voice.params.find((p) => p.name === 'OSC · DUO MODE')?.value).toBe('ON')
      expect(figure?.voice.params.find((p) => p.name === 'OSC · KB CTRL')?.value).not.toBe('OFF')
      expect(riff.constraints).toBeUndefined()
    })

    it('a mono role refuses a second note on this box, and the duo recipes take one (#632)', () => {
      // The mechanism the seven rest on, stated once. A two-note request on `sub`, `bass-mid`
      // or `acid` has no recipe here at all, since every recipe on those roles is
      // `patchPolyphony: 1`, so the gap is `no-recipe` on a voice that could carry two. A
      // two-note `lead / bright` is redirected to the one duo lead, `lead / clean`, which is
      // the recipe Triangle Lead lands on. `stab` and `pad` take two on every recipe. So a
      // replacement that grew a second note on the sub, the bass or the acid line would stop
      // resolving rather than resolve wrong, and one on the bright lead would change recipe.
      for (const [role, character] of [['sub', 'dark'], ['bass-mid', 'hard'], ['acid', 'dirty']] as const) {
        const result = rig([ask({ id: `r-${role}`, role, character, polyphony: 2 })])
        expect(result.assignments, `${role} / ${character}`).toEqual([])
        expect(result.shortfalls[0]?.reason, `${role} / ${character}`).toBe('no-recipe')
      }
      const lead = rig([ask({ id: 'r-lead', role: 'lead', character: 'bright', polyphony: 2 })])
      expect(lead.shortfalls).toEqual([])
      expect(lead.assignments[0]?.recipe.id).toBe('sub37-lead-clean')
      expect(lead.assignments[0]?.notes).toBe(2)
      for (const [role, character] of [['stab', 'hard'], ['pad', 'dark']] as const) {
        const result = rig([ask({ id: `r-${role}`, role, character, polyphony: 2 })])
        expect(result.shortfalls, `${role} / ${character}`).toEqual([])
        expect(result.assignments[0]?.notes, `${role} / ${character}`).toBe(2)
      }
    })

    it('Harp C Chord: I vi IV V in C major at 112, four voicings of two bars, the same shape moved (#645)', () => {
      // The issue's table, pitch by pitch, from the authored degrees and octaves.
      const riff = figureOf('Harp C Chord')
      expect(riff.key).toBe('C major')
      expect(riff.bpm.default).toBe(112)
      expect(riff.request.role).toBe('arp')
      expect(riff.arpeggiatedHold).toBe(true)
      expect(riff.request.polyphony).toBeUndefined()
      expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([['I', 2], ['vi', 2], ['IV', 2], ['V', 2]])
      expect(riff.hook.bars).toBe(8)
      expect(onsetsOf(riff)).toEqual(['1.1', '3.1', '5.1', '7.1'])
      expect(pitchesOf(riff)).toEqual(['C3+E3+G3+C4', 'A2+C3+E3+A3', 'F2+A2+C3+F3', 'G2+B2+D3+G3'])
      // Every note is held for its whole two bars, and every voicing is root, third, fifth,
      // octave: the top note an octave above the bottom, and the same shape at each root.
      expect(riff.hook.notes.every((n) => n.len === 32)).toBe(true)
      const resolved = resolveHook(riff.hook, riff.key)
      if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
      for (const step of [1, 33, 65, 97]) {
        const midi = resolved.hook.notes.filter((n) => n.step === step).map((n) => n.midi).sort((a, b) => a - b)
        const root = midi[0] as number
        expect(midi.map((m) => m - root), `step ${String(step)}`).toEqual(
          step === 33 ? [0, 3, 7, 12] : [0, 4, 7, 12],
        )
      }
      // No grid and no flag: the arpeggiator is the rhythm. The lesson the prose carries and
      // the two figures it must not restate: both pattern settings are taught, and the change
      // on the bar head is not.
      expect(riff.pattern).toBeUndefined()
      expect(riff.request.reArticulatesHook).toBeUndefined()
      const prose = riff.technique.join(' ')
      expect(prose).toMatch(/only way to hold four notes/)
      expect(prose).toMatch(/order you pressed them/)
      expect(prose).toMatch(/ORDR/)
      expect(prose).not.toMatch(/bar head/)
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('says nothing was played, vetted or tested, and attributes nothing to the operator (#637, #643)', () => {
      // #643's watch-out: nobody has played any of this, and #637 corrected a docstring that
      // said otherwise once. Scanned on the source of every one of the eleven, the keepers
      // included, and on the technique paragraphs a reader sees.
      for (const entry of figured) {
        const riff = figureOf(entry.patch.name)
        const source = readFileSync(new URL(`../lib/riffs/${riff.id}.ts`, import.meta.url), 'utf8')
        const lower = source.toLowerCase()
        for (const claim of ['played and vetted', 'vetted', 'tested', 'operator', 'at the instrument', 'at the machine']) {
          expect(lower.includes(claim), `${riff.id} claims "${claim}"`).toBe(false)
        }
        expect(source, riff.id).toContain('figure authored here')
        for (const paragraph of riff.technique) {
          expect(paragraph.includes('—'), `${riff.id}: an em dash in technique`).toBe(false)
          expect(paragraph, riff.id).not.toMatch(/Subsequent|Moog\b/)
        }
      }
    })
  })

  /**
   * §4.1/#659. **Every figure fits the keyboard, and the device says what the keyboard is.**
   *
   * `TRIPLET 5THS` was written in C and spanned MIDI 41 to 76, and the first reading said no
   * octave setting could hold it because every octave setting opens on a C. That reading missed
   * KB TRNSPOSE (p.14), which places the window a semitone at a time, so the figure fit at 40-76
   * or 41-77 all along. It is in G major now and stays there. What was true in that reading is
   * that nothing in the model could have said either way, and this block used to carry its own
   * window and its own list of Cs to say it. The device carries the fact now, `keyboardReach`,
   * and `presetSession` throws for a figure the keyboard cannot reach, so this asserts the
   * mechanism and holds no copy of it.
   */
  describe('every figure fits the keyboard (#659)', () => {
    it('the board is 36 to 72, from p.14, p.50 and p.61, and the two controls move it', () => {
      const reach = device.keyboardReach
      if (reach === undefined) throw new Error('no keyboardReach')
      expect(reach.keys).toBe(37)
      expect(keyboardWindow(reach)).toEqual({ lo: 36, hi: 72 })
      expect(reach.shift).toEqual({ octaves: { down: 2, up: 2 }, semitones: { down: 12, up: 12 } })
      expect(keyboardReachRange(reach)).toEqual({ lo: 0, hi: 108 })
      const board = device.capabilityEvidence?.[KEYBOARD_REACH_FACT]
      expect(board).toMatchObject({ kind: 'manual' })
      if (board === undefined || board === false || board.kind !== 'manual') throw new Error('unreachable')
      expect(board.source).toContain('pp.14, 50, 61')
      expect(board.source).toContain('MIDI Note 48')
      expect(device.capabilityEvidence?.[KEYBOARD_SHIFT_FACT]).toEqual({
        kind: 'manual',
        source: "Subsequent 37 User's Manual, pp.14, 61",
      })
    })

    /**
     * The session is what throws for a figure the keyboard cannot reach, so its being defined
     * is the sweep. The placement is asserted beside it so the sweep says where each figure
     * sits: every one is on the octave buttons alone, with no transpose.
     */
    it('every figure has a placement on the buttons alone, and the session builds', () => {
      if (session === undefined) throw new Error('no session')
      const reach = device.keyboardReach
      if (reach === undefined) throw new Error('no keyboardReach')
      let checked = 0
      for (const entry of session.entries) {
        const riff = entry.figure?.riff
        if (riff === undefined) continue
        const notes = resolveRiff(riff, [device]).notes
        if (notes.outcome !== 'resolved') continue
        const midi = notes.hook.notes.map((n) => n.midi)
        const placed = keyboardPlacement(reach, Math.min(...midi), Math.max(...midi))
        expect(placed, riff.id).toBeDefined()
        expect(placed?.semitones, riff.id).toBe(0)
        checked++
      }
      expect(checked).toBeGreaterThan(10)
    })

    /** The span that shipped fits with the transpose and not without, which is the whole correction. */
    it('41-76 fits this board with KB TRNSPOSE and fits no octave setting alone', () => {
      const reach = device.keyboardReach
      if (reach === undefined) throw new Error('no keyboardReach')
      const placed = keyboardPlacement(reach, 41, 76)
      expect(placed).toBeDefined()
      expect(placed?.semitones).not.toBe(0)
      const buttonsOnly = { ...reach, shift: { ...reach.shift, semitones: { down: 0, up: 0 } } }
      expect(keyboardPlacement(buttonsOnly, 41, 76)).toBeUndefined()
    })

    /**
     * The one that was moved, pinned by name, so a future edit that walks it back reports the
     * reason rather than an anonymous bound. It lands one octave up on the buttons.
     */
    it('TRIPLET 5THS sits at 48-83 in G major and lands one octave up', () => {
      const riff = figureOf('TRIPLET 5THS')
      expect(riff.key).toBe('G major')
      const notes = resolveRiff(riff, [device]).notes
      if (notes.outcome !== 'resolved') throw new Error('TRIPLET 5THS did not resolve')
      const midi = notes.hook.notes.map((n) => n.midi)
      expect(Math.min(...midi)).toBe(48)
      expect(Math.max(...midi)).toBe(83)
      const reach = device.keyboardReach
      if (reach === undefined) throw new Error('no keyboardReach')
      expect(keyboardPlacement(reach, 48, 83)).toEqual({ octaves: 1, semitones: 0 })
    })
  })

  it('reads on the device page under the observed lead, with no count', () => {
    if (session === undefined) throw new Error('no session')
    expect(presetLead(session)).toBe(
      'The ones worth knowing, what each is for, and the figure written for it where one exists.',
    )
    expect(presetLead(session)).not.toMatch(/\d/)
  })
})
