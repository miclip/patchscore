import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DevicePageRoute from '../app/devices/[id]/page'
import PresetsPageRoute from '../app/devices/[id]/presets/page'
import { PresetSection } from '../components/catalogue/preset-section'
import { FACTORY_PATCHES_FACT } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs'
import { presetFigureHref, riffHref } from '../lib/studio/catalogue'
import { presetSession } from '../lib/studio/preset-session'
import { PRESET_HEADING, presetLead } from '../lib/studio/preset-text'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/#593. **The `Explore your device` panel on the device page**, as the markup a reader
 * receives.
 *
 * What is pinned: the panel is on the one box with a session and on no other; every entry is a
 * closed disclosure whose summary carries the name and what it is for; the body carries the
 * link to the figure written for it and nothing about a recipe (#598); the order is the
 * folder's; the Muse's panel counts nothing, since its twelve came off a unit; and a list off a
 * manual page states the total the manual names and how many are here, with no row for a
 * patch nobody described (#617).
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
      if (presetSession(device) !== undefined) continue
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
    expect(MUSE_TEXT).toContain(presetLead(session))
  })

  /**
   * §3.7/#598. The figure link is to the page under this box, never into `/riffs`: the twelve
   * have no page there, so a `riffHref` on this panel would be a link to a 404.
   */
  it('links every entry to its figure page under the device, and nowhere into /riffs', () => {
    const patchRiffs = RIFFS.filter((r) => r.reference.kind === 'patch')
    expect(patchRiffs.length).toBe(36)
    for (const entry of session.entries) {
      expect(entry.figure, entry.patch.name).toBeDefined()
      expect(MUSE, entry.patch.name).toContain(
        `href="${presetFigureHref(byId('moog-muse'), entry.patch)}"`,
      )
      expect(MUSE_TEXT, entry.patch.name).toContain(entry.figure?.riff.name ?? '')
    }
    for (const riff of RIFFS) {
      expect(MUSE, riff.id).not.toContain(`href="${riffHref(riff)}"`)
    }
    expect(MUSE).not.toContain('href="/riffs')
  })

  /**
   * #621. **A bank travels inside the name's cell, on both surfaces.**
   *
   * `.preset-summary` is a grid, and the name and bank used to be a fragment, so they were two
   * cells rather than two words. On a phone the bank fell into the 1.1em marker gutter and set
   * one letter per line — `B`, `a`, `s`, `s` — and above 640px it took the column `.preset-use`
   * declares. Nothing caught it because the Muse's twelve carry no bank and the minilogue xd is
   * the first device that does.
   *
   * So this pins the containment rather than the class: a bank must be inside a `.preset-title`
   * that also holds the name, on the panel and on the presets page, which had the markup written
   * out twice. A markup test cannot see a collapsed column, but it can see the shape that
   * collapsed it.
   */
  it('keeps a bank inside the same element as the name, on both surfaces', async () => {
    const device = byId('korg-minilogue-xd')
    const session = presetSession(device)
    const banked = session?.entries.filter((e) => e.patch.bank !== undefined) ?? []
    expect(banked.length).toBeGreaterThan(0)

    const panel = await markupFor('korg-minilogue-xd')
    const page = renderToStaticMarkup(
      await PresetsPageRoute({ params: Promise.resolve({ id: 'korg-minilogue-xd' }) }),
    )

    for (const markup of [panel, page]) {
      for (const entry of banked) {
        const name = entry.patch.name.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')
        const bank = (entry.patch.bank ?? '').replace(/&/g, '&amp;').replace(/'/g, '&#x27;')
        expect(markup, entry.patch.name).toContain(
          `<span class="preset-title"><span class="preset-name">${name}</span>` +
            `<span class="preset-bank mono">${bank}</span></span>`,
        )
      }
    }
  })

  /**
   * #598, operator decision. **Nothing about a recipe, on either surface.** A line about
   * `Recipe.factoryPatch` stood here twice — *Factory patch — the box ships X, which arrives here
   * already*, then *Built by hand — <recipe title>* — and both read as an instruction to
   * assemble the thing the entry had just said to load, with a recipe's title where a
   * description of the patch belongs. A preset entry is the name, what it is for, and the
   * figure. So this asserts the absence, by every wording it had and by every recipe title on
   * the box, so it cannot return in another coat.
   */
  it('prints no recipe line and no recipe title, under any wording it ever had', () => {
    // The panel's own markup: the device page around it lists every recipe under `Parameter
    // sources`, which is that panel's job and not this one's.
    expect(PANEL).not.toContain('preset-recipe')
    for (const phrase of [
      'Built by hand',
      'Factory patch',
      'the box ships',
      'arrives here already',
      'settings below',
      'by hand',
    ]) {
      expect(PANEL_TEXT, phrase).not.toContain(phrase)
    }
    // No recipe title from the folder, patched or not, and no `role · character` pair of one.
    for (const r of byId('moog-muse').recipes) {
      expect(PANEL_TEXT, r.id).not.toContain(r.title)
    }
    expect(PANEL).not.toMatch(/<span class="mono">[a-z-]+ · [a-z]+<\/span>/)
    // Not vacuous: the box has recipes naming five of these patches, and none of them shows.
    expect(byId('moog-muse').recipes.filter((r) => r.factoryPatch !== undefined)).toHaveLength(5)
  })

  it('says nothing about the patches it does not list', () => {
    // The Muse ships 224 and declares twelve off a unit. A denominator on an observed reading
    // turns a fact into a score of our authoring, and the operator's decision was to list the
    // twelve and say nothing else.
    expect(session.reading).toBe('observed')
    expect(PANEL_TEXT).not.toMatch(/\b224\b/)
    expect(PANEL_TEXT).not.toMatch(/twelve of|12 of/i)
    expect(PANEL_TEXT).not.toMatch(/nobody has|not yet written|backlog/i)
  })
})

/**
 * #617. A list off a manual page is the other case. The fixture names two and describes one,
 * cited to a page, and the panel says the manual names two and one is here, with no row and
 * no name for the undescribed patch. The page at `presetsHref` says the same sentence, since
 * both call `presetLead`; `test/preset-page.test.ts` pins that on the Muse.
 */
describe('a list off a manual page states the total and how many are here (#617)', () => {
  function manualBacked(uses: { name: string; bank: string; use: string }[]): Device {
    return fixtureDevice({
      recipes: [recipe()],
      factoryPatches: [
        { name: 'Replicant xd', bank: 'Pad' },
        { name: 'TPL Snare', bank: 'Template' },
      ],
      patchUses: uses,
      capabilityEvidence: {
        ...(fixtureDevice().capabilityEvidence ?? {}),
        [FACTORY_PATCHES_FACT]: { kind: 'manual', source: "Owner's Manual, pp.61-64" },
      },
    } as never)
  }

  it('one use of two: the lead counts two named and one here, and the other is absent', () => {
    const session = presetSession(manualBacked([{ name: 'Replicant xd', bank: 'Pad', use: 'A wide pad' }]), [])
    if (session === undefined) throw new Error('no session')
    const markup = renderToStaticMarkup(createElement(PresetSection, { session }))
    const body = text(markup)
    expect(presetLead(session)).toBe(
      'The manual names 2 factory patches, and 1 of them is here: what each is for, and the figure written for it where one exists.',
    )
    expect(body).toContain(presetLead(session))
    expect(markup.match(/class="disclosure preset-entry"/g)?.length).toBe(1)
    expect(markup).toContain('Replicant xd')
    expect(markup).not.toContain('TPL Snare')
    expect(body).not.toMatch(/nobody has|not yet written|backlog/i)
  })

  it('every one described: the lead says so', () => {
    const session = presetSession(
      manualBacked([
        { name: 'Replicant xd', bank: 'Pad', use: 'A wide pad' },
        { name: 'TPL Snare', bank: 'Template', use: 'A starting point for a snare' },
      ]),
      [],
    )
    if (session === undefined) throw new Error('no session')
    expect(presetLead(session)).toBe(
      'The manual names 2 factory patches, and every one is here: what each is for, and the figure written for it where one exists.',
    )
    expect(text(renderToStaticMarkup(createElement(PresetSection, { session })))).toContain(
      presetLead(session),
    )
  })

  it('an observed reading keeps the sentence with no count', () => {
    expect(presetLead(session)).toBe(
      'The ones worth knowing, what each is for, and the figure written for it where one exists.',
    )
  })
})

describe('every entry is a closed details, whatever is under it', () => {
  it('draws a closed expander for a patch no recipe and no riff reaches', () => {
    // A box that plays the Bellbounce figure (an `arp`), since #598 resolves every figure on
    // the box that ships its patch and refuses one it cannot play.
    const device = fixtureDevice({
      recipes: [recipe(), recipe({ id: 'fx-arp-bright', role: 'arp', character: 'bright', voice: 'lt' })],
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'lt', label: 'LT', roles: ['arp'], polyphony: 1 },
      ],
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
