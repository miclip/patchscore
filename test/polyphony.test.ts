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

    expect(result.gaps).toHaveLength(0)
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.recipe.id).toBe('smp-pad')
    // The voice did not become polyphonic to make this work (§2.2).
    expect(result.assignments[0]?.assignable.polyphony).toBe(1)
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
    expect(result.gaps).toHaveLength(1)
    // Nothing in the rig reaches three notes by any route, so the fix is buying, not authoring.
    expect(result.gaps[0]).toMatchObject({ requestId: 'r-pad', reason: 'no-capable-voice' })
    expect(result.gaps[0]?.capable).toEqual([])
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
    expect(result.gaps).toHaveLength(0)
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
    expect(result.gaps).toHaveLength(0)
    expect(keys(result.score).sampledChords).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// The production slice: a real device, a real template, a real chord sample
// ---------------------------------------------------------------------------

describe('the Tracker Mini chord pad (§12.4, production)', () => {
  const trackerOnly = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  const only = (id: string) => DEVICES.filter((d) => d.id === id)

  function padOf(devices: readonly Device[]) {
    const result = resolve({
      devices,
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    return { result, pad: result.assignments.find((a) => a.role === 'pad') }
  }

  it('carries the industrial pad on a Tracker-only rig, from the sampled-chord recipe', () => {
    const { pad } = padOf(trackerOnly)
    // Before the split this was a gap: the template asks for three simultaneous notes and every
    // track on this box sounds one (manual p.104). Nothing about the box changed — the recipe
    // now says how the three are made.
    expect(pad?.recipe.id).toBe('tm-pad-soft-chord')
    expect(pad?.recipe.realisation).toBe('sampled-chord')
    // Authored `soft`, asked for `dark`: a substitution the guide states, and the honest price
    // of the recipe sitting on the same (role, character, voice) as its VAP neighbour.
    expect(pad?.recipe.outcome).toBe('substituted')
    expect(pad?.notes).toBe(3)
    expect(pad?.assignable.polyphony).toBe(1)
    // Sample playback, so it is on the pool that can load one. Tracks 9-16 cannot (p.22).
    expect(pad?.assignable.poolId).toBe('track-sample')
  })

  it('names no sample, and cites the procedure for making one', () => {
    const { pad } = padOf(trackerOnly)
    const instrument = pad?.params.find((p) => p.name === 'INSTRUMENT')
    expect(instrument).toBeDefined()
    // Invariant 5, in the place it would be easiest to break: we do not know the reader's
    // library, so the recipe states the requirement instead of inventing a filename.
    expect(String(instrument?.value)).not.toMatch(/\.(wav|pti)\b/i)
    expect(instrument?.note).toContain('p.104')
    expect(instrument?.provenance.state).toBe('authored')
  })

  it('says in the guide that it costs no synth slot', () => {
    const { pad } = padOf(trackerOnly)
    expect(pad?.recipe.routing).toContain('no synth slot')
  })

  it('loses the pad to a genuinely polyphonic voice when the rig has one', () => {
    // The Deluge track is polyphonic, so the chord can be played rather than loaded, and §7.1
    // ranks that above the character it costs — the Deluge pad is authored `soft`, not `dark`.
    const { pad } = padOf([...trackerOnly, ...only('synthstrom-deluge')])
    expect(pad?.deviceId).toBe('synthstrom-deluge')
    expect(pad?.recipe.realisation).toBe('polyphonic-voice')
    expect(pad?.recipe.outcome).toBe('substituted')
  })

  it('leaves the stab an honest gap on a Tracker-only rig', () => {
    // `stab` is three notes too, and nothing here authors a chord sample for it. Invariant 5:
    // the hole is shown rather than filled with a monophonic bleep called a stab.
    const { result } = padOf(trackerOnly)
    expect(result.assignments.find((a) => a.role === 'stab')).toBeUndefined()
    expect(result.gaps.find((g) => g.role === 'stab')?.reason).toBe('no-capable-voice')
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
  const trackerOnly = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  const sampled = resolve({
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
    return renderToStaticMarkup(createElement(Guide, { result }))
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
    return { result, gap: result.gaps.find((g) => g.role === role) }
  }

  it('calls the TR-1000 pad `no-such-role` — the box does not do pads at all', () => {
    const { gap } = gapFor(rig('roland-tr-1000'), 'pad')
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'no-such-role' })
    if (gap?.reason !== 'no-capable-voice') throw new Error('expected no-capable-voice')
    // No voice declares `pad`, so there is nothing to name and nothing to author against.
    expect(gap.roleVoices).toEqual([])
    expect(gap.notes).toBe(3)
  })

  it('calls the Tracker Mini stab `polyphony` — it plays stabs, one note at a time', () => {
    const { gap } = gapFor(rig('polyend-tracker-mini'), 'stab')
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })
    if (gap?.reason !== 'no-capable-voice') throw new Error('expected no-capable-voice')
    expect(gap.notes).toBe(3)
    // Both pools declare `stab` and both are monophonic, so all sixteen tracks are named as
    // voices that play the part and cannot hold the chord.
    expect(gap.roleVoices.length).toBe(16)
    expect(gap.roleVoices.every((a) => a.polyphony === 1)).toBe(true)
    // `capable` still means "could have carried this part", so it stays empty. The two lists
    // are not interchangeable and merging them would make `no-recipe` unreadable.
    expect(gap.capable).toEqual([])
  })

  it('does not report the Tracker Mini pad as a gap at all — the chord recipe carries it', () => {
    // The contrast that makes the taxonomy worth having: same box, same note count, and `pad`
    // resolves while `stab` does not, purely because one has a `sampled-chord` recipe authored
    // and the other does not.
    const { result, gap } = gapFor(rig('polyend-tracker-mini'), 'pad')
    expect(gap).toBeUndefined()
    expect(result.assignments.find((a) => a.role === 'pad')?.recipe.id).toBe('tm-pad-soft-chord')
  })

  it('says the two things differently, in Markdown and in the app', () => {
    const noRole = resolve({
      devices: rig('roland-tr-1000'),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    const shortOfNotes = resolve({
      devices: rig('polyend-tracker-mini'),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })

    for (const text of [renderGuide(noRole), renderToStaticMarkup(createElement(Guide, { result: noRole }))]) {
      expect(text).toContain('nothing in your rig plays this part')
      expect(text).not.toContain('monophonic')
    }
    for (const text of [
      renderGuide(shortOfNotes),
      renderToStaticMarkup(createElement(Guide, { result: shortOfNotes })),
    ]) {
      expect(text).toContain('needs 3 notes at once and every voice here is monophonic')
      // The wrong sentence here would send someone shopping for a box they already own.
      expect(text).not.toContain('nothing in your rig plays this part')
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
    const gap = result.gaps[0]
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony' })

    const md = renderGuide(result)
    const view = renderToStaticMarkup(createElement(Guide, { result }))
    for (const text of [md, view]) {
      expect(text).toContain('needs 5 notes at once and the most any voice here can sound is 4 notes')
      expect(text).not.toContain('monophonic')
    }
  })
})

// ---------------------------------------------------------------------------
// §4.1 / §12.4 — a hook a sampled chord cannot simply transpose through
// ---------------------------------------------------------------------------

describe('the industrial pad hook on a Tracker-only rig (i–VI–VII)', () => {
  const sampled = resolve({
    devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
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
    const html = renderToStaticMarkup(createElement(Guide, { result }))
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
    const md = renderGuide(sampled)
    const triggers = md.split('\n').filter((l) => /^- bar \d+ · step \d+ · len \d+ · sample [A-Z] · /.test(l))
    expect(triggers).toEqual([
      '- bar 1 · step 1 · len 64 · sample A · as recorded · `F3` `Ab3` (`G#3`) `C4`',
      '- bar 5 · step 65 · len 32 · sample B · as recorded · `Db4` (`C#4`) `F4` `Ab4` (`G#4`)',
      '- bar 7 · step 97 · len 32 · sample B · +2 st · `Eb4` (`D#4`) `G4` `Bb4` (`A#4`)',
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
    expect(md).toContain('- bar 1 · step 1 · len 64 · `F3` `Ab3` (`G#3`) `C4` · root 3rd 5th · MIDI 53 56 60')
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
