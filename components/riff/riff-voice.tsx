import { Fragment } from 'react'
import { PatchList } from '@/components/recipe/patch-list'
import { ResolvedSettings } from '@/components/recipe/resolved-body'
import { hintText } from '@/components/guide/format'
import type { BoundArticulation, Device, Riff, RiffVoicing } from '@/lib/core'
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
 * §4.3/§7 step 8. What the box says about the slots this grid actually contains.
 *
 * A slot the variant does not strike is dropped by `bindArticulation` and renders nothing — which
 * is the whole reason articulation addresses slots rather than absolute step numbers.
 *
 * `set` holds numbers, strings *and* booleans, so the value is stringified rather than coerced:
 * `Number(value)` on a named mode renders `NaN`, silently and only on the boxes authoring one.
 */
function RiffArticulation({
  entries,
  device,
}: {
  entries: readonly BoundArticulation[]
  device: Device
}) {
  if (entries.length === 0) return null
  return (
    <>
      <h3 className="riff-sub">Articulation</h3>
      <ul className="riff-articulation">
        {entries.map((bound) => (
          <li key={bound.slot}>
            <span className="mono riff-slot-name">{bound.slot}</span>
            <span className="arrow" aria-hidden="true">
              {' → '}
            </span>
            {Object.entries(bound.set).map(([key, value], i) => (
              <Fragment key={key}>
                {i > 0 ? ', ' : null}
                <span className="mono">{key}</span> {typeof value === 'string' ? value : String(value)}
              </Fragment>
            ))}
            <span className="riff-note-fact mono">
              {bound.steps.length === 1 ? 'step' : 'steps'} {bound.steps.map(num).join(', ')}
            </span>
            {bound.hint === undefined ? null : (
              <p className="riff-hint">{hintText(device, bound.hint)}</p>
            )}
          </li>
        ))}
      </ul>
    </>
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
      <RiffArticulation entries={voice.articulation} device={voice.device} />
      {cites === undefined ? null : <p className="riff-cites">{cites}</p>}
    </>
  )
}
