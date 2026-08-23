import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
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
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://patchscore.app'),
  alternates: { canonical: '/' },
  title: 'Patchscore',
  description: 'Your hardware, a musical direction, and a phased guide with real parameter values.',
}

/** No user scaling lock: the guide gets read at the machine, sometimes at arm's length. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
