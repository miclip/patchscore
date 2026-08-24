/**
 * The canonical origin, in one place.
 *
 * `app/layout.tsx` sets `metadataBase` from it, `app/sitemap.ts` lists it and `app/robots.ts`
 * points at the sitemap under it. Those three must agree: a canonical tag naming a host the
 * sitemap does not list, or a sitemap under a host that 308s away, tells a crawler two different
 * things.
 *
 * The apex, not `www` — `www.patchscore.app` returns a 308 here.
 */
export const SITE_ORIGIN = 'https://patchscore.app'

/**
 * What the site is called and what it says about itself, in one place because two now need it:
 * `app/layout.tsx`'s defaults, and `lib/studio/entry.ts`, which suffixes the name onto a
 * per-guide title (#99) and falls back to this description where there is no guide to describe.
 */
export const SITE_NAME = 'Patchscore'

export const SITE_DESCRIPTION =
  'Your hardware, a musical direction, and a phased guide with real parameter values.'
