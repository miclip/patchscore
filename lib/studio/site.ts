/**
 * The canonical origin, still read from here by the three consumers that always did — and now
 * **defined** in `lib/core/guide.ts` (#487).
 *
 * It went down a layer because the Markdown guide links to device pages and `lib/core` imports
 * from `lib/studio` nowhere. Re-exported rather than moved outright so `app/layout.tsx`,
 * `app/sitemap.ts` and `app/robots.ts` keep reading the site's origin from the site module, which
 * is where somebody looks for it. One definition, two places to find it.
 *
 * From the defining module rather than through `@/lib/core`'s barrel: this is a re-export of one
 * named thing, and routing it through a barrel that re-exports the whole engine makes the site's
 * smallest module depend on all of it.
 */
export { SITE_ORIGIN } from '@/lib/core/guide'

/**
 * What the site is called and what it says about itself, in one place because two now need it:
 * `app/layout.tsx`'s defaults, and `lib/studio/entry.ts`, which suffixes the name onto a
 * per-guide title (#99) and falls back to this description where there is no guide to describe.
 */
export const SITE_NAME = 'Patchscore'

export const SITE_DESCRIPTION =
  'Your hardware, a musical direction, and a phased guide with real parameter values.'
