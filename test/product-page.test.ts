import { describe, expect, it } from 'vitest'

import { DeviceSchema } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { makerLink } from '../lib/studio/device-page'

/**
 * §10/#291. The one outbound link a device page carries, and who it is allowed to point at.
 *
 * The field exists because a reader who has just been told to set `DECAY 38` on a box has a
 * reasonable next question — *what is this thing* — and the library was answering it with a
 * manual title it deliberately does not host. The maker's page answers it and is the only link
 * here that will still resolve in ten years.
 *
 * **Not a retailer**, which is the decision this file is mostly here to hold. A shop link is a
 * price that goes stale, in a country the reader may not be in, for stock we cannot see, and it
 * turns an informational page into a storefront. The denylist below is the rule made executable,
 * because the pressure to add "and here is where to buy one" is the kind that arrives one
 * plausible commit at a time.
 *
 * Every URL was fetched and answered 200 to a **GET**. That is stated here rather than assumed:
 * an earlier pass probed with `curl -I` and reported fourteen of these dead, because Tascam and
 * others 404 a HEAD for a page they serve perfectly well. Nothing in CI re-checks them — a test
 * that needs the network is a test that fails on a train — so the guard is the shape of the URL
 * and the honesty of whoever adds the next one.
 */

/** Shops, marketplaces and price aggregators. Hosts, so a path cannot smuggle one past. */
const NOT_A_SHOP = [
  'sweetwater.com',
  'perfectcircuit.com',
  'thomann.de',
  'amazon.com',
  'reverb.com',
  'guitarcenter.com',
  'ebay.com',
  'andertons.co.uk',
  'juno.co.uk',
  'gear4music.com',
]

describe('the maker’s page (#291)', () => {
  it('every declared link is an https URL', () => {
    for (const device of DEVICES) {
      if (device.productPage === undefined) continue
      expect(() => new URL(device.productPage as string), device.id).not.toThrow()
      expect(device.productPage, device.id).toMatch(/^https:\/\//)
    }
  })

  it('points at makers, never at shops', () => {
    for (const device of DEVICES) {
      if (device.productPage === undefined) continue
      const host = new URL(device.productPage).host.replace(/^www\./, '')
      expect(NOT_A_SHOP, `${device.id} links to a retailer`).not.toContain(host)
    }
  })

  it('the schema refuses http, and refuses a bare hostname', () => {
    const base = DEVICES[0] as Device
    expect(DeviceSchema.safeParse({ ...base, productPage: 'http://moogmusic.com/' }).success).toBe(
      false,
    )
    expect(DeviceSchema.safeParse({ ...base, productPage: 'moogmusic.com' }).success).toBe(false)
  })

  it('labels a link with its destination, not with the word “page”', () => {
    const muse = DEVICES.find((d) => d.id === 'moog-muse')
    expect(muse).toBeDefined()
    expect(makerLink(muse as Device)).toEqual({
      kind: 'link',
      href: 'https://www.moogmusic.com/synthesizers/muse/',
      host: 'moogmusic.com',
    })
  })

  it('keeps a host that has no www to drop', () => {
    const opxy = DEVICES.find((d) => d.id === 'teenage-engineering-op-xy')
    expect(makerLink(opxy as Device)).toMatchObject({ host: 'teenage.engineering' })
  })

  /**
   * The empty state is unreachable from the library today — all 46 devices declare the field — and
   * that is exactly why it is asserted against a constructed device rather than left to rot until
   * the 47th arrives without a link.
   */
  it('reports a missing link as a state, so the page can ask for it', () => {
    const base = DEVICES[0] as Device
    const { productPage: _dropped, ...without } = base
    expect(makerLink(without as Device)).toEqual({ kind: 'missing' })
  })

  it('every device in the library has one today', () => {
    const missing = DEVICES.filter((d) => d.productPage === undefined).map((d) => d.id)
    // Not a rule — the field is optional on purpose. A failure here is a prompt to go and look
    // for the link, and to say so in the PR if it genuinely does not exist.
    expect(missing).toEqual([])
  })
})
