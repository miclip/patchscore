import Link from 'next/link'

/**
 * #112. The one navigation landmark, rendered from `app/layout.tsx` so every route has it and no
 * route has to remember to.
 *
 * Before this there was no `<nav>` anywhere in `app/` or `components/` — nothing reachable by
 * landmark, and no shared chrome for a link set to live in. What each catalogue page had instead
 * was a `<p className="masthead-actions">` of its own, and with four independent copies they
 * diverged exactly as you would expect: `/devices` could reach the studio and nothing else, so
 * the devices half of the catalogue was a dead end for the directions half. You could go
 * directions → devices and never the reverse.
 *
 * **Rendering it once is the fix, not the tidy-up.** A shared component that pages opt into would
 * have let the fifth page skip it; a layout that renders it unconditionally cannot. That is why
 * this takes no props and knows nothing about the route it is on.
 *
 * `aria-label` because there will be a second landmark eventually (the footer's link list is one
 * argument away from being one), and two unlabelled `<nav>`s are indistinguishable in a landmark
 * list. Named now, while there is one, rather than when it starts to matter.
 *
 * **What it names is now one kind of thing.** It carried eight entries of three kinds as peers:
 * catalogues of what the engine knows, libraries to play from, and explainers for somebody who
 * does not have the vocabulary yet. The explainers went to the footer and to the word itself,
 * where a reader meets them at the moment they need one rather than from a top-level link;
 * Preferences went to the footer and to the studio's own masthead, which is the page it changes.
 * What is left is six links to the places this site holds things, and the mark is the way home.
 *
 * **Not marked "you are here".** `aria-current` needs the pathname, which needs `usePathname` and
 * therefore a client boundary in the layout — on every route, including the sixteen prerendered
 * catalogue pages that currently ship no client JavaScript at all. That is a real cost for a
 * nicety, and the page's `<h1>` already says where you are. Worth revisiting if the nav grows.
 *
 * A server component: nothing here has state, so it is in the prerendered HTML where a crawler
 * and a reader with no JavaScript both get it. `Link` rather than `a` — these stay in the app.
 */
/**
 * The routes the nav names, in the order it names them. **Rendered from, not merely documented
 * by**: the tests assert against this list, so a hand-written `<li>` beside it would let the
 * tested link set and the served one drift — which is a smaller version of the exact failure
 * this component exists to stop.
 */
export const NAV_LINKS: readonly { href: string; label: string }[] = [
  // §8. The app, at its own address since `/` became the page that says what this is. First
  // because it is the one entry here that makes something rather than listing something.
  { href: '/studio', label: 'Studio' },
  { href: '/devices', label: 'Devices' },
  { href: '/directions', label: 'Directions' },
  // §5A/#503. A peer of the two catalogue halves rather than a page under either, because it is
  // the third thing this site holds: a device is a box, a direction is a song, and a riff is one
  // figure. Filed under Directions it would read as a genre, and under Devices as a preset.
  { href: '/riffs', label: 'Riffs' },
  // §3.8/#520. The fourth thing this site holds: a device is a box, a direction is a song, a riff
  // is one figure, and a sample is one sound. Beside Riffs because it is the same shape of page —
  // one authored thing, resolved against the rig you own.
  { href: '/samples', label: 'Samples' },
  // §2.6/§3.7. The fifth, and the largest: the factory patches a box ships, with a figure written
  // for each. It had no entry at any level while it grew past `/riffs` and `/samples` combined,
  // because it was addressed as a sub-page of a device. Last because it is the one a reader
  // reaches for having decided which box they are sitting at.
  { href: '/explore', label: 'Explore' },
]

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Site">
      {/*
        The mark, and **the way home**, which it could not be until `/` was a page.

        This used to be decoration and argued for being decoration: `NAV_LINKS` carried
        Studio → `/`, so a linked logo would have been a second route to the same page for a
        reader tabbing through. The studio is at `/studio` now and `/` is the orientation page,
        so the second route is gone and what is left is the convention every site has — the mark
        goes home — with a destination that no entry in the list names.

        It is a link and therefore a target: 44px both ways (#21), which is larger than the 28px
        drawing inside it and deliberately so. Hit target and visual size are decoupled here for
        the reason they are on a knob.

        Labelled rather than `alt=""`, because it is no longer decoration. The image stays
        `alt=""` and the label sits on the link, so a screen reader announces one thing — "Home,
        link" — rather than an image name and a destination.

        `/icon.png` rather than a second copy of the artwork: Next serves `app/icon.png` at that
        route already, and the tiled drawing is the one built to survive being small — the full
        mark's stave dissolves below about 64px, which is most of the sizes a header uses.
      */}
      <Link className="site-nav-home" href="/" aria-label="Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="site-nav-mark" src="/icon.png" width={28} height={28} alt="" />
      </Link>
      {/*
        A list, so a screen reader is told how many ways out there are before reading the first
        one. The count is small enough that this reads as pedantry and large enough that having
        it is worth something; the alternative — bare links in a div — is what `masthead-actions`
        was, and it announced as prose.
      */}
      <ul>
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
