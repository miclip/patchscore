import Link from 'next/link'
import { REPOSITORY_URL, feedbackLinks } from '@/lib/studio/feedback'
import type { FeedbackContext } from '@/lib/studio/feedback'

/**
 * The page footer: the rest of the site, where the code is, and three ways to report something.
 *
 * **It is where the things that left the nav live.** The two explainers and Preferences were
 * top-level entries while the nav was eight links of three kinds; they are here now, which is
 * where a reader goes looking for something deliberately rather than where they are shown it.
 * Neither explainer depends on being found here, though — `/parts` is linked from the word
 * itself (`components/vocabulary-term.tsx`), and Preferences from the studio's own masthead,
 * which is the page it changes. This is the second way to each, not the only one.
 *
 * Compact and quiet by design. It is the last thing on a page whose subject is the guide above
 * it, so it borrows the masthead's proportions (13px, dim ink, one hairline rule), and it is
 * hidden outright when the guide is printed.
 *
 * **The "no LLM" line is a claim about the build, not a boast.** Invariant 1 is the reason every
 * value on the page is either manual-verified or flagged; saying so where a reader can see it is
 * what makes the provenance marks above mean anything.
 *
 * Pure: the links come from `lib/studio/feedback.ts` and the permalink is passed in. On the first
 * frame there is no permalink to pass, because the address bar has not been read yet. The link
 * opens the form with that field empty and prefills it once the sync effect has run. The
 * questions themselves are the forms' under `.github/ISSUE_TEMPLATE/`, never restated here.
 */
export function Footer(props: FeedbackContext) {
  const links = feedbackLinks(props)

  return (
    <footer className="footer">
      {/*
        The catalogue is reachable from here and from a search result, and from nowhere else.
        Seventeen authored pages that only a crawler could find is most of #84's value thrown
        away, and these are internal links, so they carry weight a sitemap entry does not.

        `Link`, not `a`: these stay inside the app, unlike everything below them.
      */}
      <ul className="footer-links">
        <li>
          <Link href="/devices">Browse devices</Link>
        </li>
        <li>
          <Link href="/directions">Browse directions</Link>
        </li>
        <li>
          {/* §2.6/§3.7. The factory patches a box ships, with a figure for each — the section
              that grew largest while it had no entry anywhere. It is in the nav now too; this is
              the link a reader finds at the bottom of a page they arrived at from a search. */}
          <Link href="/explore">Explore patches</Link>
        </li>
        <li>
          {/* #174. What an 808 kick sounds like, and its companion below: what a `riser` does.
              Both left the nav because a reader needs them at the moment they meet the word
              rather than from a top-level link, and `/parts` is linked from the word itself. They
              stay reachable here for the reader who wants to sit and read one. */}
          <Link href="/drum-machines">Drum machines</Link>
        </li>
        <li>
          <Link href="/parts">Parts</Link>
        </li>
        <li>
          {/* #138. How the app draws itself, kept off the guide where every other control is
              an input to it. The studio carries its own link beside Copy link, which is what #138
              actually needed: the footer there sits below the whole generated guide. */}
          <Link href="/preferences">Preferences</Link>
        </li>
        <li>
          <a href={REPOSITORY_URL}>Source on GitHub</a>
        </li>
        {links.map((link) => (
          <li key={link.id}>
            {/* `noopener` on every outbound link; `_blank` so a half-filled report is not lost
                by navigating the guide away from under it. */}
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  )
}
