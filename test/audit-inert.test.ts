import { describe, expect, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'
import { inertFindings, recipeInertFindings } from '../lib/core/index'
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

  it('raises the ten destinationless LFO 1 recipes', () => {
    const destinationless = found.filter((f) => f.kind === 'destinationless')
    expect(destinationless).toHaveLength(10)
    expect(destinationless.every((f) => f.block === 'LFO 1')).toBe(true)
    // Three `pad`, three `bass-mid`, two `sub`, two `texture` — #388's own count.
    expect(new Set(destinationless.map((f) => f.recipeId.split('-')[1]))).toEqual(
      new Set(['pad', 'bass', 'sub', 'texture']),
    )
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

  it('raises both of a recipe that has two candidates, in block order (invariant 6)', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')
    const sub = muse?.recipes.find((r) => r.id === 'muse-sub-clean')
    expect(sub).toBeDefined()
    if (muse !== undefined && sub !== undefined) {
      const found = recipeInertFindings(muse, sub)
      expect(found.map((f) => f.block)).toEqual(['LFO 1', 'MOD OSC'])
    }
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
    expect(report).toContain('no authored destination found')
  })

  it('calls them candidates rather than findings of fact (invariant 5)', () => {
    expect(report).toContain('candidates on')
    expect(report).toContain('appears to be listening')
  })
})
