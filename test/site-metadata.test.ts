import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { metadata } from '../app/layout'
import { SITE_ORIGIN } from '../lib/studio/site'
import { DEVICES } from '../lib/devices/registry.generated'
import { kitSession } from '../lib/studio/kit-session'
import { presetSession } from '../lib/studio/preset-session'
import { RECORD_RIFFS } from '../lib/riffs'
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

  it('lists the root, the studio, both catalogues, every page in them, the reference, and no generated view', () => {
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
     * §2.6/#593 adds one entry per box that declares its factory patches and what each is for —
     * three of the 46 since #624 — by the same test. Derived from `presetSession`, which is also
     * what prerenders those pages.
     */
    const presets = DEVICES.filter((d) => presetSession(d) !== undefined)
    expect(presets.map((d) => d.id)).toEqual(['korg-minilogue-xd', 'moog-muse', 'moog-subsequent-37'])
    /*
     * §3.7/#598 adds one entry per patch with a figure written for it, under its box's index —
     * the minilogue xd's sixteen, the Muse's thirteen and the Subsequent 37's nineteen (#643:
     * DRONE has a use and no figure, so no page) — by the same test. Derived from
     * `presetSession`, which is also what prerenders those pages, and twelve of the Muse's are
     * the twelve that left `/riffs`.
     *
     * The three counts are written in registry order, which is the order they are listed in
     * below, and they sum to the 48 asserted underneath. They were "thirteen, twelve and eleven"
     * here for some time while the total assertion stayed green, which is what a hand-written
     * breakdown beside a derived total costs — so: if the total moves, re-read all three.
     */
    const figuresOf = (d: (typeof DEVICES)[number]) =>
      (presetSession(d)?.entries ?? []).flatMap((e) =>
        e.figure === undefined ? [] : [`${SITE_ORIGIN}/explore/${d.id}/${e.slug}`],
      )
    const figures = presets.flatMap(figuresOf)
    expect(figures).toHaveLength(48)
    /*
     * §5A/#503 adds `/riffs` and one entry per authored figure, on the same test as everything
     * else here: there is a page at each whose canonical is itself. Derived from `lib/riffs`, so
     * authoring an entry lists it without an edit — the hand-written count is now five, the four
     * it was plus the riff index. Since #598 the record-named entries only: a patch-named figure
     * is listed above, under its box, and `/riffs/<its id>` is a 404 this file must not name.
     */
    /*
     * §3.8/#520 adds `/samples` and one entry per authored target, on the same test again.
     * Derived from `lib/samples`, so authoring a target lists it without an edit — the
     * hand-written count is now six, the five it was plus the samples index.
     *
     * §2.6/§3.7 makes it seven: `/explore` is the index of a section that already had every page
     * under it, and it is hand-written here for `/riffs`' and `/samples`' reason — there is no
     * list in the repo to loop over for an index itself, only for its entries.
     *
     * §8 makes it eight: `/studio` is a page now rather than the root, listed by the same test.
     * And nine: `/parts` passed the same test from the day it was written and was simply never
     * added, which went unnoticed while the nav reached it. It left the nav, so it is here.
     * What is still absent is every permalinked *guide*, which is #44's rule and the thing this
     * count must never start growing with — if this number ever moves by more than one at a time,
     * that is what has happened.
     */
    expect(entries).toHaveLength(
      9 +
        DEVICES.length +
        kits.length +
        presets.length +
        figures.length +
        TEMPLATES.length +
        RECORD_RIFFS.length +
        SAMPLE_TARGETS.length,
    )
    expect(RECORD_RIFFS).toHaveLength(10)

    // Derived rather than listed, and in source order: authoring a manifest or a template adds its
    // page here without an edit (invariant 2). The last entry is the exception and is meant to be:
    // one authored page, with no list in the repo to loop over.
    expect(urls).toEqual([
      SITE_ORIGIN,
      // §8. The studio, second, where it sits in the file: the root is the orientation page and
      // this is the app that used to be at it.
      `${SITE_ORIGIN}/studio`,
      `${SITE_ORIGIN}/devices`,
      ...DEVICES.map((d) => `${SITE_ORIGIN}/devices/${d.id}`),
      ...kits.map((d) => `${SITE_ORIGIN}/devices/${d.id}/kit`),
      /*
       * §2.6/§3.7. Explore is its own block now rather than the tail of the devices one, which
       * is what moving it out of `/devices/<id>` means in this file: the section index first,
       * then each box's index followed by the figures under it — the pages a reader reaches from
       * that index, in the order they reach them.
       */
      `${SITE_ORIGIN}/explore`,
      ...presets.flatMap((d) => [`${SITE_ORIGIN}/explore/${d.id}`, ...figuresOf(d)]),
      `${SITE_ORIGIN}/directions`,
      ...TEMPLATES.map((t) => `${SITE_ORIGIN}/directions/${t.id}`),
      `${SITE_ORIGIN}/riffs`,
      ...RECORD_RIFFS.map((r) => `${SITE_ORIGIN}/riffs/${r.id}`),
      `${SITE_ORIGIN}/samples`,
      ...SAMPLE_TARGETS.map((t) => `${SITE_ORIGIN}/samples/${t.id}`),
      `${SITE_ORIGIN}/drum-machines`,
      // Its companion, on the same terms. `/preferences` is still absent and still should be:
      // it is a control panel for how the app draws itself, with nothing on it to read.
      `${SITE_ORIGIN}/parts`,
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
