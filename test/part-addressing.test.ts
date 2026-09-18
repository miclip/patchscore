import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  PART_ADDRESSING_FACT,
  DeviceSchema,
  assignableCount,
  moodState,
  partAddressingNotice,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Device, GuideLayout, PartAddressing, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { device as muse } from '../lib/devices/moog-muse/index'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { device as fixtureDevice, recipe, template as fixtureTemplate } from './fixtures'

/**
 * §2.6/§8/#653. **A box carrying more than one part says how the parts are reached, once, and a
 * box carrying one part says nothing.**
 *
 * The resolver puts two parts on the Muse in most resolves, and the guide derived the voice count
 * for both (#424) while never saying whether the two are reached by splitting the keyboard or by
 * two MIDI channels — on that box two mutually exclusive setups, only one of them playable by
 * hand. `MULTI MODE` and `SPLIT` are enums whose right option depends on the allocation, which is
 * the case `valueFrom` declined; so the routing is a device-level instruction rather than a
 * parameter, authored per route with its condition, because the guide knows the parts and not
 * what plays them. These tests hold four things:
 *
 *  - the declaration is a **positive claim with a page**, checked in both directions the way
 *    `middleC` is, `false` is refused, and a box that expands to one assignable is refused
 *    because the instruction on it could never print;
 *  - the notice **decides on the count the renderer hands it**: two parts and it speaks, one and
 *    it is silent, whatever the box declares;
 *  - it reaches a reader **once per device, in both renderers and both layouts**, with one line
 *    per route and the two hand-written renderers agreeing word for word (#33);
 *  - the **Muse** declares both routes and every shipped direction that puts two parts on it
 *    prints them, while every direction that leaves one part on it prints nothing.
 */

const CITE = { kind: 'manual', source: 'A Manual, p.1' } as const
const READ_AND_SILENT = {
  kind: 'unknown',
  reason: 'pp.40-48 describe both voices and no page says how a second part is reached',
} as const

const BOTH: PartAddressing = {
  played: 'LAYER off, then SPLIT; VOICE 1 plays below the split key and VOICE 2 above',
  sequenced: 'VOICE 1 answers CHANNEL A and VOICE 2 answers CHANNEL B',
}
const PLAYED_ONLY: PartAddressing = { played: BOTH.played as string }
const SEQUENCED_ONLY: PartAddressing = { sequenced: BOTH.sequenced as string }

/**
 * The shared fixture's two fixed voices, `bd` and `lt`, with a recipe on each so a direction
 * asking for a kick and a sub puts two parts on one box.
 */
function twoVoiceDevice(over: Record<string, unknown> = {}): Device {
  return fixtureDevice({
    recipes: [
      recipe(),
      recipe({ id: 'fx-sub-dark', role: 'sub', character: 'dark', voice: 'lt', title: 'Sub' }),
    ],
    ...over,
  } as never)
}

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const evidence = twoVoiceDevice().capabilityEvidence ?? {}

function declared(addressing: PartAddressing | undefined, at: unknown): Device {
  return twoVoiceDevice({
    ...(addressing === undefined ? {} : { partAddressing: addressing }),
    capabilityEvidence: {
      ...evidence,
      ...(at === undefined ? {} : { [PART_ADDRESSING_FACT]: at }),
    },
  })
}

function issues(parsed: ReturnType<typeof DeviceSchema.safeParse>): string {
  return JSON.stringify(parsed.success ? [] : parsed.error.issues)
}

describe('partAddressing is a positive claim, checked in both directions (§2.6/#653)', () => {
  it('is a capability fact on the closed list', () => {
    expect(CAPABILITY_FACTS).toContain(PART_ADDRESSING_FACT)
  })

  it('accepts both routes, or either one alone, behind a citation', () => {
    expect(issues(DeviceSchema.safeParse(declared(BOTH, CITE)))).toBe('[]')
    expect(issues(DeviceSchema.safeParse(declared(PLAYED_ONLY, CITE)))).toBe('[]')
    expect(issues(DeviceSchema.safeParse(declared(SEQUENCED_ONLY, CITE)))).toBe('[]')
  })

  it('refuses a declaration naming neither route, which says nothing', () => {
    const parsed = DeviceSchema.safeParse(declared({}, CITE))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('at least one route')
  })

  it('refuses a route ending in a full stop, because the renderer punctuates it', () => {
    const parsed = DeviceSchema.safeParse(
      declared({ sequenced: 'VOICE 1 answers CHANNEL A.' }, CITE),
    )
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('without a full stop')
  })

  it('refuses markup in a route, because the web guide prints it literally', () => {
    const parsed = DeviceSchema.safeParse(
      declared({ sequenced: 'VOICE 1 answers `CHANNEL A`' }, CITE),
    )
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('plain text')
  })

  it('refuses a declaration with no citation', () => {
    const parsed = DeviceSchema.safeParse(declared(BOTH, undefined))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('refuses a declaration behind an unknown, which is a reading that supports no claim', () => {
    const parsed = DeviceSchema.safeParse(declared(BOTH, READ_AND_SILENT))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('refuses a citation with no declaration behind it', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, CITE))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('no partAddressing is declared')
  })

  it('refuses `false`, which says nothing the omission does not', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, false))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'false'")
  })

  it('accepts an unknown with a reason and no declaration, which is the finished reading', () => {
    expect(issues(DeviceSchema.safeParse(declared(undefined, READ_AND_SILENT)))).toBe('[]')
  })

  it('refuses the declaration on a box that expands to one assignable', () => {
    const oneVoice = fixtureDevice({
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      partAddressing: BOTH,
      capabilityEvidence: { ...evidence, [PART_ADDRESSING_FACT]: CITE },
    } as never)
    expect(assignableCount(oneVoice)).toBe(1)
    const parsed = DeviceSchema.safeParse(oneVoice)
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('never carries two parts')
  })

  it('counts a pool by its members, so a two-timbre pool is two assignables', () => {
    expect(assignableCount(muse)).toBe(2)
    expect(assignableCount(twoVoiceDevice())).toBe(2)
  })
})

describe('the notice decides on the count, and says nothing for one part', () => {
  it('says nothing for a box that declares nothing, or one nobody has settled', () => {
    expect(partAddressingNotice(undefined, 2)).toBeUndefined()
    expect(partAddressingNotice(twoVoiceDevice(), 2)).toBeUndefined()
    expect(partAddressingNotice(declared(undefined, READ_AND_SILENT), 2)).toBeUndefined()
  })

  it('says nothing for a declared box carrying one part, or none', () => {
    expect(partAddressingNotice(declared(BOTH, CITE), 1)).toBeUndefined()
    expect(partAddressingNotice(declared(BOTH, CITE), 0)).toBeUndefined()
  })

  it('hands over the routes the device authored, and only those, for two parts or more', () => {
    expect(partAddressingNotice(declared(BOTH, CITE), 2)).toEqual({
      parts: 2,
      played: BOTH.played,
      sequenced: BOTH.sequenced,
      evidence: CITE,
    })
    expect(partAddressingNotice(declared(PLAYED_ONLY, CITE), 2)).toEqual({
      parts: 2,
      played: BOTH.played,
      evidence: CITE,
    })
    expect(partAddressingNotice(declared(SEQUENCED_ONLY, CITE), 3)).toEqual({
      parts: 3,
      sequenced: BOTH.sequenced,
      evidence: CITE,
    })
  })
})

/** A direction that puts a kick and a sub on the fixture, so its one box carries two parts. */
const TWO_PARTS = fixtureTemplate({
  roles: [
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    { id: 'r-sub', role: 'sub', priority: 2, character: 'dark', sustain: 'continuous' },
  ],
})

/** The same direction with the sub gone, so the same box carries one part. */
const ONE_PART = fixtureTemplate({
  roles: [{ id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' }],
})

function guideOn(device: Device, template = TWO_PARTS): ResolveResult {
  return resolve({ devices: [device], template, mood: moodState(), seed: 3 })
}

function fixtureParts(result: ResolveResult): number {
  return result.assignments.filter((a) => a.deviceId === 'fixture-drum').length
}

const LAYOUTS: readonly GuideLayout[] = ['phase', 'sequencer']
const HEADING = 'parts on this box'
const PLAYED_LINE = `Played by hand: ${BOTH.played as string}.`
const SEQUENCED_LINE = `Played from a sequencer: ${BOTH.sequenced as string}.`

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

/** React escapes `'` in text, so the web guide's copies read `&#x27;`. */
function escaped(sentence: string): string {
  return sentence.replaceAll("'", '&#x27;')
}

describe('the notice reaches a reader once per device, both renderers, both layouts', () => {
  it('puts two parts on the fixture, and one, so the assertions below are not vacuous', () => {
    expect(fixtureParts(guideOn(declared(BOTH, CITE)))).toBe(2)
    expect(fixtureParts(guideOn(declared(BOTH, CITE), ONE_PART))).toBe(1)
  })

  for (const layout of LAYOUTS) {
    it(`prints both routes once, one line each, in the Markdown guide (${layout} layout)`, () => {
      const md = renderGuide(guideOn(declared(BOTH, CITE)), { layout })
      expect(occurrences(md, `**2 ${HEADING}**`)).toBe(1)
      expect(occurrences(md, `- ${PLAYED_LINE}`)).toBe(1)
      expect(occurrences(md, `- ${SEQUENCED_LINE}`)).toBe(1)
    })

    it(`prints both routes once, one line each, in the web guide (${layout} layout)`, () => {
      const html = renderToStaticMarkup(
        createElement(Guide, { result: guideOn(declared(BOTH, CITE)), seed: 3, layout }),
      )
      expect(occurrences(html, `2 ${HEADING}`)).toBe(1)
      expect(occurrences(html, `<li>${escaped(PLAYED_LINE)}</li>`)).toBe(1)
      expect(occurrences(html, `<li>${escaped(SEQUENCED_LINE)}</li>`)).toBe(1)
    })

    it(`prints only the route a box authored (${layout} layout)`, () => {
      const md = renderGuide(guideOn(declared(SEQUENCED_ONLY, CITE)), { layout })
      expect(md).toContain(`- ${SEQUENCED_LINE}`)
      expect(md).not.toContain('Played by hand')
      const html = renderToStaticMarkup(
        createElement(Guide, {
          result: guideOn(declared(SEQUENCED_ONLY, CITE)),
          seed: 3,
          layout,
        }),
      )
      expect(html).toContain(escaped(SEQUENCED_LINE))
      expect(html).not.toContain('Played by hand')
    })

    it(`prints nothing for one part on a declared box, or for a box that declares nothing (${layout} layout)`, () => {
      for (const result of [
        guideOn(declared(BOTH, CITE), ONE_PART),
        guideOn(declared(undefined, READ_AND_SILENT)),
        guideOn(twoVoiceDevice()),
      ]) {
        expect(renderGuide(result, { layout })).not.toContain(HEADING)
        const html = renderToStaticMarkup(createElement(Guide, { result, seed: 3, layout }))
        expect(html).not.toContain(HEADING)
      }
    })
  }
})

/**
 * The one shipped declaration, and the guides it reaches. Asserted against the registry and the
 * shipped directions rather than by eye, so a direction that starts leaving one part on the Muse
 * or a box that starts declaring the field shows up here first.
 */
describe('the catalogue', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const

  it('has one box declaring how its parts are reached, the Muse, with both routes', () => {
    const declaring = DEVICES.filter((d) => d.partAddressing !== undefined).map((d) => d.id)
    expect(declaring).toEqual(['moog-muse'])
    expect(muse.partAddressing?.played).toContain('MULTI MODE OFF')
    expect(muse.partAddressing?.played).toContain('SPLIT')
    expect(muse.partAddressing?.played).toContain('TIMBRE A plays left of the split point')
    expect(muse.partAddressing?.sequenced).toContain('MULTI MODE ON')
    expect(muse.partAddressing?.sequenced).toContain('MULTI IN B CHANNEL')
  })

  it('authors MULTI MODE on no Muse recipe, because its right option is the instruction above', () => {
    const named = muse.recipes.filter((r) => r.params.some((p) => p.name === 'MULTI MODE'))
    expect(named.map((r) => r.id)).toEqual([])
  })

  /**
   * #653's measurement, on the Muse alone: every shipped direction, eight seeds. Most resolves put
   * two parts on the box and every one of them now carries the instruction exactly once; every
   * resolve that leaves one part prints nothing. Both counts are asserted to be non-trivial so an
   * allocation change that stopped producing either case would fail here rather than pass
   * forever.
   */
  it('prints the instruction on every two-part Muse guide and on no one-part guide', () => {
    let two = 0
    let one = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [muse], template, mood: moodState(), seed })
        const parts = result.assignments.filter((a) => a.deviceId === muse.id).length
        const md = renderGuide(result)
        const label = `${template.id} seed ${String(seed)}`
        if (parts >= 2) {
          two += 1
          expect(occurrences(md, HEADING), label).toBe(1)
          expect(md, label).toContain('- Played by hand: MULTI MODE OFF')
          expect(md, label).toContain('- Played from a sequencer: MULTI MODE ON')
        } else {
          one += 1
          expect(md, label).not.toContain(HEADING)
        }
      }
    }
    expect(two).toBeGreaterThan(0)
    expect(one).toBeGreaterThan(0)
    expect(two + one).toBe(TEMPLATES.length * SEEDS.length)
  })
})
