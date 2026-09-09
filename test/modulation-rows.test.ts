import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  AuthoredParamSchema,
  NEUTRAL_MOOD,
  renderGuide,
  resolve,
  resolveParams,
  type AuthoredModulationParam,
  type AuthoredParam,
  type Device,
  type Recipe,
  type ResolvedParam,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { guidePath } from './golden/guides'

/**
 * §3.1/#511. **A modulation is an assignment, and the model says so rather than the punctuation.**
 *
 * The issue reported one line: `ENV 2 → PITCH DEPTH 13 (-50…50)` sitting in the same column and
 * the same shape as `EQ BASS AMOUNT 33`, with nothing to tell a reader which of the two they turn
 * and which they route. That is #500 one layer in — a cable and a setting were drawn alike until
 * #501 marked the cable — and it had a second half: the neutral point moves between adjacent rows
 * (`ENV 2 SUSTAIN`'s is 25, the depth's is 0) and was stated on only one of them.
 *
 * Both halves are answered by the shape rather than by prose, and the load-bearing claim of this
 * file is that **the shape is never inferred from a name**. Two shipped devices make that concrete
 * and both are asserted below: the Circuit Tracks' `ENV 2 → FREQUENCY` carries an arrow and is a
 * knob on a path the box wires, and the Mother-32's routing — the realest one in the library —
 * carries no arrow anywhere in any of its names.
 */

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function modulationsOf(device: Device): { recipe: Recipe; param: AuthoredModulationParam }[] {
  return device.recipes.flatMap((recipe) =>
    params(recipe).flatMap((param) =>
      param.kind === 'modulation' ? [{ recipe, param }] : [],
    ),
  )
}

const ALL = DEVICES.flatMap((device) =>
  modulationsOf(device).map((m) => ({ deviceId: device.id, ...m })),
)

function byId(id: string): Device {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

describe('the library’s routings, and the ones that only look like routings (#511)', () => {
  /**
   * Named per device rather than totalled, so a device gaining or losing the shape lands here
   * instead of quietly moving a number. These are the three the folder reading found: every one
   * has an end somebody *chooses*, which is the test an author applies.
   */
  it('carries a typed routing on exactly the three devices whose ends are chosen', () => {
    const counts = new Map<string, number>()
    for (const m of ALL) counts.set(m.deviceId, (counts.get(m.deviceId) ?? 0) + 1)
    expect([...counts].sort((a, b) => (a[0] < b[0] ? -1 : 1))).toEqual([
      ['moog-mother-32', 35],
      ['novation-circuit-tracks', 4],
      ['synthstrom-deluge', 4],
    ])
  })

  /**
   * **An arrow in a name is punctuation, and this is the assertion that says so.**
   *
   * The issue sized itself on four arrow-named parameters over 28 occurrences and warned in as
   * many words that the figure "is an undercount and should not be used for sizing". Reading the
   * folders bore that out in both directions, and both directions are pinned here.
   */
  it('does not make a routing out of an arrow, on either device that has one', () => {
    // The Circuit Tracks. p.3 prints `env 2 to frequency` as one CC parameter: env 2 *is* the
    // filter envelope and the path to frequency is the box's, so there is no end to choose and
    // it stays a knob. It is signed and it has a centre, which is exactly what makes it the
    // tempting false positive — a name-matching fix would have marked it as an assignment.
    const arrows = modulationsOf(byId('novation-circuit-tracks'))
    for (const { param } of arrows) expect(param.name).not.toContain('ENV 2 →')

    const envToFrequency = params(
      byId('novation-circuit-tracks').recipes.find((r) => r.id === 'ct-acid-dirty') as Recipe,
    ).find((p) => p.name === 'ENV 2 → FREQUENCY')
    expect(envToFrequency?.kind, 'an arrow alone does not make an assignment').toBe('numeric')

    // The DFAM, for the same reason three times over: `1→2 FM AMOUNT`, and the EG amounts beside
    // it, are depth knobs on paths the instrument wires. The one place this box lets a reader
    // choose anything is `SEQ PITCH MOD`, which picks a destination and has no depth control at
    // all — half a routing, and the model does not pretend it is a whole one.
    expect(modulationsOf(byId('moog-dfam'))).toHaveLength(0)
    const dfamNames = new Set(byId('moog-dfam').recipes.flatMap((r) => params(r).map((p) => p.name)))
    expect(dfamNames, 'the arrow is still on the panel and still in the name').toContain(
      '1→2 FM AMOUNT',
    )
    expect(dfamNames).toContain('SEQ PITCH MOD')
  })

  /**
   * The other direction, and the one a pattern over names cannot reach at all: the Mother-32
   * spells its routing across three controls and uses no arrow anywhere.
   */
  it('finds the routing on the box that spells it without an arrow', () => {
    const m32 = modulationsOf(byId('moog-mother-32'))
    expect(m32.length).toBeGreaterThan(0)
    for (const { param } of m32) {
      expect(param.name).not.toContain('→')
      expect(param.source.kind, 'the VCO and VCF sources are both switches').toBe('control')
    }
  })

  it('gives every routing a neutral inside its own depth range', () => {
    for (const { deviceId, recipe, param } of ALL) {
      const where = `${deviceId} ${recipe.id} ${param.name}`
      expect(param.neutral, where).toBeGreaterThanOrEqual(param.range.min)
      expect(param.neutral, where).toBeLessThanOrEqual(param.range.max)
    }
  })

  /**
   * The three neutrals in the library are three different numbers, which is the whole reason the
   * field exists: `0` where the depth is signed around zero, `0` where the attenuator only opens
   * upward, and `64` where the box centres a 0-127 control.
   */
  it('keeps each box’s own neutral rather than assuming zero', () => {
    const seen = new Map<string, Set<number>>()
    for (const { deviceId, param } of ALL) {
      const set = seen.get(deviceId) ?? new Set<number>()
      set.add(param.neutral)
      seen.set(deviceId, set)
    }
    expect([...(seen.get('synthstrom-deluge') as Set<number>)]).toEqual([0])
    expect([...(seen.get('moog-mother-32') as Set<number>)]).toEqual([0])
    expect([...(seen.get('novation-circuit-tracks') as Set<number>)]).toEqual([64])
  })
})

describe('the schema binds what the type promises (#511)', () => {
  const base: AuthoredModulationParam = {
    kind: 'modulation',
    name: 'TEST MOD',
    source: { kind: 'stated', name: 'ENV 2' },
    destination: { kind: 'stated', name: 'CUTOFF' },
    value: 10,
    range: { min: -50, max: 50 },
    neutral: 0,
  }

  it('accepts the shape every migrated device authors', () => {
    expect(AuthoredParamSchema.safeParse(base).success).toBe(true)
    for (const { param } of ALL) {
      const parsed = AuthoredParamSchema.safeParse(param)
      expect(parsed.success, `${param.name}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })

  /** A required field is the whole repair: there is no fifth row for anybody to forget. */
  it('refuses a routing with no neutral', () => {
    const { neutral: _neutral, ...without } = base
    expect(AuthoredParamSchema.safeParse(without).success).toBe(false)
  })

  /**
   * A neutral the control cannot reach would tell a reader nothing happens somewhere they cannot
   * put the knob — an authoring typo, caught at the build exactly as a value outside its range is.
   */
  it('refuses a neutral outside the depth’s own range', () => {
    expect(AuthoredParamSchema.safeParse({ ...base, neutral: 80 }).success).toBe(false)
    expect(AuthoredParamSchema.safeParse({ ...base, value: 80 }).success).toBe(false)
  })

  it('refuses a selection that is not in the option set it cites', () => {
    const bad = {
      ...base,
      source: {
        kind: 'control',
        control: 'MOD SOURCE',
        value: 'LFO 3',
        options: { values: ['LFO 1', 'LFO 2'] },
      },
    }
    expect(AuthoredParamSchema.safeParse(bad).success).toBe(false)
  })

  /**
   * §3.1/#433/#339. Two fields a modulation deliberately does not have, and the type is what says
   * so: an allocation fact is a voice count and a fundamental pitch is where a voice is tuned.
   * A depth is neither, and `strictObject` refuses both rather than ignoring them.
   */
  it('refuses the two numeric fields a depth is not', () => {
    expect(AuthoredParamSchema.safeParse({ ...base, valueFrom: 'stack-width' }).success).toBe(false)
    expect(
      AuthoredParamSchema.safeParse({ ...base, fundamentalPitch: true, unit: 'st' }).success,
    ).toBe(false)
  })
})

describe('a routing survives resolution and reaches both renderers (#511)', () => {
  const deluge = byId('synthstrom-deluge')

  function resolvedOf(recipeId: string, name: string): ResolvedParam {
    const recipe = deluge.recipes.find((r) => r.id === recipeId) as Recipe
    const found = resolveParams(recipe, NEUTRAL_MOOD).find((p) => p.name === name)
    if (found === undefined) throw new Error(`${recipeId} has no ${name}`)
    return found
  }

  /**
   * **The discriminator survives, and that is what stops a renderer parsing a name.** Every
   * citation is inherited by the time it lands here, so nothing downstream re-runs §3.1.
   */
  it('carries the ends, the neutral and every inherited citation through the resolver', () => {
    const depth = resolvedOf('deluge-kick-hard', 'ENV 2 → PITCH DEPTH')
    expect(depth.modulation).toBeDefined()
    const m = depth.modulation as NonNullable<ResolvedParam['modulation']>
    expect(m.neutral).toBe(0)
    expect(m.source).toEqual({
      kind: 'stated',
      name: 'ENV 2',
      verified: { kind: 'manual', source: expect.stringContaining('p.120') as unknown as string },
    })
    expect(m.destination.kind === 'stated' ? m.destination.name : '').toBe(
      'Pitch / Transpose: Overall',
    )
    // The depth itself resolves exactly as a knob does: value, bounds, and a provenance nobody
    // had to decide twice.
    expect(depth.value).toBe(22)
    expect(depth.range).toEqual({ min: -50, max: 50, verified: expect.anything() as never })
    expect(depth.provenance.state).toBe('provisional')
  })

  it('leaves every ordinary control without one', () => {
    expect(resolvedOf('deluge-kick-hard', 'ENV 2 SUSTAIN').modulation).toBeUndefined()
    expect(resolvedOf('deluge-kick-hard', 'EQ BASS AMOUNT').modulation).toBeUndefined()
  })
})

/**
 * #33. The two renderers are siblings that share no ink, so this is the check that they say the
 * same words about a routing. It reads the Mother-32 fixture, which is the one rig in the goldens
 * that renders one at all — and it renders the shape whole: two `control` ends on the VCO block,
 * a `stated` destination and a polarity switch on the VCF block.
 */
describe('the web guide and the Markdown guide draw one routing (#33/#511)', () => {
  const result = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-mother-32'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 18,
  })

  const markdown = renderGuide(result, { layout: 'phase' })
  const markup = renderToStaticMarkup(
    createElement(Guide, { result, seed: 18, layout: 'phase' }),
  )
  const pageText = markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')

  /** The routing lines the Markdown prints, stripped of the punctuation only Markdown has. */
  function routingLines(): string[] {
    return markdown
      .split('\n')
      .filter((line) => line.trimStart().startsWith('- Modulation — '))
      .map((line) => line.trim().replace(/^- /, '').replace(/`/g, '').replace(/\*\*/g, ''))
  }

  it('prints a routing at all, so this file is testing something', () => {
    expect(routingLines().length).toBeGreaterThan(0)
    // The shapes that only this box carries, both on the page.
    expect(markdown).toContain('Modulation — `EG / VCO MOD` → `FREQUENCY`')
    expect(markdown).toContain('Modulation — `EG` → `the VCF cutoff` (`+`)')
  })

  it('says the same words on both sides, routing for routing', () => {
    for (const line of routingLines()) {
      expect(pageText, line).toContain(line)
    }
  })

  /**
   * The neutral, on both sides. Markdown tags the subordinate line with a word because a word is
   * all it has; the page draws the tag in CSS, so the *fact* is what is compared — the same rule
   * `↳ note:` has always been held to.
   */
  it('states the neutral on both sides, once per routing', () => {
    const printed = (markdown.match(/↳ neutral: `0` is no modulation/g) ?? []).length
    expect(printed).toBe(routingLines().length)
    expect((pageText.match(/0 is no modulation/g) ?? []).length).toBe(printed)
  })

  /**
   * **The mark is the web renderer's own ink and the word is shared**, which is what keeps
   * `innerText` and the printed page saying one thing. `CableMark` carries a label instead
   * because its Markdown sibling prints no word at all; the divergence is deliberate and
   * documented on the component.
   */
  it('draws ModulationMark beside the word, and hides it from a screen reader', () => {
    expect(markup).toContain('class="modulation-mark"')
    expect(markup).toContain('Modulation — ')
    const mark = /<svg class="modulation-mark"[^>]*>/.exec(markup)?.[0] ?? ''
    expect(mark, 'the word is real text, so a label would announce it twice').toContain(
      'aria-hidden="true"',
    )
    expect(mark).not.toContain('aria-label')
  })

  /** The golden is the committed copy of the same document, so it must carry the shape too. */
  it('is pinned by a golden that actually contains one', () => {
    const golden = readFileSync(guidePath('mother-32'), 'utf8')
    expect(golden).toContain('Modulation — ')
    expect(golden).toContain('↳ neutral: `0` is no modulation')
  })
})
