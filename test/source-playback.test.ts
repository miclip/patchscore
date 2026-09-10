import { describe, expect, it } from 'vitest'
import type { SourcePlayback } from '../lib/core/index'
import { RecipeSchema, SourcePlaybackSchema, needsSourceCoveringHold } from '../lib/core/index'
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
 * on the Rytm, `Sample Play` on the MPC. So the classification is authored, it says how the state
 * is selected, and the schema checks the half that can be checked.
 *
 * This file covers the shape and its counting. No device recipe declares one yet, and the sweep
 * at the end is what keeps the shipped library in step as they arrive.
 */

const MANUAL = { kind: 'manual', source: 'fixture manual p.7' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const
const BY_PARAM = { kind: 'parameter', param: 'LOOP MODE' } as const
const INHERENT = { kind: 'inherent' } as const

const LOOP_MODE = enumParam({ name: 'LOOP MODE', value: 'on', options: { values: ['off', 'on'] } })

function withPlayback(playback: unknown, params = [LOOP_MODE]) {
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

const KINDS = ['loops', 'stretches', 'gated', 'plays-once'] as const

describe('a recipe classifies its own playback (#518)', () => {
  it('takes each of the four states', () => {
    for (const kind of KINDS) {
      const parsed = RecipeSchema.safeParse(
        withPlayback({ kind, control: BY_PARAM, evidence: MANUAL }),
      )
      expect(parsed.success).toBe(true)
    }
  })

  /**
   * The four the schema admits, pinned as a set. A fifth added to the type and not to the schema
   * would pass the binding in `schema-type-binding.test.ts` through `SourceAudio`, whose field is
   * optional on both sides, so this is where a missing variant shows up.
   */
  it('admits those four and no others', () => {
    expect(SourcePlaybackSchema.options.map((o) => o.shape.kind.value)).toEqual([...KINDS])
    expect(
      RecipeSchema.safeParse(withPlayback({ kind: 'granulates', control: BY_PARAM, evidence: MANUAL }))
        .success,
    ).toBe(false)
  })

  /**
   * The claim is about a setting the reader makes in *this* recipe, so a name matching nothing in
   * `params` is refused — the same rule a patch entry naming an undeclared jack has met since
   * §3.3. Without it the field would carry the defect it exists to remove: a claim about a loop,
   * with nothing behind it that can be checked.
   */
  it('refuses a parameter the recipe does not set', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback({ kind: 'loops', control: { kind: 'parameter', param: 'LOP' }, evidence: MANUAL }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'which this recipe does not set',
    )
  })

  it('accepts the parameter under whatever name that box prints, once the recipe sets it', () => {
    const lop = numericParam({ name: 'LOP', value: 1, unit: undefined, range: { min: 0, max: 1 } })
    const parsed = RecipeSchema.safeParse(
      withPlayback(
        { kind: 'loops', control: { kind: 'parameter', param: 'LOP' }, evidence: MANUAL },
        [lop],
      ),
    )
    expect(parsed.success).toBe(true)
  })

  /**
   * A box that does this with nothing to set says so, and there is nothing to check beyond the
   * citation. Requiring a parameter everywhere would leave those recipes silent, which reads as
   * unexamined, and would push an author toward naming an adjacent parameter to satisfy a shape.
   */
  it('takes an inherent behaviour with no parameter to name', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback({ kind: 'loops', control: INHERENT, evidence: MANUAL }),
    )
    expect(parsed.success).toBe(true)
  })

  it('refuses a control that is neither form, and a parameter form with no name', () => {
    for (const control of [
      undefined,
      { kind: 'default' },
      { kind: 'parameter' },
      { kind: 'inherent', param: 'LOOP MODE' },
    ]) {
      expect(
        RecipeSchema.safeParse(withPlayback({ kind: 'loops', control, evidence: MANUAL })).success,
      ).toBe(false)
    }
  })

  /**
   * A page or a unit, and nothing else. `false` is what this field replaces — a classification
   * with nothing checked behind it is the state that let four prose readings disagree — and a
   * `maker` citation (#191) is a published figure, which does not describe what a track does with
   * a note it is holding.
   */
  it('takes a manual page or a reading off the unit, and refuses the rest', () => {
    expect(
      RecipeSchema.safeParse(withPlayback({ kind: 'loops', control: BY_PARAM, evidence: OBSERVED }))
        .success,
    ).toBe(true)
    for (const evidence of [false, undefined, { kind: 'maker', source: 'a product page' }]) {
      const parsed = RecipeSchema.safeParse(
        withPlayback({ kind: 'loops', control: BY_PARAM, evidence }),
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('is optional, so a recipe that has not been read stays silent', () => {
    expect(RecipeSchema.safeParse(withPlayback(undefined)).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The state the MPC forced
// ---------------------------------------------------------------------------

/**
 * §3/#518. **`gated` is not `plays-once`, and the MPC is the case.**
 *
 * `Sample Play` on p.212 of the v3.7 guide has three values. *"One Shot: The entire sample will
 * play from start to end."* *"Note On: The sample will play only as long as the pad is held. This
 * is better for longer samples so you can control a sound's duration by pressing and holding its
 * corresponding pad."* `mpc-texture-soft` sets `Note On`, and the recipe's own comment says why:
 * under `One Shot` the sample would run to its end regardless of the note length in the pattern.
 *
 * The first draft of this shape had three states and would have recorded that recipe as
 * `plays-once`, which is the name of the option it avoids. Both states owe a duration covering
 * the worst-case hold, so folding them together would have looked harmless in a duration rule and
 * been wrong at the machine: a `gated` part that stops early is a sample running out under a held
 * pad, and a `plays-once` part that overruns is a sample playing on after the note ended.
 */
describe('a gated file is its own state (#518)', () => {
  const samplePlay = enumParam({
    name: 'Sample Play',
    value: 'Note On',
    options: { values: ['One Shot', 'Note Off', 'Note On'] },
  })
  const p212 = { kind: 'manual', source: 'MPC Live III / MPC XL User Guide v3.7 p.212' } as const

  const gated = withPlayback(
    { kind: 'gated', control: { kind: 'parameter', param: 'Sample Play' }, evidence: p212 },
    [samplePlay],
  )
  const once = withPlayback(
    { kind: 'plays-once', control: { kind: 'parameter', param: 'Sample Play' }, evidence: p212 },
    [enumParam({ ...samplePlay, value: 'One Shot' } as Record<string, unknown>)],
  )

  it('records the held-pad state and the run-to-the-end state separately', () => {
    expect(RecipeSchema.safeParse(gated).success).toBe(true)
    expect(RecipeSchema.safeParse(once).success).toBe(true)
    expect(gated.sourceAudio?.playback?.kind).toBe('gated')
    expect(once.sourceAudio?.playback?.kind).toBe('plays-once')
    expect(gated.sourceAudio?.playback?.kind).not.toBe(once.sourceAudio?.playback?.kind)
  })

  /**
   * Neither is a rescue: the file still ends when it ends, so a `texture` held for 32 seconds
   * needs 32 seconds of file under both. This is the pairing a later duration rule reads, and it
   * is the reason `gated` could not simply be `loops`.
   */
  it('leaves both of them owing a duration, which `loops` and `stretches` do not', () => {
    const asked = (kind: SourcePlayback['kind']) =>
      needsSourceCoveringHold({ kind, control: INHERENT, evidence: p212 })
    expect(asked('gated')).toBe(true)
    expect(asked('plays-once')).toBe(true)
    expect(asked('loops')).toBe(false)
    expect(asked('stretches')).toBe(false)
    // Every state answers, so a fifth added later cannot slip through as a silent `false`.
    expect(KINDS.filter(asked)).toEqual(['gated', 'plays-once'])
  })

  it('counts as one capability fact like any other playback claim', () => {
    const audited = auditDevice(device({ recipes: [gated] }))
    expect(audited.counts.capabilityFacts).toBe(2)
    expect(audited.counts.manualCapabilities).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// §9 — what the audit does with it
// ---------------------------------------------------------------------------

describe('a playback claim counts as a capability fact (#518)', () => {
  /**
   * `caps` rather than points: the claim is about what the voice does, which is the kind of thing
   * `capabilityEvidence` holds, and it has no range to be legal within. The fixture device carries
   * one cited `noteDuration` of its own, so the baseline here is one fact and the playback claim
   * is the second.
   */
  it('adds one fact per declaring recipe, split by how it was checked', () => {
    const manual = auditDevice(
      device({ recipes: [withPlayback({ kind: 'loops', control: BY_PARAM, evidence: MANUAL })] }),
    )
    expect(manual.counts.capabilityFacts).toBe(2)
    expect(manual.counts.manualCapabilities).toBe(2)
    expect(manual.counts.observedCapabilities).toBe(0)

    const observed = auditDevice(
      device({
        recipes: [withPlayback({ kind: 'stretches', control: INHERENT, evidence: OBSERVED })],
      }),
    )
    expect(observed.counts.capabilityFacts).toBe(2)
    expect(observed.counts.manualCapabilities).toBe(1)
    expect(observed.counts.observedCapabilities).toBe(1)
  })

  it('leaves the point and range counts alone', () => {
    const bare = auditDevice(device({ recipes: [withPlayback(undefined)] })).counts
    const claimed = auditDevice(
      device({ recipes: [withPlayback({ kind: 'loops', control: BY_PARAM, evidence: MANUAL })] }),
    ).counts
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
          recipes: [withPlayback({ kind: 'plays-once', control: INHERENT, evidence: OBSERVED })],
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
    expect(c.capabilityFacts).toBe(ZERO_COUNTS.capabilityFacts + 2)
  })

  /**
   * §9/#193. A recipe two manifests share by reference is one recipe, and its playback claim is
   * one claim. Counted from `auditRecipe`, it follows that rule with everything else on the
   * recipe; a device-level path would have counted it twice.
   */
  it('counts a shared recipe once in the library totals', () => {
    const shared = withPlayback({ kind: 'loops', control: BY_PARAM, evidence: MANUAL })
    const a = device({ id: 'aa', recipes: [shared] })
    const b = device({ id: 'bb', recipes: [shared] })
    const counted = new Set<string>()
    const totals = totalCounts([auditDevice(a, counted), auditDevice(b, counted)])
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
   * the moment a device folder starts declaring the field, which is where the prose readings kept
   * going wrong.
   */
  it('names a parameter the recipe sets, on every recipe that declares one', () => {
    const broken: string[] = []
    for (const d of DEVICES) {
      for (const r of d.recipes) {
        const control = r.sourceAudio?.playback?.control
        if (control?.kind !== 'parameter') continue
        if (!r.params.some((p) => p.name === control.param)) {
          broken.push(`${d.id} ${r.id}: ${control.param}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  /**
   * §9. **The `caps` total is the manifests' facts plus the recipes' playback claims, and nothing
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
    let declared = 0
    let evidence = 0
    for (const d of ordered) {
      evidence += Object.keys(d.capabilityEvidence ?? {}).length
      for (const r of d.recipes) {
        const key = JSON.stringify(r)
        if (seen.has(key)) continue
        seen.add(key)
        if (r.sourceAudio?.playback !== undefined) declared++
      }
    }
    expect(libraryCounts(DEVICES).capabilityFacts).toBe(evidence + declared)
  })
})
