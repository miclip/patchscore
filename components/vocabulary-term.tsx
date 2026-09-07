'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent, RefObject } from 'react'
import { definitionOf, kindOf } from '@/lib/studio/glossary'
import type { VocabularyWord } from '@/lib/studio/glossary'

/**
 * #457. A word from the shared vocabulary, underlined, opening a small modal with its definition.
 *
 * **Underlined, not a `(?)` beside it.** The underline styles the word already on the line, so it
 * adds no ink to a page read at the machine with both hands busy (§8), and it says the same thing
 * to every reader that a link does. A question mark beside one term says something about the
 * person reading it.
 *
 * **Tap, not hover** (#21). This is read on a phone: there is no hover there, so the affordance is
 * a button. Enter and Space come with the element. Tap-away, Escape and the Close control all
 * dismiss, and focus goes back to the word so a keyboard reader is where they were.
 *
 * **A real `<dialog>`, opened with `showModal()`, portalled to `document.body`.** Two reasons, and
 * the first is that the alternative was invalid: a term sits inside phrasing content — the density
 * one is inside a `<legend>` — and a `<div>` tree full of headings and paragraphs may not. The
 * second is that `aria-modal` is a promise to a screen reader and nothing else. `showModal()` is
 * the browser keeping it: the rest of the page goes inert, focus is trapped without a hand-written
 * Tab handler, Escape arrives as `cancel`, and the dialog is in the top layer rather than in a
 * stacking context it has to win.
 *
 * **Nothing reflows.** The dialog is out of the page's flow entirely, and the scroll lock adds back
 * the width the scrollbar was taking, so the page underneath does not move by a pixel.
 */

export type VocabularyModalProps = {
  word: VocabularyWord
  definition: string
  /** `kindOf(word)`, passed in so this component stays a plain function of its props. */
  kind: string
  /** Ties `aria-labelledby` to the heading. Supplied by the caller, which has the hooks. */
  titleId: string
  dialogRef: RefObject<HTMLDialogElement | null>
  /** The stop focus opens on. */
  closeRef: RefObject<HTMLButtonElement | null>
  /** Dismisses the definition. The backdrop and the Close button both ask for it. */
  requestClose: () => void
}

/**
 * Hookless on purpose. It holds no state, so `test/vocabulary-term.test.ts` can call it and fire
 * the handlers it builds, which is how every other control here is tested in Node with no DOM.
 * `showModal` and the portal belong to `VocabularyTerm`, which has the effects.
 */
export function VocabularyModal({
  word,
  definition,
  kind,
  titleId,
  dialogRef,
  closeRef,
  requestClose,
}: VocabularyModalProps) {
  /*
   * The backdrop is drawn by the dialog element, so a click on it lands on the dialog itself. The
   * card inside is what catches every click on the content, which is why the padding is on the
   * card and not on the dialog: with padding here, a click on the dialog's own margin would read
   * as a click on the backdrop.
   */
  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) requestClose()
  }

  /*
   * No `onClose` prop. React's own `close` handler fired on the first open of an instance and
   * silently stopped on the second, in a production build as well as in dev: Escape closed the
   * element, `open` stayed true in React, and the word was then dead to every further tap. The
   * listener is added in `VocabularyTerm`'s effect instead, on the same element it calls
   * `showModal()` on, where it is attached and removed by hand and cannot come apart from it.
   */
  return (
    <dialog
      ref={dialogRef}
      className="vocab-modal"
      aria-labelledby={titleId}
      onClick={onDialogClick}
    >
      <div className="vocab-modal-card">
        <h2 className="vocab-modal-head" id={titleId}>
          <span className="mono">{word}</span>
          <span className="vocab-kind">{kind}</span>
        </h2>
        <p className="vocab-def">{definition}</p>
        <button ref={closeRef} type="button" className="vocab-close" onClick={requestClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}

export type VocabularyTermProps = {
  word: VocabularyWord
}

export function VocabularyTerm({ word }: VocabularyTermProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const opened = useRef(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      // Only after a close this component caused. Mounting focuses nothing.
      // `preventScroll`, because the word is exactly where the reader left it and Chrome will
      // otherwise scroll a few hundred pixels to a place it is already at.
      if (opened.current) triggerRef.current?.focus({ preventScroll: true })
      opened.current = false
      return
    }
    opened.current = true

    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open) dialog.showModal()
    /*
     * The one place `open` goes false, and every exit arrives here: the backdrop and the button
     * ask the element to close, and Escape closes it itself.
     *
     * **Both `cancel` and `close`, because Chrome fired `close` only on an instance's first
     * open.** Measured on a production build: open, Escape, open, Escape leaves the second
     * dialog closed with no `close` event of any kind — not to React's `onClose` prop, and not
     * to a listener added by hand — so `open` stayed true in React and the word was then dead to
     * every further tap. `cancel` fires on every Escape, and it is the Escape signal in the first
     * place. Whichever arrives first sets the state; the second finds it already set.
     */
    const syncClosed = () => setOpen(false)
    dialog?.addEventListener('close', syncClosed)
    dialog?.addEventListener('cancel', syncClosed)
    // `showModal` focuses the first focusable descendant, which is this button. Said out loud so
    // the opening focus is a decision rather than an ordering accident.
    closeRef.current?.focus({ preventScroll: true })

    /*
     * The page is held still underneath. A modal dialog makes the background inert but does not
     * stop it scrolling, and a reader who scrolls behind the backdrop and then dismisses it has
     * lost the word they were standing on — which on a phone is the whole cost this feature
     * exists to avoid (#457).
     *
     * The scroller is `html` here and not `body`, so locking `body` alone leaves the wheel
     * scrolling the page. The gutter the scrollbar was occupying is added back as padding: on a
     * platform with classic scrollbars, hiding the overflow otherwise widens the content box and
     * the page reflows by ~15px, which is the one thing this feature may not do.
     */
    const scroller =
      document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.body
    const gutter = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = scroller.style.overflow
    const previousPadding = scroller.style.paddingRight
    scroller.style.overflow = 'hidden'
    if (gutter > 0) scroller.style.paddingRight = `${gutter}px`
    return () => {
      dialog?.removeEventListener('close', syncClosed)
      dialog?.removeEventListener('cancel', syncClosed)
      scroller.style.overflow = previousOverflow
      scroller.style.paddingRight = previousPadding
    }
  }, [open])

  // Every word in the vocabulary has one: `DEFINITIONS` is a total `Record`, so there is no
  // "no definition yet" state left for this to handle.
  const definition = definitionOf(word)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="vocab-term"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {word}
      </button>
      {/*
        Portalled to `document.body`, which is both what makes the markup legal — a `<dialog>`
        cannot live inside the `<legend>` this term is in — and what keeps it out of any ancestor
        that might otherwise clip or transform it. `open` can only be true after a click, so
        `document` is always there by the time this runs.
      */}
      {open
        ? createPortal(
            <VocabularyModal
              word={word}
              definition={definition}
              kind={kindOf(word)}
              titleId={titleId}
              dialogRef={dialogRef}
              closeRef={closeRef}
              /*
                The button and the backdrop close it by unmounting, which takes the element out
                of the top layer. Not `dialog.close()`: that asks for a `close` event, and this
                browser does not reliably send one after an instance's first open — the same
                measurement the `cancel` listener above is there for. Escape has no such choice,
                which is why that path listens for both events rather than only the tidy one.
              */
              requestClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  )
}
