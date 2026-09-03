'use client'

import { useState } from 'react'
import type { DeviceId, RequestId } from '@/lib/core'
import { placementSummary, type PlacementRow } from '../placement-controls'

/**
 * §7.5/#340 phase 2. **The control that moves a part onto a box the reader picked.**
 *
 * One per part, on the part's own row, because "not that box, this one" is a thought somebody
 * has while looking at the line that says which box. A panel of its own elsewhere on the page
 * would make them hold a part name in their head while they go and find it.
 *
 * **Collapsed until asked for, and the open state is local.** A rig may hold ten boxes and a
 * direction a dozen parts; a hundred and twenty buttons permanently on screen would bury the
 * guide this phase exists to show. Nothing about which control is open belongs in the inputs —
 * it changes no byte of the guide (invariant 6), so it is `useState` here and not a field in
 * `GuideInputsV1`.
 *
 * **A box that cannot make this part is shown and not offered.** Hiding it would answer "why is
 * my box not on the list" with silence, which §7.5 argues against by name (#329/#334): the
 * sentence is already computed in `lib/core`, and it is printed beside the box rather than
 * hidden behind a hover, because a hover has no touch equivalent and this is read on a phone
 * with hands busy (#21).
 */
export function PlacementControl({
  row,
  role,
  onPlacement,
}: {
  row: PlacementRow
  /** Names the part in the announced label — "Automatic" alone says nothing about which one. */
  role: string
  onPlacement: (requestId: RequestId, deviceId: DeviceId | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const current = row.current
  const currentId = current.kind === 'automatic' ? undefined : current.deviceId
  const summary = placementSummary(current)

  return (
    <div className="placement">
      <button
        type="button"
        className="placement-toggle"
        aria-expanded={open}
        aria-label={`Which box plays ${role}: ${summary}`}
        onClick={() => setOpen(!open)}
      >
        {/*
          §7.5/#340 phase 2. **The prefix is not decoration.** Without it the collapsed control
          is a lone pill reading "Automatic", and opened it sits directly above a *choice* also
          reading "Automatic" — two identical words in a column, distinguished only by an outline
          colour. Found by looking at it at 390px, which is the width §8's reader is standing at.
          `aria-hidden`, because the announced label already says which part this is and reads the
          state as a sentence; a screen reader hearing "Box" twice gains nothing.
        */}
        <span className="placement-label" aria-hidden="true">{'Box · '}</span>
        <span className="placement-summary">{summary}</span>
      </button>
      {/*
        The refusal sentence sits outside the disclosure, not inside it. It is the answer to a
        question the reader did not ask — they asked for a box and did not get it — so it has to
        be on screen without a click, the same way §7.3's gaps are.
      */}
      {current.kind === 'refused' ? (
        <span className="placement-refused-why">{current.why}</span>
      ) : null}
      {open ? <PlacementOffer row={row} role={role} onPlacement={onPlacement} /> : null}
    </div>
  )
}

/**
 * The boxes on offer, once the reader has asked to see them.
 *
 * A component of its own, and deliberately hookless: this suite runs in Node with no DOM
 * (`test/studio-render.test.ts` explains why), so a list that only exists inside a `useState`
 * that starts closed is a list no test can look at. Splitting it means what a reader is offered
 * — which boxes, in what order, which of them are inert and what each inert one says — is
 * assertable markup rather than something reasoned about.
 */
export function PlacementOffer({
  row,
  role,
  onPlacement,
}: {
  row: PlacementRow
  role: string
  onPlacement: (requestId: RequestId, deviceId: DeviceId | undefined) => void
}) {
  const currentId = row.current.kind === 'automatic' ? undefined : row.current.deviceId

  return (
    <div className="placement-options" role="group" aria-label={`Boxes for ${role}`}>
      {/*
        First, and always present. Clearing has to be reachable in one move from wherever the
        reader is: a placement they can make and cannot undo is worse than one they cannot make.
      */}
      <button
        type="button"
        className="placement-option placement-automatic"
        aria-pressed={currentId === undefined}
        onClick={() => {
          onPlacement(row.requestId, undefined)
        }}
      >
        Automatic
      </button>
      {row.choices.map((choice) =>
        choice.canServe ? (
          <button
            key={choice.deviceId}
            type="button"
            className="placement-option"
            aria-pressed={choice.deviceId === currentId}
            onClick={() => {
              onPlacement(row.requestId, choice.deviceId)
            }}
          >
            {choice.name}
          </button>
        ) : (
          <span key={choice.deviceId} className="placement-unavailable">
            {/*
              `disabled` rather than absent: the box is in their rig and they will look for it.
              The sentence sits outside the button, where a screen reader reads it in flow — text
              inside a disabled control is not reliably announced, and a `title` would put it
              behind a hover that touch does not have.
            */}
            <button type="button" className="placement-option" disabled>
              {choice.name}
            </button>
            <span className="placement-why">{choice.why}</span>
          </span>
        ),
      )}
    </div>
  )
}
