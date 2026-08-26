import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NEUTRAL_MOOD, clockFollowing, renderGuide, resolve } from '../lib/core/index'
import type { Device, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { droneStudy } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * #144. **A sentence may only name a set the rig actually has members of.**
 *
 * §8 says the guide is read *at the machine*, and a reader standing in front of one box can see
 * the whole rack. That is what made this class of defect worse than clumsy: every sentence here
 * was talking about boxes the reader could see were not there. A Deluge alone on `drone-study`
 * was the reported case and read, in four separate places:
 *
 *  - `Sync everything else to it.` — there is no everything else.
 *  - `Why this box — nothing here claims that job, so transport, then name, settled it` — two
 *    tie-breaks named, over a field of one candidate, neither of which ran.
 *  - `nothing else in this rig processes audio` — a claim about other boxes, made to a reader
 *    who owns none.
 *  - `Deluge — internal` under Sidechain — the field printed rather than an answer, and the same
 *    word for a box you can patch a trigger into and one you cannot.
 *
 * None of it failed a test, because every assertion in the suite was written against a rig big
 * enough for the sentences to be true. So this file holds the one-box rig and the multi-device
 * rig **side by side** in each case: the fix is worthless if it repairs the small rig by making
 * the large one vaguer, and the only way to see that is to assert both from one place.
 *
 * Both renderers, throughout (#33). A fact that reaches only the Markdown reaches nobody standing
 * at a rack.
 */

const pick = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

/** The reported case. */
const ALONE = pick('synthstrom-deluge')

/** The same box with something to talk to — the rig whose wording must not have moved. */
const PAIR = pick('synthstrom-deluge', 'polyend-tracker-mini')

function result(devices: readonly Device[]): ResolveResult {
  return resolve({ devices, template: droneStudy, mood: NEUTRAL_MOOD, seed: 18 })
}

/** Markup with the tags taken out, so one assertion can be made against both renderers. */
function page(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 18 }))
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

/**
 * Both renderings of one rig. The Markdown keeps its backticks and the page does not, so an
 * assertion made against both is an assertion about the *claim* rather than about the ink —
 * which is the only thing the two are required to agree on.
 */
function both(devices: readonly Device[]): string[] {
  const r = result(devices)
  return [renderGuide(r), page(r)]
}

describe('#144 a one-box rig is not told about boxes it does not have', () => {
  it('is a real rig that really resolves, not a fixture built to fail', () => {
    // The premise. If `drone-study` ever stops assigning anything to a lone Deluge, every
    // assertion below still passes and none of them mean anything, so it is stated here.
    const r = result(ALONE)
    expect(r.devices).toHaveLength(1)
    expect(r.assignments.length).toBeGreaterThan(0)
    expect(r.clockSource).toMatchObject({ deviceId: 'synthstrom-deluge', eligible: 1, claims: 0 })
  })

  it('says there is nothing to sync rather than to sync everything else', () => {
    for (const doc of both(ALONE)) {
      expect(doc).toContain('Nothing else is here to sync to it.')
      expect(doc).not.toContain('Sync everything else')
    }
    // And the instruction survives intact on the rig that can carry it out.
    for (const doc of both(PAIR)) {
      expect(doc).toContain('Sync everything else to it.')
      expect(doc).not.toContain('Nothing else is here to sync')
    }
  })

  it('says the box was the only candidate rather than that a tie-break settled it', () => {
    for (const doc of both(ALONE)) {
      expect(doc).toContain('it is the only box here that can send clock')
      expect(doc).not.toContain('settled it')
    }
    // Two eligible boxes and one of them claims the job, so the claim is what decided and the
    // guide still says so — the case #121 built, unchanged.
    expect(result(PAIR).clockSource).toMatchObject({ eligible: 2, claims: 1 })
    for (const doc of both(PAIR)) {
      expect(doc).toContain('its manual says leading a rig is its job')
      expect(doc).not.toContain('only box here that can send clock')
    }
  })

  it('says the one box is the whole master chain rather than that nothing else processes audio', () => {
    for (const doc of both(ALONE)) {
      expect(doc).toContain('it is the only box here, so that is the whole master chain.')
      expect(doc).not.toContain('nothing else in this rig processes audio')
    }
    // Two boxes that both process audio get the list, which is the branch that never had the
    // defect — asserted so that a change to the single-source sentence cannot quietly take the
    // multi-source one with it.
    for (const doc of both(PAIR)) {
      expect(doc).toContain('What processes audio in this rig')
      expect(doc).not.toContain('only box here')
    }
  })

  it('says where the sidechain trigger can come from, and does not offer a cable to nowhere', () => {
    for (const doc of both(ALONE)) {
      expect(doc).toContain('The Deluge ducks from its own parts, and it is the only box here.')
      // The instruction the reader cannot carry out, and the bare field that used to stand in
      // for an answer.
      expect(doc).not.toContain('patch the box you want')
      expect(doc).not.toContain('Deluge — internal')
    }
    for (const doc of both(PAIR)) {
      expect(doc).toContain('The Deluge ducks from its own parts.')
      expect(doc).toContain('Nothing here ducks to another box, so a rig-wide pump is built box by box.')
    }
  })
})

/**
 * §7.4/#144. The split both renderers write their sentences from. Asserted as a **partition**,
 * because that is the property the wording depends on: `syncText` chooses which sentence to print
 * from `followers` and then names the exempted boxes from the other two lists, so a box that fell
 * out of all three would be silently unmentioned in a sentence claiming to cover the rig.
 */
describe('§7.4/#144 who can actually follow the source', () => {
  const rigs: readonly (readonly Device[])[] = [
    ALONE,
    PAIR,
    pick('roland-tr-1000', 'zoom-livetrak-l-8'),
    pick('polyend-tracker-mini', 'intellijel-metropolix'),
    DEVICES,
  ]

  it('partitions every box but the source, in every rig', () => {
    for (const devices of rigs) {
      const source = result(devices).clockSource
      expect(source).toBeDefined()
      const following = clockFollowing(devices, source!.deviceId, source!.transport)
      const named = [...following.followers, ...following.deaf, ...following.unwired]
      // No box counted twice, and none missed.
      expect(new Set(named.map((d) => d.id)).size).toBe(named.length)
      expect(new Set(named.map((d) => d.id))).toEqual(
        new Set(devices.filter((d) => d.id !== source!.deviceId).map((d) => d.id)),
      )
      expect(following.alone).toBe(devices.length === 1)
    }
  })

  it('reads the transport, not just the capability', () => {
    // The Metropolix takes clock happily and has no MIDI DIN socket to take it on, which is the
    // distinction #121 drew and the one a reader acts on differently.
    const devices = pick('polyend-tracker-mini', 'intellijel-metropolix')
    expect(clockFollowing(devices, 'polyend-tracker-mini', 'midi-din').unwired.map((d) => d.id)).toEqual([
      'intellijel-metropolix',
    ])
    expect(clockFollowing(devices, 'polyend-tracker-mini', 'usb').followers.map((d) => d.id)).toEqual([
      'intellijel-metropolix',
    ])
  })
})
