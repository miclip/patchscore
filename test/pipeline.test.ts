import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  DeviceSchema,
  TRANSPORT_PREFERENCE,
  assignableKey,
  moodState,
  resolve,
  selectClockSource,
  type Device,
  type MoodState,
  type Pattern,
  type Recipe,
  type ResolveInput,
  type ResolveResult,
  type Role,
  type RoleRequest,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { device as model2400 } from '../lib/devices/tascam-model-2400/index'
import { template } from './fixtures'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MANUAL = { kind: 'manual', source: 'fixture p.1' } as const

function box(id: string, over: Partial<Device>): Device {
  return {
    id,
    name: `Box ${id}`,
    maker: 'Fixture',
    kind: 'drum-machine',
    clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'] },
    io: { main: 'stereo', individualOuts: 2, audioIn: false, usbAudio: false },
    physical: { panelSpanMm: 400, verified: { kind: 'manual', source: 'Fixture p.1' } },
    voices: [],
    recipes: [],
    ...over,
  }
}

/**
 * One kick recipe with an articulation on two slots, a mood-responsive param inside a verified
 * range, a param whose range is unverified, and a patch entry — so one assignment exercises
 * every §7 step 8 and step 9 branch at once.
 */
function kickRecipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 'drum-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'Short, hard, forward kick',
    routing: 'Keep out of the analog FX path',
    params: [
      {
        kind: 'numeric',
        name: 'TUNE',
        value: 52,
        range: { min: 0, max: 100, verified: MANUAL },
        mood: [{ axis: 'darkness', amount: -12 }],
      },
      {
        // The legality gate (§3.2): an unverified range makes this deaf to the knob, however
        // impeccable the point citation is.
        kind: 'numeric',
        name: 'DECAY',
        value: 38,
        range: { min: 0, max: 100, verified: false },
        mood: [{ axis: 'darkness', amount: -20 }],
      },
      { kind: 'text', name: 'NOTE', value: 'sits under the sub' },
    ],
    patch: [{ from: 'BD OUT', to: 'FILTER IN' }],
    articulation: [
      { slot: 'accent', set: { velocity: 110 } },
      { slot: 'last-hit', set: { cycle: 2 }, hint: 'apply-cycle' },
    ],
    verified: MANUAL,
    ...over,
  }
}

const drumBox = box('a-drum', {
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['sub', 'tom'], polyphony: 1 },
  ],
  comfortableVoices: 2,
  features: { perStep: ['velocity', 'cycle'] },
  hints: { 'apply-cycle': 'Hold STEP, MENU, C5 knob' },
  recipes: [kickRecipe()],
})

const tracker = box('b-tracker', {
  kind: 'groovebox',
  voices: [
    { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['sub', 'pad'], polyphony: 4 },
  ],
  comfortableVoices: 4,
  recipes: [
    {
      id: 'track-sub-dark',
      role: 'sub',
      character: 'dark',
      voice: 'track',
      title: 'Dark sub',
      params: [
        {
          kind: 'numeric',
          name: 'CUTOFF',
          value: 40,
          range: { min: 0, max: 127, verified: MANUAL },
        },
      ],
      verified: MANUAL,
    },
  ],
})

function request(over: Partial<RoleRequest> & Pick<RoleRequest, 'id' | 'role'>): RoleRequest {
  return { priority: 1, character: 'hard', sustain: 'continuous', ...over }
}

function kickPattern(over: Partial<Pattern> = {}): Pattern {
  return {
    id: 'p-kick-b2',
    forRole: 'kick',
    band: 2,
    length: 16,
    hits: [
      { step: 1, slot: 'downbeat' },
      { step: 5, slot: 'accent' },
      { step: 13, slot: 'last-hit' },
    ],
    ...over,
  }
}

function scene(over: Partial<Template> = {}): Template {
  return template({
    roles: [request({ id: 'r-kick', role: 'kick' })],
    patterns: [kickPattern()],
    hooks: [],
    ...over,
  })
}

function run(over: Partial<ResolveInput> = {}): ResolveResult {
  return resolve({
    devices: [drumBox],
    template: scene(),
    mood: moodState(),
    seed: 1,
    ...over,
  })
}

// ---------------------------------------------------------------------------
// The signature
// ---------------------------------------------------------------------------

describe('resolve signature (§7)', () => {
  it('takes effective objects and nothing else - no ids, no inspirations', () => {
    expectTypeOf<ResolveInput>().toEqualTypeOf<{
      devices: readonly Device[]
      template: Template
      mood: MoodState
      seed: number
    }>()
  })
})

// ---------------------------------------------------------------------------
// Pipeline ordering and data flow
// ---------------------------------------------------------------------------

describe('pipeline ordering (§7)', () => {
  it('selects a pattern for every request, including ones that became gaps', () => {
    // Step 5 runs before the search, so it cannot depend on whether the part got a voice.
    const t = scene({
      roles: [
        request({ id: 'r-kick', role: 'kick' }),
        request({ id: 'r-pad', role: 'pad', character: 'dark' }),
      ],
      patterns: [kickPattern(), kickPattern({ id: 'p-pad-b2', forRole: 'pad' })],
    })
    const result = run({ template: t })
    expect(result.gaps.map((g) => g.requestId)).toEqual(['r-pad'])
    // ...and the pad still has its rhythm selected, so the gap can say what was lost.
    // Build is energy 0.5, so band 2 is the band asked for and the fixture's variant is exact.
    expect(result.patterns.get('r-pad')?.get('Build')).toMatchObject({
      outcome: 'exact',
      pattern: { id: 'p-pad-b2' },
    })
  })

  it('selects patterns independently of the rig (§7 step 4)', () => {
    const t = scene({
      roles: [request({ id: 'r-sub', role: 'sub', character: 'dark' })],
      patterns: [kickPattern({ id: 'p-sub-b2', forRole: 'sub' })],
    })
    const onDrum = run({ devices: [drumBox], template: t })
    const onTracker = run({ devices: [tracker], template: t })
    const shape = (r: ResolveResult) =>
      JSON.stringify([...r.patterns].map(([id, m]) => [id, [...m].map(([s, sel]) => [s, sel])]))
    // Different rigs, different assignment outcomes, identical rhythms.
    expect(onDrum.gaps).not.toEqual(onTracker.gaps)
    expect(shape(onDrum)).toBe(shape(onTracker))
  })

  it('carries the whole chain through to one assignment', () => {
    const result = run()
    expect(result.assignments).toHaveLength(1)
    const a = result.assignments[0]!
    expect(a).toMatchObject({
      requestId: 'r-kick',
      role: 'kick',
      character: 'hard',
      priority: 1,
      optional: false,
      deviceId: 'a-drum',
      deviceName: 'Box a-drum',
      recipe: { id: 'drum-kick-hard', outcome: 'exact', routing: 'Keep out of the analog FX path' },
    })
    expect(assignableKey(a.assignable)).toBe('a-drum/bd')
    expect(a.sections).toEqual(['Intro', 'Build', 'Drop'])
    expect(a.patterns.map((p) => p.section)).toEqual(['Intro', 'Build', 'Drop'])
  })

  it('never hands the renderer an authored param (§3.1)', () => {
    // The recipe reference carries identity and title, not `params`: the unresolved form is
    // simply not reachable from the result, so invariant 4 cannot be bypassed by accident.
    const a = run().assignments[0]!
    expect(a.recipe).not.toHaveProperty('params')
    expect(a.recipe).not.toHaveProperty('articulation')
    expect(Object.keys(a.recipe).sort()).toEqual([
      'character',
      'id',
      'outcome',
      'realisation',
      'routing',
      'title',
    ])
  })

  it('reports the occupancy, score and search from the same run', () => {
    const result = run()
    expect([...result.occupancy.keys()]).toEqual(['a-drum/bd'])
    expect(result.search).toMatchObject({ capped: false, method: 'exhaustive' })
    expect(result.score.length).toBeGreaterThanOrEqual(5)
    expect(result.template.id).toBe('fixture-techno')
  })

  it('is deterministic for the same inputs and seed (invariant 6)', () => {
    const shape = (r: ResolveResult) =>
      JSON.stringify({
        assignments: r.assignments,
        gaps: r.gaps,
        score: r.score,
        clockSource: r.clockSource,
      })
    expect(shape(run({ seed: 42 }))).toBe(shape(run({ seed: 42 })))
  })
})

// ---------------------------------------------------------------------------
// §3.5 Recipe substitution
// ---------------------------------------------------------------------------

describe('recipe substitution surfaces in the result (§3.5)', () => {
  it('names both the character asked for and the one actually authored', () => {
    // Full grit resolves a 'hard' pinning to 'dirty' (§6.2), and only 'hard' is authored.
    const result = run({ mood: moodState({ grit: 100 }) })
    const a = result.assignments[0]!
    expect(a.character).toBe('dirty')
    expect(a.recipe).toMatchObject({ outcome: 'substituted', character: 'hard' })
  })

  it('says exact when the character resolves to what was authored', () => {
    expect(run().assignments[0]?.recipe).toMatchObject({ outcome: 'exact', character: 'hard' })
  })
})

// ---------------------------------------------------------------------------
// §6.3 Pattern fallback
// ---------------------------------------------------------------------------

describe('pattern fallback is reported, not silent (§6.3)', () => {
  it('names the band asked for and the band used', () => {
    // Drop is energy 0.9 -> band 3, and only a band-2 variant is authored.
    const result = run({ mood: moodState({ density: 100 }) })
    const drop = result.assignments[0]?.patterns.find((p) => p.section === 'Drop')
    expect(drop?.selection).toMatchObject({ outcome: 'fallback', band: 3, usedBand: 2 })
  })

  it('says so plainly when the section lands on the authored band', () => {
    // Build is energy 0.5 -> band 2, with the knob centred, which is what the fixture authors.
    const build = run().assignments[0]?.patterns.find((p) => p.section === 'Build')
    expect(build?.selection).toMatchObject({ outcome: 'exact', band: 2, usedBand: 2 })
  })

  it('gives one part a different band in each section of one guide (§6.3)', () => {
    const a = run().assignments[0]!
    // Energy 0.2 / 0.5 / 0.9 across the fixture's three sections. The template authors only
    // band 2, so two of the three are honest fallbacks rather than a silently reused variant.
    expect(a.patterns.map((p) => [p.section, p.selection.band])).toEqual([
      ['Intro', 0],
      ['Build', 2],
      ['Drop', 3],
    ])
  })

  it('omits the pattern rather than inventing one, and articulates nothing (invariant 5)', () => {
    const result = run({ template: scene({ patterns: [] }) })
    const patterns = result.assignments[0]!.patterns
    expect(patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(patterns.every((p) => p.articulation.length === 0)).toBe(true)
  })

  it('selects a different variant per section, and articulates each on its own', () => {
    const t = scene({
      patterns: [
        // Drop-only, and deliberately id-first so it wins the Drop selection. It contains no
        // accent and no last-hit, so the recipe has nothing to say about it.
        kickPattern({
          id: 'p-a-drop-only',
          band: 2,
          sections: ['Drop'],
          hits: [{ step: 1, slot: 'downbeat' }],
        }),
        kickPattern({ id: 'p-b-anywhere', band: 2 }),
      ],
    })
    const a = run({ template: t }).assignments[0]!
    const drop = a.patterns.find((p) => p.section === 'Drop')!
    const intro = a.patterns.find((p) => p.section === 'Intro')!

    expect(drop.selection.outcome !== 'none' && drop.selection.pattern.id).toBe('p-a-drop-only')
    expect(intro.selection.outcome !== 'none' && intro.selection.pattern.id).toBe('p-b-anywhere')
    // The same recipe, bound twice, against two different variants - which is the whole reason
    // articulation addresses slots rather than absolute step indices (§3).
    expect(drop.articulation).toEqual([])
    expect(intro.articulation.map((x) => x.slot)).toEqual(['accent', 'last-hit'])
  })
})

// ---------------------------------------------------------------------------
// §7 step 7 Articulation binding
// ---------------------------------------------------------------------------

describe('articulation binding (§7 step 7)', () => {
  it('binds only the slots the selected variant contains', () => {
    const a = run().assignments[0]!
    const drop = a.patterns.find((p) => p.section === 'Drop')!
    expect(drop.articulation.map((x) => x.slot)).toEqual(['accent', 'last-hit'])
    expect(drop.articulation[0]).toMatchObject({ slot: 'accent', set: { velocity: 110 }, steps: [5] })
    expect(drop.articulation[1]).toMatchObject({ slot: 'last-hit', steps: [13], hint: 'apply-cycle' })
  })

  it('drops a slot the variant has no hits in, silently', () => {
    const t = scene({
      patterns: [kickPattern({ hits: [{ step: 1, slot: 'downbeat' }] })],
    })
    const build = run({ template: t }).assignments[0]!.patterns.find(
      (p) => p.section === 'Build',
    )!
    // The recipe articulates accent and last-hit; this variant has neither.
    expect(build.articulation).toEqual([])
    expect(build.selection.outcome).toBe('exact')
  })

  it('stamps provenance on every bound entry, and never derived (§3.2)', () => {
    const drop = run().assignments[0]!.patterns[0]!
    for (const entry of drop.articulation) {
      expect(entry.provenance).toEqual({ state: 'authored', cite: MANUAL })
    }
  })
})

// ---------------------------------------------------------------------------
// §3.2 / §6.1 Mood, legality and provenance
// ---------------------------------------------------------------------------

describe('mood and provenance reach the result (§3.2, §6.1)', () => {
  it('gives every rendered value a provenance (invariant 4)', () => {
    for (const a of run().assignments) {
      for (const param of a.params) expect(param.provenance).toBeDefined()
      for (const entry of a.patch) expect(entry.provenance).toBeDefined()
    }
  })

  it('derives a value whose point and range are both verified', () => {
    const params = run({ mood: moodState({ darkness: 100 }) }).assignments[0]!.params
    expect(params.find((p) => p.name === 'TUNE')).toMatchObject({
      value: 40,
      provenance: { state: 'derived', cite: MANUAL, rangeCite: MANUAL, from: 52, axes: ['darkness'] },
    })
  })

  it('leaves a param in an unverified range untouched, however loud the knob (§3.2)', () => {
    const params = run({ mood: moodState({ darkness: 100 }) }).assignments[0]!.params
    // Same axis, same recipe, twice the amount - and it does not move, because the range is
    // the legality gate and nobody checked these bounds.
    expect(params.find((p) => p.name === 'DECAY')).toMatchObject({
      value: 38,
      provenance: { state: 'authored', cite: MANUAL },
    })
  })

  it('resolves patch entries with the recipe citation inherited', () => {
    expect(run().assignments[0]!.patch).toEqual([
      { from: 'BD OUT', to: 'FILTER IN', provenance: { state: 'authored', cite: MANUAL } },
    ])
  })

  it('applies mood after recipe resolution, not before', () => {
    // Grit picks a *different recipe* (§6.2 -> §3.5); darkness moves a *value* inside the one
    // that was picked (§6.1). Both knobs at once, and each does its own job.
    const result = run({ mood: moodState({ grit: 100, darkness: 100 }) })
    const a = result.assignments[0]!
    expect(a.recipe.outcome).toBe('substituted')
    expect(a.params.find((p) => p.name === 'TUNE')?.value).toBe(40)
  })
})

// ---------------------------------------------------------------------------
// §7.3 Gaps
// ---------------------------------------------------------------------------

describe('gaps reach the result (§7.3)', () => {
  it('carries the classified reason through unchanged', () => {
    const t = scene({
      roles: [
        request({ id: 'r-kick', role: 'kick' }),
        request({ id: 'r-acid', role: 'acid', priority: 2 }),
        request({ id: 'r-tom', role: 'tom', priority: 3 }),
      ],
    })
    const result = run({ template: t })
    const byId = new Map(result.gaps.map((g) => [g.requestId, g]))
    expect(byId.get('r-acid')?.reason).toBe('no-capable-voice')
    expect(byId.get('r-tom')?.reason).toBe('no-recipe')
    expect(byId.get('r-tom')?.capable.map((c) => c.voiceId)).toEqual(['lt'])
  })

  it('leaves a gapped request out of the assignments entirely', () => {
    const t = scene({
      roles: [request({ id: 'r-kick', role: 'kick' }), request({ id: 'r-acid', role: 'acid' })],
    })
    const result = run({ template: t })
    expect(result.assignments.map((a) => a.requestId)).toEqual(['r-kick'])
  })
})

// ---------------------------------------------------------------------------
// §7.4 Clock source
// ---------------------------------------------------------------------------

describe('clock source (§7.4)', () => {
  const din = (id: string, canSendClock = true): Device =>
    box(id, { clock: { canSendClock, canReceiveClock: true, transport: ['midi-din'] } })
  const usb = (id: string, canSendClock = true): Device =>
    box(id, { clock: { canSendClock, canReceiveClock: true, transport: ['usb'] } })

  it('prefers midi-din over usb, in that order', () => {
    expect(TRANSPORT_PREFERENCE).toEqual(['midi-din', 'usb'])
  })

  it('returns nothing when nothing in the rig can master', () => {
    expect(selectClockSource([din('a', false), usb('b', false)], new Map())).toBeUndefined()
  })

  it('considers only devices that can master', () => {
    // 'a' sorts first and carries more parts, but cannot master.
    const chosen = selectClockSource([din('a', false), usb('b')], new Map([['a', 5], ['b', 1]]))
    expect(chosen?.deviceId).toBe('b')
  })

  it('does not rank on occupied-assignable count, and reports it anyway (§12.4)', () => {
    // This case used to read "takes occupied-assignable count descending first" and assert 'z'.
    // Load ranked above everything until §7.4 replaced it with `preferredSource`; 'z' carries
    // four parts to 'a''s one and now loses, because the two are level on every key that is
    // still a key and 'a' sorts first.
    const chosen = selectClockSource([din('a'), din('z')], new Map([['a', 1], ['z', 4]]))
    expect(chosen?.deviceId).toBe('a')
    // The count still reaches the result, because the guide prints it beside the source.
    expect(chosen?.occupiedAssignables).toBe(1)
  })

  it('breaks a tie on transport, midi-din over usb', () => {
    // 'a-usb' sorts first by id and still loses to the din box.
    const chosen = selectClockSource([usb('a-usb'), din('z-din')], new Map([['a-usb', 2], ['z-din', 2]]))
    expect(chosen).toMatchObject({ deviceId: 'z-din', transport: 'midi-din' })
  })

  it('breaks a transport tie on device id, by UTF-16 code unit', () => {
    const chosen = selectClockSource([din('B'), din('a'), din('A')], new Map())
    // 'A' < 'B' < 'a' by code unit; ICU collation would put 'a' first.
    expect(chosen?.deviceId).toBe('A')
  })

  it('ranks a transport it has never heard of below both', () => {
    const exotic = box('a-exotic', {
      clock: { canSendClock: true, canReceiveClock: true, transport: ['analog-clock'] },
    })
    const chosen = selectClockSource([exotic, usb('z-usb')], new Map())
    expect(chosen).toMatchObject({ deviceId: 'z-usb', transport: 'usb' })
    // ...and if it is the only one that can master, it is still named honestly.
    expect(selectClockSource([exotic], new Map())).toMatchObject({
      deviceId: 'a-exotic',
      transport: 'analog-clock',
    })
  })

  it('takes no seed - rerolling a pattern must not re-cable the rig', () => {
    const seeds = [1, 2, 3, 4, 5, 99]
    const chosen = new Set(seeds.map((seed) => run({ seed })).map((r) => r.clockSource?.deviceId))
    expect([...chosen]).toEqual(['a-drum'])
  })

  it('comes through resolve with the load the assignment actually produced', () => {
    const t = scene({
      roles: [
        request({ id: 'r-kick', role: 'kick' }),
        request({ id: 'r-sub', role: 'sub', character: 'dark' }),
      ],
    })
    const result = run({ devices: [drumBox, tracker], template: t })
    // The kick is on the drum box, the sub on the tracker: one occupied assignable each, so
    // the tie falls to transport and then to id.
    expect(result.clockSource).toMatchObject({ occupiedAssignables: 1 })
    expect(result.clockSource?.deviceId).toBe('a-drum')
  })
})

// ---------------------------------------------------------------------------
// §7.4 Clock semantics, which replaced load as the ranking
// ---------------------------------------------------------------------------

describe('clock source ranks on semantics, not on load (§7.4)', () => {
  /** A bidirectional box on midi-din: the ordinary case, and the thing that must lose below. */
  const both = (id: string): Device =>
    box(id, { clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'] } })
  /** Can send clock, cannot receive it — and is *not* preferred by that alone. */
  const sourceOnly = (id: string): Device =>
    box(id, { clock: { canSendClock: true, canReceiveClock: false, transport: ['midi-din'] } })
  /** The manifest's own topology judgement: this box's job in a rig is to drive it. */
  const preferred = (id: string, over: Partial<Device['clock']> = {}): Device =>
    box(id, {
      clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'], preferredSource: true, ...over },
    })

  it('takes an idle preferred source over a groovebox carrying the whole track', () => {
    // Every tie-break below `preferredSource` is stacked against the sequencer: it sorts last by
    // id, it is on the slower transport, and it is carrying nothing at all while the groovebox
    // carries eight parts. Under the old ranking the groovebox won on the first key.
    const sequencer = preferred('z-sequencer', { transport: ['usb'] })
    const groovebox = both('a-groovebox')
    const chosen = selectClockSource([groovebox, sequencer], new Map([['a-groovebox', 8], ['z-sequencer', 0]]))
    expect(chosen?.deviceId).toBe('z-sequencer')
    // And the load still reaches the page — it is rendered, it just does not rank.
    expect(chosen?.occupiedAssignables).toBe(0)
  })

  it('does not prefer a source-only box for being source-only', () => {
    // `!canReceiveClock` was a ranking key for exactly one revision, and this is the case that
    // says it is gone. A box that cannot receive clock is not thereby the right thing to clock a
    // rig from — it simply runs free, which the guide states by name — and inferring intent from
    // a capability is the job `preferredSource` exists to make someone do on purpose.
    const recorder = sourceOnly('z-recorder')
    const groovebox = both('a-groovebox')
    const chosen = selectClockSource([groovebox, recorder], new Map([['a-groovebox', 6], ['z-recorder', 0]]))
    expect(chosen?.deviceId).toBe('a-groovebox')
    // Say it so, and it wins — on the claim rather than on the wiring.
    const claimed = { ...recorder, clock: { ...recorder.clock, preferredSource: true } }
    expect(selectClockSource([groovebox, claimed], new Map())?.deviceId).toBe('z-recorder')
  })

  it('leaves several preferred sources of the same kind to the ordinary tie-breaks', () => {
    // The field says "this box can lead", not "this box leads over that one", so two preferred
    // boxes of the same kind still fall through to transport and then id.
    const chosen = selectClockSource(
      [preferred('z-din'), preferred('a-usb', { transport: ['usb'] })],
      new Map([['a-usb', 9], ['z-din', 0]]),
    )
    expect(chosen).toMatchObject({ deviceId: 'z-din', transport: 'midi-din' })
    expect(selectClockSource([preferred('b'), preferred('a')], new Map())?.deviceId).toBe('a')
  })

  /**
   * **The one place `kind` reaches into §7.4, and the case that forced it.**
   *
   * Two boxes can both honestly claim `preferredSource` — a recorder transport a studio runs to,
   * and a dedicated sequencer whose whole job is driving a rig. Until this rule, that tie fell
   * through to transport, so a mixing desk with a 5-pin DIN socket outranked a sequencer whose
   * clock leaves over USB. Which socket a box happens to carry was never meant to decide who
   * leads, and that is what key 2 exists to stop.
   */
  describe('a sequencer among preferred sources (§7.4 key 2)', () => {
    /** The real shape: a zero-assignable sequencer on USB and analog clock. */
    const metropolix = box('z-metropolix', {
      kind: 'sequencer',
      voices: [],
      recipes: [],
      clock: {
        canSendClock: true,
        canReceiveClock: true,
        transport: ['usb', 'analog-clock'],
        preferredSource: true,
      },
    })

    it('outranks a preferred desk that is heavier, faster and earlier in the alphabet', () => {
      // Every remaining key is stacked against the sequencer: `tascam-model-2400` sorts first,
      // its `midi-din` beats `usb`, and it is carrying parts while the sequencer carries none.
      const chosen = selectClockSource(
        [model2400, metropolix],
        new Map([[model2400.id, 7], ['z-metropolix', 0]]),
      )
      expect(chosen?.deviceId).toBe('z-metropolix')
      // And the desk really did claim it, or this proves nothing about the preferred tier.
      expect(model2400.clock.preferredSource).toBe(true)
      expect(model2400.clock.transport[0]).toBe('midi-din')
      expect(chosen?.occupiedAssignables).toBe(0)
    })

    it('gains nothing from being a sequencer without the authored claim', () => {
      // The scope of the rule, stated as a test. Drop `preferredSource` and the sequencer is
      // ranked exactly as any other box: the desk's authored claim wins on key 1.
      const unclaimed = { ...metropolix, clock: { ...metropolix.clock, preferredSource: undefined } }
      expect(selectClockSource([model2400, unclaimed], new Map())?.deviceId).toBe(model2400.id)
      // And against an *unpreferred* ordinary box it still wins only on the ordinary keys —
      // 'a-groovebox' sorts first and shares no transport preference with it.
      const groovebox = both('a-groovebox')
      expect(selectClockSource([groovebox, unclaimed], new Map())?.deviceId).toBe('a-groovebox')
    })

    it('still falls to transport and id between two preferred sequencers', () => {
      const other = box('a-other-seq', {
        kind: 'sequencer',
        clock: {
          canSendClock: true,
          canReceiveClock: true,
          transport: ['midi-din'],
          preferredSource: true,
        },
      })
      // Both are sequencers, so key 2 is level and midi-din takes it.
      expect(selectClockSource([metropolix, other], new Map())?.deviceId).toBe('a-other-seq')
    })
  })

  it('ignores load entirely, at every position in the ranking', () => {
    // The same three rigs resolved twice with the load map inverted. Nothing may move.
    const rigs: Device[][] = [
      [both('a'), both('z')],
      [both('a'), sourceOnly('z')],
      [preferred('a'), both('z')],
      [both('a'), preferred('z')],
    ]
    for (const rig of rigs) {
      const ids = rig.map((d) => d.id)
      const heavyFirst = new Map(ids.map((id, i) => [id, i === 0 ? 9 : 0]))
      const heavyLast = new Map(ids.map((id, i) => [id, i === 0 ? 0 : 9]))
      const where = ids.join(' vs ')
      expect(selectClockSource(rig, heavyFirst)?.deviceId, where).toBe(
        selectClockSource(rig, heavyLast)?.deviceId,
      )
      expect(selectClockSource(rig, new Map())?.deviceId, where).toBe(
        selectClockSource(rig, heavyLast)?.deviceId,
      )
    }
  })

  it('still falls through to transport and then id once semantics tie', () => {
    // Two source-only boxes: the earlier keys are level, so the old lower keys decide as before.
    const usbOnly = box('a-usb', {
      clock: { canSendClock: true, canReceiveClock: false, transport: ['usb'] },
    })
    expect(selectClockSource([usbOnly, sourceOnly('z-din')], new Map())?.deviceId).toBe('z-din')
    expect(selectClockSource([sourceOnly('B'), sourceOnly('a'), sourceOnly('A')], new Map())?.deviceId).toBe('A')
  })

  it('refuses a preferred source that cannot send clock', () => {
    // The field is meaningless without `canSendClock`, so the schema rejects the pair rather than
    // ignoring it and leaving a manifest that reads as if it made a claim.
    const contradictory = {
      ...both('a'),
      clock: { canSendClock: false, canReceiveClock: true, transport: ['midi-din'], preferredSource: true },
    }
    const parsed = DeviceSchema.safeParse(contradictory)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('preferredSource')
    // And the ordinary omission is still legal, which is how every shipped manifest spells it.
    expect(DeviceSchema.safeParse(both('a')).success).toBe(true)
  })

  it('is claimed by exactly one box in the library, and omitted rather than falsified elsewhere', () => {
    // Absent and `false` rank identically, so a second spelling would only invite an author to
    // write it out eight times. The Model 2400 is the one manifest whose manual describes a box
    // a room runs to; the evidence lives in that file, not here.
    const claimed = DEVICES.filter((d) => d.clock.preferredSource === true)
    expect(claimed.map((d) => d.id)).toEqual(['tascam-model-2400'])
    for (const device of DEVICES) {
      if (device.clock.preferredSource === true) continue
      expect(device.clock.preferredSource, device.id).toBeUndefined()
    }
  })

  it('leaves a rig with no authored preference to deterministic tie-breaks alone', () => {
    // The cost, stated as a test rather than only in DESIGN.md §7.4. Every bidirectional
    // instrument in the library is unpreferred and on midi-din, so an instrument-only rig is
    // clocked by whichever id sorts first — not by what it carries, and not by any judgement.
    const instruments = DEVICES.filter((d) => d.clock.canSendClock && d.clock.preferredSource !== true)
    expect(instruments.length).toBeGreaterThan(4)
    const heavy = new Map(instruments.map((d, i) => [d.id, instruments.length - i]))
    const first = [...instruments].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]
    expect(selectClockSource(instruments, heavy)?.deviceId).toBe(first?.id)
  })
})

