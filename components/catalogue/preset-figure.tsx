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
 * **Nothing about a recipe, and nothing arguing for the settings** (operator decision, #598).
 * The block names the voice and prints the settings, because a reader may want to see or tweak
 * what the preset does. It does not print the recipe's title and it says nothing about whether
 * that recipe reaches this patch: on a page about a preset either reads as an instruction to
 * build the thing the page just said to load. See `preset-text.ts`.
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
      {/*
        The same two-track body the riff page has, from the same stylesheet rule: the technique
        holds the reading measure and the figure's material sits beside it. This page is the one
        that made the case — its technique runs 1,137px on the Muse Runner, more than twice the
        library's median, and the material used to start below all of it.

        The voice block stays outside and full-width, for the reason the riff page's rig does:
        it is what you do after reading the figure rather than something read alongside it.
      */}
      <div className="riff-body">
        <section className="panel riff-panel riff-technique">
          <header>
            <h2>The technique</h2>
          </header>
          {riff.technique.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </section>

        <RiffFigure riff={riff} resolution={resolveRiff(riff, [])} />
      </div>

      <PresetVoice deviceId={figure.voice.device.id} patch={entry.slug} />
    </>
  )
}
