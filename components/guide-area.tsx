'use client'

import type { InspirationApplication, ResolveResult } from '@/lib/core'
import { Guide } from './guide/guide'
import type { DeviceId, RequestId } from '@/lib/core'
import { Rack } from './rack/rack'

/**
 * Everything below the controls: the rack and the guide, or an honest statement of why there is
 * neither.
 *
 * Its own component rather than three ternaries inside `Studio` for one reason worth stating:
 * **the refusal path is the interesting one and it has to be testable.** `Studio` reaches its
 * non-default states through an effect, and this suite runs in Node with no DOM on purpose
 * (`test/studio-render.test.ts` explains why), so a refusal buried in `Studio`'s JSX could only
 * ever be reasoned about. Here it is a prop.
 *
 * Three states, and the middle one is the whole reason §5 returns an application rather than a
 * template:
 *
 *  - **refused** — two influences claim the same `(role, band)` (§5.3). No rack, no guide, and
 *    the sentence that says which two. It deliberately does *not* fall back to the base
 *    template: rendering the un-patched guide here would show a guide the selection did not ask
 *    for, with nothing on the page to reveal it.
 *  - **no direction** — the template id names nothing this build ships.
 *  - **resolved** — the ordinary case.
 */
export type GuideAreaProps = {
  application: InspirationApplication | undefined
  result: ResolveResult | undefined
  seed: number
  /** §7.4/#200. Passed to the rack, which is where a box is put in charge of the clock. */
  onClockSource: (deviceId: DeviceId | undefined) => void
  /**
   * §7.5/#340 phase 2. Passed to the guide, which is where a part is named on a box. Optional
   * for the same reason `Guide`'s copy is: a caller with no session behind it draws no control
   * rather than an inert one.
   */
  onPlacement?: ((requestId: RequestId, deviceId: DeviceId | undefined) => void) | undefined
}

export function GuideArea({
  application,
  result,
  seed,
  onClockSource,
  onPlacement,
}: GuideAreaProps) {
  if (application?.outcome === 'refused') {
    return (
      <section className="panel span-2">
        <header>
          <h2>Guide</h2>
        </header>
        <p className="empty">
          No guide: {application.detail} Change the selection above and it comes straight back.
        </p>
      </section>
    )
  }

  return (
    <>
      {/*
        §10's signature element sits above the guide, not under it: the guide is seven phases
        long, and a rack drawing below all of that is a rack drawing nobody scrolls to.
      */}
      <Rack result={result} onClockSource={onClockSource} />

      {result === undefined ? (
        <section className="panel span-2">
          <header>
            <h2>Guide</h2>
          </header>
          <p className="empty">No template selected.</p>
        </section>
      ) : (
        /*
          `guide-panel` is what `@media print` keeps. Everything else on the page is chrome —
          pickers, knobs, the rack, the notices — and a printed guide with a device picker at the
          top of page 1 is a printed guide somebody has to explain.
        */
        <section className="panel span-2 guide-panel">
          <Guide result={result} seed={seed} onPlacement={onPlacement} />
        </section>
      )}
    </>
  )
}
