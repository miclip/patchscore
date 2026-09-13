import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  MIDDLE_C_FACT,
  PRINTED_MIDDLE_C,
  DeviceSchema,
  middleCImpliedBy,
  middleCNotice,
  moodState,
  parseTriggerNoteName,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Device, GuideLayout, MiddleC, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { Guide } from '../components/guide/guide'
import { device as fixtureDevice, recipe, template as fixtureTemplate } from './fixtures'

/**
 * §4.1/#571. **Where a box puts middle C is a cited fact, checked against the trigger notes
 * beside it, and said once where a reader has to act on it.**
 *
 * Every note this site prints puts middle C at C4. Eight manuals in `manuals/` say outright where
 * MIDI 60 sits and they disagree three ways — the Deluge and the Cascadia at C3, the Elektrons
 * and the Hapax at C5, the MC-707 at C4 — and two Polyend trackers make it a setting. Before
 * #571 no device declared any of that, so `A#4` on a riff page read as `A#5` on one screen with
 * nothing but the note convention's general caveat between them. These tests hold four things:
 *
 *  - the declaration is a **positive claim with a page**, checked in both directions the way
 *    `noteDuration` is, and `false` is refused because it says nothing the omission does not;
 *  - an authored **`TriggerNote` agrees with it**: `note` and `midi` are two spellings of one
 *    mapping and a `middleC` beside them is a third, and three individually cited claims can
 *    disagree with nothing noticing;
 *  - the notice reaches a reader **once per device, in both renderers and both layouts, and
 *    only where there is something to translate** — a box at C4 and a box nobody has settled
 *    both print nothing, on purpose;
 *  - the two hand-written sentences **agree word for word** (#33).
 */

const CITE = { kind: 'manual', source: 'A Manual, p.1' } as const
const READ_AND_SILENT = {
  kind: 'unknown',
  reason: 'pp.20-31 print note names on every screen and no page says which octave MIDI 60 is',
} as const

const FIXED_LOW: MiddleC = { kind: 'fixed', octave: 3 }
const FIXED_HIGH: MiddleC = { kind: 'fixed', octave: 5 }
const FIXED_OURS: MiddleC = { kind: 'fixed', octave: PRINTED_MIDDLE_C }
const SETTING: MiddleC = {
  kind: 'setting',
  control: 'Config > MIDI > Middle C',
  options: [
    { label: 'C-3', octave: 3 },
    { label: 'C-4', octave: 4 },
    { label: 'C-5', octave: 5 },
    { label: 'C-6', octave: 6 },
  ],
}

/** The shared fixture, which already carries the evidence every other required fact needs. */
function withMiddleC(over: Record<string, unknown> = {}): Device {
  return fixtureDevice({ recipes: [recipe()], ...over } as never)
}

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const evidence = withMiddleC().capabilityEvidence ?? {}

function declared(middleC: MiddleC | undefined, at: unknown): Device {
  return withMiddleC({
    ...(middleC === undefined ? {} : { middleC }),
    capabilityEvidence: { ...evidence, ...(at === undefined ? {} : { [MIDDLE_C_FACT]: at }) },
  })
}

function issues(parsed: ReturnType<typeof DeviceSchema.safeParse>): string {
  return JSON.stringify(parsed.success ? [] : parsed.error.issues)
}

describe('middleC is a positive claim, checked in both directions (§4.1/#571)', () => {
  it('is a capability fact on the closed list', () => {
    expect(CAPABILITY_FACTS).toContain(MIDDLE_C_FACT)
  })

  it('accepts a fixed octave behind a citation, at C4 as much as away from it', () => {
    expect(DeviceSchema.safeParse(declared(FIXED_LOW, CITE)).success).toBe(true)
    expect(DeviceSchema.safeParse(declared(FIXED_OURS, CITE)).success).toBe(true)
  })

  it('accepts a setting behind a citation', () => {
    expect(DeviceSchema.safeParse(declared(SETTING, CITE)).success).toBe(true)
  })

  it('refuses a declaration with no citation', () => {
    const parsed = DeviceSchema.safeParse(declared(FIXED_LOW, undefined))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('refuses a declaration behind an unknown, which is a reading that supports no claim', () => {
    const parsed = DeviceSchema.safeParse(declared(FIXED_LOW, READ_AND_SILENT))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('refuses a citation with no declaration behind it', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, CITE))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('no middleC is declared')
  })

  it('refuses `false`, which says nothing the omission does not', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, false))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'false'")
  })

  it('accepts an unknown with a reason and no declaration, which is the finished reading', () => {
    expect(DeviceSchema.safeParse(declared(undefined, READ_AND_SILENT)).success).toBe(true)
  })

  it('refuses a setting whose menu offers one octave twice, or one label twice', () => {
    const twice: MiddleC = {
      kind: 'setting',
      control: 'Middle C',
      options: [
        { label: 'C-3', octave: 3 },
        { label: 'C-4', octave: 3 },
      ],
    }
    expect(issues(DeviceSchema.safeParse(declared(twice, CITE)))).toContain('octave 3')
    const sameLabel: MiddleC = {
      kind: 'setting',
      control: 'Middle C',
      options: [
        { label: 'C-3', octave: 3 },
        { label: 'C-3', octave: 4 },
      ],
    }
    expect(issues(DeviceSchema.safeParse(declared(sameLabel, CITE)))).toContain("'C-3'")
  })

  it('refuses a MIDI number written where an octave was meant', () => {
    const parsed = DeviceSchema.safeParse(declared({ kind: 'fixed', octave: 60 }, CITE))
    expect(parsed.success).toBe(false)
  })
})

/**
 * The arithmetic the check rests on, stated on its own: a name and a MIDI number together imply
 * the octave the box gives MIDI 60, and it is the same fact whichever pitch class the pair sits on.
 */
describe('a trigger note implies where its box puts middle C', () => {
  it('reads a note name into pitch class and octave, and nothing else', () => {
    expect(parseTriggerNoteName('C5')).toEqual({ pitchClass: 0, octave: 5 })
    expect(parseTriggerNoteName('A#3')).toEqual({ pitchClass: 10, octave: 3 })
    expect(parseTriggerNoteName('Bb3')).toEqual({ pitchClass: 10, octave: 3 })
    // Unwrapped on purpose: the octave number belongs to the letter, so Cb4 is a semitone under
    // C4 and B#3 a semitone over B3. Wrapped, both would land an octave out.
    expect(parseTriggerNoteName('Cb4')).toEqual({ pitchClass: -1, octave: 4 })
    expect(parseTriggerNoteName('B#3')).toEqual({ pitchClass: 12, octave: 3 })
    expect(parseTriggerNoteName('C-1')).toEqual({ pitchClass: 0, octave: -1 })
    // The Elektron screen's own spacing, a lower-case letter, a double accidental: none of them
    // is how an author writes a trigger note, and a spelling the check cannot read is refused
    // loudly by the schema rather than checked wrongly here.
    expect(parseTriggerNoteName('C 5')).toBeUndefined()
    expect(parseTriggerNoteName('c5')).toBeUndefined()
    expect(parseTriggerNoteName('C##5')).toBeUndefined()
    expect(parseTriggerNoteName('60')).toBeUndefined()
  })

  it('implies the octave from the pair, on any pitch class', () => {
    expect(middleCImpliedBy({ note: 'C5', midi: 60, verified: CITE })).toBe(5)
    expect(middleCImpliedBy({ note: 'C3', midi: 60, verified: CITE })).toBe(3)
    expect(middleCImpliedBy({ note: 'C4', midi: 60, verified: CITE })).toBe(4)
    // B4 is the semitone under C5 on every box, so the pair says C5 is 60 without naming it.
    expect(middleCImpliedBy({ note: 'B4', midi: 59, verified: CITE })).toBe(5)
    // The two boundary spellings: Cb4 is B3 and B#3 is C4, both under a C4 mapping.
    expect(middleCImpliedBy({ note: 'Cb4', midi: 59, verified: CITE })).toBe(4)
    expect(middleCImpliedBy({ note: 'B#3', midi: 60, verified: CITE })).toBe(4)
    expect(middleCImpliedBy({ note: 'C2', midi: 36, verified: CITE })).toBe(2 + 2)
    expect(middleCImpliedBy({ note: 'A#3', midi: 58, verified: CITE })).toBe(4)
  })

  it('implies nothing where the name and the number are not the same note', () => {
    expect(middleCImpliedBy({ note: 'D5', midi: 60, verified: CITE })).toBeUndefined()
    expect(middleCImpliedBy({ note: 'C 5', midi: 60, verified: CITE })).toBeUndefined()
  })
})

/** A pool voice carrying the note, in the shape the two shipped devices author it. */
function poolWith(note: { note: string; midi: number }) {
  return {
    kind: 'pool',
    id: 'track',
    label: 'Track',
    count: 4,
    roles: ['kick'],
    polyphony: 1,
    triggerNote: { ...note, verified: CITE },
  } as const
}

describe('an authored trigger note is checked against the declared mapping', () => {
  it('passes where a fixed octave and the pair agree', () => {
    const parsed = DeviceSchema.safeParse(
      withMiddleC({
        middleC: FIXED_HIGH,
        voices: [poolWith({ note: 'C5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(issues(parsed)).toBe('[]')
  })

  it('fails loudly where they disagree, naming both citations as the suspects', () => {
    const parsed = DeviceSchema.safeParse(
      withMiddleC({
        middleC: FIXED_LOW,
        voices: [poolWith({ note: 'C5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('puts middle C at C5, but middleC declares C3')
    expect(issues(parsed)).toContain('one of the two citations is wrong')
  })

  it('checks a note on a mode as well as one on the voice', () => {
    const parsed = DeviceSchema.safeParse(
      withMiddleC({
        middleC: FIXED_LOW,
        voices: [
          {
            kind: 'pool',
            id: 'track',
            label: 'Track',
            count: 4,
            roles: ['kick'],
            polyphony: 1,
            modes: [
              {
                id: 'whole',
                label: 'whole sample',
                triggerNote: { note: 'C5', midi: 60, verified: CITE },
              },
              { id: 'sliced', label: 'sliced' },
            ],
          },
        ],
        recipes: [recipe({ voice: 'track', mode: 'whole' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('"voices",0,"modes",0,"triggerNote"')
  })

  it('on a setting box, checks that the menu offers the octave the pair implies', () => {
    const offered = DeviceSchema.safeParse(
      withMiddleC({
        middleC: SETTING,
        voices: [poolWith({ note: 'C5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(issues(offered)).toBe('[]')
    const notOffered = DeviceSchema.safeParse(
      withMiddleC({
        middleC: SETTING,
        voices: [poolWith({ note: 'C2', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(notOffered.success).toBe(false)
    expect(issues(notOffered)).toContain('does not offer')
  })

  it('refuses a pair that is not the same note, and a spelling it cannot read', () => {
    const wrongClass = DeviceSchema.safeParse(
      withMiddleC({
        middleC: FIXED_HIGH,
        voices: [poolWith({ note: 'D5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(issues(wrongClass)).toContain('disagree on pitch class')
    const unreadable = DeviceSchema.safeParse(
      withMiddleC({
        middleC: FIXED_HIGH,
        voices: [poolWith({ note: 'C 5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
        capabilityEvidence: { ...evidence, [MIDDLE_C_FACT]: CITE },
      }),
    )
    expect(issues(unreadable)).toContain('cannot be read as a note name')
  })

  it('checks nothing where no mapping is declared, so an uncited pair stands as it always has', () => {
    const parsed = DeviceSchema.safeParse(
      withMiddleC({
        voices: [poolWith({ note: 'C5', midi: 60 })],
        recipes: [recipe({ voice: 'track' })],
      }),
    )
    expect(issues(parsed)).toBe('[]')
  })
})

describe('the notice decides once, and says nothing where there is nothing to translate', () => {
  it('says nothing for a box that declares nothing, or one nobody has settled', () => {
    expect(middleCNotice(undefined)).toBeUndefined()
    expect(middleCNotice(withMiddleC({}))).toBeUndefined()
    expect(middleCNotice(declared(undefined, READ_AND_SILENT))).toBeUndefined()
  })

  it('says nothing for a box that calls MIDI 60 C4, which already reads as printed', () => {
    expect(middleCNotice(declared(FIXED_OURS, CITE))).toBeUndefined()
  })

  it('carries the octave through for a box fixed away from C4', () => {
    const notice = middleCNotice(declared(FIXED_LOW, CITE))
    expect(notice?.state).toBe('fixed')
    expect(notice?.state === 'fixed' && notice.octave).toBe(3)
    expect(notice?.evidence).toEqual(CITE)
  })

  it('carries the menu through for a box that offers the choice', () => {
    const notice = middleCNotice(declared(SETTING, CITE))
    expect(notice?.state).toBe('setting')
    if (notice?.state !== 'setting') throw new Error('expected a setting notice')
    expect(notice.control).toBe('Config > MIDI > Middle C')
    expect(notice.options.map((o) => o.label)).toEqual(['C-3', 'C-4', 'C-5', 'C-6'])
  })
})

/** Guides built on fixtures, one per state a reader has to act on and one per silence. */
function guideOn(middleC: MiddleC | undefined, at: unknown): ResolveResult {
  return resolve({
    devices: [declared(middleC, at)],
    template: fixtureTemplate(),
    mood: moodState(),
    seed: 3,
  })
}

const LAYOUTS: readonly GuideLayout[] = ['phase', 'sequencer']
const HEADING = 'Note names'
const LOW_SENTENCE =
  'Middle C is C4 here and C3 on this box, so every note printed here reads an octave lower on ' +
  'its screen: C4 here is its C3. A MIDI number, where one is printed, is the same on both.'
const HIGH_SENTENCE =
  'Middle C is C4 here and C5 on this box, so every note printed here reads an octave higher on ' +
  'its screen: C4 here is its C5. A MIDI number, where one is printed, is the same on both.'
const SETTING_SENTENCE =
  'Middle C is C4 here, and on this box it is a setting: Config > MIDI > Middle C offers C-3, ' +
  'C-4, C-5 and C-6. Choose C-4 and every note printed here reads the same on its screen. A ' +
  'MIDI number, where one is printed, is the same whichever you choose.'

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

/** React escapes `>` in text, so the web guide's copy of the setting sentence reads `&gt;`. */
function escaped(sentence: string): string {
  return sentence.replaceAll('>', '&gt;')
}

describe('the notice reaches a reader once per device, both renderers, both layouts', () => {
  for (const layout of LAYOUTS) {
    for (const [name, middleC, sentence] of [
      ['fixed low', FIXED_LOW, LOW_SENTENCE],
      ['fixed high', FIXED_HIGH, HIGH_SENTENCE],
      ['setting', SETTING, SETTING_SENTENCE],
    ] as const) {
      it(`prints the ${name} sentence once in the Markdown guide (${layout} layout)`, () => {
        const md = renderGuide(guideOn(middleC, CITE), { layout })
        expect(occurrences(md, HEADING)).toBe(1)
        expect(md).toContain(sentence)
      })

      it(`prints the ${name} sentence once in the web guide (${layout} layout)`, () => {
        const html = renderToStaticMarkup(
          createElement(Guide, { result: guideOn(middleC, CITE), seed: 3, layout }),
        )
        expect(occurrences(html, HEADING)).toBe(1)
        expect(html).toContain(escaped(sentence))
      })
    }

    it(`prints nothing for a box at C4 or one nobody has settled (${layout} layout)`, () => {
      for (const result of [
        guideOn(FIXED_OURS, CITE),
        guideOn(undefined, READ_AND_SILENT),
        guideOn(undefined, undefined),
      ]) {
        expect(renderGuide(result, { layout })).not.toContain(HEADING)
        const html = renderToStaticMarkup(createElement(Guide, { result, seed: 3, layout }))
        expect(html).not.toContain(HEADING)
      }
    })
  }
})

/**
 * The two shipped declarations, asserted so a later author's reflex is loud in review: the
 * Digitakt II is the one box whose trigger note and middle-C fact rest on the same sentence of
 * the same page, and the Tracker Mini is the box on which a fixed octave would be a false claim.
 */
describe('the catalogue', () => {
  it('declares the Digitakt II fixed at C5, off the page its trigger note cites', () => {
    const dt2 = DEVICES.find((d) => d.id === 'elektron-digitakt-ii')
    expect(dt2?.middleC).toEqual({ kind: 'fixed', octave: 5 })
    expect(middleCNotice(dt2)?.state).toBe('fixed')
  })

  it('declares the Tracker Mini as a setting with no default, offering C-3 to C-6', () => {
    const mini = DEVICES.find((d) => d.id === 'polyend-tracker-mini')
    expect(mini?.middleC?.kind).toBe('setting')
    if (mini?.middleC?.kind !== 'setting') throw new Error('expected a setting')
    expect(mini.middleC.options.map((o) => o.octave)).toEqual([3, 4, 5, 6])
  })

  it('has no device whose declaration the schema refuses', () => {
    for (const device of DEVICES) {
      expect(issues(DeviceSchema.safeParse(device)), device.id).toBe('[]')
    }
  })
})
