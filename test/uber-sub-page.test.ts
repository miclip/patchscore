import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { referenceSlug, resolveRiff, transposableKeys } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS } from '../lib/riffs'
import { uberSubDisplacedFifthRiff as riff } from '../lib/riffs/uber-sub-displaced-fifth-riff'
import { renderRiff } from '../lib/studio/riff-markdown'
import { RiffFigureView } from '../components/riff/riff-in-key'
import PresetFigureRoute from '../app/explore/[id]/[patch]/page'

/**
 * §5A.9. **The UBER_SUB figure with its pad, on the page and in the export.** Both surfaces print
 * the pad's heading, its `pad / soft` lead, its technique and four note rows labelled with the
 * host's chords, and the rows are the same facts on both. One key control moves both hooks.
 */

const companion = riff.companion
if (companion === undefined) throw new Error('the UBER_SUB entry has no companion')

const text = (markup: string): string =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

async function pageFor(id: string, patch: string): Promise<string> {
  return renderToStaticMarkup(
    await PresetFigureRoute({ params: Promise.resolve({ id, patch: referenceSlug(patch) }) }),
  )
}

const shipping = DEVICES.filter((d) => d.factoryPatches?.some((p) => p.name === 'UBER_SUB'))
const PAGE = await pageFor(shipping[0]?.id ?? '', 'UBER_SUB')
const MD = renderRiff(resolveRiff(riff, []))

/** The opening tags of `.riff-body`'s direct children, in source order. */
function bodyChildren(markup: string): string[] {
  const open = '<div class="riff-body">'
  const start = markup.indexOf(open)
  expect(start, 'no .riff-body').toBeGreaterThan(-1)
  const kids: string[] = []
  let depth = 0
  for (const m of markup.slice(start + open.length).matchAll(/<(\/?)(div|section)\b([^>]*)>/g)) {
    if (m[1] === '') {
      if (depth === 0) kids.push(`${m[2] as string}${m[3] as string}`)
      depth += 1
    } else {
      if (depth === 0) break
      depth -= 1
    }
  }
  return kids
}

/** The markup of the section whose heading is `heading`. */
function sectionHeaded(markup: string, heading: string): string {
  const at = markup.indexOf(`<h2>${heading}</h2>`)
  expect(at, `no section headed ${heading}`).toBeGreaterThan(-1)
  return markup.slice(at, markup.indexOf('</section>', at))
}

/** Every note row in a slice of page markup, as text. */
function pageRows(markup: string): string[] {
  return [...markup.matchAll(/<li class="riff-note">(.*?)<\/li>/g)].map((m) => text(m[1] as string))
}

/** Every note row under a Markdown heading, backticks and bullet dropped. */
function markdownRows(md: string, heading: string): string[] {
  const at = md.indexOf(`## ${heading}\n`)
  expect(at, `no ## ${heading}`).toBeGreaterThan(-1)
  const end = md.indexOf('\n## ', at + 1)
  return md
    .slice(at, end === -1 ? undefined : end)
    .split('\n')
    .filter((line) => line.startsWith('- steps') || line.startsWith('- step '))
    .map((line) => line.slice(2).replace(/`/g, ''))
}

const PAD_ROWS = [
  'steps 1–16 · over i Fm · Eb4 F4 Ab4 · degrees 7 1 3 · MIDI 63 65 68',
  'steps 17–32 · over VII Eb · C4 Eb4 G4 · degrees 5 7 2 · MIDI 60 63 67',
  'steps 33–48 · over VI Db · C4 Eb4 F4 · degrees 5 7 1 · MIDI 60 63 65',
  'steps 49–64 · over v Cm · C4 Eb4 F4 · degrees 5 7 1 · MIDI 60 63 65',
]

describe('the UBER_SUB page with its pad (§5A.9)', () => {
  it('ships on exactly one box, which is the page', () => {
    expect(shipping).toHaveLength(1)
  })

  it('gives `.riff-body` four children: technique, material, pad technique, pad material', () => {
    expect(bodyChildren(PAGE)).toEqual([
      'section class="panel riff-panel riff-technique"',
      'div class="columns"',
      'section class="panel riff-panel riff-technique"',
      'div class="columns"',
    ])
    const at = (s: string) => PAGE.indexOf(s)
    expect(at('<h2>The technique</h2>')).toBeLessThan(at('<h2>The notes</h2>'))
    expect(at('<h2>The notes</h2>')).toBeLessThan(at('<h2>The pad part</h2>'))
    expect(at('<h2>The pad part</h2>')).toBeLessThan(at('<h2>The pad notes</h2>'))
  })

  it('heads the pad with its own part, its `pad · soft` lead and its technique', () => {
    const panel = sectionHeaded(PAGE, 'The pad part')
    expect(panel).toContain('<p class="mono riff-part-lead">pad · soft</p>')
    for (const paragraph of companion.technique) expect(text(panel)).toContain(text(paragraph))
  })

  it('prints all four pad rows with the host’s chord degree and name', () => {
    expect(pageRows(sectionHeaded(PAGE, 'The pad notes'))).toEqual(PAD_ROWS)
  })

  it('follows the fixed box block with a picker for the pad that leaves the page’s box out', () => {
    const box = shipping[0]
    if (box === undefined) throw new Error('no box')
    const at = (s: string) => PAGE.indexOf(s)
    expect(at('Settings for this voice')).toBeLessThan(at('<h2>Your boxes</h2>'))
    expect(at('<h2>Your boxes</h2>')).toBeLessThan(at('<h2>Where the pad plays</h2>'))
    expect(PAGE).toContain('is already playing the sub, so it is not offered here.')
    expect(PAGE).not.toContain(`-${box.id}-sub"`)
    // Server-rendered with no rig, so the pad block opens on the one thing to do.
    expect(text(PAGE.slice(at('<h2>Where the pad plays</h2>')))).toContain('Pick the boxes you own.')
  })

  it('carries one key control and one chord table, for both parts', () => {
    // The key control's select; the companion's rig picker has a kind filter, which is not one.
    expect(PAGE.match(/<select [^>]*class="song-select mono"/g)).toHaveLength(1)
    expect(PAGE.match(/<h2>The chords<\/h2>/g)).toHaveLength(1)
    expect(PAGE.match(/class="chord-table"/g)).toHaveLength(1)
  })
})

describe('the UBER_SUB export with its pad (§5A.9)', () => {
  it('adds the pad part after the grid and before where either part plays', () => {
    const at = (s: string) => MD.indexOf(s)
    expect(at('## The grid')).toBeLessThan(at('## The pad part'))
    expect(at('## The pad part')).toBeLessThan(at('## The pad notes'))
    expect(at('## The pad notes')).toBeLessThan(at('## Where the sub plays'))
    expect(MD).toContain('## The pad part\n\n`pad` · `soft`\n\n')
    for (const paragraph of companion.technique) expect(MD).toContain(`${paragraph}\n`)
    expect(MD.match(/## The chords/g)).toHaveLength(1)
  })

  it('prints the four pad rows, the same facts as the page', () => {
    expect(markdownRows(MD, 'The pad notes')).toEqual(PAD_ROWS)
    expect(markdownRows(MD, 'The pad notes')).toEqual(pageRows(sectionHeaded(PAGE, 'The pad notes')))
    // And the host's rows agree between the two surfaces as they always have.
    expect(markdownRows(MD, 'The notes')).toEqual(pageRows(sectionHeaded(PAGE, 'The notes')))
  })
})

describe('one key control respells both hooks (§5A.9/#570)', () => {
  const view = (shownKey: string) =>
    renderToStaticMarkup(
      createElement(RiffFigureView, {
        riff,
        resolution: resolveRiff(riff, []),
        shownKey,
        id: 'k',
        onChange: () => undefined,
        rules: null,
        grid: null,
        companionTechnique: createElement('section', { className: 'pad-technique-stub' }),
      }),
    )

  it('moves the host, the pad and the chords together, a whole tone up in G minor', () => {
    expect(transposableKeys(riff.key)).toContain('G minor')
    const markup = view('G minor')
    expect(markup.match(/<select /g)).toHaveLength(1)
    const host = pageRows(sectionHeaded(markup, 'The notes'))
    const pad = pageRows(sectionHeaded(markup, 'The pad notes'))
    expect(host[0]).toMatch(/^steps 1–3 · over i Gm · G2 ·/)
    expect(pad).toEqual([
      'steps 1–16 · over i Gm · F4 G4 Bb4 · degrees 7 1 3 · MIDI 65 67 70',
      'steps 17–32 · over VII F · D4 F4 A4 · degrees 5 7 2 · MIDI 62 65 69',
      'steps 33–48 · over VI Eb · D4 F4 G4 · degrees 5 7 1 · MIDI 62 65 67',
      'steps 49–64 · over v Dm · D4 F4 G4 · degrees 5 7 1 · MIDI 62 65 67',
    ])
  })

  it('at the authored key is the page’s own rows', () => {
    expect(pageRows(sectionHeaded(view(riff.key), 'The pad notes'))).toEqual(PAD_ROWS)
  })
})

describe('a riff with no companion carries none of this', () => {
  it('prints no part heading or part lead on any other entry’s export', () => {
    for (const other of RIFFS.filter((r) => r.companion === undefined)) {
      const md = renderRiff(resolveRiff(other, []))
      expect(md, other.id).not.toMatch(/^## The \S+ (part|notes)$/m)
    }
  })
})
