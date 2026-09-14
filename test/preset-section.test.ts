import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DevicePageRoute from '../app/devices/[id]/page'
import { PresetSection } from '../components/catalogue/preset-section'
import { FACTORY_PATCHES_FACT } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs'
import { riffHref } from '../lib/studio/catalogue'
import { presetSession } from '../lib/studio/preset-session'
import { PRESET_HEADING, PRESET_LEAD } from '../lib/studio/preset-text'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/#593. **The `Explore your device` panel on the device page**, as the markup a reader
 * receives.
 *
 * What is pinned: the panel is on the one box with a session and on no other; every entry is a
 * closed disclosure whose summary carries the name and what it is for; the body carries the
 * recipe claim where a recipe reaches the patch and the link to the figure written for it; the
 * order is the folder's; and nothing on the panel counts the patches it does not list.
 */

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id }) }))
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

/** The panel alone, out of the whole device page. */
function panelOf(markup: string): string {
  const start = markup.indexOf('<section class="panel span-2 preset-section">')
  if (start < 0) throw new Error('no preset panel')
  return markup.slice(start, markup.indexOf('</section>', start))
}
const PANEL = panelOf(MUSE)
const PANEL_TEXT = text(PANEL)
const session = presetSession(byId('moog-muse'))
if (session === undefined) throw new Error('the Muse has no preset session')

describe('the Explore your device panel is on the Muse and on no other box (#593)', () => {
  it('renders twelve closed entries on the Muse', () => {
    expect(PRESET_HEADING).toBe('Explore your device')
    expect(MUSE).toContain(`>${PRESET_HEADING}<`)
    expect(MUSE.match(/class="disclosure preset-entry"/g)?.length).toBe(12)
    expect(MUSE).not.toContain('preset-entry" open')
  })

  it('renders no panel, no heading and no link on every other box', async () => {
    for (const device of DEVICES) {
      if (device.id === 'moog-muse') continue
      const markup = await markupFor(device.id)
      expect(markup, device.id).not.toContain('preset-section')
      expect(markup, device.id).not.toContain(`>${PRESET_HEADING}<`)
      expect(markup, device.id).not.toContain('/presets"')
    }
  })

  it('sits with the kit, after Provenance and before Parameter sources', () => {
    expect(MUSE.indexOf('>Provenance<')).toBeLessThan(MUSE.indexOf(`>${PRESET_HEADING}<`))
    expect(MUSE.indexOf(`>${PRESET_HEADING}<`)).toBeLessThan(MUSE.indexOf('>Parameter sources<'))
  })
})

describe('each entry says what the model says', () => {
  it('carries every name and every use in the folder’s order', () => {
    const names = session.entries.map((e) => e.patch.name)
    const positions = names.map((name) =>
      MUSE.indexOf(`<span class="preset-name">${name.replace(/'/g, '&#x27;')}</span>`),
    )
    expect(positions.every((at) => at >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const entry of session.entries) {
      expect(MUSE_TEXT, entry.patch.name).toContain(entry.use)
    }
    expect(MUSE_TEXT).toContain(PRESET_LEAD)
  })

  it('links every entry to the riff whose reference names the patch, and to no other riff', () => {
    const patchRiffs = RIFFS.filter((r) => r.reference.kind === 'patch')
    expect(patchRiffs.length).toBe(12)
    for (const riff of patchRiffs) {
      expect(MUSE).toContain(`href="${riffHref(riff)}"`)
      expect(MUSE_TEXT).toContain(riff.name)
    }
    for (const riff of RIFFS.filter((r) => r.reference.kind === 'record')) {
      expect(MUSE, riff.id).not.toContain(`href="${riffHref(riff)}"`)
    }
  })

  it('prints the recipe and the guide’s own factory-patch sentence on the five, and on no other', () => {
    expect(MUSE.match(/class="quiet preset-recipe"/g)?.length).toBe(5)
    let claims = 0
    for (const entry of session.entries) {
      for (const r of entry.recipes) {
        claims += 1
        expect(MUSE, r.id).toContain(`<strong>${r.title}</strong>`)
        expect(MUSE, r.id).toContain(`<span class="mono">${r.role} · ${r.character}</span>`)
        // §3/#553's sentence, exactly as the guide prints it, and no `settings below` after it.
        expect(MUSE_TEXT, r.id).toContain(
          `Factory patch — the box ships ${entry.patch.name}, which arrives here already.`,
        )
      }
    }
    expect(claims).toBe(5)
    expect(MUSE_TEXT.split('Factory patch — the box ships').length - 1).toBe(5)
    expect(MUSE_TEXT).not.toContain('settings below')
  })

  it('says nothing about the patches it does not list', () => {
    // The Muse ships 224 and declares twelve. A denominator turns a fact into a score of our
    // authoring, and the operator's decision was to list the twelve and say nothing else.
    expect(PANEL_TEXT).not.toMatch(/\b224\b/)
    expect(PANEL_TEXT).not.toMatch(/twelve of|12 of/i)
    expect(PANEL_TEXT).not.toMatch(/nobody has|not yet written|backlog/i)
  })
})

describe('every entry is a closed details, whatever is under it', () => {
  it('draws a closed expander for a patch no recipe and no riff reaches', () => {
    const device = fixtureDevice({
      recipes: [recipe()],
      factoryPatches: [{ name: 'Nothing Reaches Me' }, { name: 'Bellbounce' }],
      patchUses: [
        { name: 'Nothing Reaches Me', use: 'A pad' },
        { name: 'Bellbounce', use: 'Delay-driven bell pattern' },
      ],
      capabilityEvidence: {
        ...(fixtureDevice().capabilityEvidence ?? {}),
        [FACTORY_PATCHES_FACT]: { kind: 'observed', source: 'A unit, firmware 1.0' },
      },
    } as never)
    const markup = renderToStaticMarkup(
      createElement(PresetSection, { session: presetSession(device, RIFFS) }),
    )
    expect(markup.match(/class="disclosure preset-entry"/g)?.length).toBe(2)
    expect(markup).not.toContain('preset-entry" open')
    expect(markup).toContain('Nothing Reaches Me')
    expect(markup).toContain('A pad')
    // The Bellbounce entry links its figure; the other has nothing to link and links nothing.
    expect(markup.match(/class="preset-figure"/g)?.length).toBe(1)
  })

  it('renders nothing at all for no session', () => {
    expect(renderToStaticMarkup(createElement(PresetSection, { session: undefined }))).toBe('')
  })
})
