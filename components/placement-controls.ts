import type { Device, DeviceId, PlacementOptions, RequestId, ResolveResult } from '@/lib/core'

/**
 * §7.5/#340 phase 2. The decisions behind the placement control, kept out of the component so
 * they can be tested without a DOM — the same split `song-controls.ts` and `knob-math.ts` make.
 *
 * There is deliberately **no commit function here**, which is where this differs from
 * `song-controls.ts`. A `<select>` hands its handler a string and something has to say what that
 * string means; these are buttons, and each one already holds the device it stands for. A
 * sentinel string invented so that a "what a click means" function could exist would be an
 * indirection with one caller and one test, and the test would prove the indirection rather than
 * the control. `PlacementOffer` is hookless precisely so its real handlers can be called.
 *
 * **Nothing here judges anything.** Which boxes could take a part, and why one could not, are
 * both settled in `lib/core` — `PlacementOptions` carries the answer and the sentence. This
 * layer only turns ids into names and picks which of the three current states a row is in. Two
 * routes to one answer is how a menu comes to offer a box the resolver then refuses (§7.5), so
 * there must not be a second judgement here.
 */

/** One box on the offer, named for a reader rather than identified for the resolver. */
export type PlacementChoice = {
  deviceId: DeviceId
  name: string
  canServe: boolean
  /** Present exactly when `canServe` is false — `PlacementOption.why`, verbatim. */
  why?: string
}

/**
 * Where this part is now, from the reader's point of view rather than the search's.
 *
 * Three states and not two, because a refused placement is the one a control must not hide: the
 * reader asked for a box, the guide did not use it, and a control showing plain "Automatic"
 * there would quietly discard a choice they made and can still see in their own link.
 */
export type PlacementCurrent =
  | { kind: 'automatic' }
  | { kind: 'placed'; deviceId: DeviceId; name: string }
  | { kind: 'refused'; deviceId: DeviceId; name: string; why: string }

export type PlacementRow = {
  requestId: RequestId
  current: PlacementCurrent
  /** In `PlacementOptions` order, which is code unit order by device id (§7.2). */
  choices: readonly PlacementChoice[]
}

/**
 * A name for a box, falling back to its id.
 *
 * The fallback is reachable, and honestly: a placement refused as `device-not-in-rig` names a
 * box that is not among `result.devices`, so there is no name to look up. Printing the id is
 * ugly and true, where printing nothing would lose which box the reader had asked for.
 */
function nameOf(deviceById: Map<DeviceId, Device>, deviceId: DeviceId): string {
  return deviceById.get(deviceId)?.name ?? deviceId
}

/**
 * What the control for one request offers, and what it currently says.
 *
 * The offer comes from `result.options`, which is computed against a ctx with **no placement
 * applied** — so placing one part never shortens the menu offered for the next. The current
 * state comes from `result.placements`, which is what the search actually did.
 */
export function placementRow(
  result: ResolveResult,
  requestId: RequestId,
  deviceById: Map<DeviceId, Device>,
): PlacementRow {
  return {
    requestId,
    current: placementCurrent(result, requestId, deviceById),
    choices: choicesFor(result.options, requestId, deviceById),
  }
}

function choicesFor(
  options: PlacementOptions,
  requestId: RequestId,
  deviceById: Map<DeviceId, Device>,
): PlacementChoice[] {
  const found = options.find((one) => one.requestId === requestId)
  return (found?.options ?? []).map((option) => ({
    deviceId: option.deviceId,
    name: nameOf(deviceById, option.deviceId),
    canServe: option.canServe,
    ...(option.why === undefined ? {} : { why: option.why }),
  }))
}

function placementCurrent(
  result: ResolveResult,
  requestId: RequestId,
  deviceById: Map<DeviceId, Device>,
): PlacementCurrent {
  const accepted = result.placements.accepted.find((one) => one.requestId === requestId)
  if (accepted !== undefined) {
    return { kind: 'placed', deviceId: accepted.deviceId, name: nameOf(deviceById, accepted.deviceId) }
  }
  const refused = result.placements.refused.find((one) => one.requestId === requestId)
  if (refused !== undefined) {
    return {
      kind: 'refused',
      deviceId: refused.deviceId,
      name: nameOf(deviceById, refused.deviceId),
      why: refused.detail,
    }
  }
  return { kind: 'automatic' }
}

/**
 * The one line the collapsed control shows.
 *
 * "Automatic" rather than the name of the box the ranking picked: the row it sits on already
 * names that box, and repeating it would read as a choice somebody made.
 */
export function placementSummary(current: PlacementCurrent): string {
  if (current.kind === 'automatic') return 'Automatic'
  if (current.kind === 'placed') return `You chose ${current.name}`
  return `${current.name} could not take it`
}
