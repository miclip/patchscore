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
    expect(result.shortfalls.map((g) => g.requestId)).toEqual(['r-pad'])
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
    expect(onDrum.shortfalls).not.toEqual(onTracker.shortfalls)
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
    expect(a.assignables.map(assignableKey)).toEqual(['a-drum/bd'])
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
        gaps: r.shortfalls,
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
    const byId = new Map(result.shortfalls.map((g) => [g.requestId, g]))
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

  it('returns nothing when nothing in the rig can send clock', () => {
    expect(selectClockSource([din('a', false), usb('b', false)], new Map())).toBeUndefined()
  })

  it('considers only devices that can send clock', () => {
    // 'a' sorts first and carries more parts, but cannot send clock.
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

  /**
   * §7.4. **Ranked on what the box can send, not on everything it declares.**
   *
   * This ranked `clock.transport` — both directions at once — and the Mother-32 is the box that
   * showed what that costs. It receives clock over MIDI DIN and sends only pulses at
   * `OUT · ASSIGN`, so the undirected list ranked it at `midi-din` and the guide printed
   * "Clock source — Mother-32 over `midi-din`. Sync everything else to it." over a socket the
   * instrument does not have.
   */
  describe('ranks on send transports (§7.4)', () => {
    const asymmetric = (id: string): Device =>
      box(id, {
        clock: {
          canSendClock: true,
          canReceiveClock: true,
          transport: ['midi-din', 'analog-clock'],
          sendTransport: ['analog-clock'],
          receiveTransport: ['midi-din', 'analog-clock'],
        },
      })

    it('names the transport a box can actually send on, not one it can only receive', () => {
      const chosen = selectClockSource([asymmetric('a')], new Map())
      expect(chosen).toMatchObject({ deviceId: 'a', transport: 'analog-clock' })
    })

    it('does not let a receive-only midi-din outrank a real midi-din sender', () => {
      // 'a' sorts first by id and carries `midi-din` in `transport`, but only inbound. Ranking on
      // the undirected list elected it and then named a wire it has no socket for.
      const chosen = selectClockSource([asymmetric('a'), usb('z-usb')], new Map())
      expect(chosen).toMatchObject({ deviceId: 'z-usb', transport: 'usb' })
    })

    it('falls back to the winner\'s own send transport when the preference list ranks none of them', () => {
      // `TRANSPORT_PREFERENCE` knows `midi-din` and `usb`. A box that sends only over
      // `analog-clock` ranks past the end of it, and the fallback must still be a wire the box
      // can send on — reading `clock.transport[0]` here would reintroduce the whole defect at the
      // one line that survives the ranking.
      expect(TRANSPORT_PREFERENCE).not.toContain('analog-clock')
      const chosen = selectClockSource([asymmetric('a')], new Map())
      expect(chosen?.transport).toBe('analog-clock')
    })
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
    const preferredBox = preferred('z-preferred-box', { transport: ['usb'] })
    const groovebox = both('a-groovebox')
    const chosen = selectClockSource(
      [groovebox, preferredBox],
      new Map([['a-groovebox', 8], ['z-preferred-box', 0]]),
    )
    expect(chosen?.deviceId).toBe('z-preferred-box')
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
   * **`kind` is not a ranking key, and for one revision it was.** That revision ranked
   * `kind: 'sequencer'` above other preferred boxes, to settle the case where two manifests each
   * honestly claim the field. It was the same mistake as the source-only rule one tier down: an
   * inference standing in for a claim. Where two boxes have each said "my job is to drive a rig",
   * §7.4 has no basis to rank them — the repair is for one of them not to claim it.
   *
   * Kept as a test rather than only deleted, because this is the third time in one section that
   * something a box *can be* was let stand in for something a person decided.
   */
  it('gives a sequencer no rank for being a sequencer, preferred or not', () => {
    const sequencer = box('z-sequencer-kind', {
      kind: 'sequencer',
      voices: [],
      recipes: [],
      clock: { canSendClock: true, canReceiveClock: true, transport: ['usb'] },
    })
    const groovebox = both('a-groovebox')
    // Unpreferred: decided by transport, then id. The groovebox wins on both.
    expect(selectClockSource([groovebox, sequencer], new Map())?.deviceId).toBe('a-groovebox')

    // Preferred on both sides: still transport, then id. Being a sequencer adds nothing.
    const bothPreferred = [
      { ...sequencer, clock: { ...sequencer.clock, preferredSource: true } },
      { ...groovebox, clock: { ...groovebox.clock, preferredSource: true } },
    ]
    expect(selectClockSource(bothPreferred, new Map())?.deviceId).toBe('a-groovebox')

    // And the authored claim still decides when only one side makes it.
    expect(
      selectClockSource(
        [groovebox, { ...sequencer, clock: { ...sequencer.clock, preferredSource: true } }],
        new Map(),
      )?.deviceId,
    ).toBe('z-sequencer-kind')
  })

  it('is claimed by two devices, and omitted rather than falsified elsewhere', () => {
    // Metropolix, whose entire output is timing and control for other boxes, and the Tracker
    // Mini, whose manual calls it "a perfect fit for the centre piece of a setup" (p.283) and
    // draws it leading as the first of its typical configurations (p.287). Both claims are about
    // what the box *is for*. The Model 2400 claimed it for two commits on the strength of a manual
    // proving only that a desk *can* generate clock and cannot receive it — capability promoted
    // into preference — and no longer does. Absent and `false` rank identically, so there is one
    // spelling for "no claim" rather than two.
    //
    // **Two is not a problem to be resolved** (§7.4/#80). The field says "this box can lead", not
    // "this box leads over that one", so a rig holding both falls through to transport and id —
    // and that fall-through between two authored leaders is a justified tie, where the same
    // arithmetic between everything that merely *can* send clock is an alphabetical accident. The
    // test below is the one that pins the difference.
    expect(DEVICES.filter((d) => d.clock.preferredSource === true).map((d) => d.id)).toEqual([
      'intellijel-metropolix',
      'polyend-tracker-mini',
    ])
    for (const device of DEVICES) {
      if (device.clock.preferredSource === true) continue
      expect(device.clock.preferredSource, device.id).toBeUndefined()
    }
  })

  it('decides the Deluge + Tracker Mini + TR-1000 rig on a claim, not on the alphabet (#80)', () => {
    // **#80's done-when, as a test.** Before the nine decisions were authored, all three of these
    // boxes merely *could* send clock and all three declare `midi-din`, so the source fell to
    // `deviceId` ascending — `polyend-` before `roland-` before `synthstrom-` — and the reader was
    // told to clock the rig from whichever box happened to sort first. The answer is the same box
    // now and the *basis* is not: the Tracker Mini is the only one of the three whose manual says
    // driving a rig is its job, and the other two carry a recorded non-claim.
    const rig = DEVICES.filter((d) =>
      ['synthstrom-deluge', 'polyend-tracker-mini', 'roland-tr-1000'].includes(d.id),
    )
    expect(rig).toHaveLength(3)
    expect(rig.filter((d) => d.clock.preferredSource === true).map((d) => d.id)).toEqual([
      'polyend-tracker-mini',
    ])
    expect(selectClockSource(rig, new Map())?.deviceId).toBe('polyend-tracker-mini')

    // The claim is load-bearing rather than incidentally agreeing with the alphabet: give the
    // Deluge the claim instead and the source moves to a box that sorts *last* of the three.
    const moved = rig.map((d) => ({
      ...d,
      clock: { ...d.clock, preferredSource: d.id === 'synthstrom-deluge' ? true : undefined },
    }))
    expect(selectClockSource(moved, new Map())?.deviceId).toBe('synthstrom-deluge')
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
