import { Articulation } from '@/components/pattern/articulation'
import { PatchList } from '@/components/recipe/patch-list'
import { ResolvedSettings } from '@/components/recipe/resolved-body'
import type { Riff, RiffVoicing } from '@/lib/core'
import { num, recipeRouting } from '@/lib/core'
import { riffCitation, riffStack, riffSubstitution, voiceHeading } from '@/lib/studio/riff-text'

/**
 * §5A. **The one voice a rig has for the figure, and everything needed to build it there.**
 *
 * **What is inside a resolved recipe is drawn by `components/recipe/resolved-body.tsx`** (#520) —
 * the cables, the module boxes, the parameter lines, the routings, the notes and the jogs. A
 * sound page draws exactly the same things off exactly the same type, and one reading of a
 * parameter is the whole reason that file exists. The class names below are still this page's:
 * ink is each surface's own (#33), and the prefix is a prop.
 *
 * What is left here is what a *riff* has and a sound does not: a stack, a trigger note beside a
 * written figure, and the articulation bound to its grid.
 *
 * **Every sentence is `riff-text.ts`'**, shared with the Markdown export (#495).
 */

/**
 * §4.3/§7 step 8/#528. **What the box says about the slots this grid actually contains** — the
 * guide's own list, drawn by the shared component rather than by a second treatment of it.
 *
 * The heading is the guide's sentence too. *Articulation* named the concept; **On this box —
 * Subsequent 37** says whose settings these are, which is the question a reader has after a grid
 * that named no device at all.
 *
 * `data-hints="on"`, because a riff page has no §8.1 toggle to turn them on with. The jog is
 * always shown here, as it always has been; what changes is that it now sits in the reserved
 * column instead of a paragraph of its own.
 */
function VoiceArticulation({ voice }: { voice: RiffVoicing }) {
  if (voice.articulation.length === 0) return null
  return (
    <div data-hints="on">
      <h3 className="riff-sub">On this box — {voice.device.name}</h3>
      <Articulation entries={voice.articulation} device={voice.device} />
    </div>
  )
}

export function RiffVoice({ riff, voice }: { riff: Riff; voice: RiffVoicing }) {
  const substituted = riffSubstitution(riff, voice)
  const routing = recipeRouting(voice.recipe)
  const cites = riffCitation(voice)
  const patch = voice.recipe.patch
  return (
    <>
      <p className="riff-where">
        <span className="riff-box">{voiceHeading(voice)}</span>
        <span className="riff-recipe">{voice.recipe.title}</span>
      </p>
      {substituted === undefined ? null : <p className="riff-substituted">{substituted}</p>}
      {riffStack(voice).map((sentence) => (
        <p className="riff-stack" key={sentence.slice(0, 24)}>
          {sentence}
        </p>
      ))}
      {voice.sourceAudio === undefined ? null : (
        <p className="quiet">Source — {voice.sourceAudio.need}</p>
      )}
      {/*
        §2.1/#32. The note that plays the sound as it is, on a voice addressed by note. It matters
        more here than almost anywhere: the figure above is written in scientific pitch notation
        with middle C at C4 (§4.1) and a great many boxes put middle C somewhere else, so this is
        the bridge between the two. Bare, and §8's wording exactly — `C5` is where the sample plays
        as recorded rather than the only note it answers to. A voice declaring none renders
        nothing, because inventing one would be a claim about the box (invariant 5).
      */}
      {voice.triggerNote === undefined ? null : (
        <p className="riff-trigger">
          <span className="riff-trigger-label">Trigger note</span>
          <span className="mono">{voice.triggerNote.note}</span>
          <span className="riff-note-fact mono">MIDI {num(voice.triggerNote.midi)}</span>
        </p>
      )}
      {routing === undefined ? null : <p className="quiet">Routing — {routing}</p>}
      {patch === undefined || patch.length === 0 ? null : (
        <PatchList entries={patch} className="patch riff-patch" />
      )}
      {/*
        A recipe with no settings renders no heading and no sentence saying so: an empty block is a
        reader looking for something that is not there, and a line about it would be a line about
        this library rather than about the box in front of them.
      */}
      {voice.params.length === 0 ? null : (
        <>
          <h3 className="riff-sub">Settings</h3>
          <ResolvedSettings params={voice.params} device={voice.device} prefix="riff" />
        </>
      )}
      <VoiceArticulation voice={voice} />
      {cites === undefined ? null : <p className="riff-cites">{cites}</p>}
    </>
  )
}
