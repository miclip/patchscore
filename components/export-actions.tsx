'use client'

import { useState } from 'react'
import { browserEnv } from '@/lib/studio/browser-env'
import { MARKDOWN_TYPE, downloadText, printPage } from '@/lib/studio/download'

/**
 * §3.7/§3.8/#478/#12/#520. **The two ways a rendered document leaves the screen.**
 *
 * Two surfaces use it — `/devices/<id>/kit`, where it is the *only* client boundary, and
 * `/samples/<id>`, where it sits inside the island that already knows the reader's rig. It was
 * `KitActions` until the second one needed exactly these two buttons and exactly this failure
 * reporting.
 *
 * **Two strings cross it, and they are the narrowest thing that could.** On the kit page the
 * Markdown is rendered on the server by `kitMarkdown`, so `KitSession`, `kitSession`,
 * `renderKitSession` and everything they reach — the device registry, the recipes, `lib/core` —
 * stay out of the browser bundle entirely; `test/kit-page.test.ts` walks the import graph to hold
 * it. Handing a *session* over would have serialised every parameter of every recipe into the page
 * a second time and shipped a renderer to re-derive what the server had already written.
 * `lib/studio/download.ts` exists for the same reason: it imports no renderer, so importing it
 * pulls none.
 *
 * A samples document depends on the rig the reader ticked, which is client state, so there the
 * string is built in the browser by the island that already holds the resolver. The prop shape is
 * what makes that possible without this component knowing either.
 *
 * The string is exactly what the goldens pin, so what downloads is what is on screen rather than a
 * second document assembled here.
 *
 * Both handlers build the environment *inside* the handler, never during render (#12): nothing
 * here reads `window` while React is rendering, which is what keeps the server's markup and the
 * client's first markup the same bytes.
 *
 * Failure is reported rather than swallowed, as it is in the studio: a button that silently does
 * nothing leaves a reader believing they have a file they do not have.
 */
export function ExportActions({ markdown, filename }: { markdown: string; filename: string }) {
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
      <div className="export-actions">
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
