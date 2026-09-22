import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import RootLayout from '../app/layout'
import { NAV_LINKS, SiteNav } from '../components/site-nav'
import DeviceIndexPage from '../app/devices/page'
import DirectionIndexPage from '../app/directions/page'
import DevicePageRoute from '../app/devices/[id]/page'
import DirectionPageRoute from '../app/directions/[id]/page'
import DrumMachinesPage from '../app/drum-machines/page'
import RiffIndexPage from '../app/riffs/page'
import RiffRoute from '../app/riffs/[id]/page'
import PresetFigureRoute from '../app/explore/[id]/[patch]/page'
import OrientationPage from '../app/page'
import StudioPage from '../app/studio/page'
import { DEVICES } from '../lib/devices/registry.generated'
import { RECORD_RIFFS } from '../lib/riffs'
import { TEMPLATES } from '../lib/templates/index'

/**
 * #112. One navigation landmark, rendered from the layout, identical on every route.
 *
 * The bug this closes was not "a link is missing" but "there is no shared place for links to
 * live". `<nav>` appeared zero times in `app/` and `components/`; what each catalogue page had
 * instead was its own `<p className="masthead-actions">`, and with four independent copies they
 * drifted: `/devices` reached the studio and nothing else, so the devices half of the catalogue
 * was a dead end for the directions half. You could go directions → devices, never the reverse.
 *
 * So the assertions here are mostly about **symmetry and singularity** — every page reaches the
 * same three places, and no page has grown a link set of its own again. A test that only checked
 * "the nav exists" would have passed on the day the divergence was introduced.
 */

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function rule(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`)
  expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
  return CSS.slice(start, CSS.indexOf('}', start))
}

/** Every route, rendered the way it will be served: the layout around the page. */
async function shell(page: ReactElement): Promise<string> {
  return renderToStaticMarkup(RootLayout({ children: page }))
}

async function routes(): Promise<{ name: string; markup: string }[]> {
  const device = DEVICES[0]
  const template = TEMPLATES[0]
  // A record-named entry: the ones with a page under `/riffs` (#598).
  const riff = RECORD_RIFFS[0]
  if (device === undefined || template === undefined || riff === undefined) {
    throw new Error('empty registry')
  }

  return [
    /*
     * Both halves of what used to be one route. `/` is the orientation page and `/studio` is the
     * app, and every claim below is about *every* page — a route kept out of this list is a route
     * none of them cover, which is the reason `/drum-machines` and `/riffs` are in it.
     */
    { name: '/', markup: await shell(createElement(OrientationPage)) },
    {
      name: '/studio',
      markup: await shell(await StudioPage({ searchParams: Promise.resolve({}) })),
    },
    { name: '/devices', markup: await shell(createElement(DeviceIndexPage)) },
    { name: '/directions', markup: await shell(createElement(DirectionIndexPage)) },
    // #174. In the route set rather than beside it: every claim below — one nav, the same links,
    // no hand-written link set — is about *every* page, and a page kept out of this list is a
    // page none of them cover.
    { name: '/drum-machines', markup: await shell(createElement(DrumMachinesPage)) },
    // §5A/#503. In the route set for the reason `/drum-machines` is: every claim below is about
    // *every* page, and a page kept out of this list is a page none of them cover.
    { name: '/riffs', markup: await shell(createElement(RiffIndexPage)) },
    {
      name: `/riffs/${riff.id}`,
      markup: await shell(await RiffRoute({ params: Promise.resolve({ id: riff.id }) })),
    },
    {
      name: `/devices/${device.id}`,
      markup: await shell(await DevicePageRoute({ params: Promise.resolve({ id: device.id }) })),
    },
    // §3.7/#598. A preset figure page, in the route set for the reason the riff page is.
    {
      name: '/explore/moog-muse/muse-runner',
      markup: await shell(
        await PresetFigureRoute({
          params: Promise.resolve({ id: 'moog-muse', patch: 'muse-runner' }),
        }),
      ),
    },
    {
      name: `/directions/${template.id}`,
      markup: await shell(
        await DirectionPageRoute({ params: Promise.resolve({ id: template.id }) }),
      ),
    },
  ]
}

describe('#112 the navigation landmark', () => {
  it('is a real `nav`, named, containing a list', () => {
    const markup = renderToStaticMarkup(createElement(SiteNav))
    expect(markup).toContain('<nav class="site-nav" aria-label="Site">')
    expect(markup).toContain('<ul>')
    // A named landmark, so a second one later (the footer is one argument away) is tellable
    // apart in a landmark list rather than being a second unlabelled "navigation".
    expect(markup).toMatch(/aria-label="[^"]+"/)
  })

  it('names the studio and the five places this site holds things, in that order', () => {
    const markup = renderToStaticMarkup(createElement(SiteNav))
    /*
     * **One kind of thing, six entries.** It carried eight of three kinds as peers: catalogues of
     * what the engine knows, libraries to play from, and explainers for a reader who does not
     * have the vocabulary yet. Three left, and each left to somewhere that serves it better than
     * a link at the top of every page:
     *
     *  - `/drum-machines` and `/parts` to the footer, and `/parts` to the word itself — an
     *    explainer is wanted at the moment a reader meets the word (`vocabulary-term.tsx`).
     *  - `/preferences` to the footer and to the studio's own masthead. #138 put it here because
     *    the footer could not reach it *on the studio*, where it sits below the whole generated
     *    guide; that is a fact about one page, and the repair belongs on that page.
     *
     * `Studio` is first and points at `/studio`: `/` is the orientation page now, and the mark
     * beside this list is what goes there. `Explore` is last because it is the entry a reader
     * reaches for having already decided which box they are sitting at.
     */
    expect(NAV_LINKS.map((l) => l.href)).toEqual([
      '/studio',
      '/devices',
      '/directions',
      '/riffs',
      '/samples',
      '/explore',
    ])
    // The three that left, named so this fails loudly if one is put back without the argument
    // above being answered.
    for (const gone of ['/drum-machines', '/parts', '/preferences']) {
      expect(NAV_LINKS.map((l) => l.href), `${gone} is back in the nav`).not.toContain(gone)
    }
    // And `/` is reachable, from the mark rather than from the list — which is the whole reason
    // the list no longer carries a second route to it.
    expect(markup).toContain('<a class="site-nav-home" aria-label="Home" href="/">')
    expect(NAV_LINKS.map((l) => l.href)).not.toContain('/')
    let at = -1
    for (const link of NAV_LINKS) {
      const found = markup.indexOf(`href="${link.href}"`)
      expect(found, `${link.href} is not in the nav`).toBeGreaterThan(at)
      expect(markup).toContain(`>${link.label}</a>`)
      at = found
    }
  })

  it('renders exactly what `NAV_LINKS` says, so the tested set cannot drift from the served one', () => {
    // The component maps this list rather than repeating it in JSX. Without that, every
    // assertion in this file could pass against a nav that shipped a fourth link nobody tested —
    // a smaller copy of the divergence #112 exists to stop.
    //
    // The bare-anchor pattern matches the list's links and not the mark, which carries a class
    // and a label: the mark is chrome with one fixed destination, and the list is the set under
    // test. Both are asserted, separately, in the test above.
    const markup = renderToStaticMarkup(createElement(SiteNav))
    const rendered = [...markup.matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map((m) => ({
      href: m[1] ?? '',
      label: m[2] ?? '',
    }))
    expect(rendered).toEqual(NAV_LINKS.map((l) => ({ href: l.href, label: l.label })))
    expect(markup.match(/<li>/g)?.length ?? 0).toBe(NAV_LINKS.length)
  })

  it('is on every route, exactly once, with the same links', async () => {
    /*
     * The claim the four hand-written copies could not make. Rendered through the layout, so
     * this fails if the nav is ever moved back into the pages and one of them forgets it.
     *
     * **Counted by name, not by tag** (#341). The studio route renders a guide, and the guide has
     * navigation of its own: a jump-nav through its sections, which is in-page and not a site
     * landmark. Counting every `<nav>` made this test assert something it never meant — that no
     * page may contain one — and it passed only because that bar happened to be drawn for one of
     * the two guide layouts. So: exactly one *site* nav, and every other nav on the page is named
     * something else, which is the distinguishability this file's first test asks for.
     */
    for (const { name, markup } of await routes()) {
      expect(
        markup.match(/<nav class="site-nav"/g)?.length ?? 0,
        `${name} should have exactly one site nav`,
      ).toBe(1)
      const labels = [...markup.matchAll(/<nav\b[^>]*aria-label="([^"]*)"/g)].map((m) => m[1])
      expect(labels, `${name} has an unnamed navigation landmark`).toHaveLength(
        markup.match(/<nav\b/g)?.length ?? 0,
      )
      expect(
        labels.filter((l) => l === 'Site'),
        `${name} has more than one landmark calling itself Site`,
      ).toHaveLength(1)
      for (const link of NAV_LINKS) {
        expect(markup, `${name} cannot reach ${link.href}`).toContain(
          `<a href="${link.href}">${link.label}</a>`,
        )
      }
    }
  })

  it('leaves no page with a hand-written link set of its own', async () => {
    /*
     * `.masthead-actions` survives in the studio, holding Copy link and — since #138 was answered
     * where it was actually asked — a Preferences link beside it.
     *
     * **So this can no longer be "no anchors", and the replacement is not weaker.** What #112 is
     * about is a page growing its own *link set*: four pages each wrote one, they drifted, and
     * `/devices` could reach the studio and nothing else. One anchor to the page that restyles
     * this one is not that, and the rule that tells them apart is a count and a destination. A
     * second link here, or any link to somewhere a reader could otherwise navigate to, fails —
     * which is the failure, rather than the element.
     */
    const ALLOWED = new Set(['/preferences'])
    for (const { name, markup } of await routes()) {
      const actions = [...markup.matchAll(/<(p|div) class="masthead-actions">(.*?)<\/\1>/g)]
      for (const [, , inner] of actions) {
        const hrefs = [...(inner ?? '').matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1] ?? '')
        expect(hrefs.length, `${name} has grown its own links again`).toBeLessThanOrEqual(1)
        for (const href of hrefs) {
          expect(ALLOWED.has(href), `${name} links to ${href} from its masthead`).toBe(true)
        }
      }
    }
    // And the dead stylesheet rule went with the markup. Matched as a rule, not as a substring:
    // the comment left in its place names it, which is the point of leaving one.
    expect(CSS).not.toContain('\n.masthead-actions a {')
    expect(CSS).not.toContain('\n.masthead-actions a:hover {')
  })

  it('reaches directions from the devices half, which was the actual dead end', async () => {
    const all = await routes()
    for (const name of ['/devices', `/devices/${DEVICES[0]?.id ?? ''}`]) {
      const page = all.find((r) => r.name === name)
      expect(page, `${name} not rendered`).toBeDefined()
      expect(page?.markup).toContain('href="/directions"')
    }
  })
})

describe('#112 the nav at 390px', () => {
  it('wraps rather than taking the body sideways', () => {
    /*
     * #21. **Measured, at a true 390px viewport, on a production build:** the nav is 390px wide
     * and 88px tall, wrapping 6 links onto 2 rows, with `documentElement.scrollWidth` and
     * `body.scrollWidth` both exactly 390 — no horizontal overflow. Checked on `/`, `/studio`,
     * `/devices`, `/explore`, `/parts` and a figure page, and identical on all six.
     *
     * **Say the width, the count, the rows and the height, so the next reader can tell when this
     * has gone stale.** The figure here said 88px for a long time while it described a five-link
     * nav that had since grown to eight and measured 132px across 3 rows — a number nobody could
     * check because it did not say what it was a number *of*. That it is 88px again is a
     * coincidence of six links fitting two rows the way five did, not evidence the old comment
     * was right.
     *
     * The rule is `wrap` and not a width nobody re-checks: another link, a longer label, or a
     * reader at 200% text size costs a row, never a sideways page.
     *
     * A viewport is set with `Emulation.setDeviceMetricsOverride` when this is re-measured.
     * Chrome's `--window-size` alone does not set the page viewport, and a screenshot taken that
     * way shows content clipped at the frame edge on every page here, which reads as overflow and
     * is not.
     */
    expect(rule('.site-nav ul')).toContain('flex-wrap: wrap')
    expect(rule('.site-nav ul')).toContain('min-width: 0')
    expect(rule('.site-nav')).not.toContain('overflow-x')
    expect(rule('.site-nav ul')).not.toContain('nowrap')
  })

  it('gives the mark a 44px target of its own, now that it is a link', () => {
    // Measured at 390px on a production build: 44x44, with the 28px drawing centred inside it.
    // Hit target and visual size are decoupled here for the reason they are on a knob (#21) —
    // the mark is drawn to sit in a header and a thumb needs more than that.
    expect(rule('.site-nav-home')).toContain('min-width: 44px')
    expect(rule('.site-nav-home')).toContain('min-height: 44px')
    expect(rule('.site-nav-home')).toContain('flex-shrink: 0')
    // The drawing keeps its own size and gives up the shrink guard to the link around it, which
    // is what the flex row now lays out.
    expect(rule('.site-nav-mark')).toContain('width: 28px')
    expect(rule('.site-nav-mark')).not.toContain('flex-shrink')
  })

  it('gives every link a 44px target in both directions', () => {
    // Height alone is the easy half, and it is the half that was right while "Studio" measured
    // 41x44 in a browser — a target that passes a reading of #21 and fails the thumb it is for.
    expect(rule('.site-nav a')).toContain('min-height: 44px')
    expect(rule('.site-nav a')).toContain('min-width: 44px')
    // The text is centred inside the wider box rather than left-aligned in it, so a short label
    // does not sit against one edge of its own target.
    expect(rule('.site-nav a')).toContain('justify-content: center')
  })

  it('is hidden in print, like every other piece of chrome', () => {
    const start = CSS.indexOf('@media print')
    expect(start).toBeGreaterThan(-1)
    expect(CSS.slice(start)).toContain('.site-nav,')
  })
})
