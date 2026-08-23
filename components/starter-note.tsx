'use client'

import type { DeviceId } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'

/**
 * #61. The line that stops the landing rig from pretending to be the visitor's.
 *
 * The app has to open with *something* — an empty page teaches nobody what a guide is, and the
 * guide is the product. So it opens with a two-box example and then says so, which is the whole
 * of the answer: the demonstration survives and the claim about whose rig it is does not get
 * made. `isStarterExample` in `lib/studio/session.ts` decides when this appears; this file only
 * knows how to word it.
 *
 * **The boxes are named from the ids, never typed out here.** The pair is one constant in
 * `session.ts`, and a note that hard-coded "Tracker Mini and TR-1000" would go quietly wrong the
 * day that constant changes — a page confidently naming devices it has not selected. It also
 * keeps invariant 2 true of this file: adding a manifest changes nothing here.
 */
export function StarterNote({ devices }: { devices: readonly DeviceId[] }) {
  const named = DEVICES.filter((device) => devices.includes(device.id)).map(
    (device) => `${device.maker} ${device.name}`,
  )
  const list =
    named.length === 0
      ? 'no devices'
      : named.length === 1
        ? named[0]
        : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`

  // One line, deliberately. It sits above the pickers on a 390px screen where the guide is the
  // thing worth the vertical space, so it names the pair, says what to do, and stops. The
  // paragraph that used to explain rerolling and local storage was true and cost three lines of
  // a phone to say what the page demonstrates on its own.
  return (
    <p className="callout span-2 starter-note" role="note">
      <strong>A starter example, not your rig</strong> — {list}. Edit the devices and direction to
      make it yours.
    </p>
  )
}
