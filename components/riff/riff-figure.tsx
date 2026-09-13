import type { Riff, RiffResolution } from '@/lib/core'
import { SlotList } from '@/components/pattern/slot-list'
import { StepGrid } from '@/components/pattern/step-grid'
import { RIFF_GRID_LEAD, ruleLines } from '@/lib/studio/riff-text'
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
 */
function Grid({ riff }: { riff: Riff }) {
  return (
    <section className="panel riff-panel">
      <header>
        <h2>The grid</h2>
      </header>
      <p className="riff-grid-lead">{RIFF_GRID_LEAD}</p>
      <StepGrid pattern={riff.pattern} />
      <SlotList pattern={riff.pattern} />
    </section>
  )
}

/**
 * The figure: what it is, how it is played, and nothing about anybody's boxes.
 *
 * Two panels rather than one, because they answer different questions and a reader standing at a
 * machine wants to look at one of them at a time.
 */
export function RiffFigure({ riff, resolution }: { riff: Riff; resolution: RiffResolution }) {
  return (
    <RiffInKey
      riff={riff}
      resolution={resolution}
      rules={<Rules riff={riff} />}
      grid={<Grid riff={riff} />}
    />
  )
}
