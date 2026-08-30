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
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitakt-ii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Digitakt II is the library's first `sampler`, its first sixteen-slot pool, and the box that
 * puts the hardest pressure yet on §4.3's articulation model. Most of this file is about the last
 * of those: **what a manifest may claim when the hardware can do much more than the shape can
 * carry**, and how the excess is recorded rather than approximated.
 *
 * The other thing it is first at is scarcity of a particular kind. Elektron documents what a
 * parameter does and leaves its range to the screen, so a 118-page manual for a deep sampler
 * yields exactly three printed numeric ranges. Every recipe here is therefore a chain of cited
 * enum choices, and every uncited numeric is absent.
 */

const MANUAL = 'Digitakt II User Manual OS 1.15A, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

describe('Digitakt II manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('elektron-digitakt-ii')
    expect(device.maker).toBe('Elektron')
  })

  it('is the library\'s first sampler, in the manual\'s own words', () => {
    // p.10: "The Digitakt II is a compact drum machine and sampler from Elektron." Both words
    // appear; `sampler` is the one that discriminates, because unlike the two Rolands there is no
    // fixed instrument set — sixteen fungible tracks, each holding whatever is loaded.
    expect(device.kind).toBe('sampler')
    // First, and no longer alone. The Octatrack MKII is its own sibling's argument at half the
    // scale — eight fungible tracks, each holding whatever is loaded — and the SP-404MK2, EP-133
    // and EP-40 are the same argument on a pad grid rather than a track list. Listed in registry
    // order, which is folder order.
    expect(DEVICES.filter((d) => d.kind === 'sampler').map((d) => d.id)).toEqual([
      'elektron-digitakt-ii',
      'elektron-octatrack-mkii',
      'roland-sp-404mk2',
      'te-ep-133',
      'te-ep-40',
    ])
  })

  // -------------------------------------------------------------------------
  // §2.2 — one pool of sixteen, and one voice per track
  // -------------------------------------------------------------------------

  it('models sixteen mutually exclusive tracks as one pool, not sixteen plus sixteen', () => {
    // p.17: "16 tracks that can be either an audio track or a MIDI track." The two are exclusive,
    // so sixteen audio voices *plus* sixteen MIDI tracks would claim thirty-two simultaneous
    // things this box cannot do.
    expect(device.voices).toHaveLength(1)
    expect(device.voices[0]?.kind).toBe('pool')
    expect(device.voices[0]?.kind === 'pool' ? device.voices[0].count : 0).toBe(16)
    expect(expand(device)).toHaveLength(16)
    // A sampler's track is whatever is loaded into it, so the pool carries the whole vocabulary.
    expect(new Set(device.voices[0]?.roles ?? []).size).toBe(ROLES.length)
  })

  it('gives each track one voice, which takes two pages rather than one', () => {
    // **"Each audio track contains one sample" (p.17) does not prove monophony on its own** — a
    // sampler can play one sample polyphonically. What settles it is p.15's architecture:
    // "16 stereo audio voices" across sixteen tracks is one voice each.
    expect(device.voices[0]?.polyphony).toBe(1)
    expect(expand(device).every((a) => a.polyphony === 1)).toBe(true)
  })

  it('reaches a chord only through a sample that already contains one (§12.4)', () => {
    // One voice per track means a three-note request is unreachable by any patch. The way out is
    // a rendered chord sample, which is one note as far as the track is concerned.
    const chords = device.recipes.filter((r) => realisationOf(r) === 'sampled-chord')
    expect(chords.length).toBeGreaterThan(0)
    for (const recipe of chords) {
      const assignable = expand(device).find((a) => a.poolId === recipe.voice)
      if (assignable === undefined) throw new Error('no assignable')
      const resolution = resolveRecipe(device, assignable, recipe.role, recipe.character, 3)
      expect(resolution.outcome, recipe.id).toBe('exact')
      // The polyphony claim is not bent: the assignable still sounds one note.
      expect(assignable.polyphony).toBe(1)
    }
    // And nothing else claims it — a `sampled-chord` on a part that is one note anyway would be
    // an instruction to go and render something for no reason.
    expect(chords.map((r) => r.role).sort()).toEqual(['pad', 'stab'])
  })

  it('is comfortable with twelve of its sixteen, because MIDI tracks come out of the same pool', () => {
    expect(device.comfortableVoices).toBe(12)
    expect(device.comfortableVoices).toBeLessThan(16)
  })

  // -------------------------------------------------------------------------
  // §4.3 / #57 — the articulation boundary, which is what this device is here to test
  // -------------------------------------------------------------------------

  describe('the articulation boundary (#57)', () => {
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )

    it('uses only the scalar subset that stays true for every hit in a slot', () => {
      // `bindArticulation` applies one `set` to *every* step carrying the slot. So a key may only
      // appear here if it is a scalar, identical across those hits, and carries no state between
      // them. These six are: VEL and LEN (p.53), PROB (p.53, "re-evaluated every time a trig is
      // set to play"), micro timing (p.45), and RTRG with RATE (p.54).
      expect([...used].sort()).toEqual([...ARTICULABLE_PER_STEP].sort())
    })

    it('declares the capabilities it cannot reach, and reaches none of them', () => {
      // **The honest half.** `features.perStep` is a description of the box, so the documented
      // per-trig capabilities are all named. Three of the nine cannot survive the limitation
      // above and no recipe touches them.
      const declared = device.features?.perStep ?? []
      expect(declared).toHaveLength(9)
      const unreachable = declared.filter((k) => !used.has(k))
      expect(unreachable.sort()).toEqual(['condition', 'fill', 'sample-lock'])
      for (const key of unreachable) {
        for (const recipe of device.recipes) {
          for (const entry of recipe.articulation ?? []) {
            expect(Object.keys(entry.set), `${recipe.id} / ${key}`).not.toContain(key)
          }
        }
      }
    })

    it('never approximates a stateful condition as a scalar', () => {
      // PRE and NEI depend on the most recently evaluated condition on this or the *neighbour*
      // track; 1ST and LST on where the pattern is in its loop; A:B on a repetition counter
      // (pp.47-48). None is a value; each is a rule needing context this model has none of. The
      // failure to guard against is a manifest writing `{ condition: 'PRE' }` and rendering an
      // instruction that cannot be carried out.
      const source = JSON.stringify(device)
      for (const token of ['PRE', 'NEI', '1ST', 'LST', 'A:B']) {
        expect(source, token).not.toContain(`"${token}"`)
      }
    })

    it('pairs retrig with a rate, because the switch alone is not an instruction', () => {
      // "These hits retrig" is true and useless without a rate. RATE's option list is enumerated
      // on p.54, so the pair is expressible; a bare boolean would not be actionable.
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          if (!('retrig' in entry.set)) continue
          expect(Object.keys(entry.set), recipe.id).toContain('retrig-rate')
        }
      }
      expect(used.has('retrig')).toBe(true)
    })

    it('keeps every articulation key inside the declared vocabulary (§2.3)', () => {
      const declared = new Set(device.features?.perStep ?? [])
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          expect(Object.keys(entry.set).length, recipe.id).toBeGreaterThan(0)
          for (const key of Object.keys(entry.set)) expect(declared, `${recipe.id} / ${key}`).toContain(key)
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
  // §3 — recipes, and a manual that prints almost no numbers
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
      expect(recipe.id.startsWith('dt2-'), recipe.id).toBe(true)
      expect(recipe.voice, recipe.id).toBe('track')
    }
    expect(new Set(device.recipes.map((r) => r.character)).size).toBe(CHARACTERS.length)
  })

  it('resolves every authored recipe exactly, from every ordinal in the pool', () => {
    const members = expand(device).filter((a) => a.poolId === 'track')
    expect(members).toHaveLength(16)
    for (const recipe of device.recipes) {
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

  it('is built from cited option sets, because the manual prints almost no ranges', () => {
    // **Across pp.53-60 and APPENDIX A the manual prints exactly three numeric ranges**: VFAD
    // (-64–64) p.54, FADE (-64–63) p.58, HOLD (0–126) p.56. Everything else is described in words
    // with no scale. So a recipe here is a chain of machine and mode choices, and every numeric
    // that survives is one of those three.
    const SHAPES = [
      { min: -64, max: 64 },
      { min: -64, max: 63 },
      { min: 0, max: 126 },
    ]
    let enums = 0
    let numerics = 0
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
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
          expect(
            SHAPES.some((s) => s.min === param.range.min && s.max === param.range.max),
            `${where}: ${param.range.min}..${param.range.max} is not one of the three printed ranges`,
          ).toBe(true)
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
          expect(param.step, where).toBeUndefined()
        }
      }
    }
    // Enum-dominated, and by a wide margin. That ratio is the manual's shape, not a choice.
    expect(enums).toBeGreaterThan(numerics * 2)
  })

  it('omits the parameters whose range the manual never states', () => {
    // The failure mode is inventing a 0-127 to hang a value on. ATK, DEC, PAN, VOL, cutoff and
    // resonance are all real, prominent controls with no printed scale anywhere.
    const uncited = ['ATK', 'DEC', 'PAN', 'VOL', 'SUS', 'REL', 'CUTOFF', 'RESO', 'TUNE', 'STRT', 'LEN']
    for (const recipe of device.recipes) {
      const names = params(recipe).map((p) => p.name)
      for (const name of uncited) expect(names, `${recipe.id} / ${name}`).not.toContain(name)
    }
    // And the LFO waveform set is absent for a narrower reason: p.58 names the waveforms in prose
    // but prints only `RND` as an on-screen token, so the panel spelling of the rest is unknown.
    for (const recipe of device.recipes) {
      expect(params(recipe).map((p) => p.name), recipe.id).not.toContain('WAVE')
    }
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
  // §2.3 / §10 — panel
  // -------------------------------------------------------------------------

  it('spans 215 x 176 mm in playing orientation, cited to the specifications page', () => {
    // p.91: `Dimensions: W 215 × D 176 × H 63 mm`. For a desktop box lying flat the rise is the
    // manufacturer's depth; 63 mm is how far off the desk it stands.
    expect(device.physical.panelSpanMm).toBe(215)
    expect(device.panel?.panelRiseMm).toBe(176)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}91` })
    expect(device.panel?.panelRiseMm).not.toBe(63)
  })

  it('puts the voice field on the sixteen TRIG keys, because they are the track selectors', () => {
    // §2.3 asks for the region where the box's own voice selection lives, and here it is the same
    // control: p.25 says the sixteen [TRIG] keys "have radio button functionality… Only one track
    // can be selected at a time".
    const fields = device.panel?.features.filter((f) => f.kind === 'voices') ?? []
    expect(fields).toHaveLength(1)
    const result = resolve({ devices: [device], template: TEMPLATES[0] as never, mood: NEUTRAL_MOOD, seed: 1 })
    expect(result.assignments.length).toBeGreaterThan(0)
    for (const f of device.panel?.features ?? []) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(215)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(176)
    }
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
    }
  })
})

/**
 * §3/#101. Every audio machine on this box is a sample player — "Each audio track contains one
 * sample" (p.17), and there is no synth engine anywhere in it — so *every* recipe here has to say
 * what to load. That makes this the strictest form of the rule in the library, and the cheapest
 * to state: no exceptions, no marker param to key on.
 */
describe('Digitakt II says what audio to load (§3/#101)', () => {
  it('declares a source on every recipe, because every machine plays a file', () => {
    expect(device.recipes.length).toBeGreaterThan(15)
    for (const recipe of device.recipes) {
      expect(recipe.sourceAudio, recipe.id).toBeDefined()
      expect((recipe.sourceAudio?.need ?? '').split(/\s+/).length, recipe.id).toBeGreaterThan(5)
    }
  })

  it('names no file and cites no page, because neither exists to name', () => {
    for (const recipe of device.recipes) {
      const source = recipe.sourceAudio
      expect(source?.need, recipe.id).not.toMatch(/\.(wav|aif{1,2}|mp3|flac)\b/i)
      // No documented preparation on this box: the machine reads whatever is in the slot, and
      // there is no render-to-audio procedure like the Tracker Mini's p.104 to point at.
      expect(source?.prep, recipe.id).toBeUndefined()
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
