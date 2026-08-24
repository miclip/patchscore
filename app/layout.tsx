import type { Metadata, Viewport } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/studio/site'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/site-nav'
import './globals.css'

/**
 * #44. The apex is canonical: `www.patchscore.app` 308s to `patchscore.app`, so the tag has to
 * name the apex or the two signals contradict each other, which is worse than having neither.
 * If the redirect is ever flipped, this flips with it.
 *
 * `canonical: '/'` is deliberate and applies to permalinked guides too (#12): once state is
 * URL-encoded, `?rig=…&template=…&seed=…` produces unbounded distinct URLs serving near-identical
 * pages. A guide is a *view of one app*, not a page of its own — the guides are generated, not
 * authored, and there is no reason to want thousands of them in an index.
 *
 * `metadataBase` also gives relative Open Graph values an origin to resolve against, so a shared
 * link previews as itself rather than as nothing.
 *
 * The title and description here are **defaults every route overrides**, not the whole story.
 * `app/page.tsx` replaces them per guide (#99), and each catalogue page replaces them with its
 * own (#84); what is left for this to cover is a route that states neither. The canonical is the
 * one field the root deliberately inherits rather than varies.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  alternates: { canonical: '/' },
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
}

/** No user scaling lock: the guide gets read at the machine, sometimes at arm's length. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

/**
 * The shell every route shares, which until #112 was `<body>{children}</body>` and nothing else.
 *
 * `SiteNav` lives here rather than in a component each page includes, because the failure it
 * fixes is four pages that each wrote their own link set and drifted apart. A layout renders it
 * whether or not the next page remembers, which is the only version of that fix that stays fixed.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
