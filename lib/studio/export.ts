import { renderGuide } from '@/lib/core'
import type { GuideLayout } from '@/lib/core'
import type { ResolveResult } from '@/lib/core'
import type { StudioEnv } from './session'
import { MARKDOWN_TYPE, downloadText } from './download'
import type { ExportResult } from './download'
import type { KitSession } from './kit-session'
import { renderKitSession } from './kit-markdown'

/**
 * #12's export half: Markdown out, and print to paper or PDF.
 *
 * Both are pure functions of a `ResolveResult` plus an injected browser, for the same reason the
 * rest of `lib/studio` is: they are testable in Node, and nothing here can run during render.
 *
 * **No PDF library.** §8.2 settled that — a real PDF pipeline is disproportionate work for v1,
 * and the browser already has one behind a print dialog that every user already knows how to
 * drive. What we owe them is a stylesheet good enough that the printed page is worth keeping,
 * which is `@media print` in `app/globals.css`, not a dependency.
 */

/**
 * The Markdown is **exactly** `renderGuide(result, { layout })` — the same bytes
 * `test/guide-golden.test.ts` pins, and the same file a person reads. Not a re-render, not a
 * variant with a header bolted on: a download that differed from the rendered output would be a
 * third renderer nobody is testing, and §8's whole point is that there are two siblings reading
 * one `ResolveResult`.
 *
 * **The layout is passed rather than defaulted** (§8/#230). What downloads has to be what is on
 * screen: a reader who switched to `by sequencer` and then saved a file laid out by phase would
 * have been handed a different document from the one they were reading, and would have no reason
 * to suspect it. That includes the studio's per-visit override, not only the stored preference —
 * the file follows the guide, not the setting.
 */
export function guideMarkdown(result: ResolveResult, layout?: GuideLayout): string {
  return renderGuide(result, layout === undefined ? {} : { layout })
}

/**
 * Stable: the same guide always downloads under the same name, so saving twice overwrites rather
 * than accumulating `guide (3).md`. Template and seed identify it, and both are already
 * constrained to be filesystem-safe — `PERMALINK_ID` allows only letters, digits and hyphens,
 * which is also the intersection of what every filesystem accepts.
 *
 * No timestamp, deliberately. A name that changes every second is not a name.
 */
export function guideFilename(result: ResolveResult, seed: number): string {
  return `patchscore-${result.template.id}-${seed}.md`
}

/**
 * #478. `downloadText`, `printPage` and their result types moved to `./download`, which imports
 * no renderer at all. The kit page's two buttons are a client component, and a `'use client'`
 * file importing *this* module would pull `renderGuide`, `renderKitSession` and the whole engine
 * into the browser bundle to call a function that takes a string and a name. They are
 * re-exported here so the studio's callers and `test/export.test.ts` keep one import.
 */
export { MARKDOWN_TYPE, downloadText, printPage } from './download'
export type { ExportResult, PrintResult } from './download'

/**
 * Hand the guide to the browser to save. Never throws — `downloadText` reports a refusal, since
 * a user who believes they have a file they do not have loses the guide when the tab closes.
 */
export function downloadGuideMarkdown(
  env: StudioEnv,
  result: ResolveResult,
  seed: number,
  layout?: GuideLayout,
): ExportResult {
  return downloadText(env, {
    name: guideFilename(result, seed),
    text: guideMarkdown(result, layout),
    type: MARKDOWN_TYPE,
  })
}

/**
 * §3.7/#478. `patchscore-intellijel-cascadia-kit.md`. Stable, for the reason a guide's name is:
 * saving twice overwrites rather than accumulating `kit (3).md`. A device id is already
 * constrained to letters, digits and hyphens, which is the intersection of what every filesystem
 * accepts.
 */
export function kitFilename(session: KitSession): string {
  return `patchscore-${session.device.id}-kit.md`
}

/**
 * §3.7/#478. What the kit page's Download button hands over: **exactly** `renderKitSession` of
 * the session on screen — the same bytes `test/kit-golden.test.ts` pins and the same document
 * the page renders from, for the reason `guideMarkdown` is not a re-render.
 *
 * **Called on the server**, and the string is what crosses to the client (see `KitActions`). So
 * there is no `downloadKitMarkdown(env, session)` beside its guide sibling: the session never
 * reaches a browser, and nothing in the browser can render one.
 */
export function kitMarkdown(session: KitSession): string {
  return renderKitSession(session)
}
