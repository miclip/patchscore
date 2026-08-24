import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
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
 * build, that the two rendered families still cannot go uncited, and that all three states
 * survive the trip to a reader.
 */

const CITE = { kind: 'manual', source: 'fixture manual p.7' } as const
const UNKNOWN = { kind: 'unknown', reason: 'the manual prints no figure for this' } as const

function patchable(over: Record<string, unknown> = {}) {
  return device({
    jacks: [{ id: 'VCF · IN', direction: 'in' }],
    capabilityEvidence: { [jackFact('VCF · IN')]: CITE },
    recipes: [recipe()],
    ...over,
  } as never)
}

describe('CapabilityEvidence is Verified plus one state (§2.6)', () => {
  it('accepts a citation, an explicit `false`, and a reasoned unknown', () => {
    expect(CapabilityEvidenceSchema.safeParse(CITE).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse({ kind: 'observed', source: 'unit' }).success).toBe(
      true,
    )
    expect(CapabilityEvidenceSchema.safeParse(false).success).toBe(true)
    expect(CapabilityEvidenceSchema.safeParse(UNKNOWN).success).toBe(true)
  })

  it('refuses an unknown with no reason, because that is the shrug it exists to prevent', () => {
    // `false` already says "nobody checked". `unknown` claims somebody *did* and came back
    // empty, which is a finding — and a finding with no sentence behind it is indistinguishable
    // from giving up in a field that reads like diligence.
    expect(CapabilityEvidenceSchema.safeParse({ kind: 'unknown' }).success).toBe(false)
    expect(CapabilityEvidenceSchema.safeParse({ kind: 'unknown', reason: '' }).success).toBe(false)
  })

  it('keeps `false` and `unknown` apart at every layer that reads them', () => {
    expect(evidenceKind(CITE)).toBe('manual')
    expect(evidenceKind({ kind: 'observed', source: 'unit' })).toBe('observed')
    expect(evidenceKind(false)).toBe('unchecked')
    expect(evidenceKind(UNKNOWN)).toBe('undocumented')
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
      const parsed = DeviceSchema.safeParse(
        patchable({ capabilityEvidence: { [jackFact('VCF · IN')]: CITE, [fact]: CITE } }),
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
    const bare = device({ recipes: [recipe()], capabilityEvidence: {} } as never)
    expect(DeviceSchema.safeParse(bare).success).toBe(false)
  })
})

describe('the audit can see capability facts now (§2.6/#22)', () => {
  function audited(evidence: Record<string, CapabilityEvidence>) {
    return auditDevice(patchable({ capabilityEvidence: evidence }) as unknown as Device)
  }

  it('counts each state apart, and the four add up', () => {
    const a = audited({
      [jackFact('VCF · IN')]: CITE,
      'io.audioIn': { kind: 'observed', source: 'the unit' },
      'io.usbAudio': false,
      'features.lfo': UNKNOWN,
    })
    expect(a.counts.capabilityFacts).toBe(4)
    expect(a.counts.manualCapabilities).toBe(1)
    expect(a.counts.observedCapabilities).toBe(1)
    expect(a.counts.uncheckedCapabilities).toBe(1)
    expect(a.counts.undocumentedCapabilities).toBe(1)
    expect(
      a.counts.manualCapabilities +
        a.counts.observedCapabilities +
        a.counts.uncheckedCapabilities +
        a.counts.undocumentedCapabilities,
    ).toBe(a.counts.capabilityFacts)
  })

  it('counts silence as nothing at all, never as a debt', () => {
    // Invariant 4 is scoped to parameter values and #22 did not widen it. A manifest that says
    // nothing about `io.usbAudio` owes nothing; a denominator of every citable fact would make
    // fourteen honest manifests look delinquent.
    const a = audited({ [jackFact('VCF · IN')]: CITE })
    expect(a.counts.capabilityFacts).toBe(1)
    expect(a.findings.filter((f) => 'fact' in f)).toEqual([])
  })

  it('reports the two non-citation states, pointing at a path rather than a recipe', () => {
    const a = audited({
      [jackFact('VCF · IN')]: false,
      'io.usbAudio': false,
      'features.lfo': UNKNOWN,
    })
    const capability = a.findings.filter((f) => 'fact' in f)
    // Code unit order, not authoring order (§7.2): moving a line in a manifest must not reorder
    // a report and make a diff of two runs claim something changed.
    expect(capability.map((f) => ('fact' in f ? f.fact : ''))).toEqual([
      'features.lfo',
      'io.usbAudio',
      'jacks[VCF · IN]',
    ])
    expect(capability.map((f) => f.kind)).toEqual([
      'undocumented-capability',
      'unchecked-capability',
      'unchecked-capability',
    ])
    expect(findingLine(capability[0] as never)).toBe('undocumented-capability: features.lfo')
  })

  it('prints a capability line only where a manifest has said something', () => {
    const spoke = countsBlock('x', audited({ [jackFact('VCF · IN')]: CITE }).counts)
    expect(spoke.some((l) => l.includes('caps'))).toBe(true)

    const silent = auditDevice(device({ recipes: [recipe()] }) as unknown as Device)
    expect(countsBlock('x', silent.counts).some((l) => l.includes('caps'))).toBe(false)
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
    // Two documents, so two paths. One citation covering both booleans would have named one
    // book and implied the other.
    expect(evidenceFor(tr1000, 'features.sidechain.fromExternalAudio')).toMatchObject({
      source: expect.stringContaining('Owner’s Manual'),
    })
    expect(evidenceFor(tr1000, 'features.sidechain.internal')).toMatchObject({
      source: expect.stringContaining('Reference Manual'),
    })
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
 * checked that the socket is there. All three states are marked, unlike a parameter's — see
 * `evidenceMark` in `lib/core/render.ts` for why that is the same rule rather than an exception
 * to it.
 */
describe('the guide marks all three states apart (§8/§2.6)', () => {
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
describe('the web guide marks the same three states (§8/§2.6/#33)', () => {
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
