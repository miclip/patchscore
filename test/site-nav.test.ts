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
import Page from '../app/page'
import { DEVICES } from '../lib/devices/registry.generated'
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
  if (device === undefined || template === undefined) throw new Error('empty registry')

  return [
    { name: '/', markup: await shell(await Page({ searchParams: Promise.resolve({}) })) },
    { name: '/devices', markup: await shell(createElement(DeviceIndexPage)) },
    { name: '/directions', markup: await shell(createElement(DirectionIndexPage)) },
    {
      name: `/devices/${device.id}`,
      markup: await shell(await DevicePageRoute({ params: Promise.resolve({ id: device.id }) })),
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

  it('names the studio, both catalogue halves and preferences, in that order', () => {
    const markup = renderToStaticMarkup(createElement(SiteNav))
    // Preferences is last on purpose: it is not a catalogue half, and it is the one entry a
    // reader goes to rarely. It is *in* the nav at all because the footer could not reach it —
    // on the studio page the footer sits below the whole generated guide (#138).
    expect(NAV_LINKS.map((l) => l.href)).toEqual([
      '/',
      '/devices',
      '/directions',
      '/preferences',
    ])
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
    const markup = renderToStaticMarkup(createElement(SiteNav))
    const rendered = [...markup.matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map((m) => ({
      href: m[1] ?? '',
      label: m[2] ?? '',
    }))
    expect(rendered).toEqual(NAV_LINKS.map((l) => ({ href: l.href, label: l.label })))
    expect(markup.match(/<li>/g)?.length ?? 0).toBe(NAV_LINKS.length)
  })

  it('is on every route, exactly once, with the same links', async () => {
    // The claim the four hand-written copies could not make. Rendered through the layout, so
    // this fails if the nav is ever moved back into the pages and one of them forgets it.
    for (const { name, markup } of await routes()) {
      expect(markup.match(/<nav\b/g)?.length ?? 0, `${name} should have exactly one nav`).toBe(1)
      for (const link of NAV_LINKS) {
        expect(markup, `${name} cannot reach ${link.href}`).toContain(
          `<a href="${link.href}">${link.label}</a>`,
        )
      }
    }
  })

  it('leaves no page with a hand-written link set of its own', async () => {
    // `.masthead-actions` survives in the studio, holding Copy link — a button, not navigation.
    // What must not come back is an anchor inside one, which is what the four copies were.
    for (const { name, markup } of await routes()) {
      const actions = [...markup.matchAll(/<(p|div) class="masthead-actions">(.*?)<\/\1>/g)]
      for (const [, , inner] of actions) {
        expect(inner ?? '', `${name} has grown its own links again`).not.toContain('<a ')
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
    // #21: three links fit on one line today. The rule is `wrap`, not a width nobody re-checks —
    // a fourth link or a reader at 200% text size must cost a row, never a horizontal scroll.
    expect(rule('.site-nav ul')).toContain('flex-wrap: wrap')
    expect(rule('.site-nav ul')).toContain('min-width: 0')
    expect(rule('.site-nav')).not.toContain('overflow-x')
    expect(rule('.site-nav ul')).not.toContain('nowrap')
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
