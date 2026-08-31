import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  PATTERN_SLOTS,
  ROLES,
  expand,
  renderGuide,
  resolve,
  resolveParam,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/roland-tr-8s/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { industrialTechno } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The TR-8S is the second Roland drum machine in the library and the first box in it with **a
 * sampler behind every voice**, and those two facts pull in opposite directions. Most of this
 * file is not "does the ninth manifest parse" — the codegen already re-parses it — but the claims
 * the schema cannot make about a box whose *parameter table is gated on what tone is loaded*.
 *
 * The INST table (p.30) is common to all tones for nine controls and then splits: `Attack` only
 * for ACB tones of the BD category, `Snappy` only for SD, `Color` only for TOM, and a whole
 * second block (p.31) only for sample tones. So a recipe here that sets `SNAPPY` is not merely
 * suggesting a number — it is asserting that the SD slot is holding an ACB tone of the SD
 * category, and on a box where any slot takes any tone that assertion can be false. What keeps it
 * honest is the `TONE` param each recipe carries, and the tests below are what keep *that* honest.
 *
 * The second thing this box reaches first is `flam`, a per-step lane no other manifest declares.
 */

const REFERENCE = 'TR-8S Reference Manual eng01, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

/** The category and engine a recipe requires in the slot, as free text. Every recipe has one. */
function toneOf(recipe: Recipe): string {
  const tone = paramNamed(recipe, 'TONE')
  if (tone === undefined || tone.kind !== 'text') throw new Error(`${recipe.id}: no TONE`)
  return tone.value
}

/** Every legality citation a recipe carries: a numeric's range, an enum's option set. */
function legality(recipe: Recipe): string[] {
  return params(recipe)
    .flatMap((p) => (p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : []))
    .filter((v): v is { kind: 'manual' | 'observed'; source: string } => v !== undefined && v !== false)
    .map((v) => v.source)
}

describe('TR-8S manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('roland-tr-8s')
    expect(device.kind).toBe('drum-machine')
  })

  // -------------------------------------------------------------------------
  // §2.3 — the panel, in playing orientation
  // -------------------------------------------------------------------------

  it('spans 409 x 263 mm in playing orientation, each figure cited to the document that has it', () => {
    // The usual Roland split, and this box walks straight into it: the Reference Manual carries
    // every parameter range and has no specifications section at all, so the span comes off the
    // Owner's Manual and the drawing the panel coordinates were read from is the Reference
    // Manual's top-panel page. Two documents, two citations, neither doing the other's job.
    expect(device.physical.panelSpanMm).toBe(409)
    expect(device.physical.verified).toEqual({
      kind: 'manual',
      source: "TR-8S Owner's Manual eng03, p.24 (Main Specifications)",
    })
    expect(device.panel?.panelRiseMm).toBe(263)
    expect(device.panel?.verified).toEqual({
      kind: 'manual',
      source: 'TR-8S Reference Manual eng01, p.4 (Top Panel)',
    })

    // The trap §2.3 names: for a desktop box lying flat the surface you play is the top panel, so
    // the rise is the manufacturer's *depth*. 65 mm is how far off the desk the box stands and is
    // not a panel dimension at all. A landscape box, and wider than it is deep.
    expect(device.physical.panelSpanMm).toBeGreaterThan(device.panel?.panelRiseMm ?? 0)
  })

  it('keeps every drawn feature inside the published footprint', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(409)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(263)
    }
    // Exactly one voice field, and it is the instrument-select row rather than the step buttons:
    // §2.3 asks for the region where the box's own voice selection lives, and on this panel that
    // is the strip of eleven instrument buttons under the faders.
    const fields = panel.features.filter((f) => f.kind === 'voices')
    expect(fields).toHaveLength(1)
    expect(fields[0]?.kind === 'voices' ? fields[0].label : undefined).toBe('INSTRUMENT')
  })

  // -------------------------------------------------------------------------
  // §2.2 — eleven fixed slots, not a pool of eleven
  // -------------------------------------------------------------------------

  it('declares the eleven instruments the panel prints, in panel order, one note each', () => {
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'lt', 'mt', 'ht', 'rs', 'hc', 'ch', 'oh', 'cc', 'rc',
    ])
    // Fixed, not a pool. The literal reading of "any slot takes any tone" is one pool of eleven
    // fungible slots, and it throws away both the category gating below — which is per-slot in
    // practice, because the slot is what holds the tone — and the labels the reader is looking at
    // while they work.
    expect(device.voices.every((v) => v.kind === 'fixed')).toBe(true)
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
    expect(device.voices).toHaveLength(11)

    const assignables = expand(device)
    expect(assignables).toHaveLength(11)
    expect(assignables.every((a) => a.ordinal === undefined && a.poolId === undefined)).toBe(true)
  })

  it('names only shared-vocabulary roles, and gives every slot at least one', () => {
    for (const voice of device.voices) {
      expect(voice.roles.length, voice.id).toBeGreaterThan(0)
      for (const role of voice.roles) expect(ROLES, voice.id).toContain(role)
    }
  })

  // -------------------------------------------------------------------------
  // §3 — recipes
  // -------------------------------------------------------------------------

  it('carries recipes on distinct (role, character) keys, with unique ids', () => {
    // Twenty-six rather than the 15-20 the guidance suggests, and eleven slots is the reason: the
    // TR-1000 covers ten with nineteen. It is still one or two per slot, not a parameter dump.
    //
    // #300 added the last two: a `dark` ghost-perc on HT and a `dark` riser on CC, the first
    // second characters either role carries anywhere in the library. Both sit on slots that
    // already declared the role, so the count grew and the shape did not.
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(26)

    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)
    const ids = device.recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const recipe of device.recipes) {
      expect(ROLES, recipe.id).toContain(recipe.role)
      expect(CHARACTERS, recipe.id).toContain(recipe.character)
      expect(recipe.id.startsWith('tr8s-'), recipe.id).toBe(true)
    }
    // All six characters are reached, so nothing asks for a flavour this box never shows.
    expect(new Set(device.recipes.map((r) => r.character)).size).toBe(CHARACTERS.length)
  })

  it('addresses a real slot from every recipe, and reaches every slot from some recipe', () => {
    const voiceIds = new Set(device.voices.map((v) => v.id))
    for (const recipe of device.recipes) expect(voiceIds, recipe.id).toContain(recipe.voice)
    const addressed = new Set(device.recipes.map((r) => r.voice))
    expect(device.voices.map((v) => v.id).filter((id) => !addressed.has(id))).toEqual([])
  })

  it('resolves every authored recipe exactly, on the slot it names', () => {
    // The strongest form of reachability: not "the voice id exists" but "the resolver, asked for
    // this role at this character, hands back this recipe". A recipe whose role is absent from
    // its own slot's `roles` would pass the id check above and fail here.
    const assignables = expand(device)
    for (const recipe of device.recipes) {
      const member = assignables.find((a) => a.voiceId === recipe.voice)
      expect(member, recipe.id).toBeDefined()
      if (member === undefined) continue
      const where = `${recipe.id} on ${member.voiceId}`
      const resolution = resolveRecipe(device, member, recipe.role, recipe.character, 1)
      expect(resolution.outcome, where).toBe('exact')
      if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
      expect(resolution.recipe.id, where).toBe(recipe.id)
    }
  })

  it('gives every recipe something to set, and a TONE that says what the slot must hold', () => {
    for (const recipe of device.recipes) {
      const numerics = params(recipe).filter((p) => p.kind === 'numeric')
      expect(numerics.length, recipe.id).toBeGreaterThanOrEqual(2)
      expect(toneOf(recipe).trim().length, recipe.id).toBeGreaterThan(0)
      // Every instrument has both sends (p.30), so a rendered part always says where it goes.
      const names = params(recipe).map((p) => p.name)
      expect(names, recipe.id).toContain('REVERB SEND')
      expect(names, recipe.id).toContain('DELAY SEND')
    }
  })

  // -------------------------------------------------------------------------
  // §3.2 — provenance: cited ranges and option sets, provisional points
  // -------------------------------------------------------------------------

  it('cites every range and option set, and no point (§3.2)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
        // A documented bound for DECAY is not a citation for "DECAY sits at 92 for a hard kick".
        expect(param.verified, where).toBe(false)
        if (param.kind === 'numeric') {
          expect(param.range.verified, where).toMatchObject({
            kind: 'manual',
            source: expect.stringContaining(REFERENCE),
          })
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
        }
        if (param.kind === 'enum') {
          expect(param.options.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
  })

  it('cites only pages the two documents actually have', () => {
    const sources = device.recipes.flatMap(legality)
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      expect(source.startsWith(REFERENCE), source).toBe(true)
      const page = Number(source.slice(REFERENCE.length))
      expect(Number.isInteger(page), source).toBe(true)
      // The Reference Manual runs to the UTILITY tables on p.44 and stops; there is no
      // specifications section in it at all, which is why the span is cited elsewhere.
      expect(page, source).toBeGreaterThanOrEqual(4)
      expect(page, source).toBeLessThanOrEqual(44)
    }
    // Anti-vacuity: the INST table and the INST FX table are both actually reached.
    expect(sources.some((s) => s === `${REFERENCE}30`)).toBe(true)
    expect(sources.some((s) => s === `${REFERENCE}31`)).toBe(true)
  })

  it('keeps every numeric inside a range shape the tables actually print', () => {
    // pp.17-33 print seven shapes and no others. The whitelist is the point: a range invented to
    // fit a value, or a table misread, shows up here as an eighth shape rather than as a value
    // that merely looks plausible. `BALANCE` starting at 1 rather than 0 is the kind of detail
    // this catches — five different effects agree on it, and none of them is 0-255.
    const SHAPES: { min: number; max: number; step?: number; why: string }[] = [
      { min: -128, max: 127, why: 'the standard bipolar control — Tune, Color, Shuffle' },
      { min: 0, max: 255, why: 'the standard unipolar control — nearly everything' },
      { min: 1, max: 255, why: 'effect Balance, which starts at 1' },
      { min: -24, max: 24, why: 'sample Coarse Tune, in semitones' },
      { min: -50, max: 50, why: 'sample Spread' },
      { min: 0, max: 12, why: 'sample Bit Reduce' },
      { min: -1, max: 1, step: 0.01, why: 'sample Rate, the one control with a stated resolution' },
    ]
    let checked = 0
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        const where = `${recipe.id} / ${param.name}: ${param.range.min}..${param.range.max}`
        const shape = SHAPES.find((sh) => sh.min === param.range.min && sh.max === param.range.max)
        expect(shape, where).toBeDefined()
        // `step` is authored only where the manual states a resolution; everywhere else the
        // table prints integers and inventing a step would be invariant 5's territory.
        expect(param.step, where).toBe(shape?.step)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(100)
    // Every shape is reached, so none of them is a line nobody checks.
    for (const shape of SHAPES) {
      const used = device.recipes.some((r) =>
        params(r).some((p) => p.kind === 'numeric' && p.range.min === shape.min && p.range.max === shape.max),
      )
      expect(used, shape.why).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // The thing this box reaches first: a parameter table gated on the loaded tone
  // -------------------------------------------------------------------------

  describe('tone gating (p.30, p.31)', () => {
    /** Controls the manual gates on an ACB tone of one category, and the category each needs. */
    const CATEGORY_GATED: [string, string][] = [
      ['ATTACK', 'BD'],
      ['SNAPPY', 'SD'],
      ['COLOR', 'TOM'],
    ]

    /** The p.31 block the manual heads *"Sample tone only"*. */
    const SAMPLE_ONLY = ['COARSE TUNE', 'RATE', 'SPREAD', 'BIT REDUCE', 'HOLD MODE']

    it('states the category whenever it reaches past the common block', () => {
      let reached = 0
      for (const recipe of device.recipes) {
        for (const [name, category] of CATEGORY_GATED) {
          if (paramNamed(recipe, name) === undefined) continue
          reached += 1
          // Not decoration: setting SNAPPY asserts the slot holds an ACB tone of the SD
          // category, and a guide that printed the number without the requirement would be an
          // instruction the reader cannot carry out.
          expect(toneOf(recipe), `${recipe.id} / ${name}`).toContain(category)
          expect(toneOf(recipe), `${recipe.id} / ${name}`).toContain('ACB')
        }
      }
      expect(reached).toBeGreaterThan(5)
    })

    it('reaches the sample block only from a recipe that asks for a sample in the slot', () => {
      let reached = 0
      for (const recipe of device.recipes) {
        for (const name of SAMPLE_ONLY) {
          if (paramNamed(recipe, name) === undefined) continue
          reached += 1
          const tone = toneOf(recipe)
          expect(tone === 'Sample' || tone === 'Loop', `${recipe.id} / ${name}: ${tone}`).toBe(true)
        }
      }
      expect(reached).toBeGreaterThan(3)
    })

    it('names the tone family wherever COLOR means four different things', () => {
      // p.31 gives COLOR four meanings by family on one page — ambience on 808 toms, resonance
      // on 909, pitch movement on 707, ambience again on 606. "COLOR 40" without the family is
      // four instructions wearing one number.
      const colour = device.recipes.filter((r) => paramNamed(r, 'COLOR') !== undefined)
      expect(colour.length).toBeGreaterThan(0)
      for (const recipe of colour) {
        expect(toneOf(recipe), recipe.id).toMatch(/(808|909|707|606)Low\/Mid\/HighTom/)
      }
    })

    it('sets an INST FX control only under the type that has it', () => {
      // Thirteen INST FX types share one parameter slot on the panel, so a recipe that set
      // CRUSHER BALANCE while the type said LPF would render a control the reader cannot find.
      const FAMILIES: Record<string, string[]> = {
        THRU: [],
        LPF: ['LPF CUTOFF'],
        'H BOOST': ['H BOOST', 'H BOOST FREQ'],
        TRANSIENT: ['TRANSIENT ATTACK'],
        DRIVE: ['DRIVE BALANCE', 'DRIVE', 'DRIVE LEVEL'],
        'COMP+DRV': ['COMP+DRV BALANCE', 'CMP BALANCE', 'DRV BALANCE'],
        CRUSHER: ['CRUSHER BALANCE', 'SAMPLE RATE', 'CRUSHER FILTER'],
      }
      const everyFxControl = new Set(Object.values(FAMILIES).flat())
      const typesSeen = new Set<string>()

      for (const recipe of device.recipes) {
        const type = paramNamed(recipe, 'INST FX TYPE')
        expect(type?.kind, recipe.id).toBe('enum')
        if (type === undefined || type.kind !== 'enum') continue
        const allowed = FAMILIES[type.value]
        expect(allowed, `${recipe.id}: unmapped INST FX type ${type.value}`).toBeDefined()
        typesSeen.add(type.value)
        for (const param of params(recipe)) {
          if (!everyFxControl.has(param.name)) continue
          expect(allowed ?? [], `${recipe.id} / ${param.name} under ${type.value}`).toContain(param.name)
        }
      }
      // Anti-vacuity: more than one family is actually exercised, THRU included.
      expect(typesSeen.size).toBeGreaterThan(4)
      expect(typesSeen.has('THRU')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // §4.3 — patterns are the template's, articulation is the device's
  // -------------------------------------------------------------------------

  it('addresses steps only by PatternSlot, never by index or hit list', () => {
    // Deliberately *not* the TR-1000's `JSON.stringify(device)` scan for `"step"`. This box
    // authors a `step` on sample Rate — a parameter resolution the manual states, nothing to do
    // with the sequencer — so the string test would fire on a legitimate field. The claim is
    // about articulation, so it is asserted on articulation.
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')

    let entries = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        entries += 1
        const where = `${recipe.id} / ${entry.slot}`
        expect(PATTERN_SLOTS, where).toContain(entry.slot)
        expect(Object.keys(entry.set).length, where).toBeGreaterThan(0)
        // No absolute index smuggled in beside the slot.
        expect(Object.keys(entry.set).every((k) => !/^\d+$/.test(k)), where).toBe(true)
      }
    }
    expect(entries).toBeGreaterThan(15)
    // No recipe carries a pattern of its own: §4.3 makes patterns template-owned, and a device
    // that shipped hits would be authoring a genre.
    expect(device.recipes.every((r) => !('steps' in r) && !('hits' in r))).toBe(true)
  })

  it('uses every per-step lane it declares, and only declared ones', () => {
    const declared = device.features?.perStep ?? []
    expect(declared.length).toBeGreaterThan(0)
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    for (const key of used) expect(declared, key).toContain(key)
    // A lane nobody reaches for is a claim about the box that no guide ever shows.
    expect(declared.filter((k) => !used.has(k))).toEqual([])
  })

  it('resolves every articulation hint through the device table', () => {
    const hintKeys = new Set(Object.keys(device.hints ?? {}))
    let hinted = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint === undefined) continue
        hinted += 1
        expect(hintKeys, `${recipe.id} / ${entry.hint}`).toContain(entry.hint)
      }
    }
    expect(hinted).toBeGreaterThan(10)

    // The same closure for parameter hints, which reach the table by the same key.
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.hint === undefined) continue
        expect(hintKeys, `${recipe.id} / ${param.name}`).toContain(param.hint)
      }
    }
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
  })

  it('declares the flam lane no other box in the library has', () => {
    // §2.3 makes `perStep` an open per-device list precisely so two drum machines can disagree.
    // The TR-8S has SUB STEP switchable to FLAM ([SHIFT] + [SUB], p.19) and no per-step
    // probability or cycle; the TR-1000 is the other way round. Both are Roland, both sixteen
    // steps, and the lists are different — which is the claim being made here.
    const mine = device.features?.perStep ?? []
    const theirs = tr1000.features?.perStep ?? []
    expect(mine).toContain('flam')
    expect(theirs).not.toContain('flam')
    expect(mine).not.toContain('probability')
    expect(mine).not.toContain('cycle')
    expect(theirs).toContain('probability')
    expect(theirs).toContain('cycle')
    // And a recipe actually reaches for it, or the lane is an unbacked claim.
    const flams = device.recipes.filter((r) =>
      (r.articulation ?? []).some((a) => Object.keys(a.set).includes('flam')),
    )
    expect(flams.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // §6 — mood
  // -------------------------------------------------------------------------

  it('carries space on the sends and keeps it off the low parts', () => {
    let moved = 0
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        for (const entry of param.mood ?? []) {
          if (entry.axis !== 'space') continue
          moved += 1
          // §6's intent: the axis is depth, and depth on a drum machine is how much of each
          // part reaches the two kit effects. Nothing else on this box carries it.
          expect(['REVERB SEND', 'DELAY SEND'], `${recipe.id} / ${param.name}`).toContain(param.name)
        }
      }
    }
    expect(moved).toBeGreaterThan(10)

    // And the axis actually moves the rendered value at both ends. Asserted through the resolver
    // rather than as `value ± amount`, because §6.1 scales the offset by knob position and then
    // *clamps* to the range — arithmetic on the authored numbers would be testing a formula this
    // device does not have to satisfy, which is what a first draft of this test did.
    const at = (space: number, name: string) => {
      const recipe = device.recipes.find((r) => r.id === 'tr8s-clap-bright')
      if (recipe === undefined) throw new Error('no tr8s-clap-bright')
      const assignable = expand(device).find((a) => a.voiceId === recipe.voice)
      if (assignable === undefined) throw new Error('no hc assignable')
      const param = paramNamed(recipe, name)
      if (param?.kind !== 'numeric') throw new Error(`no ${name}`)
      const { value } = resolveParam(param, undefined, { ...NEUTRAL_MOOD, space })
      if (typeof value !== 'number') throw new Error(`${name} did not resolve to a number`)
      return value
    }
    for (const name of ['REVERB SEND', 'DELAY SEND']) {
      expect(at(100, name), `${name} at full space`).toBeGreaterThan(at(50, name))
      expect(at(0, name), `${name} at no space`).toBeLessThan(at(50, name))
    }

    // A low part pushed into a reverb is the one place the axis reliably makes a rig worse, so
    // kick and sub decline it — by *omitting* the offset, which is §6's way of declining an axis.
    for (const recipe of device.recipes.filter((r) => r.role === 'kick' || r.role === 'sub')) {
      for (const name of ['REVERB SEND', 'DELAY SEND']) {
        const param = paramNamed(recipe, name)
        if (param?.kind !== 'numeric') throw new Error(`${recipe.id}: ${name} not numeric`)
        expect(param.mood, `${recipe.id} / ${name}`).toBeUndefined()
      }
    }
  })

  it('puts swing on SHUFFLE and says the setting is pattern-wide', () => {
    for (const recipe of device.recipes) {
      const shuffle = paramNamed(recipe, 'SHUFFLE')
      if (shuffle?.kind !== 'numeric') throw new Error(`${recipe.id}: no SHUFFLE`)
      expect(shuffle.mood, recipe.id).toEqual([{ axis: 'swing', amount: 127 }])
      expect(shuffle.hint, recipe.id).toBe('ptn-shuffle')
      // The note has to say the value is not per-instrument, or eleven parts each printing
      // SHUFFLE 0 reads as eleven independent settings.
      expect(shuffle.note, recipe.id).toContain('Pattern-wide')
    }
  })

  // -------------------------------------------------------------------------
  // §8 — and it reaches the page
  // -------------------------------------------------------------------------

  it('renders its gated parameters as instructions a reader can carry out', () => {
    const doc = renderGuide(
      resolve({ devices: [device], template: industrialTechno, mood: NEUTRAL_MOOD, seed: 18 }),
    )
    // If the kick did not get assigned, the rest of this test is checking nothing.
    expect(doc).toContain('TR-8S')
    expect(doc).toContain('**TONE**')
    // The requirement travels with the value, which is the whole point of the TONE param.
    expect(doc).toMatch(/\*\*TONE\*\* `[^`]*BD category/)
  })
})
