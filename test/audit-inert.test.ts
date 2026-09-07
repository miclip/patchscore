import { describe, expect, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'
import type { AuthoredParam, Device } from '../lib/core/index'
import {
  compareCodeUnits,
  inertCoverage,
  inertFindings,
  recipeInertFindings,
} from '../lib/core/index'
import { DeviceSchema } from '../lib/core/device'
import { auditDevice, formatAudit } from '../scripts/audit-verified'
import { device, enumParam, numericParam, recipe } from './fixtures'

/**
 * §3.1/#388. **A parameter authored where something else in the same recipe makes it inert.**
 *
 * The guide prints it in the same ink as a value that matters, so a reader at the machine spends
 * time setting nine controls and hears nothing. `REACH` asks whether anything requests a recipe;
 * this asks whether anything inside the recipe is listening to a block of it.
 *
 * Every entry is a **candidate**, not a verdict: the check reads one recipe's authored evidence
 * and cannot prove a box has nowhere to point a modulator (invariant 5). The tests hold the
 * wording to that, and are otherwise mostly about what the check must **not** say. A predicate on
 * one parameter would flag `MIXER · MOD OSC 0` on every Muse `pad`, where it is correct — a
 * modulator kept out of the mix on purpose — and a check that cries wolf on correct authoring
 * trains people to skip it. Every negative case here is a shape that is legal and must stay
 * silent.
 */

const OFF_ON = { values: ['OFF', 'ON'] }

/** The disconnected shape, in the Muse's own parameter names: controls wired to nothing. */
function modOscParams(over: { route?: string; depth?: number; level?: number } = {}) {
  const { route = 'OFF', depth = 0, level = 0 } = over
  return [
    enumParam({ name: 'MOD OSC · WAVEFORM', value: 'SAW', options: { values: ['SAW', 'SQUARE'] } }),
    numericParam({ name: 'MOD OSC · FREQUENCY', value: 25 }),
    numericParam({ name: 'MOD OSC · PITCH AMOUNT', value: depth }),
    enumParam({ name: 'MOD OSC · PITCH ▸ OSC 1', value: route, options: OFF_ON }),
    enumParam({ name: 'MOD OSC · PITCH ▸ OSC 2', value: 'OFF', options: OFF_ON }),
    numericParam({ name: 'MIXER · MOD OSC', value: level }),
  ]
}

function findings(
  params: ReturnType<typeof modOscParams>,
  over: Parameters<typeof recipe>[0] = {},
) {
  return inertFindings([device({ recipes: [recipe({ params, ...over })] })])
}

describe('the disconnected shape is a conjunction, never one parameter (#388)', () => {
  it('raises a block whose routes are off, depths zero and level zero', () => {
    const found = findings(modOscParams())
    expect(found).toHaveLength(1)
    expect(found[0]?.kind).toBe('disconnected')
    expect(found[0]?.block).toBe('MOD OSC')
    // Five: the block the name prefix defines. `MIXER · MOD OSC` is the sixth parameter a reader
    // has to look at and it is why the candidate stands, but it is authored on another block, so
    // it is carried as `level 0` evidence rather than counted into the block's size.
    expect(found[0]?.params).toBe(5)
    expect(found[0]?.detail).toContain('level 0')
  })

  /**
   * The case #388 says a naive rule would get wrong, and the reason the check is a conjunction:
   * a MOD OSC used purely as a modulator is routed, has depth, and is deliberately kept out of
   * the mix at `MIXER · MOD OSC 0`. All three Muse `pad` recipes and `muse-texture-soft` are
   * authored exactly that way and are correct.
   */
  it('stays silent on a routed modulator held at zero level', () => {
    expect(findings(modOscParams({ route: 'ON', depth: 40, level: 0 }))).toEqual([])
  })

  it('stays silent when the block is in the mix, however its routes sit', () => {
    // Routes off and depths zero, but the fader is up: it is an audio source, not a modulator.
    expect(findings(modOscParams({ level: 30 }))).toEqual([])
  })

  it('stays silent when a depth is dialled in, even with every route off', () => {
    // Strictly this block is inert — an off route moves nothing whatever the depth says. The
    // check keeps the third clause anyway: three facts pointing one way is what makes a candidate
    // actionable rather than arguable, and it is what keeps a bipolar depth, whose neutral point
    // is mid-range rather than `0`, from being read as a zero.
    expect(findings(modOscParams({ depth: 40 }))).toEqual([])
  })

  it('needs both a route and a depth before it will judge a block at all', () => {
    const params = [
      enumParam({ name: 'FILTER · ▸ OSC 1', value: 'OFF', options: OFF_ON }),
      numericParam({ name: 'FILTER · CUTOFF', value: 0 }),
    ]
    expect(findings(params)).toEqual([])
  })
})

describe('a modulator with nowhere to point (#388)', () => {
  const lfo = [
    enumParam({ name: 'LFO 1 · WAVEFORM', value: 'TRI', options: { values: ['TRI', 'SAW'] } }),
    numericParam({ name: 'LFO 1 · RATE', value: 2 }),
    numericParam({ name: 'LFO 1 · AMPLITUDE', value: 50 }),
  ]

  it('raises an LFO block no parameter in the recipe routes', () => {
    const found = findings(lfo)
    expect(found).toHaveLength(1)
    expect(found[0]?.kind).toBe('destinationless')
    expect(found[0]?.block).toBe('LFO 1')
    expect(found[0]?.params).toBe(3)
  })

  /**
   * Invariant 5. The check reads a recipe, so a negative answer is a claim about what it looked
   * at — the Muse's MOD MAP is declared outside the parameter model and the check cannot see it.
   * `no destination` would be a claim about the box, which this is not entitled to make.
   */
  it('says only that it found no authored destination, not that there is none', () => {
    expect(findings(lfo)[0]?.detail).toBe('no authored destination found')
  })

  /**
   * #460's shape, which the Muse now authors on six recipes: the destination and the depth are
   * **one** parameter, `LFO 1 · BI ▸ VCA PAN AMOUNT 20`. It reads as a route because the name
   * carries `▸` and as a depth because it carries `AMOUNT`, so the block is judged by the
   * disconnected branch rather than the destinationless one — and a numeric value clears it,
   * since a route that is off is a *string* the check can match against `OFF`.
   */
  it('stays silent when one parameter is the destination and the depth at once', () => {
    const atomic = [...lfo, numericParam({ name: 'LFO 1 · BI ▸ VCA PAN AMOUNT', value: 20 })]
    expect(findings(atomic)).toEqual([])
    // And a depth of zero is still silent: an authored destination is an authored destination,
    // and #388's third clause is what keeps a bipolar depth's neutral point from reading as off.
    const atNoon = [...lfo, numericParam({ name: 'LFO 1 · BI ▸ VCA PAN AMOUNT', value: 0 })]
    expect(findings(atNoon)).toEqual([])
  })

  it('stays silent when the block carries its own destination control', () => {
    const targeted = [
      ...lfo,
      enumParam({
        name: 'LFO 1 · TARGET',
        value: 'CUTOFF',
        options: { values: ['CUTOFF', 'PITCH'] },
      }),
    ]
    expect(findings(targeted)).toEqual([])
  })

  /**
   * A modular box points its LFO with a cable rather than a switch — the Cascadia's
   * `LFO X / Y / Z` block is one `RATE` knob, and `patch` carries where it goes. The question is
   * whether the recipe points the block anywhere, not whether it does so with a parameter.
   */
  it('stays silent when a patch entry or the routing prose names the block', () => {
    expect(findings(lfo, { patch: [{ from: 'LFO 1 · OUT', to: 'VCF · FM 3' }] })).toEqual([])
    expect(findings(lfo, { routing: 'LFO 1 runs into the filter over the MOD MAP' })).toEqual([])
  })

  it('does not read every block as a modulator', () => {
    // An envelope is hardwired to something on nearly every box, so a block with no routing
    // parameter is the ordinary case rather than a candidate.
    const env = [
      numericParam({ name: 'AMP ENV · ATTACK', value: 4 }),
      numericParam({ name: 'AMP ENV · DECAY', value: 40 }),
    ]
    expect(findings(env)).toEqual([])
  })
})

/**
 * The library as it stands. #384 fixed `muse-stab-hard` as content and #388 predicted the six
 * that were left; four have since been routed and two remain. This check exists so that list is
 * generated rather than hand-collected — which is the point it keeps proving, since the number
 * moves whenever somebody takes one of the judgments.
 */
describe('what the check raises in the library today (#388)', () => {
  const found = inertFindings(DEVICES)

  it('raises the two sub MOD OSC recipes left after #384 and the routing pass', () => {
    // Six after #384. Four of them — both `lead` recipes and both `bass-mid` — were routed to a
    // destination their own title supports, which is why they are gone from here rather than
    // suppressed. The two `sub` recipes are the ones where routing is the wrong repair: a sub
    // that moves is not a sub, and `muse-sub-clean`'s only audible destination is the filter
    // that *is* its oscillator. See `test/moog-muse.test.ts` for both judgments.
    const disconnected = found.filter((f) => f.kind === 'disconnected')
    expect(disconnected.map((f) => f.recipeId)).toEqual(['muse-sub-clean', 'muse-sub-dark'])
    expect(disconnected.every((f) => f.block === 'MOD OSC')).toBe(true)
    // #388's own figure: nine parameters on the block. The tenth a reader checks, the MIXER
    // fader, is the evidence rather than part of the block.
    expect(disconnected.every((f) => f.params === 9)).toBe(true)
  })

  /**
   * **#460 closed this one out, and the number that matters is zero.** The check raised ten
   * `LFO 1` candidates on the Muse — three `pad`, three `bass-mid`, two `sub`, two `texture` —
   * and all ten were answered per recipe: six name a MOD MAP destination in the parameter that
   * carries their depth, and four stopped printing the block. `test/moog-muse.test.ts` holds the
   * ten decisions one at a time.
   *
   * Not vacuous: `a modulator with nowhere to point` above proves the branch still fires, on a
   * fixture rather than on whatever the library happens to contain.
   */
  it('raises no destinationless candidate anywhere in the library (#460)', () => {
    expect(found.filter((f) => f.kind === 'destinationless')).toEqual([])
  })

  it('does not raise the recipe #384 already repaired', () => {
    expect(found.map((f) => f.recipeId)).not.toContain('muse-stab-hard')
  })

  it('does not raise a MOD OSC that is routed and kept out of the mix', () => {
    // All three `pad` recipes and `muse-texture-soft` author `MIXER · MOD OSC 0` correctly.
    const modOsc = found.filter((f) => f.block === 'MOD OSC').map((f) => f.recipeId)
    for (const id of ['muse-pad-soft', 'muse-pad-dark', 'muse-pad-bright', 'muse-texture-soft']) {
      expect(modOsc).not.toContain(id)
    }
  })

  it('is sorted by code unit, so the report is byte-identical run to run (invariant 6)', () => {
    const keys = found.map((f) => `${f.deviceId} ${f.recipeId} ${f.block}`)
    expect(keys).toEqual([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })
})

/**
 * The renderer's entry point. A guide holds one device and one recipe, not a library, so the
 * judgement has to be reachable at that unit — and the two views have to agree, or the page and
 * the report become a second opinion about which values are doing nothing.
 */
describe('one recipe answers the same as the library walk (#388)', () => {
  it('reconstructs the whole library report, recipe by recipe', () => {
    const perRecipe = DEVICES.flatMap((d) => d.recipes.flatMap((r) => recipeInertFindings(d, r)))
    // Same candidates, same evidence. Only the ordering differs, which `inertFindings` owns.
    const key = (f: { deviceId: string; recipeId: string; block: string; detail: string }) =>
      `${f.deviceId} ${f.recipeId} ${f.block} ${f.detail}`
    expect(perRecipe.map(key).sort()).toEqual(inertFindings(DEVICES).map(key).sort())
  })

  it('raises nothing for a recipe the library walk does not raise', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')
    const repaired = muse?.recipes.find((r) => r.id === 'muse-stab-hard')
    expect(repaired).toBeDefined()
    if (muse !== undefined && repaired !== undefined) {
      expect(recipeInertFindings(muse, repaired)).toEqual([])
    }
  })

  /**
   * Two candidates on one recipe, in block order. This used to ask `muse-sub-clean`, which
   * carried an `LFO 1` beside its `MOD OSC` until #460 removed it; no recipe in the library
   * raises two any more, so the shape is built rather than borrowed. What is being checked is
   * `recipeInertFindings`'s sort, which is invariant 6's business and not the Muse's.
   */
  it('raises both of a recipe that has two candidates, in block order (invariant 6)', () => {
    const two = device({
      recipes: [
        recipe({
          params: [
            ...modOscParams(),
            enumParam({
              name: 'LFO 1 · WAVEFORM',
              value: 'TRI',
              options: { values: ['TRI', 'SAW'] },
            }),
            numericParam({ name: 'LFO 1 · RATE', value: 2 }),
          ],
        }),
      ],
    })
    const found = recipeInertFindings(two, two.recipes[0]!)
    expect(found.map((f) => f.block)).toEqual(['LFO 1', 'MOD OSC'])
    expect(found.map((f) => f.kind)).toEqual(['destinationless', 'disconnected'])
  })
})

describe('the INERT block is a report, not a gate (#388)', () => {
  const report = formatAudit(
    DEVICES.map((d) => auditDevice(d)),
    false,
  )

  it('prints the block with the count and names each candidate', () => {
    const found = inertFindings(DEVICES)
    expect(report).toContain('INERT')
    // Derived rather than pinned, as the REACH test does it: the exact list is asserted above,
    // and a recipe repaired should fail the reconciliation once rather than twice.
    expect(report).toMatch(new RegExp(`blocks\\s+${String(found.length)} candidates on`))
    for (const f of found.slice(0, 20)) {
      expect(report, f.recipeId).toContain(f.recipeId)
    }
  })

  it('says what raised each candidate, so the line is actionable', () => {
    expect(report).toContain('4 routes off, 2 depths 0, level 0')
    // The destinationless wording is not in today's report because #460 left nothing to raise it
    // — `says only that it found no authored destination` above holds the string, on a fixture.
    for (const f of inertFindings(DEVICES)) expect(report, f.recipeId).toContain(f.detail)
  })

  it('calls them candidates rather than findings of fact (invariant 5)', () => {
    expect(report).toContain('candidates on')
    expect(report).toContain('appears to be listening')
  })
})

/**
 * §3.1/#466. **The check's silence and a clean result are different facts, and the report has to
 * tell them apart.**
 *
 * `INERT` counted candidates over the whole library while the grouping had only ever read the
 * thirteen manifests that name blocks with ` · `. The other twenty-six are invisible to it, not
 * clean, and the line said nothing — which is the check's own failure mode (a signal that looks
 * healthy because something else stands in for it) turned on the instrument. These tests hold the
 * partition honest and hold the predicate still: nothing here may change what is raised.
 */
describe('the report says what the grouping could not examine (#466)', () => {
  const coverage = inertCoverage(DEVICES)

  it('splits the library into read, unread, and nothing to read', () => {
    const all = [...coverage.examined, ...coverage.unexamined, ...coverage.noParams]
    expect(all).toHaveLength(DEVICES.length)
    expect(new Set(all).size).toBe(DEVICES.length)
  })

  it('counts a device as examined only when a name carries the separator', () => {
    const seen = device({
      id: 'seen-box',
      recipes: [recipe({ params: [numericParam({ name: 'MOD OSC · FREQUENCY' })] })],
    })
    const unseen = device({
      id: 'unseen-box',
      recipes: [recipe({ params: [numericParam({ name: 'LFO Rate' })] })],
    })
    const empty = device({ id: 'empty-box', recipes: [] })
    expect(inertCoverage([seen, unseen, empty])).toEqual({
      examined: ['seen-box'],
      unexamined: ['unseen-box'],
      noParams: ['empty-box'],
    })
  })

  /**
   * A capability-only manifest has nothing for a naming convention to hide, so it is counted and
   * passed over. Folding it in with the twenty-six would overstate the debt in the other
   * direction, which is the same mistake this line exists to stop making.
   */
  it('does not call a device with no authored parameters blind', () => {
    const report = formatAudit(
      DEVICES.map((d) => auditDevice(d)),
      false,
    )
    for (const id of coverage.noParams) {
      expect(report.slice(report.indexOf('  INERT')), id).not.toContain(id)
    }
  })

  it('sorts each list by code unit, so the report is byte-identical anywhere', () => {
    for (const ids of [coverage.examined, coverage.unexamined, coverage.noParams]) {
      expect([...ids].sort(compareCodeUnits)).toEqual([...ids])
    }
  })

  describe('the INERT block prints it', () => {
    const report = formatAudit(
      DEVICES.map((d) => auditDevice(d)),
      false,
    )
    const block = report.slice(report.indexOf('  INERT'))

    it('states how many devices were examined, of how many', () => {
      // Derived, as the `blocks` line's test is: widening the grouping should fail the
      // reconciliation in one place, not two.
      expect(block).toContain(
        `reach  ${String(coverage.examined.length).padStart(5)} of ${String(DEVICES.length)} ` +
          `devices examined`,
      )
      expect(block).toContain(`${String(coverage.noParams.length)} more author no parameters`)
      expect(block).toContain(`gaps   ${String(coverage.unexamined.length).padStart(5)} unexamined`)
    })

    /**
     * In full, not capped. `blocks` shows twenty and counts the rest because that list is a work
     * queue; this one answers "was my box looked at?", and a `… and 14 more` would hide the one
     * name a reader came for.
     */
    it('names every device it could not group, with none left off', () => {
      for (const id of coverage.unexamined) expect(block, id).toContain(id)
      expect(block.slice(block.indexOf('    gaps '))).not.toContain('…')
    })
  })

  /**
   * The whole point of change 1: it reports the denominator and touches no predicate. #466's
   * acceptance test starts here — the Muse's two `MOD OSC` blocks must still be the library's
   * candidates, and nothing else may have appeared.
   */
  it('leaves the candidates exactly as they were', () => {
    expect(inertFindings(DEVICES).map((f) => `${f.deviceId} ${f.recipeId} ${f.block}`)).toEqual([
      'moog-muse muse-sub-clean MOD OSC',
      'moog-muse muse-sub-dark MOD OSC',
    ])
  })
})

/**
 * §3.1/#466. **A manifest that names blocks with a different separator says so.**
 *
 * Twenty-six of forty-six devices carried no ` · ` at all, so the check could not form a single
 * group on them and their silence was indistinguishable from a clean result. Nine of them name
 * blocks with a space, consistently, and a declared separator is the cheap half of the repair: it
 * moves them from unexamined to examined without touching the predicate.
 *
 * **What these tests mostly guard is that nothing moved.** A widening that found a candidate would
 * have to argue for it (#466 says so in as many words), and this one finds none: the library's
 * candidates are still the Muse's two, and the nine devices went from invisible to read-and-silent.
 */
describe('a device may declare its own block separator (#466)', () => {
  const spaced = (params: AuthoredParam[]): Device =>
    device({ inertBlockSeparator: ' ', recipes: [recipe({ params })] })

  it('reads a device the default separator cannot see at all', () => {
    const params = [
      numericParam({ name: 'LFO RATE', value: 40 }),
      enumParam({ name: 'LFO WAVE', value: 'TRI', options: { values: ['TRI', 'SQR'] } }),
    ]
    const dev = spaced(params)
    const found = recipeInertFindings(dev, dev.recipes[0]!)
    expect(found).toHaveLength(1)
    expect(found[0]?.block).toBe('LFO')
    expect(found[0]?.kind).toBe('destinationless')
    // The same names under the default form no group at all, which is the state #466 is about.
    const blind = device({ recipes: [recipe({ params })] })
    expect(recipeInertFindings(blind, blind.recipes[0]!)).toEqual([])
  })

  it('reads the route, depth and level tails with the declared separator too', () => {
    const dev = spaced([
      enumParam({ name: 'LFO DEST', value: 'OFF', options: { values: ['OFF', 'VCF'] } }),
      numericParam({ name: 'LFO AMOUNT', value: 0 }),
      numericParam({ name: 'MIXER LFO', value: 0 }),
    ])
    const found = recipeInertFindings(dev, dev.recipes[0]!)
    expect(found).toHaveLength(1)
    expect(found[0]?.kind).toBe('disconnected')
    // `MIXER LFO` is the level, read off the tail with the separator the grouping used.
    expect(found[0]?.detail).toBe('1 routes off, 1 depths 0, level 0')
    expect(found[0]?.params).toBe(2)
  })

  it('clears a block the recipe points somewhere, whatever the separator', () => {
    const dev = spaced([
      numericParam({ name: 'LFO RATE', value: 40 }),
      numericParam({ name: 'VCF CUTOFF', value: 60, note: 'LFO sweeps this' }),
    ])
    expect(recipeInertFindings(dev, dev.recipes[0]!)).toEqual([])
  })

  it('defaults to ` · ` when a manifest declares nothing', () => {
    const dev = device({
      recipes: [recipe({ params: [numericParam({ name: 'MOD OSC · FREQUENCY' })] })],
    })
    expect(dev.inertBlockSeparator).toBeUndefined()
    expect(inertCoverage([dev])).toEqual({
      examined: ['fixture-drum'],
      unexamined: [],
      noParams: [],
    })
  })

  it('takes the field in the schema, and refuses an empty one', () => {
    const base = device({ recipes: [] })
    expect(DeviceSchema.safeParse({ ...base, inertBlockSeparator: ' ' }).success).toBe(true)
    expect(DeviceSchema.safeParse({ ...base, inertBlockSeparator: '' }).success).toBe(false)
    expect(DeviceSchema.safeParse(base).success).toBe(true)
  })

  /**
   * **The cost of a coarse separator, held as a fixture rather than as a claim.** A merged group
   * evaluates the conjunction across controls belonging to different things, so it can pair a
   * route from one sub-block with a depth from another and raise a `disconnected` candidate on a
   * block that is not a thing on the panel — where the finer separator raises a `destinationless`
   * note about the one modulator that has no route. Not quieter: different, and arguably wrong.
   *
   * This is why the trade rests on the check gating nothing and on the acceptance test below,
   * rather than on the grouping staying correct at a coarser grain.
   */
  it('can manufacture a candidate a finer separator would not raise', () => {
    const named = (sep: string) => [
      enumParam({ name: `LFO 1${sep}DEST`, value: 'OFF', options: { values: ['OFF', 'VCF'] } }),
      numericParam({ name: `LFO 2${sep}DEPTH`, value: 0 }),
    ]
    const fine = device({ recipes: [recipe({ params: named(' · ') })] })
    const coarse = spaced(named(' '))
    const one = recipeInertFindings(fine, fine.recipes[0]!)
    expect(one.map((f) => [f.block, f.kind])).toEqual([['LFO 2', 'destinationless']])
    const two = recipeInertFindings(coarse, coarse.recipes[0]!)
    expect(two.map((f) => [f.block, f.kind])).toEqual([['LFO', 'disconnected']])
    expect(two[0]?.detail).toBe('1 routes off, 1 depths 0, no level')
  })

  it('is declared by nine manifests, and moved exactly those nine', () => {
    const declared = DEVICES.filter((d) => d.inertBlockSeparator !== undefined)
    expect(declared.map((d) => d.id)).toEqual([
      'behringer-crave',
      'behringer-model-d',
      'behringer-neutron',
      'moog-dfam',
      'moog-grandmother',
      'moog-matriarch',
      'moog-minitaur',
      'moog-mother-32',
      'synthstrom-deluge',
    ])
    for (const d of declared) expect(d.inertBlockSeparator, d.id).toBe(' ')
    const coverage = inertCoverage(DEVICES)
    expect(coverage.examined).toHaveLength(22)
    expect(coverage.unexamined).toHaveLength(17)
    expect(coverage.noParams).toHaveLength(7)
    for (const d of declared) expect(coverage.examined, d.id).toContain(d.id)
  })
})
