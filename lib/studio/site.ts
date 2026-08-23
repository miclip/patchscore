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
