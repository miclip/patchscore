import { describe, expect, it } from 'vitest'
import type { AuthoredParam, PlaybackAxis, SourcePlayback } from '../lib/core/index'
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
