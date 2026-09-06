import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AuthoredNumericParamSchema,
  KEY_FOLLOWING_ROLES,
  NEUTRAL_MOOD,
  ProvenanceSchema,
  ROLES,
  RoleRequestSchema,
  moodState,
  noteInstruction,
  renderGuide,
  resolve,
  resolveParam,
  tonicDisplacement,
  type AuthoredNumericParam,
  type KeyFollow,
  type Recipe,
  type ResolveResult,
  type ResolvedParam,
  type Role,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §4.1/#339. **A drum is tuned to the song's key, or it is not, and which drum decides.**
 *
 * The library had never taken a side and was therefore taking one: a kick authored once was
 * tuned identically in C minor and in F# minor, which is the *fixed-drum* position held silently
 * in every direction at once. #339 makes the position explicit and splits it — every tom follows,
 * a kick follows where its direction says so, and the broadband voices never do.
 *
 * Two halves meet in the middle and neither names the other. A `RoleRequest` carries `followsKey`
 * (musical, names no device); a recipe's pitch parameter carries `fundamentalPitch` (a fact about
 * a control, names no genre). Where both hold the value moves; where either is absent nothing
 * happens, and *nothing happening* is most of what this file asserts, because the failure mode
 * worth catching is a drum quietly moving in a direction that decided it should not.
 */

const cite = { kind: 'manual', source: 'Test Manual p.1' } as const

function param(over: Partial<AuthoredNumericParam> = {}): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name: 'TUNE',
    value: -3,
    range: { min: -24, max: 24, verified: cite },
    unit: 'st',
    fundamentalPitch: true,
    ...over,
  }
}

const follow = (semitones: number, key = 'test'): KeyFollow => ({ semitones, key })

const resolved = (p: AuthoredNumericParam, keyFollow?: KeyFollow, mood = NEUTRAL_MOOD) =>
  resolveParam(p, cite, mood, undefined, keyFollow)

// ---------------------------------------------------------------------------
// The arithmetic
// ---------------------------------------------------------------------------

describe('the tonic, as a displacement from C (§4.1)', () => {
  it('is zero at C, and signed elsewhere', () => {
    expect(tonicDisplacement('C major')).toBe(0)
    expect(tonicDisplacement('D major')).toBe(2)
    expect(tonicDisplacement('E aeolian')).toBe(4)
    expect(tonicDisplacement('F lydian')).toBe(5)
  })

  it('takes the shorter way round rather than always counting up', () => {
    // The whole point of the sign. `G` is a fifth above C and five semitones below it, and five
    // is the move that changes a sample least — seven semitones up is where a kick loses half
    // its length.
    expect(tonicDisplacement('G mixolydian')).toBe(-5)
    expect(tonicDisplacement('A minor')).toBe(-3)
    expect(tonicDisplacement('B aeolian')).toBe(-1)
    // Never further than six either way, over the whole circle.
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      for (const accidental of ['', '#', 'b']) {
        const d = tonicDisplacement(`${letter}${accidental} minor`)
        expect(d).toBeDefined()
        expect(Math.abs(d as number)).toBeLessThanOrEqual(6)
      }
    }
  })

  it('sends the tritone down, which is the one distance with no shorter side', () => {
    expect(tonicDisplacement('F# minor')).toBe(-6)
    expect(tonicDisplacement('Gb major')).toBe(-6)
  })

  it('reads the tonic and not the mode: a drum has no third', () => {
    const modes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']
    for (const mode of modes) expect(tonicDisplacement(`A ${mode}`)).toBe(-3)
  })

  it('spells enharmonics as the pitch class they are', () => {
    expect(tonicDisplacement('C# minor')).toBe(1)
    expect(tonicDisplacement('Db major')).toBe(1)
    expect(tonicDisplacement('B# major')).toBe(0)
  })

  it('reports nothing for a key it cannot read, rather than guessing one (invariant 5)', () => {
    expect(tonicDisplacement('H minor')).toBeUndefined()
    expect(tonicDisplacement('F sharp minor')).toBeUndefined()
    expect(tonicDisplacement('')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// One parameter
// ---------------------------------------------------------------------------

describe('a fundamental pitch, resolved against a key (§7 step 9)', () => {
  it('adds the displacement and keeps the recipe’s own offset', () => {
    // -3 is what this recipe says a hard kick sits at, relative to nothing. In G it is still
    // three semitones below the tonic, which is the character of the recipe surviving the move.
    expect(resolved(param(), follow(-5)).value).toBe(-8)
    expect(resolved(param(), follow(5)).value).toBe(2)
  })

  it('does not move at all in C, and stays `authored` there', () => {
    const out = resolved(param(), follow(0))
    expect(out.value).toBe(-3)
    expect(out.provenance.state).toBe('authored')
  })

  it('does not move where the direction did not ask', () => {
    expect(resolved(param(), undefined).value).toBe(-3)
  })

  it('does not move a parameter that is not a fundamental pitch', () => {
    // The device declining, and there is no capability field anywhere in it.
    const plain = param({ fundamentalPitch: undefined, unit: '%' })
    expect(resolved(plain, follow(-5)).value).toBe(-3)
  })

  it('is deaf to the key where the range is unverified, exactly as mood is', () => {
    // §3.2's legality gate. Moving a value inside bounds nobody checked is generating inside a
    // range that may not exist on the instrument, and the key is not exempt from that.
    const unchecked = param({ range: { min: -24, max: 24, verified: false } })
    const out = resolved(unchecked, follow(-5))
    expect(out.value).toBe(-3)
    expect(out.provenance.state).toBe('authored')
  })

  it('names the key as what moved it, where no axis did', () => {
    // The point here is cited, so a moved value is `derived` — and it has to say what derived
    // it. Before #339 that was always a mood axis; now `axes` can legitimately be empty and the
    // key is the answer instead.
    const out = resolved(param(), follow(-5))
    if (out.provenance.state !== 'derived') throw new Error('expected a derived value')
    expect(out.provenance.keySemitones).toBe(-5)
    expect(out.provenance.axes).toEqual([])
    expect(out.provenance.from).toBe(-3)
  })

  it('sums with mood once, so neither is measured from the other’s clamp', () => {
    const withMood = param({ mood: [{ axis: 'darkness', amount: -4 }] })
    // Darkness at 100 is the full -4; the key adds -5 on top, from the authored point.
    const out = resolved(withMood, follow(-5), moodState({ darkness: 100 }))
    expect(out.value).toBe(-12)
    if (out.provenance.state !== 'derived') throw new Error('expected a derived value')
    expect(out.provenance.axes).toEqual(['darkness'])
    expect(out.provenance.keySemitones).toBe(-5)
  })

  it('clamps to the range like any other move, and says what was asked for', () => {
    // The honest half of #339's cost note: a control can run out. The line shows where the dial
    // actually goes; the provenance still records what the key wanted.
    const tight = param({ value: -10, range: { min: -12, max: 12, verified: cite } })
    const out = resolved(tight, follow(-5))
    expect(out.value).toBe(-12)
    if (out.provenance.state !== 'derived') throw new Error('expected a derived value')
    expect(out.provenance.keySemitones).toBe(-5)
    expect(out.provenance.from).toBe(-10)
  })

  it('leaves a value the range swallowed whole exactly as authored', () => {
    // A displacement that changes nothing is not a move, and stamping the key on a value that
    // did not move would claim arithmetic no reader can see in the number.
    const pinned = param({ value: 24, range: { min: -24, max: 24, verified: cite } })
    const out = resolved(pinned, follow(5))
    expect(out.value).toBe(24)
    expect(out.provenance.state).toBe('authored')
    expect('keySemitones' in out.provenance).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// What the schemas refuse
// ---------------------------------------------------------------------------

describe('what the shape refuses to say (§3.1, §4.1)', () => {
  it('refuses a fundamental pitch that is not in semitones', () => {
    // #338's complaint, enforced: `TUNE 30%` is a percentage of a range no manual prints, and
    // adding five to it produces a number in no unit at all.
    expect(AuthoredNumericParamSchema.safeParse(param({ unit: '%' })).success).toBe(false)
    expect(AuthoredNumericParamSchema.safeParse(param({ unit: undefined })).success).toBe(false)
    // Either case, because a device folder spells the unit the way its own manual does.
    expect(AuthoredNumericParamSchema.safeParse(param({ unit: 'St' })).success).toBe(true)
  })

  it('refuses a fundamental pitch whose value the allocation decides', () => {
    const sourced = param({ valueFrom: 'stack-width', value: 1, range: { min: 1, max: 8, verified: cite } })
    expect(AuthoredNumericParamSchema.safeParse(sourced).success).toBe(false)
  })

  it('refuses the flag on a role with no fundamental to tune', () => {
    // The boundary #339 settled, held by the schema rather than by review. `rim` and
    // `ghost-perc` are named because they are the two the library requests in six directions and
    // the two most likely to be swept along by a kick beside them.
    const request = (role: Role) => ({
      id: `r-${role}`,
      role,
      priority: 1,
      character: 'hard' as const,
      sustain: 'continuous' as const,
      followsKey: true as const,
    })
    for (const role of ['kick', 'tom'] as Role[]) {
      expect(RoleRequestSchema.safeParse(request(role)).success, role).toBe(true)
    }
    const refused: Role[] = [
      'snare',
      'clap',
      'rim',
      'ghost-perc',
      'closed-hat',
      'open-hat',
      'ride',
      'metallic',
      'noise',
      'sub',
      'bass-mid',
      'pad',
      'lead',
      'texture',
      'riser',
    ]
    for (const role of refused) {
      expect(RoleRequestSchema.safeParse(request(role)).success, role).toBe(false)
    }
    // Every role that is not on the list, so a role added to `ROLES` later cannot quietly become
    // followable without somebody deciding it should be.
    for (const role of ROLES) {
      const allowed = KEY_FOLLOWING_ROLES.includes(role)
      expect(RoleRequestSchema.safeParse(request(role)).success, role).toBe(allowed)
    }
  })

  it('refuses a request that both names its degree and follows the key', () => {
    const base = {
      id: 'r-kick',
      role: 'kick' as Role,
      priority: 1,
      character: 'hard' as const,
      sustain: 'continuous' as const,
    }
    expect(RoleRequestSchema.safeParse({ ...base, followsKey: true }).success).toBe(true)
    expect(
      RoleRequestSchema.safeParse({
        ...base,
        followsKey: true,
        pitch: { degree: 1, baseOctave: 2 },
      }).success,
    ).toBe(false)
  })

  it('refuses a derived value that cannot say what moved it', () => {
    const common = { state: 'derived' as const, cite, rangeCite: cite, from: 5 }
    expect(ProvenanceSchema.safeParse({ ...common, axes: [] }).success).toBe(false)
    expect(ProvenanceSchema.safeParse({ ...common, axes: [], keySemitones: -5 }).success).toBe(true)
    expect(ProvenanceSchema.safeParse({ ...common, axes: ['darkness'] }).success).toBe(true)
    // Zero is a move that did not happen, and a record of one is worse than no record.
    expect(ProvenanceSchema.safeParse({ ...common, axes: [], keySemitones: 0 }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The library's own answers
// ---------------------------------------------------------------------------

/** Every request in every direction, with the direction it came from. */
const requests = TEMPLATES.flatMap((t) => t.roles.map((r) => ({ template: t.id, request: r })))

describe('which directions tune which drums (#339)', () => {
  it('tunes every tom in the library', () => {
    const toms = requests.filter((r) => r.request.role === 'tom')
    expect(toms.length).toBeGreaterThan(0)
    for (const { template, request } of toms) {
      expect(`${template}:${request.id}:${String(request.followsKey)}`).toBe(
        `${template}:${request.id}:true`,
      )
    }
  })

  it('tunes the kick in house, hip-hop and pop, and nowhere else', () => {
    const following = requests
      .filter((r) => r.request.role === 'kick' && r.request.followsKey === true)
      .map((r) => r.template)
      .sort()
    expect(following).toEqual(['hip-hop', 'lydian-house', 'major-key-electro'])
    // The other half of the same decision: techno's kick is the fixed anchor, and this asserts
    // that its direction has one to be fixed.
    expect(requests.some((r) => r.template === 'industrial-techno' && r.request.role === 'kick')).toBe(
      true,
    )
  })

  it('never tunes a voice with no useful fundamental', () => {
    // Every drum in `ROLES` that is not a kick or a tom, and the two that were missing from the
    // first draft of this list are the two the library actually requests most quietly: `rim`, a
    // click whose pitch is body resonance under a transient, and `ghost-perc`, the texture
    // between the hits. Six directions ask for one or the other, so an omission here was a real
    // hole in the assertion rather than a theoretical one.
    const fixed: Role[] = [
      'snare',
      'clap',
      'rim',
      'ghost-perc',
      'closed-hat',
      'open-hat',
      'ride',
      'metallic',
      'noise',
    ]
    // The guard on the guard: a role nobody requests cannot fail the loop below, so the roles
    // this claims to cover have to be present in the library for the claim to mean anything.
    for (const role of ['rim', 'ghost-perc'] as Role[]) {
      expect(requests.some((r) => r.request.role === role), role).toBe(true)
    }
    for (const { template, request } of requests) {
      if (!fixed.includes(request.role)) continue
      expect(`${template}:${request.id}:${String(request.followsKey)}`).toBe(
        `${template}:${request.id}:undefined`,
      )
    }
  })

  it('asks only drums to follow at all', () => {
    const roles = new Set(
      requests.filter((r) => r.request.followsKey === true).map((r) => r.request.role),
    )
    expect([...roles].sort()).toEqual(['kick', 'tom'])
  })
})

/** Every authored fundamental pitch in the library, with the recipe carrying it. */
const fundamentals = DEVICES.flatMap((device) =>
  device.recipes.flatMap((recipe: Recipe) =>
    recipe.params
      .filter((p) => p.kind === 'numeric' && p.fundamentalPitch === true)
      .map((p) => ({ device: device.id, recipe, param: p as AuthoredNumericParam })),
  ),
)

describe('which boxes offer a fundamental to tune (#339)', () => {
  it('marks some, which is what makes any of this reachable', () => {
    expect(fundamentals.length).toBeGreaterThan(0)
  })

  it('marks only the roles a direction can ask to follow', () => {
    // A `bass-mid` or a `texture` carries its own pitch already; a displacement there would move
    // it off the note it was authored at. Nothing enforces this at the schema — the request is
    // what decides — so the library is held to it here.
    for (const { device, recipe } of fundamentals) {
      expect(`${device}:${recipe.id}:${recipe.role}`).toMatch(/:(kick|tom)$/)
    }
  })

  it('cites the range it will be moved inside, or the move will not happen', () => {
    for (const { device, recipe, param: p } of fundamentals) {
      expect(`${device}:${recipe.id}:${p.name}:${String(p.range.verified !== false)}`).toBe(
        `${device}:${recipe.id}:${p.name}:true`,
      )
    }
  })

  it('leaves room for the furthest any direction can ask it to move', () => {
    // Five semitones: the largest displacement among the keys the three following directions
    // offer. A control with less room than that would clamp on a real guide rather than on a
    // theoretical F#, and the value on the line would silently be out of key.
    for (const { device, recipe, param: p } of fundamentals) {
      const label = `${device}:${recipe.id}:${p.name}`
      expect(`${label}:${String(p.value - 5 >= p.range.min && p.value + 5 <= p.range.max)}`).toBe(
        `${label}:true`,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

const device = (id: string) => {
  const found = DEVICES.find((d) => d.id === id)
  if (found === undefined) throw new Error(`no device ${id}`)
  return found
}
const template = (id: string) => {
  const found = TEMPLATES.find((t) => t.id === id)
  if (found === undefined) throw new Error(`no direction ${id}`)
  return found
}

function drumParams(
  templateId: string,
  deviceIds: string[],
  key: string,
  role: Role,
): ResolvedParam[] {
  const result = resolve({
    devices: deviceIds.map(device),
    template: template(templateId),
    mood: NEUTRAL_MOOD,
    seed: 3,
    overrides: { key },
  })
  return result.assignments.filter((a) => a.role === role).flatMap((a) => a.params)
}

const valueOf = (params: ResolvedParam[], name: string) => params.find((p) => p.name === name)?.value

describe('a whole guide, in two keys (§7, invariant 6)', () => {
  it('moves the tom with the key and leaves the kick beside it alone', () => {
    // Weave: the toms are the lead voice and follow; the kick is the anchor and does not. Both
    // parts are on one box, so this is the mechanism working at the grain it claims — per
    // request, not per device and not per role name.
    const tomE = drumParams('weave', ['polyend-tracker-mini'], 'E aeolian', 'tom')
    const tomG = drumParams('weave', ['polyend-tracker-mini'], 'G aeolian', 'tom')
    expect(valueOf(tomE, 'TUNE')).toBe(-1)
    expect(valueOf(tomG, 'TUNE')).toBe(-10)

    const kickE = drumParams('weave', ['polyend-tracker-mini'], 'E aeolian', 'kick')
    const kickG = drumParams('weave', ['polyend-tracker-mini'], 'G aeolian', 'kick')
    expect(valueOf(kickE, 'TUNE')).toBe(valueOf(kickG, 'TUNE'))
  })

  it('leaves a techno kick where it was in every key it offers', () => {
    const keys = template('industrial-techno').keys
    const values = keys.map((key) =>
      valueOf(drumParams('industrial-techno', ['polyend-tracker-mini'], key, 'kick'), 'TUNE'),
    )
    expect(new Set(values).size).toBe(1)
  })

  it('tunes a house kick, and changes nothing else on the box', () => {
    const inC = drumParams('lydian-house', ['elektron-octatrack-mkii'], 'C lydian', 'kick')
    const inF = drumParams('lydian-house', ['elektron-octatrack-mkii'], 'F lydian', 'kick')
    // C is the authored position: the displacement is zero, so the guide reads as it always did.
    expect(valueOf(inC, 'PTCH')).toBe(-2)
    expect(valueOf(inF, 'PTCH')).toBe(3)
    // Everything else on the part is byte-for-byte what it was. A key that moved a filter or a
    // decay would be this feature leaking out of the one control it is allowed to touch.
    const others = (params: ResolvedParam[]) =>
      JSON.stringify(params.filter((p) => p.name !== 'PTCH'))
    expect(others(inC)).toBe(others(inF))
  })

  it('leaves a box with no fundamental to move exactly as it was', () => {
    // The Digitakt's kick recipes tune with no semitone control, so hip-hop's request finds
    // nothing to move. That is the device declining, and it is silent by design: a fixed drum is
    // a sound rather than a hole (invariant 5 does not apply, because nothing is missing).
    const inF = drumParams('hip-hop', ['elektron-digitakt'], 'F minor', 'kick')
    const inG = drumParams('hip-hop', ['elektron-digitakt'], 'G minor', 'kick')
    expect(JSON.stringify(inF)).toBe(JSON.stringify(inG))
  })
})

// ---------------------------------------------------------------------------
// #33 — the two renderers are siblings, and they agree about this
// ---------------------------------------------------------------------------

/**
 * #33. The Markdown guide and the web guide read one `ResolveResult` and **share no ink**. So a
 * value that moves with the key has to arrive in both, and neither can be checked by the other.
 *
 * `test/golden/weave-tracker-mini.golden.md` pins the Markdown side byte for byte; nothing pinned
 * the web side, and a `Value` component that dropped `parts.from` would have rendered `-1` with
 * no sign that anything moved — a guide silently telling a reader the recipe was authored there.
 *
 * The assertion is the whole list rather than the one line, and taken in order: five `TUNE`
 * parameters reach this guide, one of them moved, and if the two renderers agree on all five
 * they agree about the mechanism rather than about a string somebody put in both files.
 */
/** Seed 18, as `test/golden/guides.ts` uses — it resolves Weave to `E aeolian`. */
const GOLDEN_GUIDE_SEED = 18

function tuneValuesFromMarkdown(result: ResolveResult): string[] {
  return renderGuide(result)
    .split('\n')
    .filter((line) => line.startsWith('- **TUNE** '))
    .map((line) => {
      const match = /^- \*\*TUNE\*\* `([^`]+)`/.exec(line)
      if (match === null) throw new Error(`unreadable value line: ${line}`)
      return match[1] as string
    })
}

function tuneValuesFromWeb(result: ResolveResult): string[] {
  const markup = renderToStaticMarkup(
    createElement(Guide, { result, seed: GOLDEN_GUIDE_SEED, layout: 'phase' }),
  )
  return markup
    .split('<div class="instruction"')
    .filter((block) => block.includes('<span class="param-name">TUNE</span>'))
    .map((block) => {
      const from = /<span class="value-from mono">([^<]*)<\/span>/.exec(block)
      const now = /<span class="value-now mono">([^<]*)<\/span>/.exec(block)
      if (now === null) throw new Error('an instruction rendered no value at all')
      return from === null ? (now[1] as string) : `${from[1] as string} → ${now[1] as string}`
    })
}

describe('both renderers say the same thing about a tuned drum (#33)', () => {
  const result = resolve({
    devices: [device('polyend-tracker-mini')],
    template: template('weave'),
    mood: NEUTRAL_MOOD,
    seed: GOLDEN_GUIDE_SEED,
  })

  it('resolves the fixture this file’s claims are made against', () => {
    // Named rather than assumed: every assertion below is about `E aeolian`, four semitones up
    // from C, and a reroll that moved the key would make them true of something else.
    expect(result.song.key).toBe('E aeolian')
  })

  it('renders the followed tom and the fixed kick identically in both', () => {
    const markdown = tuneValuesFromMarkdown(result)
    const web = tuneValuesFromWeb(result)

    // The moved tom, with its starting point kept, and the kick on the same box left alone.
    expect(markdown).toContain('-5 → -1')
    expect(markdown).toContain('-3')
    expect(web).toContain('-5 → -1')
    expect(web).toContain('-3')

    // Exactly one value moved, in each renderer independently. A renderer that started drawing
    // an arrow on the kick, or stopped drawing one on the tom, fails here rather than in a diff
    // nobody reads.
    expect(markdown.filter((v) => v.includes('→'))).toEqual(['-5 → -1'])
    expect(web.filter((v) => v.includes('→'))).toEqual(['-5 → -1'])

    // And they agree about all of it, in order.
    expect(web).toEqual(markdown)
  })
})

// ---------------------------------------------------------------------------
// The seam with #441
// ---------------------------------------------------------------------------

/**
 * §2.1/§4.1/#86/#339. **A Tracker Mini drum that follows the key is one of the seven transposed
 * recipes, so two decisions land on one `TUNE`.**
 *
 * #440 refused those recipes a `triggerNote`: `Trigger note — C5` claims the note plays the sample
 * as recorded, which is exactly what a transposed instrument makes false. #441 then wrote what the
 * reader was missing onto the `TUNE` itself — *write C5, this `TUNE` moves the sample that many
 * semitones* — and computed no compensating note, because that arithmetic would be ours carrying a
 * citation borrowed from a sentence about the untransposed case.
 *
 * #339 now moves that same number with the song's key, and the two compose rather than collide:
 * the note **describes** the control instead of repeating its value, so a key that changes the
 * number leaves the sentence true. What this asserts is that neither behaviour was dropped in
 * making room for the other — the note is still there on a moved value, and the refusal still
 * holds on a part whose tuning the key just changed.
 */
describe('the Mini keeps what #440 refused and what #441 said (#86/#339)', () => {
  const mini = device('polyend-tracker-mini')

  it('says what to write on the step on every fundamental it marks', () => {
    const marked = mini.recipes.flatMap((recipe) =>
      recipe.params
        .filter((param) => param.kind === 'numeric' && param.fundamentalPitch === true)
        .map((param) => ({ recipe, param })),
    )
    expect(marked.length).toBeGreaterThan(0)
    for (const { recipe, param: p } of marked) {
      // Every one of them is a transposed instrument, which is what makes #441's sentence the
      // right one to be carrying — and what made #440 withhold the note on the step.
      expect(`${recipe.id}:${String(recipe.mode)}`).toBe(`${recipe.id}:transposed`)
      expect(`${recipe.id}:${String(p.note?.startsWith('Write C5 on the step.'))}`).toBe(
        `${recipe.id}:true`,
      )
    }
  })

  it('keeps the note and the refusal on a part the key has just moved', () => {
    const result = resolve({
      devices: [mini],
      template: template('weave'),
      mood: NEUTRAL_MOOD,
      seed: GOLDEN_GUIDE_SEED,
      overrides: { key: 'G aeolian' },
    })
    const tom = result.assignments.find((a) => a.role === 'tom')
    if (tom === undefined) throw new Error('the fixture should place a tom')

    const tune = tom.params.find((p) => p.name === 'TUNE')
    // Five semitones down from C, on top of the recipe's own -5.
    expect(tune?.value).toBe(-10)
    expect(tune?.note).toContain('C5 with TUNE 0 is a different, untransposed patch')

    // #440's refusal, on the part whose tuning #339 just changed. Following the key gives the
    // guide no new reason to name a note, and inventing one here is what both issues refuse.
    expect(tom.triggerNote).toBeUndefined()
    expect(noteInstruction(tom).kind).toBe('none')
  })
})
