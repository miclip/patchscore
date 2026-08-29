'use client'

import { useEffect, useId, useState } from 'react'
import type { GuideLayout } from '@/lib/core'
import {
  DEFAULT_GUIDE_LAYOUT,
  readGuideLayout,
  writeGuideLayout,
} from '@/lib/studio/preferences'

/**
 * §8/#230/#138. Which way a guide opens, per browser.
 *
 * **This is the default, not the switch.** The studio has its own `Read:` control for trying the
 * other layout on the guide in front of you; that one changes the page and nothing else. This one
 * decides what every guide opens as. Keeping them apart is the point — a reader flicking between
 * layouts to compare two sections should not find they have quietly changed their own setting.
 *
 * **Read after mount, never during render**, the rule this page's other control already keeps: the
 * server cannot know what this browser stored, so reading it in render would mismatch hydration.
 * Unlike the jack style there is no inline script and no flash to avoid, because nothing here is
 * painted before the guide is.
 *
 * A `select` rather than a checkbox, for the reason the studio's control is one: neither layout is
 * the negation of the other, and "not by phase" does not tell a reader what they would get.
 */
export function GuideLayoutPreference() {
  const [layout, setLayout] = useState<GuideLayout | undefined>(undefined)
  const [stuck, setStuck] = useState(true)
  const id = useId()

  useEffect(() => {
    setLayout(readGuideLayout(() => window.localStorage))
  }, [])

  function choose(next: GuideLayout) {
    setLayout(next)
    setStuck(writeGuideLayout(() => window.localStorage, next))
  }

  return (
    <div className="pref">
      <label className="pick-choose" htmlFor={id}>
        <span className="name">Open guides</span>
        <select
          id={id}
          // Undefined until the effect runs, so the control shows the default in the first frame
          // rather than an empty box that fills in.
          value={layout ?? DEFAULT_GUIDE_LAYOUT}
          onChange={(event) => choose(event.target.value as GuideLayout)}
        >
          <option value="phase">by phase</option>
          <option value="sequencer">by sequencer</option>
        </select>
      </label>
      <p className="sub">
        <strong>By phase</strong> walks the whole rig through each stage in turn — every hook, then
        every pattern, then every sound. <strong>By sequencer</strong> takes one box at a time and
        does all three there, which is closer to how a session actually runs and means fewer trips
        back to the same machine.
      </p>
      <p className="sub">
        Either way the guide says the same things in the same words; only the order changes. The
        studio has a <span className="mono">Read:</span> control for switching one guide without
        changing this.
      </p>
      {stuck ? null : (
        // Said plainly rather than pretended, exactly as the jack style does.
        <p className="empty">
          This browser would not store the preference, so it will go back to the default next
          visit. Blocked site data or a private window will do that.
        </p>
      )}
    </div>
  )
}
