import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  realisationOf,
  renderGuide,
  resolve,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
  type ResolvedAssignment,
  type Role,
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
      'elektron-digitakt',
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
      // them. These seven are: VEL and LEN (p.53), PROB (p.53, "re-evaluated every time a trig is
      // set to play"), micro timing (p.45), RTRG with RATE (p.54), and PORT (p.55), which p.53
      // makes lockable to a step along with every other track parameter.
      expect([...used].sort()).toEqual([...ARTICULABLE_PER_STEP].sort())
    })

    it('declares the capabilities it cannot reach, and reaches none of them', () => {
      // **The honest half.** `features.perStep` is a description of the box, so the documented
      // per-trig capabilities are all named. Three of the ten cannot survive the limitation
      // above and no recipe touches them.
      const declared = device.features?.perStep ?? []
      expect(declared).toHaveLength(10)
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
    // Not the usual 15-20 bound, and the pool is the reason. A track here is whatever is loaded
    // into it, so `roles` carries all 23 rather than the handful a fixed-voice box can offer —
    // and a role declared with no recipe resolves `unvoiced`, which is the reader being told to
    // dial it by ear on a box that could have been told what to load. So the target is one recipe
    // per declared role, and the ceiling is two: `tom` has both because §3.5 refuses a
    // substitution between `bright` and `dark` and two directions ask for opposite ends of it.
    const roles = device.voices[0]?.roles ?? []
    for (const role of roles) {
      expect(device.recipes.map((r) => r.role), `no recipe for ${role}`).toContain(role)
    }
    expect(device.recipes.length).toBeGreaterThanOrEqual(roles.length)
    expect(device.recipes.length).toBeLessThanOrEqual(roles.length * 2)
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

/**
 * §2.1/§2.2/#86. **This box authors a trigger note per track mode, and it is the first to do so.**
 *
 * It used to author none, and the reason was structural rather than evidential: p.25 gives the
 * convention (*"MIDI note numbers 16-84, that corresponds to notes E2-C7 (C5, MIDI note 60, being
 * middle C)"*) and p.53's TRIG screen shows the box pairing them, `NOTE` reading `C 5 (60)` on an
 * audio track — so `{ note: 'C5', midi: 60 }` was writable with a real citation and had nowhere
 * to go. A pool's note reaches every member alike, and this one pool holds three kinds of track:
 *
 *  - **whole-sample machines** (`ONESHOT`, `WERP`, `STRETCH`, `REPITCH`), where `C5` does mean
 *    *play it as recorded* — the one case `TriggerNote` models;
 *  - **sliced ones**, and `dt2-vox-chop-bright` is one. p.26: *"Slices play from C1 and upwards,
 *    wrapping around after the last slice, when using the Grid and Slice machines and set SLICE
 *    to NOTE."* A slice address is not an original pitch, and `TriggerNote` refuses it (#369);
 *  - **MIDI tracks**, whose TRIG page p.53 says is *"a different set of parameters"* entirely.
 *
 * `TrackMode` is the shape that holds all three. The note moved from the pool to the mode, the
 * recipe names the mode, and `selectedBy` ties the mode to the `SRC MACHINE` the recipe already
 * carried so the two cannot drift apart. The tests below assert both halves: the whole-sample
 * parts now print a note, and the sliced ones still print none.
 */
describe('trigger notes: authored per track mode (§2.1/§2.2/#86)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  /** The machines whose note means "play it as recorded" — the only case `TriggerNote` models. */
  const WHOLE_SAMPLE = ['ONESHOT', 'WERP', 'STRETCH', 'REPITCH']

  function srcMachine(recipe: Recipe): string | undefined {
    const param = params(recipe).find((p) => p.name === 'SRC MACHINE')
    return param?.kind === 'enum' ? param.value : undefined
  }

  const pool = device.voices[0]
  const modes = pool !== undefined && pool.kind === 'pool' ? (pool.modes ?? []) : []

  it('puts the note on the mode and not on the pool, and leaves two modes without one', () => {
    // The pool itself states nothing, which is the schema's rule as well as this box's fact: a
    // voice declares one note or a table of modes, never both.
    expect(device.voices.filter((v) => v.triggerNote !== undefined)).toEqual([])
    expect(modes.map((m) => m.id)).toEqual(['whole-sample', 'sliced', 'midi'])

    const whole = modes.find((m) => m.id === 'whole-sample')
    expect(whole?.triggerNote?.note).toBe('C5')
    expect(whole?.triggerNote?.midi).toBe(60)
    // p.25 and p.53 both, because neither page carries the whole fact on its own.
    const source = whole?.triggerNote?.verified.source ?? ''
    expect(source).toContain('p.25')
    expect(source).toContain('p.53')

    // The two that decline, and they decline for different reasons — see the head note.
    expect(modes.find((m) => m.id === 'sliced')?.triggerNote).toBeUndefined()
    expect(modes.find((m) => m.id === 'midi')?.triggerNote).toBeUndefined()

    // Still nothing on a recipe: `RecipeSchema` refuses the field outright (§2.1).
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  /**
   * **The pairing that cannot come apart.** `mode` and `SRC MACHINE` are one fact with two
   * spellings, and the failure of letting them drift is silent: switch a recipe to `SLICE` and
   * forget the mode, and the guide prints `C5` for a slice address. `selectedBy` is what makes
   * that a build failure, and this asserts it end to end rather than trusting the schema.
   */
  it('gives every recipe a mode its own machine agrees with', () => {
    for (const recipe of device.recipes) {
      const mode = modes.find((m) => m.id === recipe.mode)
      expect(mode, recipe.id).toBeDefined()
      expect(mode?.selectedBy?.values, recipe.id).toContain(srcMachine(recipe))
    }

    // And the refusal itself, on a device that differs from this one in exactly one value.
    const broken = {
      ...device,
      recipes: device.recipes.map((r) =>
        r.id === 'dt2-kick-hard' ? { ...r, mode: 'sliced' } : r,
      ),
    }
    expect(DeviceSchema.safeParse(broken).success).toBe(false)
  })

  it('expands to sixteen members, each carrying the whole mode table and no note of its own', () => {
    // One pool is still the shape of the box; what changed is that the pool can now say its
    // members are not addressed alike. The table is device data, identical on every member, so
    // sixteen tracks are still sixteen assignables (§2.2).
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(16)
    expect(members.every((m) => m.poolId === 'track')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
    expect(members.every((m) => m.modes?.length === 3)).toBe(true)
  })

  it('joins the library roster of boxes that author one', () => {
    // `test/tracker-mini.test.ts` pins that roster exactly, and it had to learn to look at modes
    // as well as at voices when this box arrived. Same fact asked from this side.
    const authoring = DEVICES.filter((d) =>
      d.voices.some(
        (v) =>
          v.triggerNote !== undefined ||
          (v.kind === 'pool' && (v.modes ?? []).some((m) => m.triggerNote !== undefined)),
      ),
    )
    expect(authoring.map((d) => d.id)).toContain('elektron-digitakt-ii')
  })

  /**
   * **The reason, read off the recipes and the cited option set rather than restated.**
   *
   * One sliced recipe is authored today, and `SLICE`, `GRID` and `MIDI` are all cited members of
   * the same `SRC MACHINE` set — so the pool holds them whether or not a recipe has selected one.
   */
  it('carries a sliced recipe and a MIDI machine on the same pool as the whole-sample ones', () => {
    const sliced = device.recipes.filter((r) => {
      const machine = srcMachine(r)
      return machine === 'SLICE' || machine === 'GRID'
    })
    expect(sliced.map((r) => r.id)).toEqual(['dt2-vox-chop-bright'])
    expect(sliced.every((r) => r.voice === 'track')).toBe(true)
    expect(sliced.every((r) => r.mode === 'sliced')).toBe(true)

    // The whole-sample recipes it shares that pool with.
    const whole = device.recipes.filter((r) => WHOLE_SAMPLE.includes(srcMachine(r) ?? ''))
    expect(whole.length).toBe(device.recipes.length - sliced.length)
    expect(whole.every((r) => r.voice === 'track')).toBe(true)
    expect(whole.every((r) => r.mode === 'whole-sample')).toBe(true)

    // And the option set every one of them declares, which is the pool's real reach. `MIDI` and
    // `GRID` are legal here and unselected; the mode table is what keeps the note off them.
    for (const recipe of device.recipes) {
      const param = params(recipe).find((p) => p.name === 'SRC MACHINE')
      expect(param?.kind, recipe.id).toBe('enum')
      if (param?.kind !== 'enum') throw new Error('expected an enum SRC MACHINE')
      expect(param.options.values, recipe.id).toContain('SLICE')
      expect(param.options.values, recipe.id).toContain('GRID')
      expect(param.options.values, recipe.id).toContain('MIDI')
    }
  })

  /**
   * **No recipe selects the MIDI mode, and the mode is declared anyway.**
   *
   * A MIDI track drives another box rather than playing a part, so there is no role for it in
   * §2.2 and no recipe to write. It is in the table because p.17 says it is the third thing a
   * track can be, and a two-entry table would claim the pool holds two kinds of member. Pinned so
   * that the day a recipe selects it, somebody re-reads p.53 first.
   */
  it('declares the MIDI mode and selects it nowhere', () => {
    expect(modes.some((m) => m.id === 'midi')).toBe(true)
    expect(device.recipes.filter((r) => r.mode === 'midi').map((r) => r.id)).toEqual([])
  })

  /**
   * **The sliced recipe cannot acquire a note, and this is the assertion that would catch it.**
   *
   * Checked at every layer it could arrive through — the mode, the recipe, the expanded member,
   * and the resolved assignment. It is the half of this change that had to keep working: the
   * point was never to give this box a note, it was to give it the note that is true of the track
   * in front of the reader.
   */
  it('never lets the sliced recipe resolve with a trigger note', () => {
    const sliced = device.recipes.find((r) => r.id === 'dt2-vox-chop-bright')
    expect(sliced, 'the sliced recipe this test is about has been renamed or removed').toBeDefined()
    expect(srcMachine(sliced as Recipe)).toBe('SLICE')

    let seen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          if (a.recipe.id !== 'dt2-vox-chop-bright') continue
          seen += 1
          expect(a.triggerNote, `${template.id} seed ${String(seed)}`).toBeUndefined()
          for (const assignable of a.assignables) {
            expect(assignable.triggerNote, `${template.id} seed ${String(seed)}`).toBeUndefined()
          }
        }
      }
    }
    // Non-zero, or this passes forever against a rig that never places the part.
    expect(seen).toBeGreaterThan(0)
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with at
   * least one section whose variant resolved (§6.3).
   *
   * One definition, used by the sweep and by the page test. `noteInstruction` answers `none` for a
   * hooked or sustained part as well as for a blank grid part, so a page test asking it whether a
   * grid exists would count parts that draw none and then pass against a guide with nothing in it.
   */
  function drawsGrid(a: ResolvedAssignment): boolean {
    return (
      a.hookAuthority === undefined &&
      !isSustainedPart(a) &&
      a.patterns.some((p) => p.selection.outcome !== 'none')
    )
  }

  /** Every part this box takes, split by what phase 5 actually draws for it. */
  function sweep() {
    const grid: { where: string; role: Role; kind: string }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          if (drawsGrid(a)) grid.push({ where, role: a.role, kind: noteInstruction(a).kind })
          else if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else noPattern.push(where)
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  /**
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6.
   *
   * 270 of the 294 grid parts this sweep drew when modes arrived were blank before they existed,
   * and 6 are blank now; Hard Techno since took the sweep to 342, and the blanks stayed at 6. That
   * is the whole change stated as a number, and the 6 are the ones that should be: every one is a
   * `vox-chop` part on the sliced recipe, where the note the manual prints is a slice address and
   * the model is right to say nothing. The total moves when a direction gains or loses a part or
   * this box gains a recipe; what must not move is that the blanks and the sliced recipe are the
   * same set.
   */
  it('leaves only the sliced parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(360)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(6)
    expect(grid.filter((g) => g.kind === 'trigger').length).toBe(324)

    // Named rather than left to the count: all three arms are now in play on this box.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch', 'trigger'])

    // The blanks are the sliced role and nothing else.
    expect([...new Set(grid.filter((g) => g.kind === 'none').map((g) => g.role))]).toEqual([
      'vox-chop',
    ])
  })

  it('prints the direction pitch where there is one, and the box note where there is not', () => {
    // §4.1's precedence, now with both arms occupied. The 30 that carry a pitch are `sub` parts,
    // where the pitch is the direction's musical decision (#340) and owes this box nothing —
    // and where printing `C5` instead would tell a reader to play a sub at the sample's own
    // pitch, which is the one thing the direction did not ask for.
    const grid = sweep().grid
    const pitched = grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(30)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
    expect(grid.filter((g) => g.role === 'sub' && g.kind === 'trigger')).toEqual([])
  })

  it('lands the box note on the roles a loaded sample answers', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'trigger') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 54],
      ['kick', 54],
      ['ghost-perc', 48],
      ['open-hat', 24],
      ['rim', 24],
      ['snare', 24],
      ['clap', 18],
      ['metallic', 18],
      ['ride', 18],
      ['tom', 18],
      ['impact', 12],
      ['arp', 6],
      ['noise', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program.
    const { grid, hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(162)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(42)
    // `sweep` joins the list rather than the grid, and that is the recipe working as authored: no
    // direction writes a step variant for the role, so there is nothing to program and
    // `dt2-sweep-soft` articulates nothing. See its comment, and `lib/core/reachability.ts`.
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'generative-drift/sweep',
      'hard-techno/riser',
      'hip-hop/texture',
      'industrial-techno/riser',
      'slow-noir/texture',
    ])

    // The four arms are exhaustive, so the sweep cannot silently drop a part it could not
    // classify — which is what would make the counts above an undercount rather than a
    // measurement.
    let assignments = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        assignments += resolve({ devices: [device], template, mood: moodState(), seed })
          .assignments.length
      }
    }
    expect(grid.length + hooked.length + sustained.length + noPattern.length).toBe(assignments)
  })

  /**
   * The resolved field itself, across every part rather than only the ones that draw a grid.
   * `noteInstruction` folds the trigger arm in with the pitch arm and suppresses both for a
   * hooked or sustained part, so this is the one assertion about what the *resolver* decided
   * rather than about what a page shows.
   */
  it('resolves the mode note on every part but the sliced ones', () => {
    // From the *authored* recipe, because `ResolvedAssignment.recipe` is the renderer's summary
    // and deliberately does not carry `mode`: the reader already sees `SRC MACHINE` on the page,
    // and a second spelling of it there would be a value with nothing listening (#388).
    const modeOf = new Map(device.recipes.map((r) => [r.id, r.mode]))
    let seen = 0
    let carrying = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          seen += 1
          const expected = modeOf.get(a.recipe.id) === 'whole-sample'
          expect(
            a.triggerNote !== undefined,
            `${template.id}/${a.role} seed ${String(seed)} on ${a.recipe.id}`,
          ).toBe(expected)
          if (a.triggerNote !== undefined) {
            carrying += 1
            expect(a.triggerNote.midi).toBe(60)
          }
        }
      }
    }
    expect(seen).toBe(564)
    expect(carrying).toBe(552)
  })

  /**
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver.
   *
   * The count of parts that actually draw a grid is asserted non-zero first, or an empty render
   * would pass this either way.
   */
  it('prints the trigger note on a rendered page, in every direction', () => {
    let drawn = 0
    let pages = 0
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        const drawing = result.assignments.filter(drawsGrid)
        drawn += drawing.length
        const guide = renderGuide(result)
        if (drawing.some((a) => noteInstruction(a).kind === 'trigger')) {
          pages += 1
          expect(guide, `${template.id} seed ${String(seed)}`).toContain(
            '**Trigger note** — `C5` · MIDI 60',
          )
        }
      }
    }
    expect(drawn).toBeGreaterThan(0)
    expect(pages).toBeGreaterThan(0)
  })

  /**
   * §2.1/#352. **The two conventions this box prints, one authored and one deliberately not.**
   *
   * `C5` is 60 here (p.25), so `0` is `C0` — which p.25 confirms from the other side, *"Note
   * numbers 0-15 correspond to notes C0 through to D#1"*. That is the Tracker Mini's numbering
   * and an octave below the SP-404MK2's.
   *
   * p.26's slice base is the value that must never be written into a `TriggerNote`, so the octave
   * it would land on is asserted beside the one that is right for a whole sample: they are four
   * octaves apart, and nothing on a rendered page would distinguish them. That distance is what
   * the `sliced` mode exists to keep off the page.
   */
  it('records both note readings and authors only the one that is a pitch', () => {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    // C5 = 60 means octave numbering starts at zero, so MIDI n is octave floor(n / 12).
    const midiOf = (name: string, octave: number) => octave * 12 + NAMES.indexOf(name)

    expect(midiOf('C', 5)).toBe(60) //   p.25, and p.53's `C 5 (60)`
    expect(midiOf('C', 0)).toBe(0) //    p.25's "Note numbers 0-15 ... C0 through to D#1"
    expect(midiOf('D#', 1)).toBe(15) //  the other end of that same sentence
    expect(midiOf('E', 2)).toBe(28) //   p.25's chromatic span, 16-84 = E2-C7
    expect(midiOf('C', 7)).toBe(84)

    // p.26's slice base, four octaves below the whole-sample note — the distance a reader would
    // have been handed if the two kinds of address had shared one field.
    expect(midiOf('C', 1)).toBe(12)
    expect(midiOf('C', 5) - midiOf('C', 1)).toBe(48)

    // Only the whole-sample reading is authored, and it is authored at the one place that is true
    // of the track rather than of the pool.
    expect(modes.filter((m) => m.triggerNote !== undefined).map((m) => m.id)).toEqual([
      'whole-sample',
    ])
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
