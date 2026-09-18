import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DevicePageRoute from '../app/devices/[id]/page'
import PresetFigureRoute, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '../app/devices/[id]/presets/[patch]/page'
import PresetsRoute from '../app/devices/[id]/presets/page'
import RiffRoute from '../app/riffs/[id]/page'
import RiffIndexPage from '../app/riffs/page'
import sitemap from '../app/sitemap'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { RECORD_RIFFS, RIFFS } from '../lib/riffs'
import { presetFigureHref, presetsHref } from '../lib/studio/catalogue'
import type { PresetEntry, PresetFigure } from '../lib/studio/preset-session'
import { presetSession } from '../lib/studio/preset-session'
import { renderRiff } from '../lib/studio/riff-markdown'
import { RIFF_GRID_LEAD, riffSubstitution } from '../lib/studio/riff-text'
import { SITE_ORIGIN } from '../lib/studio/site'
import { gridOf } from './fixtures'

/**
 * §3.7/#598. **A preset figure page**, as the markup a reader receives: one figure, on the box
 * that ships the patch, with that box's settings and no rig picker.
 *
 * What is pinned: the route exists for exactly the twelve and 404s everywhere else, including
 * on the twelve's old `/riffs/` ids; every page carries the figure a riff page would (the
 * technique, the rules, the chords, the notes, the grid) and the block a riff page shows with
 * the Muse alone ticked, checked fact for fact against the Markdown renderer's reading of the
 * same resolution; nothing on it is rig machinery; nothing on it is about a recipe (#598); and
 * nothing on any of the affected surfaces links to or lists an address that 404s.
 */

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

const MUSE = byId('moog-muse')
const session = presetSession(MUSE)
if (session === undefined) throw new Error('the Muse has no preset session')

type Figured = { entry: PresetEntry; figure: PresetFigure }
const FIGURED: Figured[] = session.entries.flatMap((entry) =>
  entry.figure === undefined ? [] : [{ entry, figure: entry.figure }],
)

async function markupFor(id: string, patch: string): Promise<string> {
  return renderToStaticMarkup(await PresetFigureRoute({ params: Promise.resolve({ id, patch }) }))
}

/**
 * `test/riff-page.test.ts`' normaliser: tags to spaces, entities back, space collapsed.
 *
 * **`&amp;` is undone last, and the twenty-two copies of this helper that undo it first are
 * wrong** (`js/double-escaping`, #599). Unescaping the ampersand before the angle brackets turns
 * `&amp;lt;` into `&lt;` and then into `<`, so markup that correctly escaped a literal
 * `&lt;` comes out as a tag. No fixture reaches that today; the ordering costs nothing and the
 * rule is right.
 */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim()
}

/**
 * `test/riff-page.test.ts`' reading of the Markdown, restated: every substantive line with the
 * export's own ink stripped, minus the grid rows, the slot rows, the table rule and the two
 * block labels, for the reasons that file gives. Kept beside it rather than exported, because
 * the two surfaces are siblings and a shared normaliser would be the one place a relaxation
 * could reach both at once.
 */
const SLOT_ROW = /^- `([a-z-]+)` · (.+)$/
const TABLE_RULE = /^\|[\s:|-]+\|$/
const TABLE_ROW = /^\|(.+)\|$/

function markdownFacts(md: string): string[] {
  const fence = /^[ ]*\d+ [x·]/
  return md
    .split('\n')
    .filter(
      (line) =>
        line.trim() !== '' &&
        line !== '```' &&
        !fence.test(line) &&
        !SLOT_ROW.test(line) &&
        !TABLE_RULE.test(line.trim()),
    )
    .map((line) => {
      const row = TABLE_ROW.exec(line.trim())
      return row === null
        ? line
        : (row[1] as string)
            .split('|')
            .map((cell) => cell.trim())
            .join(' ')
    })
    .map((line) =>
      line
        .replace(/^#+ /, '')
        .replace(/^\s*- /, '')
        .replace(/↳ (note|hint|neutral): /g, '')
        .replace(/\*\*/g, '')
        .replace(/^● /, '')
        .replace(/`/g, '')
        .replace(/^\*(.*)\*$/, '$1')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:])/g, '$1')
        .trim(),
    )
    .filter((line) => line !== 'Patch' && line !== 'Settings')
}

/** Every page, rendered once. */
const PAGES = new Map<string, string>()
for (const { entry } of FIGURED) PAGES.set(entry.slug, await markupFor('moog-muse', entry.slug))

const MUSE_RUNNER = PAGES.get('muse-runner') as string

describe('the figure page exists exactly where a figure does, and nowhere it used to (#598)', () => {
  it('is prerendered for the twelve, under the Muse, in the folder’s order', () => {
    expect(dynamicParams).toBe(false)
    const params = generateStaticParams()
    // Three boxes carry a session since #624; the Muse's twelve are the ones this file renders.
    const museParams = params.filter((p) => p.id === 'moog-muse')
    expect(museParams).toEqual(FIGURED.map(({ entry }) => ({ id: 'moog-muse', patch: entry.slug })))
    expect(museParams).toHaveLength(12)
    // Thirty-six since #645: the Subsequent 37's DRONE keeps a use and has no figure page
    // (#643), and its Harp C Chord gained one.
    expect(params).toHaveLength(36)
    // Every patch-named riff has a page here, under the box that ships its patch, and only those.
    const musePatches = new Set(byId('moog-muse').factoryPatches?.map((p) => p.name))
    const ids = new Set(FIGURED.map(({ figure }) => figure.riff.id))
    expect([...ids].sort()).toEqual(
      RIFFS.filter((r) => r.reference.kind === 'patch' && musePatches.has(r.reference.name))
        .map((r) => r.id)
        .sort(),
    )
    const figured = DEVICES.flatMap((d) =>
      (presetSession(d)?.entries ?? []).flatMap((e) => (e.figure === undefined ? [] : [e.figure.riff.id])),
    )
    expect(figured.sort()).toEqual(
      RIFFS.filter((r) => r.reference.kind === 'patch')
        .map((r) => r.id)
        .sort(),
    )
  })

  it('404s on a patch the Muse does not declare, on a box with no session, and on a riff id', async () => {
    for (const [id, patch] of [
      ['moog-muse', 'no-such-patch'],
      ['moog-muse', 'blue-monday'],
      // The twelve's old `/riffs/` ids are not addresses here either: the segment is the patch.
      ['moog-muse', 'muse-runner-floating-arrival-lead'],
      ['elektron-digitakt', 'muse-runner'],
      ['no-such-box', 'muse-runner'],
    ] as const) {
      await expect(markupFor(id, patch), `${id}/${patch}`).rejects.toThrow(/404/)
      expect(await generateMetadata({ params: Promise.resolve({ id, patch }) })).toEqual({})
    }
  })

  it('has one address, which the index, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    const params = new Set(
      generateStaticParams().map((p) => `${SITE_ORIGIN}/devices/${p.id}/presets/${p.patch}`),
    )
    for (const { entry, figure } of FIGURED) {
      const href = presetFigureHref(MUSE, entry.patch)
      expect(href).toBe(`/devices/moog-muse/presets/${entry.slug}`)
      expect(urls, entry.patch.name).toContain(`${SITE_ORIGIN}${href}`)
      const meta = await generateMetadata({
        params: Promise.resolve({ id: 'moog-muse', patch: entry.slug }),
      })
      expect(meta.alternates?.canonical, entry.patch.name).toBe(href)
      expect(meta.title, entry.patch.name).toBe(`${figure.riff.name} on the Moog Muse — Patchscore`)
    }
    // And the sitemap names nothing under `/presets/` this route would 404 on.
    for (const url of urls.filter((u) => /\/presets\/.+/.test(u))) {
      expect(params.has(url), url).toBe(true)
    }
    // Nor any `/riffs/` address for one of the twelve.
    for (const riff of RIFFS.filter((r) => r.reference.kind === 'patch')) {
      expect(urls, riff.id).not.toContain(`${SITE_ORIGIN}/riffs/${riff.id}`)
    }
  })

  it('describes what to do on the named box, never the boxes you own (§5A.5)', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ id: 'moog-muse', patch: 'muse-runner' }),
    })
    expect(meta.title).toBe('The Muse Runner floating-arrival lead on the Moog Muse — Patchscore')
    expect(meta.description).toBe(
      'Load Muse Runner on the Moog Muse and practise the technique against a figure written ' +
        'here, with the settings on that box.',
    )
    for (const { entry } of FIGURED) {
      const description = String(
        (await generateMetadata({ params: Promise.resolve({ id: 'moog-muse', patch: entry.slug }) }))
          .description,
      )
      expect(description).toMatch(/^Load /)
      expect(description).toContain('Moog Muse')
      expect(description).toContain('written here')
      expect(description).not.toContain('boxes you own')
    }
  })
})

describe('every page carries the figure and the Muse’s block for it', () => {
  it('prints every substantive line the Markdown prints for the Muse alone, on all twelve', () => {
    for (const { entry, figure } of FIGURED) {
      const page = text(PAGES.get(entry.slug) as string)
      const md = renderRiff(figure.resolution)
      const facts = markdownFacts(md)
      expect(facts.length, entry.patch.name).toBeGreaterThan(20)
      /*
       * Four lines are this page's stated differences from a riff page, and each is dropped
       * on purpose rather than asserted absent by accident:
       *  - `Where it plays` is the riff page's heading over the block; here it is the box's name.
       *  - The recipe's title, which on a page about a preset reads as a description of the
       *    patch and is not one (#598, operator decision).
       *  - §3.5's substitution sentence, which a riff page prints because the rig was the
       *    reader's choice; here the box is the address (#598, operator decision).
       *  - The affinity's `Factory patch — X` line and its second sentence: nothing on this
       *    surface says anything about a recipe reaching the patch (#598).
       */
      const substituted = riffSubstitution(figure.riff, figure.voice)
      const dropped = new Set([
        'Where it plays',
        figure.voice.recipe.title,
        'Load it and the settings below are already dialled. They build the same sound by hand.',
        ...(substituted === undefined ? [] : [substituted]),
      ])
      for (const fact of facts) {
        if (dropped.has(fact) || fact.startsWith('Factory patch — ')) continue
        expect(page, `${entry.patch.name}: ${fact}`).toContain(fact)
      }
    }
  })

  it('heads each page with the figure, the patch and its use, and links back to the index', () => {
    for (const { entry, figure } of FIGURED) {
      const markup = PAGES.get(entry.slug) as string
      const page = text(markup)
      expect(markup, entry.patch.name).toContain(`<h1>${figure.riff.name.replace(/'/g, '&#x27;')}</h1>`)
      expect(markup).toContain(
        `<span class="preset-name">${entry.patch.name.replace(/'/g, '&#x27;')}</span>`,
      )
      expect(page, entry.patch.name).toContain(entry.use)
      expect(markup).toContain(`href="${presetsHref(MUSE)}"`)
      expect(page).toContain('Every patch on the Moog Muse')
      // The riff page's lead line, unchanged in form: the part, the character, the tempo, the
      // key and the length.
      expect(page).toContain(
        `${figure.riff.request.role} · ${figure.riff.request.character} ·`,
      )
    }
  })

  it('draws the grid as boxes with the export’s rows under it, on all twelve (#528)', () => {
    for (const { entry, figure } of FIGURED) {
      const md = renderRiff(figure.resolution)
      const markup = PAGES.get(entry.slug) as string
      // A held figure has no grid, and neither surface draws one (§5A.2/#608).
      if (figure.riff.pattern === undefined) {
        expect(md, entry.patch.name).not.toContain('```')
        expect(markup, entry.patch.name).not.toContain('class="step-index"')
        continue
      }
      const rows = md.slice(md.indexOf('```') + 4, md.lastIndexOf('```')).trimEnd().split('\n')
      const drawn = [
        ...markup.matchAll(
          /<span class="step-index">(\d+)<\/span><span class="step-text">([^<]*)<\/span>/g,
        ),
      ]
      expect(drawn.map((row) => `${row[1] ?? ''}${row[2] ?? ''}`), entry.patch.name).toEqual(
        rows.map((row) => row.trimStart()),
      )
      const cells = markup.match(/class="step(?: on)?(?: beat)?"/g) ?? []
      expect(cells.length, entry.patch.name).toBe(gridOf(figure.riff).length)
    }
  })

  it('carries the Muse’s settings in the guide’s module boxes, headed for the box, cited once', () => {
    for (const { entry, figure } of FIGURED) {
      const markup = PAGES.get(entry.slug) as string
      const page = text(markup)
      expect(markup, entry.patch.name).toContain('class="module-box"')
      expect(markup, entry.patch.name).toContain('class="param-name"')
      expect(markup).toContain('<h2>On the Moog Muse</h2>')
      expect(page).toContain(`Muse · ${figure.voice.assignables[0]?.label ?? ''}`)
      expect((markup.match(/class="riff-cites"/g) ?? []).length, entry.patch.name).toBe(1)
      // Invariant 4 in ink: one sentence for the block and nothing beside a value.
      expect(markup).not.toContain('prov-mark')
      expect(markup).not.toContain('subordinate cite')
      expect(markup).not.toContain('· manual')
    }
  })

  /**
   * #598, operator decision. **Nothing about a recipe on any of the twelve**: no recipe title,
   * no `Factory patch —`, no *by hand*, no line arguing that the settings reach the patch. The
   * settings are on the page because a reader may want to see or tweak what the preset does,
   * and that claim needs no sentence. Asserted by every wording the line ever had and by every
   * recipe title on the box, on every page, so it cannot return in another coat.
   */
  it('prints no recipe title and no sentence about a recipe or the patch, on any of the twelve', () => {
    for (const { entry } of FIGURED) {
      const markup = PAGES.get(entry.slug) as string
      const page = text(markup)
      expect(markup, entry.patch.name).not.toContain('riff-recipe')
      expect(markup, entry.patch.name).not.toContain('preset-recipe')
      for (const phrase of [
        'Built by hand',
        'Factory patch',
        'the box ships',
        'arrives here already',
        'already dialled',
        'by hand',
        'Load it',
      ]) {
        expect(page, `${entry.patch.name}: ${phrase}`).not.toContain(phrase)
      }
      for (const r of MUSE.recipes) {
        expect(page, `${entry.patch.name}: ${r.id}`).not.toContain(r.title)
      }
    }
    // Not vacuous: five recipes on the box name one of these patches, and four of the twelve
    // figures land on the very recipe that names theirs — the strings figure since #608 put it
    // back on `pad`, where the box's soft pad is that patch. None of it reaches the page.
    expect(MUSE.recipes.filter((r) => r.factoryPatch !== undefined)).toHaveLength(5)
    const onOwn = FIGURED.filter(
      ({ entry, figure }) => figure.voice.recipe.factoryPatch?.name === entry.patch.name,
    )
    expect(onOwn.map(({ entry }) => entry.patch.name).sort()).toEqual([
      '3 Osc Bass Love',
      'Detroit Funk',
      'Moog 55 Strings',
      'Muse Runner',
    ])
  })

  /**
   * §5A.2/#603/#604/#623. The Bellbounce pattern and the Aegean Organ figure are eight bars
   * over a four-bar grid, and this surface draws the grid through the same component a riff
   * page does, so the sentence saying how many times it goes round has to reach here too. The
   * two pads are eight bars with no grid at all (#608), and the Muse Runner line is forty-eight
   * bars with none either, through-composed (#623), so those are in the second loop.
   * Pinned as strings rather than left to the parity test above, which would pass on both
   * surfaces omitting them.
   */
  it('says how many times the grid goes round under the figures longer than it', () => {
    const REPEATS: Record<string, string> = {
      bellbounce: 'The grid is 4 bars and the figure is 8: play it round 2 times.',
      'aegean-organ': 'The grid is 4 bars and the figure is 8: play it round 2 times.',
    }
    for (const [slug, REPEAT] of Object.entries(REPEATS)) {
      const page = text(PAGES.get(slug) as string)
      expect(page, slug).toContain(RIFF_GRID_LEAD)
      expect(page.split(REPEAT).length - 1, slug).toBe(1)
      expect(page.indexOf(REPEAT), slug).toBeGreaterThan(page.indexOf(RIFF_GRID_LEAD))
    }
    // The Muse Runner line has no grid to go round, and its chord table says instead that the
    // cycle goes round under the figure (#623).
    const musePage = text(MUSE_RUNNER)
    const CYCLE = 'The 12-bar cycle repeats 4 times under this 48-bar figure.'
    expect(musePage.split(CYCLE).length - 1).toBe(1)
    expect(musePage.indexOf(CYCLE)).toBeLessThan(musePage.indexOf('The figure is played over these chords'))
    // And on no other preset page: every other figure is as long as its grid, or has none.
    for (const { entry, figure } of FIGURED) {
      if (entry.slug in REPEATS) continue
      const page = text(PAGES.get(entry.slug) as string)
      expect(page, entry.patch.name).not.toContain('play it round')
      if (figure.riff.pattern === undefined) expect(page, entry.patch.name).not.toContain(RIFF_GRID_LEAD)
    }
  })
})

describe('what a preset figure page does not have', () => {
  /**
   * §5A.6 is inapplicable and so is everything it brought: no picker, no studio read, no
   * empty-rig offer, none of §7.3's gap sentences, no substitution sentence. The box is the
   * address (#598).
   */
  it('carries no rig picker, no gap, and no substitution sentence, on any of the twelve', () => {
    for (const { entry } of FIGURED) {
      const markup = PAGES.get(entry.slug) as string
      const page = text(markup)
      for (const marker of [
        'rig-picker',
        'type="checkbox"',
        'Your boxes',
        'Devices in your rig',
        'riff-rig',
        'riff-gap',
        'riff-substituted',
        'Where it plays',
      ]) {
        expect(markup, `${entry.patch.name}: ${marker}`).not.toContain(marker)
      }
      for (const sentence of [
        'Pick the boxes you own.',
        'Set this one up by ear.',
        'Add a box that plays',
        'nearest this box authors',
        'This figure needs',
      ]) {
        expect(page, `${entry.patch.name}: ${sentence}`).not.toContain(sentence)
      }
    }
  })

  /**
   * The route is a server component with two islands, and neither island is a rig: `RiffInKey`
   * is the riff page's key control, and `PresetVoice` is a boundary the build requires around
   * the settings block (`Value` reaches `createContext`), handed two strings and holding no
   * state. Nothing under the route imports the picker, the borrowed-rig helpers or the studio.
   */
  it('reaches neither the picker nor the studio from the route', () => {
    const server = [
      new URL('../app/devices/[id]/presets/[patch]/page.tsx', import.meta.url),
      new URL('../components/catalogue/preset-figure.tsx', import.meta.url),
    ]
    const island = new URL('../components/catalogue/preset-voice.tsx', import.meta.url)
    for (const file of [...server, island]) {
      const source = readFileSync(file, 'utf8')
      expect(source.startsWith("'use client'"), String(file)).toBe(file === island)
      for (const banned of [
        'riff-rig',
        'rig-picker',
        'loadStudio',
        'borrowed-rig',
        "studio/riff-page'",
        'useState',
        'useEffect',
      ]) {
        expect(source, `${String(file)}: ${banned}`).not.toContain(banned)
      }
    }
    // The island is handed the address and nothing heavier: no `Device`, no voicing.
    const source = readFileSync(island, 'utf8')
    expect(source).toContain('{ deviceId, patch }: { deviceId: string; patch: string }')
  })

  it('carries no song control, no arrangement language, no hedge and no backlog', () => {
    for (const { entry } of FIGURED) {
      const markup = PAGES.get(entry.slug) as string
      const page = text(markup)
      for (const marker of ['genre-picker', 'mood-panel', 'song-panel', 'seed-field', 'Copy link']) {
        expect(markup, marker).not.toContain(marker)
      }
      for (const word of ['Arrangement', 'Section', 'Phase', 'Density', 'Energy', 'Clock source']) {
        expect(page, `${entry.patch.name}: ${word}`).not.toContain(word)
      }
      // The page's own copy, not the box's: a device note may say *roughly 20 Hz to 3 kHz*
      // about a knob with no printed scale, so the hedge list is the riff page's minus that word.
      for (const phrase of [
        'official',
        'as heard on',
        'our best guess',
        'not a transcription',
        'not yet',
        'nobody has',
        'unauthored',
        'TODO',
        'coming soon',
        'backlog',
      ]) {
        expect(page.toLowerCase(), `${entry.patch.name}: ${phrase}`).not.toContain(phrase)
      }
      expect(page).not.toMatch(/\b224\b/)
      expect(page).not.toMatch(/twelve of|12 of/i)
    }
  })

  /**
   * The print rule is deny-by-default over `.panel` with a `:not()` per exempt class, evaluated
   * against the class lists the page renders, as `test/riff-page.test.ts` does. Every block here
   * is the figure or the settings, so every one of them is on the paper.
   */
  it('keeps every block on the printed sheet: there is no control to drop', () => {
    const print = CSS.slice(CSS.indexOf('@media print'))
    const deny = /\n\s*\.panel((?::not\(\.[a-z-]+\))+),/.exec(print)
    expect(deny).not.toBeNull()
    const exempt = [...(deny?.[1] ?? '').matchAll(/:not\(\.([a-z-]+)\)/g)].map((m) => m[1] as string)
    const hidden = (classes: string) => {
      const names = classes.split(/\s+/)
      return names.includes('panel') && !exempt.some((name) => names.includes(name))
    }
    const panels = [...MUSE_RUNNER.matchAll(/class="([^"]*\bpanel\b[^"]*)"/g)].map(
      (m) => m[1] as string,
    )
    expect(panels.length).toBeGreaterThan(3)
    for (const classes of panels) {
      expect(hidden(classes), `a block of the figure is dropped: class="${classes}"`).toBe(false)
    }
  })
})

/**
 * **Nothing links to or lists a 404.** Every internal href on every surface this move touched
 * — the twelve figure pages, the presets index, the Muse's device page, `/riffs` and the five
 * riff pages — is an address the sitemap lists, or one of the two routes that are deliberately
 * not in it. The sitemap's own entries are held against the routes' `generateStaticParams`
 * above and in `test/riff-page.test.ts`, so this closes the loop from the page side.
 */
describe('link integrity across the moved surfaces (#598)', () => {
  const NOT_IN_SITEMAP = new Set(['/preferences', '/parts'])

  it('every internal link on every affected surface is a page that exists', async () => {
    const known = new Set(sitemap().map((e) => e.url.slice(SITE_ORIGIN.length) || '/'))
    const surfaces: [string, string][] = [
      ...[...PAGES].map(([slug, markup]): [string, string] => [`/presets/${slug}`, markup]),
      [
        '/devices/moog-muse/presets',
        renderToStaticMarkup(await PresetsRoute({ params: Promise.resolve({ id: 'moog-muse' }) })),
      ],
      [
        '/devices/moog-muse',
        renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id: 'moog-muse' }) })),
      ],
      ['/riffs', renderToStaticMarkup(createElement(RiffIndexPage))],
    ]
    for (const riff of RECORD_RIFFS) {
      surfaces.push([
        `/riffs/${riff.id}`,
        renderToStaticMarkup(await RiffRoute({ params: Promise.resolve({ id: riff.id }) })),
      ])
    }
    let checked = 0
    for (const [name, markup] of surfaces) {
      for (const match of markup.matchAll(/href="([^"]+)"/g)) {
        const href = (match[1] as string).replace(/&amp;/g, '&')
        if (!href.startsWith('/')) continue
        checked += 1
        expect(known.has(href) || NOT_IN_SITEMAP.has(href), `${name} links to ${href}`).toBe(true)
        // And in particular never into the twelve's old addresses.
        expect(href, `${name} links to ${href}`).not.toMatch(
          /^\/riffs\/(?!acid-tracks-line$|an-ending-ascent-pad$|blade-runner-blues-lead$|blue-monday-bass$|i-feel-love-one-shape-arp$|inner-city-life-held-sub$|show-me-love-organ-stab$|strings-of-life-walking-entry-stab$|thriller-synth-riff$)/,
        )
      }
    }
    expect(checked).toBeGreaterThan(40)
  })
})

/**
 * §2.6/#629. **The figure page's patch line carries where the patch sat, beside the name and
 * under the figure's title.** The same `PatchName` the panel and the index render, so the three
 * surfaces cannot say the address differently; the `<h1>` is the figure's and carries none.
 */
describe('the figure page prints where the patch sat, beside the name and not in the title (#629)', () => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')

  for (const id of ['moog-muse', 'moog-subsequent-37']) {
    it(`${id}: every figure page`, async () => {
      const entries = (presetSession(byId(id))?.entries ?? []).filter((e) => e.figure !== undefined)
      expect(entries.length).toBeGreaterThan(0)
      for (const entry of entries) {
        const markup = await markupFor(id, entry.slug)
        const { name, slot } = entry.patch
        expect(slot, name).toBeDefined()
        expect(markup, name).toContain(
          `<p class="preset-figure-patch"><span class="preset-title">` +
            `<span class="preset-name">${esc(name)}</span>` +
            `<span class="preset-slot mono">${esc(slot ?? '')}</span></span>`,
        )
        // In no heading at all: the `<h1>` is the figure's, and the technique's and the
        // settings' headings under it are theirs.
        for (const h of markup.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g) ?? []) {
          expect(h, name).not.toContain('preset-slot')
          expect(h, name).not.toContain('preset-bank')
        }
        expect((markup.match(/preset-slot/g) ?? []).length, name).toBe(1)
      }
    })
  }
})
