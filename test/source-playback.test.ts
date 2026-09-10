import { describe, expect, it } from 'vitest'
import type {
  AuthoredParam,
  PlaybackAxis,
  SourceAudio,
  SourcePlayback,
} from '../lib/core/index'
import { PLAYBACK_AXES, RecipeSchema, SourcePlaybackSchema } from '../lib/core/index'
import { ZERO_COUNTS, auditDevice, totalCounts } from '../scripts/audit-verified'
import { libraryCounts } from '../lib/studio/provenance'
import { DEVICES } from '../lib/devices/registry.generated'
import { device, enumParam, numericParam, recipe } from './fixtures'

/**
 * §3/#518. **A recipe says what its voice does with the file, instead of a pattern guessing.**
 *
 * #506 asked a file-fed recipe on a held role to state how long the source has to be, and #517
 * wrote that sentence into the seventeen that said nothing. What neither could do is tell a
 * sufficient duration from an insufficient one: `mpc-texture-soft` states *two seconds or longer*
 * against a `texture` some direction holds for 32 seconds, and `rytm-texture-soft` states the
 * same two seconds beside `LOP`, which holds the sample for the length of the note. A test over
 * the prose passes both.
 *
 * Four attempts to classify the rescue by reading parameter names or `need` strings each produced
 * a wrong count (#516, #517, #518). The names differ per box: `LOOP MODE` on the Octatrack, `LOP`
 * on the Rytm, `PLAY` on the Digitakt II, four at once on the MPC. So the classification is
 * authored, per axis, and the schema checks the half that can be checked.
 *
 * This file covers the shape and its counting. No device recipe declares one yet, and the sweeps
 * at the end are what keep the shipped library in step as they arrive.
 */

const MANUAL = { kind: 'manual', source: 'fixture manual p.7' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const
const INHERENT = { kind: 'inherent' } as const

const LOOP_MODE = enumParam({ name: 'LOOP MODE', value: 'on', options: { values: ['off', 'on'] } })
const BY_LOOP_MODE = { kind: 'parameters', params: ['LOOP MODE'] } as const

function withPlayback(playback: unknown, params: AuthoredParam[] = [LOOP_MODE]) {
  return recipe({
    role: 'texture',
    character: 'soft',
    voice: 'lt',
    params,
    sourceAudio: {
      need: 'A sustained tonal source with no transient at the front',
      ...(playback === undefined ? {} : { playback: playback as SourcePlayback }),
    },
  })
}

const loops = { kind: 'loops', control: BY_LOOP_MODE, evidence: MANUAL } as const

describe('a recipe classifies its own playback (#518)', () => {
  it('takes each state on each axis', () => {
    const states: Record<PlaybackAxis, readonly string[]> = {
      boundary: ['loops', 'stops-at-end'],
      timing: ['stretches', 'unaltered'],
      release: ['gated', 'plays-through'],
    }
    for (const axis of PLAYBACK_AXES) {
      for (const kind of states[axis]) {
        const parsed = RecipeSchema.safeParse(
          withPlayback({ [axis]: { kind, control: BY_LOOP_MODE, evidence: MANUAL } }),
        )
        expect(parsed.success).toBe(true)
      }
    }
  })

  it('refuses a state from another axis, and an axis that is not one of the three', () => {
    for (const playback of [
      { boundary: { kind: 'stretches', control: INHERENT, evidence: MANUAL } },
      { timing: { kind: 'loops', control: INHERENT, evidence: MANUAL } },
      { release: { kind: 'stops-at-end', control: INHERENT, evidence: MANUAL } },
      { envelope: { kind: 'loops', control: INHERENT, evidence: MANUAL } },
    ]) {
      expect(RecipeSchema.safeParse(withPlayback(playback)).success).toBe(false)
    }
  })

  /**
   * A `playback` saying nothing says exactly what no `playback` says, in a shape that looks like
   * somebody did the reading. Absence is how an unestablished axis is spelled, and there are four
   * ways to be silent here rather than one: the field, and each axis inside it.
   */
  it('refuses a playback that declares no axis', () => {
    const parsed = RecipeSchema.safeParse(withPlayback({}))
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'at least one of boundary, timing or release',
    )
  })

  it('is optional, so a recipe nobody has read stays silent', () => {
    expect(RecipeSchema.safeParse(withPlayback(undefined)).success).toBe(true)
  })

  /**
   * A page or a unit, and nothing else, on each axis separately. `false` is what this field
   * replaces — a classification with nothing checked behind it is the state that let four prose
   * readings disagree — and a `maker` citation (#191) is a published figure, which does not
   * describe what a track does with a note it is holding.
   */
  it('takes a manual page or a reading off the unit, and refuses the rest', () => {
    expect(
      RecipeSchema.safeParse(
        withPlayback({ boundary: { kind: 'loops', control: INHERENT, evidence: OBSERVED } }),
      ).success,
    ).toBe(true)
    for (const evidence of [false, undefined, { kind: 'maker', source: 'a product page' }]) {
      expect(
        RecipeSchema.safeParse(
          withPlayback({ boundary: { kind: 'loops', control: INHERENT, evidence } }),
        ).success,
      ).toBe(false)
    }
  })

  /**
   * `inherent` is a box that does this with nothing to set. Requiring a parameter everywhere
   * leaves those recipes silent, which reads as unexamined, and pushes an author toward naming an
   * adjacent parameter to satisfy a shape.
   */
  it('takes an inherent behaviour with no parameter to name, and refuses an empty list', () => {
    expect(
      RecipeSchema.safeParse(
        withPlayback({ boundary: { kind: 'loops', control: INHERENT, evidence: MANUAL } }),
      ).success,
    ).toBe(true)
    expect(
      RecipeSchema.safeParse(
        withPlayback({
          boundary: {
            kind: 'loops',
            control: { kind: 'parameters', params: [] },
            evidence: MANUAL,
          },
        }),
      ).success,
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The two boxes that refused a single `kind`
// ---------------------------------------------------------------------------

/**
 * §3/#518. **The axes are independent, and the library proves it in both directions.**
 *
 * `dt2-texture-soft` sets `SRC MACHINE` to `STRETCH` and `PLAY` to `FORWARD LOOP` — its title is
 * *"Looped texture stretched under the track"*. One `kind` per recipe makes an author drop one of
 * those two facts, and both are true.
 *
 * The MPC pushes the other way. p.216 of the v3.7 guide: *"For Pad Loop to work, you must (1) set
 * the Sample Play field (in the Global tab) to Note On instead of One Shot and (2) set the Slice
 * field (in the first Samples tab) to Pad instead of All or a slice number."* `Sample Play: Note
 * On` is the release behaviour (p.212, *"The sample will play only as long as the pad is held"*),
 * so a looping pad on that box is necessarily a gated one. A union would have made those two
 * alternatives when the manual makes one a precondition of the other.
 */
describe('claims compose (#518)', () => {
  const src = enumParam({
    name: 'SRC MACHINE',
    value: 'STRETCH',
    options: { values: ['ONESHOT', 'WERP', 'STRETCH', 'REPITCH'] },
  })
  const play = enumParam({
    name: 'PLAY',
    value: 'FORWARD LOOP',
    options: { values: ['FORWARD', 'FORWARD LOOP'] },
  })

  it('records a looped and stretched recipe as both, on the parameters that do each', () => {
    const dt2 = withPlayback(
      {
        boundary: {
          kind: 'loops',
          control: { kind: 'parameters', params: ['PLAY'] },
          evidence: { kind: 'manual', source: 'Digitakt II User Manual p.94' },
        },
        timing: {
          kind: 'stretches',
          control: { kind: 'parameters', params: ['SRC MACHINE'] },
          evidence: { kind: 'manual', source: 'Digitakt II User Manual p.93' },
        },
      },
      [src, play],
    )
    const parsed = RecipeSchema.safeParse(dt2)
    expect(parsed.success).toBe(true)
    expect(dt2.sourceAudio?.playback?.boundary?.kind).toBe('loops')
    expect(dt2.sourceAudio?.playback?.timing?.kind).toBe('stretches')
    // Each axis keeps its own page: p.94 is the play mode, p.93 the machine. One citation over
    // both would be the recipe-level `verified` mistake (§3.1) in a smaller box.
    expect(dt2.sourceAudio?.playback?.boundary?.evidence.source).not.toBe(
      dt2.sourceAudio?.playback?.timing?.evidence.source,
    )
  })

  /**
   * The conjunction `params` is a list for. Four parameters off three pages, all four named,
   * beside a `release` claim that the same conjunction requires — which is the pairing a single
   * `kind` could not hold.
   */
  it('records the MPC loop as four named parameters, gated at the same time', () => {
    const mpc = withPlayback(
      {
        boundary: {
          kind: 'loops',
          control: {
            kind: 'parameters',
            params: ['Sample Play', 'Slice', 'Pad Loop', 'Repeats'],
          },
          evidence: {
            kind: 'manual',
            source: 'MPC Live III / MPC XL User Guide v3.7 pp.212, 215-216',
          },
        },
        release: {
          kind: 'gated',
          control: { kind: 'parameters', params: ['Sample Play'] },
          evidence: { kind: 'manual', source: 'MPC Live III / MPC XL User Guide v3.7 p.212' },
        },
      },
      [
        enumParam({
          name: 'Sample Play',
          value: 'Note On',
          options: { values: ['One Shot', 'Note Off', 'Note On'] },
        }),
        enumParam({ name: 'Slice', value: 'Pad', options: { values: ['All', 'Pad'] } }),
        enumParam({
          name: 'Pad Loop',
          value: 'Forward',
          options: { values: ['Off', 'Forward', 'Reverse', 'Alternating'] },
        }),
        numericParam({ name: 'Repeats', value: 0, unit: undefined, range: { min: 0, max: 64 } }),
      ],
    )
    expect(RecipeSchema.safeParse(mpc).success).toBe(true)
    expect(mpc.sourceAudio?.playback?.boundary?.control).toEqual({
      kind: 'parameters',
      params: ['Sample Play', 'Slice', 'Pad Loop', 'Repeats'],
    })
    expect(mpc.sourceAudio?.playback?.release?.kind).toBe('gated')
  })

  /**
   * Every name, not the first. Checking one of four would leave three unchecked in exactly the
   * case the list was added for, and the issue is reported at the index of the name that is
   * wrong so an author fixing a conjunction knows which one.
   */
  it('refuses any named parameter the recipe does not set, at its own index', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback(
        {
          boundary: {
            kind: 'loops',
            control: { kind: 'parameters', params: ['LOOP MODE', 'Pad Loop', 'Repeats'] },
            evidence: MANUAL,
          },
        },
        [LOOP_MODE],
      ),
    )
    expect(parsed.success).toBe(false)
    const issues = parsed.success ? [] : parsed.error.issues
    expect(issues.map((i) => i.path.join('.'))).toEqual([
      'sourceAudio.playback.boundary.control.params.1',
      'sourceAudio.playback.boundary.control.params.2',
    ])
    expect(JSON.stringify(issues)).toContain('which this recipe does not set')
  })

  it('checks the names on every axis, not only the first one declared', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback({
        boundary: loops,
        release: {
          kind: 'gated',
          control: { kind: 'parameters', params: ['Sample Play'] },
          evidence: MANUAL,
        },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'sourceAudio.playback.release',
    )
  })
})

// ---------------------------------------------------------------------------
// §9 — what the audit does with it
// ---------------------------------------------------------------------------

describe('a playback claim counts as a capability fact (#518)', () => {
  /**
   * `caps` rather than points: the claim is about what the voice does, which is the kind of thing
   * `capabilityEvidence` holds, and it has no range to be legal within. The fixture device carries
   * one cited `noteDuration` of its own, so the baseline here is one fact.
   */
  it('adds one fact per declared axis, split by how each was checked', () => {
    const one = auditDevice(device({ recipes: [withPlayback({ boundary: loops })] }))
    expect(one.counts.capabilityFacts).toBe(2)
    expect(one.counts.manualCapabilities).toBe(2)

    const three = auditDevice(
      device({
        recipes: [
          withPlayback({
            boundary: loops,
            timing: { kind: 'unaltered', control: INHERENT, evidence: OBSERVED },
            release: { kind: 'plays-through', control: INHERENT, evidence: OBSERVED },
          }),
        ],
      }),
    )
    // Three axes and the fixture's `noteDuration`: a recipe that answered all three must not
    // report the same as one that answered a single axis.
    expect(three.counts.capabilityFacts).toBe(4)
    expect(three.counts.manualCapabilities).toBe(2)
    expect(three.counts.observedCapabilities).toBe(2)
  })

  it('leaves the point and range counts alone', () => {
    const bare = auditDevice(device({ recipes: [withPlayback(undefined)] })).counts
    const claimed = auditDevice(device({ recipes: [withPlayback({ boundary: loops })] })).counts
    expect(claimed.params).toBe(bare.params)
    expect(claimed.numerics).toBe(bare.numerics)
    expect(claimed.provisionalPoints).toBe(bare.provisionalPoints)
    expect(claimed.unverifiedRanges).toBe(bare.unverifiedRanges)
    expect(claimed.capabilityFacts).toBe(bare.capabilityFacts + 1)
  })

  /**
   * The identity `AuditCounts` states: every capability fact is exactly one of the seven states.
   * A playback claim can only be `manual` or `observed`, so it cannot open a gap — and the sum is
   * what would catch a state added later with no home.
   */
  it('keeps the capability totals adding up', () => {
    const c = totalCounts([
      auditDevice(
        device({
          recipes: [
            withPlayback({
              boundary: loops,
              release: { kind: 'gated', control: INHERENT, evidence: OBSERVED },
            }),
          ],
        }),
      ),
    ])
    expect(
      c.manualCapabilities +
        c.observedCapabilities +
        c.citedAgainstCapabilities +
        c.uncheckedCapabilities +
        c.undocumentedCapabilities +
        c.unreadCapabilities +
        c.partlyCapabilities,
    ).toBe(c.capabilityFacts)
    expect(c.capabilityFacts).toBe(ZERO_COUNTS.capabilityFacts + 3)
  })

  /**
   * §9/#193. A recipe two manifests share by reference is one recipe, and its playback claims are
   * its own. Counted from `auditRecipe`, they follow that rule with everything else on the recipe;
   * a device-level path would have counted them twice.
   */
  it('counts a shared recipe once in the library totals', () => {
    const shared = withPlayback({ boundary: loops })
    const counted = new Set<string>()
    const totals = totalCounts([
      auditDevice(device({ id: 'aa', recipes: [shared] }), counted),
      auditDevice(device({ id: 'bb', recipes: [shared] }), counted),
    ])
    // One playback claim across the two, and the `noteDuration` fact each device declares for
    // itself — capability evidence on a manifest is per box and is summed, which is #193's split.
    expect(totals.capabilityFacts).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// The shipped library
// ---------------------------------------------------------------------------

describe('the shipped library (#518)', () => {
  /**
   * Vacuous today and the reason this file exists: nothing is migrated in this commit. It holds
   * the moment a device folder starts declaring an axis, which is where the prose readings kept
   * going wrong.
   */
  it('names parameters the recipe sets, on every claim that names any', () => {
    const broken: string[] = []
    for (const d of DEVICES) {
      for (const r of d.recipes) {
        const playback = r.sourceAudio?.playback
        if (playback === undefined) continue
        for (const axis of PLAYBACK_AXES) {
          const control = playback[axis]?.control
          if (control?.kind !== 'parameters') continue
          for (const name of control.params) {
            if (!r.params.some((p) => p.name === name)) broken.push(`${d.id} ${r.id} ${axis}: ${name}`)
          }
        }
      }
    }
    expect(broken).toEqual([])
  })

  /**
   * §9. **The `caps` total is the manifests' facts plus the recipes' declared axes, and nothing
   * else.** Written as an identity rather than against the day's figure: a number here would fail
   * on the next commit that cites a jack, for a reason having nothing to do with #518.
   *
   * The de-duplication mirrors `libraryCounts` — a recipe two manifests share by reference is one
   * recipe (#193) — because a playback claim is counted from `auditRecipe` and follows that rule.
   * Device-level evidence is summed instead: each box makes its own claim about itself.
   */
  it('accounts for every capability fact the library counts', () => {
    const ordered = [...DEVICES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const seen = new Set<string>()
    let axes = 0
    let evidence = 0
    for (const d of ordered) {
      evidence += Object.keys(d.capabilityEvidence ?? {}).length
      for (const r of d.recipes) {
        const key = JSON.stringify(r)
        if (seen.has(key)) continue
        seen.add(key)
        const playback = r.sourceAudio?.playback
        if (playback === undefined) continue
        axes += PLAYBACK_AXES.filter((axis) => playback[axis] !== undefined).length
      }
    }
    expect(libraryCounts(DEVICES).capabilityFacts).toBe(evidence + axes)
  })
})

// ---------------------------------------------------------------------------
// The migrated batch (#518)
// ---------------------------------------------------------------------------

/**
 * §3/#518. **The seventeen file-fed recipes on held roles that TE and Polyend author**, migrated
 * in one batch and pinned here.
 *
 * They are the ones #518 measured: every recipe declaring `sourceAudio` on a role some shipped
 * hook holds for a bar or more. Four boxes, four different ways of answering, which is why the
 * batch is worth pinning rather than counting.
 *
 * **Where the pages came from.** The three Polyend documents are PDFs in `manuals/` and every
 * page cited below was rendered and read — Tracker pp.121, 123, 125, 135-136; Tracker Mini
 * pp.127, 130, 141-142; Play+ pp.68-69. The two teenage engineering guides are **web pages**, and
 * `manuals/te-ep-133` and `manuals/te-ep-40` hold verbatim mirrors of them taken on 2026-08-28;
 * the sections cited below were read in those mirrors and **the live pages were not fetched or
 * rendered for this batch**. That is the same evidence every other citation on those two boxes
 * already rests on.
 */
/** Declared axes across the given devices — one capability fact each (§9). */
function claimsOn(deviceIds: readonly string[]): number {
  let claims = 0
  for (const d of DEVICES) {
    if (!deviceIds.includes(d.id)) continue
    for (const r of d.recipes) {
      const playback = r.sourceAudio?.playback
      if (playback === undefined) continue
      claims += PLAYBACK_AXES.filter((axis) => playback[axis] !== undefined).length
    }
  }
  return claims
}

/** Recipes stating a source length on the given devices. Never a capability fact: no page states it. */
function minimaOn(deviceIds: readonly string[]): number {
  return DEVICES.filter((d) => deviceIds.includes(d.id)).reduce(
    (total, d) =>
      total + d.recipes.filter((r) => r.sourceAudio?.minimumSeconds !== undefined).length,
    0,
  )
}

const TE_AND_POLYEND = [
  'polyend-play-plus',
  'polyend-tracker',
  'polyend-tracker-mini',
  'te-ep-133',
  'te-ep-40',
]

describe('the TE and Polyend batch (#518)', () => {
  const recipeById = (id: string) => {
    for (const d of DEVICES) {
      const found = d.recipes.find((r) => r.id === id)
      if (found !== undefined) return found
    }
    throw new Error(`no recipe ${id}`)
  }
  const audio = (id: string) => recipeById(id).sourceAudio as NonNullable<SourceAudio>

  /**
   * The rescued nine. `loops` on the Polyend boxes: p.121/p.127 give Forward Loop as *"Plays
   * start to end and cycles on loop"*, and the granular pair rest on *"Sound is generated in a
   * granular synthesizer by looping playback around a grain"* (Tracker p.135, Mini p.141).
   * `stretches` on the EPs: 8.2.4/8.2.5, *"BAR will stretch the sample, automatically fitting it
   * to the chosen time division of the project's bpm"*.
   *
   * None of them carries a `minimumSeconds`, and that is the point of the axis: the voice makes
   * the file last, so its length is a question of a clean loop point rather than of the hold.
   */
  it('records a rescue on the nine recipes whose voice makes the file last', () => {
    const looping = [
      'tr-sub-dark',
      'tr-pad-soft',
      'tr-texture-soft',
      'tm-sub-dark',
      'tm-pad-soft-chord',
      'tm-texture-soft',
      'ep40-pad-clean',
    ]
    for (const id of looping) {
      expect(audio(id).playback?.boundary?.kind, id).toBe('loops')
      expect(audio(id).minimumSeconds, id).toBeUndefined()
    }
    const stretching = ['ep133-pad-soft', 'ep133-texture-soft', 'ep40-pad-soft', 'ep40-texture-soft']
    for (const id of stretching) {
      expect(audio(id).playback?.timing?.kind, id).toBe('stretches')
      expect(audio(id).minimumSeconds, id).toBeUndefined()
    }
  })

  /**
   * The three that are not rescued carry the number instead. Each is the longest hold its role
   * receives, at the slowest tempo any direction holding it allows, rounded up: `texture` 128
   * steps at 60 bpm is 32.00 s, `sub` 80 at 126 is 9.52, `acid` 22 at 122 is 2.70.
   */
  it('states a minimum on every recipe whose file is the hold', () => {
    expect(audio('pp-texture-soft').playback?.boundary?.kind).toBe('stops-at-end')
    expect(audio('pp-texture-soft').minimumSeconds).toBe(32)
    expect(audio('pp-sub-dark').playback?.boundary?.kind).toBe('stops-at-end')
    expect(audio('pp-sub-dark').minimumSeconds).toBe(10)
    expect(audio('tr-acid-hard').playback?.boundary?.kind).toBe('stops-at-end')
    expect(audio('tr-acid-hard').minimumSeconds).toBe(3)
  })

  /**
   * #518's own example of the defect. *"Several seconds"* is unactionable against a 32-second
   * hold, and it passed #517's presence check because it says something.
   */
  it('replaces the Play+ texture’s "several seconds" with a number', () => {
    expect(audio('pp-texture-soft').need).not.toContain('several seconds')
    expect(audio('pp-texture-soft').need).toContain('thirty-two seconds or longer')
  })

  /**
   * The three EP legato parts. 8.2.1 describes `legato` as monophonic and as continuing *"from
   * the same point as it was left off"* when the note changes, which is about a second note and
   * not about the end of the file. So the boundary is unestablished and the axis is absent —
   * `minimumSeconds` still applies, because a file that might stop needs to be long enough.
   */
  it('leaves the EP legato parts unclassified while still stating their minimum', () => {
    for (const [id, seconds] of [
      ['ep133-sub-dark', 10],
      ['ep40-sub-dark', 10],
      ['ep133-acid-dirty', 3],
    ] as const) {
      expect(audio(id).playback, id).toBeUndefined()
      expect(audio(id).minimumSeconds, id).toBe(seconds)
    }
  })

  /**
   * §2.6/invariant 2. **A borrowed claim is re-cited, never inherited.** `te-ep-40` builds four of
   * these recipes from the EP–133's, and its `borrowed()` spreads the sibling's `sourceAudio`, so
   * without `retargetPlayback` the claim would arrive pointing at the wrong guide. The two boxes'
   * guides also number the section differently: 8.2.4 there, 8.2.5 here, because the EP–40's
   * inserts supertone parameters at 8.2.3 and pushes the rest down.
   */
  it('re-cites a borrowed claim onto the EP–40’s own guide', () => {
    const there = audio('ep133-pad-soft').playback?.timing?.evidence.source as string
    const here = audio('ep40-pad-soft').playback?.timing?.evidence.source as string
    expect(there).toContain('/ep-133/modes 8.2.4')
    expect(here).toContain('/ep-40/modes 8.2.5')
    expect(here).not.toContain('ep-133')
  })

  /**
   * Every claim in the batch is cited to the box's own document, and the Play+ pair is the only
   * `inherent` one: that track has no play mode to set, so there is no parameter to name.
   */
  it('cites each claim to its own box, naming parameters wherever there are any', () => {
    const expected: Record<string, string> = {
      'polyend-tracker': 'Polyend Tracker Manual 1.9.2a',
      'polyend-tracker-mini': 'Polyend Tracker Mini Manual 2.2.1b',
      'polyend-play-plus': 'Polyend Play+ Manual Rev 2',
      'te-ep-133': 'EP–133 K.O. II guide',
      'te-ep-40': 'EP–40 riddim guide',
    }
    let claims = 0
    for (const d of DEVICES) {
      const document = expected[d.id]
      if (document === undefined) continue
      for (const r of d.recipes) {
        for (const axis of PLAYBACK_AXES) {
          const claim = r.sourceAudio?.playback?.[axis]
          if (claim === undefined) continue
          claims++
          expect(claim.evidence.kind, `${r.id} ${axis}`).toBe('manual')
          expect(claim.evidence.source, `${r.id} ${axis}`).toContain(document)
          const inherent = claim.control.kind === 'inherent'
          expect(inherent, `${r.id} ${axis}`).toBe(d.id === 'polyend-play-plus')
        }
      }
    }
    // Fifteen claims across fourteen recipes: `ep40-pad-clean` answers two axes, and it is the
    // recipe that made a single `kind` impossible.
    expect(claims).toBe(15)
  })

  /**
   * §9. The fifteen claims are fifteen capability facts, and the audit's total moved by exactly
   * that. `minimumSeconds` moved nothing, which is the other half of the split: it carries no
   * citation because no page states it.
   */
  it('adds fifteen capability facts and six minima', () => {
    expect(claimsOn(TE_AND_POLYEND)).toBe(15)
    // Six minima: the Play+ pair, the Tracker's acid, and the three EP legato parts, one of which
    // the EP–40 borrows.
    expect(minimaOn(TE_AND_POLYEND)).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// The Elektron batch (#518)
// ---------------------------------------------------------------------------

/**
 * §3/#518. **The thirteen Elektron recipes**, migrated off four rendered manuals.
 *
 * This is the batch where the axes earn themselves. Six of the thirteen answer two axes at once,
 * and the Digitakt's own titles say so before the model did — *"Loop warped to the project
 * tempo"*, *"Looped texture stretched under the track"*. A single `kind` would have made an
 * author drop half of each.
 *
 * It is also the batch with the sharpest reminder that a boundary is not a sustain. Every
 * Elektron loop entry ends the same way — *"This time is also constrained by the AMP page
 * envelope parameters HLD and DEC"* (Digitakt p.82, Digitakt II p.94/96), and the Rytm's `LOP`
 * says *"confined by the AMP page envelope parameter settings HLD and DEC"* (p.78) beside a
 * recipe that sets `HLD 110`. The file does not run out; the part may still stop. #506's question
 * stays open, and no field here claims to answer it.
 */
describe('the Elektron batch (#518)', () => {
  const ELEKTRON = [
    'elektron-analog-rytm-mkii',
    'elektron-digitakt',
    'elektron-digitakt-ii',
    'elektron-octatrack-mkii',
  ]

  const recipeById = (id: string) => {
    for (const d of DEVICES) {
      const found = d.recipes.find((r) => r.id === id)
      if (found !== undefined) return found
    }
    throw new Error(`no recipe ${id}`)
  }
  const audio = (id: string) => recipeById(id).sourceAudio as NonNullable<SourceAudio>

  /**
   * The six that answer two axes. `dt-texture-soft` and `dt2-texture-soft` are the pair #518's
   * third model change was built for: a file that both repeats and is fitted to the bar.
   */
  it('records both axes on the six recipes that loop and stretch', () => {
    for (const id of [
      'dt-texture-soft',
      'dt2-texture-soft',
      'dt2-pad-soft',
      'ot-texture-soft',
      'ot-pad-soft',
    ]) {
      expect(audio(id).playback?.boundary?.kind, id).toBe('loops')
      expect(audio(id).playback?.timing?.kind, id).toBe('stretches')
      expect(audio(id).minimumSeconds, id).toBeUndefined()
    }
    // The sixth is the odd one, and the only recipe in the library answering `stretches` beside
    // `stops-at-end`: Repitch fits the file to `BARS`, which this recipe does not set, and its
    // `PLAY FORWARD` plays it once. Both are true, and the minimum stands because of the second.
    expect(audio('dt2-sub-dark').playback?.timing?.kind).toBe('stretches')
    expect(audio('dt2-sub-dark').playback?.boundary?.kind).toBe('stops-at-end')
    expect(audio('dt2-sub-dark').minimumSeconds).toBe(10)
  })

  it('states a minimum on each of the four whose file is the hold', () => {
    for (const [id, seconds] of [
      ['dt-sub-dark', 10],
      ['dt2-sub-dark', 10],
      ['dt-acid-hard', 3],
      ['dt2-acid-hard', 3],
    ] as const) {
      expect(audio(id).playback?.boundary?.kind, id).toBe('stops-at-end')
      expect(audio(id).minimumSeconds, id).toBe(seconds)
    }
  })

  /**
   * All four Octatrack parts loop, and the two long ones stretch. Every claim cites three pages,
   * because p.85 describes the attribute and p.118 (walked at p.109) is the track switch that has
   * to be `AUTO` for the attribute to apply at all. A citation to p.85 alone would point at a
   * setting that might not be in force.
   */
  it('cites the track switch beside the attribute on every Octatrack claim', () => {
    for (const id of ['ot-sub-dark', 'ot-acid-hard', 'ot-texture-soft', 'ot-pad-soft']) {
      expect(audio(id).playback?.boundary?.kind, id).toBe('loops')
      const source = audio(id).playback?.boundary?.evidence.source as string
      for (const page of ['p.85', 'p.109', 'p.118']) expect(source, id).toContain(page)
    }
  })

  /**
   * §3/#518. **The control names only what the recipe authors.** The Octatrack's attributes apply
   * only while the *track's* `LOOP` and `TSTR` are `AUTO` in SRC SETUP, and this manifest
   * deliberately authors neither switch — `AUTO` and `OFF` are the only values any page prints
   * for them, so an option set of two would be a legality claim the manual does not support.
   * Naming one here would be a claim about a setting the reader is never handed.
   */
  it('never names a control the recipe does not set', () => {
    for (const d of DEVICES) {
      for (const r of d.recipes) {
        const playback = r.sourceAudio?.playback
        if (playback === undefined) continue
        for (const axis of PLAYBACK_AXES) {
          const control = playback[axis]?.control
          if (control?.kind !== 'parameters') continue
          for (const name of control.params) {
            expect(r.params.map((p) => p.name), `${r.id} ${axis}`).toContain(name)
          }
        }
      }
    }
    // The two the Octatrack could have named and must not.
    const ot = audio('ot-texture-soft').playback
    expect(ot?.boundary?.control).toEqual({ kind: 'parameters', params: ['LOOP MODE'] })
    expect(ot?.timing?.control).toEqual({ kind: 'parameters', params: ['TIMESTRETCH'] })
  })

  /**
   * The Rytm is #518's own example of a recipe rescued by a parameter the prose named and the
   * model could not hold. It records the loop and stops there: p.78 says the loop is *"confined
   * by the AMP page envelope parameter settings HLD and DEC"*, and this recipe fixes `HLD 110`
   * rather than leaving it `AUTO`, so the part may still stop before the trig does.
   */
  it('records the Rytm loop and makes no claim about the hold', () => {
    const playback = audio('rytm-texture-soft').playback
    expect(playback?.boundary?.kind).toBe('loops')
    expect(playback?.boundary?.control).toEqual({ kind: 'parameters', params: ['LOP'] })
    expect(playback?.timing).toBeUndefined()
    expect(playback?.release).toBeUndefined()
    expect(audio('rytm-texture-soft').minimumSeconds).toBeUndefined()
    expect(recipeById('rytm-texture-soft').params.find((p) => p.name === 'HLD')?.value).toBe(110)
  })

  it('adds nineteen capability facts and four minima', () => {
    expect(claimsOn(ELEKTRON)).toBe(19)
    expect(minimaOn(ELEKTRON)).toBe(4)
  })

  /**
   * §9. The two batches together, as the audit's own arithmetic: `caps` was 1210 before either
   * and is 1244 after both. Taken as the difference from the manifests' own facts rather than
   * against the day's figure, so the next commit that cites a jack moves neither side of this.
   */
  it('accounts for both batches in the library total', () => {
    const declared = DEVICES.reduce(
      (total, d) => total + Object.keys(d.capabilityEvidence ?? {}).length,
      0,
    )
    expect(libraryCounts(DEVICES).capabilityFacts - declared).toBe(15 + 19)
  })
})
