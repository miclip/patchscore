import { renderGuide } from '@/lib/core'
import type { GuideLayout } from '@/lib/core'
import type { ResolveResult } from '@/lib/core'
import type { StudioEnv } from './session'

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

export type ExportResult = { ok: true; name: string } | { ok: false; message: string }

/**
 * Hand the guide to the browser to save. Never throws.
 *
 * Honest about failure, like Copy link: a browser that refuses the download leaves the user
 * believing they have a file they do not have, and the guide they wanted is then gone as soon as
 * they close the tab.
 */
export function downloadGuideMarkdown(
  env: StudioEnv,
  result: ResolveResult,
  seed: number,
  layout?: GuideLayout,
): ExportResult {
  const name = guideFilename(result, seed)

  let save: ReturnType<StudioEnv['download']>
  try {
    save = env.download()
  } catch {
    return { ok: false, message: 'This browser will not let the page save files.' }
  }
  if (save === null || save === undefined) {
    return { ok: false, message: 'This browser will not let the page save files.' }
  }

  try {
    // `text/markdown` rather than `text/plain`: it is what the file is, and it stops a browser
    // deciding to display it instead of saving it.
    save({ name, text: guideMarkdown(result, layout), type: 'text/markdown;charset=utf-8' })
  } catch {
    return { ok: false, message: 'Saving was blocked. Use Print instead, or copy the link.' }
  }

  return { ok: true, name }
}

export type PrintResult = { ok: true } | { ok: false; message: string }

/**
 * Open the browser's own print dialog and do nothing else — no PDF generation, no new window, no
 * re-render into a printable clone. The page *is* the printable artefact; `@media print` decides
 * what survives onto paper.
 *
 * Never throws. A blocked `print()` is reported rather than swallowed, because a button that
 * silently does nothing is worse than one that says it could not.
 */
export function printGuide(env: StudioEnv): PrintResult {
  let open: ReturnType<StudioEnv['print']>
  try {
    open = env.print()
  } catch {
    return { ok: false, message: 'This browser will not let the page open the print dialog.' }
  }
  if (open === null || open === undefined) {
    return { ok: false, message: 'This browser will not let the page open the print dialog.' }
  }

  try {
    open()
  } catch {
    return { ok: false, message: 'Printing was blocked. Use your browser’s File → Print instead.' }
  }

  return { ok: true }
}
