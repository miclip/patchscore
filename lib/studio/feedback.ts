/**
 * The footer's issue links: a wrong value, a missing device, a bug.
 *
 * Pure and browser-free, like everything else worth testing in this folder. The caller hands in
 * the permalink and the names of the devices on screen; nothing here reads `location`, so the
 * links are a function of state the component already holds.
 *
 * **The forms are the definition; these links only prefill them.** Every question, every
 * required field and every label lives in `.github/ISSUE_TEMPLATE/*.yml`. A link names the form
 * with `template=` and fills in the few answers the app already knows, keyed by the field's own
 * `id`, which is GitHub's documented issue-form prefill. Nothing here restates a question, so the
 * two cannot drift into asking different things or filing under different labels.
 *
 * **Built with `URLSearchParams`, never by hand.** A permalink is a query string, full of `&` and
 * `=`. A hand-rolled `?permalink=${...}` would truncate at the first `&` and hand us a report
 * describing a guide nobody can open. `URLSearchParams` percent-encodes the whole value,
 * and `test/feedback.test.ts` decodes it back to prove the permalink survives the trip intact.
 */

export const REPOSITORY_URL = 'https://github.com/miclip/patchscore'

const NEW_ISSUE = `${REPOSITORY_URL}/issues/new`

/**
 * What the footer knows about the guide on screen.
 *
 * `permalink` is `undefined` on the first frame and stays that way in any browser that will not
 * let the page write the address bar (`syncStudio` reports exactly that). It is not faked and no
 * placeholder is sent: the field is required by the form, whose own description asks for the
 * address bar, so an absent prefill leaves the reporter with the question rather than with
 * something that looks like evidence.
 */
export type FeedbackContext = {
  permalink: string | undefined
  /** Device names as a person would say them, like "Roland TR-1000", in registry order. */
  devices: readonly string[]
}

export type FeedbackLinkId = 'wrong-value' | 'device-request' | 'bug'

export type FeedbackLink = {
  id: FeedbackLinkId
  /** The link text. */
  label: string
  /** The form this link opens, under `.github/ISSUE_TEMPLATE/`. */
  template: string
  href: string
}

/**
 * Only the answers we have. An empty string is written as *nothing at all*. A prefilled blank is
 * indistinguishable from an unanswered field, both to the reporter and to us, and omitting the
 * key keeps the link short enough to read.
 */
function issueUrl(template: string, prefill: Record<string, string | undefined>): string {
  const query = new URLSearchParams({ template })
  for (const [field, value] of Object.entries(prefill)) {
    if (value !== undefined && value !== '') query.append(field, value)
  }
  return `${NEW_ISSUE}?${query.toString()}`
}

/**
 * Prefill the device field only when there is exactly one candidate. With a three-box rig we do
 * not know which one the wrong value came off, and writing all three into a single-line field
 * would be the form answering its own question. The reporter would then have to notice and delete
 * two, which is worse than an empty field. The rig goes in the notes instead, as something to
 * read.
 */
export function wrongValueLink(context: FeedbackContext): FeedbackLink {
  const only = context.devices.length === 1 ? (context.devices[0] as string) : undefined
  return {
    id: 'wrong-value',
    label: 'Report a wrong value',
    template: 'wrong-value.yml',
    href: issueUrl('wrong-value.yml', {
      title: only === undefined ? undefined : `Wrong value: ${only}`,
      device: only,
      permalink: context.permalink,
      notes:
        context.devices.length > 1 ? `Rig on screen: ${context.devices.join(', ')}` : undefined,
    }),
  }
}

/** Nothing to prefill: a device we do not have is a device the app knows nothing about. */
export function deviceRequestLink(_context: FeedbackContext): FeedbackLink {
  return {
    id: 'device-request',
    label: 'Request a device',
    template: 'device-request.yml',
    href: issueUrl('device-request.yml', {}),
  }
}

export function bugLink(context: FeedbackContext): FeedbackLink {
  return {
    id: 'bug',
    label: 'Report a bug',
    template: 'bug-report.yml',
    // Deterministic by construction (invariant 6), so the link *is* the reproduction: same
    // inputs, same seed, same build, same bytes.
    href: issueUrl('bug-report.yml', { permalink: context.permalink }),
  }
}

/** In the order the footer shows them. */
export function feedbackLinks(context: FeedbackContext): readonly FeedbackLink[] {
  return [wrongValueLink(context), deviceRequestLink(context), bugLink(context)]
}
