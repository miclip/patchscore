import { describe, expect, it } from 'vitest'
import type { SourcePlayback } from '../lib/core/index'
import { RecipeSchema } from '../lib/core/index'
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
 * on the Rytm, `TIME STRETCH MODE` on the EP-133. So the classification is authored, it names the
 * parameter it is about, and the schema checks that the parameter is one the recipe sets.
 *
 * This file covers the shape and its counting. No device recipe declares one yet, and the sweep
 * at the end is what keeps the shipped library in step as they arrive.
 */

const MANUAL = { kind: 'manual', source: 'fixture manual p.7' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const

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

describe('a recipe classifies its own playback (#518)', () => {
  it('takes each of the three states', () => {
    for (const kind of ['loops', 'stretches', 'plays-once'] as const) {
      const parsed = RecipeSchema.safeParse(
        withPlayback({ kind, param: 'LOOP MODE', evidence: MANUAL }),
      )
      expect(parsed.success).toBe(true)
    }
  })

  it('refuses a fourth state', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback({ kind: 'granulates', param: 'LOOP MODE', evidence: MANUAL }),
    )
    expect(parsed.success).toBe(false)
  })

  /**
   * The claim is about a setting the reader makes in *this* recipe, so a name matching nothing in
   * `params` is refused — the same rule a patch entry naming an undeclared jack has met since
   * §3.3. Without it the field would carry the defect it exists to remove: prose about a loop,
   * with nothing behind it that can be checked.
   */
  it('refuses a parameter the recipe does not set', () => {
    const parsed = RecipeSchema.safeParse(
      withPlayback({ kind: 'loops', param: 'LOP', evidence: MANUAL }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'which this recipe does not set',
    )
  })

  it('accepts the parameter under whatever name that box prints, once the recipe sets it', () => {
    const lop = numericParam({ name: 'LOP', value: 1, unit: undefined, range: { min: 0, max: 1 } })
    const parsed = RecipeSchema.safeParse(
      withPlayback({ kind: 'loops', param: 'LOP', evidence: MANUAL }, [lop]),
    )
    expect(parsed.success).toBe(true)
  })

  /**
   * A page or a unit, and nothing else. `false` is what this field replaces — a classification
   * with nothing checked behind it is the state that let four prose readings disagree — and a
   * `maker` citation (#191) is a published figure, which does not describe what a track does with
   * a note it is holding.
   */
  it('takes a manual page or a reading off the unit, and refuses the rest', () => {
    expect(
      RecipeSchema.safeParse(withPlayback({ kind: 'loops', param: 'LOOP MODE', evidence: OBSERVED }))
        .success,
    ).toBe(true)
    for (const evidence of [false, undefined, { kind: 'maker', source: 'a product page' }]) {
      const parsed = RecipeSchema.safeParse(
        withPlayback({ kind: 'loops', param: 'LOOP MODE', evidence }),
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('is optional, so a recipe that has not been read stays silent', () => {
    expect(RecipeSchema.safeParse(withPlayback(undefined)).success).toBe(true)
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
      device({ recipes: [withPlayback({ kind: 'loops', param: 'LOOP MODE', evidence: MANUAL })] }),
    )
    expect(manual.counts.capabilityFacts).toBe(2)
    expect(manual.counts.manualCapabilities).toBe(2)
    expect(manual.counts.observedCapabilities).toBe(0)

    const observed = auditDevice(
      device({
        recipes: [withPlayback({ kind: 'stretches', param: 'LOOP MODE', evidence: OBSERVED })],
      }),
    )
    expect(observed.counts.capabilityFacts).toBe(2)
    expect(observed.counts.manualCapabilities).toBe(1)
    expect(observed.counts.observedCapabilities).toBe(1)
  })

  it('leaves the point and range counts alone', () => {
    const bare = auditDevice(device({ recipes: [withPlayback(undefined)] })).counts
    const claimed = auditDevice(
      device({ recipes: [withPlayback({ kind: 'loops', param: 'LOOP MODE', evidence: MANUAL })] }),
    ).counts
    expect(claimed.params).toBe(bare.params)
    expect(claimed.numerics).toBe(bare.numerics)
    expect(claimed.provisionalPoints).toBe(bare.provisionalPoints)
    expect(claimed.unverifiedRanges).toBe(bare.unverifiedRanges)
    expect(claimed.capabilityFacts).toBe(bare.capabilityFacts + 1)
  })

  /**
   * The identity `AuditCounts` states: every capability fact is exactly one of the seven states.
   * A playback claim can only be `manual` or `observed`, so it cannot open a gap — but the sum is
   * what would catch a state added later with no home.
   */
  it('keeps the capability totals adding up', () => {
    const c = totalCounts([
      auditDevice(
        device({ recipes: [withPlayback({ kind: 'plays-once', param: 'LOOP MODE', evidence: OBSERVED })] }),
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
    const shared = withPlayback({ kind: 'loops', param: 'LOOP MODE', evidence: MANUAL })
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
        const playback = r.sourceAudio?.playback
        if (playback === undefined) continue
        if (!r.params.some((p) => p.name === playback.param)) {
          broken.push(`${d.id} ${r.id}: ${playback.param}`)
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
