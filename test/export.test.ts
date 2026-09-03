import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import {
  downloadGuideMarkdown,
  guideFilename,
  guideMarkdown,
  printGuide,
} from '../lib/studio/export'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import type { DownloadFile, StudioEnv } from '../lib/studio/session'
import { DEVICES } from '../lib/devices/registry.generated'
import { templateById } from '../lib/templates/index'

/**
 * #12's export half.
 *
 * The Markdown assertion is the load-bearing one and it is deliberately blunt: the downloaded
 * bytes must **be** `renderGuide(result)`, not merely resemble it. A download that diverged would
 * be a third renderer with no golden file behind it, and §8's whole design is that there are
 * exactly two siblings reading one `ResolveResult`.
 *
 * The print assertions are about restraint: the button opens the browser's dialog and does
 * nothing else. No PDF library, no clone of the document, no write anywhere.
 */

const REPO_ROOT = join(import.meta.dirname, '..')

/**
 * The whole catalogue resolved, which is a couple of seconds of search and is asked for eleven
 * times in this file. Resolved **once**: every caller passes the same constants — `DEVICES`,
 * `DEFAULT_INPUTS`, the registry's template — so invariant 6 says every call returns the same
 * guide, and computing it eleven times only spends the time again.
 *
 * Shared safely because export reads a `ResolveResult` and never writes one: `guideMarkdown`,
 * `guideFilename` and `downloadGuideMarkdown` all take it as input. Nothing here asserts less
 * for it — the same object reaches the same assertions.
 */
let resolved: ResolveResult | undefined

function fullRig(): ResolveResult {
  if (resolved !== undefined) return resolved
  const template = templateById(DEFAULT_INPUTS.templateId)
  if (template === undefined) throw new Error('no template in the registry')
  resolved = resolve({
    devices: DEVICES,
    template,
    mood: DEFAULT_INPUTS.mood,
    seed: DEFAULT_INPUTS.seed,
  })
  return resolved
}

/** Only the two members export touches; the rest throw if anything reaches for them. */
function exportEnv(overrides: Partial<StudioEnv> = {}) {
  const saved: DownloadFile[] = []
  let printed = 0
  const env: StudioEnv = {
    storage: () => {
      throw new Error('export must not touch storage')
    },
    location: () => {
      throw new Error('export must not touch location')
    },
    history: () => {
      throw new Error('export must not touch history')
    },
    clipboard: () => {
      throw new Error('export must not touch the clipboard')
    },
    download: () => (file) => {
      saved.push(file)
    },
    print: () => () => {
      printed++
    },
    ...overrides,
  }
  return { env, saved, printed: () => printed }
}

// ---------------------------------------------------------------------------

describe('the Markdown is the Markdown', () => {
  it('is byte-identical to renderGuide', () => {
    const result = fullRig()
    expect(guideMarkdown(result)).toBe(renderGuide(result))
  })

  it('downloads exactly those bytes, with nothing added', () => {
    const result = fullRig()
    const { env, saved } = exportEnv()

    const outcome = downloadGuideMarkdown(env, result, DEFAULT_INPUTS.seed)
    expect(outcome.ok).toBe(true)
    expect(saved.length).toBe(1)
    // Not `toContain`, not a prefix check. The whole file, exactly.
    expect(saved[0]?.text).toBe(renderGuide(result))
  })

  it('says it is Markdown, so a browser saves it rather than displaying it', () => {
    const { env, saved } = exportEnv()
    downloadGuideMarkdown(env, fullRig(), 1)
    expect(saved[0]?.type).toBe('text/markdown;charset=utf-8')
  })

  it('names the file stably: same guide, same name, twice', () => {
    const result = fullRig()
    const first = guideFilename(result, 42)
    const second = guideFilename(result, 42)
    expect(first).toBe(second)
    expect(first).toBe(`patchscore-${result.template.id}-42.md`)
  })

  it('gives different seeds different names, so one does not overwrite the other', () => {
    const result = fullRig()
    expect(guideFilename(result, 1)).not.toBe(guideFilename(result, 2))
  })

  it('produces a filename every filesystem accepts', () => {
    // Letters, digits, hyphens and one dot. No spaces, no colons, no slashes, no timestamp.
    expect(guideFilename(fullRig(), 999)).toMatch(/^[A-Za-z0-9-]+\.md$/)
  })
})

describe('export failure is honest', () => {
  it('reports a browser that offers no way to save', () => {
    const { env } = exportEnv({ download: () => undefined })
    const outcome = downloadGuideMarkdown(env, fullRig(), 1)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.message.length).toBeGreaterThan(0)
  })

  it('reports a save that throws rather than claiming success', () => {
    const { env } = exportEnv({
      download: () => () => {
        throw new Error('blocked')
      },
    })
    const outcome = downloadGuideMarkdown(env, fullRig(), 1)
    expect(outcome.ok).toBe(false)
  })

  it('reports a download accessor that throws on access', () => {
    const { env } = exportEnv({
      download: () => {
        throw new DOMException('insecure', 'SecurityError')
      },
    })
    expect(downloadGuideMarkdown(env, fullRig(), 1).ok).toBe(false)
  })

  it('never throws, whatever the browser does', () => {
    for (const download of [
      () => undefined,
      () => null,
      () => {
        throw new Error('no')
      },
    ] as Array<StudioEnv['download']>) {
      const { env } = exportEnv({ download })
      expect(() => downloadGuideMarkdown(env, fullRig(), 1)).not.toThrow()
    }
  })
})

describe('printing opens the dialog and does nothing else', () => {
  it('calls print exactly once', () => {
    const open = vi.fn()
    const { env } = exportEnv({ print: () => open })
    expect(printGuide(env).ok).toBe(true)
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith()
  })

  it('saves nothing, stores nothing, navigates nowhere', () => {
    // Every other member of the env throws if touched, so this passing *is* the assertion:
    // printing is the browser's dialog and not a pipeline of our own.
    const { env, saved, printed } = exportEnv()
    expect(printGuide(env).ok).toBe(true)
    expect(saved).toEqual([])
    expect(printed()).toBe(1)
  })

  it('reports a browser that will not open the dialog', () => {
    const { env } = exportEnv({ print: () => undefined })
    const outcome = printGuide(env)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.message.length).toBeGreaterThan(0)
  })

  it('reports a print call that throws', () => {
    const { env } = exportEnv({
      print: () => () => {
        throw new Error('blocked')
      },
    })
    expect(printGuide(env).ok).toBe(false)
  })

  it('adds no PDF dependency', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]
    // §8.2: "a real PDF pipeline is disproportionate work for v1". The browser has one.
    for (const banned of ['jspdf', 'pdfkit', 'puppeteer', 'playwright', 'html2pdf.js', 'pdf-lib']) {
      expect(names, `${banned} would be a PDF pipeline we decided not to build`).not.toContain(
        banned,
      )
    }
  })
})

// ---------------------------------------------------------------------------

/**
 * The print stylesheet, asserted as rules rather than as pixels. A screenshot would prove one
 * page on one machine; this proves the rules a printed page depends on are actually present, and
 * fails loudly if a later restyle drops one — which is exactly how a print stylesheet rots,
 * because nobody prints during development.
 */
describe('the print stylesheet', () => {
  const css = readFileSync(join(REPO_ROOT, 'app', 'globals.css'), 'utf8')

  function printBlock(): string {
    const start = css.indexOf('@media print')
    expect(start, '@media print is missing entirely').toBeGreaterThan(-1)
    // Balanced-brace scan: the block contains a nested `@page` rule, so a naive search for the
    // next `}` would stop inside it and quietly test a fragment.
    let depth = 0
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') {
        depth--
        if (depth === 0) return css.slice(start, i + 1)
      }
    }
    throw new Error('@media print block is unbalanced')
  }

  const block = printBlock()

  it('hides every piece of chrome', () => {
    for (const selector of [
      '.masthead',
      '.masthead-actions',
      '.notices',
      '.rack-section',
      '.panel:not(.guide-panel)',
      '.guide-actions',
      // The toggle itself: a checkbox printed onto paper is a control nobody can operate.
      '.hints-toggle',
      // §7.5/#340 phase 2, and the same test: a button on paper does nothing. What it would have
      // said about a refused placement is in the guide's own list, which prints.
      '.placement',
    ]) {
      expect(block, `${selector} is not hidden in print`).toContain(selector)
    }
    expect(block).toContain('display: none !important')
  })

  it('keeps the guide panel', () => {
    expect(block).toContain('.guide-panel')
  })

  it('forces hints visible whatever the on-screen toggle says', () => {
    expect(block).toMatch(/\.hint\s*\{[^}]*visibility:\s*visible\s*!important/)
  })

  it('prints on paper, not on the dark screen palette', () => {
    expect(block).toMatch(/background:\s*#fff/)
    expect(block).toMatch(/color:\s*#000/)
  })

  it('removes scrolling and clipping', () => {
    expect(block).toContain('.table-scroll')
    expect(block).toContain('overflow: visible !important')
    expect(block).toContain('max-height: none !important')
  })

  it('avoids a break straight after a heading', () => {
    expect(block).toMatch(/break-after:\s*avoid-page/)
    expect(block).toMatch(/page-break-after:\s*avoid/)
    for (const selector of ['h3', '.part-head', '.recipe-title', '.block-head']) {
      expect(block, `${selector} may be orphaned from its content`).toContain(selector)
    }
  })

  it('avoids breaking inside an instruction, a recipe, or a parameter list', () => {
    expect(block).toMatch(/break-inside:\s*avoid-page/)
    expect(block).toMatch(/page-break-inside:\s*avoid/)
    for (const selector of ['.params', '.instruction', '.recipe', '.step-grid', '.step-row']) {
      expect(block, `${selector} may be split across a page break`).toContain(selector)
    }
    // And the deliberate exclusion: a whole `.part` is near page-length, so forbidding a break
    // inside one made every part start a fresh sheet. Asserted so it is not "fixed" back.
    expect(block).toMatch(/\.part,\s*\.block\s*\{\s*break-inside:\s*auto/)
  })

  it('keeps tables readable without the screen’s background trick', () => {
    expect(block).toMatch(/border-collapse:\s*collapse/)
    expect(block).toMatch(/thead\s*\{[^}]*display:\s*table-header-group/)
  })

  it('sets a page margin', () => {
    expect(block).toMatch(/@page\s*\{[^}]*margin/)
  })
})
