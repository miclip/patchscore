import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  AuthoredNumericParamSchema,
  AuthoredParamSchema,
  NEUTRAL_MOOD,
  PARAM_VALUE_SOURCES,
  devicePoolCapacity,
  expand,
  moodState,
  renderGuide,
  resolve,
  resolveParam,
  resolveParams,
} from '../lib/core/index'
import type { ResolveResult, ResolvedAssignment } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, ambientDub, breakbeat } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { FIXTURE_CITE, numericParam, recipe } from './fixtures'

/**
 * §12.4/#433. **A stacked chord did not sound**, and the reason was that a setting the resolver
 * already knew the value of had nowhere to be written down.
 *
 * Three tracks of a Tracker Mini play one synth slot. The slot has its own voice count, printed
 * `Polyphony` on Synth Parameters page 1 and shipping at `1`; three tracks sharing one voice
 * sound the last note and nothing else. The width was in the guide's prose the whole time — *"3
 * notes, one on each of 3 voices"* — and never reached a control.
 *
 * `valueFrom: 'stack-width'` is the narrowest thing that fixes it: one closed source name, on
 * numerics only, resolved from the assignment the search already made. This file holds the four
 * claims that keeps honest — the schema's, the resolver's, the allocation's, and the two
 * renderers' agreement about the word `Polyphony`, which is now the *box's* and not the guide's.
 */

const trackerMini = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
const bothPolyend = DEVICES.filter(
  (d) => d.id === 'polyend-tracker-mini' || d.id === 'polyend-tracker',
)

function padOf(result: ResolveResult): ResolvedAssignment {
  const pad = result.assignments.find((a) => a.recipe.id.startsWith('tm-pad-soft'))
  expect(pad, 'the rig under test should carry the Tracker Mini soft pad').toBeDefined()
  return pad as ResolvedAssignment
}

function polyphonyOf(assignment: ResolvedAssignment): number | undefined {
  const param = assignment.params.find((p) => p.name === 'POLYPHONY')
  return param === undefined ? undefined : (param.value as number)
}

describe('the authored declaration (§3.1)', () => {
  it('names exactly two sources, and both were taken on their own evidence', () => {
    // The list is closed on purpose and it is not a slot to fill. This test used to say "exactly
    // one" and name #424's split-timbre voice count as the shape a second would have to have;
    // #424 then produced the evidence — a Muse alone on a rig telling its reader to lock four of
    // eight voices away — and the second member is that, not a generalisation of the first.
    expect(PARAM_VALUE_SOURCES).toEqual(['stack-width', 'device-part-share'])
  })

  it('accepts `valueFrom` on a numeric', () => {
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({ valueFrom: 'stack-width', value: 1, range: { min: 1, max: 8 } }),
    )
    expect(parsed.success).toBe(true)
  })

  it('accepts `valueFrom` on the second source too', () => {
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({ valueFrom: 'device-part-share', value: 4, range: { min: 0, max: 8 } }),
    )
    expect(parsed.success).toBe(true)
  })

  it('refuses a source it does not know', () => {
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({ valueFrom: 'voice-count' }),
    )
    expect(parsed.success).toBe(false)
  })

  it('refuses mood beside the second source as well', () => {
    // The refinement is on the field rather than on the member, so this holds for every source
    // the list ever gains: two authorities over one number is the thing being refused.
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({
        valueFrom: 'device-part-share',
        value: 4,
        range: { min: 0, max: 8, verified: FIXTURE_CITE },
        mood: [{ axis: 'darkness', amount: 2 }],
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it('refuses mood beside it — two authorities over one number', () => {
    // The count the resolver chose is the count that sounds the part. A darkness knob nudging a
    // three-voice slot to two silences a note of the chord, which is #433 reintroduced from the
    // other end, so it fails the build rather than the ear.
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({
        valueFrom: 'stack-width',
        value: 1,
        range: { min: 1, max: 8, verified: FIXTURE_CITE },
        mood: [{ axis: 'darkness', amount: 2 }],
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it('still holds the authored point to its own range', () => {
    // `value` is not a placeholder: it is what the control reads at a stack width of one, which
    // is an ordinary unstacked part, so §3.1's refinement applies to it unchanged.
    const parsed = AuthoredNumericParamSchema.safeParse(
      numericParam({ valueFrom: 'stack-width', value: 9, range: { min: 1, max: 8 } }),
    )
    expect(parsed.success).toBe(false)
  })

  it('is numeric only — a width is a number', () => {
    // `strictObject` is what keeps it off the other two kinds, so the assertion is that the
    // union refuses them rather than that the enum schema mentions the field.
    expect(
      AuthoredParamSchema.safeParse({
        kind: 'enum',
        name: 'MODE',
        value: 'analog',
        options: { values: ['analog', 'digital'] },
        valueFrom: 'stack-width',
      }).success,
    ).toBe(false)
    expect(
      AuthoredParamSchema.safeParse({
        kind: 'text',
        name: 'NOTE',
        value: 'patch the sub out',
        valueFrom: 'stack-width',
      }).success,
    ).toBe(false)
  })
})

describe('resolving one (§7 step 9)', () => {
  const sourced = numericParam({
    name: 'POLYPHONY',
    value: 1,
    unit: undefined,
    valueFrom: 'stack-width',
    range: { min: 1, max: 8, verified: FIXTURE_CITE },
  })

  /** #424's shape: the Muse's own control, with its own range and its own resting point. */
  const shared = numericParam({
    name: 'TIMBRE A VOICE COUNT',
    value: 4,
    unit: undefined,
    valueFrom: 'device-part-share',
    range: { min: 0, max: 8, verified: FIXTURE_CITE },
  })

  it('reads the width the allocation carries', () => {
    expect(resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 3 }).value).toBe(3)
    expect(resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 4 }).value).toBe(4)
  })

  it('reads the authored point when the part is on one voice, and only when told so', () => {
    // One is the right answer for an unstacked part and it has to be *said*. There is no default
    // standing behind it, because a default of one would make a caller that forgot the
    // allocation indistinguishable from a part that really is on one voice.
    expect(resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 1 }).value).toBe(1)
  })

  it('refuses to resolve with no allocation at all', () => {
    // The silent version of this prints `POLYPHONY 1` on a triad, which is #433 reached from
    // inside the engine instead of from a missing recipe line.
    expect(() => resolveParam(sourced, false, NEUTRAL_MOOD)).toThrow(/no allocation/)
  })

  it('refuses an allocation that carries the other source', () => {
    // #424. With two members, "no allocation" is no longer the only way to arrive with nothing:
    // a caller can hand over an allocation that answers a question this parameter did not ask.
    // A source is absent unless it is stated, so reading the neighbouring member — or falling
    // back to the authored point — would be the same silent-plausible-number failure the throw
    // above exists to stop, reached from one field over.
    expect(() => resolveParam(sourced, false, NEUTRAL_MOOD, { devicePartShare: 8 })).toThrow(
      /no allocation carrying one/,
    )
    expect(() => resolveParam(shared, false, NEUTRAL_MOOD, { stackWidth: 3 })).toThrow(
      /no allocation carrying one/,
    )
  })

  it('dispatches on the source rather than reading whichever number is there', () => {
    // The two are different questions and an allocation carries both at once: a stacked part on
    // a shared box has a width and a share, and they are not the same number. A dispatch that
    // read the first defined field would print one of them under the other's name.
    const both = { stackWidth: 3, devicePartShare: 8 }
    expect(resolveParam(sourced, false, NEUTRAL_MOOD, both).value).toBe(3)
    expect(resolveParam(shared, false, NEUTRAL_MOOD, both).value).toBe(8)
  })

  it('reads the share the allocation carries, at both of the counts the Muse produces', () => {
    expect(resolveParam(shared, false, NEUTRAL_MOOD, { devicePartShare: 8 }).value).toBe(8)
    expect(resolveParam(shared, false, NEUTRAL_MOOD, { devicePartShare: 4 }).value).toBe(4)
  })

  it('refuses a share the control has no room for, exactly as it refuses a width', () => {
    expect(() => resolveParam(shared, false, NEUTRAL_MOOD, { devicePartShare: 9 })).toThrow(
      /outside its declared range 0-8/,
    )
    expect(() => resolveParam(shared, false, NEUTRAL_MOOD, { devicePartShare: -1 })).toThrow(
      /outside its declared range 0-8/,
    )
  })

  it('refuses a width the control has no room for, rather than rounding it off', () => {
    // A sourced value is a requirement: this many voices, or the part does not sound the notes
    // the guide already told the reader to write. Clamping would print a number the reader can
    // enter and a chord that plays short.
    expect(() => resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 12 })).toThrow(
      /outside its declared range 1-8/,
    )
    expect(() => resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 0 })).toThrow(
      /outside its declared range 1-8/,
    )
  })

  it('leaves an ordinary parameter resolvable with no allocation', () => {
    // The hardening is aimed at sourced parameters and reaches nothing else — nothing about a
    // CUTOFF depends on how wide the stack is.
    expect(resolveParam(numericParam(), false, NEUTRAL_MOOD).value).toBe(52)
    expect(resolveParams(recipe({ params: [numericParam()] }), NEUTRAL_MOOD)).toHaveLength(1)
  })

  it('reports no move, because no knob made one', () => {
    // `from` means *mood took it from here*, and `Provenance.derived` names the axes that did
    // it. A sourced value can never legally be in that state, so a guide showing `1 → 3` would
    // put an arrow where there is no arithmetic. The authority gate is unchanged and still the
    // point's own `verified`.
    const provisional = resolveParam(sourced, false, NEUTRAL_MOOD, { stackWidth: 3 }).provenance
    expect(provisional).toEqual({ state: 'provisional' })

    const cited = resolveParam(
      { ...sourced, verified: FIXTURE_CITE },
      false,
      NEUTRAL_MOOD,
      { stackWidth: 3 },
    ).provenance
    expect(cited).toEqual({ state: 'authored', cite: FIXTURE_CITE })
  })

  it('leaves every ordinary parameter exactly where it was', () => {
    // The allocation reaches one kind of parameter and no other. A recipe of plain numerics
    // resolves byte for byte alike at width 1 and width 4, mood included.
    const plain = recipe({
      params: [
        numericParam(),
        numericParam({ name: 'CUTOFF', value: 60, mood: [{ axis: 'darkness', amount: -20 }] }),
        numericParam({ name: 'DECAY', value: 38, verified: FIXTURE_CITE }),
      ],
    })
    const dark = moodState({ darkness: 100 })
    expect(resolveParams(plain, dark, { stackWidth: 4 })).toEqual(
      resolveParams(plain, dark, { stackWidth: 1 }),
    )
  })
})

describe('the Tracker Mini pad, on the rigs that reach it (§12.4)', () => {
  /**
   * Both widths and both pool twins, each named by the first rig and seed that produces it.
   *
   * The `-sample` twin matters as much as the `-synth` one and is the reason this parameter is
   * authored on the base recipe rather than on one id: `onBothPools` splits one patch across two
   * pools, both spend the same synth slot (`sharedAs`), and the slot cannot tell which pool is
   * playing it. A fix on `tm-pad-soft-synth` alone would leave a reader on tracks 1-8 with the
   * bug this issue was filed about.
   */
  const cases = [
    { label: 'three wide, one box', devices: trackerMini, template: breakbeat, width: 3, id: 'tm-pad-soft-synth' },
    { label: 'four wide, one box', devices: trackerMini, template: ambientDub, width: 4, id: 'tm-pad-soft-synth' },
    { label: 'three wide, both boxes', devices: bothPolyend, template: breakbeat, width: 3, id: 'tm-pad-soft-sample' },
    { label: 'four wide, both boxes', devices: bothPolyend, template: ambientDub, width: 4, id: 'tm-pad-soft-sample' },
  ] as const

  for (const c of cases) {
    it(`sets the slot to the width it chose — ${c.label}`, () => {
      const pad = padOf(
        resolve({ devices: c.devices, template: c.template, mood: moodState(), seed: 1 }),
      )
      expect(pad.recipe.id).toBe(c.id)
      expect(pad.assignables).toHaveLength(c.width)
      expect(polyphonyOf(pad)).toBe(c.width)
    })
  }

  it('never disagrees with the stack it is on, anywhere in the catalogue', () => {
    // The claim the whole design rests on: the number on the control and the number of voices
    // carrying the part are one number, on every direction and every seed either Polyend box
    // reaches. A recipe that authored `3` would pass the two three-wide cases above and fail
    // here, which is why this sweep exists rather than a third example.
    let checked = 0
    const widths = new Set<number>()
    for (const devices of [trackerMini, bothPolyend]) {
      for (const template of TEMPLATES) {
        for (let seed = 1; seed <= 12; seed++) {
          const result = resolve({ devices, template, mood: moodState(), seed })
          for (const a of result.assignments) {
            const poly = polyphonyOf(a)
            if (poly === undefined) continue
            expect(poly).toBe(a.assignables.length)
            widths.add(poly)
            checked += 1
          }
        }
      }
    }
    // A sweep that found nothing would pass silently, which is the one way this could stop being
    // a test. Both widths the library actually produces have to be in it.
    expect(checked).toBeGreaterThan(0)
    expect([...widths].sort()).toEqual([3, 4])
  })

  it('sits beside MODEL, where the box puts it', () => {
    // Synth Parameters page 1 of 2 reads `Model | Polyphony | Gain | ...` (p.148), and authored
    // order is render order (§7 step 9), so a reader walking the guide walks the screen.
    const pad = padOf(
      resolve({ devices: trackerMini, template: breakbeat, mood: moodState(), seed: 1 }),
    )
    const names = pad.params.map((p) => p.name)
    expect(names.slice(0, 2)).toEqual(['MODEL', 'POLYPHONY'])
  })

  it('carries p.148 as the range, and nothing as the point', () => {
    // The split this box holds everywhere: the range is the manual's claim, the point is not.
    // Here the point is not even taste — it is the allocation's — and no page says a VAP pad
    // wants three voices, so nothing is badged as though one did.
    const pad = padOf(
      resolve({ devices: trackerMini, template: breakbeat, mood: moodState(), seed: 1 }),
    )
    const poly = pad.params.find((p) => p.name === 'POLYPHONY')
    expect(poly?.range).toEqual({
      min: 1,
      max: 8,
      verified: { kind: 'manual', source: 'Polyend Tracker Mini Manual 2.2.1b, p.148' },
    })
    expect(poly?.provenance).toEqual({ state: 'provisional' })
  })
})

describe('what a share is divided out of (#424)', () => {
  const museDevice = DEVICES.find((d) => d.id === 'moog-muse')

  it('counts every voice a pool can sound, not the members', () => {
    // The Muse is a pool of two timbres at four voices each, and p.106's rule is about the eight
    // — "the Voice Count settings for TIMBRE A and B… always sum to eight". A capacity that
    // counted members would be 2 and would divide into a count no page recognises.
    expect(devicePoolCapacity(museDevice!)).toBe(8)
  })

  it('is zero for a box whose voices are individually authored', () => {
    // A TR-1000's BD, SD and LT are three separate timbres, not a budget to share out. There is
    // no control on that box a share could be written to, and the sweep below refuses one.
    const tr1000 = DEVICES.find((d) => d.id === 'roland-tr-1000')
    expect(devicePoolCapacity(tr1000!)).toBe(0)
  })
})

describe('the range is a requirement, and the library keeps it (§3.1)', () => {
  it('covers everything the source behind each sourced parameter can produce', () => {
    // This is what keeps the resolver's throws theoretical. A number outside the declared range
    // is refused rather than rounded, so a range narrower than its source's reach is a promise
    // the box cannot keep — an authoring mistake nothing else in the build would name.
    //
    // Swept over the whole library rather than the two devices that use this today: the next
    // device to declare a sourced parameter should meet this on the way in, not after a reader
    // hits the throw. **Each source has its own reach and they are checked separately**, because
    // one rule covering both would have to be the looser of the two.
    let widths = 0
    let shares = 0
    for (const device of DEVICES) {
      for (const r of device.recipes) {
        for (const param of r.params) {
          if (param.kind !== 'numeric' || param.valueFrom === undefined) continue
          const where = `${device.id}/${r.id}/${param.name}`

          if (param.valueFrom === 'stack-width') {
            // `voice` on a recipe is the `poolId ?? voiceId` the lookup keys on (§2.2), so this
            // finds the pool where there is one and the fixed voice where there is not. The
            // widest stack a recipe can ever be given is the size of the pool it sits on.
            const voice = device.voices.find((v) => v.id === r.voice)
            const widest = voice !== undefined && voice.kind === 'pool' ? voice.count : 1
            expect(param.range.min, `${where}: an unstacked part is a width of 1`).toBeLessThanOrEqual(1)
            expect(
              param.range.max,
              `${where}: the pool it sits on is ${String(widest)} wide`,
            ).toBeGreaterThanOrEqual(widest)
            widths += 1
            continue
          }

          // #424. A share is the device's whole pool capacity divided by the parts on the box,
          // so the largest it can ever be is that capacity — one part alone — and it falls from
          // there. The floor is checked at one share per pool member, which is the box divided
          // as finely as its own members allow; below that a device is carrying more parts than
          // it has voices to name, which no allocation in this library produces.
          const capacity = devicePoolCapacity(device)
          expect(capacity, `${where}: a share is a division of a pool, and this device has none`)
            .toBeGreaterThan(0)
          const members = expand(device).filter((a) => a.poolId !== undefined).length
          expect(
            param.range.max,
            `${where}: one part alone takes all ${String(capacity)} of this box's voices`,
          ).toBeGreaterThanOrEqual(capacity)
          expect(
            param.range.min,
            `${where}: ${String(members)} parts sharing takes it to ${String(Math.floor(capacity / members))}`,
          ).toBeLessThanOrEqual(Math.floor(capacity / members))
          shares += 1
        }
      }
    }
    // The Tracker Mini's soft pad on both pool twins, and the Muse's count on all eighteen of its
    // recipes. A sweep that found nothing would pass silently.
    expect(widths).toBe(2)
    expect(shares).toBe(18)
  })
})

describe('the word `Polyphony` belongs to the panel (#433)', () => {
  const result = resolve({
    devices: trackerMini,
    template: breakbeat,
    mood: moodState(),
    seed: 1,
  })
  const markdown = renderGuide(result)
  const markup = renderToStaticMarkup(
    createElement(Guide, { result, seed: 1, layout: 'phase' }),
  )

  it('heads the realisation sentence `Chord voicing` in both renderers', () => {
    expect(markdown).toContain('Chord voicing — 3 notes, one on each of 3 voices')
    expect(markup).toContain('Chord voicing — 3 notes, one on each of 3 voices')
  })

  it('leaves the name to the control that is printed with it', () => {
    // The collision is the whole point: a reader who met `Polyphony` as a guide heading had
    // every reason to think the box's `Polyphony` was covered. It was not, and the part did not
    // sound. So the only `Polyphony` a guide says now is the one on the panel.
    expect(markdown).not.toContain('Polyphony — ')
    expect(markup).not.toContain('Polyphony — ')
    expect(markdown).toContain('POLYPHONY')
    expect(markup).toContain('POLYPHONY')
  })

  it('prints the same count in the prose and on the control', () => {
    const pad = padOf(result)
    expect(markdown).toContain(`one on each of ${pad.assignables.length} voices`)
    expect(markdown).toContain(`**POLYPHONY** \`${pad.assignables.length}\``)
  })
})
