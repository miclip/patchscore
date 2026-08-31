import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  expand,
  realisationOf,
  resolve,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-octatrack-mkii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Octatrack MKII is the library's second Elektron sampler and the one that inverts the first.
 * The Digitakt II's sixteen tracks are audio *or* MIDI, so its manifest models one pool and
 * writes the cost of a MIDI track into `comfortableVoices`. Here p.55 says the eight audio and
 * eight MIDI tracks run *at the same time*, so the MIDI tracks cost nothing — and are absent from
 * `voices` for the plain reason that they make no sound.
 *
 * Three things this file guards that no other manifest test does:
 *
 *  - **The two FX slots are different lists.** p.62 gives FX1 ten effects and FX2 the same ten
 *    plus a delay and three reverbs. A reverb authored into FX1 would carry a real citation and
 *    name an effect that slot does not have, which is CLAUDE.md's wrong-scale failure wearing an
 *    enum's clothes.
 *  - **`LEN`'s option set depends on `SLIC`**, and p.118 says so in one sentence. The pair has to
 *    travel together or the citation stops meaning anything.
 *  - **The panel rise is derived, not printed.** p.116 gives a 340 mm width and a 184 mm depth
 *    quoted over protruding jacks and feet; the drawing's own aspect is what fixes the rise, and
 *    the arithmetic is asserted here rather than trusted.
 */

const MANUAL = 'Octatrack MKII User Manual OS 1.40A, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('Octatrack MKII manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('elektron-octatrack-mkii')
    expect(device.maker).toBe('Elektron')
  })

  it('is a sampler in the manual’s own words, beside the four already here', () => {
    // p.11: "With the Octatrack we wanted to create a sampler that would regard recorded material
    // not as inflexible sounds, but rather as something highly malleable." Listed in registry
    // order, which is folder order.
    expect(device.kind).toBe('sampler')
    expect(DEVICES.filter((d) => d.kind === 'sampler').map((d) => d.id)).toEqual([
      'elektron-digitakt',
      'elektron-digitakt-ii',
      'elektron-octatrack-mkii',
      'roland-sp-404mk2',
      'te-ep-133',
      'te-ep-40',
    ])
  })

  // -------------------------------------------------------------------------
  // §2.2 — one pool of eight, and the eight MIDI tracks that are not in it
  // -------------------------------------------------------------------------

  it('models eight audio tracks as one pool, and no MIDI track as a voice', () => {
    // p.55: "The Octatrack MKII sequencer can control 8 audio stereo tracks and 8 MIDI tracks at
    // the same time." **At the same time** is what separates this box from the Digitakt II: the
    // two sets coexist, so a MIDI track costs no audio track. It is absent from `voices` because
    // it makes no sound, not because it competes for a slot.
    expect(device.voices).toHaveLength(1)
    expect(device.voices[0]?.kind).toBe('pool')
    expect(device.voices[0]?.kind === 'pool' ? device.voices[0].count : 0).toBe(8)
    expect(expand(device)).toHaveLength(8)
    // Sixteen would be the mistake this asserts against — eight audio plus eight soundless.
    expect(expand(device)).not.toHaveLength(16)
    // A sampler's track is whatever is loaded into it, so the pool carries the whole vocabulary.
    expect(new Set(device.voices[0]?.roles ?? []).size).toBe(ROLES.length)
  })

  it('gives each track one voice, which the manual never states in those words', () => {
    // The word "polyphony" does not occur in the document. The 1 is read off the architecture —
    // a track holds one machine, a machine one sample (Appendix A, pp.117-121) — which is why
    // `voices` carries a `partly` below rather than a plain citation.
    expect(device.voices[0]?.polyphony).toBe(1)
    expect(expand(device).every((a) => a.polyphony === 1)).toBe(true)
  })

  it('keys every recipe on the pool id, so one recipe serves all eight ordinals (§2.2)', () => {
    // Recipe lookup keys on `poolId ?? voiceId`. Writing one recipe per ordinal would relocate
    // the duplication rather than remove it, so the guard is that *every* member resolves the
    // *same* recipe exactly.
    const members = expand(device).filter((a) => a.poolId === 'track')
    expect(members).toHaveLength(8)
    expect(new Set(members.map((a) => a.voiceId)).size).toBe(8)
    for (const recipe of device.recipes) {
      expect(recipe.voice, recipe.id).toBe('track')
      const notes = realisationOf(recipe) === 'sampled-chord' ? 3 : 1
      for (const member of members) {
        const where = `${recipe.id} on ${member.voiceId}`
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character, notes)
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  it('is comfortable with six of its eight, and both missing tracks have a page', () => {
    // Track 8 goes to the master track in the rigs the manual leads with (p.97, p.101), and a
    // master track has no SRC page so it plays nothing (p.36). At least one more goes to a Thru
    // machine or a track recorder, which is what the two input pairs are for.
    expect(device.comfortableVoices).toBe(6)
    expect(device.comfortableVoices).toBeLessThan(8)
  })

  it('reaches a chord only through a sample that already contains one (§12.4)', () => {
    const chords = device.recipes.filter((r) => realisationOf(r) === 'sampled-chord')
    expect(chords.map((r) => r.role).sort()).toEqual(['pad', 'stab'])
    for (const recipe of chords) {
      const assignable = expand(device).find((a) => a.poolId === recipe.voice)
      if (assignable === undefined) throw new Error('no assignable')
      const resolution = resolveRecipe(device, assignable, recipe.role, recipe.character, 3)
      expect(resolution.outcome, recipe.id).toBe('exact')
      // The polyphony claim is not bent: the assignable still sounds one note.
      expect(assignable.polyphony).toBe(1)
      // And the substitution has to be carried out on real audio, so it says which samples.
      expect(recipe.sourceAudio?.need, recipe.id).toMatch(/chord/i)
    }
  })

  it('does not pretend PTCH can transpose a chord further than two octaves', () => {
    // pp.118-119 and p.137 both bound `PTCH` at ±12, and p.138 says the same of playing a track
    // from a keyboard. A progression that walks further needs a second sample, and the stab says
    // so rather than leaving a reader to discover the ceiling at the machine.
    const stab = device.recipes.find((r) => r.id === 'ot-stab-hard')
    expect(stab?.sourceAudio?.need).toMatch(/twelve semitones/)
  })

  // -------------------------------------------------------------------------
  // §3.1 / §3.2 — five printed ranges, and the wrong-scale pairings
  // -------------------------------------------------------------------------

  it('carries recipes on distinct (role, character) keys, with unique ids', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)
    const ids = device.recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const recipe of device.recipes) {
      expect(ROLES, recipe.id).toContain(recipe.role)
      expect(CHARACTERS, recipe.id).toContain(recipe.character)
      expect(recipe.id.startsWith('ot-'), recipe.id).toBe(true)
    }
  })

  it('is built from cited option sets, because the manual prints five ranges in 146 pages', () => {
    // Appendix A (pp.117-121) and Appendix B (pp.122-136) describe every machine and effect
    // parameter and print a scale for almost none. These five are the whole of it:
    //
    //   PTCH  -12..12 st   pp.118-119 in prose, p.137 as a note-map table
    //   TUNE   -2..2  st   p.130, "changes the pitch by up to 2 semitones up or down"
    //   NUM     2..10      p.126, from "B.5 2-10 STAGE PHASER"
    //   TAPS    2..10      p.128, from "B.7 2-10 TAP CHORUS"
    //   TIME    1..128     p.133, the whole divide-ratio table
    const SHAPES = new Map<string, { min: number; max: number; unit?: string }>([
      ['PTCH', { min: -12, max: 12, unit: 'st' }],
      ['TUNE', { min: -2, max: 2, unit: 'st' }],
      ['NUM', { min: 2, max: 10 }],
      ['TAPS', { min: 2, max: 10 }],
      ['TIME', { min: 1, max: 128 }],
    ])
    let enums = 0
    let numerics = 0
    const seen = new Set<string>()
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
        // Every point is taste; only ranges and option sets carry a page (§3.2).
        expect(param.verified, where).toBe(false)
        if (param.kind === 'enum') {
          enums += 1
          expect(param.options.verified, where).toMatchObject({
            kind: 'manual',
            source: expect.stringContaining(MANUAL),
          })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
        if (param.kind === 'numeric') {
          numerics += 1
          seen.add(param.name)
          const shape = SHAPES.get(param.name)
          expect(shape, `${where} is not one of the five printed ranges`).toBeDefined()
          expect(param.range.min, where).toBe(shape?.min)
          expect(param.range.max, where).toBe(shape?.max)
          expect(param.range.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.unit, where).toBe(shape?.unit)
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
          expect(param.step, where).toBeUndefined()
        }
      }
    }
    expect([...seen].sort()).toEqual(['NUM', 'PTCH', 'TAPS', 'TIME', 'TUNE'])
    // Enum-dominated, and by a wide margin. That ratio is the manual's shape, not a choice.
    expect(enums).toBeGreaterThan(numerics * 2)
  })

  it('omits the parameters whose range the manual never states', () => {
    // The failure mode is inventing a 0-127 to hang a value on. All of these are real, prominent
    // controls with no printed scale: the filter's BASE/WIDTH/Q/DEPTH, the amp's ATK/HOLD/REL/
    // VOL/BAL, the LFO's SPD/DEP, the delay's FB.
    const uncited = ['BASE', 'WIDTH', 'Q', 'DEPTH', 'ATK', 'HOLD', 'REL', 'VOL', 'BAL', 'SPD', 'DEP', 'FB', 'STRT']
    for (const recipe of device.recipes) {
      const names = params(recipe).map((p) => p.name)
      for (const name of uncited) expect(names, `${recipe.id} / ${name}`).not.toContain(name)
    }
    // p.19 §5.2.2 mentions parameters "ranging from 0 to 127" and "from -64 to 63" in general.
    // It names two families and assigns no parameter to either, so it grounds nothing — and a
    // range read off it would be invented however carefully it were cited.
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        const shape = `${param.range.min}..${param.range.max}`
        expect(shape, `${recipe.id} / ${param.name}`).not.toBe('0..127')
        expect(shape, `${recipe.id} / ${param.name}`).not.toBe('-64..63')
      }
    }
  })

  it('keeps FX1 and FX2 on their own option sets, because p.62 prints two lists', () => {
    // FX1 takes ten effects, FX2 those ten plus Echo Freeze Delay, Gatebox Plate Reverb, Spring
    // Reverb and Dark Reverb. One shared list would let a recipe put a reverb in FX1 with a
    // citation beside it — a real page proving the wrong claim.
    const FX2_ONLY = ['DELAY', 'PLATE REV', 'SPRING REV', 'DARK REV']
    let usedFx2Only = 0
    for (const recipe of device.recipes) {
      const fx1 = named(recipe, 'FX1')
      const fx2 = named(recipe, 'FX2')
      if (fx1 !== undefined && fx1.kind === 'enum') {
        expect(fx1.options.values, recipe.id).toHaveLength(11)
        for (const only of FX2_ONLY) expect(fx1.options.values, `${recipe.id} / FX1`).not.toContain(only)
        expect(fx1.options.values, recipe.id).toContain('NONE')
      }
      if (fx2 !== undefined && fx2.kind === 'enum') {
        expect(fx2.options.values, recipe.id).toHaveLength(15)
        for (const only of FX2_ONLY) expect(fx2.options.values, `${recipe.id} / FX2`).toContain(only)
        if (FX2_ONLY.includes(fx2.value)) usedFx2Only += 1
      }
    }
    // And the difference is exercised rather than merely declared: recipes really do reach for
    // the delay and the reverbs, in the slot that has them.
    expect(usedFx2Only).toBeGreaterThan(3)
  })

  it('never authors an effect into the slot that does not offer it', () => {
    // The assertion the previous test protects, stated directly against every authored value.
    const FX1_ALLOWED = new Set([
      'NONE', 'FILTER', 'EQUALIZER', 'DJ EQUALIZER', 'PHASER', 'FLANGER', 'CHORUS',
      'SPATIALIZER', 'COMB FILTER', 'COMPRESSOR', 'LO-FI',
    ])
    for (const recipe of device.recipes) {
      const fx1 = named(recipe, 'FX1')
      if (fx1?.kind === 'enum') expect(FX1_ALLOWED, `${recipe.id} / ${fx1.value}`).toContain(fx1.value)
    }
  })

  it('pairs LEN with SLIC, because p.118 gives the same control two option sets', () => {
    // p.118: "If SLIC is set to ON LEN can be set to either SLIC or TIME... If SLIC is set to OFF,
    // LEN can be set to either OFF or TIME." A `LEN` value cited to that page proves nothing
    // unless the recipe also says which of the two sets is in force.
    let sliced = 0
    for (const recipe of device.recipes) {
      const len = named(recipe, 'LEN')
      if (len === undefined) continue
      const slic = named(recipe, 'SLIC')
      expect(slic, `${recipe.id} sets LEN without SLIC`).toBeDefined()
      if (slic?.kind !== 'enum' || len.kind !== 'enum') throw new Error(`${recipe.id}: not enums`)
      expect(slic.options.values.sort(), recipe.id).toEqual(['OFF', 'ON'])
      if (slic.value === 'ON') {
        sliced += 1
        expect(len.options.values, recipe.id).toEqual(['SLIC', 'TIME'])
      } else {
        expect(len.options.values, recipe.id).toEqual(['OFF', 'TIME'])
      }
      expect(len.options.values, recipe.id).toContain(len.value)
    }
    // Both sides of the switch are exercised, or the pairing is untested in one direction.
    expect(sliced).toBeGreaterThan(0)
    expect(sliced).toBeLessThan(device.recipes.length)
  })

  it('names the AUTO switch on every setting that only applies beneath it', () => {
    // `LOOP MODE` and `TIMESTRETCH` are sample attributes (p.85) that apply only while the
    // track's `LOOP` and `TSTR` are AUTO in SRC SETUP (p.109, p.118). The gate lives in a note
    // rather than a param because the track-level values are not enumerable — `AUTO` and `OFF`
    // are the only two any page prints, and a two-value option set would overclaim.
    for (const recipe of device.recipes) {
      for (const name of ['LOOP MODE', 'TIMESTRETCH']) {
        const param = named(recipe, name)
        if (param === undefined) continue
        expect(param.note, `${recipe.id} / ${name}`).toMatch(/AUTO/)
      }
      for (const name of ['LOOP', 'TSTR']) {
        expect(params(recipe).map((p) => p.name), `${recipe.id} / ${name}`).not.toContain(name)
      }
    }
  })

  it('declares mood on the two axes it can move, and no more', () => {
    // A device declines an axis by having no param that declares it (§6). Two of the five printed
    // ranges carry one: PTCH darkens, and the delay's TIME opens the room up.
    const axes = new Set<string>()
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        for (const offset of param.mood ?? []) axes.add(offset.axis)
      }
    }
    expect([...axes].sort()).toEqual(['darkness', 'space'])
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    const counts = auditDevice(device).counts
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
  })

  // -------------------------------------------------------------------------
  // §4.3 — the articulation boundary
  // -------------------------------------------------------------------------

  describe('the articulation boundary (§4.3/#57)', () => {
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )

    it('uses only the scalar subset that stays true for every hit in a slot', () => {
      // Four of the ten: TRIG OFFSET on the 1/384 grid (p.76), TRIG COUNT 2-8 (p.77), and the
      // swing and slide trigs entered in the TRACK TRIG EDIT menu (p.74).
      expect([...used].sort()).toEqual([...ARTICULABLE_PER_STEP].sort())
    })

    it('declares the six capabilities it cannot reach, and reaches none of them', () => {
      const declared = device.features?.perStep ?? []
      expect(declared).toHaveLength(10)
      const unreachable = declared.filter((k) => !used.has(k))
      expect(unreachable.sort()).toEqual([
        'lock-trig',
        'one-shot-trig',
        'parameter-lock',
        'sample-lock',
        'trig-condition',
        'trigless-trig',
      ])
      for (const key of unreachable) {
        for (const recipe of device.recipes) {
          for (const entry of recipe.articulation ?? []) {
            expect(Object.keys(entry.set), `${recipe.id} / ${key}`).not.toContain(key)
          }
        }
      }
    })

    it('never approximates a stateful condition as a scalar', () => {
      // PRE and NEI depend on the last evaluated condition on this or the neighbour track, 1ST on
      // the loop, A:B on a repetition counter (p.77). None is a value; each is a rule needing
      // context this model has none of.
      const source = JSON.stringify(device)
      for (const token of ['PRE', 'NEI', '1ST', 'A:B']) {
        expect(source, token).not.toContain(`"${token}"`)
      }
    })

    it('sets no velocity, because an audio track’s trig has no VEL', () => {
      // The Digitakt II articulates velocity on nearly every recipe. This box cannot: the TRIG
      // page carries no such field, and level per hit exists only as a parameter lock on VOL,
      // whose range p.58 does not print.
      expect(used.has('velocity')).toBe(false)
      expect(device.features?.perStep ?? []).not.toContain('velocity')
    })

    it('keeps trig counts inside the range p.77 prints', () => {
      // "A setting of 2-8 adds additional trig repeats of the original trig."
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          const count = entry.set['trig-count']
          if (count === undefined) continue
          expect(typeof count, recipe.id).toBe('number')
          expect(count as number, recipe.id).toBeGreaterThanOrEqual(2)
          expect(count as number, recipe.id).toBeLessThanOrEqual(8)
        }
      }
    })

    it('states something on every articulation it authors', () => {
      // A zero nudge or a `false` flag is the default written out, which is an instruction to do
      // nothing dressed as an instruction.
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          expect(Object.keys(entry.set).length, recipe.id).toBeGreaterThan(0)
          for (const [key, value] of Object.entries(entry.set)) {
            expect(value, `${recipe.id} / ${key}`).not.toBe(0)
            expect(value, `${recipe.id} / ${key}`).not.toBe(false)
          }
        }
      }
    })

    it('keeps every articulation key inside the declared vocabulary (§2.3)', () => {
      const declared = new Set(device.features?.perStep ?? [])
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const key of Object.keys(entry.set)) {
            expect(declared, `${recipe.id} / ${key}`).toContain(key)
          }
        }
      }
    })

    it('addresses steps only by PatternSlot, never by index', () => {
      const source = JSON.stringify(device)
      expect(source).not.toContain('"steps"')
      expect(source).not.toContain('"hits"')
    })
  })

  // -------------------------------------------------------------------------
  // §2.6 — capability evidence
  // -------------------------------------------------------------------------

  describe('capability evidence (§2.6/#22)', () => {
    const evidence = device.capabilityEvidence ?? {}

    it('sends and receives clock over the DIN sockets and nowhere else', () => {
      // p.40 §8.7.2 gives all four switches: CLOCK SEND, CLOCK RECEIVE, TRANSPORT SEND and
      // TRANSPORT RECEIVE. The manual never mentions USB MIDI, and p.112 rules the port out even
      // for a firmware upgrade.
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['midi-din'])
      expect(evidence['clock.canSendClock']).toEqual({ kind: 'manual', source: `${MANUAL}40` })
      expect(evidence['clock.canReceiveClock']).toEqual({ kind: 'manual', source: `${MANUAL}40` })
    })

    it('says how to make the clock leave, because it is a menu (§7.4/#104)', () => {
      const setup = device.clock.sourceSetup ?? []
      expect(setup).toHaveLength(1)
      expect(setup[0]?.transport).toBe('midi-din')
      expect(setup[0]?.path).toBe('[PROJ] > MIDI > SYNC')
      expect(setup[0]?.value).toBe('CLOCK SEND')
      expect(evidence['clock.sourceSetup[midi-din]']).toBeDefined()
    })

    it('claims the clock preference on pages that name the box’s job, not its wiring', () => {
      // §2.1.4 is headed LIVE SETUP HUB (p.11); §16.1 is OCTATRACK MKII AS A PERFORMANCE HUB and
      // builds the rig, enabling TRANSPORT SEND and CLOCK SEND at step 3 (p.96); §16.5 spends the
      // MIDI tracks driving two synths (p.102). The citation must not be p.40 — that page proves
      // a capability, and the whole point of the field is that a capability is not a job.
      expect(device.clock.preferredSource).toBe(true)
      const cite = evidence['clock.preferredSource']
      expect(cite).toMatchObject({ kind: 'manual' })
      const source = (cite as { source: string }).source
      expect(source).toContain('p.11')
      expect(source).toContain('p.96')
      expect(source).not.toContain('p.40')
      expect(DEVICES.filter((d) => d.clock.preferredSource === true).map((d) => d.id)).toEqual([
        'elektron-octatrack-mkii',
        'intellijel-metropolix',
        // The Play+ is the sixth, and it earns the claim the way its sibling does — on a role
        // sentence rather than on a jack. p.207 heads its first worked configuration "Play+ as the
        // primary lead" and captions it "Transport control e.g. Play, Stop and Clock is dictated by
        // Play and its current Tempo. Digitakt will follow the lead of Play+ as will other devices."
        'polyend-play-plus',
        // The Seq is the eighth, on the same footing as its three siblings and stated as plainly
        // as any of them: p.10 says "Remember that the Seq can be the heart of a sophisticated
        // hardware rig, but will also do great with a favorite DAW." It is voiceless and carries
        // `midi-din`, so it also takes the whole library from the Hapax on the bottom key.
        'polyend-seq',
        // The Tracker is the seventh, on the same kind of page as its two siblings and no better
        // than theirs: p.253 opens §11.3 "Typical MIDI Configurations" with Tracker as the
        // primary lead, Clock In `Internal` and Clock Out `MIDI Out jack`. The manual documents it
        // following too (p.264), which is why the claim stays "this box can lead" — and following
        // costs it its sequencer, which p.265 says in as many words, where leading costs nothing.
        'polyend-tracker',
        'polyend-tracker-mini',
        'squarp-hapax',
        'torso-t1',
      ])
    })

    it('splits the voices claim, because one page proves the count and no page the polyphony', () => {
      // #236's `partly`. `unknown` would say the reading came back with nothing when it came back
      // with the half that matters, and a plain `Cite` would claim p.55 backs the polyphony too.
      const voices = evidence['voices'] as { kind: string; proven?: string; open?: string }
      expect(voices?.kind).toBe('partly')
      expect(voices?.proven).toMatch(/eight audio stereo tracks/)
      expect(voices?.open).toMatch(/polyphony/)
    })

    it('records the USB port as read-and-unanswered rather than left blank', () => {
      // #120: `unknown` means the document was read and does not say, and the reason is what makes
      // that visible. p.32's USB DISK MODE is the only use any page gives the port.
      expect(device.io.usbAudio).toBe(false)
      const usb = evidence['io.usbAudio'] as { kind: string; reason?: string }
      expect(usb?.kind).toBe('unknown')
      expect(usb?.reason).toMatch(/USB DISK MODE/)
      // And nothing here is a bare state: every non-claim carries a reason.
      for (const [path, entry] of Object.entries(evidence)) {
        if (entry === false || entry === undefined) continue
        const kind = (entry as { kind: string }).kind
        if (kind === 'unknown' || kind === 'unread') {
          expect((entry as { reason: string }).reason.length, path).toBeGreaterThan(20)
        }
        if (kind === 'partly') {
          expect((entry as { proven: string }).proven.length, path).toBeGreaterThan(20)
          expect((entry as { open: string }).open.length, path).toBeGreaterThan(20)
        }
      }
    })

    it('gives every declared jack an entry, keyed by id (§2.6)', () => {
      const jacks = device.jacks ?? []
      expect(jacks).toHaveLength(12)
      for (const jack of jacks) {
        expect(evidence[`jacks[${jack.id}]`], jack.id).toEqual({ kind: 'manual', source: `${MANUAL}14` })
      }
      // p.14's rear panel, minus the three a reader does not patch: POWER, DC In and the
      // Compact Flash slot. USB is out too — it is a disk connection, and `direction` is one of
      // `in` or `out`.
      expect(jacks.map((j) => j.id)).toEqual([
        'HEADPHONES',
        'MAIN OUT L',
        'MAIN OUT R',
        'CUE OUT L',
        'CUE OUT R',
        'INPUT A',
        'INPUT B',
        'INPUT C',
        'INPUT D',
        'MIDI IN',
        'MIDI OUT',
        'MIDI THRU',
      ])
      // One clock output per transport per direction, or the rack offers a choice rather than an
      // instruction: MIDI THRU carries MIDI and no clock claim.
      expect(jacks.filter((j) => j.signal.includes('clock')).map((j) => j.id)).toEqual([
        'MIDI IN',
        'MIDI OUT',
      ])
    })

    it('declares a shipped library nobody has listed, and no individual outs', () => {
      // p.23/p.25: the bundled card carries a set called "PRESETS" whose audio pool "is full of
      // samples"; p.27 puts them in its AUDIO folder. No page prints a filename, which is why the
      // recipes describe their audio rather than naming an entry.
      expect(device.content?.kind).toBe('shipped-library')
      expect(evidence['content']).toMatchObject({ kind: 'manual' })
      // The cue pair is a second bus, not per-track outs: p.63 routes a track to it and the track
      // "will still be audible from the main outputs".
      expect(device.io.individualOuts).toBe(0)
      expect(device.io.main).toBe('stereo')
      expect(device.io.audioIn).toBe(true)
    })

    it('says a trig holds no length, because none of the eight trig types does', () => {
      // pp.66-67 list sample, note, lock, trigless, one-shot, swing, slide and recorder trigs.
      // None carries a duration; the AMP envelope and the SRC page's LEN decide it.
      expect(device.noteDuration?.kind).toBe('trigger')
      expect(evidence['noteDuration']).toMatchObject({ kind: 'manual' })
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, whose rise is derived rather than printed
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    const panel = device.panel

    it('anchors the rise to the drawn aspect, because no page prints the top face', () => {
      // p.116: "Dimensions: W 340 × D 184 × H 63 mm ... (including knobs, jacks, and rubber
      // feet)". The span is safe — a plan view of a width, with nothing protruding sideways — and
      // the depth is not, because p.14 puts eleven sockets along the back edge. p.12's `source-8`
      // group measures 382.257812 × 197.875 in its own units, so the rise follows the drawing.
      expect(device.physical.panelSpanMm).toBe(340)
      expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}116` })
      const rise = panel?.panelRiseMm ?? 0
      expect(rise).toBeCloseTo((197.875 * 340) / 382.257812, 9)
      expect(rise).toBeCloseTo(176.0, 3)
      // The two figures a careless reading would have used instead.
      expect(rise).not.toBe(184)
      expect(rise).not.toBe(63)
      // And the mismatch is real rather than rounding: the drawn aspect is 4.5% off the spec's.
      const drawn = 382.257812 / 197.875
      expect(drawn).toBeCloseTo(1.93181, 5)
      expect(Math.abs(drawn - 340 / 184)).toBeGreaterThan(0.08)
    })

    it('is cited to the figure it was measured from', () => {
      expect(panel?.verified).toEqual({
        kind: 'manual',
        source: 'Octatrack MKII User Manual OS 1.40A, p.12 (3.1 FRONT PANEL)',
      })
    })

    it('keeps every feature inside the panel', () => {
      const span = device.physical.panelSpanMm
      const rise = panel?.panelRiseMm ?? 0
      expect(panel?.features.length).toBeGreaterThan(40)
      for (const f of panel?.features ?? []) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(span)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(rise)
      }
    })

    it('puts the one voice field on the screen, not on the eight TRACK keys', () => {
      // The TRACK keys are where a reader selects a track and would be the obvious home, but they
      // are two columns of four flanking the display, and a `voices` field is one rectangle — any
      // rect covering both swallows the screen between them. `PanelFeature` names this case:
      // "Draw the voice field on top of one to show a box whose screen lists its tracks", and
      // p.19 §5 item 1 says this screen does exactly that.
      const fields = (panel?.features ?? []).filter((f) => f.kind === 'voices')
      expect(fields).toHaveLength(1)
      const field = fields[0]
      const screen = (panel?.features ?? []).find((f) => f.kind === 'screen')
      if (field?.kind !== 'voices' || screen?.kind !== 'screen') throw new Error('missing feature')
      expect(field.x).toBeGreaterThanOrEqual(screen.x)
      expect(field.y).toBeGreaterThanOrEqual(screen.y)
      expect(field.x + field.w).toBeLessThanOrEqual(screen.x + screen.w)
      expect(field.y + field.h).toBeLessThanOrEqual(screen.y + screen.h)
      // The keys are still drawn, so a reader can find them; they just carry no readout.
      const labels = (panel?.features ?? []).flatMap((f) =>
        f.kind === 'button' && f.label !== undefined ? [f.label] : [],
      )
      for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']) expect(labels).toContain(t)
    })

    it('draws the sixteen TRIG keys as one row', () => {
      const grids = (panel?.features ?? []).filter((f) => f.kind === 'grid' && f.cols === 16)
      expect(grids).toHaveLength(1)
      expect(grids[0]?.kind === 'grid' ? grids[0].rows : 0).toBe(1)
    })
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
    const declared = new Set(Object.keys(device.hints ?? {}))
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint === undefined) continue
        expect(declared, `${recipe.id} / ${entry.hint}`).toContain(entry.hint)
      }
      if (recipe.sourceAudio?.hint !== undefined) {
        expect(declared, `${recipe.id} / ${recipe.sourceAudio.hint}`).toContain(recipe.sourceAudio.hint)
      }
    }
  })
})

/**
 * §3/#101. Every machine on this box that makes a sound plays a file, so every recipe has to say
 * what to load — the Digitakt II's rule, and the same absence of any page to cite for it.
 */
describe('Octatrack MKII says what audio to load (§3/#101)', () => {
  it('declares a source on every recipe', () => {
    for (const recipe of device.recipes) {
      expect(recipe.sourceAudio, recipe.id).toBeDefined()
      expect((recipe.sourceAudio?.need ?? '').split(/\s+/).length, recipe.id).toBeGreaterThan(5)
      expect(recipe.sourceAudio?.need, recipe.id).not.toMatch(/\.(wav|aif{1,2}|mp3|flac)\b/i)
    }
  })

  it('points the looped and stretched recipes at the one documented preparation', () => {
    // §17.3, p.109, is the only preparation routine in the manual: TSTR off, trim the start
    // point, match the tempo until the loop is seamless, write that as ORIGINAL TEMPO, TSTR back
    // to AUTO. A recipe that stretches a loop without it is an instruction that will drift.
    const prepped = device.recipes.filter((r) => r.sourceAudio?.prep !== undefined)
    expect(prepped.length).toBeGreaterThan(0)
    for (const recipe of prepped) {
      expect(recipe.sourceAudio?.prep?.verified).toEqual({ kind: 'manual', source: `${MANUAL}109` })
    }
  })

  it('says the source in the guide, above the parameters', () => {
    const result = resolve({
      devices: [device],
      template: TEMPLATES.find((t) => t.id === 'industrial-techno') as (typeof TEMPLATES)[number],
      mood: NEUTRAL_MOOD,
      seed: 3,
    })
    expect(result.assignments.length).toBeGreaterThan(0)
    for (const a of result.assignments) expect(a.recipe.sourceAudio, a.recipe.id).toBeDefined()
  })
})
