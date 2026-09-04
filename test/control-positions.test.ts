import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CONTROL_POSITION_FACT,
  DeviceSchema,
  controlPositionNotice,
  moodState,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Device, GuideLayout, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { device as fixtureDevice, recipe, template as fixtureTemplate } from './fixtures'

/**
 * §3.1/#324. **One fact about one manual, printed once.**
 *
 * The Muse's CC helper appended *"the knob carries no scale and no page maps its position to a CC
 * value"* to every parameter it built. On the rig #324 reported — TR-1000 + Deluge + Muse +
 * Subsequent 37, industrial-techno seed 3 — **76 resolved parameters carried that tail**, each of
 * them 25 words, on a page §8 says is read at the machine and #21 says is usually a phone.
 *
 * **The sentence was not simply right in the wrong place.** It was false on eight of the 41
 * controls it addressed (#325 — p.19 maps the ENVELOPE faders), and on the other 33 it was worded
 * around knobs when seven of them are the MIXER and WAVE MIX sliders. What survives both
 * corrections moved to a device declaration and a `lib/core` verdict both renderers read. These
 * tests hold three things:
 *
 *  - the declaration is a **reasoned finding, checked in both directions**, as `patternEntry`'s
 *    citation is — except that here a citation is what gets refused;
 *  - the notice reaches a reader **exactly once per device, in both renderers and both layouts**
 *    (#33/#230) — a device-level fact rendered per part is the defect all over again;
 *  - **zero parameter tails survive**, which is the half that would otherwise regress silently:
 *    nothing here keys on the note text, so a helper quietly re-appending a sentence would
 *    reach a reader with the notice printed *and* 41 copies underneath it.
 */

const CITE = { kind: 'manual', source: 'A Manual, p.1' } as const
/** The reading, which is what this fact takes: pages opened, join not found. */
const FOUND_NOTHING = {
  kind: 'unknown',
  reason: 'pp.4-9 draw ticks beside every knob and the CC table gives values; neither pairs them',
} as const
const DECLARATION = {
  kind: 'unmapped',
  controls: 'The knobs',
  markings: 'unnumbered ticks',
  exact: 'MIDI CC',
} as const

/**
 * The same declaration carrying the one positive claim, which is what the renderers print as the
 * exception. **A fixture rather than a shipped device since #349** — see the describe below.
 */
const DECLARATION_WITH_MAPPED = {
  ...DECLARATION,
  mapped: { controls: 'the ENVELOPE faders', cite: CITE },
} as const

/** The shared fixture, which already carries the evidence every other required fact needs. */
function withPositions(over: Record<string, unknown> = {}): Device {
  return fixtureDevice({ recipes: [recipe()], ...over } as never)
}

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const evidence = withPositions().capabilityEvidence ?? {}

describe('controlPositions is a reasoned finding, checked in both directions (§3.1/#324)', () => {
  it('accepts a declaration behind a reasoned unknown finding', () => {
    const parsed = DeviceSchema.safeParse(
      withPositions({
        controlPositions: DECLARATION,
        capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: FOUND_NOTHING },
      }),
    )
    expect(parsed.success).toBe(true)
  })

  it('refuses a declaration with no finding at all', () => {
    const parsed = DeviceSchema.safeParse(withPositions({ controlPositions: DECLARATION }))
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('with no finding')
  })

  /**
   * The correction that produced this shape. A page beside *no page says this* names a document
   * making a claim no document makes — it reads as evidence and is not, which is the failure
   * `CLAUDE.md` states as *a cited range can still be the wrong range*. The pages the author read
   * belong in the finding's reason, under the word `undocumented`.
   */
  it('refuses a citation, because an absence is not something a page asserts', () => {
    const parsed = DeviceSchema.safeParse(
      withPositions({
        controlPositions: DECLARATION,
        capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'no page asserts it',
    )
  })

  it('refuses `false` there too, which says nothing the omission does not', () => {
    const parsed = DeviceSchema.safeParse(
      withPositions({
        controlPositions: DECLARATION,
        capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: false },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('unchecked')
  })

  it('refuses a finding with no declaration, which supports no claim', () => {
    const parsed = DeviceSchema.safeParse(
      withPositions({ capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: FOUND_NOTHING } }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'supports no claim',
    )
  })

  it('says nothing about a box that declares nothing, which is nearly all of them', () => {
    expect(controlPositionNotice(withPositions({}))).toBeUndefined()
    expect(controlPositionNotice(undefined)).toBeUndefined()
    // **Nothing in the catalogue declares this since #349**, and the empty list is the assertion
    // rather than an accident of it. The Muse was the only box that ever did; the instrument turned
    // out to show a value on screen as a control is turned, which makes the notice's closing clause
    // — *by hand these are set by ear* — false exactly where a reader would act on it. See the note
    // at `controlPositions` in `lib/devices/moog-muse/index.ts`.
    //
    // The mechanism stays, tested on fixtures, because the state it describes is real and common:
    // a panel whose marks no page maps to a value, on a box with no screen to fall back to.
    const declaring = DEVICES.filter((d) => controlPositionNotice(d) !== undefined).map((d) => d.id)
    expect(declaring).toEqual([])
  })

  it('leaves the exception undefined where a panel has none, so no sentence is invented', () => {
    // Most declaring boxes will have no scaled corner. `mapped` absent must reach the renderers
    // as absent rather than as an empty string they would print a dangling sentence around.
    const notice = controlPositionNotice(
      withPositions({
        controlPositions: DECLARATION,
        capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: FOUND_NOTHING },
      }),
    )
    expect(notice?.mapped).toBeUndefined()
    expect(notice?.controls).toBe('The knobs')
  })

  it('carries the panel’s own phrases through, and the exception with them', () => {
    const notice = controlPositionNotice(
      withPositions({
        controlPositions: DECLARATION_WITH_MAPPED,
        capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: FOUND_NOTHING },
      }),
    )
    expect(notice?.state).toBe('unmapped')
    expect(notice?.controls).toBe('The knobs')
    expect(notice?.markings).toBe('unnumbered ticks')
    expect(notice?.exact).toBe('MIDI CC')
    // The exception is the one positive claim here, so it travels with its own page rather than
    // as a page number inside a sentence.
    expect(notice?.mapped?.controls).toBe('the ENVELOPE faders')
    expect(notice?.mapped?.cite).toEqual(CITE)
    // And the declaration's own half is the reading, not a page: `undocumented`, with the pages
    // that were opened in the reason where a reader can go and check them.
    expect(notice?.evidence.kind).toBe('unknown')
    expect(notice?.evidence.reason).toContain('pp.4-9')
  })

  /**
   * #349, stated as a test because a withdrawn declaration is easy to re-add by reflex. The Muse's
   * panel really does print unnumbered ticks, so a later author reading only the drawings would
   * declare this again — and print *by hand these are set by ear* over values the box displays.
   */
  it('is not declared by the Muse, whose screen shows the value as a control is turned', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')
    expect(muse?.controlPositions).toBeUndefined()
    // `DeviceSchema` requires the pair, so the evidence had to go with it — and this is the half
    // a reflex would leave behind, since it reads as a reading somebody did.
    expect(muse?.capabilityEvidence?.[CONTROL_POSITION_FACT]).toBeUndefined()
  })
})

/** The rig #324 measured on, and the template it measured. */
const RIG = ['roland-tr-1000', 'synthstrom-deluge', 'moog-muse', 'moog-subsequent-37']
const museResult: ResolveResult = resolve({
  devices: DEVICES.filter((d) => RIG.includes(d.id)),
  template: industrialTechno,
  mood: moodState(),
  seed: 3,
})

/**
 * **A guide built on a fixture, because since #349 no shipped device declares this** — see the
 * withdrawal test above.
 *
 * The renderer half of this file could have gone with the Muse, and it must not. The two sentences
 * in `render.ts` and `components/guide/phase-sound.tsx` are hand-written copies of each other, and
 * #33's whole point is that nothing but a test keeps them in step. Deleting the coverage because
 * the catalogue happens to have no user today would leave two copies of a paragraph free to drift
 * until the next box that needs it — which is a panel with no screen, and there will be one.
 */
const noticeResult: ResolveResult = resolve({
  devices: [
    withPositions({
      controlPositions: DECLARATION_WITH_MAPPED,
      capabilityEvidence: { ...evidence, [CONTROL_POSITION_FACT]: FOUND_NOTHING },
    }),
  ],
  template: fixtureTemplate(),
  mood: moodState(),
  seed: 3,
})

const LAYOUTS: readonly GuideLayout[] = ['phase', 'sequencer']
/** The clause that used to sit on every parameter line, and must now sit on none. */
const TAIL = 'no page maps its position to a CC value'
/** The load-bearing half of the notice, in the wording both renderers author separately. */
const NOTICE = 'no page mapping a mark to a MIDI CC value was found'
/** The whole sentence, which is what the two renderers must agree on word for word. */
const SENTENCE =
  'The knobs carry unnumbered ticks. The manual was read and no page mapping a mark to a ' +
  'MIDI CC value was found, so MIDI CC gives the exact setting and by hand these are set by ' +
  'ear. The exception is the ENVELOPE faders.'

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe('the notice reaches a reader once per device, both renderers, both layouts', () => {
  for (const layout of LAYOUTS) {
    it(`prints it once in the Markdown guide (${layout} layout)`, () => {
      const md = renderGuide(noticeResult, { layout })
      expect(occurrences(md, 'Setting by hand')).toBe(1)
      expect(occurrences(md, NOTICE)).toBe(1)
      expect(md).toContain('The knobs carry unnumbered ticks')
      expect(md).toContain('by hand these are set by ear')
      expect(md).toContain('The exception is the ENVELOPE faders')
      // The state a reader is left in, said in words and marked at the end of the line.
      // The reading, reported as a reading: what was looked for and not found, never a claim
      // that the document contains no such page.
      expect(md).toContain('The manual was read and no page mapping a mark')
      expect(md).not.toContain('Not established')
      expect(md).toContain('· undocumented')
      expect(md).toContain('mapped manual — A Manual, p.1')
    })

    it(`prints it once in the web guide (${layout} layout)`, () => {
      const html = renderToStaticMarkup(
        createElement(Guide, { result: noticeResult, seed: 3, layout }),
      )
      expect(occurrences(html, 'Setting by hand')).toBe(1)
      expect(occurrences(html, NOTICE)).toBe(1)
      expect(html).toContain('by hand these are set by ear')
      expect(html).toContain('The exception is the ENVELOPE faders')
      expect(html).toContain('The manual was read and no page mapping a mark')
      expect(html).not.toContain('Not established')
      expect(html).toContain('undocumented')
      expect(html).toContain('mapped manual — A Manual, p.1')
    })
  }

  /**
   * #33. Word for word, because the two sentences are two hand-written copies and nothing but a
   * test keeps them in step. Compared on the whole sentence rather than a fragment: a drift in
   * the middle of it is exactly what a fragment check would miss.
   */
  it('says the same sentence in both renderers', () => {
    // Spelled out rather than rebuilt from the notice's own fields, which is the change #349
    // forced and an improvement on what was here: a sentence assembled from the same three
    // phrases the renderers assemble it from would pass while both renderers drifted together.
    const html = renderToStaticMarkup(
      createElement(Guide, { result: noticeResult, seed: 3, layout: 'phase' }),
    )
    expect(renderGuide(noticeResult)).toContain(SENTENCE)
    // React escapes the apostrophe-free sentence unchanged; nothing in it needs entities.
    expect(html).toContain(SENTENCE)
  })
})

describe('and the parameter lines carry none of it (#324)', () => {
  /**
   * **#324's measurement, and the observable it is stated in.** The report was that the sentence
   * printed on nearly every sound-design step. The number behind it is **76 resolved parameters
   * whose notes carried the tail before, and zero after** — counted on `ResolvedParam`s, which is
   * what an author appended the sentence to and therefore what the fix is about.
   *
   * The test is the *before* and the *after* in one place. `built` is the set that would carry the
   * tail if anything re-appended it, and the filter under it is what does — so this fails loudly
   * whether the helper regresses or the Muse's parameters quietly stop going through it.
   */
  it('counts the 76 parameters that carried the tail, and zero tails on any of them', () => {
    // Keyed on `midiCc`, the typed metadata, rather than on the shape of the sentence. Matching
    // the prose would be the same mistake #324 rejected for the dedupe: a reworded instruction
    // would quietly stop being counted and the measurement would report a fix it had not made.
    const built = museResult.assignments
      .flatMap((a) => a.params)
      .filter((p) => p.midiCc !== undefined)
    expect(built).toHaveLength(76)
    expect(built.filter((p) => p.note?.includes(TAIL))).toEqual([])
    // **And since #349, not even the one sentence that replaced all 76.** The Muse withdrew the
    // declaration when the instrument contradicted its closing clause, so this rig — #324's own
    // rig, the one the measurement was taken on — now prints no panel notice at all.
    expect(occurrences(renderGuide(museResult), NOTICE)).toBe(0)
    expect(renderGuide(museResult)).not.toContain('Setting by hand')
  })

  it('leaves no copy of the old tail anywhere in either renderer or either layout', () => {
    for (const layout of LAYOUTS) {
      expect(renderGuide(museResult, { layout })).not.toContain(TAIL)
      expect(
        renderToStaticMarkup(createElement(Guide, { result: museResult, seed: 3, layout })),
      ).not.toContain(TAIL)
    }
  })

  it('leaves no copy on any authored parameter of any device', () => {
    // Every device, not only the Muse: the sentence is gone, and it must not come back on a
    // sibling that copies the CC helper. `note` is the only place it ever lived.
    const notes = DEVICES.flatMap((d) => d.recipes).flatMap((r) => r.params.map((p) => p.note))
    expect(notes.filter((note) => note !== undefined && note.includes(TAIL))).toEqual([])
  })
})
