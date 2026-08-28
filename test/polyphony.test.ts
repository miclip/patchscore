import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  RecipeSchema,
  assign,
  chordVoicings,
  expand,
  moodState,
  realisationOf,
  recipesFor,
  renderGuide,
  requiredVoicePolyphony,
  resolve,
  resolveRecipe,
  scoreRecipes,
  type Assignable,
  type Device,
  type Recipe,
  type ResolveResult,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/industrial-techno'
import { Guide } from '../components/guide/guide'
import { box, keys, makeRecipe, request, withRoles } from './rigs'

/**
 * §12.4. A request's `polyphony` is a count of **notes**; a recipe's `realisation` says how
 * this box makes them. Splitting the two is the whole change: before it, "three notes" and
 * "three voices" were the same claim, so a sampler holding a chord in one sample either had to
 * lie about its polyphony or lose the part.
 *
 * The invariant these tests defend is that neither number moved. `Assignable.polyphony` is
 * still simultaneous notes (§2.2), the request is still a minimum note count (§4), and the new
 * freedom lives entirely in the recipe.
 */

const triad = withRoles([request({ id: 'r-pad', role: 'pad', character: 'dark', polyphony: 3 })])
const single = withRoles([request({ id: 'r-pad', role: 'pad', character: 'dark' })])

/** A one-note voice holding a chord in a sample. The sampler case, minimally. */
function sampler(id = 'a-sampler'): Device {
  return box(id, {
    kind: 'sampler',
    voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 1 }],
    recipes: [
      makeRecipe('smp-pad', 'pad', 'dark', 'pad', { realisation: 'sampled-chord' }),
    ],
  })
}

/** A real three-note voice. Says nothing about realisation, so it sounds its own notes. */
function polysynth(id = 'z-polysynth'): Device {
  return box(id, {
    kind: 'synth',
    voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 3 }],
    recipes: [makeRecipe('syn-pad', 'pad', 'dark', 'pad')],
  })
}

/** One note, and only a recipe that expects to sound every note itself. */
function monosynth(id = 'a-monosynth'): Device {
  return box(id, {
    kind: 'synth',
    voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 1 }],
    recipes: [makeRecipe('mono-pad', 'pad', 'dark', 'pad')],
  })
}

/** One polyphonic voice offering both routes: an exact-character sample and a distant real voice. */
function mixedVoice() {
  return box('both', {
    kind: 'synth',
    voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 3 }],
    recipes: [
      makeRecipe('exact-sampled', 'pad', 'dark', 'pad', { realisation: 'sampled-chord' }),
      makeRecipe('far-voiced', 'pad', 'hard', 'pad'),
    ],
  })
}

describe('recipe realisation (§12.4)', () => {
  it('is authored on the recipe and defaults to sounding its own notes', () => {
    const parsed = RecipeSchema.parse(makeRecipe('r', 'pad', 'dark', 'pad'))
    expect(parsed.realisation).toBeUndefined()
    expect(realisationOf(parsed)).toBe('polyphonic-voice')

    const sampled = RecipeSchema.parse(
      makeRecipe('r', 'pad', 'dark', 'pad', { realisation: 'sampled-chord' }),
    )
    expect(realisationOf(sampled)).toBe('sampled-chord')
  })

  it('rejects a realisation outside the two authored kinds', () => {
    const bad = { ...makeRecipe('r', 'pad', 'dark', 'pad'), realisation: 'multitimbral' }
    expect(RecipeSchema.safeParse(bad).success).toBe(false)
  })

  it('asks one voice for the whole note count, or for a chord sample just one', () => {
    const own = makeRecipe('own', 'pad', 'dark', 'pad')
    const sampled = makeRecipe('smp', 'pad', 'dark', 'pad', { realisation: 'sampled-chord' })
    // Capacity within one assignable (§12.4), not a number of assignables: nothing here spreads
    // a request across voices.
    expect(requiredVoicePolyphony(own, 3)).toBe(3)
    expect(requiredVoicePolyphony(sampled, 3)).toBe(1)
    // A one-note request cannot tell the two apart, which is why nothing authored before this
    // change had to be revisited.
    expect(requiredVoicePolyphony(own, 1)).toBe(1)
    expect(requiredVoicePolyphony(sampled, 1)).toBe(1)
  })
})

describe('a triad on a monophonic voice', () => {
  it('resolves when the recipe realises it from a sample', () => {
    const device = sampler()
    const result = assign({ devices: [device], template: triad, mood: moodState(), seed: 1 })

    expect(result.shortfalls).toHaveLength(0)
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.recipe.id).toBe('smp-pad')
    // The voice did not become polyphonic to make this work (§2.2).
    // One voice, and #40 makes that worth pinning: a fixed voice is not a pool, so there is
    // nothing to stack across and the sampled route is the only one there is.
    expect(result.assignments[0]?.assignables).toHaveLength(1)
    expect(result.assignments[0]?.assignables[0]?.polyphony).toBe(1)
    expect(keys(result.score).sampledChords).toBe(1)
  })

  it('is a gap when the only recipe expects to sound every note itself', () => {
    const result = assign({
      devices: [monosynth()],
      template: triad,
      mood: moodState(),
      seed: 1,
    })

    expect(result.assignments).toHaveLength(0)
    expect(result.shortfalls).toHaveLength(1)
    // Nothing in the rig reaches three notes by any route, so the fix is buying, not authoring.
    expect(result.shortfalls[0]).toMatchObject({ requestId: 'r-pad', reason: 'no-capable-voice' })
    expect(result.shortfalls[0]?.capable).toEqual([])
  })

  it('still carries a one-note part on the same recipe, uncharged', () => {
    const result = assign({ devices: [sampler()], template: single, mood: moodState(), seed: 1 })
    expect(result.assignments[0]?.recipe.id).toBe('smp-pad')
    expect(keys(result.score).sampledChords).toBe(0)
  })
})

describe('a real polyphonic voice is preferred', () => {
  it('wins the part when both routes exist in the rig', () => {
    // The sampler's id sorts first, so a tie broken by `deviceId` (§7.2) would hand it the pad.
    // Only the `sampledChords` key can produce the other answer.
    const devices = [sampler('a-sampler'), polysynth('z-polysynth')]
    const result = assign({ devices, template: triad, mood: moodState(), seed: 1 })

    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.deviceId).toBe('z-polysynth')
    expect(result.assignments[0]?.recipe.id).toBe('syn-pad')
    expect(keys(result.score).sampledChords).toBe(0)
  })

  it('takes the chord sample rather than leaving the part unmade', () => {
    // Same rig, but the real voice is busy with a part that ranks above the pad.
    const busy = withRoles([
      request({ id: 'r-stab', role: 'stab', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2, polyphony: 3 }),
    ])
    const poly = box('z-polysynth', {
      kind: 'synth',
      voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad', 'stab'], polyphony: 3 }],
      recipes: [
        makeRecipe('syn-pad', 'pad', 'dark', 'pad'),
        makeRecipe('syn-stab', 'stab', 'dark', 'pad'),
      ],
    })
    const result = assign({
      devices: [sampler('a-sampler'), poly],
      template: busy,
      mood: moodState(),
      seed: 1,
    })

    // A chord sample is a fill, not a gap: it is the right notes, held less flexibly.
    expect(result.shortfalls).toHaveLength(0)
    expect(result.assignments.find((a) => a.requestId === 'r-pad')?.deviceId).toBe('a-sampler')
    expect(keys(result.score).sampledChords).toBe(1)
  })

  it('outranks character on one voice, so a substitution is accepted to get it', () => {
    // The sampled recipe is an *exact* character match and its id sorts first. Only the
    // realisation key ranking above `recipeDistance` can produce the other answer.
    const both = mixedVoice()
    const [assignable] = expand(both)
    const ranked = scoreRecipes(both, assignable!, 'pad', 'dark', 3)
    expect(ranked.map((r) => r.recipe.id)).toEqual(['far-voiced', 'exact-sampled'])

    const result = assign({ devices: [both], template: triad, mood: moodState(), seed: 1 })
    expect(result.assignments[0]?.recipe.id).toBe('far-voiced')
    expect(result.assignments[0]?.outcome).toBe('substituted')
    expect(keys(result.score).sampledChords).toBe(0)
  })

  it('leaves a one-note part to character alone', () => {
    // The same voice, the same two recipes, one note. Realisation buys nothing here — there is
    // no chord to invert — so taking a substituted character for it would be a pure loss.
    const both = mixedVoice()
    const [assignable] = expand(both)
    expect(scoreRecipes(both, assignable!, 'pad', 'dark').map((r) => r.recipe.id)).toEqual([
      'exact-sampled',
      'far-voiced',
    ])
    expect(resolveRecipe(both, assignable!, 'pad', 'dark')).toMatchObject({
      outcome: 'exact',
      recipe: { id: 'exact-sampled' },
    })
  })

  it('outranks character across devices too, which is the global key order', () => {
    // The sampler has the character asked for; the poly synth is a substitution. Whichever key
    // sits higher in `Score` decides, and everything below is tied — one voice each, role listed
    // first on both, one device left idle either way.
    const exactSampler = box('a-sampler', {
      kind: 'sampler',
      voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 1 }],
      recipes: [makeRecipe('smp-pad', 'pad', 'dark', 'pad', { realisation: 'sampled-chord' })],
    })
    const farPoly = box('z-polysynth', {
      kind: 'synth',
      voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 3 }],
      recipes: [makeRecipe('syn-pad', 'pad', 'hard', 'pad')],
    })
    const result = assign({
      devices: [exactSampler, farPoly],
      template: triad,
      mood: moodState(),
      seed: 1,
    })

    expect(result.assignments[0]?.deviceId).toBe('z-polysynth')
    expect(result.assignments[0]?.outcome).toBe('substituted')
    const score = keys(result.score)
    expect(score.sampledChords).toBe(0)
    expect(score.recipeDistance).toBeGreaterThan(0)
  })

  it('never outranks a miss: a chord sample beats an unmade part', () => {
    const result = assign({ devices: [sampler()], template: triad, mood: moodState(), seed: 1 })
    expect(result.shortfalls).toHaveLength(0)
    expect(keys(result.score).sampledChords).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §12.4/#40 — a chord stacked across several monophonic voices
// ---------------------------------------------------------------------------

/**
 * A pool of monophonic voices with a `polyphonic-voice` pad recipe. The Tracker Mini case,
 * minimally: nothing here can sound three notes and the pool can share them out.
 */
function monoPool(id = 'a-pool', count = 4): Device {
  return box(id, {
    kind: 'groovebox',
    voices: [{ kind: 'pool', id: 'track', label: 'Track', count, roles: ['pad'], polyphony: 1 }],
    recipes: [makeRecipe('pool-pad', 'pad', 'dark', 'track')],
  })
}

describe('a chord stacked across several voices (§12.4/#40)', () => {
  it('spreads the notes across the pool rather than reporting a gap', () => {
    const result = assign({ devices: [monoPool()], template: triad, mood: moodState(), seed: 1 })

    expect(result.shortfalls).toHaveLength(0)
    expect(result.assignments).toHaveLength(1)
    const pad = result.assignments[0]
    expect(pad?.assignables).toHaveLength(3)
    // Nothing became polyphonic to make this work, which is the invariant §12.4 turns on.
    expect(pad?.assignables.every((v) => v.polyphony === 1)).toBe(true)
    // The lowest three ordinals, in reading order: the canonical member set.
    expect(pad?.assignables.map((v) => v.ordinal)).toEqual([1, 2, 3])
    // One recipe for the whole stack — it is one sound played three times, not three sounds.
    expect(pad?.recipe.id).toBe('pool-pad')
    expect(keys(result.score).stackedChords).toBe(1)
    expect(keys(result.score).sampledChords).toBe(0)
  })

  it('occupies every voice it takes, so occupancy holds one request under three keys', () => {
    const result = assign({ devices: [monoPool()], template: triad, mood: moodState(), seed: 1 })
    // §4.2's inversion, as data. The map is still `assignable -> section -> request`; what is new
    // is one request id appearing under three assignable keys.
    const holders = [...result.occupancy].map(([key, bySection]) => [key, [...bySection.values()]])
    expect(holders).toHaveLength(3)
    expect(holders.every(([, requests]) => (requests as string[]).every((r) => r === 'r-pad'))).toBe(
      true,
    )
  })

  it('charges every voice against comfortableVoices (§12.4), and is not softened', () => {
    // Four tracks, comfortable with two. A stacked triad occupies three, so it overflows by one —
    // #40 named this explicitly as the thing not to soften to make the feature look better.
    const tight = { ...monoPool(), comfortableVoices: 2 }
    const result = assign({ devices: [tight], template: triad, mood: moodState(), seed: 1 })
    expect(keys(result.score).crowdOverflow).toBe(1)
    // And it is still worth taking: crowding one voice beats missing the part outright.
    expect(result.assignments[0]?.assignables).toHaveLength(3)
  })

  it('refuses a pool too narrow to go round', () => {
    // Two tracks, three notes. There is no member set, so the request is a gap and the gap says
    // it is about the note count rather than about the role.
    const result = assign({ devices: [monoPool('a-pool', 2)], template: triad, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(0)
    expect(result.shortfalls[0]).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })
  })

  it('refuses fixed voices, however many of them declare the role', () => {
    // **The gate, and the argument for it.** Pool members are interchangeable by construction —
    // `roles`, `polyphony` and the recipe key are all per-pool (§2.2) — so every voice of a stack
    // provably runs the same patch. Three *fixed* voices are three separately authored timbres,
    // and handing them a triad would produce three sounds at three pitches rather than a chord.
    // This is §12.4's drum-machine worry, answered without a tonal-role list and without a device
    // declaration: fungibility is the property stacking needs and `kind: 'pool'` is the claim
    // that the voices have it (invariant 3).
    const three = box('a-three', {
      kind: 'drum-machine',
      voices: [
        { kind: 'fixed', id: 'lt', label: 'LT', roles: ['pad'], polyphony: 1 },
        { kind: 'fixed', id: 'mt', label: 'MT', roles: ['pad'], polyphony: 1 },
        { kind: 'fixed', id: 'ht', label: 'HT', roles: ['pad'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('lt-pad', 'pad', 'dark', 'lt'),
        makeRecipe('mt-pad', 'pad', 'dark', 'mt'),
        makeRecipe('ht-pad', 'pad', 'dark', 'ht'),
      ],
    })
    const result = assign({ devices: [three], template: triad, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(0)
    expect(result.shortfalls[0]).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })
  })

  it('refuses to stack a chord sample, which would put the whole chord on each voice', () => {
    // The two routes stay distinct all the way down, which is also why they are two `Score` keys.
    const sampledPool = box('a-pool', {
      kind: 'sampler',
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [makeRecipe('pool-pad', 'pad', 'dark', 'track', { realisation: 'sampled-chord' })],
    })
    const result = assign({ devices: [sampledPool], template: triad, mood: moodState(), seed: 1 })
    // Carried, but by the sampled route on one voice — never by three voices each sounding a chord.
    expect(result.assignments[0]?.assignables).toHaveLength(1)
    expect(keys(result.score).sampledChords).toBe(1)
    expect(keys(result.score).stackedChords).toBe(0)
  })

  it('never stacks a voice that can sound the chord on its own', () => {
    // Strictly dominated: same recipe, same character, three voices occupied instead of one. It is
    // refused at the gate rather than merely ranked last, so the search never branches on it.
    const poly = box('a-pool', {
      kind: 'synth',
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 3 },
      ],
      recipes: [makeRecipe('pool-pad', 'pad', 'dark', 'track')],
    })
    const result = assign({ devices: [poly], template: triad, mood: moodState(), seed: 1 })
    expect(result.assignments[0]?.assignables).toHaveLength(1)
    expect(keys(result.score).stackedChords).toBe(0)
  })
})

describe('what a stack ranks below, and what it ranks above (§7.1/#40)', () => {
  it('loses to a genuine polyphonic voice, which is the binding requirement', () => {
    // The pool's id sorts first, so a tie broken by `deviceId` (§7.2) would hand it the pad. Only
    // the `stackedChords` key can produce the other answer.
    const result = assign({
      devices: [monoPool('a-pool'), polysynth('z-polysynth')],
      template: triad,
      mood: moodState(),
      seed: 1,
    })
    expect(result.assignments[0]?.deviceId).toBe('z-polysynth')
    expect(result.assignments[0]?.assignables).toHaveLength(1)
    expect(keys(result.score).stackedChords).toBe(0)
  })

  it('beats a chord sample, and that ordering is the musical claim #40 left open', () => {
    // The sampler's id sorts first *and* its character is exact; the pool's is exact too, so the
    // only key that can decide is the pair `sampledChords` / `stackedChords`, in that order.
    //
    // The argument, in one line: a stack plays the voicing the hook wrote and follows a change of
    // chord quality, where a sample can only transpose what was recorded. What a stack spends is
    // voices, and `crowdOverflow` prices those two keys above — so charging it again here would
    // price one cost twice, and preferring the sample would be paying for shape it cannot deliver.
    const result = assign({
      devices: [sampler('a-sampler'), monoPool('z-pool')],
      template: triad,
      mood: moodState(),
      seed: 1,
    })
    expect(result.assignments[0]?.deviceId).toBe('z-pool')
    expect(result.assignments[0]?.assignables).toHaveLength(3)
    expect(keys(result.score).sampledChords).toBe(0)
    expect(keys(result.score).stackedChords).toBe(1)
  })

  it('loses to a chord sample once the voices cost more than the shape', () => {
    // The other half of the same ranking, and the reason it is not a preference for stacking: put
    // the pool under crowding pressure and the sample's one voice wins, because `crowdOverflow`
    // outranks both compromises. The trade is priced, not assumed.
    const tight = { ...monoPool('z-pool'), comfortableVoices: 1 }
    const result = assign({
      devices: [sampler('a-sampler'), tight],
      template: triad,
      mood: moodState(),
      seed: 1,
    })
    expect(result.assignments[0]?.deviceId).toBe('a-sampler')
    expect(keys(result.score).sampledChords).toBe(1)
    expect(keys(result.score).stackedChords).toBe(0)
  })

  it('never outranks a miss: a stacked chord beats an unmade part', () => {
    const result = assign({ devices: [monoPool()], template: triad, mood: moodState(), seed: 1 })
    expect(result.shortfalls).toHaveLength(0)
    expect(keys(result.score).stackedChords).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// The production slice: a real device, a real template, a real chord sample
// ---------------------------------------------------------------------------

describe('the Tracker Mini chord recipes (§12.4, production)', () => {
  const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
  const trackerOnly = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  const only = (id: string) => DEVICES.filter((d) => d.id === id)

  /**
   * #40. **The same box twice, differing only in how many voices it is comfortable spending.**
   *
   * With `comfortableVoices` at its authored 12 there are tracks to spare, so §7.1 plays the
   * chord across three of them. Tighten it and the third track costs more than the chord sample's
   * fixed shape, so the box renders the chord instead. That is not a quirk of the ranking: it is
   * the manual's own reason for the render procedure, which ends "Remove the other track samples
   * to free them up" (p.104). The engine arrives at the trade the box's documentation describes.
   */
  const crowded: Device[] = [{ ...tracker, comfortableVoices: 6 }]

  function padOf(devices: readonly Device[]) {
    const result = resolve({
      devices,
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    return { result, pad: result.assignments.find((a) => a.role === 'pad') }
  }

  it('plays the chord across three tracks when the box has tracks to spare', () => {
    const { pad } = padOf(trackerOnly)
    // The manual's own method: "To create chords, multiple tracks would be used when each track
    // represents a note. A triad would therefore need 3 tracks" (p.103). The recipe is the VAP
    // synth patch, unchanged — what changed is that a request may now name three voices.
    expect(pad?.recipe.id).toBe('tm-pad-soft-synth')
    expect(pad?.recipe.realisation).toBe('polyphonic-voice')
    expect(pad?.notes).toBe(3)
    expect(pad?.assignables).toHaveLength(3)
    // Every voice of the stack is one note of the chord, and none of them became polyphonic to
    // make this work (§2.2 — the invariant this whole file defends).
    expect(pad?.assignables.every((v) => v.polyphony === 1)).toBe(true)
    // One pool, one device: a stack never spans two boxes or two pools.
    expect(new Set(pad?.assignables.map((v) => v.poolId)).size).toBe(1)
    expect(new Set(pad?.assignables.map((v) => v.deviceId)).size).toBe(1)
    // Consecutive from the lowest free ordinal, which is the canonical member set.
    expect(pad?.assignables.map((v) => v.ordinal)).toEqual([2, 3, 4])
  })

  it('renders the chord to a sample instead once tracks are scarce', () => {
    const { pad } = padOf(crowded)
    // Crowding outranks both compromises (§7.1), so a box short of tracks buys the sample's
    // fixed shape to get two tracks back — and says so rather than spending them silently.
    expect(pad?.recipe.id).toBe('tm-pad-soft-chord')
    expect(pad?.recipe.realisation).toBe('sampled-chord')
    // Authored `soft`, asked for `dark`: a substitution the guide states, and the honest price
    // of the recipe sitting on the same (role, character, voice) as its VAP neighbour.
    expect(pad?.recipe.outcome).toBe('substituted')
    expect(pad?.assignables).toHaveLength(1)
    expect(pad?.assignables[0]?.polyphony).toBe(1)
    // Sample playback, so it is on the pool that can load one. Tracks 9-16 cannot (p.22).
    expect(pad?.assignables[0]?.poolId).toBe('track-sample')
  })

  it('names no sample, and cites the procedure for making one', () => {
    const { pad } = padOf(crowded)
    // #101. This used to be an `INSTRUMENT` text param, which was the only slot the shape offered
    // and made one claim while intending another: the p.104 citation sat on the *point*, badging
    // the reader's choice of sample with the manual's page. `sourceAudio` splits the two, and the
    // split is what this test now reads.
    const source = pad?.recipe.sourceAudio
    expect(source).toBeDefined()
    // Invariant 5, in the place it would be easiest to break: we do not know the reader's
    // library, so the recipe states the requirement instead of inventing a filename.
    expect(String(source?.need)).not.toMatch(/\.(wav|pti)\b/i)
    // The need is taste and carries no provenance at all — there is no page that says which
    // recording suits a soft pad, so there is nothing for a mark to be about.
    expect(source).not.toHaveProperty('provenance')
    // The procedure is the manual's, and that is where the citation goes.
    expect(source?.prep?.text).toContain('p.104')
    expect(source?.prep?.provenance.state).toBe('authored')
  })

  it('says in the guide that it costs no synth slot', () => {
    const { pad } = padOf(crowded)
    expect(pad?.recipe.routing).toContain('no synth slot')
  })

  it('costs one synth slot for the stack, not one per track (p.103)', () => {
    // The figure on p.103 puts `C5 02`, `E5 02` and `G5 02` on Tracks 1-3 — the same instrument
    // number on all three — so a stack is one instrument played from several tracks. Were it
    // otherwise, three tracks of VAP would spend all three of the project's synth slots (p.32,
    // p.146) and a stacked pad and a stacked stab could not coexist. They do, below.
    const { result } = padOf(trackerOnly)
    const pad = result.assignments.find((a) => a.role === 'pad')
    const stab = result.assignments.find((a) => a.role === 'stab')
    expect(pad?.assignables).toHaveLength(3)
    expect(stab?.assignables).toHaveLength(3)
    // And the stab's route spends none at all, because a sample instrument is not a synth.
    expect(stab?.recipe.routing).toContain('costs no synth slot')
  })

  it('loses the pad to a genuinely polyphonic voice when the rig has one', () => {
    // The Deluge track is polyphonic, so the chord can be played rather than loaded, and §7.1
    // ranks that above the character it costs — the Deluge pad is authored `soft`, not `dark`.
    const { pad } = padOf([...trackerOnly, ...only('synthstrom-deluge')])
    expect(pad?.deviceId).toBe('synthstrom-deluge')
    expect(pad?.recipe.realisation).toBe('polyphonic-voice')
    expect(pad?.recipe.outcome).toBe('substituted')
  })

  it('carries the stab from a chord sample too, on the same voice as the pad', () => {
    // `stab` is three notes on a box whose every track sounds one, exactly as `pad` is. It used
    // to be an honest gap here and the pad did not, which was a difference between two roles
    // that nothing about the machine justified — the pad had a recipe because somebody had
    // written one. Both are now reachable the same documented way (p.104, p.128).
    const { result } = padOf(crowded)
    expect(result.shortfalls.find((g) => g.role === 'stab')).toBeUndefined()
    const stab = result.assignments.find((a) => a.role === 'stab')
    expect(stab?.recipe.id).toBe('tm-stab-hard-chord')
    // Read back off the manifest rather than the assignment: `ResolvedRecipeRef` is the
    // renderer's view and carries no `realisation`, which is the field under test.
    const authored = (DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device).recipes.find(
      (r) => r.id === 'tm-stab-hard-chord',
    ) as Recipe
    expect(realisationOf(authored)).toBe('sampled-chord')
    // Still one note as far as the track is concerned, however many are heard (§12.4).
    expect(requiredVoicePolyphony(authored, 3)).toBe(1)
  })
})

/**
 * §12.4's two-part bar, as tests. A chord sample standing in for a pad has to do two things:
 * **sustain**, and **transpose per step** so it follows the harmonic cycle. A box that can hold a
 * chord and not move it plays the same chord under every degree, which is a drone that disagrees
 * with the harmony rather than a pad — so the substitution is declined and the gap is shown.
 *
 * These are the declines, asserted where someone will look when they wonder why their drum
 * machine has no pad. The evidence for each is in the manifest that declines it.
 */
describe('which boxes can hold a chord and move it, and which only hold it (§12.4)', () => {
  const only = (id: string) =>
    resolve({
      devices: DEVICES.filter((d) => d.id === id),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })

  it('authors a sampled chord for the TR-8S and not the TR-1000 (#183)', () => {
    // These two look like the same box and are not, and the difference is one printed page.
    //
    // **TR-8S: the route is open.** `Coarse Tune` is `-24–0–+24` semitones (Reference p.31), and
    // `KIT: CTRL` on p.28 is a two-row table whose second row — shown only under `CTRL Sel =
    // User` — puts `(SAMPLE) Coarse` on a `[CTRL]` knob. p.16 records `[CTRL]` knob movements
    // into steps. So the chord retunes per step and follows the progression.
    //
    // **TR-1000: still declined, and for a reason the manual does not answer rather than one it
    // denies.** `COARSE` is on the sample edit screen (p.64), reached from the `[C4]` knob of an
    // editor rather than a performance knob p.30 records; KNOB ASSIGN (p.36) would bridge it and
    // prints no target list at all. Assuming it is assignable would invent a capability.
    const tr8s = DEVICES.find((d) => d.id === 'roland-tr-8s') as Device
    expect(tr8s.recipes.filter((r) => realisationOf(r) === 'sampled-chord').length).toBeGreaterThan(0)

    const tr1000 = DEVICES.find((d) => d.id === 'roland-tr-1000') as Device
    expect(tr1000.recipes.filter((r) => realisationOf(r) === 'sampled-chord')).toEqual([])
  })

  it('carries a chord part on a TR-8S-only rig, and gaps both on a TR-1000-only one', () => {
    // The gap this used to assert for the TR-8S was one we invented — invariant 5 pointing the
    // wrong way, reporting a hole the box does not have. RC is one monophonic slot, so it holds
    // one chord part and not both; that remaining shortfall is a real constraint.
    const tr8s = only('roland-tr-8s')
    const chordParts = tr8s.assignments.filter((a) => a.role === 'pad' || a.role === 'stab')
    expect(chordParts.length).toBeGreaterThan(0)
    // Back to the authored recipe: an assignment carries a reference, not the recipe itself.
    const authored = DEVICES.find((d) => d.id === 'roland-tr-8s') as Device
    for (const part of chordParts) {
      const recipe = authored.recipes.find((r) => r.id === part.recipe.id)
      expect(recipe && realisationOf(recipe), part.recipe.id).toBe('sampled-chord')
    }

    const tr1000 = only('roland-tr-1000')
    for (const role of ['pad', 'stab']) {
      expect(tr1000.assignments.find((a) => a.role === role), role).toBeUndefined()
      expect(tr1000.shortfalls.find((g) => g.role === role), role).toBeDefined()
    }
  })

  it('still gaps the MC-101 pad on an MC-101-only rig, for the documented reason', () => {
    // The drum pool loads user samples and could hold a chord. `Key Offset` is the semitone
    // control (Reference p.47) and it is a per-pad kit setting, not step-lockable; the motion
    // recording that *is* per step reaches only track-wide Coarse Tune (pp.27-28), which would
    // detune the kick and the clap on the same steps. Declining is the honest answer: a gap says
    // "your rig cannot do this", where that advice would say "do this" and be wrong.
    const drum = DEVICES.find((d) => d.id === 'roland-mc-101') as Device
    expect(drum.recipes.filter((r) => r.voice === 'drum-pad' && realisationOf(r) === 'sampled-chord')).toEqual([])
    // And the consequence, on the rig where it bites. The three TONE tracks go to higher-priority
    // tonal parts, so `pad` is left contending for a voice that is already carrying one — while
    // eight drum pads sit unoccupied, able to load a chord sample and unable to transpose it.
    // That is the shape of the decline: the capacity exists and the capability does not.
    const result = only('roland-mc-101')
    expect(result.assignments.find((a) => a.role === 'pad')).toBeUndefined()
    const gap = result.shortfalls.find((g) => g.role === 'pad')
    expect(gap?.reason).toBe('no-room')
    if (gap?.reason !== 'no-room') throw new Error('expected no-room')
    expect(gap.because).toBe('contended')
    expect(gap.detail).toContain('TONE Track')
    // Nothing was quietly handed to a drum pad instead.
    expect(
      result.assignments.every(
        (a) => a.role !== 'pad' || a.assignables.every((v) => v.poolId !== 'drum-pad'),
      ),
    ).toBe(true)
  })

  it('adds no sampled substitute to a voice that is genuinely polyphonic', () => {
    // The Deluge pool sounds eight notes and the minilogue xd four, and both already carry a
    // real pad and stab. §7.1 ranks `polyphonic-voice` ahead of `sampled-chord` *and* ahead of
    // character fidelity for any multi-note part, so a chord-sample twin on those voices could
    // never be chosen — not rarely, never. Authoring one would ship a recipe no guide can render.
    for (const id of ['synthstrom-deluge', 'korg-minilogue-xd']) {
      const device = DEVICES.find((d) => d.id === id) as Device
      expect(device.recipes.filter((r) => realisationOf(r) === 'sampled-chord'), id).toEqual([])
    }
  })

  it('is why a real polyphonic voice takes the part off every sampled substitute', () => {
    // The rule those declines rest on, exercised rather than assumed: put the samplers and the
    // real polyphonic boxes in one rig and the pad lands on a polyphonic voice.
    const result = resolve({
      devices: DEVICES.filter((d) =>
        ['polyend-tracker-mini', 'elektron-digitakt-ii', 'korg-minilogue-xd'].includes(d.id),
      ),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    const pad = result.assignments.find((a) => a.role === 'pad')
    expect(pad?.deviceId).toBe('korg-minilogue-xd')
    // One voice, not three: a genuine polyphonic voice outranks stacking as well as sampling.
    expect(pad?.assignables).toHaveLength(1)
    expect(pad?.assignables[0]?.polyphony).toBeGreaterThanOrEqual(3)
  })
})

describe('two recipes, one voice, different polyphony demands', () => {
  const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device

  it('is the crux: the demand belongs to the recipe, not to the request', () => {
    // Same role, same device, same *voice* — and they ask different things of it. If the demand
    // lived on the request there would be one answer for `pad` on `track-sample` and these two
    // could not coexist.
    const sampleTrack = expand(tracker).find((a) => a.poolId === 'track-sample') as Assignable
    const onThatVoice = recipesFor(tracker, sampleTrack, 'pad')
    const demands = new Map(
      onThatVoice.map((r) => [r.id, requiredVoicePolyphony(r, 3)] as const),
    )

    expect(demands.get('tm-pad-soft-sample')).toBe(3)
    expect(demands.get('tm-pad-soft-chord')).toBe(1)
    expect(sampleTrack.polyphony).toBe(1)

    // So on a one-note track, exactly one of the two survives a triad — and it is not the one
    // with more parameters or a better character match, it is the one whose realisation fits.
    const usable = scoreRecipes(tracker, sampleTrack, 'pad', 'dark', 3).map((r) => r.recipe.id)
    expect(usable).toEqual(['tm-pad-soft-chord'])
    // One note, and the VAP patch is back in play.
    expect(scoreRecipes(tracker, sampleTrack, 'pad', 'dark', 1).map((r) => r.recipe.id)).toContain(
      'tm-pad-soft-sample',
    )
  })

  it('still refuses a real duplicate — same four keys, realisation included (§3)', () => {
    // Realisation widened the key; it did not remove it. Two recipes agreeing on role,
    // character, voice *and* realisation are the same recipe written twice, and the resolver
    // would have nothing to choose between them by.
    const clash = {
      ...tracker,
      recipes: [
        ...tracker.recipes,
        {
          ...(tracker.recipes.find((r) => r.id === 'tm-pad-soft-chord') as Recipe),
          id: 'tm-pad-soft-chord-twin',
        },
      ],
    }
    expect(DeviceSchema.safeParse(clash).success).toBe(false)
  })

  it('accepts the alternate realisation on the identical (role, character, voice)', () => {
    // The pair the widened key exists for. Both are `pad` + `soft` on `track-sample`; the whole
    // difference between them is how the notes are made.
    expect(DeviceSchema.safeParse(tracker).success).toBe(true)
    const softPads = tracker.recipes.filter(
      (r) => r.role === 'pad' && r.character === 'soft' && r.voice === 'track-sample',
    )
    expect(softPads.map((r) => r.id).sort()).toEqual(['tm-pad-soft-chord', 'tm-pad-soft-sample'])
  })

  it('picks between that identical pair by what the voice can actually do', () => {
    // The human's proof, and the reason the demand cannot live on the request: one request —
    // `pad`, `soft`, three notes — resolves to a *different* one of the two depending only on
    // the polyphony of the assignable in front of it. Same role, same character, same voice id.
    const monoTrack = expand(tracker).find((a) => a.poolId === 'track-sample') as Assignable
    expect(monoTrack.polyphony).toBe(1)
    expect(resolveRecipe(tracker, monoTrack, 'pad', 'soft', 3)).toMatchObject({
      outcome: 'exact',
      recipe: { id: 'tm-pad-soft-chord' },
    })

    // The same device with three notes to spare on that pool — nothing else altered — takes the
    // VAP patch, because a chord you can play beats a chord you have to load (§7.1).
    const roomy: Device = {
      ...tracker,
      voices: tracker.voices.map((v) =>
        v.id === 'track-sample' ? { ...v, polyphony: 3 } : v,
      ),
    }
    const roomyTrack = expand(roomy).find((a) => a.poolId === 'track-sample') as Assignable
    expect(resolveRecipe(roomy, roomyTrack, 'pad', 'soft', 3)).toMatchObject({
      outcome: 'exact',
      recipe: { id: 'tm-pad-soft-sample' },
    })

    // And a one-note pad takes the real voice too, at equal character — the ranking decides it,
    // not which id sorts first. `tm-pad-soft-chord` sorts before `tm-pad-soft-sample`, so an
    // id tie-break here would hand a single note a three-note sample.
    expect(resolveRecipe(roomy, roomyTrack, 'pad', 'soft', 1)).toMatchObject({
      recipe: { id: 'tm-pad-soft-sample' },
    })
    expect(resolveRecipe(tracker, monoTrack, 'pad', 'soft', 1)).toMatchObject({
      recipe: { id: 'tm-pad-soft-sample' },
    })
  })
})

describe('the guide says which realisation the reader got', () => {
  const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
  const trackerOnly = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  // #40: the box has to be short of tracks before it prefers the sample to playing the chord.
  // Same device, one field changed — see the production describe above for why that is the axis.
  const sampled = resolve({
    devices: [{ ...tracker, comfortableVoices: 6 }],
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })
  const stacked = resolve({
    devices: trackerOnly,
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })
  const voiced = resolve({
    devices: DEVICES.filter((d) => d.id === 'synthstrom-deluge'),
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })

  function html(result: ResolveResult): string {
    return renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
  }

  it('tells the reader to load a chord sample, in Markdown and in the app', () => {
    const md = renderGuide(sampled)
    const view = html(sampled)
    for (const text of [md, view]) {
      expect(text).toContain('3 notes from one sampled chord')
      expect(text).toContain('Load the chord sample(s) onto this one voice')
      // §12.4: one sample per chord, pointed at the phase that lists them rather than guessed.
      expect(text).toContain('One sample covers its chord shape at any root')
    }
    // And the device's own reason for preferring it, which the renderer never invents.
    expect(md).toContain('costs no synth slot')
    expect(view).toContain('costs no synth slot')
  })

  it('tells the reader to play three notes when the voice really is polyphonic', () => {
    const md = renderGuide(voiced)
    const view = html(voiced)
    for (const text of [md, view]) {
      expect(text).toContain('3 notes at once on one polyphonic voice')
      expect(text).toContain('It needs a genuinely polyphonic voice, not 3 separate ones')
      expect(text).not.toContain('sampled chord')
    }
  })

  it('tells the reader which voice takes which note when the chord is stacked', () => {
    const md = renderGuide(stacked)
    const view = html(stacked)
    for (const text of [md, view]) {
      // Phase 2 — where it went, and that it is one note per voice rather than three each.
      expect(text).toContain('3 notes stacked one per voice')
      // Phase 6 — the instruction that stops three voices being three different sounds.
      expect(text).toContain('one on each of 3 voices')
      expect(text).toContain('not 3 sounds')
      // Phase 4 — the half a reader cannot work out: which voice takes which note.
      expect(text).toContain('Stacked chord')
      expect(text).toContain('one note each')
      expect(text).toContain('takes the bottom of every chord')
      // And it must not tell them to load a chord, which is the other realisation entirely.
      expect(text).not.toContain('you trigger a sample')
    }
    // The voices named, in reading order, in the phase that says where the part lives.
    expect(md).toContain('Tracker Mini · Synth Track 2, Synth Track 3 and Synth Track 4')
  })

  it('says nothing at all about realisation for a one-note part', () => {
    const md = renderGuide(voiced)
    const kick = md.split('\n').find((l) => l.includes('`kick`') && l.startsWith('- '))
    const under = md.split('\n')[md.split('\n').indexOf(kick as string) + 1] as string
    // The fact strip stays three clauses wide for the parts it tells nothing new about.
    expect(under).not.toContain('note')
    expect(under.split(' · ')).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// §7.3, §12.4 — two ways to have no capable voice
// ---------------------------------------------------------------------------

describe('no-capable-voice tells apart a missing role from a missing note (§7.3)', () => {
  const rig = (id: string) => DEVICES.filter((d) => d.id === id)

  function gapFor(devices: readonly Device[], role: string) {
    const result = resolve({
      devices,
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    return { result, gap: result.shortfalls.find((g) => g.role === role) }
  }

  it('calls the TR-1000 pad `no-such-role` — the box does not do pads at all', () => {
    const { gap } = gapFor(rig('roland-tr-1000'), 'pad')
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'no-such-role' })
    if (gap?.reason !== 'no-capable-voice') throw new Error('expected no-capable-voice')
    // No voice declares `pad`, so there is nothing to name and nothing to author against.
    expect(gap.roleVoices).toEqual([])
    expect(gap.notes).toBe(3)
  })

  it('calls the CRAVE stab `polyphony` — it plays stabs, one note at a time', () => {
    // This exemplar was the Tracker Mini until it gained a `sampled-chord` stab, and the move is
    // the taxonomy working rather than a test being repaired: a box stops being an example of
    // "declares the role, cannot reach the notes" precisely when somebody authors the recipe
    // that reaches them. The CRAVE cannot be rescued the same way — it has no sampler.
    const { gap } = gapFor(rig('behringer-crave'), 'stab')
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })
    if (gap?.reason !== 'no-capable-voice') throw new Error('expected no-capable-voice')
    expect(gap.notes).toBe(3)
    // One analog voice, declaring `stab`, monophonic: named as the voice that plays the part
    // and cannot hold the chord.
    expect(gap.roleVoices.length).toBe(1)
    expect(gap.roleVoices.every((a) => a.polyphony === 1)).toBe(true)
    // `capable` still means "could have carried this part", so it stays empty. The two lists
    // are not interchangeable and merging them would make `no-recipe` unreadable.
    expect(gap.capable).toEqual([])
  })

  it('does not report the Tracker Mini pad as a gap at all — the chord recipe carries it', () => {
    // The contrast that makes the taxonomy worth having, and it is now between *boxes* rather
    // than between roles: same note count, same monophonic voice, and the Tracker Mini resolves
    // both `pad` and `stab` where the CRAVE above resolves neither. Nothing about either box's
    // polyphony differs — one can load a chord as a sample and move it per step, and the other
    // has no sampler at all.
    //
    // This used to read "`pad` resolves while `stab` does not, purely because one has a
    // `sampled-chord` recipe authored and the other does not", which was true and was also a
    // description of an authoring gap rather than of the machine. The gap is closed; the
    // taxonomy point survives it.
    const { result, gap } = gapFor(rig('polyend-tracker-mini'), 'pad')
    expect(gap).toBeUndefined()
    // #40: and it is carried by *playing* the chord across three tracks now, which is a second
    // route to the same conclusion. The taxonomy point is about the box, not about which route.
    expect(result.assignments.find((a) => a.role === 'pad')?.recipe.id).toBe('tm-pad-soft-synth')
    const stab = gapFor(rig('polyend-tracker-mini'), 'stab')
    expect(stab.gap).toBeUndefined()
    expect(stab.result.assignments.find((a) => a.role === 'stab')?.recipe.id).toBe('tm-stab-hard-note')
  })

  it('says the two things differently, in Markdown and in the app', () => {
    const noRole = resolve({
      devices: rig('roland-tr-1000'),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    const shortOfNotes = resolve({
      devices: rig('behringer-crave'),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })

    for (const text of [renderGuide(noRole), renderToStaticMarkup(createElement(Guide, { result: noRole, seed: 1 }))]) {
      expect(text).toContain('nothing in your rig plays this part')
      expect(text).not.toContain('monophonic')
    }
    for (const text of [
      renderGuide(shortOfNotes),
      renderToStaticMarkup(createElement(Guide, { result: shortOfNotes, seed: 1 })),
    ]) {
      expect(text).toContain('needs 3 notes at once; every voice here is monophonic')
      // #40/#128: and what to do about it. The CRAVE has one voice for a three-note part, so
      // there is nothing to hand-stack across, and the line says that rather than trailing off.
      expect(text).toContain('only one voice here plays it at all')
      expect(text).toContain('nothing here to spread it across')
    }

    // **Asserted per gap line, not per document.** A one-voice rig gaps a dozen parts for
    // several different reasons at once — the CRAVE's guide says "nothing in your rig plays
    // this part" about `clap` in the same list where it says the polyphony sentence about
    // `stab`. Checking the whole page for the *absence* of the other sentence only ever passed
    // because the rig it was written against happened to have no `no-such-role` gap, which is a
    // property of that rig and not of the taxonomy. The claim that matters is that each line
    // carries the right one, and the wrong one here would send someone shopping for a box they
    // already own.
    const lineFor = (result: ResolveResult, role: string) =>
      renderGuide(result)
        .split('\n')
        .find((l) => l.startsWith(`- \`${role}\``)) as string
    expect(lineFor(shortOfNotes, 'stab')).toContain(
      'needs 3 notes at once; every voice here is monophonic',
    )
    expect(lineFor(shortOfNotes, 'stab')).not.toContain('nothing in your rig plays this part')
    // `stab` rather than `pad`, which used to be this rig's `no-such-role` line and since #81
    // is not a line about the rig at all: this direction declares it is finished without a pad,
    // so its absence is reported as the direction's own judgement whatever the rig could do.
    // A drum machine declares no `stab` either, and that one the song does need.
    expect(lineFor(noRole, 'stab')).toContain('nothing in your rig plays this part')
    expect(lineFor(noRole, 'stab')).not.toContain('monophonic')
  })

  it('tells a rig with voices enough but no pool to stack it by hand (#40, #51)', () => {
    // The case the resolver deliberately does *not* automate: three separately authored voices
    // that each play the role, on three boxes. Stacking them is exactly what a person would do,
    // and exactly what the engine must not do for them — three fixed voices are three timbres
    // (see `canStackNotes`), so the choice belongs to whoever can hear them. The line therefore
    // says to do it, says how, and warns about the part the engine could not have handled.
    const mono = (id: string) =>
      box(id, {
        kind: 'synth',
        voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['pad'], polyphony: 1 }],
        recipes: [makeRecipe(`${id}-pad`, 'pad', 'dark', 'voice')],
      })
    const t = withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
    ])
    const result = resolve({
      devices: [mono('a-one'), mono('b-two'), mono('c-three')],
      template: t,
      mood: moodState(),
      seed: 1,
    })
    // Still a gap: invariant 5 — the guide does not invent an assignment it cannot make coherent.
    expect(result.assignments).toHaveLength(0)
    expect(result.shortfalls[0]).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })

    for (const text of [
      renderGuide(result),
      renderToStaticMarkup(createElement(Guide, { result, seed: 1 })),
    ]) {
      expect(text).toContain('needs 3 notes at once; every voice here is monophonic')
      expect(text).toContain('stack it by hand across all 3 voices here that play it, one note each')
      expect(text).toContain('separate voices rather than one pool')
      // The other branch's sentence must not appear: there is plenty to spread it across.
      expect(text).not.toContain('nothing here to spread it across')
    }
  })

  it('names the real ceiling when the role voices are not all monophonic', () => {
    // A four-note pad voice and a five-note request: "every voice here is monophonic" would be
    // simply false, so the general form states what the rig actually tops out at.
    const four = box('four-voice', {
      kind: 'synth',
      voices: [{ kind: 'fixed', id: 'pad', label: 'Pad', roles: ['pad'], polyphony: 4 }],
      recipes: [makeRecipe('four-pad', 'pad', 'dark', 'pad')],
    })
    const t = withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 5 }),
    ])
    const result = resolve({ devices: [four], template: t, mood: moodState(), seed: 1 })
    const gap = result.shortfalls[0]
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })

    const md = renderGuide(result)
    const view = renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
    for (const text of [md, view]) {
      expect(text).toContain('needs 5 notes at once; the most any voice here can sound is 4 notes')
      expect(text).not.toContain('monophonic')
    }
  })
})

// ---------------------------------------------------------------------------
// §4.1 / §12.4 — a hook a sampled chord cannot simply transpose through
// ---------------------------------------------------------------------------

describe('the industrial pad hook on a Tracker-only rig (i–VI–VII)', () => {
  const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
  // #40: crowded, so the pad is the *sampled* chord. With tracks to spare the same box stacks it
  // instead, and that rendering has its own describe below.
  const sampled = resolve({
    devices: [{ ...tracker, comfortableVoices: 6 }],
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })
  const played = resolve({
    devices: DEVICES.filter((d) => d.id === 'synthstrom-deluge'),
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })

  function hookOf(result: ResolveResult) {
    const choice = result.song.hooks.find((h) => h.forRole === 'pad')
    if (choice?.chosen.outcome !== 'resolved') throw new Error('pad hook did not resolve')
    return choice.chosen.hook
  }

  /**
   * The Markdown, and the app's *visible text* with its markup stripped. Asserting against the
   * text rather than the tags is what makes "both renderers say the same thing" a claim about
   * what a reader sees, rather than about two element trees that happen to contain a substring.
   */
  function views(result: ResolveResult): string[] {
    const html = renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
    return [renderGuide(result), html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')]
  }

  it('is three chords but two shapes, because VII is VI transposed', () => {
    const voicings = chordVoicings(hookOf(sampled))

    // i is `0-3-7` and VI/VII are both `0-4-7`. A sample transposes as a block and so preserves
    // its shape: no transposition turns the minor triad into a major one, and none is needed to
    // turn Db major into Eb major. Two recordings, three chords.
    expect(voicings.map((v) => v.shape.join('-'))).toEqual(['0-3-7', '0-4-7'])
    expect(voicings.map((v) => v.label)).toEqual(['A', 'B'])
    expect(voicings.map((v) => v.at.map((o) => o.step))).toEqual([[1], [65, 97]])

    // And the interval to move the reused one by: Db4 to Eb4 is a tone.
    expect(voicings.map((v) => v.at.map((o) => o.semitones))).toEqual([[0], [0, 2]])
  })

  it('stops presenting the chord as notes to enter, and says why', () => {
    for (const text of views(sampled)) {
      expect(text).toContain('you trigger a sample, you do not play these notes')
      expect(text).toContain('2 chord shapes, so 2 samples')
      expect(text).toContain('A sample transposes as a block, keeping its shape')
      expect(text).toContain('only where the shape changes')
      // The claim this replaces was false, and must not creep back in any form.
      expect(text).not.toContain('cannot be transposed')
      expect(text).not.toContain('each one needs its own sample')
    }
  })

  it('lists each shape as content to obtain, and each occurrence as one trigger', () => {
    for (const text of views(sampled)) {
      expect(text).toContain('Samples to obtain or render')
      // The chords themselves, spelled for F minor, with the shape that identifies them.
      expect(text).toMatch(/sample A[\s\S]{0,110}F3[\s\S]{0,80}shape 0-3-7/)
      expect(text).toMatch(/sample B[\s\S]{0,110}Db4[\s\S]{0,80}shape 0-4-7/)
      // Eb is never its own sample: it is B, moved.
      expect(text).not.toMatch(/sample C/)
      expect(text).toContain('Trigger')
    }
    // One trigger per occurrence, carrying its step, length, transposition and resulting chord.
    //
    // Scoped to the `pad` block, because the Tracker Mini now carries the `stab` from a chord
    // sample too and renders its own trigger list under its own heading. Splitting on the
    // heading keeps the claim exhaustive — "these three and no others *for this part*" — where
    // an `arrayContaining` would quietly stop noticing a fourth.
    const md = renderGuide(sampled)
    const padBlock = md
      .split('\n### ')
      .find((block) => block.startsWith('`pad`')) as string
    expect(padBlock).toBeDefined()
    const triggers = padBlock
      .split('\n')
      .filter((l) => /^- bar \d+ · step \d+ · sample [A-Z] · /.test(l))
    // #142. No duration on these rows, and that is the Tracker Mini's own answer rather than a
    // formatting choice: the box has no note-length field, so a number here would be a value to
    // enter into something that does not exist. The three chords abut and the last runs to the
    // end of the pattern, so there is no `OFF` to place either.
    expect(triggers).toEqual([
      '- bar 1 · step 1 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`',
      '- bar 5 · step 65 · sample B · as recorded · `Db4` (`C#4`) `F4` `Ab4` (`G#4`)',
      '- bar 7 · step 97 · sample B · +2 st · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`)',
    ])
  })

  it('keeps a changed inversion as its own sample, since transposition cannot produce it', () => {
    // Root-position major is `0-4-7`; the same chord in first inversion is `0-3-8`. Different
    // shape, so a different recording — which is the *only* thing that forces a second sample.
    const hook = hookOf(sampled)
    const root = hook.notes.filter((n) => n.step === 65)
    // Placed *after* the root-position chord, so first-appearance order reads as written.
    const inverted = root.map((n, i) =>
      i === 0 ? { ...n, step: 97, midi: n.midi + 12, note: 'Db5' } : { ...n, step: 97 },
    )
    const voicings = chordVoicings({ ...hook, notes: [...root, ...inverted] })
    expect(voicings.map((v) => v.shape.join('-'))).toEqual(['0-4-7', '0-3-8'])
  })

  it('names no filename, anywhere', () => {
    for (const text of views(sampled)) {
      expect(text).not.toMatch(/\.(wav|pti|aif|aiff)\b/i)
    }
  })

  it('leaves an ordinary polyphonic hook rendering exactly as it was', () => {
    // The same hook, the same key, on a voice that really can play it: notes to enter, one line
    // per chord, and none of the sampling apparatus.
    for (const text of views(played)) {
      expect(text).not.toContain('you trigger a sample')
      expect(text).not.toContain('Samples to obtain or render')
    }
    const md = renderGuide(played)
    expect(md).toContain(
      '- bar 1 · step 1 · sounds for 64 steps (4 bars) · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60',
    )
  })

  it('collapses repeats of one shape onto a single sample, at 0 semitones', () => {
    // A hook that plays the same chord twice needs one recording, not two — the lengths belong
    // to the trigger, not to the sample, and neither occurrence moves.
    const hook = hookOf(sampled)
    const repeated = {
      ...hook,
      notes: [
        ...hook.notes.filter((n) => n.step === 1),
        ...hook.notes.filter((n) => n.step === 1).map((n) => ({ ...n, step: 33, len: 8 })),
      ],
    }
    const voicings = chordVoicings(repeated)
    expect(voicings).toHaveLength(1)
    expect(voicings[0]?.at.map((o) => o.step)).toEqual([1, 33])
    expect(voicings[0]?.at.map((o) => o.semitones)).toEqual([0, 0])
  })
})
