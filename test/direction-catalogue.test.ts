import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { NEUTRAL_MOOD, resolve, sectionsFor } from '../lib/core/index'
import type { Template } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { templateHref } from '../lib/studio/catalogue'
import { COVERAGE_SEED, coverage } from '../lib/studio/coverage'
import {
  directionPage,
  requestLines,
  rigFits,
  templateDescription,
  templateTitle,
  totalBars,
} from '../lib/studio/direction-page'
import { directionFit } from '../lib/studio/device-page'
import DirectionIndexPage from '../app/directions/page'
import DirectionPageRoute, {
  generateMetadata,
  generateStaticParams,
} from '../app/directions/[id]/page'
import sitemap from '../app/sitemap'

/**
 * #84. The direction catalogue: `/directions` and one page per template.
 *
 * The two halves are one table read from two sides — a device page lists directions, a direction
 * page lists devices — so the sharpest claim here is that they agree. The rest is that everything
 * a template authors reaches the markup a crawler is handed, including the parts of a request a
 * reader has to derive: which sections it occupies, and how many notes it wants.
 */

const TECHNO = TEMPLATES.find((t) => t.id === 'industrial-techno') as Template

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await DirectionPageRoute({ params: Promise.resolve({ id }) }))
}

// ---------------------------------------------------------------------------
// Derived from the template
// ---------------------------------------------------------------------------

describe('what the page says about a direction', () => {
  it('states every request, in authored order, with what a reader would have to derive', () => {
    const lines = requestLines(TECHNO)
    expect(lines.map((l) => l.id)).toEqual(TECHNO.roles.map((r) => r.id))

    for (const request of TECHNO.roles) {
      const line = lines.find((l) => l.id === request.id)
      expect(line, request.id).toBeDefined()
      if (line === undefined) continue
      expect(line.role).toBe(request.role)
      expect(line.character).toBe(request.character)
      expect(line.priority).toBe(request.priority)
      // Absent means false and absent means one, said out loud rather than left blank: a blank
      // cell reads as unknown.
      expect(line.optional).toBe(request.optional === true)
      expect(line.notes).toBe(request.polyphony ?? 1)
      expect(line.distinct).toBe(request.distinct === true)
      // §4.2: continuous occupies every section, transient only the ones it lists.
      expect(line.sections).toEqual(sectionsFor(request, TECHNO))
      if (request.sustain === 'continuous') {
        expect(line.sections).toEqual(TECHNO.structure.map((s) => s.name))
      }
    }
    // At least one of each, or the claim above is untested on this library.
    expect(lines.some((l) => l.sustain === 'transient')).toBe(true)
    expect(lines.some((l) => l.optional)).toBe(true)
  })

  it('counts its own bars rather than restating a number', () => {
    for (const template of TEMPLATES) {
      expect(totalBars(template)).toBe(
        template.structure.reduce((sum, section) => sum + section.bars, 0),
      )
    }
  })

  it('describes itself in one sentence a search result can hold', () => {
    for (const template of TEMPLATES) {
      const page = directionPage(template)
      expect(page.title).toBe(templateTitle(template))
      expect(page.title).toContain(template.name)
      expect(page.description).toBe(templateDescription(template))
      expect(page.description.length).toBeLessThan(160)
      expect(page.description).toContain(`${template.bpm.min}`)
      expect(page.description).toContain(`${template.bpm.max}`)
    }
  })
})

// ---------------------------------------------------------------------------
// The two halves of the catalogue agree
// ---------------------------------------------------------------------------

describe('coverage', () => {
  it('is the same number whichever page asks for it', () => {
    // A device page listing directions and a direction page listing devices are two views of one
    // table. Two implementations would eventually disagree in public.
    for (const template of TEMPLATES) {
      const fits = rigFits(template)
      for (const device of DEVICES) {
        const fromDirection = fits.find((f) => f.deviceId === device.id)
        const fromDevice = directionFit(device, template)
        expect(fromDirection, `${device.id}/${template.id}`).toBeDefined()
        expect(fromDirection?.covered).toBe(fromDevice.covered)
        expect(fromDirection?.requiredCovered).toBe(fromDevice.requiredCovered)
        expect(fromDirection?.roles).toEqual(fromDevice.roles)
      }
    }
  })

  it('is a real resolve at a fixed seed, not a role-name match', () => {
    const device = DEVICES.find((d) => d.id === 'roland-tr-1000')
    expect(device).toBeDefined()
    if (device === undefined) return
    const cover = coverage(device, TECHNO)
    const result = resolve({
      devices: [device],
      template: TECHNO,
      mood: NEUTRAL_MOOD,
      seed: COVERAGE_SEED,
    })
    expect(cover.covered).toBe(result.assignments.length)
    // A drum machine declares no pad and no lead, so a name match would still have to explain
    // why it does not carry them. This is the resolver's own answer.
    expect(cover.covered).toBeLessThan(cover.requests)
    expect(coverage(device, TECHNO)).toEqual(cover)
  })

  it('lists every device in registry order, zero coverage included', () => {
    const fits = rigFits(TECHNO)
    expect(fits.map((f) => f.deviceId)).toEqual(DEVICES.map((d) => d.id))
    // A box that covers nothing is a fact about that box. Dropping it would make this a list of
    // boxes that work.
    const zero = fits.filter((f) => f.covered === 0)
    expect(zero.length).toBeGreaterThan(0)
    expect(fits).toHaveLength(DEVICES.length)
  })
})

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

describe('the direction routes', () => {
  it('prerenders one page per template, and nothing else', () => {
    expect(generateStaticParams()).toEqual(TEMPLATES.map((t) => ({ id: t.id })))
  })

  it('carries its own title, description and canonical', async () => {
    for (const template of TEMPLATES) {
      const meta = await generateMetadata({ params: Promise.resolve({ id: template.id }) })
      const page = directionPage(template)
      expect(meta.title).toBe(page.title)
      expect(meta.description).toBe(page.description)
      expect(meta.alternates?.canonical).toBe(templateHref(template))
      expect(sitemap().map((e) => e.url)).toContain(`https://patchscore.app${page.href}`)
    }
    expect(await generateMetadata({ params: Promise.resolve({ id: 'gabber' }) })).toEqual({})
  })

  it('puts the structure, the degrees and every request in the markup', async () => {
    const markup = await markupFor('industrial-techno')
    const page = directionPage(TECHNO)

    for (const section of TECHNO.structure) expect(markup).toContain(section.name)
    // Degrees, not notes: the key is chosen per guide, so the page shows what is authored.
    for (const step of TECHNO.harmony.progression) expect(markup).toContain(step.degree)
    for (const key of TECHNO.keys) expect(markup).toContain(key)
    expect(markup).toContain(`${TECHNO.bpm.min}`)
    expect(markup).toContain(`${TECHNO.bpm.max}`)
    expect(markup).toContain(`${page.totalBars} bars`)

    for (const request of page.requests) {
      expect(markup).toContain(request.role)
      expect(markup).toContain(request.character)
    }
    expect(markup).toContain('optional')
    expect(markup).toContain('required')
    expect(markup).toContain('every section')

    // Every device, linked, including the ones that carry nothing.
    for (const fit of page.rig) {
      expect(markup).toContain(`href="${fit.href}"`)
      expect(markup).toContain(fit.label)
    }
    expect(markup).toContain('nothing on its own')
  })

  it('uses the guide\'s own tables rather than a second copy of them', async () => {
    // The extraction is the claim: if these ever diverge, a genre reads one way in the catalogue
    // and another way in the guide it produces.
    const markup = await markupFor('industrial-techno')
    const source = readFileSync(
      new URL('../components/guide/phase-song.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain("from './song-tables'")
    expect(source).toContain('<ProgressionTable')
    expect(source).toContain('<SectionTable')
    // The meter is markup a copy would not reproduce by accident.
    expect(markup).toContain('meter-cell')
    expect(markup).toContain('aria-label="energy')
  })

  it('lists every direction on the index, before anything is typed', () => {
    const markup = renderToStaticMarkup(createElement(DirectionIndexPage))
    for (const template of TEMPLATES) {
      expect(markup).toContain(template.name)
      expect(markup).toContain(`href="${templateHref(template)}"`)
    }
    expect(markup).toContain(`${TEMPLATES.length} directions`)
    // No kind filter here: a `Template` has no kind (invariant 3), so the shell draws no select.
    expect(markup).not.toContain('All kinds')
  })

  it('passes no function across the client boundary', () => {
    const index = readFileSync(new URL('../app/directions/page.tsx', import.meta.url), 'utf8')
    const detail = readFileSync(
      new URL('../app/directions/[id]/page.tsx', import.meta.url),
      'utf8',
    )
    const island = readFileSync(
      new URL('../components/catalogue/direction-index.tsx', import.meta.url),
      'utf8',
    )
    for (const source of [index, detail]) {
      expect(source).not.toContain("'use client'")
      expect(source).not.toContain('catalogue/browse')
      expect(source).not.toContain('card={')
    }
    expect(index).toContain('<DirectionIndex />')
    expect(island.startsWith("'use client'")).toBe(true)
  })
})

describe('a description a search result will show (#84)', () => {
  /**
   * The meta description is the sentence a search result shows, which is most of why these pages
   * exist. It read "1 parts" for Drone Study from the day that direction landed: the body copy
   * was fixed when a one-part direction first became possible, and the metadata was not, because
   * the plural helper lived privately in the device page and this page had no copy of it.
   */
  it('never says "1 parts", on any direction', () => {
    for (const template of TEMPLATES) {
      const description = templateDescription(template)
      expect(description, template.id).not.toMatch(/\b1 (parts|keys|sections|bars)\b/)
    }
  })

  it('says "1 part" for a direction that asks for one', () => {
    const one = TEMPLATES.filter((t) => t.roles.length === 1)
    expect(one.length, 'no one-part direction to check').toBeGreaterThan(0)
    for (const template of one) {
      expect(templateDescription(template)).toContain('1 part with')
    }
  })
})
