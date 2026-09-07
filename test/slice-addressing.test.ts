import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  RecipeSchema,
  TrackModeSchema,
  moodState,
  noteAddressingFor,
  noteInstruction,
  renderGuide,
  resolve,
  type Assignable,
  type Recipe,
  type ResolveResult,
  type TrackMode,
  type TriggerNote,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { majorKeyElectro } from '../lib/templates/index'
import { enumParam, poolDevice, recipe } from './fixtures'
import { Guide } from '../components/guide/guide'

/**
 * §4.1/#369. **A note that selects a slice is not a pitch, and the guide now says so instead of
 * printing eight of them.**
 *
 * The issue's second done-when: a slice ordinal is not the guide's business, recorded as a
 * decision rather than a deferral. `noteAddressing: { kind: 'slice-ordinal', verified: Cite }` is
 * how a device states it: successive notes select successive slices, with no base note, no ordinal
 * and no count — because #369's whole finding is that the number worth printing (which slice holds
 * the syllable) is in audio nobody here has heard. The citation is required all the same, because
 * the claim subtracts.
 *
 * Three things follow, and they are what this file pins:
 *
 *  1. **The mark cannot coexist with a trigger note.** `C5` is either an original pitch or slice
 *     49; a manifest claiming both fails to build.
 *  2. **A hook loses its authority over such a part.** Phase 4 says why it prints no notes, and
 *     phase 5 goes back to printing the grid the reader can actually enter.
 *  3. **Exactly one of the library's six sliced recipes carries it**, and the other five carry it
 *     *not*, each for its own reason read off its own manual. That count is asserted, because the
 *     interesting failure here is over-claiming: a `Slice` recipe marked as ordinal would suppress
 *     a hook its own manual page says it can play.
 */

const NOTE: TriggerNote = {
  note: 'C5',
  midi: 60,
  verified: { kind: 'manual', source: 'Fixture Manual, p.90' },
}

const WHOLE: TrackMode = {
  id: 'whole-sample',
  label: 'ONESHOT',
  triggerNote: NOTE,
  selectedBy: { param: 'MACHINE', values: ['ONESHOT'] },
}

const ORDINAL = { kind: 'slice-ordinal', verified: NOTE.verified } as const

const SLICED: TrackMode = {
  id: 'sliced',
  label: 'SLICE',
  noteAddressing: ORDINAL,
  selectedBy: { param: 'MACHINE', values: ['SLICE'] },
}

const machine = (value: string) =>
  enumParam({ name: 'MACHINE', value, options: { values: ['ONESHOT', 'SLICE'] } })

/** A pool with a mode table, and one recipe on whichever mode is asked for. */
function moded(over: { recipes?: Partial<Recipe>[] } = {}) {
  return poolDevice({
    voices: [
      {
        kind: 'pool',
        id: 'track',
        label: 'Track',
        count: 3,
        roles: ['kick', 'vox-chop'],
        polyphony: 1,
        modes: [WHOLE, SLICED],
      },
    ],
    recipes: (over.recipes ?? [{ mode: 'sliced', params: [machine('SLICE')] }]).map((r, i) =>
      recipe({
        id: `fx-track-${String(i)}`,
        voice: 'track',
        articulation: undefined,
        params: [machine('ONESHOT')],
        ...r,
      }),
    ),
  })
}

/** A pool with no modes, where the addressing is the recipe's to state. */
function unmoded(over: Partial<Recipe> = {}) {
  return poolDevice({
    recipes: [
      recipe({
        id: 'fx-track-chop',
        role: 'vox-chop',
        voice: 'track',
        articulation: undefined,
        noteAddressing: ORDINAL,
        ...over,
      }),
    ],
  })
}

describe('what a device may state (§4.1/#369)', () => {
  it('takes the mark on a mode and on a recipe, and refuses anything but the one member', () => {
    expect(TrackModeSchema.safeParse(SLICED).success).toBe(true)
    expect(RecipeSchema.safeParse(recipe({ noteAddressing: ORDINAL })).success).toBe(true)
    // A discriminated object rather than a free string: the field is read by three consumers that
    // all subtract, and a typo would silently mean "an ordinary note" on a track where it is not.
    expect(
      TrackModeSchema.safeParse({ ...SLICED, noteAddressing: { ...ORDINAL, kind: 'slice' } })
        .success,
    ).toBe(false)
    // The bare string is refused too, and this is the shape the field briefly had: an enum member
    // with nowhere to put a citation. Pinned so a revert to it fails here rather than quietly
    // dropping the evidence requirement.
    expect(
      RecipeSchema.safeParse({ ...recipe(), noteAddressing: 'slice-ordinal' }).success,
    ).toBe(false)
  })

  it('refuses an uncited addressing, exactly as §2.1 refuses an uncited trigger note', () => {
    // A `Cite`, never a `Verified`. This claim *deletes* a hook and the note line above a grid, so
    // a guessed one takes away the reader's only instruction and does it invisibly — a page that
    // prints nothing looks the same however the claim was arrived at. There is no state between
    // "the manual says a note selects a slice here" and "we do not know how this is addressed".
    expect(TrackModeSchema.safeParse({ ...SLICED, noteAddressing: { kind: 'slice-ordinal' } }).success).toBe(false)
    expect(
      TrackModeSchema.safeParse({
        ...SLICED,
        noteAddressing: { kind: 'slice-ordinal', verified: false },
      }).success,
    ).toBe(false)
    expect(
      TrackModeSchema.safeParse({
        ...SLICED,
        noteAddressing: { kind: 'slice-ordinal', verified: { kind: 'manual', source: '' } },
      }).success,
    ).toBe(false)
  })

  it('refuses a mode claiming a trigger note and a slice addressing at once', () => {
    // The load-bearing contradiction. One says `C5` plays the sound as it is; the other says a
    // note is not a pitch here. Nothing downstream could choose between them, and the page would
    // print an original pitch above a grid where it selects slice 49.
    expect(
      TrackModeSchema.safeParse({ ...SLICED, triggerNote: NOTE }).success,
    ).toBe(false)
  })

  it('refuses the recipe field on a moded voice, because the mode is its home', () => {
    // One fact with two spellings is one drift from disagreeing with itself — the same reason
    // `selectedBy` exists, arriving one field over.
    expect(
      DeviceSchema.safeParse(
        moded({
          recipes: [
            { mode: 'sliced', noteAddressing: ORDINAL, params: [machine('SLICE')] },
          ],
        }),
      ).success,
    ).toBe(false)
    // ...and takes it on an unmoded one, which is the only place left for it to live.
    expect(DeviceSchema.safeParse(unmoded()).success).toBe(true)
  })

  it('refuses a slice-addressed recipe on a voice that declares a trigger note', () => {
    // The mode case is `TrackModeSchema`'s; this is the same contradiction with the note sitting
    // on the voice a field away, where no single-object schema can see both halves.
    const box = poolDevice({
      voices: [
        {
          kind: 'pool',
          id: 'track',
          label: 'Track',
          count: 3,
          roles: ['vox-chop'],
          polyphony: 1,
          triggerNote: NOTE,
        },
      ],
      recipes: [
        recipe({
          id: 'fx-track-chop',
          role: 'vox-chop',
          voice: 'track',
          articulation: undefined,
          noteAddressing: ORDINAL,
        }),
      ],
    })
    expect(DeviceSchema.safeParse(box).success).toBe(false)
  })
})

describe('noteAddressingFor: which source answers (§2.2/§4.1)', () => {
  const assignable = (over: Partial<Assignable> = {}): Assignable => ({
    deviceId: 'fixture-tracker',
    voiceId: 'track-1',
    poolId: 'track',
    label: 'Track 1',
    ordinal: 1,
    roles: ['vox-chop'],
    polyphony: 1,
    ...over,
  })

  it('reads the mode where the voice has a table, and the recipe where it does not', () => {
    const modes = [WHOLE, SLICED]
    expect(noteAddressingFor(recipe({ mode: 'sliced' }), assignable({ modes }))).toEqual(ORDINAL)
    expect(noteAddressingFor(recipe({ mode: 'whole-sample' }), assignable({ modes }))).toBeUndefined()
    expect(noteAddressingFor(recipe({ noteAddressing: ORDINAL }), assignable())).toEqual(ORDINAL)
  })

  it('ignores a recipe-level mark on a moded voice, matching the schema that refuses it', () => {
    // Belt and braces on purpose: the schema makes such a manifest unbuildable, and the resolver
    // does not quietly honour one anyway if a device is constructed in a test without it.
    expect(
      noteAddressingFor(
        recipe({ mode: 'whole-sample', noteAddressing: ORDINAL }),
        assignable({ modes: [WHOLE, SLICED] }),
      ),
    ).toBeUndefined()
  })

  it('answers nothing for a part with no assignable, rather than throwing', () => {
    expect(noteAddressingFor(recipe({ noteAddressing: ORDINAL }), undefined)).toBeUndefined()
  })
})

/**
 * The end-to-end case, and the one #369 was opened about: `major-key-electro` hooks `vox-chop`,
 * and on a Tracker-Mini-only rig that lands on `tm-vox-chop-dirty`, which is `PLAY MODE Beat
 * Slice` (p.90/p.132 — slice 1 is `C2`, successive notes successive slices).
 *
 * Before #369 the hook took the part: phase 4 printed eight degrees spelled in the song's key and
 * phase 5 replaced this part's grid with a pointer to them. Every value was right and the only
 * instruction a reader could act on was a note that picks a slice out of their own file.
 */
describe('a hook does not take a slice-addressed part (§4.1/#369)', () => {
  const trackerMini = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  const result = (): ResolveResult =>
    resolve({ devices: trackerMini, template: majorKeyElectro, mood: moodState(), seed: 1 })

  const html = (r: ResolveResult) =>
    renderToStaticMarkup(createElement(Guide, { result: r, seed: 1 })).replace(/<[^>]+>/g, ' ')

  it('resolves the Tracker Mini chop as slice-addressed and withholds hook authority', () => {
    const chop = result().assignments.find((a) => a.role === 'vox-chop')
    expect(chop?.recipe.id).toBe('tm-vox-chop-dirty')
    expect(chop?.noteAddressing?.kind).toBe('slice-ordinal')
    // The citation survives resolution rather than being consumed by the schema that demanded it:
    // the four Mini pages that scope the C2 rule to beat slice by name.
    const cite = chop?.noteAddressing?.verified
    expect(cite?.kind).toBe('manual')
    for (const page of ['p.90', 'p.100', 'p.106', 'p.132']) {
      expect(cite?.source).toContain(page)
    }
    // The hook still *resolved* — the direction authored one and the seed chose it. What changed
    // is that this part is not the thing that plays it.
    expect(result().song.hooks.some((h) => h.forRole === 'vox-chop')).toBe(true)
    expect(chop?.hookAuthority).toBeUndefined()
  })

  it('says in phase 4 why the hook cannot apply, and prints none of its notes', () => {
    const r = result()
    const hook = r.song.hooks.find((h) => h.forRole === 'vox-chop')
    expect(hook?.chosen.outcome).toBe('resolved')

    // Anchored on the phase and then on the part, because `vox-chop` also appears in phase 1's
    // energy map and in phase 2 — a looser split asserts against the wrong section.
    const phase = renderGuide(r).split('## 4. Hook')[1]?.split('\n## ')[0] as string
    const section = phase.split('### `vox-chop`')[1]?.split('\n### ')[0] as string
    expect(section).toContain('cannot play the hook')
    expect(section).toContain('a note picks which slice plays')
    // The failure this replaced: eight correctly spelled degrees, entered as slice numbers.
    expect(section).not.toContain('MIDI ')
    expect(section).not.toContain('bars in')
    // The other hooked parts still print theirs, so this is a part-level refusal and not a phase
    // that stopped working.
    expect(phase).toContain('MIDI ')
  })

  it('says the same thing in the web guide, in the same place (#33)', () => {
    const text = html(result())
    const before = text.slice(0, text.indexOf('This part cannot play the hook'))
    expect(before).not.toBe('')
    // The sentence sits directly under this part's heading, with no note rows and no bars-and-key
    // line between them — the Markdown's placement, asserted the way the stripped markup allows.
    expect(before).toContain('vox-chop')
    const tail = before.slice(before.lastIndexOf('vox-chop'))
    expect(tail).not.toContain('MIDI ')
    expect(tail).not.toContain('bars in')
  })

  it('prints the step grid rather than a pointer, because that is what the reader can enter', () => {
    const r = result()
    const steps = renderGuide(r).split('## 5. Step programming')[1] as string
    const part = steps.split('### `vox-chop`')[1]?.split('###')[0] as string
    expect(part).not.toContain('The hook is the pattern')
    // A real grid, with this recipe's own articulation bound to it.
    expect(part).toContain('```')
    expect(part).toContain('`downbeat`')
  })

  it('writes no note above that grid, since neither a pitch nor a trigger note applies', () => {
    const chop = result().assignments.find((a) => a.role === 'vox-chop')
    expect(noteInstruction(chop as never)).toEqual({ kind: 'none' })
  })

  it('leaves a pitched part on the same box alone', () => {
    // The control. `lead` is hooked too and lands on a synth patch, so nothing about this change
    // reaches it — the check is that the suppression is keyed on addressing and not on hooks.
    const lead = result().assignments.find((a) => a.role === 'lead')
    expect(lead?.noteAddressing).toBeUndefined()
    expect(lead?.hookAuthority).toBeDefined()
  })
})

/**
 * The over-claiming guard. A `slice-ordinal` addressing *removes* a hook and a note line, so one
 * on a part whose notes really are pitches costs the reader the only instruction they had.
 * The library ships six sliced recipes and five of them fail the test, each for its own reason and
 * each recorded in its own folder. This pins the whole set so a sweep cannot quietly add one, and
 * names all five rather than a count, so a recipe cannot go missing from the list either.
 */
describe('the library claims it exactly where a manual says it', () => {
  /**
   * **Every recipe in the library that puts its voice into a slicing configuration**, written out
   * rather than detected.
   *
   * Detecting it was tried and is worse than useless here: a scan for a param whose *name* carries
   * `SLIC` returns 30 recipes, because every Octatrack recipe declares `SLIC` and all but one set
   * it to `OFF`. A matching identifier is not evidence of the thing it names, and the switch that
   * settles it is spelled differently on all five boxes — `SLIC ON`, `PLAY MODE Beat Slice`,
   * `SRC MACHINE SLICE`, `MACHINE SLICE`. So the inventory is authored, and a seventh sliced
   * recipe has to be added here by hand; what the assertions below guarantee is that the six
   * named all still exist and that the marked/unmarked split covers exactly them.
   */
  const SLICED_RECIPES = [
    'elektron-digitakt-ii/dt2-vox-chop-bright',
    'elektron-digitakt/dt-vox-chop-bright',
    'elektron-octatrack-mkii/ot-vox-chop-bright',
    'polyend-tracker-mini/tm-vox-chop-dirty',
    'polyend-tracker/tr-vox-chop-bright',
    'polyend-tracker/tr-vox-chop-dirty',
  ]

  /** Every recipe in the library that resolves to an addressing, by whichever route states it. */
  const marked = DEVICES.flatMap((d) =>
    d.recipes.flatMap((r) => {
      const voice = d.voices.find((v) => v.id === r.voice)
      const modes = voice?.kind === 'pool' ? voice.modes : undefined
      const addressing = modes?.find((m) => m.id === r.mode)?.noteAddressing ?? r.noteAddressing
      return addressing === undefined ? [] : [`${d.id}/${r.id}`]
    }),
  )

  it('is the Tracker Mini Beat Slice chop and nothing else', () => {
    expect(marked).toEqual(['polyend-tracker-mini/tm-vox-chop-dirty'])
    // One of the six, not one of some other set: the mark is only ever claimed on a sliced part.
    expect(SLICED_RECIPES).toContain(marked[0])
  })

  it('leaves the other five sliced recipes unmarked, each for its own cited reason', () => {
    const UNMARKED = {
      // `Slice`, which p.126 and p.127 say plays the selected slice melodically in the current
      // scale. A note there *is* a pitch, so marking it would be false rather than unproven — and
      // would suppress a hook the manual says this part can play.
      'polyend-tracker/tr-vox-chop-bright': 'Slice is pitched (pp.126-127)',
      // `Beat Slice` on a manual that never states a base note anywhere in 308 pages, and whose
      // own p.164 example holds a constant F5 beside a varying slice number.
      'polyend-tracker/tr-vox-chop-dirty': 'Beat Slice unstated in this manual',
      // Fixes `SLICE 1`. p.86 scopes the whole override to "when SLICE is set to NOTE".
      'elektron-digitakt/dt-vox-chop-bright': 'SLICE is a fixed number, not NOTE (p.86)',
      // Names the SLICE machine and authors no `SLICE` at all; p.26's rule is conditional on
      // `SLICE = NOTE`, and p.98 proves the fixed-number case exists.
      'elektron-digitakt-ii/dt2-vox-chop-bright': 'no SLICE NOTE authored (pp.26, 98)',
      // The one where the premise fails rather than the citation: `STRT` selects the slice here
      // (p.81, p.118), and p.139's note map is scoped by p.138 to the SLICES trig mode plus a
      // project MIDI setting, neither of which this recipe or this model selects.
      'elektron-octatrack-mkii/ot-vox-chop-bright': 'STRT selects the slice, not a note (p.81)',
    }

    for (const id of Object.keys(UNMARKED)) {
      // Named in full, so a recipe that is renamed or removed fails here rather than passing by
      // being absent from a list of suffixes.
      const [deviceId, recipeId] = id.split('/')
      const device = DEVICES.find((d) => d.id === deviceId)
      expect(device?.recipes.some((r) => r.id === recipeId), id).toBe(true)
      expect(marked, id).not.toContain(id)
    }

    // And together with the marked one, that is every sliced recipe the library ships — so the
    // set above cannot silently stop being exhaustive.
    expect(Object.keys(UNMARKED)).toHaveLength(5)
    expect([...Object.keys(UNMARKED), ...marked].sort()).toEqual(SLICED_RECIPES)
  })

  it('keeps the Tracker Mini Slice mode separate from its Beat Slice one', () => {
    // They were one mode and they disagree about the step note (p.132), so the split is what stops
    // a future `Slice` recipe inheriting a suppression its own page contradicts.
    const mini = DEVICES.find((d) => d.id === 'polyend-tracker-mini')
    const pool = mini?.voices.find((v) => v.id === 'track-sample')
    const modes: readonly TrackMode[] = pool?.kind === 'pool' ? (pool.modes ?? []) : []
    const byId = new Map(modes.map((m) => [m.id, m]))
    expect(byId.get('sliced')?.noteAddressing).toBeUndefined()
    expect(byId.get('sliced')?.selectedBy?.values).toEqual(['Slice'])
    expect(byId.get('beat-sliced')?.noteAddressing?.kind).toBe('slice-ordinal')
    expect(byId.get('beat-sliced')?.selectedBy?.values).toEqual(['Beat Slice'])
  })
})
