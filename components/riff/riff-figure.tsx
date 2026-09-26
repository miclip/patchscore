import type { ReactNode } from 'react'
import type { Riff, RiffResolution } from '@/lib/core'
import { STEPS_PER_BAR } from '@/lib/core'
import { SlotList } from '@/components/pattern/slot-list'
import { StepGrid } from '@/components/pattern/step-grid'
import {
  RIFF_GRID_LEAD,
  companionHeading,
  companionLead,
  gridRepeatSentence,
  ruleLines,
} from '@/lib/studio/riff-text'
import { RiffInKey } from './riff-in-key'

/**
 * §5A. **The figure itself — the notes and the grid — which no rig is involved in.**
 *
 * A server component, because nothing here depends on what the reader owns: a hook resolves
 * against the riff's own key (§4.1) and a grid is authored. So every note and every step is in
 * the prerendered HTML, where a crawler, a reader with no JavaScript and a sheet of paper all
 * receive it — at `riff.key`, which is the key the Markdown is in too. Only *where it plays*
 * needs a rig, and that is `RiffRig`'s client island.
 *
 * **Since #570 there is a second, smaller island**: `RiffInKey`, which holds the key the reader
 * is reading the figure in and re-spells the notes and the chords there. It is drawn around the
 * two panels the key moves, and the two it does not — the rules and the grid — are rendered here
 * and handed through it, so the server still owns what the server decides.
 *
 * **Rendered from the model, never from the Markdown.** `renderRiff` is this file's sibling in
 * §8's sense, not its source: parsing one renderer's output to produce another's is how two
 * surfaces come to disagree about something neither of them decided. What they share is
 * `lib/studio/riff-text.ts`, which holds every sentence and every derived row they both use, and
 * `test/riff-page.test.ts` asserts the facts of one against the other (#495).
 */

/**
 * §5A/#554. **The rules the figure keeps**, where it states any.
 *
 * Shown rather than kept for the build alone: a rule a reader cannot see is one they will break
 * the first time they take the figure somewhere else.
 *
 * **No line saying they are enforced.** One was here, and it told the reader about our build,
 * which is nothing to somebody standing at a machine — the same rule that keeps our backlog off
 * the page. A heading and the rules under it is the whole of what a reader needs.
 *
 * Written as degrees, so they hold in whichever key the reader has the figure in.
 */
function Rules({ riff }: { riff: Riff }) {
  const rules = ruleLines(riff)
  if (rules.length === 0) return null
  return (
    <section className="panel riff-panel">
      <header>
        <h2>The rules</h2>
      </header>
      <ul className="riff-rules">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * §4.3's grid, and it is **the figure a guide draws, not a picture of the export** (#528).
 *
 * This was `gridRows` in a `<pre>`, which is the Markdown's ink on a surface that can draw boxes:
 * a reader moving between a guide and a riff page in one sitting saw two treatments of one
 * figure, and the text one gives nothing to count sixteen `x` against. `StepGrid` is shared, so
 * the boxes, the stronger border every fourth step, the copyable `x`/`·` rows underneath and the
 * label naming the struck steps all arrive here rather than being chosen again.
 *
 * The slot rows come with it, and with the two facts this page was dropping: the velocity on the
 * line, and #457's definition trigger on the slot word.
 *
 * **Nothing on a held riff** (§5A.2/#608). A pad carries no grid, so there is no panel: not an
 * empty one, and not the lead sentence, which is a sentence about a grid.
 */
function Grid({ riff }: { riff: Riff }) {
  const { pattern } = riff
  if (pattern === undefined) return null
  const repeat = gridRepeatSentence(riff)
  return (
    <section className="panel riff-panel">
      <header>
        <h2>The grid</h2>
      </header>
      <p className="riff-grid-lead">{RIFF_GRID_LEAD}</p>
      {repeat === undefined ? null : <p className="riff-grid-lead">{repeat}</p>}
      <StepGrid pattern={pattern} />
      <SlotList pattern={pattern} passes={(riff.hook.bars * STEPS_PER_BAR) / pattern.length} />
    </section>
  )
}

/**
 * The figure: what it is, how it is played, and nothing about anybody's boxes.
 *
 * Two panels rather than one, because they answer different questions and a reader standing at a
 * machine wants to look at one of them at a time.
 */
export function RiffFigure({
  riff,
  resolution,
  companionTechnique,
}: {
  riff: Riff
  resolution: RiffResolution
  companionTechnique?: ReactNode
}) {
  return (
    <RiffInKey
      riff={riff}
      resolution={resolution}
      rules={<Rules riff={riff} />}
      grid={<Grid riff={riff} />}
      companionTechnique={companionTechnique}
    />
  )
}

/**
 * §5A. **A technique panel**: the heading, a lead where the part needs one, and the prose. The
 * host's has no lead, because the masthead above it already says `role · character`; a
 * companion's carries its own, since that line is about the host.
 */
function Technique({
  heading,
  lead,
  paragraphs,
}: {
  heading: string
  lead?: readonly [string, string]
  paragraphs: readonly string[]
}) {
  return (
    <section className="panel riff-panel riff-technique">
      <header>
        <h2>{heading}</h2>
      </header>
      {lead === undefined ? null : (
        <p className="mono riff-part-lead">
          {lead[0]} · {lead[1]}
        </p>
      )}
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 32)}>{paragraph}</p>
      ))}
    </section>
  )
}

/**
 * §5A/§5A.9. **The two-track body both figure pages draw**: the technique and the figure's
 * material, and for a riff with a companion the companion's technique and its notes after them.
 *
 * One component for the riff page and the preset figure page, because the order of `.riff-body`'s
 * children is what the stylesheet's 1180px grid pairs (see `globals.css`), and two pages writing
 * that order out by hand is two orders to keep equal. The host's technique is rendered here, on
 * the server; the other three children are the island's output (`RiffFigureView`), so one key
 * control can respell both hooks.
 *
 * **The host technique stays a sibling of `RiffFigure`, at the index it always had.** React's
 * `useId` is derived from a component's position among its siblings, and the key control's
 * `<select id>` comes from it: moving the technique inside the island changed that id on every
 * page, a markup change on riffs that have no companion.
 */
export function RiffBody({ riff, resolution }: { riff: Riff; resolution: RiffResolution }) {
  const { companion } = riff
  return (
    <div className="riff-body">
      <Technique heading="The technique" paragraphs={riff.technique} />
      <RiffFigure
        riff={riff}
        resolution={resolution}
        companionTechnique={
          companion === undefined ? undefined : (
            <Technique
              heading={companionHeading(companion)}
              lead={companionLead(companion)}
              paragraphs={companion.technique}
            />
          )
        }
      />
    </div>
  )
}
