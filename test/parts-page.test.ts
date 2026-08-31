import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ROLES } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import Page from '../app/parts/page'

/**
 * The parts page explains the vocabulary a guide uses. Its risk is not being wrong — the
 * descriptions are ours and cannot be — but going **stale**: a role added to the vocabulary and
 * never described, or described in a way that quietly contradicts the library.
 *
 * `PARTS` is keyed by `Role`, so a missing entry fails the build. These fixtures cover what the
 * type cannot see.
 */

const MARKUP = renderToStaticMarkup(createElement(Page))
const TEXT = MARKUP.replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;/g, "'")
  .replace(/&#x2019;/g, '’')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')

describe('every part in the vocabulary is on the page', () => {
  it('names all of them, and none that do not exist', () => {
    for (const role of ROLES) {
      expect(MARKUP, `${role} is in the vocabulary and not on the page`).toContain(
        `<h2 class="mono">${role}</h2>`,
      )
    }
    const shown = [...MARKUP.matchAll(/<h2 class="mono">([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(shown.length, 'the page shows a part that is not a role').toBe(ROLES.length)
  })

  it('says what each one is *and* what it does', () => {
    // The second is the half a definition leaves out, and the reason this page exists rather than
    // a list of one-line glosses.
    const terms = [...MARKUP.matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1])
    expect(terms.filter((t) => t === 'What it is')).toHaveLength(ROLES.length)
    expect(terms.filter((t) => t === 'What it does')).toHaveLength(ROLES.length)
  })
})

describe('the characters come from the library, not from the page', () => {
  it('lists exactly the characters the library can serve for a part', () => {
    const served = (role: string) => {
      const found = new Set<string>()
      for (const d of DEVICES) for (const r of d.recipes) if (r.role === role) found.add(r.character)
      return [...found].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    }
    // `pad` is the widest and `impact` the narrowest, which is the contrast worth showing: a part
    // with one character is a part that means one thing.
    expect(TEXT).toContain(served('pad').join(' · '))
    expect(TEXT).toContain(served('impact').join(' · '))
  })

  it('has a character for every role, so no part renders an empty row', () => {
    for (const role of ROLES) {
      const n = DEVICES.reduce(
        (sum, d) => sum + d.recipes.filter((r) => r.role === role).length,
        0,
      )
      expect(n, `${role} is described but nothing in the library serves it`).toBeGreaterThan(0)
    }
  })
})

describe('it stays an informational page', () => {
  it('points at its companion rather than repeating it', () => {
    // The drum-machines page says what an 808 kick sounds like; this one says what a riser does.
    expect(MARKUP).toContain('href="/drum-machines"')
  })

  it('does not argue with the reader or defend itself', () => {
    // The lesson from the drum-machines page: a paragraph about the page is not information about
    // the subject, and it belongs somewhere else or nowhere.
    for (const phrase of ['opinion', 'our own listening', 'is our source', 'we wrote']) {
      expect(TEXT.toLowerCase(), `the page defends itself with "${phrase}"`).not.toContain(phrase)
    }
  })
})
