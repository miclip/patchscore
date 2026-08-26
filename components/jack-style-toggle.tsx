'use client'

import { useEffect, useId, useState } from 'react'
import type { JackStyle } from '@/lib/studio/preferences'
import { JACK_STYLE_ATTR, readJackStyle, writeJackStyle } from '@/lib/studio/preferences'

/**
 * #138. Patch cables on or off, per browser.
 *
 * **Read after mount, never during render.** The server cannot know what this browser stored, so
 * reading it in render would either mismatch hydration or force a second paint. The document's
 * inline script has already set the attribute before first paint; this only catches up the
 * control's own checked state, which nothing is looking at in the first frame anyway.
 *
 * A real checkbox, for the same reason the picker's sockets are real checkboxes.
 */
export function JackStyleToggle() {
  const [style, setStyle] = useState<JackStyle | undefined>(undefined)
  const [stuck, setStuck] = useState(true)
  const id = useId()

  useEffect(() => {
    setStyle(readJackStyle(() => window.localStorage))
  }, [])

  function choose(next: JackStyle) {
    setStyle(next)
    document.documentElement.setAttribute(JACK_STYLE_ATTR, next)
    setStuck(writeJackStyle(() => window.localStorage, next))
  }

  return (
    <div className="pref">
      <label className="pick-choose" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          // Undefined until the effect runs, and the default is cables — so the box reads
          // checked from the first frame and does not visibly flip on hydration.
          checked={(style ?? 'cables') === 'cables'}
          onChange={(event) => choose(event.target.checked ? 'cables' : 'plain')}
        />
        <span className="name">Patch cables</span>
      </label>
      <p className="sub">
        Draw the pickers as a patchbay: each control becomes a socket, and cables show what is
        patched to what. Turn it off for plain checkboxes.
      </p>
      {stuck ? null : (
        // Said plainly rather than pretended: a preference that could not be written will be
        // gone on the next visit, and the reader should know that now rather than wonder later.
        <p className="empty">
          This browser would not store the preference, so it will go back to the default next
          visit. Blocked site data or a private window will do that.
        </p>
      )}
    </div>
  )
}
