import { REPOSITORY_URL, feedbackLinks } from '@/lib/studio/feedback'
import type { FeedbackContext } from '@/lib/studio/feedback'

/**
 * The page footer: what this thing is, where the code is, and three ways to report something.
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
      <p className="footer-line">
        No LLM. Every value comes from authored device data and a deterministic resolver, so the
        same rig, direction and seed always produce the same guide.
      </p>
      <ul className="footer-links">
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
