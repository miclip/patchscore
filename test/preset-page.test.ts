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
import { deviceHref, presetFigureHref, presetsHref, riffHref } from '../lib/studio/catalogue'
import { presetSession } from '../lib/studio/preset-session'
import { presetLead, presetTitle } from '../lib/studio/preset-text'

/**
 * §2.6/#593. **The standalone presets page**, as the markup a reader receives.
 *
 * Prerendered bytes rather than a component in a harness: the page is a server component with
 * no client boundary at all, so everything a crawler and a reader with no JavaScript get is in
 * this string. What is pinned is that the page exists exactly where a session does, that it
 * says what the model says with every entry open, that it links to the device and to every
 * figure, that nothing on it is about a recipe (#598), that it carries no export, and that its
 * lead is the panel's own sentence, which on the Muse's observed reading counts nothing (#617).
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
    expect(ids).toEqual(['korg-minilogue-xd', 'moog-muse', 'moog-subsequent-37'])
  })

  it('404s on every other device, rather than rendering an empty claim', async () => {
    // `notFound()` throws Next's own 404; `dynamicParams = false` covers ids that are not
    // devices at all, so what is asserted here is the case the router would otherwise allow: a
    // real device with no declared patches.
    for (const device of DEVICES) {
      if (presetSession(device) !== undefined) continue
      await expect(markupFor(device.id), device.id).rejects.toThrow(/404/)
      expect(await generateMetadata({ params: Promise.resolve({ id: device.id }) })).toEqual({})
    }
  })

  it('has one address, which the link, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    const listed = urls.filter((url) => url.endsWith('/presets'))
    expect(listed).toEqual([
      'https://patchscore.app/devices/korg-minilogue-xd/presets',
      'https://patchscore.app/devices/moog-muse/presets',
      'https://patchscore.app/devices/moog-subsequent-37/presets',
    ])
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
    // The same sentence the panel says, from the one function both call (#617).
    expect(MUSE).toContain(`<p class="preset-lead">${presetLead(session)}</p>`)
    expect(MUSE_TEXT).toContain(presetLead(session))
    expect(MUSE.match(/class="preset-card"/g)?.length).toBe(13)
    // No disclosure anywhere: the page is the open reading.
    expect(MUSE).not.toContain('<details')
    // The name is the card's heading, and the heading is the name alone (#629).
    const positions = session.entries.map((e) =>
      MUSE.indexOf(`<h3 class="preset-name">${e.patch.name.replace(/'/g, '&#x27;')}</h3>`),
    )
    expect(positions.every((at) => at >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const entry of session.entries) {
      expect(MUSE_TEXT, entry.patch.name).toContain(entry.use)
    }
  })

  it('links every entry to its figure page under the device, and prints nothing about a recipe', () => {
    for (const entry of session.entries) {
      expect(entry.figure, entry.patch.name).toBeDefined()
      if (entry.figure !== undefined) {
        expect(MUSE, entry.patch.name).toContain(
          `href="${presetFigureHref(byId('moog-muse'), entry.patch)}"`,
        )
        expect(MUSE_TEXT, entry.patch.name).toContain(entry.figure.riff.name)
      }
    }
    // §3.7/#598. Nothing into `/riffs`: the twelve have no page there, and the five that do are
    // not this box's.
    for (const riff of RIFFS) {
      expect(MUSE, riff.id).not.toContain(`href="${riffHref(riff)}"`)
    }
    expect(MUSE).not.toContain('href="/riffs')
    /*
     * #598, operator decision. No recipe line under any wording it had, and no recipe title:
     * a preset is a thing you load, and a line about the recipe that reaches it reads as an
     * instruction to build it. `test/preset-section.test.ts` holds the panel to the same.
     */
    expect(MUSE).not.toContain('preset-recipe')
    for (const phrase of [
      'Built by hand',
      'Factory patch',
      'the box ships',
      'arrives here already',
      'settings below',
      'by hand',
    ]) {
      expect(MUSE_TEXT, phrase).not.toContain(phrase)
    }
    for (const r of byId('moog-muse').recipes) {
      expect(MUSE_TEXT, r.id).not.toContain(r.title)
    }
    expect(byId('moog-muse').recipes.filter((r) => r.factoryPatch !== undefined)).toHaveLength(5)
  })

  it('carries no export, no song controls, and no count of what it does not list', () => {
    expect(MUSE).not.toContain('export-actions')
    expect(MUSE_TEXT).not.toMatch(/Download|Print/)
    expect(MUSE_TEXT).not.toMatch(/\bmood\b|\bseed\b|\btempo\b/i)
    expect(MUSE_TEXT).not.toMatch(/\b224\b/)
    expect(MUSE_TEXT).not.toMatch(/twelve of|12 of|thirteen of|13 of/i)
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
