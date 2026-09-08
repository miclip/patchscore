import type { DownloadFile, StudioEnv } from './session'

/**
 * §8.2/#12/#478. **The two ways anything leaves a page, and nothing about what is on it.**
 *
 * Split out of `export.ts` at #478 for one reason: this is the half a *client* component needs,
 * and `export.ts` imports both renderers at module scope. A `'use client'` file that reached for
 * the print dialog would have pulled `renderGuide` and `renderKitSession` — the whole engine and
 * the whole kit model — into the browser bundle to call a function that takes a string and a
 * name. Nothing here imports `lib/core`, and nothing here may.
 *
 * Both are pure functions of an injected browser, for the reason the rest of `lib/studio` is:
 * they are testable in Node, and nothing here can run during render.
 */

export type ExportResult = { ok: true; name: string } | { ok: false; message: string }

/**
 * Hand a string to the browser to save. Never throws.
 *
 * Honest about failure, like Copy link: a browser that refuses the download leaves the user
 * believing they have a file they do not have, and what they wanted is then gone as soon as they
 * close the tab.
 */
export function downloadText(env: StudioEnv, file: DownloadFile): ExportResult {
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
    save(file)
  } catch {
    return { ok: false, message: 'Saving was blocked. Use Print instead.' }
  }

  return { ok: true, name: file.name }
}

/**
 * `text/markdown` rather than `text/plain`: it is what the file is, and it stops a browser
 * deciding to display it instead of saving it.
 */
export const MARKDOWN_TYPE = 'text/markdown;charset=utf-8'

export type PrintResult = { ok: true } | { ok: false; message: string }

/**
 * Open the browser's own print dialog and do nothing else — no PDF generation, no new window, no
 * re-render into a printable clone. The page *is* the printable artefact; `@media print` decides
 * what survives onto paper.
 *
 * Named for the page rather than for the guide since #478: it opens a dialog and knows nothing
 * about what is on the page, and the kit session prints through the same one.
 *
 * Never throws. A blocked `print()` is reported rather than swallowed, because a button that
 * silently does nothing is worse than one that says it could not.
 */
export function printPage(env: StudioEnv): PrintResult {
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
    return { ok: false, message: 'Printing was blocked. Use your browser\u2019s File \u2192 Print instead.' }
  }

  return { ok: true }
}
