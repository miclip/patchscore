import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  compatibleJackSignals,
  jackSignalAccepts,
  resolve,
  routeVoiceControl,
  type Device,
  type JackSignalKind,
  type JackSpec,
  type ResolvedAssignment,
  type Template,
} from '../lib/core/index'
import { device as cascadia } from '../lib/devices/intellijel-cascadia/index'
import { device as crave } from '../lib/devices/behringer-crave/index'
import { device as metropolix } from '../lib/devices/intellijel-metropolix/index'
import { TEMPLATES } from '../lib/templates/index'
import { device as fixtureDevice } from './fixtures'

/**
 * §3.3. Inter-device patching: the compatibility relation, the section-paired bundle, and the pass
 * that gives a rig **one** voice-control source.
 *
 * Three things are being pinned, and each one has a plausible wrong implementation that passes a
 * naive test suite:
 *
 *  - The **relation** is asymmetric. Set intersection is wrong twice over: with one `cv` member it
 *    made an envelope output a legal note source, and with `pitch-cv` split out it refuses the
 *    real cable from a keyboard CV output into a filter FM input. The asymmetry is asserted in
 *    both directions, because a symmetric implementation passes every "does this route" test and
 *    quietly restores the first bug.
 *  - The **bundle** is section-paired. Pairing on kind alone produces a cross product — the
 *    Metropolix's two tracks become four pairings, two of which splice one track's pitch to the
 *    other track's gate. Nobody patches that.
 *  - The **pass** picks one source for the rig, not the best source per target. Per-target choice
 *    made two boxes that each take pitch and gate into each other's source: every cable
 *    individually true, the pair a rig nobody builds.
 *
 * The real manifests do the load-bearing work here. A fixture can be shaped to make any rule look
 * principled; the Cascadia punishes a sloppy one, because it declares five gate outputs of which
 * three are end-of-stage pulses that sort ahead of the socket a reader actually wants.
 */

const TEMPLATE = TEMPLATES[0]
if (TEMPLATE === undefined) throw new Error('no templates')
const RIG_TEMPLATE: Template = TEMPLATE

/**
 * The pass reads exactly one field off each assignment — `deviceId` — and pinning that is part of
 * the point: it is why a reroll that leaves the same boxes carrying parts cannot re-cable the rig.
 * A real `ResolvedAssignment` has fifteen other fields and none of them are reachable from here.
 */
function assignedTo(...deviceIds: string[]): ResolvedAssignment[] {
  return deviceIds.map((deviceId) => ({ deviceId })) as unknown as ResolvedAssignment[]
}

function jack(id: string, direction: 'in' | 'out', signal: JackSignalKind[]): JackSpec {
  return { id, direction, signal }
}

function rig(id: string, jacks: JackSpec[], over: Partial<Device> = {}): Device {
  return fixtureDevice({ id, name: `Box ${id}`, jacks, ...over })
}

/** A box that takes a note and a gate, in one section. */
function target(id: string): Device {
  return rig(id, [jack('EXT · PITCH', 'in', ['pitch-cv']), jack('EXT · GATE', 'in', ['gate'])])
}

/** A box that sends them, in `count` sections named `TRK 1`, `TRK 2`, … */
function source(id: string, count = 1, over: Partial<Device> = {}): Device {
  return rig(
    id,
    Array.from({ length: count }, (_, i) => i + 1).flatMap((n) => [
      jack(`TRK ${n} · PITCH`, 'out', ['pitch-cv']),
      jack(`TRK ${n} · GATE`, 'out', ['gate']),
    ]),
    over,
  )
}

describe('jack signal compatibility (§3.3)', () => {
  it('accepts an exact match in either direction', () => {
    for (const kind of ['audio', 'cv', 'pitch-cv', 'gate', 'trigger', 'clock', 'midi'] as const) {
      expect(jackSignalAccepts(kind, kind), kind).toBe(true)
    }
  })

  it('accepts a pitch output at a cv input, and never the reverse', () => {
    // The one asymmetry, and the whole reason the member was split out. Pitch is control voltage
    // put to a use, so an input asking for CV can have it; an input asking for a note cannot be
    // fed an envelope.
    expect(jackSignalAccepts('cv', 'pitch-cv')).toBe(true)
    expect(jackSignalAccepts('pitch-cv', 'cv')).toBe(false)

    expect(compatibleJackSignals(['pitch-cv'], ['cv'])).toBe(true)
    expect(compatibleJackSignals(['cv'], ['pitch-cv'])).toBe(false)
  })

  it('is not set intersection, which would be wrong in both directions', () => {
    // Written as the two cases intersection gets wrong, because a symmetric implementation passes
    // every other test in this file.
    const overlaps = (a: JackSignalKind[], b: JackSignalKind[]) => a.some((k) => b.includes(k))

    // Intersection would refuse a real cable: a keyboard's pitch output into a filter FM input.
    expect(overlaps(['pitch-cv'], ['cv'])).toBe(false)
    expect(compatibleJackSignals(['pitch-cv'], ['cv'])).toBe(true)

    // And a single `cv` member — the shape before the split — would have accepted an envelope
    // output at a note socket. The relation refuses it now, and that is what must not regress.
    expect(compatibleJackSignals(['cv'], ['pitch-cv'])).toBe(false)
  })

  it('leaves gate and trigger as an exact match only', () => {
    // Deliberately not a second one-way rule: a socket documented as a trigger input responds to
    // the edge and discards the duration, so feeding it a gate loses what made it a gate. A box
    // whose manual says a socket takes either declares both kinds instead.
    expect(jackSignalAccepts('trigger', 'gate')).toBe(false)
    expect(jackSignalAccepts('gate', 'trigger')).toBe(false)
    expect(compatibleJackSignals(['gate', 'trigger'], ['trigger'])).toBe(true)
  })

  it('needs one usable pairing, not containment', () => {
    // The Crave's passive multiple declares five kinds. It is a legal destination for any of
    // them, and a subset test would have refused all five.
    const mult: JackSignalKind[] = ['audio', 'cv', 'gate', 'trigger', 'clock']
    expect(compatibleJackSignals(['audio'], mult)).toBe(true)
    expect(compatibleJackSignals(['clock'], mult)).toBe(true)
    expect(compatibleJackSignals(mult, ['audio'])).toBe(true)
    expect(compatibleJackSignals(['midi'], mult)).toBe(false)
  })
})

describe('section-paired bundles (§3.3)', () => {
  it('pairs a note with the gate from its own section, never across two', () => {
    // Two tracks are two bundles. Pairing on kind alone would give four, two of them splicing one
    // track's pitch to the other's gate.
    const patch = routeVoiceControl(
      [target('t-one'), source('s-two', 2)],
      assignedTo('t-one'),
      undefined,
    )
    expect(patch.source?.candidates).toBe(2)
    expect(patch.targets[0]?.cables.map((c) => c.fromJack)).toEqual([
      'TRK 1 · PITCH',
      'TRK 1 · GATE',
    ])
  })

  it('forms no bundle from ids that carry no section', () => {
    // §3.3 says jack ids *are* section-qualified. An id with no separator declares no section, so
    // it pairs with nothing — an unqualified fixture forms no bundles rather than accidental ones.
    const flat = rig('s-flat', [
      jack('PITCH OUT', 'out', ['pitch-cv']),
      jack('GATE OUT', 'out', ['gate']),
    ])
    const patch = routeVoiceControl([target('t-one'), flat], assignedTo('t-one'), undefined)
    expect(patch.outcome).toBe('no-compatible-pair')
    expect(patch.source).toBeUndefined()
  })

  it('takes one bundle per section, by code unit, where a section has two of a kind', () => {
    // A section is a functional block on a panel; two gate jacks inside one are alternatives, not
    // two voices. `B` (0x42) sorts before `a` (0x61) by code unit; ICU puts `GATE a` first (§7.2).
    const twoGates = rig('s-two-gates', [
      jack('TRK 1 · PITCH', 'out', ['pitch-cv']),
      jack('TRK 1 · GATE a', 'out', ['gate']),
      jack('TRK 1 · GATE B', 'out', ['gate']),
    ])
    const patch = routeVoiceControl([target('t-one'), twoGates], assignedTo('t-one'), undefined)
    expect(patch.source?.candidates).toBe(1)
    expect(patch.targets[0]?.cables[1]?.fromJack).toBe('TRK 1 · GATE B')
  })

  it('will not make a multi-purpose socket a bundle member', () => {
    // How this pass stays out of §7.4's way without a special case for clock: a hole that carries
    // more than one kind is not single-purpose, so a gate-and-clock socket cannot become a third
    // cable restating the one the rig already has. The same rule keeps an end-of-stage
    // `['gate', 'trigger']` pulse out of the gate slot.
    const shared = rig('s-shared', [
      jack('TRK 1 · PITCH', 'out', ['pitch-cv']),
      jack('TRK 1 · CLK / GATE', 'out', ['gate', 'clock']),
      jack('TRK 1 · EOA', 'out', ['gate', 'trigger']),
    ])
    const patch = routeVoiceControl([target('t-one'), shared], assignedTo('t-one'), undefined)
    expect(patch.outcome).toBe('no-compatible-pair')
  })

  it('never offers an envelope or an LFO as the pitch source', () => {
    // The defect the split exists for, at the level that matters. This box has a gate output and
    // plenty of CV and no note output at all — so it is not a source, rather than a source whose
    // pitch cable carries an envelope.
    const modulation = rig('s-mod', [
      jack('MOD · ENV', 'out', ['cv']),
      jack('MOD · LFO', 'out', ['cv']),
      jack('MOD · GATE', 'out', ['gate']),
    ])
    const patch = routeVoiceControl([target('t-one'), modulation], assignedTo('t-one'), undefined)
    expect(patch.outcome).toBe('no-compatible-pair')
  })
})

describe('one voice-control source per rig (§3.3)', () => {
  it('emits two cables naming the kind and both ends', () => {
    const patch = routeVoiceControl(
      [target('t-one'), source('s-one')],
      assignedTo('t-one'),
      undefined,
    )
    expect(patch.outcome).toBe('routed')
    expect(patch.source).toEqual({
      deviceId: 's-one',
      deviceName: 'Box s-one',
      basis: 'tie-break',
      claims: 0,
      candidates: 1,
      ranked: 1,
    })
    expect(patch.targets).toHaveLength(1)
    expect(patch.targets[0]?.outcome).toBe('routed')
    expect(patch.targets[0]?.cables).toEqual([
      {
        signal: 'pitch-cv',
        fromDeviceId: 's-one',
        fromDeviceName: 'Box s-one',
        fromJack: 'TRK 1 · PITCH',
        toDeviceId: 't-one',
        toDeviceName: 'Box t-one',
        toJack: 'EXT · PITCH',
      },
      {
        signal: 'gate',
        fromDeviceId: 's-one',
        fromDeviceName: 'Box s-one',
        fromJack: 'TRK 1 · GATE',
        toDeviceId: 't-one',
        toDeviceName: 'Box t-one',
        toJack: 'EXT · GATE',
      },
    ])
  })

  it('excludes the source from its own target list', () => {
    // A box does not patch into itself, and this exclusion is what killed the mutual proposal that
    // made choosing a source per target wrong: two boxes each taking pitch and gate used to be
    // offered as each other's source, in the same result.
    const both = rig('x-both', [
      jack('EXT · PITCH', 'in', ['pitch-cv']),
      jack('EXT · GATE', 'in', ['gate']),
      jack('TRK 1 · PITCH', 'out', ['pitch-cv']),
      jack('TRK 1 · GATE', 'out', ['gate']),
    ])
    const other = rig('y-both', [
      jack('EXT · PITCH', 'in', ['pitch-cv']),
      jack('EXT · GATE', 'in', ['gate']),
      jack('TRK 1 · PITCH', 'out', ['pitch-cv']),
      jack('TRK 1 · GATE', 'out', ['gate']),
    ])
    const patch = routeVoiceControl([both, other], assignedTo('x-both', 'y-both'), undefined)

    // One source, one target, one direction.
    expect(patch.source?.deviceId).toBe('x-both')
    expect(patch.targets.map((t) => t.deviceId)).toEqual(['y-both'])
    expect(patch.targets[0]?.outcome).toBe('routed')
  })

  it('allocates one bundle per target and reuses none', () => {
    const patch = routeVoiceControl(
      [target('t-one'), target('t-two'), source('s-two', 2)],
      assignedTo('t-one', 't-two'),
      undefined,
    )
    expect(patch.targets.map((t) => t.deviceId)).toEqual(['t-one', 't-two'])
    expect(patch.targets.map((t) => t.cables[0]?.fromJack)).toEqual([
      'TRK 1 · PITCH',
      'TRK 2 · PITCH',
    ])
    expect(patch.targets.map((t) => t.cables[1]?.fromJack)).toEqual([
      'TRK 1 · GATE',
      'TRK 2 · GATE',
    ])
  })

  it('says source-exhausted, not no-compatible-source, when the supply runs out', () => {
    // Two different things to a reader (§7.3). A Metropolix has two tracks and a third synth is
    // one track short; telling somebody "nothing here can drive this" would send them shopping
    // for the thing they already own.
    const patch = routeVoiceControl(
      [target('t-one'), target('t-two'), source('s-one')],
      assignedTo('t-one', 't-two'),
      undefined,
    )
    expect(patch.outcome).toBe('routed')
    expect(patch.targets.map((t) => t.outcome)).toEqual(['routed', 'source-exhausted'])
    expect(patch.targets[1]?.cables).toEqual([])
    // The sockets are still named. The target is known; the supply is what ran out.
    expect(patch.targets[1]?.pitchJack).toBe('EXT · PITCH')
    expect(patch.targets[1]?.gateJack).toBe('EXT · GATE')
  })

  it('says no-target when nothing assigned takes pitch and gate', () => {
    // A rig of grooveboxes. Nothing is missing, and that is a different answer from the one below.
    const patch = routeVoiceControl([source('s-one')], assignedTo('s-one'), undefined)
    expect(patch.outcome).toBe('no-target')
    expect(patch.targets).toEqual([])
    // The source is still reported: "this box would drive the rig, and nothing here needs it".
    expect(patch.source?.deviceId).toBe('s-one')
  })

  it('says no-compatible-pair rather than returning an empty list', () => {
    // Something here takes external pitch and gate and nothing here can drive it. That is a gap a
    // reader can act on, and `[]` would have said the same thing as the case above (invariant 5).
    const patch = routeVoiceControl([target('t-one')], assignedTo('t-one'), undefined)
    expect(patch.outcome).toBe('no-compatible-pair')
    expect(patch.source).toBeUndefined()
    expect(patch.targets[0]?.outcome).toBe('no-compatible-source')
    expect(patch.targets[0]?.cables).toEqual([])
  })

  it('ranks the resolved clock source first, then the manifest claim, then ids', () => {
    const plain = source('a-plain')
    const claiming = source('b-claims', 1, {
      clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'], preferredSource: true },
    })
    const devices = [target('t-one'), plain, claiming]

    // Nothing is the clock source: the manifest's own claim decides, over an earlier id.
    const byClaim = routeVoiceControl(devices, assignedTo('t-one'), undefined)
    expect(byClaim.source?.deviceId).toBe('b-claims')
    expect(byClaim.source?.basis).toBe('claimed')
    // Two boxes offer a bundle; only the winner's are the supply.
    expect(byClaim.source?.ranked).toBe(2)
    expect(byClaim.source?.candidates).toBe(1)

    // The clock source outranks the claim: the box already driving the rig is the box the reader is
    // standing at, and notes out of a different box than the tempo is a rig nobody built.
    const byClock = routeVoiceControl(devices, assignedTo('t-one'), {
      deviceId: 'a-plain',
      deviceName: 'Box a-plain',
      transport: 'midi-din',
      occupiedAssignables: 0,
      claims: 0,
    })
    expect(byClock.source?.deviceId).toBe('a-plain')
    expect(byClock.source?.basis).toBe('clock-source')

    // Two honest claims and no clock source: §7.4's reasoning one tier down — the ids settle it,
    // and the basis says the claim was contested rather than pretending it decided.
    const alsoClaiming = {
      ...plain,
      clock: { ...plain.clock, preferredSource: true },
    }
    const contested = routeVoiceControl(
      [target('t-one'), alsoClaiming, claiming],
      assignedTo('t-one'),
      undefined,
    )
    expect(contested.source?.deviceId).toBe('a-plain')
    expect(contested.source?.basis).toBe('contested')
  })

  it('does not require the source to be assigned', () => {
    // A sequencer that took no part is the most ordinary thing to drive another box with.
    const patch = routeVoiceControl(
      [target('t-one'), source('s-one')],
      assignedTo('t-one'),
      undefined,
    )
    expect(patch.targets[0]?.outcome).toBe('routed')

    // And a target that took no part is not routed to: a cable into a box carrying nothing is a
    // cable to nowhere.
    const unassigned = routeVoiceControl(
      [target('t-one'), source('s-one')],
      assignedTo('s-one'),
      undefined,
    )
    expect(unassigned.outcome).toBe('no-target')
  })
})

describe('routing across real manifests (§3.3)', () => {
  function patchFor(devices: Device[]) {
    return resolve({ devices, template: RIG_TEMPLATE, mood: NEUTRAL_MOOD, seed: 1 })
      .interDevicePatch
  }

  it('drives the CRAVE from the Cascadia, in one direction only', () => {
    // Both boxes take pitch and gate, and this used to produce two targets pointed at each other.
    // One source per rig, and the source excluded from targets, is what leaves exactly one cable
    // run — chosen on the first ranking key, since the Cascadia is the rig's clock source and the
    // CRAVE cannot send clock at all.
    const patch = patchFor([cascadia, crave])

    expect(patch.outcome).toBe('routed')
    expect(patch.source?.deviceId).toBe(cascadia.id)
    expect(patch.source?.basis).toBe('clock-source')
    // One section pairs a note with a gate on this box: `MIDI / CV`. `PUSH GATE · GATE OUT` is a
    // gate output in a section with no note output, so it forms no bundle.
    expect(patch.source?.candidates).toBe(1)

    expect(patch.targets.map((t) => t.deviceId)).toEqual([crave.id])
    expect(patch.targets[0]?.cables.map((c) => [c.fromJack, c.toJack, c.signal])).toEqual([
      ['MIDI / CV · MIDI PITCH', 'IN · OSC CV', 'pitch-cv'],
      ['MIDI / CV · MIDI GATE', 'IN · ENV GATE', 'gate'],
    ])
  })

  it('routes into the Cascadia at EXT IN, not at ENVELOPE A', () => {
    // Section pairing is what settles this. `ENVELOPE A · GATE` is a single-purpose gate input and
    // sorts ahead of `EXT IN · GATE` by code unit, so on the gate kind alone it would have won —
    // and a reader would be told to patch a note into `EXT IN` and its gate into a different
    // section entirely. `ENVELOPE A` has no note input, so it forms no bundle.
    const patch = patchFor([metropolix, cascadia])
    const into = patch.targets.find((t) => t.deviceId === cascadia.id)

    expect(into?.pitchJack).toBe('EXT IN · PITCH')
    expect(into?.gateJack).toBe('EXT IN · GATE')
    expect(into?.cables.map((c) => c.toJack)).toEqual(['EXT IN · PITCH', 'EXT IN · GATE'])
  })

  it('drives the CRAVE from Metropolix track 1, counting two bundles and not four', () => {
    // Metropolix has no voice and takes no assignment, which is exactly why the pass does not
    // require a source to be assigned. Its four outputs are **two** section pairs; the cross
    // product of kinds would have called it four and spliced track 1's pitch to track 2's gate.
    const patch = patchFor([metropolix, crave])

    expect(patch.source?.deviceId).toBe(metropolix.id)
    expect(patch.source?.candidates).toBe(2)
    // Metropolix claims `preferredSource` and can send clock, so it is the rig's clock source and
    // the first ranking key is what picked it — not the alphabet.
    expect(patch.source?.basis).toBe('clock-source')

    expect(patch.targets[0]?.cables.map((c) => [c.fromJack, c.toJack, c.signal])).toEqual([
      ['TRK 1 · PITCH', 'IN · OSC CV', 'pitch-cv'],
      ['TRK 1 · GATE', 'IN · ENV GATE', 'gate'],
    ])
  })

  it('gives the two Metropolix tracks to the two synths, one each', () => {
    // The allocation, on real manifests: two tracks, two boxes that take pitch and gate, and no
    // bundle used twice.
    const patch = patchFor([metropolix, cascadia, crave])

    expect(patch.source?.deviceId).toBe(metropolix.id)
    expect(patch.targets.map((t) => t.deviceId)).toEqual([crave.id, cascadia.id])
    expect(patch.targets.map((t) => t.cables[0]?.fromJack)).toEqual([
      'TRK 1 · PITCH',
      'TRK 2 · PITCH',
    ])
    expect(patch.targets.every((t) => t.outcome === 'routed')).toBe(true)
  })

  it('never proposes a cable into a clock socket', () => {
    // §7.4 decides the one clock cable this rig gets. Every jack this pass names is single-purpose
    // and neither end is ever a clock hole, across every rig the library can build from these.
    for (const devices of [
      [cascadia, crave],
      [metropolix, crave],
      [metropolix, cascadia, crave],
    ]) {
      for (const t of patchFor(devices).targets) {
        for (const c of t.cables) {
          expect(c.signal === 'pitch-cv' || c.signal === 'gate', c.signal).toBe(true)
        }
      }
    }
  })
})
