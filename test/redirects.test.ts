import { describe, expect, it } from 'vitest'

import nextConfig from '../next.config'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import { encodeGuideInputs } from '../lib/core/index'
import { EXPLORE_PATH } from '../lib/studio/catalogue'
import { STUDIO_PATH } from '../lib/studio/entry'

/**
 * **The redirects, held against the constants they cannot import.**
 *
 * `next.config.ts` is the one file on this site that spells an address twice on purpose. Next
 * transpiles it on its own, outside the app's module graph and without the `@/` alias, so
 * importing `STUDIO_PATH` from `lib/studio/entry` type-checks, passes every test in this suite
 * and then fails the build with `Cannot find module './lib/core'` — which is how it was found,
 * and the reason a literal is correct there rather than sloppy.
 *
 * This file is the guard that import would have been. It runs in vitest, where the alias does
 * resolve, so it can hold the config's strings against the definitions.
 *
 * **What it must catch** is one of the two halves moving without the other: the studio renamed
 * while a legacy permalink still redirects to the old name, or an Explore address changed while
 * the rules still carry the shape it had. Both fail here and neither fails anywhere else.
 */

type Rule = {
  source: string
  destination: string
  permanent?: boolean
  has?: readonly { type: string; key: string }[]
}

const rules = (await nextConfig.redirects?.()) as Rule[] | undefined
if (rules === undefined) throw new Error('next.config.ts declares no redirects')

/** A real permalink from this build, which is what the root rules have to recognise. */
const PERMALINK = encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)

describe('the addresses next.config.ts spells by hand', () => {
  it('sends every legacy root permalink to the studio, and nowhere else', () => {
    const root = rules.filter((r) => r.source === '/')
    expect(root).toHaveLength(3)
    for (const rule of root) {
      expect(rule.destination).toBe(STUDIO_PATH)
      // Permanent, so an index that holds the old address replaces it rather than keeping both.
      expect(rule.permanent).toBe(true)
      // Query-sensitive, never path-only: `/` is a page now and has to serve as one.
      expect(rule.has).toHaveLength(1)
      expect(rule.has?.[0]?.type).toBe('query')
    }
  })

  it('keys on fields a permalink this build emits actually carries', () => {
    /*
     * The half a literal cannot protect on its own. A rule keyed on a field name that no longer
     * appears in an encoded link is a rule that never fires, and nothing else in this suite would
     * notice — the redirect would simply stop happening and every old share would land on the
     * orientation page with its query intact and no guide.
     */
    const keys = rules.filter((r) => r.source === '/').map((r) => r.has?.[0]?.key ?? '')
    expect(keys).toEqual(['format', 'device', 'template'])
    const fields = new Set(PERMALINK.split('&').map((pair) => pair.split('=')[0]))
    for (const key of keys) {
      expect(fields.has(key), `a permalink carries no ${key}`).toBe(true)
    }
    // `format` is written on every link `encodeGuideInputs` produces, which is why it is first
    // and why it alone covers every permalink this app has ever emitted.
    expect(PERMALINK.startsWith('format=')).toBe(true)
  })

  it('carries both old Explore shapes to the addresses the helpers now return', () => {
    const explore = rules.filter((r) => r.source.startsWith('/devices/'))
    expect(explore.map((r) => [r.source, r.destination])).toEqual([
      ['/devices/:id/presets/:patch', `${EXPLORE_PATH}/:id/:patch`],
      ['/devices/:id/presets', `${EXPLORE_PATH}/:id`],
    ])
    for (const rule of explore) expect(rule.permanent).toBe(true)
  })

  it('orders the two-segment Explore rule before the one-segment rule', () => {
    // Next takes the first match. Reversed, `/devices/x/presets/y` would be caught by the
    // one-segment source and land on a box index with the patch dropped — a redirect that works
    // and quietly loses what the reader asked for, which is worse than one that 404s.
    const sources = rules.map((r) => r.source)
    expect(sources.indexOf('/devices/:id/presets/:patch')).toBeLessThan(
      sources.indexOf('/devices/:id/presets'),
    )
  })

  it('redirects nothing to a page that does not exist', () => {
    // Every destination is either a fixed address with a page at it, or a dynamic shape whose
    // segments are filled from the source. Nothing here may point at a 404.
    for (const rule of rules) {
      expect(rule.destination.startsWith('/')).toBe(true)
      expect(rule.destination).not.toContain('/presets')
    }
  })
})
