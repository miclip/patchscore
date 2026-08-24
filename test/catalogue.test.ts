import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Device, Template } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { ANY_KIND, kindsPresent } from '../lib/studio/picker'
import type { DeviceFilter, PickerView } from '../lib/studio/picker'
import {
  DEVICE_CATALOGUE,
  DIRECTION_CATALOGUE,
  NO_CATALOGUE_FILTER,
  countLine,
  kindLabel,
} from '../lib/studio/catalogue'
import type { CatalogueSource } from '../lib/studio/catalogue'
import { Browse } from '../components/catalogue/browse'

/**
 * #84. The shell both catalogue indexes are drawn with.
 *
 * The claims that matter are that the two catalogues are the same page over different data, that
 * neither of them re-orders the library, and that an index has no selection in it at all. Vitest
 * runs in Node with no DOM (`vitest.config.ts`), so the rendered half checks the first frame:
 * what a crawler and a reader with no JavaScript are given.
 */

const filter = (over: Partial<DeviceFilter> = {}): DeviceFilter => ({
  ...NO_CATALOGUE_FILTER,
  ...over,
})

const ids = <T,>(view: PickerView<T>, key: (item: T) => string) => view.rows.map((r) => key(r.item))

// ---------------------------------------------------------------------------
// The count line
// ---------------------------------------------------------------------------

describe('the count line', () => {
  const noun = { one: 'device', many: 'devices' }
  const view = (over: Partial<PickerView<never>>): PickerView<never> => ({
    rows: [],
    matched: 0,
    retained: 0,
    total: 0,
    filtering: false,
    ...over,
  })

  it('names the whole catalogue when nothing is typed', () => {
    expect(countLine(view({ total: 12 }), noun)).toBe('12 devices')
    expect(countLine(view({ total: 1 }), noun)).toBe('1 device')
    expect(countLine(view({ total: 0 }), noun)).toBe('0 devices')
  })

  it('reports the match against the whole catalogue while filtering', () => {
    // The denominator stays the library, so a reader can see how much of it they have hidden.
    expect(countLine(view({ matched: 2, total: 12, filtering: true }), noun)).toBe('2 of 12 match')
    expect(countLine(view({ matched: 0, total: 12, filtering: true }), noun)).toBe('0 of 12 match')
  })
})

// ---------------------------------------------------------------------------
// The two sources
// ---------------------------------------------------------------------------

describe('the device catalogue', () => {
  it('is the registry, in registry order, before anything is typed', () => {
    const shown = DEVICE_CATALOGUE.search(filter())
    expect(ids(shown, DEVICE_CATALOGUE.keyOf)).toEqual(DEVICES.map((d) => d.id))
    expect(shown.filtering).toBe(false)
    expect(shown.total).toBe(DEVICES.length)
  })

  it('does not re-rank when a query narrows it', () => {
    // A match-quality ranking would give the site a second opinion about which device is first.
    const shown = DEVICE_CATALOGUE.search(filter({ query: 'roland' }))
    const registry = DEVICES.filter((d) => d.maker.toLowerCase() === 'roland').map((d) => d.id)
    expect(registry.length).toBeGreaterThan(1)
    expect(ids(shown, DEVICE_CATALOGUE.keyOf)).toEqual(registry)
    expect(shown.matched).toBe(registry.length)
  })

  it('offers the kinds the registry actually ships, and each one excludes', () => {
    expect(DEVICE_CATALOGUE.kinds).toEqual(kindsPresent(DEVICES))
    expect(DEVICE_CATALOGUE.kinds.length).toBeGreaterThan(1)
    for (const kind of DEVICE_CATALOGUE.kinds) {
      const shown = DEVICE_CATALOGUE.search(filter({ kind }))
      expect(shown.matched).toBeGreaterThan(0)
      expect(shown.matched).toBeLessThan(DEVICES.length)
      for (const row of shown.rows) expect(row.item.kind).toBe(kind)
    }
  })

  it('says so when a search matches nothing', () => {
    const shown = DEVICE_CATALOGUE.search(filter({ query: 'zzzz' }))
    expect(shown.matched).toBe(0)
    expect(shown.rows).toEqual([])
  })
})

describe('the direction catalogue', () => {
  it('is the authored order, and searches name and key', () => {
    expect(ids(DIRECTION_CATALOGUE.search(filter()), DIRECTION_CATALOGUE.keyOf)).toEqual(
      TEMPLATES.map((t) => t.id),
    )
    const dorian = DIRECTION_CATALOGUE.search(filter({ query: 'dorian' }))
    expect(dorian.matched).toBe(1)
    expect(dorian.matched).toBeLessThan(TEMPLATES.length)
  })

  it('declares no kinds, and ignores a kind if one reaches it', () => {
    // A `Template` has no kind. Giving it one so the two indexes look alike would be the page
    // dictating the data model (invariant 3), so the shell draws no select and the field is
    // inert here rather than half-implemented.
    expect(DIRECTION_CATALOGUE.kinds).toEqual([])
    const plain = DIRECTION_CATALOGUE.search(filter())
    const withKind = DIRECTION_CATALOGUE.search(filter({ kind: 'groovebox' }))
    expect(ids(withKind, DIRECTION_CATALOGUE.keyOf)).toEqual(ids(plain, DIRECTION_CATALOGUE.keyOf))
    expect(withKind.filtering).toBe(false)
  })
})

describe('an index has no selection in it', () => {
  it('never marks a row selected or kept, whatever is typed', () => {
    // The picker's kept group exists so a filter cannot hide a device you own. There is no rig
    // behind an index page, so every row it returns is a match and the shell draws no such group.
    for (const query of ['', 'roland', 'dub', 'zzzz', '  ']) {
      for (const kind of [ANY_KIND, 'groovebox'] as DeviceFilter['kind'][]) {
        const views = [
          DEVICE_CATALOGUE.search(filter({ query, kind })),
          DIRECTION_CATALOGUE.search(filter({ query, kind })),
        ]
        for (const view of views) {
          expect(view.retained, `${query} / ${kind}`).toBe(0)
          expect(view.rows.some((r) => r.selected || r.retained)).toBe(false)
          expect(view.rows.length).toBe(view.matched)
        }
      }
    }
  })

  it('cannot reach the studio, the store or the browser', () => {
    // Structural, because it is a structural claim: an index that could import the session could
    // write the rig, and "browsing changes nothing" would be a convention instead of a fact.
    const sources = ['../components/catalogue/browse.tsx', '../lib/studio/catalogue.ts']
    for (const path of sources) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8')
      expect(source, path).not.toContain('lib/studio/session')
      expect(source, path).not.toContain('localStorage')
      expect(source, path).not.toContain('window.')
    }
  })
})

// ---------------------------------------------------------------------------
// The rendered shell
// ---------------------------------------------------------------------------

describe('the shell', () => {
  const deviceCard = (device: Device) => createElement('span', { className: 'name' }, device.name)
  const directionCard = (t: Template) => createElement('span', { className: 'name' }, t.name)

  const devices = () =>
    renderToStaticMarkup(
      createElement(Browse<Device>, { source: DEVICE_CATALOGUE, card: deviceCard }),
    )
  const directions = () =>
    renderToStaticMarkup(
      createElement(Browse<Template>, { source: DIRECTION_CATALOGUE, card: directionCard }),
    )

  it('lists the whole catalogue on the first frame', () => {
    // What a crawler and a reader with no JavaScript get. Typing only ever removes rows from it.
    const markup = devices()
    for (const device of DEVICES) expect(markup).toContain(device.name)
    expect(markup).toContain(`${DEVICES.length} devices`)
    expect(markup).toContain('<ul class="catalogue-list">')
    expect(markup).toContain('data-catalogue="devices"')
  })

  it('is byte-identical across renders, and reads no browser to draw itself', () => {
    expect('window' in globalThis).toBe(false)
    expect(devices()).toBe(devices())
  })

  it('labels the search box with an association a checker can verify', () => {
    const markup = devices()
    expect(markup).toContain('type="search"')
    expect(markup).toContain(DEVICE_CATALOGUE.searchLabel)
    const forId = /<label[^>]*for="([^"]+)"/.exec(markup)?.[1]
    expect(forId).toBeDefined()
    expect(markup).toContain(`id="${forId ?? ''}"`)
  })

  it('draws the kind filter only for a catalogue that has kinds', () => {
    const markup = devices()
    expect(markup).toContain('Filter devices by kind')
    expect(markup).toContain('All kinds')
    for (const kind of DEVICE_CATALOGUE.kinds) {
      expect(markup).toContain(`value="${kind}"`)
      expect(markup).toContain(kindLabel(kind))
    }

    const other = directions()
    expect(other).not.toContain('<select')
    expect(other).not.toContain('All kinds')
    expect(other).toContain(`${TEMPLATES.length} directions`)
    for (const template of TEMPLATES) expect(other).toContain(template.name)
  })

  it('says the empty line instead of drawing an empty list', () => {
    // Driven through a stub source: the shell is generic, so its behaviour when a search matches
    // nothing can be checked without a DOM to type into.
    const stub: CatalogueSource<Device> = {
      ...DEVICE_CATALOGUE,
      search: () => ({ rows: [], matched: 0, retained: 0, total: 12, filtering: true }),
    }
    const markup = renderToStaticMarkup(
      createElement(Browse<Device>, { source: stub, card: deviceCard }),
    )
    expect(markup).toContain(stub.empty)
    expect(markup).toContain('0 of 12 match')
    expect(markup).not.toContain('catalogue-list')
  })
})

// ---------------------------------------------------------------------------
// 390px
// ---------------------------------------------------------------------------

describe('the catalogue stylesheet', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

  function rule(selector: string): string {
    const start = css.indexOf(`\n${selector} {`)
    expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
    return css.slice(start, css.indexOf('}', start))
  }

  it('is one column until a media query widens it', () => {
    // §21 makes 390px a primary reading context. The narrow case is the unconditional rule, so a
    // dropped media query costs a column rather than overflowing the body sideways.
    expect(rule('.catalogue-list')).toContain('grid-template-columns: minmax(0, 1fr)')
    const wide = css.indexOf('@media (min-width: 640px)')
    expect(wide).toBeGreaterThan(css.indexOf('\n.catalogue-list {'))
    expect(css.slice(wide, css.indexOf('}\n}', wide))).toContain('repeat(auto-fill, minmax(16rem')
  })

  it('lets a long name wrap rather than widen the grid', () => {
    for (const selector of ['.catalogue', '.catalogue-list', '.catalogue-item']) {
      expect(rule(selector), selector).toContain('min-width: 0')
    }
    expect(rule('.catalogue-item')).toContain('overflow-wrap: anywhere')
  })
})
