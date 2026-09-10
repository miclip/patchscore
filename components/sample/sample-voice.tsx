import { hintText } from '@/components/guide/format'
import { PatchList } from '@/components/recipe/patch-list'
import { ResolvedSettings } from '@/components/recipe/resolved-body'
import type { Device, SampleResolution, SampleTarget, SampleVoicing } from '@/lib/core'
import { contentNotice, num, recipeRouting, recipesFor } from '@/lib/core'
import {
  sampleCitation,
  sampleContent,
  sampleGap,
  sampleSubstitution,
  sampleVoiceHeading,
} from '@/lib/studio/sample-text'

/**
 * §3.8/#520. **The box a rig has for this sound, and everything needed to build it there**, or
 * the one thing to do about a rig that has none.
 *
 * What is *inside* a resolved recipe is `components/recipe/resolved-body.tsx`', shared with the
 * riff page: the cables, the module boxes, the parameter lines, the routings, the notes and the
 * jogs are one reading of one type, and this page must not be a second. The class prefix is a
 * prop, so the ink stays this surface's own (#33).
 *
 * **Every sentence is `sample-text.ts`'**, shared with the Markdown export (#495).
 *
 * There is no articulation block and no trigger-note bridge to a written figure, because there is
 * no figure: a one-shot has no grid for a slot to address, and `resolveSample` binds none. The
 * trigger note itself still prints, for the reason §8 prints it — it is where the sound plays as
 * recorded on a voice addressed by note.
 */

export function SampleVoice({
  target,
  voice,
}: {
  target: SampleTarget
  voice: SampleVoicing
}) {
  const substituted = sampleSubstitution(target, voice)
  const routing = recipeRouting(voice.recipe)
  const cites = sampleCitation(voice)
  const patch = voice.recipe.patch
  return (
    <>
      <p className="sample-where">
        <span className="sample-box">{sampleVoiceHeading(voice)}</span>
        <span className="sample-recipe">{voice.recipe.title}</span>
      </p>
      {substituted === undefined ? null : <p className="sample-substituted">{substituted}</p>}
      {voice.triggerNote === undefined ? null : (
        <p className="sample-trigger">
          <span className="sample-trigger-label">Trigger note</span>
          <span className="mono">{voice.triggerNote.note}</span>
          <span className="sample-note-fact mono">MIDI {num(voice.triggerNote.midi)}</span>
        </p>
      )}
      {/*
        §3/#516. How to reach the sound, where the box makes it itself, in the slot §8 gives it —
        ahead of routing and ahead of every setting. The sibling of `voiceLines` in
        `lib/studio/sample-markdown.ts`, hand-written to match it like every other line here.
      */}
      {voice.recipe.soundSetup === undefined ? null : (
        <>
          <p className="quiet">Sound — {voice.recipe.soundSetup.sound}</p>
          <p className="quiet">{voice.recipe.soundSetup.prep.text}</p>
          {voice.recipe.soundSetup.hint === undefined ? null : (
            <p className="sample-hint">{hintText(voice.device, voice.recipe.soundSetup.hint)}</p>
          )}
        </>
      )}
      {routing === undefined ? null : <p className="quiet">Routing — {routing}</p>}
      {patch === undefined || patch.length === 0 ? null : (
        <PatchList entries={patch} className="patch sample-patch" />
      )}
      {/*
        A recipe with no settings renders no heading and no sentence saying so: an empty block is a
        reader looking for something that is not there, and a line about it would be a line about
        this library rather than about the box in front of them.
      */}
      {voice.params.length === 0 ? null : (
        <>
          <h3 className="sample-sub">Settings</h3>
          <ResolvedSettings params={voice.params} device={voice.device} prefix="sample" />
        </>
      )}
      {cites === undefined ? null : <p className="sample-cites">{cites}</p>}
    </>
  )
}

/**
 * §2.6/#111/#520. **What each box that plays this from a file actually ships**, under the gap that
 * says the rig cannot make the sound.
 *
 * One line per device rather than one for the rig: `content` is a fact about a box, and two boxes
 * in a rig can be in two different states. `contentNotice` is asked of the recipes that voice
 * authors for *this* role, which is the same narrowing the guide makes.
 *
 * It appears on this arm and no other. `contentNotice` answers `undefined` unless some recipe
 * handed to it declares `sourceAudio`, and a sound this rig *makes* landed on a recipe that
 * declares none — so there is nothing for it to say there, by construction rather than by choice.
 */
function SampleContent({
  resolution,
}: {
  resolution: SampleResolution & { outcome: 'gap' }
}) {
  if (resolution.gap.reason !== 'loads-audio') return null
  const { role } = resolution.target
  const seen = new Set<string>()
  const lines: { device: Device; text: string }[] = []
  for (const assignable of resolution.gap.voices) {
    if (seen.has(assignable.deviceId)) continue
    seen.add(assignable.deviceId)
    const device = resolution.devices.find((d) => d.id === assignable.deviceId)
    if (device === undefined) continue
    const notice = contentNotice(device, recipesFor(device, assignable, role))
    if (notice === undefined) continue
    lines.push({ device, text: sampleContent(notice) })
  }
  if (lines.length === 0) return null
  return (
    <div className="callout sample-content">
      {lines.map((line) => (
        <p key={line.device.id}>
          <strong>Content</strong> — {line.device.name}: {line.text}
        </p>
      ))}
    </div>
  )
}

/** §3.8/invariant 5. The gap, said as the thing to act on, with what the boxes ship under it. */
export function SampleGapBlock({
  resolution,
}: {
  resolution: SampleResolution & { outcome: 'gap' }
}) {
  return (
    <>
      <p className="sample-gap">
        {sampleGap(resolution.target, resolution.gap, resolution.devices)}
      </p>
      <SampleContent resolution={resolution} />
    </>
  )
}
