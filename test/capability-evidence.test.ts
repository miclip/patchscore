import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  CONTENT_FACT,
  DAW_TRANSPORT_FACT,
  PATTERN_ENTRY_FACT,
  CapabilityEvidenceSchema,
  DeviceSchema,
  clockJackNotes,
  clockSourceSetup,
  clockSourceSetupFact,
  evidenceFor,
  jackFact,
  parseKeyedFact,
  requiredEvidence,
} from '../lib/core/index'
import type { CapabilityEvidence, Device } from '../lib/core/index'
import { auditDevice, evidenceKind } from '../lib/studio/provenance'
import { capabilitySentence } from '../lib/studio/device-page'
import { countsBlock, findingLine } from '../scripts/audit-verified'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderGuide, resolve } from '../lib/core/index'
import { EvidenceMark, evidenceLines } from '../components/guide/instruction'
import { DEVICES } from '../lib/devices/registry.generated'
import { GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { device, recipe } from './fixtures'

/**
 * §2.6/#22. Device capability facts had nowhere to record who checked them. `clock`, `io`,
 * `voices` and `features` are read off a manual exactly as a parameter range is, and the
 * TR-1000's nine page references for them lived in code comments — invisible to `npm run audit`
 * and to the device page both.
 *
 * These tests are about the map's three obligations: that a key which names nothing fails the
 * build, that the two rendered families still cannot go uncited, and that every state survives
 * the trip to a reader.
 *
 * #120 is why there are six states rather than four. One word was doing three jobs — the document
 * was read and is silent, the document could not be read at all, and the document answers in the
 * other direction — and the first real data hit all three inside one PR.
 */

const CITE = { kind: 'manual', source: 'fixture manual p.7' } as const
const UNKNOWN = { kind: 'unknown', reason: 'the manual prints no figure for this' } as const
const UNREAD = {
  kind: 'unread',
  reason: 'the module index that would print it is not in `manuals/`',
} as const
const AGAINST = {
  kind: 'cited-against',
  cite: CITE,
  reason: 'the overview calls this a stand-alone instrument',
} as const

/** §2.6/#236. A page that settles part of a composite claim, and names the half it does not. */
const PARTLY = {
  kind: 'partly',
  cite: { kind: 'manual', source: 'Fixture Manual, p.7' },
  proven: 'p.7 gives the pool its count',
  open: 'no page states the per-voice polyphony',
} as const


function patchable(over: Record<string, unknown> = {}) {
  return device({
    jacks: [{ id: 'VCF · IN', direction: 'in', signal: ['audio'] }],
    capabilityEvidence: { [jackFact('VCF · IN')]: CITE },
    recipes: [recipe()],
    ...over,
  } as never)
}

describe('CapabilityEvidence is Verified plus three states (§2.6/#120)', () => {
  it('accepts a citation, an explicit `false`, and all three reasoned states', () => {
    expect(CapabilityEvidenceSchema.safeParse(CITE).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse({ kind: 'observed', source: 'unit' }).success).toBe(
      true,
    )
    expect(CapabilityEvidenceSchema.safeParse(false).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse(UNKNOWN).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse(UNREAD).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse(AGAINST).success).toBe(true)
  })

  it('refuses any of the three with no reason, because that is the shrug they exist to prevent', () => {
    // `false` already says "nobody checked". Each of these claims somebody *did* something and
    // came back with a finding — and a finding with no sentence behind it is indistinguishable
    // from giving up in a field that reads like diligence. The rule was written for `unknown` in
    // #117 and it applies unchanged to the two states #120 added: a bare `unread` does not say
    // which document is missing, and a bare `cited-against` cites a page for a reading nobody
    // wrote down.
    for (const kind of ['unknown', 'unread'] as const) {
      expect(CapabilityEvidenceSchema.safeParse({ kind }).success, kind).toBe(false)
      expect(CapabilityEvidenceSchema.safeParse({ kind, reason: '' }).success, kind).toBe(false)
    }
    expect(CapabilityEvidenceSchema.safeParse({ kind: 'cited-against', cite: CITE }).success).toBe(
      false,
    )
    expect(
      CapabilityEvidenceSchema.safeParse({ kind: 'cited-against', cite: CITE, reason: '' }).success,
    ).toBe(false)
  })

  it('refuses a `cited-against` with no citation, which is the half that makes it that state', () => {
    // Without the page it is an `unknown` wearing a stronger word. The citation is the whole
    // difference between "the document does not say" and "the document says otherwise".
    expect(
      CapabilityEvidenceSchema.safeParse({ kind: 'cited-against', reason: 'because' }).success,
    ).toBe(false)
    expect(
      CapabilityEvidenceSchema.safeParse({
        kind: 'cited-against',
        reason: 'because',
        cite: { kind: 'manual' },
      }).success,
    ).toBe(false)
  })

  it('keeps all six states apart at every layer that reads them', () => {
    expect(evidenceKind(CITE)).toBe('manual')
    expect(evidenceKind({ kind: 'observed', source: 'unit' })).toBe('observed')
    expect(evidenceKind(false)).toBe('unchecked')
    expect(evidenceKind(UNKNOWN)).toBe('undocumented')
    expect(evidenceKind(UNREAD)).toBe('unread')
    expect(evidenceKind(AGAINST)).toBe('cited-against')
  })
})

describe('the path vocabulary is closed and checked (§2.6)', () => {
  it('parses the two keyed families and nothing else', () => {
    expect(parseKeyedFact(jackFact('MIDI IN'))).toEqual({ family: 'jacks', key: 'MIDI IN' })
    expect(parseKeyedFact(clockSourceSetupFact('usb'))).toEqual({
      family: 'clock.sourceSetup',
      key: 'usb',
    })
    expect(parseKeyedFact('io.usbAudio')).toBeUndefined()
    expect(parseKeyedFact('voices[bd]')).toBeUndefined()
    expect(parseKeyedFact('jacks[]')).toBeUndefined()
  })

  it('accepts every scalar fact in the closed list', () => {
    for (const fact of CAPABILITY_FACTS) {
      // §2.6/#111, §8/#65. Two paths need a declaration beside the citation, because both are
      // positive claims about the box rather than readings of a control: what it ships, and
      // whether it can hold a pattern at all. A page with nothing behind it is refused for both
      // (`test/device-content.test.ts`, `test/pattern-entry.test.ts`). `noteDuration` is the
      // third of that kind and the shared fixture already declares it. Every other path accepts
      // a citation on its own — `features.*` and `clock.preferredSource` deliberately so.
      const declaring =
        fact === CONTENT_FACT
          ? { content: { kind: 'user-supplied' } as const }
          : fact === PATTERN_ENTRY_FACT
            ? { patternEntry: { kind: 'external', reason: 'played from elsewhere' } as const }
            : fact === DAW_TRANSPORT_FACT
              ? // §7.4/#79 also refuses the pairing on a box that *can* take a clock, so the
                // fixture has to say it cannot — the declaration and the flag are one claim.
                {
                  dawTransport: { protocol: 'HUI over USB' } as const,
                  clock: { canSendClock: true, canReceiveClock: false, transport: ['usb'] } as const,
                }
              : {}
      const parsed = DeviceSchema.safeParse(
        patchable({
          ...declaring,
          capabilityEvidence: { [jackFact('VCF · IN')]: CITE, [fact]: CITE },
        }),
      )
      expect(parsed.success, fact).toBe(true)
    }
  })

  it('rejects a path that names no field, which is the failure the map exists to make loud', () => {
    // A citation on `io.individualOutz` reads exactly like diligence and cites nothing at all.
    // Free-text keys make that silent; this is the same class of check as a patch entry naming
    // a jack the device does not declare, which §3.3 has refused since it existed.
    const parsed = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: { [jackFact('VCF · IN')]: CITE, 'io.individualOutz': CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain(
      'is not a capability fact',
    )
  })

  it('rejects a jack citation whose jack the device does not declare', () => {
    const parsed = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: { [jackFact('VCF · IN')]: CITE, [jackFact('VCF · 1N')]: CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('does not declare')
  })

  it('rejects a clock setup citation for a transport with no setup', () => {
    const parsed = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: {
          [jackFact('VCF · IN')]: CITE,
          [clockSourceSetupFact('usb')]: CITE,
        },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('does not declare')
  })

  it('requires an entry for every declared clock setup (§7.4/#104)', () => {
    // `ClockSourceSetup.verified` was required before the move and the requirement survived it.
    // A menu path a reader is told to follow, with nobody's name on it, is exactly what #104
    // added the field to prevent.
    const withSetup = {
      clock: {
        canSendClock: true,
        canReceiveClock: true,
        transport: ['midi-din'],
        sourceSetup: [
          { transport: 'midi-din', path: 'Config > MIDI > Clock Out', value: 'MIDI Out jack' },
        ],
      },
    }
    const missing = DeviceSchema.safeParse(patchable(withSetup))
    expect(missing.success).toBe(false)
    expect(JSON.stringify(missing.success ? [] : missing.error.issues)).toContain(
      'has no capabilityEvidence entry',
    )

    expect(
      DeviceSchema.safeParse(
        patchable({
          ...withSetup,
          capabilityEvidence: {
            [jackFact('VCF · IN')]: CITE,
            [clockSourceSetupFact('midi-din')]: CITE,
          },
        }),
      ).success,
    ).toBe(true)
  })

  it('accepts a `features.*` fact whose feature the manifest does not declare', () => {
    // Deliberate, and the reason `unknown` exists at all: evidence *about an absence* is what
    // invariant 5 asks for. The TR-1000's `features.lfo` is the real case — the MOD block is
    // documented and `LfoSpec` cannot hold what the manual says.
    const parsed = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: { [jackFact('VCF · IN')]: CITE, 'features.lfo': UNKNOWN },
      }),
    )
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    // The fixture declares `perStep` and no `lfo`, which is the shape the TR-1000 is in.
    expect((patchable() as { features?: { lfo?: unknown } }).features?.lfo).toBeUndefined()
  })

  it('accepts a citation or an `unknown` for the one judgement in the list (§7.4)', () => {
    // `clock.preferredSource` is a topology judgement, not a capability, and it is in the closed
    // list anyway — the rule is "can a page be asked", not "is this a judgement". A manual does
    // say what a box is *for*; Metropolix's opens by calling itself a musical sequencer and the
    // Tracker Mini's calls itself the centre piece of a setup, and those two sentences are the
    // basis of the library's two claims.
    const claimed = {
      clock: {
        canSendClock: true,
        canReceiveClock: true,
        transport: ['midi-din'],
        preferredSource: true,
      },
      capabilityEvidence: {
        [jackFact('VCF · IN')]: CITE,
        'clock.preferredSource': CITE,
      },
    }
    expect(DeviceSchema.safeParse(patchable(claimed)).success).toBe(true)

    // The state that was missing, and the one worth more here. The Model 2400 held the claim for
    // two commits on a manual proving only that the desk can generate clock; when it came out
    // there was nowhere to record that the manual had been read and had not answered.
    const looked = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: {
          [jackFact('VCF · IN')]: CITE,
          'clock.preferredSource': {
            kind: 'unknown',
            reason: 'the manual states what this desk can drive and never what its job is',
          },
        },
      }),
    )
    expect(looked.success ? [] : looked.error.issues).toEqual([])
  })

  it('accepts `clock.preferredSource` evidence on a manifest that does not claim the field', () => {
    // The same rule as `features.*`, for the same reason: omitting `preferredSource` is what most
    // of the library does, so the omission is the thing that wants accounting for. A slot only
    // reachable by claiming the field would leave every honest omission silent — and after #80 the
    // omissions are where nearly all the evidence lives, eight recorded non-claims against one
    // citation.
    const parsed = DeviceSchema.safeParse(
      patchable({
        capabilityEvidence: {
          [jackFact('VCF · IN')]: CITE,
          'clock.preferredSource': UNKNOWN,
        },
      }),
    )
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(
      (patchable() as { clock: { preferredSource?: boolean } }).clock.preferredSource,
    ).toBeUndefined()
  })

  it('refuses an empty map rather than treating it as silence', () => {
    // Built with neither recipes nor a `noteDuration`, so the fixture adds nothing of its own
    // (§2.6/#142) and the map really is empty — which is the thing this rule is about.
    const bare = device({ recipes: [], noteDuration: undefined, capabilityEvidence: {} } as never)
    expect(DeviceSchema.safeParse(bare).success).toBe(false)
  })
})

describe('the audit can see capability facts now (§2.6/#22)', () => {
  /**
   * No recipes and no `noteDuration`, so the fixture's own declaration and citation are out of
   * the way (§2.6/#142) and the counts below are exactly the facts each test declares. Both are
   * irrelevant here — these are capability counts, and a recipe would only add to the other four.
   */
  function audited(evidence: Record<string, CapabilityEvidence>) {
    return auditDevice(
      patchable({ capabilityEvidence: evidence, recipes: [], noteDuration: undefined }) as unknown as Device,
    )
  }

  it('counts each state apart, and the seven add up', () => {
    const a = audited({
      [jackFact('VCF · IN')]: CITE,
      'io.audioIn': { kind: 'observed', source: 'the unit' },
      'io.usbAudio': false,
      'features.lfo': UNKNOWN,
      'features.sidechain.internal': UNREAD,
      'clock.preferredSource': AGAINST,
      // §2.6/#236. In the fixture as well as the sum: this identity passed while `partly` existed
      // and no fixture used it, which is a test agreeing with itself.
      voices: PARTLY,
    })
    expect(a.counts.capabilityFacts).toBe(7)
    expect(a.counts.manualCapabilities).toBe(1)
    expect(a.counts.observedCapabilities).toBe(1)
    expect(a.counts.citedAgainstCapabilities).toBe(1)
    expect(a.counts.uncheckedCapabilities).toBe(1)
    expect(a.counts.undocumentedCapabilities).toBe(1)
    expect(a.counts.unreadCapabilities).toBe(1)
    expect(a.counts.partlyCapabilities).toBe(1)
    // The identity that has to hold, now over seven terms rather than four. A count that stops
    // adding up means a state was added without a home (§2.6).
    expect(
      a.counts.manualCapabilities +
        a.counts.observedCapabilities +
        a.counts.citedAgainstCapabilities +
        a.counts.uncheckedCapabilities +
        a.counts.undocumentedCapabilities +
        a.counts.unreadCapabilities +
        a.counts.partlyCapabilities,
    ).toBe(a.counts.capabilityFacts)
  })

  it('never folds `unread` into either of the states it looks like', () => {
    // It is not `unchecked`: nobody is failing to open a book. It is not `undocumented` either,
    // which is finished research — this is research nobody here can start, and #118's live
    // incident was an `unknown` whose reason was that the manual is not in `manuals/`.
    const a = audited({ [jackFact('VCF · IN')]: CITE, 'features.lfo': UNREAD })
    expect(a.counts.unreadCapabilities).toBe(1)
    expect(a.counts.uncheckedCapabilities).toBe(0)
    expect(a.counts.undocumentedCapabilities).toBe(0)
  })

  it('keeps `cited-against` out of the cited totals, because what it supports is an absence', () => {
    // It carries a page and it is still not a claim: counted with `manual` it would make a
    // manifest that argues *against* a field read as one that cited it (§2.6, and the Cascadia).
    const a = audited({ [jackFact('VCF · IN')]: CITE, 'clock.preferredSource': AGAINST })
    expect(a.counts.citedAgainstCapabilities).toBe(1)
    expect(a.counts.manualCapabilities).toBe(1)
  })

  it('counts silence as nothing at all, never as a debt', () => {
    // Invariant 4 is scoped to parameter values and #22 did not widen it. A manifest that says
    // nothing about `io.usbAudio` owes nothing; a denominator of every citable fact would make
    // fourteen honest manifests look delinquent.
    const a = audited({ [jackFact('VCF · IN')]: CITE })
    expect(a.counts.capabilityFacts).toBe(1)
    expect(a.findings.filter((f) => 'fact' in f)).toEqual([])
  })

  it('reports every non-claim state, pointing at a path rather than a recipe', () => {
    const a = audited({
      [jackFact('VCF · IN')]: false,
      'io.usbAudio': false,
      'features.lfo': UNKNOWN,
      'features.sidechain.internal': UNREAD,
      'clock.preferredSource': AGAINST,
    })
    const capability = a.findings.filter((f) => 'fact' in f)
    // Code unit order, not authoring order (§7.2): moving a line in a manifest must not reorder
    // a report and make a diff of two runs claim something changed.
    expect(capability.map((f) => ('fact' in f ? f.fact : ''))).toEqual([
      'clock.preferredSource',
      'features.lfo',
      'features.sidechain.internal',
      'io.usbAudio',
      'jacks[VCF · IN]',
    ])
    expect(capability.map((f) => f.kind)).toEqual([
      'cited-against-capability',
      'undocumented-capability',
      'unread-capability',
      'unchecked-capability',
      'unchecked-capability',
    ])
    expect(findingLine(capability[1] as never)).toBe('undocumented-capability: features.lfo')
    expect(findingLine(capability[2] as never)).toBe(
      'unread-capability: features.sidechain.internal',
    )
  })

  it('prints the capability lines only where a manifest has said something', () => {
    const spoke = countsBlock('x', audited({ [jackFact('VCF · IN')]: CITE }).counts)
    expect(spoke.some((l) => l.includes('caps'))).toBe(true)
    expect(spoke.some((l) => l.includes('gaps'))).toBe(true)

    // A row of zeros in a debt table reads as a debt, and silence is not one (§2.6).
    const silent = auditDevice(
      device({ recipes: [], noteDuration: undefined }) as unknown as Device,
    )
    expect(countsBlock('x', silent.counts).some((l) => l.includes('caps'))).toBe(false)
    expect(countsBlock('x', silent.counts).some((l) => l.includes('gaps'))).toBe(false)
  })

  it('splits the same total by one question: is there a document behind this entry (#120)', () => {
    const block = countsBlock(
      'x',
      audited({
        [jackFact('VCF · IN')]: CITE,
        'io.audioIn': { kind: 'observed', source: 'the unit' },
        'io.usbAudio': false,
        'features.lfo': UNKNOWN,
        'features.sidechain.internal': UNREAD,
        'clock.preferredSource': AGAINST,
      }).counts,
    )
    const caps = block.find((l) => l.includes('caps')) as string
    const gaps = block.find((l) => l.includes('gaps')) as string

    // `caps` holds the three states that can point at a page, `cited-against` included: a page
    // that answers *no* is still a page somebody read.
    expect(caps).toMatch(/6 total/)
    expect(caps).toMatch(/1 manual/)
    expect(caps).toMatch(/1 observed/)
    expect(caps).toMatch(/1 cited-against/)

    // `gaps` holds the three that cannot, and they stay three because they cost different things
    // — an afternoon nobody spent, finished research, and a file that is not in `manuals/`.
    expect(gaps).toMatch(/1 unchecked/)
    expect(gaps).toMatch(/1 undocumented/)
    expect(gaps).toMatch(/1 unread/)
    expect(caps).not.toMatch(/unread/)
  })
})

describe('all three states reach a reader (§2.6/#22)', () => {
  it('gives each one its own words on a device page', () => {
    const cited = capabilitySentence({
      ...auditDevice(patchable() as unknown as Device).counts,
      capabilityFacts: 3,
      manualCapabilities: 3,
      observedCapabilities: 0,
      uncheckedCapabilities: 0,
      undocumentedCapabilities: 0,
    })
    expect(cited).toContain('3 of 3 capability facts cited')
    expect(cited).not.toContain('unchecked')

    const mixed = capabilitySentence({
      ...auditDevice(patchable() as unknown as Device).counts,
      capabilityFacts: 4,
      manualCapabilities: 2,
      observedCapabilities: 0,
      uncheckedCapabilities: 1,
      undocumentedCapabilities: 1,
    })
    expect(mixed).toContain('1 unchecked')
    // Stated as finished work, not as a backlog. Rolling it into "unchecked" would invite
    // somebody to go and do the reading again.
    expect(mixed).toContain('the manual does not state it')

    const silent = capabilitySentence({
      ...auditDevice(patchable() as unknown as Device).counts,
      capabilityFacts: 0,
      manualCapabilities: 0,
      observedCapabilities: 0,
      uncheckedCapabilities: 0,
      undocumentedCapabilities: 0,
    })
    expect(silent).toContain('No capability facts')
  })

})

describe('the library after the migration', () => {
  const tr1000 = DEVICES.find((d) => d.id === 'roland-tr-1000') as Device

  it('gives every declared jack and clock setup an entry, on every device', () => {
    for (const d of DEVICES) {
      for (const jack of d.jacks ?? []) {
        expect(evidenceFor(d, jackFact(jack.id)), `${d.id} / ${jack.id}`).toBeDefined()
      }
      for (const setup of d.clock.sourceSetup ?? []) {
        expect(
          evidenceFor(d, clockSourceSetupFact(setup.transport)),
          `${d.id} / ${setup.transport}`,
        ).toBeDefined()
      }
    }
  })

  /**
   * The nine Owner's Manual pages #22 named, now where a machine can read them.
   *
   * Each was re-read on the rendered page before it moved, and two were wrong: the clock comment
   * cited p.33 for "sync settings" and p.33 is the backup procedure — p.30 is the synchronization
   * chapter and p.31 carries the `Tempo Sync` setting. That is the argument for the whole change
   * in one line: a page number nothing reads is a page number nobody rechecks.
   */
  it('carries the TR-1000 capability pages as data rather than comments', () => {
    expect(evidenceFor(tr1000, 'clock.canSendClock')).toEqual({
      kind: 'manual',
      source: 'TR-1000 Owner’s Manual (eng02), p.30',
    })
    expect(evidenceFor(tr1000, 'clock.canReceiveClock')).toEqual({
      kind: 'manual',
      source: 'TR-1000 Owner’s Manual (eng02), p.30',
    })
    // p.12's connector tables — the one page naming every socket the five transports run on.
    expect(evidenceFor(tr1000, 'clock.transport')).toMatchObject({ source: expect.stringContaining('p.12') })
    for (const fact of ['io.main', 'io.individualOuts', 'io.audioIn', 'io.usbAudio'] as const) {
      expect(evidenceFor(tr1000, fact), fact).toMatchObject({
        source: expect.stringContaining('p.12'),
      })
    }
    // p.14: "The variations (A-H) and fill-ins each have 10 tracks (BD, SD, LT, HT, ...)".
    expect(evidenceFor(tr1000, 'voices')).toMatchObject({ source: expect.stringContaining('p.14') })
    // p.17's STEP EDIT table plus p.18's ACCENT [STEP] — three of the eight are gestures, not
    // fields, and they are on the second page.
    expect(evidenceFor(tr1000, 'features.perStep')).toMatchObject({
      source: expect.stringContaining('p.17-18'),
    })
    // Both halves come off Reference p.56, whose SIDE CHAIN `SOURCE` row enumerates the trigger
    // and is exhaustive. The external half used to cite Owner's p.30 and used to say `true`:
    // that page lists "Apply a side chain" among the things you can do *to* EXTERNAL IN audio,
    // which is the signal being ducked rather than the trigger the field records.
    for (const path of ['features.sidechain.internal', 'features.sidechain.fromExternalAudio']) {
      expect(evidenceFor(tr1000, path), path).toMatchObject({
        source: expect.stringContaining('Reference Manual'),
      })
      expect(evidenceFor(tr1000, path), path).toMatchObject({
        source: expect.stringContaining('p.56'),
      })
    }
    // No page cites `comfortableVoices`, and there is no slot to try. p.14 says ten; eight is a
    // musical judgement (§12.4).
    expect(evidenceFor(tr1000, 'comfortableVoices' as never)).toBeUndefined()
  })

  it('is the library’s one `unknown`, and it names what the manual does not say', () => {
    const lfo = evidenceFor(tr1000, 'features.lfo')
    expect(lfo).toMatchObject({ kind: 'unknown' })
    expect((lfo as { reason: string }).reason).toContain('DEST 1-3')
    expect(tr1000.features?.lfo).toBeUndefined()
  })

  it('hands both renderers the evidence through the same two lookups', () => {
    // `clockJackNotes` and `clockSourceSetup` are the shared half of §8's two renderers. The
    // wording around them stays written twice; which evidence answers has one right answer.
    const tracker = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
    const notes = clockJackNotes(tracker, 'midi-din')
    expect(notes).toHaveLength(1)
    expect(notes[0]?.jacks).toEqual(['MIDI Out', 'MIDI In'])
    expect(notes[0]?.evidence).toMatchObject({ source: expect.stringContaining('p.13') })

    const setup = clockSourceSetup(tracker, 'usb')
    expect(setup?.value).toBe('USB')
    expect(setup?.evidence).toMatchObject({ source: expect.stringContaining('p.54') })
  })

  /**
   * #120's migration, pinned on the two devices that drove it. Both are `clock.preferredSource`
   * findings about a field that is deliberately absent, and before #120 they wore the same word.
   */
  it('records the Cascadia as cited-against, with the page it is cited to', () => {
    const cascadia = DEVICES.find((d) => d.id === 'intellijel-cascadia') as Device
    const evidence = evidenceFor(cascadia, 'clock.preferredSource')
    expect(evidence).toMatchObject({
      kind: 'cited-against',
      cite: { kind: 'manual', source: expect.stringContaining('p.7') },
    })
    // The reading, not just the page: this manual answers the question rather than skipping it.
    expect((evidence as { reason: string }).reason).toContain('stand-alone instrument')
    expect(evidenceKind(evidence as CapabilityEvidence)).toBe('cited-against')
  })

  it('records the Euroburo\u2019s module-index absences as unread, not as silence', () => {
    const zoia = DEVICES.find((d) => d.id === 'empress-zoia-euroburo') as Device
    for (const fact of [
      'features.lfo',
      'features.sidechain.internal',
      'features.sidechain.fromExternalAudio',
    ]) {
      expect(evidenceFor(zoia, fact), fact).toMatchObject({ kind: 'unread' })
    }
    // The one entry on this box that *is* a finished reading keeps its own state.
    expect(evidenceFor(zoia, 'clock.preferredSource')).toMatchObject({ kind: 'unknown' })
  })

  it('never writes `unknown` about a document nobody could open (#118\u2019s incident)', () => {
    // During #118 an `unknown` was written whose reason was that the manual is not in `manuals/`,
    // by an author citing that manual's p.110 in the same file. `unread` is where that finding
    // goes now, and this is the guard that keeps it there.
    for (const d of DEVICES) {
      for (const [fact, evidence] of Object.entries(d.capabilityEvidence ?? {})) {
        if (evidence === false || evidence.kind !== 'unknown') continue
        expect(evidence.reason, `${d.id} / ${fact}`).not.toMatch(/not in `manuals\/`/)
      }
    }
  })

  it('falls back to `unknown` rather than throwing for a fixture that skipped the schema', () => {
    // Unreachable for anything that has been through `DeviceSchema`. A hand-built fixture that
    // reaches a renderer should render honestly rather than crash the page.
    expect(requiredEvidence(tr1000, 'jacks[NOT A JACK]')).toEqual({
      kind: 'unknown',
      reason: 'no evidence recorded for this fact',
    })
  })
})

/**
 * §8. The guide is read at the machine, and a socket it tells a reader to patch carries whoever
 * checked that the socket is there. Every state is marked, unlike a parameter's — see
 * `evidenceMark` in `lib/core/render.ts` for why that is the same rule rather than an exception
 * to it. What a reader is *shown* for the two states #120 added is #121's question, so it is not
 * settled here and not asserted here.
 */
describe('the guide marks the states it renders apart (§8/§2.6)', () => {
  /** The Tracker Mini's MIDI jacks carry a note, so its clock jack line is the one that renders. */
  function rigWith(evidence: CapabilityEvidence): string {
    const devices = DEVICES.filter(
      (d) => d.id === 'polyend-tracker-mini' || d.id === 'roland-tr-8s',
    ).map((d) =>
      d.id !== 'polyend-tracker-mini'
        ? d
        : {
            ...d,
            capabilityEvidence: {
              ...d.capabilityEvidence,
              [jackFact('MIDI Out')]: evidence,
              [jackFact('MIDI In')]: evidence,
            },
          },
    )
    const result = resolve({
      devices,
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(result.clockSource?.transport).toBe('midi-din')
    return renderGuide(result)
  }

  /** The subordinate lines hanging off the clock jack line, and nothing else's. */
  function linesUnderTypeB(body: string): string[] {
    const lines = body.split('\n')
    const at = lines.findIndex((l) => l.includes('Type B'))
    expect(at, 'the clock jack line renders at all').toBeGreaterThan(-1)
    return lines.slice(at + 1).filter((l, i, all) => l.includes('↳') && all.slice(0, i).every((p) => p.includes('↳')))
  }

  it('names the kind for a cited socket and prints its page', () => {
    const body = rigWith(CITE)
    expect(body).toMatch(/Type B[^\n]* · manual/)
    expect(body).toContain('cite: value manual — fixture manual p.7')
  })

  it('says `unchecked` where nobody has read the rear panel', () => {
    // Not silence. A rig prints a handful of capability facts, so an uncited one is the
    // exception here — the opposite of a provisional parameter, which is the rule and goes
    // unmarked for exactly that reason.
    const body = rigWith(false)
    expect(body).toMatch(/Type B[^\n]* · unchecked/)
    expect(body).not.toMatch(/Type B[^\n]* · manual/)
    // Nothing to cite, so no citation line is invented.
    expect(linesUnderTypeB(body)).toEqual([])
  })

  it('says `undocumented` where somebody looked and the manual is silent, and why', () => {
    const body = rigWith(UNKNOWN)
    expect(body).toMatch(/Type B[^\n]* · undocumented/)
    expect(linesUnderTypeB(body)).toEqual([
      '    - ↳ cite: undocumented — the manual prints no figure for this',
    ])
    // The expensive state is not spelled as the cheap one. Reporting finished research as a
    // backlog invites somebody to do it twice.
    expect(body).not.toMatch(/Type B[^\n]* · unchecked/)
  })

})

/**
 * #33's rule holds here as everywhere: the two renderers are siblings and share no prose. What
 * they must agree on is which *states* exist and that a reader can tell them apart — the words
 * and the ink are written twice on purpose.
 */
describe('the web guide marks the same states (§8/§2.6/#33)', () => {
  const html = (evidence: CapabilityEvidence) =>
    renderToStaticMarkup(createElement(EvidenceMark, { evidence }))

  it('gives each state its own class and its own word', () => {
    expect(html(CITE)).toContain('class="prov prov-cited"')
    expect(html(CITE)).toContain('>manual<')
    expect(html(CITE)).toContain('title="fixture manual p.7"')

    expect(html({ kind: 'observed', source: 'the unit' })).toContain('>observed<')

    expect(html(false)).toContain('class="prov prov-unchecked"')
    expect(html(false)).toContain('>unchecked<')

    expect(html(UNKNOWN)).toContain('class="prov prov-undocumented"')
    expect(html(UNKNOWN)).toContain('>undocumented<')
    // The reason is reachable, not merely counted: a bare `undocumented` is the shrug §2.6
    // refuses, and the mark is the only place a hover can find it.
    expect(html(UNKNOWN)).toContain('title="the manual prints no figure for this"')
  })

  it('hangs the same subordinate lines as the Markdown sibling', () => {
    expect(evidenceLines(CITE)).toEqual(['value manual — fixture manual p.7'])
    expect(evidenceLines(false)).toEqual([])
    expect(evidenceLines(UNKNOWN)).toEqual([
      'undocumented — the manual prints no figure for this',
    ])
  })
})
