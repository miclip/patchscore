import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { metadata } from '../app/layout'
import { SITE_ORIGIN } from '../lib/studio/site'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * These three tell a crawler about the same page and must not disagree. A canonical naming a host
 * the sitemap does not list, or a sitemap served under a host that redirects away, is worse than
 * having none of them.
 */
describe('sitemap, robots and canonical agree (#74, #44)', () => {
  it('is the apex, which is the host that does not redirect', () => {
    expect(SITE_ORIGIN).toBe('https://patchscore.app')
    expect(SITE_ORIGIN).not.toContain('www.')
    expect(new URL(String(metadata.metadataBase)).origin).toBe(SITE_ORIGIN)
  })

  it('lists the root, the device index and every device, and no generated view', () => {
    // #44: a permalinked guide is canonical to '/', so enumerating variants here would contradict
    // it. A catalogue page (#84) is the other thing — authored content whose canonical is itself —
    // so it belongs. The rule for a new entry is "is there a page at it whose canonical is itself".
    const entries = sitemap()
    expect(entries[0]?.url).toBe(SITE_ORIGIN)
    expect(entries).toHaveLength(2 + DEVICES.length)
    expect(entries[1]?.url).toBe(`${SITE_ORIGIN}/devices`)

    // Registry order, and derived rather than listed: adding a manifest adds its page (invariant 2).
    expect(entries.slice(2).map((e) => e.url)).toEqual(
      DEVICES.map((d) => `${SITE_ORIGIN}/devices/${d.id}`),
    )

    for (const entry of entries) {
      expect(entry.url.startsWith(SITE_ORIGIN)).toBe(true)
      expect(entry.url).not.toContain('?')
      expect(entry.url).not.toContain('#')
    }
  })

  it('points at a sitemap under the canonical origin', () => {
    expect(robots().sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`)
  })

  it('allows every crawler, with no named agents', () => {
    const rules = robots().rules
    const list = Array.isArray(rules) ? rules : [rules]
    expect(list).toHaveLength(1)
    expect(list[0]?.userAgent).toBe('*')
    expect(list[0]?.allow).toBe('/')
    expect(list[0]?.disallow).toBeUndefined()
  })
})
