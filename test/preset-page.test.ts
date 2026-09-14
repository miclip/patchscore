import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PresetsRoute, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '../app/devices/[id]/presets/page'
import DevicePageRoute from '../app/devices/[id]/page'
import sitemap from '../app/sitemap'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs'
import { deviceHref, presetsHref, riffHref } from '../lib/studio/catalogue'
import { presetSession } from '../lib/studio/preset-session'
import { PRESET_LEAD, presetTitle } from '../lib/studio/preset-text'

/**
 * §2.6/#593. **The standalone presets page**, as the markup a reader receives.
 *
 * Prerendered bytes rather than a component in a harness: the page is a server component with
 * no client boundary at all, so everything a crawler and a reader with no JavaScript get is in
 * this string. What is pinned is that the page exists exactly where a session does, that it
 * says what the model says with every entry open, that it links to the device and to every
 * figure, and that it carries no export and no count of what it does not list.
 */

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await PresetsRoute({ params: Promise.resolve({ id }) }))
}

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const MUSE = await markupFor('moog-muse')
const MUSE_TEXT = text(MUSE)
const session = presetSession(byId('moog-muse'))
if (session === undefined) throw new Error('the Muse has no preset session')

describe('the presets page exists exactly where a session does (#593)', () => {
  it('is prerendered for the boxes with a session, and for no others', () => {
    expect(dynamicParams).toBe(false)
    const ids = generateStaticParams().map((p) => p.id)
    const declaring = DEVICES.filter((d) => presetSession(d) !== undefined).map((d) => d.id)
    expect(ids).toEqual(declaring)
    expect(ids).toEqual(['moog-muse'])
  })

  it('404s on every other device, rather than rendering an empty claim', async () => {
    // `notFound()` throws Next's own 404; `dynamicParams = false` covers ids that are not
    // devices at all, so what is asserted here is the case the router would otherwise allow: a
    // real device with no declared patches.
    for (const device of DEVICES) {
      if (device.id === 'moog-muse') continue
      await expect(markupFor(device.id), device.id).rejects.toThrow(/404/)
      expect(await generateMetadata({ params: Promise.resolve({ id: device.id }) })).toEqual({})
    }
  })

  it('has one address, which the link, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    const listed = urls.filter((url) => url.endsWith('/presets'))
    expect(listed).toEqual(['https://patchscore.app/devices/moog-muse/presets'])
    for (const device of DEVICES) {
      expect(presetsHref(device)).toBe(`/devices/${device.id}/presets`)
      expect(urls.includes(`https://patchscore.app${presetsHref(device)}`), device.id).toBe(
        presetSession(device) !== undefined,
      )
    }
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'moog-muse' }) })
    expect(meta.alternates?.canonical).toBe('/devices/moog-muse/presets')
    expect(meta.title).toBe('Moog Muse: factory patches — Patchscore')
    expect(meta.description).toContain('Factory patches on the Moog Muse')
    expect(meta.description).not.toMatch(/\b224\b/)
  })

  it('is linked from the device page’s panel, and links back to the device', async () => {
    const device = renderToStaticMarkup(
      await DevicePageRoute({ params: Promise.resolve({ id: 'moog-muse' }) }),
    )
    expect(device).toContain('href="/devices/moog-muse/presets"')
    expect(MUSE).toContain(`href="${deviceHref(byId('moog-muse'))}"`)
    expect(MUSE_TEXT).toContain('Everything else about the Moog Muse')
  })
})

describe('the page says what the model says, every entry open', () => {
  it('carries the title, the lead, and every name and use in the folder’s order', () => {
    expect(MUSE).toContain(`<h1>${presetTitle(byId('moog-muse'))}</h1>`)
    expect(MUSE_TEXT).toContain(PRESET_LEAD)
    expect(MUSE.match(/class="preset-card"/g)?.length).toBe(12)
    // No disclosure anywhere: the page is the open reading.
    expect(MUSE).not.toContain('<details')
    const positions = session.entries.map((e) =>
      MUSE.indexOf(`<span class="preset-name">${e.patch.name.replace(/'/g, '&#x27;')}</span>`),
    )
    expect(positions.every((at) => at >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const entry of session.entries) {
      expect(MUSE_TEXT, entry.patch.name).toContain(entry.use)
    }
  })

  it('links every entry to its figure and prints the five recipe claims', () => {
    for (const entry of session.entries) {
      expect(entry.riff, entry.patch.name).toBeDefined()
      if (entry.riff !== undefined) {
        expect(MUSE, entry.patch.name).toContain(`href="${riffHref(entry.riff)}"`)
        expect(MUSE_TEXT, entry.patch.name).toContain(entry.riff.name)
      }
    }
    for (const riff of RIFFS.filter((r) => r.reference.kind === 'record')) {
      expect(MUSE, riff.id).not.toContain(`href="${riffHref(riff)}"`)
    }
    expect(MUSE.match(/class="quiet preset-recipe"/g)?.length).toBe(5)
    for (const entry of session.entries) {
      for (const r of entry.recipes) {
        expect(MUSE_TEXT, r.id).toContain(`Built by hand — ${r.title}`)
      }
    }
    expect(MUSE_TEXT.split('Built by hand —').length - 1).toBe(5)
    // #593. The patch is the heading and the page is titled for it, so the line restates neither.
    expect(MUSE_TEXT).not.toContain('the box ships')
    expect(MUSE_TEXT).not.toContain('arrives here already')
    expect(MUSE_TEXT).not.toContain('settings below')
  })

  it('carries no export, no song controls, and no count of what it does not list', () => {
    expect(MUSE).not.toContain('export-actions')
    expect(MUSE_TEXT).not.toMatch(/Download|Print/)
    expect(MUSE_TEXT).not.toMatch(/\bmood\b|\bseed\b|\btempo\b/i)
    expect(MUSE_TEXT).not.toMatch(/\b224\b/)
    expect(MUSE_TEXT).not.toMatch(/twelve of|12 of/i)
    expect(MUSE_TEXT).not.toMatch(/nobody has|not yet written|backlog/i)
  })

  it('has no client boundary: nothing under the route is a client module', () => {
    // The kit page earns one boundary for its two export buttons; this page is a linked
    // catalogue and earns none, so the whole route is prerendered HTML.
    const here = dirname(fileURLToPath(import.meta.url))
    for (const file of [
      join(here, '..', 'app', 'devices', '[id]', 'presets', 'page.tsx'),
      join(here, '..', 'components', 'catalogue', 'preset-section.tsx'),
    ]) {
      expect(readFileSync(file, 'utf8'), file).not.toContain("'use client'")
    }
    expect(readFileSync(join(here, '..', 'app', 'devices', '[id]', 'presets', 'page.tsx'), 'utf8')).not.toContain('ExportActions')
  })
})
