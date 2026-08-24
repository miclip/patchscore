import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { metadata } from '../app/layout'
import { SITE_ORIGIN } from '../lib/studio/site'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

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

  it('lists the root, both catalogues and every page in them, and no generated view', () => {
    // #44: a permalinked guide is canonical to '/', so enumerating variants here would contradict
    // it. A catalogue page (#84) is the other thing — authored content whose canonical is itself —
    // so it belongs. The rule for a new entry is "is there a page at it whose canonical is itself".
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls[0]).toBe(SITE_ORIGIN)
    expect(entries).toHaveLength(3 + DEVICES.length + TEMPLATES.length)

    // Derived rather than listed, and in source order: authoring a manifest or a template adds its
    // page here without an edit (invariant 2).
    expect(urls).toEqual([
      SITE_ORIGIN,
      `${SITE_ORIGIN}/devices`,
      ...DEVICES.map((d) => `${SITE_ORIGIN}/devices/${d.id}`),
      `${SITE_ORIGIN}/directions`,
      ...TEMPLATES.map((t) => `${SITE_ORIGIN}/directions/${t.id}`),
    ])

    for (const entry of entries) {
      expect(entry.url.startsWith(SITE_ORIGIN)).toBe(true)
      expect(entry.url).not.toContain('?')
      expect(entry.url).not.toContain('#')
    }
    // No duplicates: two entries for one page is two votes for the same thing.
    expect(new Set(urls).size).toBe(urls.length)
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
