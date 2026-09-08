'use client'

import { useState } from 'react'
import { browserEnv } from '@/lib/studio/browser-env'
import { MARKDOWN_TYPE, downloadText, printPage } from '@/lib/studio/download'

/**
 * §3.7/#478/#12. **The two ways a kit session leaves the screen**, and the only client boundary
 * on `/devices/<id>/kit`.
 *
 * Everything else on that page is a server component with no state, so the whole document is in
 * the prerendered HTML: a crawler, a reader with no JavaScript and a printed sheet all receive
 * every value. These two buttons need a browser and nothing else does, so the boundary is drawn
 * around them rather than around the page.
 *
 * **Two strings cross it, and they are the narrowest thing that could.** The Markdown is
 * rendered on the server by `kitMarkdown`, so `KitSession`, `kitSession`, `renderKitSession` and
 * everything they reach — the device registry, the recipes, `lib/core` — stay out of the browser
 * bundle entirely. Handing the *session* over would have serialised every parameter of every
 * recipe into the page a second time and shipped a renderer to re-derive what the server had
 * already written. `lib/studio/download.ts` exists for the same reason: it imports no renderer,
 * so importing it pulls none.
 *
 * The string is exactly what `test/kit-golden.test.ts` pins, so what downloads is what is on
 * screen rather than a second document assembled here.
 *
 * Both handlers build the environment *inside* the handler, never during render (#12): nothing
 * here reads `window` while React is rendering, which is what keeps the server's markup and the
 * client's first markup the same bytes.
 *
 * Failure is reported rather than swallowed, as it is in the studio: a button that silently does
 * nothing leaves a reader believing they have a file they do not have.
 */
export function KitActions({ markdown, filename }: { markdown: string; filename: string }) {
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string } | undefined>()

  function onDownload() {
    const saved = downloadText(browserEnv(), {
      name: filename,
      text: markdown,
      type: MARKDOWN_TYPE,
    })
    setOutcome(
      saved.ok ? { ok: true, message: `Saved ${saved.name}` } : { ok: false, message: saved.message },
    )
  }

  function onPrint() {
    const printed = printPage(browserEnv())
    // Success says nothing: the print dialog is its own feedback, and a toast underneath a modal
    // is a toast nobody sees. Only failure is worth a line.
    setOutcome(printed.ok ? undefined : { ok: false, message: printed.message })
  }

  return (
    <>
      <div className="kit-actions">
        <button type="button" className="link-button" onClick={onDownload}>
          Download Markdown
        </button>
        <button type="button" className="link-button" onClick={onPrint}>
          Print / Save PDF
        </button>
      </div>
      {outcome === undefined ? null : (
        <p className={outcome.ok ? 'export-ok' : 'export-failed'} role="status">
          {outcome.message}
        </p>
      )}
    </>
  )
}
