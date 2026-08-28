import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_FACTS,
  CONTENT_FACT,
  DeviceContentSchema,
  DeviceSchema,
  contentNotice,
  isCite,
  moodState,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { CapabilityEvidence, Device, ResolveResult } from '../lib/core/index'
import { auditDevice } from '../lib/studio/provenance'
import { Guide } from '../components/guide/guide'
import { box, makeRecipe, request, withRoles } from './rigs'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §2.6/#111. A device's content is enumerable, a shipped library, user-supplied, or unknown —
 * and before this only the first and third were sayable.
 *
 * `sourceAudio.need` (#101) answers "what audio" in prose. That is right for a box whose content
 * is genuinely the reader's, and it is a confident *bring your own* for a box nobody here owns
 * and nobody has checked. The device backlog (#57) is mostly such boxes, so unknown is the
 * default state for everything added from here on and it rendered as a claim.
 *
 * These tests are about five obligations: that declaring the state is a positive claim and
 * carries a page, that a page with no claim behind it is refused, that a box a recipe loads audio
 * onto **cannot stay silent** — the hole #111 is actually about — that `enumerable` and
 * `shipped-library` stay apart, and that the state reaches a reader once per device, above the
 * parts, in both renderers, which share no ink.
 *
 * The fourth is what closes it. Representing unknown as the absence of a field left the state
 * sayable but not *required*, so a manifest could still reach a reader with a `sourceAudio.need`
 * and nothing behind it — which renders as a confident *bring your own* on no evidence, the exact
 * failure the field was added to end. `DeviceSchema` now demands an entry from any device with a
 * `sourceAudio` recipe and refuses `false` there, so every unknown that reaches a reader carries
 * a reason somebody wrote.
 */

const CITE = { kind: 'manual', source: 'fixture manual p.7' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const
/**
 * The three readings, each written to the bar its state actually has to clear — the first pass
 * over the real library cleared the wrong ones and had to be redone, so the fixtures say what
 * separates them.
 *
 *  - `unknown`   the documents were opened and the reading ran out. The common shape: the manual
 *                establishes the box *does* ship content and never says what.
 *  - `unread`    a **specific named document** nobody here can open. "Documented somewhere else"
 *                names no document and is a reading that stopped, not this.
 *  - `cited-against`  the document answers *no* to the claim the field would make. A manual
 *                saying the box ships fifty packs answers yes and then declines to list them,
 *                which is `unknown`.
 */
const UNKNOWN = {
  kind: 'unknown',
  reason: 'p.7 says the included card holds sounds and samples; nothing here names them',
} as const
const UNREAD = {
  kind: 'unread',
  reason: 'the Fixture Sound List, the one document that enumerates them, is not in `manuals/`',
} as const
const AGAINST = {
  kind: 'cited-against',
  cite: CITE,
  reason: 'p.4 says this box has no content of its own to speak of',
} as const

/**
 * The shape every sampling device in the real library is in: the box arrives with content, a page
 * says where it lives, and no page prints the filenames. Named the way a manifest must — what a
 * reader recognises, where they go on the box, and why a recipe here still describes its audio.
 */
const SHIPS = {
  kind: 'shipped-library',
  library: 'a factory sample library',
  location: 'the FACTORY folder on the card',
  reason: 'p.7 names the folder and no page lists what is in it',
} as const

/**
 * A box with one sample-playing recipe, so the content question is live for it — and therefore a
 * box the schema requires an entry at `content` from. The default is the reasoned unknown, which
 * is what most of the library is in: somebody looked and did not settle it.
 */
function loader(over: Partial<Device> = {}): Device {
  return box('A-loader', {
    voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
    recipes: [
      makeRecipe('a-kick', 'kick', 'hard', 'bd', {
        sourceAudio: { need: 'A short, dark kick sample with no tail' },
      }),
    ],
    capabilityEvidence: { [CONTENT_FACT]: UNKNOWN },
    ...over,
  })
}

/** The same box with a voice that makes its own sound, so the question was never asked. */
function generator(over: Partial<Device> = {}): Device {
  return box('A-generator', {
    voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
    recipes: [makeRecipe('a-kick', 'kick', 'hard', 'bd')],
    ...over,
  })
}

function guide(...devices: Device[]): ResolveResult {
  return resolve({
    devices,
    template: withRoles([request({ id: 'r-kick', role: 'kick' })]),
    mood: moodState(),
    seed: 1,
  })
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x2014;/g, '—')
}

/** Both renderers reading one result, which is the only way two hand-written copies stay level. */
function both(result: ResolveResult): string[] {
  return [renderGuide(result), text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))]
}

describe('DeviceContent is three declarable states, and the fourth is a reasoned non-claim (§2.6/#111)', () => {
  it('accepts the three kinds and refuses an enumerable library with no name', () => {
    expect(DeviceContentSchema.safeParse({ kind: 'user-supplied' }).success).toBe(true)
    expect(
      DeviceContentSchema.safeParse({ kind: 'enumerable', library: 'the GEN generator list' })
        .success,
    ).toBe(true)
    expect(DeviceContentSchema.safeParse(SHIPS).success).toBe(true)
    // A list a reader cannot look up is a description, which is the thing referencing replaces.
    expect(DeviceContentSchema.safeParse({ kind: 'enumerable' }).success).toBe(false)
    expect(DeviceContentSchema.safeParse({ kind: 'enumerable', library: '' }).success).toBe(false)
  })

  it('refuses a shipped library missing any of its three fields', () => {
    // All three are load-bearing and none is inferable from the others. `library` is what a
    // reader recognises, `location` is where they go on the box — the half `sourceAudio.need`
    // could never say — and `reason` is why they are being handed prose instead of a filename.
    // A shipped library with no reason is `enumerable`'s promise with the list quietly missing.
    for (const field of ['library', 'location', 'reason'] as const) {
      expect(DeviceContentSchema.safeParse({ ...SHIPS, [field]: undefined }).success, field).toBe(
        false,
      )
      expect(DeviceContentSchema.safeParse({ ...SHIPS, [field]: '' }).success, field).toBe(false)
    }
  })

  it('keeps enumerable and shipped-library apart, because they promise different things', () => {
    // `enumerable` says a document prints the names and a part below names one of them.
    // `shipped-library` says the content is there and nobody has listed it. Collapsing them
    // would put the first sentence over the second box, which promises a reader entries they can
    // look up and hands them a prose description instead — the library was in exactly that state
    // for four commits, with all five sampling devices declared `enumerable`.
    expect(DeviceContentSchema.safeParse({ kind: 'shipped-library', library: 'x' }).success).toBe(
      false,
    )
    expect(
      DeviceContentSchema.safeParse({ ...SHIPS, kind: 'enumerable' }).success,
      'enumerable is strict, so the extra fields are refused rather than ignored',
    ).toBe(false)
  })

  it('has no `unknown` kind, because that state is a reading and not a declaration', () => {
    // Unknown is not a third thing a manifest declares about the box. It is what somebody found
    // when they went looking, so it lives in `capabilityEvidence` with #120's other two, where a
    // reason is mandatory — and `contentNotice` turns it into a sentence.
    expect(DeviceContentSchema.safeParse({ kind: 'unknown' }).success).toBe(false)
  })
})

describe('a content declaration is a positive claim and carries a page (§2.6/#111)', () => {
  function parse(over: Partial<Device>) {
    return DeviceSchema.safeParse(loader(over))
  }

  it('accepts either kind of citation beside a declaration', () => {
    for (const cite of [CITE, OBSERVED]) {
      expect(
        parse({
          content: { kind: 'user-supplied' },
          capabilityEvidence: { [CONTENT_FACT]: cite },
        }).success,
        cite.kind,
      ).toBe(true)
    }
    expect(
      parse({ content: SHIPS, capabilityEvidence: { [CONTENT_FACT]: CITE } }).success,
    ).toBe(true)
    // `enumerable` is declared on a box whose parts name entries rather than load files, so it
    // is asserted on a generator here — the pair with `sourceAudio` is refused below.
    expect(
      DeviceSchema.safeParse(
        generator({
          content: { kind: 'enumerable', library: 'the GEN generator list' },
          capabilityEvidence: { [CONTENT_FACT]: CITE },
        }),
      ).success,
    ).toBe(true)
  })

  it('refuses `enumerable` beside a recipe that describes its audio in prose', () => {
    // The guard the library needed and did not have. `enumerable` means a document prints the
    // names and a part below names one of them; `sourceAudio.need` is prose, and prose is the
    // thing referencing replaces. Both halves are individually well-formed, which is why all
    // five sampling devices sat in this contradiction for four commits without a test noticing:
    // the declaration promised entries a reader could look up and every part handed them a
    // description instead. A library no document lists is `shipped-library`.
    const result = parse({
      content: { kind: 'enumerable', library: 'the GEN generator list' },
      capabilityEvidence: { [CONTENT_FACT]: CITE },
    })
    expect(result.success).toBe(false)
    const issues = JSON.stringify(result.error?.issues)
    expect(issues).toContain('shipped-library')
    // Reported at the recipe that contradicts the declaration, not at the declaration: which of
    // the two is wrong is the author's call, and the path says which parts are the evidence.
    expect(issues).toContain('"sourceAudio"')
  })

  it('lets a shipped library stand beside exactly that prose, which is the point of it', () => {
    // The state exists so a box can say "the content is here, and no document names it" and
    // still describe what each part needs. Refusing the pair here would leave the five real
    // devices with nowhere honest to stand.
    expect(parse({ content: SHIPS, capabilityEvidence: { [CONTENT_FACT]: CITE } }).success).toBe(
      true,
    )
  })

  it('refuses a declaration with no evidence at all', () => {
    const result = parse({ content: { kind: 'user-supplied' } })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('positive claim')
  })

  it('refuses a declaration standing on any of the four non-claims', () => {
    // Each of these supports an *absence*. Declaring the box user-supplied on top of one would
    // put the guide's most confident sentence on nobody's reading — and establishing it is the
    // expensive direction: the Tracker Mini's took a 344-page manual and the unit in hand.
    const nonClaims: CapabilityEvidence[] = [false, UNKNOWN, UNREAD, AGAINST]
    for (const declaration of [{ kind: 'user-supplied' } as const, SHIPS]) {
      for (const evidence of nonClaims) {
        const result = parse({
          content: declaration,
          capabilityEvidence: { [CONTENT_FACT]: evidence },
        })
        expect(result.success, `${declaration.kind} ${JSON.stringify(evidence)}`).toBe(false)
      }
    }
  })

  it('refuses a citation with no declaration behind it, and names the state that fits', () => {
    // The Cascadia's lesson (#120) in the other direction: a `Cite` on a path whose field is
    // absent reads as evidence *for* a claim nobody made.
    const result = parse({ capabilityEvidence: { [CONTENT_FACT]: CITE } })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('cited-against')
  })

  it('accepts each of #120\'s three reasoned non-claims with no declaration', () => {
    // Finished work that came back empty, and each says a different thing about why: the
    // document is silent, the document is not here, the document answers the other way.
    for (const evidence of [UNKNOWN, UNREAD, AGAINST] as CapabilityEvidence[]) {
      expect(
        parse({ capabilityEvidence: { [CONTENT_FACT]: evidence } }).success,
        JSON.stringify(evidence),
      ).toBe(true)
    }
  })

  it('refuses `false` here, which says nothing the omission does not', () => {
    // `false` is a real state everywhere else — "authored, nothing checked against" — because
    // the field beside it is a claim somebody made. An entry at `content` exists only to say
    // something about a declaration that is *absent*, so one with no reason is the shrug §2.6
    // refuses wearing a field name.
    const result = parse({ capabilityEvidence: { [CONTENT_FACT]: false } })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('says nothing the omission does not')
  })

  it('refuses a device whose recipe loads audio and says nothing at all', () => {
    // The hole #111 is about, as a build failure. `sourceAudio.need` is prose that reads as
    // *bring your own*, and on a box nobody here has checked that is a confident claim about our
    // own knowledge which nobody made.
    const silent = box('A-silent', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [
        makeRecipe('a-kick', 'kick', 'hard', 'bd', {
          sourceAudio: { need: 'A short, dark kick sample with no tail' },
        }),
      ],
    })
    const result = DeviceSchema.safeParse(silent)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('must say what this box ships')
  })

  it('lets a box whose voices generate their own sound stay silent', () => {
    // It was never asked the question, so it owes nothing. Requiring an entry from every device
    // would be a debt this project never took on, and it would make honest manifests delinquent.
    expect(DeviceSchema.safeParse(generator()).success).toBe(true)
  })

  it('asks of the authored recipes, because a schema cannot see a guide', () => {
    // The renderer asks the narrower question — the parts a reader was actually given — so an
    // unused sample recipe obliges the manifest here and still prints nothing there.
    const unused = box('A-unused', {
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('a-kick', 'kick', 'hard', 'bd'),
        makeRecipe('a-snare', 'snare', 'hard', 'sd', {
          sourceAudio: { need: 'A tight snare one-shot' },
        }),
      ],
    })
    expect(DeviceSchema.safeParse(unused).success).toBe(false)
    expect(
      DeviceSchema.safeParse({
        ...unused,
        // A raw spread, so it replaces the fixture's map outright — `noteDuration` is restated
        // because this box carries recipes and §2.6/#142 asks every such box the question.
        capabilityEvidence: { [CONTENT_FACT]: UNREAD, noteDuration: CITE },
      }).success,
    ).toBe(true)
  })

  it('is a capability fact, so `npm run audit` counts and reports it', () => {
    // Not a second provenance mechanism beside #22's — that is why #111 waited on it.
    expect(CAPABILITY_FACTS).toContain(CONTENT_FACT)
    const audit = auditDevice(loader({ capabilityEvidence: { [CONTENT_FACT]: UNREAD } }))
    // Two facts: this one, and the `noteDuration` every fixture box carries (§2.6/#142). What
    // this test is about is the *unread* count, which is content's alone.
    expect(audit.counts.capabilityFacts).toBe(2)
    expect(audit.counts.unreadCapabilities).toBe(1)
    expect(audit.counts.uncheckedCapabilities).toBe(0)
    expect(audit.findings).toContainEqual({
      deviceId: 'A-loader',
      fact: CONTENT_FACT,
      kind: 'unread-capability',
    })
  })
})

describe('contentNotice decides the state once, for both renderers (§2.6/#111)', () => {
  it('says nothing about a box that was never asked the question', () => {
    // Nothing declared, nothing recorded, and no assigned part loads anything. "Not established"
    // here would be a hole invented to fill (invariant 5), and it would bury the boxes where the
    // state genuinely matters under the ones where it does not.
    expect(contentNotice(generator(), generator().recipes)).toBeUndefined()
  })

  it('reports unknown carrying the reason a reading did not settle it', () => {
    // The sentence #111 was filed for. It can no longer arrive with nothing behind it: the
    // schema refuses a source-audio device that says nothing here, so the reason is always there.
    expect(contentNotice(loader(), loader().recipes)).toEqual({
      state: 'unknown',
      evidence: UNKNOWN,
    })
  })

  it('stays silent where no assigned part loads anything, whatever the manifest recorded', () => {
    // The only silence, and it does not depend on the manifest: a box that recorded a reading —
    // or declared a whole library — still says nothing on a page that asked nothing of it.
    const recorded = generator({ capabilityEvidence: { [CONTENT_FACT]: UNREAD } })
    expect(contentNotice(recorded, recorded.recipes)).toBeUndefined()

    const declared = generator({
      content: SHIPS,
      capabilityEvidence: { [CONTENT_FACT]: CITE },
    })
    expect(contentNotice(declared, declared.recipes)).toBeUndefined()
  })

  it('reports each declared state with the citation that established it', () => {
    const supplied = loader({
      content: { kind: 'user-supplied' },
      capabilityEvidence: { [CONTENT_FACT]: OBSERVED },
    })
    expect(contentNotice(supplied, supplied.recipes)).toEqual({
      state: 'user-supplied',
      evidence: OBSERVED,
    })

    const ships = loader({ content: SHIPS, capabilityEvidence: { [CONTENT_FACT]: CITE } })
    // All three authored fields travel, because all three reach the reader: the place is the
    // half `sourceAudio.need` could never say, and the reason is why they are getting prose.
    expect(contentNotice(ships, ships.recipes)).toEqual({
      state: 'shipped-library',
      library: SHIPS.library,
      location: SHIPS.location,
      reason: SHIPS.reason,
      evidence: CITE,
    })
  })

  it('reports enumerable from a fixture, which is the only place it can now come from', () => {
    // The notice prints only where an assigned part loads audio, and `DeviceSchema` refuses
    // exactly that beside an `enumerable` declaration — so no valid manifest reaches this branch
    // and the TR-1000's `GEN` list is named by each recipe's own cited enum instead. Kept
    // because the state is real in the model and the renderers must not be silently wrong about
    // it if the notice's condition ever widens.
    const listed = loader({
      content: { kind: 'enumerable', library: 'the GEN generator list' },
      capabilityEvidence: { [CONTENT_FACT]: CITE },
    })
    expect(DeviceSchema.safeParse(listed).success).toBe(false)
    expect(contentNotice(listed, listed.recipes)).toEqual({
      state: 'enumerable',
      library: 'the GEN generator list',
      evidence: CITE,
    })
  })

  it('falls back rather than throwing on a fixture the schema would have refused', () => {
    // Unreachable for any manifest that has been through `DeviceSchema` — both halves of this
    // one are refused there, and `test/device-content.test.ts` above proves it. Kept because a
    // hand-built fixture reaching a renderer should render honestly rather than crash the page
    // somebody is holding at the machine, which is `requiredEvidence`'s rule.
    const undeclared = box('A-bypass', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [
        makeRecipe('a-kick', 'kick', 'hard', 'bd', {
          sourceAudio: { need: 'A short, dark kick sample with no tail' },
        }),
      ],
      content: { kind: 'user-supplied' },
    })
    expect(DeviceSchema.safeParse(undeclared).success).toBe(false)
    expect(contentNotice(undeclared, undeclared.recipes)).toEqual({
      state: 'unknown',
      evidence: undefined,
    })
  })

  it('asks about the parts actually assigned, not the whole library', () => {
    // A box with one unused sample recipe is not thereby a box whose content is in question.
    const device = box('A-mixed', {
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('a-kick', 'kick', 'hard', 'bd'),
        makeRecipe('a-snare', 'snare', 'hard', 'sd', {
          sourceAudio: { need: 'A tight snare one-shot' },
        }),
      ],
      capabilityEvidence: { [CONTENT_FACT]: UNREAD },
    })
    expect(DeviceSchema.safeParse(device).success).toBe(true)
    const assigned = guide(device).assignments.map((a) => a.recipe)
    expect(assigned).toHaveLength(1)
    // The manifest owes an entry — the schema asked of its authored recipes — and this guide
    // still says nothing, because the sample recipe is not one of the parts a reader was given.
    expect(contentNotice(device, assigned)).toBeUndefined()
    expect(contentNotice(device, device.recipes)).toEqual({
      state: 'unknown',
      evidence: UNREAD,
    })
  })
})

describe('the state reaches a reader once per device, above the parts (§2.6/#111)', () => {
  it('never silently prints a need as bring-your-own, in either renderer', () => {
    for (const doc of both(guide(loader()))) {
      expect(doc).toContain('Source — A short, dark kick sample with no tail')
      expect(doc).toContain('Not established')
      expect(doc).toContain('not that you have to supply it')
      // And never an unreasoned one: whoever did not settle it says why, in both.
      expect(doc).toContain(UNKNOWN.reason)
    }
  })

  it('gives each of the three findings its own instruction, in both', () => {
    // One sentence over #120's three states would be false of most of them, and "nobody here has
    // checked" is a lie about every one of them — each is somebody who did check. They also lead
    // to different next moves: a reading that ran out, a document nobody can open, and a document
    // answering no are not the same news to a reader standing at the box.
    for (const doc of both(guide(loader()))) {
      expect(doc).toContain('the manual was read and does not say')
      expect(doc).not.toContain('Nobody here has checked')
    }
    for (const doc of both(guide(loader({ capabilityEvidence: { [CONTENT_FACT]: UNREAD } })))) {
      expect(doc).toContain('the document that would say is not in')
      expect(doc).not.toContain('the manual was read and does not say')
    }
    for (const doc of both(guide(loader({ capabilityEvidence: { [CONTENT_FACT]: AGAINST } })))) {
      expect(doc).toContain('a document here answers against it')
      expect(doc).not.toContain('the manual was read and does not say')
    }
  })

  it('says it above the part, because the doubt is about the box and not about the recipe', () => {
    // On the part it would be a qualification repeated once per voice, and it would read as a
    // doubt about the recipe rather than about what anybody here has checked.
    for (const doc of both(guide(loader()))) {
      const notice = doc.indexOf('Content')
      expect(notice).toBeGreaterThan(-1)
      expect(notice).toBeLessThan(doc.indexOf('Source —'))
    }
  })

  it('says it once however many parts the device carries', () => {
    const two = box('A-two', {
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('a-kick', 'kick', 'hard', 'bd', {
          sourceAudio: { need: 'A short, dark kick sample with no tail' },
        }),
        makeRecipe('a-snare', 'snare', 'hard', 'sd', {
          sourceAudio: { need: 'A tight snare one-shot' },
        }),
      ],
      capabilityEvidence: { [CONTENT_FACT]: UNKNOWN },
    })
    const result = resolve({
      devices: [two],
      template: withRoles([
        request({ id: 'r-kick', role: 'kick' }),
        request({ id: 'r-snare', role: 'snare' }),
      ]),
      mood: moodState(),
      seed: 1,
    })
    expect(result.assignments).toHaveLength(2)
    for (const doc of both(result)) {
      expect(doc.split('Not established')).toHaveLength(2)
      expect(doc.split('Source —')).toHaveLength(3)
    }
  })

  it('prints each declared state and its page, in both', () => {
    const supplied = guide(
      loader({
        content: { kind: 'user-supplied' },
        capabilityEvidence: { [CONTENT_FACT]: OBSERVED },
      }),
    )
    for (const doc of both(supplied)) {
      expect(doc).toContain('You supply it')
      expect(doc).not.toContain('Not established')
      expect(doc).toContain(OBSERVED.source)
    }

    const ships = guide(loader({ content: SHIPS, capabilityEvidence: { [CONTENT_FACT]: CITE } }))
    for (const doc of both(ships)) {
      expect(doc).toContain(`Ships ${SHIPS.library}`)
      // The place and the reason both reach the reader, in both renderers. The place is what
      // makes this better than the sentence it replaced — `look in the FACTORY folder on the
      // card` is a next move at the machine, where "not established" was a shrug — and the
      // reason is why they are still being handed a description below rather than a filename.
      expect(doc).toContain(`look in ${SHIPS.location}`)
      expect(doc).toContain(SHIPS.reason)
      expect(doc).not.toContain('Not established')
      expect(doc).toContain(CITE.source)
    }
  })

  it('does not say a shipped library the way it says a printed one, in either', () => {
    // Two different promises, and the wrong one is worse than silence: `enumerable`'s sentence
    // sends a reader to look up a name in a list, and there is no list. This is the sentence
    // pair the four-commit misclassification would have printed over every sampling box.
    const listed = 'The parts below name entries from it'
    for (const doc of both(
      guide(loader({ content: SHIPS, capabilityEvidence: { [CONTENT_FACT]: CITE } })),
    )) {
      expect(doc).not.toContain(listed)
      expect(doc).toContain('rather than naming a file')
    }
    // And the other sentence is still printed for the state it belongs to, so the negative above
    // is not passing against a renderer that has simply lost it.
    for (const doc of both(
      guide(
        loader({
          content: { kind: 'enumerable', library: 'the GEN generator list' },
          capabilityEvidence: { [CONTENT_FACT]: CITE },
        }),
      ),
    )) {
      expect(doc).toContain('Ships the GEN generator list')
      expect(doc).toContain(listed)
    }
  })

  it('prints the reason a finished reading came back empty, in both', () => {
    const result = guide(loader({ capabilityEvidence: { [CONTENT_FACT]: AGAINST } }))
    for (const doc of both(result)) {
      expect(doc).toContain(AGAINST.reason)
      expect(doc).toContain(AGAINST.cite.source)
    }
  })

  it('stays silent about a box that generates its own sound, in both', () => {
    for (const doc of both(guide(generator()))) {
      expect(doc).not.toContain('Content')
      expect(doc).not.toContain('Not established')
    }
  })
})

/**
 * §2.6/#111. **A box established to ship a library must not be left reading as unknown.**
 *
 * This is the correction the first pass over the library needed three times, and every wrong
 * answer looked like diligence. **All five** devices that author `sourceAudio` have a page saying
 * the box arrives with content a reader can open and browse — and they were recorded first as
 * `unread`, then as `unknown`, then as `enumerable`. The first two understate a reading that
 * *finished*: what no document does is print the filenames, and that is a limit on the manual
 * rather than on what anybody knows about the box. The third overstates it in the other
 * direction, promising entries a reader can look up in a list nobody has ever printed.
 *
 * The Deluge was the last to move and it moved on a drawing, which is the pattern: printed p.12
 * (PDF page 18) is titled "Factory Library" and annotates `SAMPLES/ARTISTS` and `SAMPLES/DRUMS`
 * as supplied samples, against three sibling folders marked user files or initially empty. Four
 * of the five facts in this table are invisible to `pdftotext`.
 *
 * So the assertion is on the real manifests, not on a fixture. A fixture cannot catch a device
 * folder quietly regressing to the careful-looking answer.
 */
describe('a device with a shipped library is declared, not left unknown (§2.6/#111)', () => {
  const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

  /**
   * **Derived from the manifests, not hand-listed.** A literal list covers the devices somebody
   * remembered, which is the wrong four the moment a fifth box declares a library — and a device
   * can declare one without authoring a single `sourceAudio` recipe (the TR-1000's GEN list is
   * exactly that shape), so the source-audio enumeration further down would not catch it either.
   * Deriving means every declaration is covered by every assertion below on the day it lands.
   */
  const SHIPPED = DEVICES.filter((d) => d.content?.kind === 'shipped-library')
    .map((d) => d.id)
    .sort(byCodeUnit)

  /**
   * The subset whose parts actually load audio, which is the only condition under which the guide
   * prints a content notice at all (`contentNotice`). Kept apart from `SHIPPED` so a box that
   * ships a library its recipes never reach still has its *declaration* checked without the
   * render assertions failing on a page that correctly says nothing.
   */
  const SHIPPED_LOADERS = DEVICES.filter(
    (d) =>
      d.content?.kind === 'shipped-library' && d.recipes.some((r) => r.sourceAudio !== undefined),
  )
    .map((d) => d.id)
    .sort(byCodeUnit)

  it('is the ten boxes established to ship one, and an eleventh has to be added deliberately', () => {
    // The derivation covers whatever is declared; this says which declarations were expected, so
    // a new one is loud in review rather than silently absorbed.
    expect(SHIPPED).toEqual([
      'akai-mpc-live-iii',
      // The One G2 reads the same folder off a different document, and names it: v3.9 p.138 has
      // the Content buttons enter `Expansions/The Vault 2` and `Expansions/Instruments` on the
      // internal drive. A named expansion is more than v3.7 gave, and still not an inventory of
      // what is in it, which is the line between `shipped-library` and `enumerable`.
      'akai-mpc-one-g2',
      'akai-mpc-xl',
      'elektron-digitakt-ii',
      'polyend-tracker-mini',
      'roland-mc-101',
      'roland-tr-6s',
      'roland-tr-8s',
      'synthstrom-deluge',
      // The OP-XY ships factory presets for every engine and category (p.52) and a factory
      // projects folder (p.37), and no page enumerates either. Its three browser screenshots
      // reuse one set of seven names across projects, presets and samples, which is what
      // disqualifies them as an inventory and this device as `enumerable`.
      'teenage-engineering-op-xy',
    ])
    expect(SHIPPED_LOADERS).toEqual(SHIPPED)
  })

  function device(id: string): Device {
    const found = DEVICES.find((d) => d.id === id)
    expect(found, id).toBeDefined()
    return found as Device
  }

  it.each(SHIPPED)('%s declares a shipped library rather than a non-claim', (id) => {
    const d = device(id)
    expect(d.content, id).toEqual({
      kind: 'shipped-library',
      library: expect.any(String),
      location: expect.any(String),
      reason: expect.any(String),
    })
    // Named as a reader would find it on the box, not as a category we invented — and the place
    // is a place, not a restatement of the name.
    const content = d.content as { library: string; location: string; reason: string }
    expect(content.library.length, id).toBeGreaterThan(10)
    expect(content.location.length, id).toBeGreaterThan(10)
    expect(content.reason.length, id).toBeGreaterThan(10)
    expect(content.location, id).not.toEqual(content.library)
  })

  it('has no device left declaring `enumerable`, and none may while its parts load files', () => {
    // The state is not retired — the TR-1000's `GEN` list is its shape — but nothing in the
    // library is in it today, and the schema now makes the contradiction that put all five here
    // unrepresentable rather than merely discouraged.
    for (const d of DEVICES) {
      if (d.content?.kind !== 'enumerable') continue
      expect(
        d.recipes.every((r) => r.sourceAudio === undefined),
        d.id,
      ).toBe(true)
    }
  })

  it.each(SHIPPED)('%s carries a citation, because declaring is a positive claim', (id) => {
    const evidence = device(id).capabilityEvidence?.[CONTENT_FACT]
    expect(evidence, id).toBeDefined()
    expect(isCite(evidence as CapabilityEvidence), id).toBe(true)
  })

  it.each(SHIPPED)('%s never reaches a reader as unknown', (id) => {
    const d = device(id)
    const notice = contentNotice(d, d.recipes)
    expect(notice?.state, id).toBe('shipped-library')
    expect(notice?.state, id).not.toBe('unknown')
  })

  /**
   * A guide from this device alone in which at least one assigned part loads audio — which is the
   * only condition under which the content notice prints at all, so a test that did not find one
   * would be asserting against a page with nothing on it.
   *
   * Searched across the real templates rather than pinned to one, because which recipe a template
   * assigns is the resolver's business and pinning it would make this test fail on an unrelated
   * objective change instead of on the thing it is about.
   */
  function loadingGuide(id: string): ResolveResult {
    const only = DEVICES.filter((d) => d.id === id)
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: only, template, mood: moodState(), seed })
        if (result.assignments.some((a) => a.recipe.sourceAudio !== undefined)) return result
      }
    }
    throw new Error(`no template assigns a source-audio part on ${id}`)
  }

  it.each(SHIPPED_LOADERS)('%s says its library in both renderers, never "Not established"', (id) => {
    const d = device(id)
    const content = d.content as { library: string; location: string; reason: string }
    for (const doc of both(loadingGuide(id))) {
      expect(doc, id).toContain(`Ships ${content.library}`)
      // The place to look on this box, which is the half no `Source` line could ever carry —
      // and the reason a `Source` line is still what they get.
      expect(doc, id).toContain(`look in ${content.location}`)
      expect(doc, id).toContain(content.reason)
      // The rendered strings the four wore while they were recorded as non-claims. A reader
      // standing at one of these boxes was being told nothing was established about content it
      // demonstrably ships, so these are asserted as text and not only as a state.
      expect(doc, id).not.toContain('Not established')
      expect(doc, id).not.toContain('Nobody here has checked')
      expect(doc, id).not.toContain('the manual was read and does not say')
      expect(doc, id).not.toContain('is not in `manuals/`')
      // And never the printed-list promise either: there is no list to look a name up in.
      expect(doc, id).not.toContain('The parts below name entries from it')
    }
  })

  it('proves "Not established" is still reachable, from a fixture and not from a device', () => {
    // The negatives above are only worth having if the sentence can still be printed at all —
    // otherwise they pass just as well against a renderer that has lost it entirely.
    //
    // **The control is a fixture on purpose.** It was the Deluge for one commit, which made it a
    // test that fails the day somebody *settles* the Deluge — a control that punishes the work it
    // is watching, and the sort that gets deleted in frustration rather than read. What is being
    // controlled for is a property of the renderer, so it is asserted against a manifest this
    // file owns and can hold in the unknown state deliberately.
    for (const doc of both(guide(loader()))) {
      expect(doc).toContain('Not established')
    }
  })

  it('holds the Deluge to the page that settled it, and is meant to change if that page does', () => {
    // The last of the five to move, and the one that stayed `unknown` on a search of the
    // guidebook while the answer sat in a drawing on printed p.12. The citation is asserted, not
    // just the state: this device has now been recorded three different ways and the page is the
    // only thing that distinguishes a settled reading from a careful-looking guess.
    const deluge = device('synthstrom-deluge')
    expect(deluge.content?.kind).toBe('shipped-library')
    const evidence = deluge.capabilityEvidence?.[CONTENT_FACT]
    expect(evidence).toEqual({ kind: 'manual', source: expect.stringContaining('p.12') })
    expect(contentNotice(deluge, deluge.recipes)?.state).toBe('shipped-library')
  })

  it('accounts for every device that authors a sourceAudio recipe', () => {
    // If a sixth appears, this fails rather than letting it slip in unexamined — which is what
    // the schema rule buys and what a hand-listed test would otherwise quietly lose. Every one
    // of them ships a library today, and none is `user-supplied`: #111 nominated the Tracker
    // Mini for that state and its manual says the opposite, so no device is in it.
    const loaders = DEVICES.filter((d) => d.recipes.some((r) => r.sourceAudio !== undefined))
      .map((d) => d.id)
      .sort(byCodeUnit)
    expect(loaders).toEqual(SHIPPED_LOADERS)
    expect(DEVICES.some((d) => d.content?.kind === 'user-supplied')).toBe(false)
  })
})
