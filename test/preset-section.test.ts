import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DevicePageRoute from '../app/devices/[id]/page'
import PresetsPageRoute from '../app/explore/[id]/page'
import { PresetSection } from '../components/catalogue/preset-section'
import { FACTORY_PATCHES_FACT } from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs'
import { presetFigureHref, presetsHref, riffHref } from '../lib/studio/catalogue'
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
 * folder's; the Muse's panel counts nothing, since its thirteen came off a unit; and a list off a
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

describe('the Explore your device panel is on the three boxes with a session and on no other (#593, #618, #624)', () => {
  it('renders thirteen closed entries on the Muse', () => {
    expect(PRESET_HEADING).toBe('Explore your device')
    expect(MUSE).toContain(`>${PRESET_HEADING}<`)
    expect(MUSE.match(/class="disclosure preset-entry"/g)?.length).toBe(13)
    expect(MUSE).not.toContain('preset-entry" open')
  })

  it('renders no panel, no heading and no link on every other box', async () => {
    for (const device of DEVICES) {
      if (presetSession(device) !== undefined) continue
      const markup = await markupFor(device.id)
      expect(markup, device.id).not.toContain('preset-section')
      expect(markup, device.id).not.toContain(`>${PRESET_HEADING}<`)
      // The address the panel's link would use, which moved to `/explore/<id>` (§2.6/§3.7).
      // Asserted against the live helper rather than a literal, so this cannot go on passing by
      // naming a shape nothing renders any more.
      expect(markup, device.id).not.toContain(`href="${presetsHref(device)}"`)
      /*
       * And no link into the Explore tree at all, not merely this box's. Anchored on `href="/`
       * rather than matched as a bare substring: a maker's own page is an external link and one
       * of them is `elektron.se/explore/analog-rytm-mkii`, which a substring test reads as this
       * site's section and fails on.
       */
      expect(markup, device.id).not.toContain('href="/explore/')
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
    expect(patchRiffs.length).toBe(48)
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

    for (const entry of banked) {
      const name = entry.patch.name.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')
      const bank = (entry.patch.bank ?? '').replace(/&/g, '&amp;').replace(/'/g, '&#x27;')
      expect(panel, entry.patch.name).toContain(
        `<span class="preset-title"><span class="preset-name">${name}</span>` +
          `<span class="preset-bank mono">${bank}</span></span>`,
      )
      // On the page the name is the card's heading and the bank its sibling (#629): the same
      // cell, a `<div>` because a heading may not sit inside a `<span>`.
      expect(page, entry.patch.name).toContain(
        `<div class="preset-title preset-card-head"><h3 class="preset-name">${name}</h3>` +
          `<span class="preset-bank mono">${bank}</span></div>`,
      )
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
    // The Muse ships 224 and declares thirteen off a unit. A denominator on an observed reading
    // turns a fact into a score of our authoring, and the operator's decision was to list the
    // ones read and say nothing else.
    expect(session.reading).toBe('observed')
    expect(PANEL_TEXT).not.toMatch(/\b224\b/)
    expect(PANEL_TEXT).not.toMatch(/twelve of|12 of|thirteen of|13 of/i)
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
    // One row, and with no figure behind it, a plain row and no expander (#643).
    expect(markup.match(/class="disclosure preset-entry preset-entry-plain"/g)?.length).toBe(1)
    expect(markup).not.toContain('<details')
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

describe('every entry with a figure is a closed details, and one without is a plain row (#643)', () => {
  it('draws a closed expander for the patch a riff reaches, and a plain row for the one none does', () => {
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
    // §3.7/#643. The Bellbounce entry has a figure and folds; *Nothing Reaches Me* has a use
    // and no figure, and an expander over nothing would tell a reader they missed something
    // (§2.6's rule for a silent capability fact), so it is the same summary in a plain block
    // with the marker cell blank. Neither surface grows an empty `disclosure-body`.
    expect(markup.match(/class="disclosure preset-entry"/g)?.length).toBe(1)
    expect(markup.match(/class="disclosure preset-entry preset-entry-plain"/g)?.length).toBe(1)
    expect(markup.match(/<details/g)?.length).toBe(1)
    expect(markup).not.toContain('preset-entry" open')
    expect(markup).not.toContain('<div class="disclosure-body"></div>')
    expect(markup).toContain('preset-marker preset-marker-none')
    expect(markup).toContain('Nothing Reaches Me')
    expect(markup).toContain('A pad')
    // The Bellbounce entry links its figure; the other has nothing to link and links nothing.
    expect(markup.match(/class="preset-figure"/g)?.length).toBe(1)
  })

  it('renders nothing at all for no session', () => {
    expect(renderToStaticMarkup(createElement(PresetSection, { session: undefined }))).toBe('')
  })
})

/**
 * §2.6/#629. **Where a patch sat is a hint beside the name, on every surface, and part of
 * nothing.** The address rides in the same shrinkable cell as the name (#621's shape, so it
 * cannot fall into the marker gutter) as a sibling after the name and after the bank: it is not
 * inside `.preset-name`, not inside a link, not inside any heading `h1`-`h6` — on the presets
 * page the name is the card's `<h3>` and the address stands beside it, so what a heading
 * announces is the name — and `shippedPatchKey` ignores it, which `test/factory-patches.test.ts`
 * pins. A box that carries none renders no element and no sentence about it.
 */
describe('where a patch sat is a hint beside the name and part of nothing (#629)', () => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')

  async function surfaces(id: string): Promise<{ panel: string; page: string }> {
    return {
      panel: panelOf(await markupFor(id)),
      page: renderToStaticMarkup(await PresetsPageRoute({ params: Promise.resolve({ id }) })),
    }
  }

  /** The title cell as each surface writes it: a span of spans, or a div heading the card. */
  function titleOf(name: string, slot: string, heading: boolean): string {
    const address = `<span class="preset-slot mono">${esc(slot)}</span>`
    return heading
      ? `<div class="preset-title preset-card-head"><h3 class="preset-name">${esc(name)}</h3>${address}</div>`
      : `<span class="preset-title"><span class="preset-name">${esc(name)}</span>${address}</span>`
  }

  for (const id of ['moog-muse', 'moog-subsequent-37']) {
    it(`${id}: every entry carries its address as a sibling of the name, inside the title cell, on the panel and the page`, async () => {
      const entries = presetSession(byId(id))?.entries ?? []
      expect(entries.length).toBeGreaterThan(0)
      const { panel, page } = await surfaces(id)
      for (const [markup, heading] of [
        [panel, false],
        [page, true],
      ] as const) {
        for (const entry of entries) {
          const { name, slot } = entry.patch
          expect(slot, name).toBeDefined()
          expect(markup, name).toContain(titleOf(name, slot ?? '', heading))
          // The name's own element is closed before the address opens, so it is not the name.
          expect(markup, name).not.toContain(`${esc(name)} ${esc(slot ?? '')}<`)
          expect(markup, name).not.toContain(`${esc(name)}${esc(slot ?? '')}`)
        }
        // Never inside a link: the only links in an entry are to the figure and the page.
        for (const anchor of markup.match(/<a [^>]*>.*?<\/a>/g) ?? []) {
          expect(anchor).not.toContain('preset-slot')
        }
        expect((markup.match(/preset-slot/g) ?? []).length).toBe(entries.length)
      }
    })
  }

  /**
   * A heading's accessible text is what a screen reader announces and what an outline lists,
   * and *TRIPLET 5THS 9.11* is not the patch's name. So no address and no bank inside any
   * heading, on any surface, for every box with a session — the three that carry either.
   */
  it('no heading on any surface carries an address or a bank in its text', async () => {
    for (const id of ['moog-muse', 'moog-subsequent-37', 'korg-minilogue-xd']) {
      const { panel, page } = await surfaces(id)
      const whole = await markupFor(id)
      for (const markup of [whole, panel, page]) {
        const headings = markup.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g) ?? []
        expect(headings.length, id).toBeGreaterThan(0)
        for (const h of headings) {
          expect(h, id).not.toContain('preset-slot')
          expect(h, id).not.toContain('preset-bank')
        }
      }
      // And the card heading is the name alone, so the outline reads as the box prints it.
      for (const entry of presetSession(byId(id))?.entries ?? []) {
        expect(page, entry.patch.name).toContain(
          `<h3 class="preset-name">${esc(entry.patch.name)}</h3>`,
        )
      }
    }
  })

  it('the minilogue xd renders no address and no word about one', async () => {
    const { panel, page } = await surfaces('korg-minilogue-xd')
    for (const markup of [panel, page]) {
      expect(markup).not.toContain('preset-slot')
      for (const word of ['slot', 'address', 'location', 'position']) {
        expect(text(markup).toLowerCase()).not.toContain(` ${word} `)
      }
    }
  })

  it('a bank comes before the address where a box carries both', () => {
    const device = fixtureDevice({
      recipes: [recipe()],
      factoryPatches: [{ name: 'Aegean Organ', bank: 'KEYS', slot: '5.14' }],
      patchUses: [{ name: 'Aegean Organ', bank: 'KEYS', use: 'Greek modal writing' }],
      capabilityEvidence: {
        ...(fixtureDevice({ recipes: [recipe()] }).capabilityEvidence ?? {}),
        [FACTORY_PATCHES_FACT]: { kind: 'observed', source: 'A unit, firmware 1.0' },
      },
    } as never)
    const markup = renderToStaticMarkup(
      createElement(PresetSection, { session: presetSession(device, []) }),
    )
    expect(markup).toContain(
      '<span class="preset-title"><span class="preset-name">Aegean Organ</span>' +
        '<span class="preset-bank mono">KEYS</span><span class="preset-slot mono">5.14</span></span>',
    )
  })

  /**
   * An address broken across a line is two numbers, and the cell it sits in has to be the thing
   * that shrinks, so the name wraps before the address ever needs to (#21: 390px is primary).
   */
  it('the stylesheet keeps the address on one line inside a cell that may shrink', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const rule = (selector: string) => {
      const start = css.indexOf(`\n${selector} {`)
      expect(start, `${selector} is missing`).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf('}', start))
    }
    expect(rule('.preset-slot')).toContain('white-space: nowrap')
    expect(rule('.preset-slot')).toContain('font-size: 12px')
    expect(rule('.preset-slot')).toContain('color: var(--ink-dim)')
    expect(rule('.preset-title')).toContain('min-width: 0')
    expect(rule('.preset-name')).toContain('color: var(--ink)')
    // The card's heading is inline, so the address follows its last word rather than dropping
    // under a block, and the row it sits in is the shrinkable cell.
    expect(rule('.preset-page .preset-card-head .preset-name')).toContain('display: inline')
    expect(rule('.preset-page .preset-card-head')).toContain('min-width: 0')
  })
})
