import { RiffFigure } from '@/components/riff/riff-figure'
import { resolveRiff } from '@/lib/core'
import type { PresetEntry, PresetFigure } from '@/lib/studio/preset-session'
import { PresetVoice } from './preset-voice'

/**
 * §3.7/#598. **One preset figure: the technique, the rules, the chords, the notes, the grid, and
 * the settings on the box that ships the patch.**
 *
 * A riff page and this one draw the same figure, and they share the drawing: `RiffFigure` is
 * the riff page's own, key control and all, and `VoiceBuild` (inside `PresetVoice`) is the
 * block under *Where it plays* there. What this file decides is what a riff page cannot: which
 * box. A riff page resolves against whatever the reader ticked and needs a picker, §7.3's gaps,
 * an empty-rig offer and §3.5's substitution sentence, because it does not know the rig. Here
 * the rig is the page's address, `presetSession` has already resolved the figure on it and
 * thrown if it could not, and none of that machinery has a question left to answer. So there
 * is no picker, nothing reads the studio, and the block is headed *On the Moog Muse* rather
 * than *Where it plays* (#598, operator decision).
 *
 * **Nothing about a patch unless the settings build it.** `PresetFigure.byHand` is read off the
 * recipe the figure landed on, and only where it names this page's patch does the block say
 * the settings reach the sound; a figure that lands on the box's nearest recipe for the part
 * prints that recipe's settings under its title and no sentence naming a patch it does not
 * build (#586's rule, on the surface that knows which patch it is).
 *
 * **Two islands, both the riff page's kind.** `RiffInKey` holds the key the reader wants the
 * figure spelt in (#570), and `PresetVoice` exists so the settings block builds at all (see that
 * file). Each is handed strings or the riff, never a `Device`: the figure island gets the same
 * empty-rig resolution a riff page prerenders with, because all it reads is the notes, and the
 * notes are the hook against the riff's own key on any rig at all (§4.1).
 */
export function PresetFigureBody({ entry, figure }: { entry: PresetEntry; figure: PresetFigure }) {
  const { riff } = figure
  return (
    <>
      <section className="panel riff-panel riff-technique">
        <header>
          <h2>The technique</h2>
        </header>
        {riff.technique.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </section>

      <RiffFigure riff={riff} resolution={resolveRiff(riff, [])} />

      <PresetVoice deviceId={figure.voice.device.id} patch={entry.slug} />
    </>
  )
}
