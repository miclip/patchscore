import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { metadata } from '../app/layout'
import { SITE_ORIGIN } from '../lib/studio/site'
import { DEVICES } from '../lib/devices/registry.generated'
import { kitSession } from '../lib/studio/kit-session'
import { RIFFS } from '../lib/riffs'
import { SAMPLE_TARGETS } from '../lib/samples'
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

  it('lists the root, both catalogues, every page in them, the reference, and no generated view', () => {
    // #44: a permalinked guide is canonical to '/', so enumerating variants here would contradict
    // it. A catalogue page (#84) is the other thing — authored content whose canonical is itself —
    // so it belongs. The rule for a new entry is "is there a page at it whose canonical is itself",
    // which is why #174's reference page qualifies on the same terms despite deriving from nothing.
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls[0]).toBe(SITE_ORIGIN)
    /*
     * §3.7/#478 adds one entry per box that offers a kit — 24 of the 46 today — and it is listed
     * here by the same test as everything else: there is a page at it whose canonical is itself.
     * Derived from `kitSession`, which is also what prerenders those pages, so a box that
     * authors a fourth kit sound appears in both without an edit and one that does not is absent
     * from both.
     */
    const kits = DEVICES.filter((d) => kitSession(d) !== undefined)
    expect(kits.length).toBe(24)
    /*
     * §5A/#503 adds `/riffs` and one entry per authored figure, on the same test as everything
     * else here: there is a page at each whose canonical is itself. Derived from `lib/riffs`, so
     * authoring an entry lists it without an edit — the hand-written count is now five, the four
     * it was plus the riff index.
     */
    /*
     * §3.8/#520 adds `/samples` and one entry per authored target, on the same test again.
     * Derived from `lib/samples`, so authoring a target lists it without an edit — the
     * hand-written count is now six, the five it was plus the samples index.
     */
    expect(entries).toHaveLength(
      6 + DEVICES.length + kits.length + TEMPLATES.length + RIFFS.length + SAMPLE_TARGETS.length,
    )

    // Derived rather than listed, and in source order: authoring a manifest or a template adds its
    // page here without an edit (invariant 2). The last entry is the exception and is meant to be:
    // one authored page, with no list in the repo to loop over.
    expect(urls).toEqual([
      SITE_ORIGIN,
      `${SITE_ORIGIN}/devices`,
      ...DEVICES.map((d) => `${SITE_ORIGIN}/devices/${d.id}`),
      ...kits.map((d) => `${SITE_ORIGIN}/devices/${d.id}/kit`),
      `${SITE_ORIGIN}/directions`,
      ...TEMPLATES.map((t) => `${SITE_ORIGIN}/directions/${t.id}`),
      `${SITE_ORIGIN}/riffs`,
      ...RIFFS.map((r) => `${SITE_ORIGIN}/riffs/${r.id}`),
      `${SITE_ORIGIN}/samples`,
      ...SAMPLE_TARGETS.map((t) => `${SITE_ORIGIN}/samples/${t.id}`),
      `${SITE_ORIGIN}/drum-machines`,
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
