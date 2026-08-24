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
  { href: '/', label: 'Studio' },
  { href: '/devices', label: 'Devices' },
  { href: '/directions', label: 'Directions' },
]

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Site">
      {/*
        A list, so a screen reader is told how many ways out there are before reading the first
        one. Three items is small enough that this reads as pedantry and large enough that the
        count is worth having; the alternative — bare links in a div — is what `masthead-actions`
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
