import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  expand,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { deviceHref, deviceLabel } from '../lib/studio/catalogue'
import {
  clockText,
  deviceDescription,
  deviceTitle,
  devicePage,
  directionFit,
  provenanceSentence,
  rolesCovered,
} from '../lib/studio/device-page'
import { clockText as guideClockText } from '../components/guide/format'
import { auditDevice, citedDocument, rangeDocuments } from '../lib/studio/provenance'
import { PanelFigure } from '../components/rack/panel-figure'
import { soloPanel } from '../components/rack/model'
import DeviceIndexPage from '../app/devices/page'
import DevicePageRoute, {
  generateMetadata,
  generateStaticParams,
} from '../app/devices/[id]/page'
import sitemap from '../app/sitemap'

/**
 * #84. The device catalogue: `/devices` and one page per manifest.
 *
 * These pages are the SEO surface, so what is asserted here is what a crawler is given without
 * running any JavaScript — the title, the canonical, and the facts in the prerendered markup —
 * and that every number on them is derived from the manifest rather than restated by hand.
 *
 * Vitest runs in Node with no DOM, which is what these pages want: they are server components
 * with no state, so a static render is the whole page rather than a first frame.
 */

const TR = DEVICES.find((d) => d.id === 'roland-tr-1000') as Device
const ZOIA = DEVICES.find((d) => d.id === 'empress-zoia-euroburo') as Device
const TR8S = DEVICES.find((d) => d.id === 'roland-tr-8s') as Device

/** React escapes text nodes; an apostrophe in a manual's title comes back as an entity. */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id }) }))
}

// ---------------------------------------------------------------------------
// Naming and addressing
// ---------------------------------------------------------------------------

describe('a box with nowhere to put a recipe', () => {
  /**
   * "Yet" is a promise. Four devices have no assignables at all (§2.4) — two mixers, a sequencer
   * and an fx unit — so a recipe has nowhere to go and is not late. Telling a reader to come back
   * for something that is never coming is worse than saying the box does not work that way.
   */
  it('says nothing to assign, not no recipes yet, when there is nowhere to put one', () => {
    const markup = renderToStaticMarkup(createElement(DeviceIndexPage))
    for (const device of DEVICES) {
      if (device.recipes.length > 0) continue
      const label = deviceLabel(device)
      const at = markup.indexOf(label)
      expect(at, `${device.id} missing`).toBeGreaterThan(-1)
      const line = markup.slice(at, at + 400)
      if (expand(device).length === 0) {
        expect(line, `${device.id} is voiceless`).toContain('nothing to assign')
        expect(line, `${device.id} should promise nothing`).not.toContain('no recipes yet')
      } else {
        expect(line, `${device.id} has voices and no recipes`).toContain('no recipes yet')
      }
    }
  })
})

describe('how a device is named and addressed', () => {
  it('does not say the maker twice', () => {
    expect(deviceLabel(TR)).toBe('Roland TR-1000')
    const zoom = DEVICES.find((d) => d.id === 'zoom-livetrak-l-8') as Device
    expect(zoom.name.startsWith(zoom.maker)).toBe(true)
    expect(deviceLabel(zoom)).toBe(zoom.name)
    for (const device of DEVICES) {
      expect(deviceLabel(device)).toContain(device.name)
      expect(deviceLabel(device).split(device.maker).length - 1).toBeLessThanOrEqual(1)
    }
  })

  it('has one address, which the sitemap and the canonical both use', () => {
    // Three places would be three chances to disagree about where a device page lives.
    const urls = sitemap().map((entry) => entry.url)
    for (const device of DEVICES) {
      expect(deviceHref(device)).toBe(`/devices/${device.id}`)
      expect(urls).toContain(`https://patchscore.app${deviceHref(device)}`)
    }
  })
})

// ---------------------------------------------------------------------------
// Derived from the manifest
// ---------------------------------------------------------------------------

describe('what the page says about a device', () => {
  it('lists the roles the manifest authors, in vocabulary order', () => {
    const covered = rolesCovered(TR)
    expect(covered.map((c) => c.role)).toEqual([...new Set(covered.map((c) => c.role))])
    // Vocabulary order, so adding a recipe cannot reshuffle the page.
    const positions = covered.map((c) => ROLES.indexOf(c.role))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    // Exactly the roles authored, and the characters authored for each.
    expect(new Set(covered.map((c) => c.role))).toEqual(new Set(TR.recipes.map((r) => r.role)))
    for (const cover of covered) {
      const authored = TR.recipes.filter((r) => r.role === cover.role)
      expect(cover.recipes).toBe(authored.length)
      expect(cover.characters).toEqual(
        CHARACTERS.filter((c) => authored.some((r) => r.character === c)),
      )
    }
  })

  it('says the same about clock as the rendered guide does', () => {
    // A restatement of `lib/core/render.ts`'s four cases, so something has to hold them together.
    //
    // **All three restatements, not two.** `components/guide/format.ts` carries a third copy for
    // the React side, and it was pinned by nothing — so when clock became directional it kept
    // reading the shared-wire field alone and returned a bare claim for a split box, dropping the
    // transports entirely. It has no callers today, which is exactly why the drift was silent and
    // exactly why it belongs in this sweep: the next thing to import it would have inherited the
    // bug rather than discovered it.
    const result = resolve({
      devices: [...DEVICES],
      template: TEMPLATES[0] as (typeof TEMPLATES)[number],
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const guide = renderGuide(result)
    for (const device of DEVICES) {
      expect(guide, device.id).toContain(`clock: ${clockText(device)}`)
      expect(guideClockText(device), device.id).toBe(clockText(device))
    }
  })

  it('takes its provenance counts from the audit rather than counting again', () => {
    for (const device of DEVICES) {
      const page = devicePage(device)
      expect(page.provenance).toEqual(auditDevice(device).counts)
      // The two identities the audit is built on, restated where a page prints the numbers.
      const c = page.provenance
      expect(c.manualPoints + c.observedPoints + c.provisionalPoints).toBe(c.params)
      expect(c.manualRanges + c.observedRanges + c.unverifiedRanges).toBe(c.numerics)
    }
  })

  it('says "provisional" on the page, in those words, with the audit\'s own counts', () => {
    // #84: provenance is the point, not a footnote, and `provisional` is not renamed. "Uncited"
    // reads as a filing omission; a point value nobody has checked against a document is a
    // setting somebody chose, which is a different claim about a different thing.
    const counts = auditDevice(TR8S).counts
    expect(provenanceSentence(TR8S, counts)).toBe(
      `${counts.provisionalPoints} of ${counts.params} values provisional. ` +
        `${counts.manualRanges} of ${counts.numerics} ranges cited to the TR-8S Reference Manual eng01.`,
    )

    for (const device of DEVICES) {
      const sentence = provenanceSentence(device, auditDevice(device).counts)
      const c = auditDevice(device).counts
      if (c.params === 0) {
        // Accurate for a box with nothing authored: `0 of 0 values provisional` is true and says
        // nothing about a mixer that is here for its clock and its audio.
        expect(sentence, device.id).toBe(
          'No patch recipes are authored for this box, so it has no values and no ranges to cite.',
        )
        expect(sentence, device.id).not.toContain('provisional')
        continue
      }
      expect(sentence, device.id).toContain(
        `${c.provisionalPoints} of ${c.params} values provisional`,
      )
      // Manual and observed stay distinct: neither is folded into the other, and a count of zero
      // is left out of the sentence rather than printed as a claim about nothing.
      expect(sentence.includes('cited to a manual page'), device.id).toBe(c.manualPoints > 0)
      expect(sentence.includes('observed on the unit'), device.id).toBe(
        c.observedPoints > 0 || c.observedRanges > 0,
      )
      if (c.manualRanges > 0) {
        expect(sentence, device.id).toContain(
          `${c.manualRanges} of ${c.numerics} ranges cited to the ${rangeDocuments(device)[0] ?? ''}`,
        )
      }
      expect(sentence.includes(`${c.unverifiedRanges} unverified`), device.id).toBe(
        c.unverifiedRanges > 0,
      )
      // No rounding anywhere: every number in the sentence is one the audit produced. Document
      // titles are cut out first — an edition like `BE_0718-AAJ_WW` carries digits that are part
      // of a name rather than a count.
      let bare = sentence
      for (const document of rangeDocuments(device)) bare = bare.split(document).join('')
      for (const n of bare.match(/\d+/g) ?? []) {
        expect(
          [
            c.params,
            c.provisionalPoints,
            c.manualPoints,
            c.observedPoints,
            c.numerics,
            c.manualRanges,
            c.observedRanges,
            c.unverifiedRanges,
          ].map(String),
          `${device.id}: ${n}`,
        ).toContain(n)
      }
    }
  })

  it('names the document a range was cited to, without its page number', () => {
    expect(citedDocument('TR-8S Reference Manual eng01, p.30')).toBe('TR-8S Reference Manual eng01')
    expect(citedDocument('a document with no page')).toBe('a document with no page')
    expect(rangeDocuments(TR8S)).toEqual(['TR-8S Reference Manual eng01'])
    // The MC-101 cites two, most-cited first, so the list is not an accident of one device.
    const mc = DEVICES.find((d) => d.id === 'roland-mc-101') as Device
    expect(rangeDocuments(mc).length).toBeGreaterThan(1)
    expect(rangeDocuments(ZOIA)).toEqual([])
  })

  /**
   * #173. A page number is not the only way to point inside a document, and the second way was
   * missed for as long as nothing used it.
   *
   * A tagged documentation corpus is located by repository path rather than by page, and the tag
   * that makes such a citation checkable — `release_1_2_1` — belongs to the *corpus*. Treating the
   * path as part of the document name made five files under one corpus read as five documents, and
   * the Deluge's summary sentence repeated the corpus name five times in a comma-separated list
   * whose items contained commas.
   */
  it('groups a tagged corpus by its tag, not by the file inside it', () => {
    const corpus = 'Deluge community firmware release_1_2_1'
    expect(citedDocument(`${corpus}, menus/envelope/attack.md`)).toBe(corpus)
    expect(citedDocument(`${corpus}, community_features.md`)).toBe(corpus)

    // A citation that spans both kinds of source still groups under the paginated document it
    // names first — the page rule runs after the path rule, so stripping the path exposes it.
    expect(
      citedDocument(
        'Deluge Official Guidebook OS 4.1 (OLED), p.120 and p.122 + community firmware release_1_2_1, automation_view.md',
      ),
    ).toBe('Deluge Official Guidebook OS 4.1 (OLED)')

    // Narrow on purpose. A document *title* that ends in ".md" contains spaces and is not a path,
    // so it is left whole; and a path that is not at the end is not a locator for this citation.
    expect(citedDocument('A Manual About Writing .md')).toBe('A Manual About Writing .md')
    expect(citedDocument('notes/a.md and something else')).toBe('notes/a.md and something else')

    // The Deluge is the only device in the library that cites a corpus this way, and it now names
    // two documents rather than six.
    const deluge = DEVICES.find((d) => d.id === 'synthstrom-deluge') as Device
    expect(rangeDocuments(deluge)).toEqual(['Deluge Official Guidebook OS 4.1 (OLED)', corpus])

    // Every other device is untouched by the path rule — none of them cites a file at all.
    for (const device of DEVICES) {
      for (const document of rangeDocuments(device)) {
        expect(document.endsWith('.md'), `${device.id}: ${document}`).toBe(false)
      }
    }
  })

  it('describes itself in one sentence a search result can hold', () => {
    for (const device of DEVICES) {
      const page = devicePage(device)
      expect(page.title).toBe(deviceTitle(device))
      expect(page.title).toContain(device.name)
      expect(page.description.length).toBeLessThan(160)
      expect(page.description.startsWith(deviceLabel(device))).toBe(true)
      // A box with nothing authored says so, rather than reporting zeroes against zeroes.
      if (device.recipes.length === 0) expect(page.description).toContain('no patch recipes')
      else expect(page.description).toContain('cited')
    }
    expect(deviceDescription(TR, devicePage(TR))).toBe(devicePage(TR).description)
  })
})

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe('what one box covers of a direction', () => {
  it('is a real resolve against a rig of one', () => {
    const template = TEMPLATES[0] as (typeof TEMPLATES)[number]
    const fit = directionFit(TR, template)
    const result = resolve({ devices: [TR], template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(fit.covered).toBe(result.assignments.length)
    expect(fit.requests).toBe(template.roles.length)
    // §4.4/#81: the essential count is what the direction cannot be itself without, which is
    // not the same set as "not optional" — every optional request is inessential, not the
    // other way round.
    expect(fit.essential).toBe(template.roles.filter((r) => r.inessential === undefined).length)
    expect(fit.essentialCovered).toBeLessThanOrEqual(fit.essential)
    expect(fit.covered).toBeLessThanOrEqual(fit.requests)
    // The roles it carried, in template request order rather than in assignment order.
    expect(fit.roles.length).toBe(fit.covered)
  })

  it('is the same answer every time it is asked', () => {
    // Neutral mood and a fixed seed: coverage is a property of the box, not of a roll.
    expect(directionFit(TR, TEMPLATES[0] as (typeof TEMPLATES)[number])).toEqual(
      directionFit(TR, TEMPLATES[0] as (typeof TEMPLATES)[number]),
    )
  })

  it('is every direction in template order, and none for a box with no voices', () => {
    expect(devicePage(TR).directions.map((f) => f.templateId)).toEqual(TEMPLATES.map((t) => t.id))
    expect(expand(ZOIA)).toHaveLength(0)
    expect(devicePage(ZOIA).directions).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

describe('the panel figure', () => {
  it('is the rack\'s own panel, with nothing assigned to it', () => {
    const panel = soloPanel(TR)
    expect(panel.spanMm).toBe(TR.physical.panelSpanMm)
    expect(panel.xMm).toBe(0)
    expect(panel.topMm).toBe(0)
    expect(panel.parts).toBe(0)
    expect(panel.clockRole).toBe('isolated')
    expect(panel.banks.flatMap((b) => b.cells).some((c) => c.occupied)).toBe(false)
    // Authored where the manifest drew one, generated where it did not — same rule as the rack.
    expect(panel.generated).toBe(TR.panel === undefined)
  })

  it('draws every device without throwing, and says whose drawing it is', () => {
    for (const device of DEVICES) {
      const markup = renderToStaticMarkup(
        createElement(PanelFigure, { device, idPrefix: device.id }),
      )
      expect(markup, device.id).toContain('<svg')
      // "drawing" where somebody drew one, "outline" where the shape came from the sockets.
      expect(markup, device.id).toContain(
        device.panel === undefined ? 'Our own simplified outline' : 'Our own simplified drawing',
      )
      // §10: reference, never asset. Nothing is fetched, so nothing of the maker's is shipped.
      expect(markup, device.id).not.toContain('<image')
      expect(markup, device.id).not.toContain('http')
    }
  })

  /**
   * §10/invariant 5. **An undrawn panel must not print a height as though it were measured.**
   *
   * `soloPanel` gives a device with no `panel` the `PANEL_HEIGHT_MM` drawing convention, which
   * is the constant every undrawn panel shares rather than anything about that box — the rack
   * model says so itself: "a panel's aspect ratio here is not the device's real aspect ratio."
   * The caption used to print `222.3 × 170 mm` for the Minitaur, putting an invented number in a
   * dimension pair immediately beside a real citation to p.30.
   */
  it('states a height only for a panel somebody drew', () => {
    // Exercised on a fixture, because every shipped box is drawn again — the MicroFreak was the
    // one that briefly was not, and `rack.test.ts`'s `UNDRAWN` records why it stopped being.
    // The failure guarded against is silent either way: a defaulted height reads exactly like a
    // measured one, standing next to a real citation.
    const undrawn: Device = {
      ...(DEVICES.find((d) => d.id === 'moog-minitaur') as Device),
      panel: undefined,
    }
    const bare = renderToStaticMarkup(
      createElement(PanelFigure, { device: undrawn, idPrefix: 'undrawn' }),
    )
    expect(bare).toContain('222.3 mm wide')
    expect(bare).toContain('drawing convention')
    // The pair is what reads as a measurement, so the pair is what must not appear.
    expect(bare).not.toContain('222.3 × ')

    for (const device of DEVICES) {
      const markup = renderToStaticMarkup(
        createElement(PanelFigure, { device, idPrefix: device.id }),
      )
      const span = device.physical.panelSpanMm
      const rise = device.panel?.panelRiseMm
      if (rise === undefined) {
        // No drawing, so no height to state — the pair is what reads as a measurement, and a
        // box with nothing measured must show the span alone and say the drawing is generated.
        expect(markup, device.id).toContain(`${String(span)} mm wide`)
        expect(markup, device.id).toContain('drawing convention')
        expect(markup, device.id).not.toContain(`${String(span)} × `)
        continue
      }
      expect(markup, device.id).toContain(`${String(span)} × ${String(rise)} mm`)
      expect(markup, device.id).not.toContain('drawing convention')
    }
  })
})

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

describe('the device routes', () => {
  it('prerenders one page per manifest, and nothing else', () => {
    expect(generateStaticParams()).toEqual(DEVICES.map((d) => ({ id: d.id })))
  })

  it('carries its own title, description and canonical', async () => {
    for (const device of DEVICES) {
      const meta = await generateMetadata({ params: Promise.resolve({ id: device.id }) })
      const page = devicePage(device)
      expect(meta.title).toBe(page.title)
      expect(meta.description).toBe(page.description)
      // Its own address, not the root's canonical: this is authored content, not a generated
      // view of the studio (#44).
      expect(meta.alternates?.canonical).toBe(deviceHref(device))
    }
    expect(await generateMetadata({ params: Promise.resolve({ id: 'nope' }) })).toEqual({})
  })

  it('puts the facts in the markup, where a crawler with no JavaScript sees them', async () => {
    const markup = await markupFor('roland-tr-1000')
    const page = devicePage(TR)
    expect(markup).toContain('Roland TR-1000')
    expect(markup).toContain(clockText(TR))
    expect(markup).toContain(`${page.provenance.numerics}`)
    for (const cover of page.roles) expect(markup).toContain(cover.role)
    for (const fit of page.directions) {
      expect(markup).toContain(fit.name)
      expect(markup).toContain(`href="${fit.href}"`)
    }
    // The panel is on the page, drawn rather than described.
    expect(markup).toContain('rack-svg')
  })

  it('puts the provisional count in the markup of every device page', async () => {
    // The rendered claim, not just the helper's return value: the constraint in #84 is about what
    // the page says, so the assertion has to be about the page.
    for (const device of DEVICES) {
      const markup = await markupFor(device.id)
      const counts = auditDevice(device).counts
      expect(markup, device.id).toContain(escaped(provenanceSentence(device, counts)))

      if (counts.params > 0) {
        expect(markup, device.id).toContain('provisional')
        // The column keeps the word too, and the range column keeps its own.
        expect(markup, device.id).toContain('>Provisional<')
        expect(markup, device.id).toContain(`>${counts.provisionalPoints}<`)
        expect(markup, device.id).toContain(`>${counts.params}<`)
      }
      if (counts.numerics > 0) {
        expect(markup, device.id).toContain('>Unverified<')
        expect(markup, device.id).toContain(`>${counts.manualRanges}<`)
        expect(markup, device.id).toContain(`>${counts.observedRanges}<`)
      }
      // Not renamed, and not softened: `Uncited` was the heading this replaced.
      expect(markup, device.id).not.toContain('Uncited')
      expect(markup, device.id).not.toContain('uncited')
    }
  })

  it('says what a box with no recipes is for, rather than showing it as empty', async () => {
    const markup = await markupFor('empress-zoia-euroburo')
    expect(markup).toContain('Nothing is authored for this box yet')
    expect(markup).toContain('clock and audio facts')
    // No coverage section at all: three rows of "0 of 12" say one thing three times.
    expect(markup).not.toContain('On its own')
  })

  it('lists every device on the index, before anything is typed', () => {
    const markup = renderToStaticMarkup(createElement(DeviceIndexPage))
    for (const device of DEVICES) {
      expect(markup).toContain(deviceLabel(device))
      expect(markup).toContain(`href="${deviceHref(device)}"`)
    }
    expect(markup).toContain(`${DEVICES.length} devices`)
  })

  it('passes no function across the client boundary', () => {
    // A render prop cannot be serialised from a server component to a client one, and `Browse`
    // takes one. So the boundary sits above the card: the pages are server components that
    // export metadata, and the only thing they hand `DeviceIndex` is nothing at all.
    const index = readFileSync(new URL('../app/devices/page.tsx', import.meta.url), 'utf8')
    const detail = readFileSync(new URL('../app/devices/[id]/page.tsx', import.meta.url), 'utf8')
    const island = readFileSync(
      new URL('../components/catalogue/device-index.tsx', import.meta.url),
      'utf8',
    )
    for (const source of [index, detail]) {
      expect(source).not.toContain("'use client'")
      expect(source).not.toContain('catalogue/browse')
      expect(source).not.toContain('card={')
    }
    expect(index).toContain('<DeviceIndex />')
    expect(island.startsWith("'use client'")).toBe(true)
  })
})

/**
 * §2.2/#86. **A pool either names every member or counts every member.**
 *
 * The rule is one field wide and easy to half-do, so it is checked across the library rather than
 * on the two devices that use it: a list shorter than the pool names some members and counts the
 * rest, which reads as two naming schemes on one box.
 */
describe('pool member labels, where a manifest gives them', () => {
  it('covers the whole pool, on every device that names any of it', () => {
    for (const d of DEVICES) {
      for (const voice of d.voices) {
        if (voice.kind !== 'pool' || voice.memberLabels === undefined) continue
        expect(voice.memberLabels, `${d.id}/${voice.id}`).toHaveLength(voice.count)
        expect(new Set(voice.memberLabels).size, `${d.id}/${voice.id} repeats a name`).toBe(
          voice.count,
        )
      }
    }
  })

  it('is rejected by the schema when it does not', () => {
    // The validator relates two fields, so it cannot live in the schema shape itself.
    const bad = DEVICES.find((d) => d.id === 'te-ep-133')
    expect(bad).toBeDefined()
    const broken = {
      ...bad,
      voices: bad!.voices.map((v) =>
        v.kind === 'pool' ? { ...v, memberLabels: ['A · .', 'A · 0'] } : v,
      ),
    }
    expect(DeviceSchema.safeParse(broken).success).toBe(false)
  })
})
